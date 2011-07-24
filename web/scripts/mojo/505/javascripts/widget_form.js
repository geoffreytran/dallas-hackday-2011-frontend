/*

A form widget is used for creating a user form. Forms provide automatic error insertion and drawing. Forms also automatically provide a button and make sure that when the user hits "enter" in the last required text field, the form is submitted.
Hitting enter in the last editable field will submit the form
When the user has focused the last editable field, the submit button will get "palm-focus" styling to show that enter will submit it
There is no style for required fields; app developers should not add non-required fields unless they have to!
Errors go under the field where there was an issue; globalError goes at the bottom of the form, above the button (if it exists.)



Copyright 2009 Palm, Inc.  All rights reserved.

**/

/** API design:
Contains a button: need label, activity, etc
attributes {
	assistant: used to control validation, form submission; for more info, see below.
	submitLabel: label for the button; if undefined or empty string, will not create a button
	}
model {
	requiredItems: array of id's of what fields are required
}

The assistant should have the following methods:
     validate(inputs, callback): REQUIRED; On completion of validate, the Form widget will call the errorAction, if errors are returned; otherwise it will call the default action
           inputs: array of id's and values from the form; this mirrors the required model
		   callback: function that takes an object consisting of an array (errors) and/ or a globalError if the validation failed, or nothing if it was successful;  the form will automatically display the errors in the correct locations
	
	hasRequired(): OPTIONAL; On completion of hasRequired, the Form widget will call the valdiate function if hasRequired returns true; otherwise, it will not validate the form; hasRequired is called as the user completes each form field
	
	
	errorAction(): OPTIONAL; If validate or submit fails, this is called
          
	defaultAction(callback): REQUIRED; called as a result of successful validation of the form
		callback: function that takes an object consisting of an array (errors) and/ or a globalError if the validation failed, or nothing if it was successful; the form will automatically display the errors in the correct locations

**/

/**
 * This entire widget class is private in the v1 Framework.
  * @private
  * @class
*/

Mojo.Widget.ExperimentalForm = Class.create({
	ERROR_TEMPLATE: Mojo.Widget.getSystemTemplatePath('/form/error'), //for single errors
	ASYNC_DELAY: 500,
	
	setup: function() {	
		Mojo.require(this.controller.attributes.assistant, "You must specify an assistant.");
		Mojo.require(this.controller.attributes.assistant.validate, "You must specify a validate function on your assistant.");
		Mojo.require(this.controller.attributes.assistant.defaultAction, "You must specify a default action omn your assistant.");
		
		this.assistant = this.controller.attributes.assistant;
		this.required = this.controller.model.requiredItems.clone();
		this.lastItem = this.controller.get(this.required[this.required.length-1]);
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		
		this._renderWidget();
		this._setupListeners();
		this._setupCallbacks();
		this._initializeHasContent();
	},
	
	/** submit button. possible to have a form with no button? **/
	_setupButton: function() {
		var buttonType, buttonContent, buttonAttrs, buttonLabel;

		buttonLabel = this.controller.valueFromModelOrAttributes('submitLabel');
		//setup the button
		if (buttonLabel && !buttonLabel.blank()) {
			buttonAttrs = {
				type: Mojo.Widget.activityButton
			};
			this.buttonModel = {
				label: buttonLabel,
				disabled: this.required.length ? true : false
			};
			buttonContent = Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath('/form/button'), attributes: {divPrefix: this.divPrefix}});
			this.controller.element.insert({bottom: buttonContent});
			this.button = this.controller.get(this.divPrefix+'-button');
			this.buttonContainer = this.controller.get(this.divPrefix+'-buttonContainer');
			this.controller.scene.setupWidget(this.button.id, buttonAttrs, this.buttonModel);
		}
	},
	
	/** error area for an overall error **/
	_setupGlobalError: function() {
		var globalErrorContent = Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath('/form/globalError'), attributes: {id: this.divPrefix+"_globalError"}});
		
		if (this.button) {
			Element.insert(this.button, {before: globalErrorContent});
		} else {
			this.controller.element.insert({bottom: globalErrorContent});
		}
		this.globalError = this.controller.get(this.divPrefix+"_globalError");
		this.globalErrorContent = this.controller.get(this.divPrefix+"_globalError_content");
	},
	
	_renderWidget: function() {
		this._setupButton();
		this._setupGlobalError();
		
		//setup all child widgets of the form first
		this.controller.instantiateChildWidgets(this.controller.element);
		
		this._setupLastItem();
	},
	
	_setupCallbacks: function() {
		this._validateCallback = this._validateCallback.bind(this);
		this._defaultActionComplete = this._defaultActionComplete.bind(this);
		this._setButtonToSubmitState = this._setButtonToSubmitState.bind(this);
	},
	
	_setupListeners: function() {
		//find all required items and add a property change listener; make sure they have content
		this._propertyChangeListener = this._propertyChangeListener.bind(this);
		
		for (var i = 0; i < this.required.length; i++) {
			this.required[i] = {id: this.required[i]};
			this.controller.listen(this.required[i].id, Mojo.Event.propertyChange, this._propertyChangeListener);
		}
		
		//button tapping
		if (this.button) {
			this.handleButtonTap = this.handleButtonTap.bind(this);
			this.controller.listen(this.buttonContainer, Mojo.Event.tap, this.handleButtonTap, true);
		}
		//listen for enter key
		this._submitKeyListener = this._submitKeyListener.bind(this);
		this.controller.listen(this.lastItem, "keydown", this._submitKeyListener);
	},
	
	handleButtonTap: function(event) {
		if (event.target && (event.target === this.button || event.target.up("#"+this.button.id)) && !this._takeFormAction()) {
			event.stop();
		}
	},
	
	_takeFormAction: function() {
		if (this.assistant.hasRequired) {
			if (this.assistant.hasRequired()) {
				this.validate();
			}
		} else if (this._doAllHaveContent()) {
			this.validate();
		} else {
			this._deactivateButton();
			this.errorAction();
			return false;
		}
	},
	
	_propertyChangeListener: function(propertyChangeEvent) {
		//if there is an error here, clear it
		var curError;
		
		if (propertyChangeEvent.target !== this.lastItem) {
			this._updateHasContent(propertyChangeEvent.target.id, propertyChangeEvent.value);
			curError = this._getMatchingError(propertyChangeEvent.target.id);
			if (curError) {
				curError.hide();
			}
			this._updateSubmitState();
		}
	},
	
	_setupLastItem: function() {
		if (this.lastItem.mojo && this.lastItem.mojo.setConsumesEnterKey) {
			this.lastItem.mojo.setConsumesEnterKey(true);
		} else {
			this.lastItem.setAttribute(Mojo.Gesture.consumesEnterAttribute, "true");
		}
	},
	
	_submitKeyListener: function(keyEvent) {
		var value, curError;
		
		curError = this._getMatchingError(this.lastItem.id);
		if (curError) {
			curError.hide();
		}
		
		if (this.lastItem.mojo && this.lastItem.mojo.getValue) {
			value = this.lastItem.mojo.getValue();
		} else {
			value = this.lastItem.value;
		}
		this._updateHasContent(this.lastItem.id, value);
		this._updateSubmitState();
		
		if (Mojo.Char.isEnterKey(keyEvent.keyCode)) {
			//check that everything has some content, if so, fire default 
			//upadte state of this item
			this._takeFormAction();
			keyEvent.stop();
		}
	},
	
	
	_getMatchingError: function(id) {
		return this.controller.get(this.divPrefix +id+'_error');
	},
	
	_updateSubmitState: function() {
		if (this.assistant.hasRequired) {
			try {
				if (this.assistant.hasRequired()) {
					this._activateButton();
				}
			} catch (e) {
				Mojo.Log.warn("There was an error calling the required function from the assistant. Please correct this. Framework continuing as usual. %s", e);
			}
		} else if (this._doAllHaveContent()) {
			this._activateButton();
		} else {
			this._deactivateButton();
		}
	},
	
	_evalErrors: function(error) {
		var errors = (error && error.errors);
		var curErrorId, curError, curErrorContent, errorContent, item;
		var existing = this.controller.element.querySelectorAll('[name='+this.divPrefix+'_error]');
		var globalError = (error && error.globalError);
		var success = true;
		var i = 0;
		
		//hide all existing errors	
		if (existing) {
			for (i = 0; i < existing.length; i++) {
				existing.item(i).hide();
			}
		}
		
		if (this.globalError.visible()) {
			this.globalError.hide();
		}
		
		if (errors) {
			for (i = 0; i< errors.length; i++) {
				//activate the error for each failed item
				curError = this._getMatchingError(errors[i].id);
				if (!curError) {
					errorContent = Mojo.View.render({template: this.ERROR_TEMPLATE, attributes: {id: this.divPrefix+errors[i].id+'_error', name: this.divPrefix+'_error'}});
					item = this.controller.get(errors[i].id);
					Element.insert(item, {after: errorContent});
					curError = this._getMatchingError(errors[i].id);
				}
				curErrorContent = this.controller.get(this.divPrefix+errors[i].id+'_error_content');
				curErrorContent.innerHTML = errors[i].errorMessage;
				curError.show();
			}
			this._deactivateButton();
			success = false;
		} 
		
		if (globalError) {
			this.globalErrorContent.innerHTML = error.globalError;
			this.globalError.show();
			this._deactivateButton();
			success = false;
		} 
		return success;
	},
	
	_validateCallback: function(errors) {
		if (this._evalErrors(errors)) {
			this._activateButton();
			this.successAction();
		}
	},
	
	validate: function() {
		try {
			this.assistant.validate(this.required, this._validateCallback);
		} catch(e) {
			Mojo.Log.warn("There was an error calling validate specified by the assistant. Please correct this. %s", e);
		}
	},
	
	/**Default private method for just determining everything specified has content **/
	_doAllHaveContent: function() {
		for (var i = 0 ; i  < this.required.length; i++) {
			if (!this.required[i].hasContent) {
				return false;
			}
		}
		return true;
	},
	
	_updateHasContent: function(id, value) {
		var item = this._findRequiredItem(id);
		if (item) {
			item.hasContent = (value.length > 0);
			item.value = value;
			return;
		}
	},
	
	_findRequiredItem: function(id) {
		for (var i = 0 ; i  < this.required.length; i++) {
			if (id === this.required[i].id) {
				return this.required[i];
			}
		}
		return null;
	},
	
	_activateButton: function() {
		if (!this.button) {
			return;
		}
		this.buttonModel.disabled = false;
		this.controller.modelChanged(this.buttonModel);
		this.button.addClassName('focused');
	},
	
	_deactivateButton: function() {
		if (!this.button) {
			return;
		}
		this.buttonModel.disabled = true;
		this.controller.modelChanged(this.buttonModel);
		this.button.removeClassName('focused');
	},
	
	errorAction: function() {
		//show the errors where we have them
		try {
			if (this.assistant.errorAction) {
				this.assistant.errorAction(); //action when enter on the last input field AND missing data in a required field
			}
		} catch (e) {
			Mojo.Log.warn("There was an exception calling the error action specified by the assistant. Please correct this. %s", e);
		}
	},
	
	handleModelChanged: function() {
		if (this.button) {
			this.buttonModel.label = this.controller.valueFromModelOrAttributes('submitLabel');
			this.controller.modelChanged(this.buttonModel);
		}
		//update required list
		this.required = this.controller.model.requiredItems.clone();
		this._initializeHasContent();
	},
	
	//make sure if anything starts with content we record it here!
	_initializeHasContent: function() {
		var value;
		var item;
		//walk each item and look for content
		for (var i = 0; i < this.required.length; i++) {
			item = this.controller.get(this.required[i].id);
			if (item.mojo && item.mojo.getValue) {
				value = item.mojo.getValue();
			} else {
				value = item.value;
			}
			this._updateHasContent(item.id, value);
		}
	},
	
	_setButtonToSubmitState: function() {
		if (this.button) {
			this.button.mojo.activate();
		}
	},
	
	successAction: function() {
		//start button timing; should start spinning if 100ms has passed before a response has come back
		this.submitButtonUpdateDeferredId = this.controller.window.setTimeout(this._setButtonToSubmitState, this.ASYNC_DELAY);
		
		//disable button for submit
		this._deactivateButton();
		
		try {
			this.assistant.defaultAction(this._defaultActionComplete); //default action when enter on the last input field AND all other	
		} catch(e) {
			Mojo.Log.warn("Error while calling the assistants default action. Please fix this. %s ", e);
			this.controller.window.clearTimeout(this.submitButtonUpdateDeferred);
		}
	},
	
	_defaultActionComplete: function(error) {
		//clear the timeout when this comes back if it hasn't already fired
		this.controller.window.clearTimeout(this.submitButtonUpdateDeferredId);
		
		this._evalErrors(error);
		
		if (this.button) {
			this._activateButton();
			this.button.mojo.deactivate(); //turn off spinner
		}
	},
	
	cleanup: function() {
		var that = this;
		this.required.each( function(req) {
			that.controller.stopListening(req.id, Mojo.Event.propertyChange, that._propertyChangeListener);
		});
		
		if (this.button) {
			this.controller.stopListening(this.buttonContainer, Mojo.Event.tap, this.handleButtonTap, true);
		}
		this.controller.stopListening(this.lastItem, "keydown", this._submitKeyListener);
	}
});