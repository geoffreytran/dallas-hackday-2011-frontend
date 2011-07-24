/* Copyright 2009 Palm, Inc.  All rights reserved. */

//attrs: template, modelProperty: default: value
//model: value
Mojo.Widget.ExperimentalDataDiv = Class.create({
	setup: function() {
		var content = "";
		
		this.modelProperty = this.controller.attributes.modelProperty || Mojo.Widget.defaultModelProperty;
		this.modelFieldId = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		
		//render the user template
		if (this.controller.attributes.template) {
			content = Mojo.View.render({template: this.controller.attributes.template, object: this.controller.model});
		}
		content += Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath('/datadiv/datadiv'), attributes: {id: this.modelFieldId}});
		
		this.controller.element.innerHTML = content;
		
		this._createDataObject();

		this._createElementFuncs();
	},
	
	_createElementFuncs: function() {
		var that = this;
		
		if (!this.controller.element.mojo) {
			this.controller.element.mojo = {};
		}
		this.controller.element.mojo.__defineGetter__("model", function(){
			return that.jsonModel;
		});
		this.controller.element.mojo.__defineSetter__("model", function(inModel){
			that.controller.model = inModel;
			that._createDataObject(inModel);
		});
	},
	
	_createDataObject: function() {
		var data = this.controller.model[this.modelProperty];
		var jsonData;
		var jsonField;
		
		//if the value is a string, convert it to a json object
		if (typeof data === 'string') { //is string
		 	jsonData = Object.toJSON(data);
		} else {
			jsonData = data;
		}
		
		jsonField = this.controller.element.querySelector("#"+this.modelFieldId);
		if (jsonField) {
			jsonField.value = jsonData;
		}
		this.jsonModel = jsonData;	
	},
	
	getModel: function() {
		return this.jsonModel;
	},
	
	cleanup: function() {
		
	}
});