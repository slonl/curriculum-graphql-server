	var curriculum = require('./curriculum-basis/lib/curriculum.js');
	
	var basisSchema             = curriculum.loadSchema('./curriculum-basis/context.json', './curriculum-basis/');
	var kernbasisSchema         = curriculum.loadSchema('./curriculum-kerndoelen/context.json', './curriculum-kerndoelen/')
	var leerdoelenkaartenSchema = curriculum.loadSchema('./curriculum-leerdoelenkaarten/context.json', './curriculum-leerdoelenkaarten/');
	var lpibSchema              = curriculum.loadSchema('./curriculum-lpib/context.json', './curriculum-lpib/');
	var examenprogrammaSchema   = curriculum.loadSchema('./curriculum-examenprogramma/context.json', './curriculum-examenprogramma/');
	var examenprogrammaBgSchema = curriculum.loadSchema('./curriculum-examenprogramma-bg/context.json', './curriculum-examenprogramma-bg/');
	var doelgroeptekstenSchema  = curriculum.loadSchema('./curriculum-doelgroepteksten/context.json', './curriculum-doelgroepteksten/');
	var syllabusSchema          = curriculum.loadSchema('./curriculum-syllabus/context.json', './curriculum-syllabus/');
	var inhoudslijnenSchema     = curriculum.loadSchema('./curriculum-inhoudslijnen/context.json', './curriculum-inhoudslijnen/');
	var referentiekaderSchema   = curriculum.loadSchema('./curriculum-referentiekader/context.json', './curriculum-referentiekader/');
	var erkSchema               = curriculum.loadSchema('./curriculum-erk/context.json', './curriculum-erk/');
	var niveauhierarchieSchema  = curriculum.loadSchema('./curriculum-niveauhierarchie/context.json', './curriculum-niveauhierarchie/');

	//FIXME: alias has 'parent_id', so data.parent is needed for json-graphql-server
	curriculum.data.parent = [{id:null}];

	//add niveauIndex
	var niveauIndex = [];
	var idIndex = {};
	var typeIndex = {};
	var reverseNiveauIndex = {};
	function makeIndex() {

		// FIXME: read this from the json context instead of hard-coding it.
		var types = [
			// Leerdoelenkaarten
			'ldk_vakleergebied','ldk_vakkern','ldk_vaksubkern','ldk_vakinhoud',
			// Inhouden
			'lpib_vakleergebied', 'lpib_vakkern','lpib_vaksubkern','lpib_vakinhoud',
			// leerplan in beeld
			'lpib_vakkencluster','lpib_leerlijn',
			// syllabus
			'syllabus_vakleergebied', 'syllabus', 'syllabus_specifieke_eindterm', 'syllabus_toelichting', 'syllabus_vakbegrip',
			// inhoudslijnen
			'inh_vakleergebied', 'inh_cluster', 'inh_inhoudslijn',
			// referentiekader
			'ref_vakleergebied', 'ref_domein', 'ref_subdomein', 'ref_onderwerp', 'ref_deelonderwerp', 'ref_tekstkenmerk',
			// ERK
			'erk_vakleergebied','erk_gebied','erk_categorie','erk_taalactiviteit','erk_schaal',
			'erk_candobeschrijving','erk_voorbeeld','erk_lesidee',
			// Doelen
			'doelniveau','doel','niveau','vakleergebied', 'alias', 'tag',
			// Kerndoelen
			'kerndoel_vakleergebied','kerndoel_domein','kerndoel_uitstroomprofiel','kerndoel',
			// Examenprogramma
			'examenprogramma_vakleergebied', 'examenprogramma','examenprogramma_domein',
			'examenprogramma_subdomein','examenprogramma_eindterm','examenprogramma_kop1',
			'examenprogramma_kop2','examenprogramma_kop3','examenprogramma_kop4','examenprogramma_body',
			// Examenprogramma beroepsgericht
			'examenprogramma_bg','examenprogramma_bg_profiel','examenprogramma_bg_kern','examenprogramma_bg_kerndeel',
			'examenprogramma_bg_module','examenprogramma_bg_moduletaak','examenprogramma_bg_keuzevak',
			'examenprogramma_bg_keuzevaktaak','examenprogramma_bg_deeltaak','examenprogramma_bg_globale_eindterm',
			// Niveau hierarchie
			'nh_categorie','nh_sector','nh_schoolsoort','nh_leerweg','nh_bouw','nh_niveau',
			// Doelgroepteksten
			'leerlingtekst'
		];

		// ignore related links that aren't parent-child relations		
		var ignore = {
			'ldk_vak': ['vakleergebied_id'],
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
		
		
		// create an index on entity id (for all sections)
		Object.keys(curriculum.data).forEach(function(section) {
			curriculum.data[section].forEach(function(entity,index) {
				if (entity.id) { // alias has no id
					idIndex[entity.id] = Object.assign(entity, { section: section, parents: [] });
					if (entity.types) {
						typeIndex[entity.id] = entity.types[0]
					} else {
						typeIndex[entity.id] = section
					}
				}
			});
		});

		// for all entries in the idIndex, find all parents
		Object.keys(idIndex).forEach(function(id) {
			var entity = idIndex[id];
			if (entity.section=='deprecated') {
				entity.deprecated = true
				return;
			}
			entity.deprecated = false

			// for all sections, check if there is a reference to this entity's id
			var parentTypes = types.slice();
			parentTypes.forEach(function(section) {
				// if entity.section is e.g. ldk_vak, and section is vak, this link should not be
				// counted as a parent.
				if (shouldIgnore(entity.section, section+'_id')) {
					console.log('Ignoring '+entity.section+'.'+section+'_id');
					return;
				}
				if (typeof entity[section+'_id'] != 'undefined') {
					if (Array.isArray(entity[section+'_id'])) {
						entity[section+'_id'].forEach(function(childId) {
							if (typeof idIndex[childId] == 'undefined') {
								console.log('missing '+childId+' in '+section, entity);
							} else {
								idIndex[childId].parents.push(id);
							}
						});
					} else if (typeof idIndex[entity[section+'_id']] != 'undefined') {
						idIndex[entity[section+'_id']].parents.push(id);
					}
				}
			});
			if (typeof entity['doelniveau_id'] != 'undefined') {
				entity['doelniveau_id'].forEach(function(childId) {
					if (typeof idIndex[childId] == 'undefined') {
						console.log('missing '+childId+' in doelniveau', entity);
					} else {
						idIndex[childId].parents.push(id);
					}
				});
			}
		});

		// deprecate all entities with 'deleted' true or 1
		Object.keys(idIndex).forEach(function(id) {
			var ent = idIndex[id];
			if (ent.deleted==true || ent.deleted==1) {
				console.log('deleted '+ent.id);
				// set types, replacedBy
				ent.types = [ ent.section ];
				ent.replacedBy = [];
				// move entity to deprecated list
				curriculum.data[ent.section] = curriculum.data[ent.section].filter(function(child) {
					return child.id != ent.id;
				});
				curriculum.data.deprecated.push(ent);
				// remove entity from all parents
				ent.parents.forEach(function(parent) {
					if (parent[ent.section+'_id']) {
						parent[ent.section+'_id'] = parent[ent.section+'_id'].filter(function(childId) {
							return childId != ent.id;
						});
					}
				});
				// remove parents list
				ent.parents = [];
				ent.section = 'deprecated';
				ent.deprecated = true
			}
			if (ent.replaced_by) {
				ent.replacedBy = ent.replaced_by
				delete ent.replaced_by
				ent.deprecated = true
			}
		});

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
						var parent = idIndex[parentId];
						if (Array.isArray(niveau[parent.section+'_id'])) {
							if (niveau[parent.section+'_id'].indexOf(parentId)==-1) {
								niveau[parent.section+'_id'].push(parentId);
							}
							if (typeof parent.parents != 'undefined') {
								addParentsToNiveauIndex(parent.parents, niveaus, indent+"  ");
							}
						}
					});
				});
			}
			parents.forEach(function(parentId) {
				if (!reverseNiveauIndex[parentId]) {
					reverseNiveauIndex[parentId] = [];
				}
				reverseNiveauIndex[parentId] = reverseNiveauIndex[parentId].concat(niveaus).filter(onlyUnique);
			});
		}

		function onlyUnique(value, index, self) {
			return self.indexOf(value)===index;
		}

		var count = 0;
		var error = 0;

		function addEntityWithNiveau(entity, section) {
			var parents = idIndex[entity.id].parents;
			if (!parents) {
				console.log('missing entity parents for '+entity.id);
				error++;
				return;
			}
			count++;
			addParentsToNiveauIndex(parents, entity.niveau_id);
			if (entity.niveau_id) {
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
					console.log('unknown section',section);
				}
			}
		}

		// for each doelniveau, add its parents to the niveauIndex
		curriculum.data.doelniveau.forEach(function(entity) {
			addEntityWithNiveau(entity, 'doelniveau');
		});
		curriculum.data.kerndoel.forEach(function(entity) {
			addEntityWithNiveau(entity, 'kerndoel');
		});
		curriculum.data.syllabus_specifieke_eindterm.forEach(function(entity) {
			addEntityWithNiveau(entity, 'syllabus_specifieke_eindterm');
		});
		curriculum.data.examenprogramma.forEach(function(entity) {
			addEntityWithNiveau(entity, 'examenprogramma');
		});
		curriculum.data.syllabus.forEach(function(entity) {
			addEntityWithNiveau(entity, 'syllabus');
		});
		var c = 0;
		var total = curriculum.data.examenprogramma_eindterm.length;
		curriculum.data.examenprogramma_eindterm.forEach(function(entity) {
			c++;
			process.stdout.write("\r"+c+'/'+total+' '+entity.id);
			addEntityWithNiveau(entity, 'examenprogramma_eindterm');
		});

		console.log("\n"+count+' correct, '+error+' errors');
	}


	var fs = require('fs');
	var dummy = JSON.parse(fs.readFileSync('./dummy.json'));
	Object.keys(dummy).forEach(function(section) {
		console.log('appending dummy to '+section);
		if (!curriculum.data[section]) {
			curriculum.data[section] = [];
		}
		dummy.replacedBy = dummy.replaced_by
		delete dummy.replaced_by
		curriculum.data[section].push(dummy[section][0]);
		dummy.deprecated = true
	});
	
	makeIndex();
	curriculum.data.niveauIndex = niveauIndex;
	
	var combined = JSON.parse(JSON.stringify((curriculum)));

	// now make sure all _id fields are arrays, ldk_* might have them as single values
	for (i in combined.data) {
		combined.data[i].forEach(function(entry, index) {
			var fields = ["vakleergebied_id", "lpib_vakkern_id", "lpib_vaksubkern_id", "lpib_vakinhoud_id"];
			fields.forEach(function(field) {
				if (entry[field] && !Array.isArray(entry[field])) {
					combined.data[i][index][field] = [entry[field]];
				}
			});
		});
	}

	// graphql server breaks on empty arrays in the top level, so remove them
	for (i in combined.data) {
		if (/.*_deprecated$/.exec(i)) {
			if (Array.isArray(combined.data[i]) && combined.data[i].length === 0) {
				delete combined.data[i];
			}
		}
	}

	// graphlql server bug: searching by id on Deprecated fails and returns 
	// the first entity that has no title 
	// so fix that by adding an empty title to those entities
	// reverted: searching on allDeprecated(filter:{id:$id}) does work
	for (entity of combined.data.deprecated) {
//		if (entity.title===null || typeof entity.title==="undefined") {
//			entity.title = ""
//		}
		if (entity.replaced_by) {
			entity.replacedBy = entity.replaced_by
			delete entity.replaced_by
		}
		entity.deprecated = true
		// re-insert entity in original types lists
		// so queries can find them
		if (Array.isArray(entity.types)) {
			for (type of entity.types) {
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
//	combined.data.deprecated = []

	// now add type index
	combined.data.type = []
	for (id in idIndex) {
		let type = typeIndex[id]
		if (!type) {
			continue
		}
		combined.data.type.push({
			id: id,
			type: type
		})
	}

	var fileData = JSON.stringify(combined.data, null, "\t");
	fs.writeFileSync('./combined.json', fileData);