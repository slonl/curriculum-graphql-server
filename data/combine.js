	var curriculum	 = require('./curriculum-doelen/lib/curriculum.js');
	var doelenSchema   = curriculum.loadSchema('./curriculum-doelen/context.json', './curriculum-doelen/');
	var kerndoelenSchema   = curriculum.loadSchema('./curriculum-kerndoelen/context.json', './curriculum-kerndoelen/')
	var leerdoelenkaartenSchema = curriculum.loadSchema('./curriculum-leerdoelenkaarten/context.json', './curriculum-leerdoelenkaarten/');
	var inhoudenSchema = curriculum.loadSchema('./curriculum-inhouden/context.json', './curriculum-inhouden/');

	//FIXME: alias has 'parent_id', so data.parent is needed for json-graphql-server
	curriculum.data.parent = [{id:null}];

	//add niveauIndex
	var niveauIndex = [];
	var idIndex = {};
	var reverseNiveauIndex = {};
	function makeIndex() {

		// FIXME: read this from the json context instead of hard-coding it.
		var types = [
			// Inhouden
			'vak','vakkern','vaksubkern','vakinhoud',
			// Doelen
			'doelniveau','doel','niveau',
			// Leerdoelenkaarten
			'ldk_vak','ldk_vakkern','ldk_vaksubkern','ldk_vakinhoud',
			// Kerndoelen
			'kerndoel','kerndoel_domein','kerndoel_vakleergebied','kerndoel_uitstroomprofiel'
		];
		
		types.forEach(function(section) {
			curriculum.data[section].forEach(function(entity) {
				idIndex[entity.id] = Object.assign({ section: section, parents: [] },entity);
			});
		});

		Object.keys(idIndex).forEach(function(id) {
			var entity = idIndex[id];
			var parentTypes = types.slice();
			parentTypes.pop();
			parentTypes.forEach(function(section) {
				if (typeof entity[section+'_id'] != 'undefined') {
					if (Array.isArray(entity[section+'_id'])) {
						entity[section+'_id'].forEach(function(childId) {
							if (typeof idIndex[childId] == 'undefined') {
								console.log('missing '+childId+' in '+section, entity);
							}
							idIndex[childId].parents.push(id);
						});
					} else {
						if (typeof idIndex[entity[section+'_id']] != 'undefined') {
							idIndex[entity[section+'_id']].parents.push(id);
						}
					}
				}
				if (typeof entity['doelniveau_id'] != 'undefined') {
					entity['doelniveau_id'].forEach(function(childId) {
						if (typeof idIndex[childId] == 'undefined') {
							console.log('missing '+childId+' in '+section, entity);
						}
						idIndex[childId].parents.push(id);
					});
				}
			});
		});

		function getNiveauIndex(niveauId) {
			var niveauOb = niveauIndex.filter(function(niveauOb) {
				return niveauOb.niveau_id == niveauId;
			}).pop();
			if (!niveauOb) {
				niveauOb = {
					niveau_id: niveauId,
					vak_id: [],
					vakkern_id: [],
					vaksubkern_id: [],
					vakinhoud_id: [],
					ldk_vak_id: [],
					ldk_vakkern_id: [],
					ldk_vaksubkern_id: [],
					ldk_vakinhoud_id: [],
					doel_id: []
				};
				niveauIndex.push(niveauOb);
			}
			return niveauOb;
		}

		function getParentType(entity) {
			var types=['vak','vakkern','vaksubkern','vakinhoud'];
			var index=types.indexOf(entity.section);
			if (index>0) {
				return types[index-1];
			}
		}

		function addParentsToNiveauIndex(parents, niveaus) {
			niveaus.forEach(function(niveauId) {
				var niveau = getNiveauIndex(niveauId);
				parents.forEach(function(parentId) {
					var parent = idIndex[parentId];
					if (Array.isArray(niveau[parent.section+'_id'])) {
						if (niveau[parent.section+'_id'].indexOf(parentId)==-1) {
							niveau[parent.section+'_id'].push(parentId);
						}
						if (typeof parent.parents != 'undefined') {
							addParentsToNiveauIndex(parent.parents, niveaus);
						}
					}
				});
			});
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
		curriculum.data.doelniveau.forEach(function(doelniveau) {
			var parents = idIndex[doelniveau.id].parents;
			if (!parents) {
				console.log('missing doelniveau parents for '+doelniveau.id);
				error++;
				return;
			}
			count++;
			addParentsToNiveauIndex(parents, doelniveau.niveau_id);
			doelniveau.niveau_id.forEach(function(niveauId) {
				var index = getNiveauIndex(niveauId);
				doelniveau.doel_id.forEach(function(doelId) {
					if (index.doel_id.indexOf(doelId)==-1) {
						index.doel_id.push(doelId);
					}
				});
			});
		});
		console.log(count+' correct, '+error+' errors');
	}


	var fs = require('fs');

	makeIndex();
	curriculum.data.niveauIndex = niveauIndex;
	
	var combined = JSON.parse(JSON.stringify((curriculum)));
	
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

	for (i in combined.data) {
		var fields = ["deprecated", "ldk_deprecated"];
		if (fields.indexOf(i) !== 0) {
			if (Array.isArray(combined.data[i]) && combined.data[i].length === 0) {
				delete combined.data[i];
			}
		}
	}

	var fileData = JSON.stringify(combined.data, null, "\t");
	fs.writeFileSync('./combined.json', fileData);