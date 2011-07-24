/**
 * @name widget_checkbox.js
 * @fileOverview This file describe the checkbox widget; 
 * See {@link Mojo.Widget.CheckBox} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####
A CheckBox widget like a ToggleButton, is used to control and indicate a binary state value in one element. 
Which widget to use is really a matter of design preference as they serve almost an identical function. 
Tapping a CheckBox will toggle it's state, presenting or removing a "checkmark" depending on the previous state. 
The framework handles the display changes and will manage the widget's data model for you, toggling between 
two states that you defined at setup time.


#### Declaration ####

		<div x-mojo-element="CheckBox" id="checkboxId" class="checkboxClass" name="checkboxName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element	Required	CheckBox		Declares the widget as type 'CheckBox' 
	    id				Required	Any String		Identifies the widget element for use when instantiating or rendering


#### Events ####

		Mojo.Event.listen("checkboxId", Mojo.Event.propertyChange, this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		Mojo.Event.propertyChange                   Sends an event with the added properties 'model' and 'value'; Model is the model supplied when the application 
													first set up the widget with a value updated to reflect the state of the checkbox; value represents the 
													current value of the checkbox regardless of model.


#### Instantiation ####

		this.controller.setupWidget("checkboxId",
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
	    modelProperty		String			Optional	"value"		Model property name for checkbox state
	    disabledProperty	String			Optional	"disabled"	Model property name for disabled boolean
	    trueValue			String			Optional	true		Value to set model property when true
	    falseValue			String			Optional	false		Value to set model property when false
	    fieldName			String			Optional	none		DEPRECATED Idenitifer for the value of the checkbox; used when the checkbox is used in html forms	
		inputName			String			Optional	none		Idenitifer for the value of the checkbox; used when the checkbox is used in html forms	


#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		value				User-defined	Required	none		Current value of widget
		disabled			Boolean			Optional	false		If true, checkbox is inactive


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		None


@field
*/

Mojo.Widget.CheckBox = function () {
  this.isCheckbox = true;
  Mojo.Widget.ToggleButton.apply(this);
};

/** @private */
Mojo.Widget.CheckBox.prototype = Mojo.Widget.ToggleButton.prototype;