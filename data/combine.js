	var curriculum	 = require('./curriculum-doelen/lib/curriculum.js');
	var doelenSchema   = curriculum.loadSchema('./curriculum-doelen/context.json', './curriculum-doelen/');
	var kerndoelenSchema   = curriculum.loadSchema('./curriculum-kerndoelen/context.json', './curriculum-kerndoelen/')
//	var leerdoelenkaartenSchema = curriculum.loadSchema('./curriculum-leerdoelenkaarten/context.json', './curriculum-leerdoelenkaarten/');
	var inhoudenSchema = curriculum.loadSchema('./curriculum-inhouden/context.json', './curriculum-inhouden/');
	var examenprogrammaSchema = curriculum.loadSchema('./curriculum-examenprogramma/context.json', './curriculum-examenprogramma/');
	var examenprogrammaBgSchema = curriculum.loadSchema('./curriculum-examenprogramma-bg/context.json', './curriculum-examenprogramma-bg/');
	var doelgroeptekstenSchema = curriculum.loadSchema('./curriculum-doelgroepteksten/context.json', './curriculum-doelgroepteksten/');
	var syllabusSchema = curriculum.loadSchema('./curriculum-syllabus/context.json', './curriculum-syllabus/');

	//FIXME: alias has 'parent_id', so data.parent is needed for json-graphql-server
	curriculum.data.parent = [{id:null}];

	//add niveauIndex
	var niveauIndex = [];
	var idIndex = {};
	var reverseNiveauIndex = {};
	function makeIndex() {

		// FIXME: read this from the json context instead of hard-coding it.
		var types = [
			// Leerdoelenkaarten
//			'ldk_vak','ldk_vakkern','ldk_vaksubkern','ldk_vakinhoud',
			// Inhouden
//			'vak',
			'vakkern','vaksubkern','vakinhoud',
			// Doelen
			'doelniveau','doel','niveau',
			// Kerndoelen
			'kerndoel','kerndoel_domein','kerndoel_vakleergebied','kerndoel_uitstroomprofiel',
			// Examenprogramma
			'examenprogramma','examenprogramma_vakleergebied','examenprogramma_domein','examenprogramma_subdomein','examenprogramma_eindterm',
			'examenprogramma_kop1','examenprogramma_kop2','examenprogramma_kop3','examenprogramma_kop4','examenprogramma_body',
			// Examenprogramma beroepsgericht

			'examenprogramma_bg','examenprogramma_bg_profiel','examenprogramma_bg_kern','examenprogramma_bg_kerndeel','examenprogramma_bg_module',
			'examenprogramma_bg_moduletaak','examenprogramma_bg_keuzevak','examenprogramma_bg_keuzevaktaak','examenprogramma_bg_deeltaak','examenprogramma_bg_globale_eindterm',

			// Doelgroepteksten
			'leerlingtekst',
			// leerplan in beeld
			'vakkencluster','leerlijn',
			//syllabus
			'syllabus', 'syllabus_specifieke_eindterm', 'syllabus_toelichting', 'syllabus_vakbegrip'
		];

		// ignore related links that aren't parent-child relations		
		var ignore = {
//			'ldk_vak': ['vak_id'],
//			'ldk_vakkern': ['vakkern_id'],
//			'ldk_vaksubkern': ['vaksubkern_id'],
//			'ldk_vakinhoud': ['vakinhoud_id'],
			'kerndoel_vakleergebied': ['vak_id'],
			'examenprogramma_vakleergebied': ['vak_id'],
			'leerlijn': ['vak_id', 'vakinhoud_id'],
			'vakkencluster': ['vak_id']
		};
		
		function shouldIgnore(section, property) {
			return (ignore[section] && ignore[section].indexOf(property)!==-1);
		}
		
		
		// create an index on entity id (for all sections)

		Object.keys(curriculum.data).forEach(function(section) {
			curriculum.data[section].forEach(function(entity) {
				idIndex[entity.id] = Object.assign({ section: section, parents: [] }, entity);
				if (!idIndex[entity.id].section) {
					console.log('error',section,entity);
					process.exit();
				}
			});
		});


		// for all entries in the idIndex, find all parents
		Object.keys(idIndex).forEach(function(id) {
			var entity = idIndex[id];
			if (entity.section=='deprecated') {
				return;
			}

			// for all sections, check if there is a reference to this entity's id
			var parentTypes = types.slice();
//			parentTypes.pop();//? popt niveau
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
					} else {
						if (typeof idIndex[entity[section+'_id']] != 'undefined') {
							idIndex[entity[section+'_id']].parents.push(id);
						}
					}
				}
			});
			if (typeof entity['doelniveau_id'] != 'undefined') {
				entity['doelniveau_id'].forEach(function(childId) {
					if (typeof idIndex[childId] == 'undefined') {
						console.log('missing '+childId+' in '+section, entity);
					} else {
						idIndex[childId].parents.push(id);
					}
				});
			}
		});

		function getNiveauIndex(niveauId) {
			var niveauOb = niveauIndex.filter(function(niveauOb) {
				return niveauOb.niveau_id == niveauId;
			}).pop();
			if (!niveauOb) {
				niveauOb = {
					niveau_id: niveauId,
//					vak_id: [],
					vakkern_id: [],
					vaksubkern_id: [],
					vakinhoud_id: [],
//					ldk_vak_id: [],
//					ldk_vakkern_id: [],
//					ldk_vaksubkern_id: [],
//					ldk_vakinhoud_id: [],
					doel_id: [],
					kerndoel_id: [],
					examenprogramma_eindterm_id: [],
					examenprogramma_subdomein_id: [],
					examenprogramma_domein_id: [],
					examenprogramma_id: [],
					syllabus_specifieke_eindterm_id: [],
					syllabus_toelichting_id: [],
					syllabus_vakbegrip_id: [],
					syllabus_id: []
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
						console.log(indent+parentId);
						if (seen[niveauId][parentId]) {
//							console.error('loop detected, skipping '+parentId);
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
				} else if (section == 'examenprogramma_eindterm') {
					entity.niveau_id.forEach(function(niveauId) {
						var index = getNiveauIndex(niveauId);
						index[section+'_id'].push(entity.id);
					});
				} else {
					console.log('unknown section',section);
				}
			}
		}

		// for each doelniveau, add its parents to the niveauIndex
		curriculum.data.doelniveau.forEach(function(entity) {
			addEntityWithNiveau(entity, 'doelniveau');
		});
		var c = 0;
		var total = curriculum.data.examenprogramma_eindterm.length;
		curriculum.data.examenprogramma_eindterm.forEach(function(entity) {
			c++;
			process.stdout.write("\r"+c+'/'+total+' '+entity.id);
			addEntityWithNiveau(entity, 'examenprogramma_eindterm');
		});
		
/*
		var seen = {};
		function walkParents(entity, indent) {
			console.log(indent+entity.id+' '+entity.section);
			entity.parents.forEach(function(parent) {
				walkParents(idIndex[parent], indent+'  ');
			});
		}
		walkParents(idIndex["60436a57-d4e3-4c40-9da0-5ed326b1c45e"]);
*/
		console.log(count+' correct, '+error+' errors');
	}


	var fs = require('fs');
	var dummy = JSON.parse(fs.readFileSync('./dummy.json'));
	Object.keys(dummy).forEach(function(section) {
		curriculum.data[section].push(dummy[section][0]);
	});
	
	makeIndex();
	curriculum.data.niveauIndex = niveauIndex;
	
	var combined = JSON.parse(JSON.stringify((curriculum)));
	
	// now make sure all _id fields are arrays, ldk_* might have them as single values
	for (i in combined.data) {
		combined.data[i].forEach(function(entry, index) {
			var fields = ["vak_id", "vakkern_id", "vaksubkern_id", "vakinhoud_id"];
			fields.forEach(function(field) {
				if (entry[field] && !Array.isArray(entry[field])) {
					combined.data[i][index][field] = [entry[field]];
				}
			});
		});
	}

	// graphql server breaks on empty arrays in the top level, so remove them
	for (i in combined.data) {
		var fields = ["ldk_deprecated", "examenprogramma_deprecated"];
		if (fields.indexOf(i) !== 0) {
			if (Array.isArray(combined.data[i]) && combined.data[i].length === 0) {
				delete combined.data[i];
			}
		}
	}

	var fileData = JSON.stringify(combined.data, null, "\t");
	fs.writeFileSync('./combined.json', fileData);