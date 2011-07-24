/**
 * @name widget_togglebutton.js
 * @fileOverview This file has functions related to the ToggleButton widget 
 * which is used to select a value for a property between a small number 
 * of choices;
 * See {@link Mojo.Widget.ToggleButton} for more info.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####
As with the CheckBox and similar to the RadioButton, the ToggleButton is a widget for displaying and controlling a binary state value. Mojo's ToggleButton will be switch between two states each time it is tapped.
Declaration

#### Declaration ####

		<div x-mojo-element="ToggleButton" id="togglebuttonId" class="togglebuttonClass" name="togglebuttonName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
		x-mojo-element	Required	ToggleButton	Declares the widget as type 'ToggleButton' 
		id				Required	Any String		Identifies the widget element for use when instantiating or rendering


#### Events ####

		Mojo.Event.listen("togglebuttonId", Mojo.Event.propertyChange, this.handleUpdate)


		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		Mojo.Event.propertyChange	model:model attached to the widget, property: model property, value: value of the checkbox


#### Instantiation ####
    
		this.controller.setupWidget("togglebuttonId",
		     this.attributes = {
		         trueValue: "On",
		         falseValue: "Off" 
		     },
		     this.model = {
		         value: false,
		         disabled: false
		     });


#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		modelProperty		String			Optional	value		Model property name for togglebutton state
		disabledProperty	String			Optional	disabled	Model property name for disabled boolean
		trueValue			String			Optional	true		Value to set model property when true
		trueLabel			String			Optional	"On"		Label when toggle is true
		falseValue			String			Optional	false		Value to set model property when false
		falseLabel			String			Optional	"Off"		Label when toggle is false
		fieldName			String			Optional				DEPRECATED Idenitifer for the value of the toggle button; used when the toggle button is used in html forms
		inputName			String			Optional				Idenitifer for the value of the toggle button; used when the toggle button is used in html forms	


#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		value				User-defined	Required	none		Current value of widget
		disabled			Boolean			Optional	FALSE		If true, togglebutton is inactive


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		None



*/
Mojo.Widget.ToggleButton = Class.create({
	YSALT: 10,
	
	initialize: function() {   
	},
  
	setup: function() {
		this.initializeDefaultValues();
		this.toggleState = this.toggleState.bind(this);
		this.renderWidget();
		this._setDisabledState();
	},
  
	initializeDefaultValues: function() {
		this.controller.attributes.modelProperty = this.controller.attributes.modelProperty || Mojo.Widget.defaultModelProperty;
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		this.fieldId = this.divPrefix + "hiddenField";
		this.trueValue = this.controller.attributes.trueValue || true;
		this.trueLabel = this.controller.attributes.trueLabel || $LL('On');
		this.falseValue = this.controller.attributes.falseValue || false;
		this.falseLabel = this.controller.attributes.falseLabel || $LL('Off');
		this.disabledProperty = this.controller.attributes.disabledProperty || Mojo.Widget.defaultDisabledProperty;

		if(this.isCheckbox) {
			this.template = Mojo.Widget.getSystemTemplatePath('/checkbox/checkbox');
			this.toggleDivName = this.divPrefix+"-checkboxDiv";
		} else {
			this.template = Mojo.Widget.getSystemTemplatePath('/toggle-button/toggle-button');
			this.toggleDivName = this.divPrefix+"-toggleDiv";
			this.toggle = this.toggle.bind(this);
			this.controller.listen(this.controller.element , Mojo.Event.dragging, this.toggle);		
			this.toggleStateStart = this.toggleStateStart.bind(this);
			this.controller.listen(this.controller.element, Mojo.Event.dragStart, this.toggleStateStart);
		}
	},
	
	cleanup: function() {
		this.controller.stopListening(this.controller.element, Mojo.Event.dragStart, this.toggleStateStart);
		this.controller.stopListening(this.controller.element, Mojo.Event.dragging, this.toggle);
		this.controller.stopListening(this.controller.element, Mojo.Event.tap, this.toggleState);	
	},

	
	/** @private **/
	_getState: function() {
		return this.trueValue === this.controller.model[this.controller.attributes.modelProperty];
	},


	toggleStateStart: function(event) {
		if (this.disabled) {
			return;
		}
		var filteredDistance = event.filteredDistance;
		var shouldToggle = (filteredDistance.x > filteredDistance.y);
		this.interestedInDrags = shouldToggle;
		if (shouldToggle) {
			if (this.direction) {
				delete this.direction;
			}
			event.stop();			
		}
	},
	
	//when we have the end drag event, we can tell which way the user swiped
	//if they swiped in the same direction as the toggle was set, do nothing
	//otherwise, update the state
	toggle: function(event) {
		var move = event.move;
		var start = event.down;
		var state = this._getState();
		var direction;

		if (this.disabled || !start || !move || !this.interestedInDrags) {
			return;
		}

		if (move.x > start.x) {
			direction = "right";
		} else {
			direction = "left";
		}
			
		if (this.direction !== direction) {
			if (!state && direction === 'right') {
				this.toggleState(event);
			} else if (state && direction === 'left') {
				this.toggleState(event);
			}
			this.direction = direction;
		}
		event.stop();
	},

	renderWidget: function() {
		var state, label;
		if (this.controller.model[this.controller.attributes.modelProperty] == this.trueValue) {
			state = true;
			label = this.trueLabel;
		} else {
			state = false;
			label = this.falseLabel;
		}
		var model = {
			fieldName: this.controller.attributes.inputName || this.controller.attributes.fieldName, //fieldName deprecated; remove this
			fieldId: this.fieldId,
			divPrefix: this.divPrefix,
			state: state,
			value: this.controller.model[this.controller.attributes.modelProperty],
			label: label
		};
		var content = Mojo.View.render({template: this.template, object: model});
		this.controller.element.innerHTML = content;
		this.toggleDiv = this.controller.get(this.toggleDivName);
		this.controller.listen(this.controller.element, Mojo.Event.tap, this.toggleState);
		this.inputField = this.controller.get(model.fieldId);
		this.labelDiv = this.controller.get(this.divPrefix+'-labelDiv');
	},

	setState: function(state) {
		if (state) {
			this.toggleDiv.removeClassName(false);
			this.toggleDiv.addClassName(true);
			if (this.labelDiv) {
				this.labelDiv.innerHTML = this.trueLabel;
			}	
		} else {
			this.toggleDiv.removeClassName(true);
			this.toggleDiv.addClassName(false);

			if (this.labelDiv) {
				this.labelDiv.innerHTML = this.falseLabel;
			}
		}
	},

	toggleState: function(event) {
		if (this.disabled) {
			return;
		}
		var state = !this.toggleDiv.hasClassName("true");
		this.setState(state);
		this.handlePropertyChanged(state);
		event.stop();
		return true;
	},
	
	_setDisabledState: function() {
		var disabledVal = this.controller.model[this.disabledProperty];
		if (disabledVal !== this.disabled) {
			this.disabled = disabledVal;
			if (this.disabled) {
				this.toggleDiv.addClassName("disabled");
			} else {
				this.toggleDiv.removeClassName("disabled");
			}
		}
	},

	handleModelChanged: function(what, model) {
		this._setDisabledState();
		this.setState(this._getState());
		this.inputField.value = this.controller.model[this.controller.attributes.modelProperty];
	},

	handlePropertyChanged: function(value) {
		/** @private */
		if (value) {
			this.controller.model[this.controller.attributes.modelProperty] = this.trueValue;
		} else {
			this.controller.model[this.controller.attributes.modelProperty] = this.falseValue;
		}
		this.inputField.value = this.controller.model[this.controller.attributes.modelProperty];
		//also, be sure to update the text
		Mojo.Event.send(this.controller.element, Mojo.Event.propertyChange, {model:this.controller.model, property:this.controller.attributes.modelProperty, value: this.controller.model[this.controller.attributes.modelProperty]});
	}
});