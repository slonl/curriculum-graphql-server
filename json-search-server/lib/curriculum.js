"use strict";

	module.exports = {
		create: function() {
			return new Curriculum();
		}
	};

	function Curriculum() {
		/**
		 * Contains entities by type
		 */
		this.data    = {};

		this.index   = {
			/**
			 * All entities by id
			 */
			id: {},

			/**
			 * Type by id
			 */
			type: {},

			/**
			 * Schema by id
			 */
			schema: {},

			/**
			 * References to other entities by id
			 */
			references: {},

			/**
			 * Seperate index of all deprecated entities
			 */
			deprecated: {}
		};

		/**
		 * An array of all the schemas as json
		 */
		this.schemas = [];

		/**
		 * The schemas by schema name
		 */
		this.schema  = {};
	}

	Curriculum.prototype.uuid = function() {
		const uuidv4 = require('uuid/v4');
		return uuidv4();
	}

	Curriculum.prototype.updateReferences = function(object) {
		var self = this;
		Object.keys(object).forEach(k => {
			if (Array.isArray(object[k]) 
				&& ( k.substr(k.length-3)=='_id'
					/*|| k=='replaces'
					|| k=='replacedBy' */)
			) {
				object[k].forEach(id => {
					if (!self.index.references[id]) {
						self.index.references[id] = [];
					}
					self.index.references[id].push(object.id);
				});
			} else if (k.substr(k.length-3)=='_id'
				&& typeof object[k]=='string'
			) {
				var id = object[k];
				if (!self.index.references[id]) {
					self.index.references[id] = [];
				}
				self.index.references[id].push(object.id);
			}
		});
	}
	
	Curriculum.prototype.add = function(schemaName, section, object) 
	{
		if (!object.id) {
			object.id = this.uuid();
		}
		if (section == 'deprecated') {
			throw new Error('You cannot add to deprecated, use the deprecate function instead');
		}
//		console.log('add: '+object.id+' in '+section);
//		console.log(JSON.stringify(object));
		object.unreleased = true;
		this.data[section].push(object);
		this.schema[schemaName][section].push(object);
		this.index.id[object.id] = object;
		this.index.type[object.id] = section;
		this.index.schema[object.id] = schemaName;
		this.updateReferences(object);
		return object.id;
	}

	Curriculum.prototype.deprecate = function(entity, replacedBy) {
		var currentSection = this.index.type[entity.id];
		if (!currentSection) {
			throw new Error('entity '+entity.id+' is not part of any schema');
		}

		if (entity.unreleased) {
			// just remove it
			delete this.index.id[entity.id];
			delete this.index.type[entity.id];
			delete this.index.schema[entity.id];
		} else {
			this.replace(entity.id, replacedBy);
		}
	}

	Curriculum.prototype.update = function(section, id, diff)
	{
		const uuidv4 = require('uuid/v4');
		const jsondiffpatch = require('jsondiffpatch');
//		console.log('update: '+id);
//		console.log(JSON.stringify(diff));
		if (section == 'deprecated') {
			throw new Error('You cannot update deprecated entities');
		}
		var entity = this.index.id[id];
		var clone  = this.clone(entity);
		jsondiffpatch.patch(clone, diff);
		// check if entity must be deprecated
		// if so check that clone.id is not entity.id
		// if so create a new id for clone
		if (typeof entity.unreleased == 'undefined' || !entity.unreleased) {
			if (section=='deprecated') {
				// updating a deprecated entity, so only the replacedBy may be updated
				if (Object.keys(diff).length>1 || typeof diff.replacedBy == 'undefined') {
					throw new Error('illegal deprecated entity update '+id+': '+JSON.stringify(diff));
				}
			}
			if (clone.id == entity.id) {
				clone.id = uuidv4();
			}
			this.add(section, clone);
			this.replace(entity.id, clone.id);
		} else {
			// no need to deprecate entity, just update its contents
			if (clone.id!=entity.id) {
				throw new Error('update cannot change entity id');
			}
			entity = jsondiffpatch.patch(entity, diff);
		}
		this.updateReferences(entity);
		return entity.id;
	}

	/**
	 * Replace an entity with a new entity
	 * Find all links to the old entity and replace the links
	 * add replacedBy in old entity
	 * add replaces in new entity
	 */
	Curriculum.prototype.replace = function(id, newId) 
	{
		var self = this;
		var oldObject  = this.index.id[id];
		var section    = this.index.type[id];
		if (section == 'deprecated') {
			// don't change anything thats already deprecated
			return;
		}
		var schemaName = this.index.schema[id];
		if (!Array.isArray(this.schema[schemaName][section])) {
			throw new Error(section+' is not part of schema '+schemaName);
		}
		if (newId) {
			var newObject  = this.index.id[newId];
		}
		if (!oldObject) {
			console.log('Could not find entity with id '+id+' to replace');
			die();
		}
		if (!oldObject.unreleased) {
			if (newObject) {
				if (!newObject.replaces) {
					newObject.replaces = [];
				}
				newObject.replaces.push(id);
			}
			if (!oldObject.replacedBy) {
				oldObject.replacedBy = [];
			}
			if (newId) {
				oldObject.replacedBy = oldObject.replacedBy.push(newId);
			}
		}
		
		if (!oldObject.types) {
			oldObject.types = [];
		}
		oldObject.types.push(section);
		oldObject.types = [...new Set(oldObject.types)];

		// remove item from current section
		this.data[section] = this.data[section].filter(function(e) {
			return e.id != oldObject.id;
		});

		this.schema[schemaName][section] = this.schema[schemaName][section].filter(function(e) {
			return e.id != oldObject.id;
		});

		if (!oldObject.unreleased) {
			if (this.index.type[oldObject.id]!='deprecated') {
				this.data.deprecated.push(oldObject);
				if (!this.schema[schemaName].deprecated) {
					console.log('schema '+schemaName+' missing deprecated');
				}
				this.schema[schemaName].deprecated.push(oldObject);
				this.index.type[oldObject.id] = 'deprecated';
			}
		}

		var parentSections = this.getParentSections(section);
		var parentProperty = this.getParentProperty(section);
//		console.log('replacing links for '+section+' '+id, parentSections);
		if (parentSections.length) {
			parentSections.forEach(function(parentSection) {
				self.replaceLinks(parentSection, parentProperty, id, newId);
			});
//			console.log('replacing links done for '+section+' '+id);
		} else {
//			console.log('skipped replacing links');
		}
	}

	Curriculum.prototype.replaceLinks = function(section, property, id, newId)
	{
		if (section == 'deprecated') {
			throw new Error('You cannot modify deprecated entities');
		}
		if (section && this.data[section]) {
			console.log('replaceLinks for '+id+' to '+newId);
			this.data[section].filter(
				function(entity) 
				{
					return entity[property] 
						&& entity[property].indexOf(id)!=-1;
				}
			).forEach(
				function(entity) 
				{
//					console.log('replacing links in '+entity.id+' '+property+' from '+id+' to '+newId);
					var index = entity[property].indexOf(id);
					if (!entity.unreleased) {
						entity.dirty = true;
					}
					if (newId) {
						entity[property].splice(index, 1, newId);
					} else {
						entity[property].splice(index, 1);
					}
				}
			);
		} else {
			console.log('replaceLinks called for undefined section '+section);
		}
	}

	Curriculum.prototype.getParentSections = function(section) 
	{
		var parentSections = [];
		var parentProperty = this.getParentProperty(section);
		this.schemas.forEach(function(schema) {
			Object.keys(schema.definitions).forEach(
				function(schemaSection) 
				{
					if (typeof schema.definitions[schemaSection].properties != 'undefined' 
						&& typeof schema.definitions[schemaSection].properties[parentProperty] != 'undefined'
						&& schemaSection != 'deprecated'
					) {
						parentSections.push(schemaSection);
					}
				}
			);
		});
		return parentSections;
	}

	Curriculum.prototype.getParentProperty = function(section) 
	{
		return section+'_id';
	}

	Curriculum.prototype.loadSchema = function(schemaName, dir='') {
		var fs = require('fs');
		var context = fs.readFileSync(schemaName,'utf-8')
		var schema = JSON.parse(context);
		this.schemas.push(schema);
		this.schema[schemaName] = {};
		var properties = Object.keys(schema.properties);
		var self = this;
		properties.forEach(function(propertyName) {
			if (typeof schema.properties[propertyName]['#file'] != 'undefined') {
				var file = schema.properties[propertyName]['#file'];
				var fileData = fs.readFileSync(dir+file, 'utf-8');
				console.log(propertyName+': reading '+dir+file);
				self.data[propertyName] = JSON.parse(fileData);
				self.schema[schemaName][propertyName] = self.data[propertyName];				
				if (typeof self.data[propertyName] == 'undefined') {
					console.log(propertyName+' not parsed correctly');
				} else if (typeof self.data[propertyName].length == 'undefined') {
					console.log(propertyName+' has no length');
				} else {
					console.log(self.data[propertyName].length + ' items found');
				}
				self.data[propertyName].forEach(function(entity) {
					if (entity.id) {
						if (self.index.id[entity.id]) {
							console.log('Duplicate id in '+propertyName+': '+entity.id,
								self.index.id[entity.id], entity);
						} else {
							self.index.id[entity.id] = entity;
							self.index.type[entity.id] = propertyName;
							self.index.schema[entity.id] = schemaName;
							self.updateReferences(entity);
							if (/deprecated/.exec(propertyName)!==null) {
								self.index.deprecated[entity.id] = entity;
							}
						}
						if (typeof entity.unreleased == 'undefined') {
							// Object.freeze(entity);
						}
					}
				});
			} else {
				console.log('skipping '+propertyName);
			}
		});
		return schema;
	}

	Curriculum.prototype.exportFiles = function(schema, schemaName, dir='')
	{
		const fs    = require('fs');
		var properties = Object.keys(schema.properties);
		var self = this;
		

		properties.forEach(function(propertyName) {
			if (typeof schema.properties[propertyName]['#file'] != 'undefined') {
				var file = schema.properties[propertyName]['#file'];
				var fileData = JSON.stringify(self.schema[schemaName][propertyName], null, "\t");//.replace(/\//g, '\\/');
				if (!fs.existsSync(dir+'data/')) {
					fs.mkdirSync(dir+'data/', { recursive: true});
				}
				fs.writeFileSync(dir+file, fileData);
			}
		});
	}

	Curriculum.prototype.clone = function(object)
	{
		return JSON.parse(JSON.stringify(object));
	}

	Curriculum.prototype.getDirty = function()
	{
		var dirty = [];
		var self = this;
		Object.keys(this.index.id).forEach(function(id) {
			if (self.index.id[id].dirty && !self.index.id[id].unreleased) {
				dirty.push(self.index.id[id]);
			}
		});
		return dirty;
	}
	