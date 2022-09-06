import Curriculum from 'curriculum-js'
import fs from 'fs'

const curriculum = new Curriculum()

let allSchemas = [
	curriculum.loadContextFromFile('curriculum-basis', './curriculum-basis/context.json'),
	curriculum.loadContextFromFile('curriculum-kerndoelen', './curriculum-kerndoelen/context.json'),
	curriculum.loadContextFromFile('curriculum-leerdoelenkaarten', './curriculum-leerdoelenkaarten/context.json'),
	curriculum.loadContextFromFile('curriculum-lpib', './curriculum-lpib/context.json'),
	curriculum.loadContextFromFile('curriculum-examenprogramma', './curriculum-examenprogramma/context.json'),
	curriculum.loadContextFromFile('curriculum-examenprogramma-bg', './curriculum-examenprogramma-bg/context.json'),
	curriculum.loadContextFromFile('curriculum-doelgroepteksten', './curriculum-doelgroepteksten/context.json'),
	curriculum.loadContextFromFile('curriculum-syllabus', './curriculum-syllabus/context.json'),
	curriculum.loadContextFromFile('curriculum-inhoudslijnen', './curriculum-inhoudslijnen/context.json'),
	curriculum.loadContextFromFile('curriculum-referentiekader', './curriculum-referentiekader/context.json'),
	curriculum.loadContextFromFile('curriculum-erk', './curriculum-erk/context.json'),
	curriculum.loadContextFromFile('curriculum-niveauhierarchie', './curriculum-niveauhierarchie/context.json')
]

//FIXME: alias has 'parent_id', so data.parent is needed for json-graphql-server
curriculum.data.parent = [{id:null}];

function makeNiveauIndex() {

	var niveauIndex = [];

	// ignore related links that aren't parent-child relations		
	var ignore = {
		'ldk_vakleergebied': ['vakleergebied_id'],
		'ldk_vakkern': ['lpib_vakkern_id'],
		'ldk_vaksubkern': ['lpib_vaksubkern_id'],
		'ldk_vakinhoud': ['lpib_vakinhoud_id'],
		'kerndoel_vakleergebied': ['vakleergebied_id'],
		'examenprogramma_vakleergebied': ['vakleergebied_id'],
		'lpib_leerlijn': ['vakleergebied_id', 'lpib_vakinhoud_id'],
		'lpib_vakkencluster': ['vakleergebied_id'],
		'lpib_vakleergebied': ['vakleergebied_id'],
		'inh_vakleergebied': ['vakleergebied_id'],
		'ref_vakleergebied': ['vakleergebied_id'],
		'erk_vakleergebied': ['vakleergebied_id'],
		'doelniveau': ['kerndoel_id','examenprogramma_eindterm_id','examenprogramma_subdomein_id','examenprogramma_domein_id','doel_id']
	};
	
	function shouldIgnore(section, property) {
		return (ignore[section] && ignore[section].indexOf(property)!==-1);
	}
	
	// deprecate all entities with 'deleted' true or 1
	for (let entityId in curriculum.index.id) {
		let entity = curriculum.index.id[entityId]
		if (entity.deleted) {
			console.log('deleted '+entity.id)
			curriculum.deprecate(entity)
			entity.deprecated = true
		} else {
			entity.deprecated = false
		}
		if (entity.replaced_by) {
			entity.replacedBy = entity.replaced_by
			delete entity.replaced_by
			entity.deprecated = true
		}
	}

	function getNiveauIndex(niveauId) {
		var niveauOb = niveauIndex.filter(function(niveauOb) {
			return niveauOb.niveau_id == niveauId;
		}).pop();
		if (!niveauOb) {
			niveauOb = {
				niveau_id: niveauId,
				lpib_vakkern_id: [],
				lpib_vaksubkern_id: [],
				lpib_vakinhoud_id: [],
				ldk_vakleergebied_id: [],
				ldk_vakkern_id: [],
				ldk_vaksubkern_id: [],
				ldk_vakinhoud_id: [],
				doel_id: [],
				kerndoel_id: [],
				kerndoel_vakleergebied_id: [],
				kerndoel_domein_id: [],
				kerndoel_uitstroomprofiel_id: [],
				examenprogramma_eindterm_id: [],
				examenprogramma_subdomein_id: [],
				examenprogramma_domein_id: [],
				examenprogramma_id: [],
				examenprogramma_vakleergebied_id: [],
				syllabus_specifieke_eindterm_id: [],
				syllabus_toelichting_id: [],
				syllabus_vakbegrip_id: [],
				syllabus_id: [],
				syllabus_vakleergebied_id: [],
				inh_vakleergebied_id: [],
				inh_inhoudslijn_id: [],
				inh_cluster_id: [],
				ref_vakleergebied_id: [],
				ref_domein_id: [],
				ref_subdomein_id: [],
				ref_onderwerp_id: [],
				ref_deelonderwerp_id: [],
				ref_tekstkenmerk_id: [],
				erk_vakleergebied_id: [],
				erk_gebied_id: [],
				erk_categorie_id: [],
				erk_taalactiviteit_id: [],
				erk_schaal_id: [],
				erk_candobeschrijving_id: [],
				erk_voorbeeld_id: [],
				erk_lesidee_id: [],
				nh_categorie_id: [],
				nh_sector_id: [],
				nh_schoolsoort_id: [],
				nh_leerweg_id: [],
				nh_bouw_id: [],
				nh_niveau_id: []
			};
			niveauIndex.push(niveauOb);
		}
		return niveauOb;
	}

	var seen = {};

	function addParentsToNiveauIndex(parents, niveaus, indent="") {
		if (indent==="") {
			seen = {};
		}
		if (niveaus) {
			niveaus.forEach(function(niveauId) {
				if (typeof seen[niveauId] == 'undefined') {
					seen[niveauId] = {};
				}
				var niveau = getNiveauIndex(niveauId);
				parents.forEach(function(parentId) {
					if (seen[niveauId][parentId]) {
						return;
					}
					seen[niveauId][parentId]=true;
					var parent = curriculum.index.id[parentId];
					let section = curriculum.index.type[parentId]

					if (Array.isArray(niveau[section+'_id'])) {
						if (niveau[section+'_id'].indexOf(parentId)==-1) {
							niveau[section+'_id'].push(parentId);
						}
						let myParents = curriculum.index.references[parentId]
						if (typeof myParents != 'undefined') {
							addParentsToNiveauIndex(myParents, niveaus, indent+"  ");
						}
					}
				});
			});
		}
	}

	function onlyUnique(value, index, self) {
		return self.indexOf(value)===index;
	}

	var count = 0;
	var error = 0;

	function isRootType(type) {
		return ['vakleergebied','ldk_vakleergebied','examenprogramma','syllabus',
			'lpib_vakleergebied','lpib_vakkencluster','lpib_leerlijn', 'inh_vakleergebied'
		].indexOf(type)>=0
	}

	function addChildrenWithNiveau(entity,section,niveau_id=null) {
		function getChildren(e) {
			var childIds = []
			Object.keys(e).forEach(p => {
				if (p.substring(p.length-3)==='_id' && p.substring(0, section.length)===section ) {
					childIds = childIds.concat(e[p])
				}
			})
			let children = [... new Set(childIds)].map(id => curriculum.index.id[id])
			return children
		}
		if (!niveau_id) {
			console.log('missing niveau_id in '+entity.id+' ('+section+')')
		}
		var index = getNiveauIndex(niveau_id);
		let type = curriculum.index.type[entity.id]
		if (index[type+'_id'].indexOf(entity.id)===-1) {
			index[type+'_id'].push(entity.id)
		}
		var children = getChildren(entity);
		if (!children) {
			return
		}
		children.forEach(child => {
			addChildrenWithNiveau(child,section,niveau_id)
		})
	}

	function addEntityWithNiveau(entity, section) {
		var parents = curriculum.index.references[entity.id]
		if (!parents) {
			if (!isRootType(curriculum.index.type[entity.id])) {
				console.log('missing entity parents for '+entity.id+' '+curriculum.index.type[entity.id])
				error++
			}
			return
		}
		count++;
		if (entity.niveau_id) {
			addParentsToNiveauIndex(parents, entity.niveau_id);
			if (section == 'doelniveau') {
				entity.niveau_id.forEach(function(niveauId) {
					var index = getNiveauIndex(niveauId);
					if (entity.doel_id) {
						entity.doel_id.forEach(function(doelId) {
							if (index.doel_id.indexOf(doelId)==-1) {
								index.doel_id.push(doelId);
							}
						});
					}
					if (entity.kerndoel_id) {
						entity.kerndoel_id.forEach(function(kerndoelId) {
							if (index.kerndoel_id.indexOf(kerndoelId)==-1) {
								index.kerndoel_id.push(kerndoelId);
							}
						});
					}
				});
			} else if (['examenprogramma_eindterm','kerndoel'].includes(section)) {
				entity.niveau_id.forEach(function(niveauId) {
					var index = getNiveauIndex(niveauId);
					index[section+'_id'].push(entity.id);
				});
			} else if (['examenprogramma','syllabus'].includes(section)) {
				// add a niveauIndex entry to the section_vakleergebied entities
				entity.niveau_id.forEach(function(niveauId) {
					var index = getNiveauIndex(niveauId);
					if (Array.isArray(entity[section+'_vakleergebied_id'])) {
						entity[section+'_vakleergebied_id'].forEach(function(vlgEntityId) {
							index[section+'_vakleergebied_id'].push(vlgEntityId);
						});
					}
				})
			} else {
				console.log('unknown section for niveauIndex',section);
			}
		} else {
			console.log('no niveau_id for entity '+entity.id, section);
		}
	}

	// for each doelniveau, add its parents to the niveauIndex
	curriculum.data.doelniveau.forEach(function(entity) {
		addEntityWithNiveau(entity, 'doelniveau');
	});
	curriculum.data.kerndoel.forEach(function(entity) {
		addEntityWithNiveau(entity, 'kerndoel');
	});
	curriculum.data.examenprogramma.forEach(function(entity) {
		addEntityWithNiveau(entity, 'examenprogramma');
	});
	curriculum.data.syllabus.forEach(function(entity) {
		let ex = entity.examenprogramma_id
		if (!Array.isArray(ex)) {
			ex = [ ex ]
		}
		ex.forEach(ex_id => {
			let e = curriculum.index.id[ex_id]
			let niveau_id = e.niveau_id
			if (!niveau_id) {
				console.log(e, niveau_id)
				process.exit();
			}
			if (!Array.isArray(niveau_id)) {
				niveau_id = [ niveau_id ];
			}
			niveau_id.forEach(n => addChildrenWithNiveau(entity, 'syllabus', n));
		})
	});

	var c = 0;
	var total = curriculum.data.examenprogramma_eindterm.length;
	curriculum.data.examenprogramma_eindterm.forEach(function(entity) {
		c++;
		process.stdout.write("\r"+c+'/'+total+' '+entity.id);
		addEntityWithNiveau(entity, 'examenprogramma_eindterm');
	});

	console.log("\n"+count+' correct, '+error+' errors');
	return niveauIndex
}


Promise.allSettled(allSchemas)
.then(() => {
	curriculum.data.niveauIndex = makeNiveauIndex()
	return curriculum.data
})
.then(() => {
	//TODO: read schemas and add properties as defined in the schema
	//as well as common properties like unreleased, deprecated, replaces, replacedBy
	var dummy = JSON.parse(fs.readFileSync('./dummy.json'));
	for (let section in dummy) {
		if (!curriculum.data[section]) {
			curriculum.data[section] = [];
		}
		dummy.replacedBy = dummy.replaced_by
		delete dummy.replaced_by
		curriculum.data[section].push(dummy[section][0]);
		dummy.deprecated = true
	}
	return curriculum.data
})
.then(() => {
	let combined = JSON.parse(JSON.stringify((curriculum)));
	return combined
})	
.then((combined) => {
	// now make sure all _id fields are arrays, ldk_* might have them as single values
	for (let i in combined.data) {
		combined.data[i].forEach(function(entry, index) {
			var fields = ["vakleergebied_id", "lpib_vakkern_id", "lpib_vaksubkern_id", "lpib_vakinhoud_id"];
			fields.forEach(function(field) {
				if (entry[field] && !Array.isArray(entry[field])) {
					combined.data[i][index][field] = [entry[field]];
				}
			});
		});
	}
	return combined
})
.then((combined) => {
	// graphql server breaks on empty arrays in the top level, so remove them
	for (let i in combined.data) {
		if (/.*_deprecated$/.exec(i)) {
			if (Array.isArray(combined.data[i]) && combined.data[i].length === 0) {
				delete combined.data[i];
			}
		}
	}
	return combined		
})
.then((combined) => {
	// move deprecated items back in to their original type lists
	// so that references still work in the graphql queries
	for (let entity of combined.data.deprecated) {

		// fix replaced_by links, snake case triggers bugs in graphql server
		if (entity.replaced_by) {
			entity.replacedBy = entity.replaced_by
			delete entity.replaced_by
		}

		// make double sure that deprecated property is set correctly
		entity.deprecated = true

		// re-insert entity in original types lists
		if (Array.isArray(entity.types)) {
			for (let type of entity.types) {
				if (!combined.data[type]) {
					combined.data[type] = []
				}
				combined.data[type].push(entity)
			}
		} else {
			console.error('entity '+entity.id+' has no types', entity)
		}
	}

	delete combined.data.deprecated
	return combined
})
.then((combined) => {
	// now add type index
	combined.data.type = []
	for (let id in curriculum.index.type) {
		let type = curriculum.index.type[id]
		if (!type) {
			continue
		}
		if (type === 'deprecated') {
			let entity = curriculum.index.id[id]
			if (!entity) {
				continue
			}
			type = entity.types[0]
		}
		combined.data.type.push({
			id: id,
			type: type
		})
	}
	return combined
})
.then((combined) => {
	var fileData = JSON.stringify(combined.data, null, "\t");
	fs.writeFileSync('./combined.json', fileData);
})