	/**
 * @name widget_listselector.js
 * @fileOverview This file discusses the List selectors which can be used for pop-up multiple-choice style editing of values;
 * See {@link Mojo.Widget.ListSelector} for more info. 

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####

List selectors can be used for pop-up multiple-choice style editing of values. 
The current value of the ListSelector is always available in the model.value property. 
The ListSelector also contains a hidden input field with the current value, so it may 
be wrapped in a form if desired.

#### Declaration ####

		<div x-mojo-element="ListSelector" id="listselectorId" class="listselectorClass" name="listselectorName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
		x-mojo-element	Required	ListSelector	Declares the widget as type 'ListSelector' 
		id				Required	Any String		Identifies the widget element for use when instantiating or rendering
		class			Optional	Any String		ListSelector uses the .palm-list-selector by default but you override this setting
		name			Optional	Any String		Add a unique name to the listselector widget; generally used in templates when used 

#### Events ####

		Mojo.Event.listen("listselectorId", Mojo.Event.propertyChange, this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		Mojo.Event.propertyChange			event.value 
									or model.value

#### Instantiation ####
    
		this.controller.setupWidget("listselectorId",
			this.attributes = {
				choices: [
					{label: "One", value: 1},
					{label: "Two", value: 2},
					{label: "Three", value: 3}
					],
			
			this.model = {
			value: 3,
			disabled: false
			}
		});

#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		labelPlacement		String			Optional	Mojo.Widget.labelPlacementRight		Mojo.Widget.labelPlacementRight : places label on right, value on left.
																	Mojo.Widget.labelPlacementLeft : places label on left, value on right
		modelProperty		String			Optional	value		Model property name for radiobutton state
		disabledProperty	String			Optional	disabled	Model property name for disabled boolean
		label				String			Optional	Null		Label for the entire list, shown next to selected value in smaller, blue text
		multiline			Boolean			Optional	false		If true, long labels will wrap to the next line instead of being truncated.
		choices				Array			Required	null		List of values for the popup. Must be defined in either the model or attributes and
																	contain at least 2 items:
																		[{label: <displayName>, value: <value set in object>},
																		{label: <displayName>, value: <value set in object>},
																			...
																		{label: <displayName>, value: <value set in object>}]"

#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		value				User-defined	Required	none		value of widget
		disabled			Boolean			Optional	false		If true, radiobutton is inactive
		choices				Array			Required	null		List of values for the popup. Must be defined in either the model or attributes and
 																	contain at least 2 items:
																		[{label: <displayName>, value: <value set in object>},
																		 {label: <displayName>, value: <value set in object>},
																			...
																		 {label: <displayName>, value: <value set in object>}]"

** - a choices array must be present in either the attributes or model. If the choices are dynamic, meaning changeable after setup, then it
    should be in the model, otherwise in attributes.

#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		None


*/

Mojo.Widget.ListSelector = Class.create({
	
	/** @private */
	setup : function() {
		Mojo.assert(this.controller.model, "Mojo.Widget.ListSelector requires a model. Did you call controller.setupWidgetModel() with the name of this widget?");
		
		// Which model property to use for our value?
		this.valueName = this.controller.attributes.modelProperty || Mojo.Widget.defaultModelProperty;
		this.disabledProperty = this.controller.attributes.disabledProperty || Mojo.Widget.defaultDisabledProperty;

		// Apply palm-list-selector class to div automatically.
		Element.addClassName(this.controller.element, 'palm-list-selector');
		
		this.updateFromModel();
		
		// Set initial value on hidden input element:
		this.hiddenInput.value = this.controller.model[this.valueName];
		
		// Attach event handling stuff:
		this.clickHandler = this.clickHandler.bindAsEventListener(this);
		this.controller.listen(this.controller.element, Mojo.Event.tap, this.clickHandler);
		this.controller.listen(this.controller.element, Mojo.Event.hold, this.clickHandler);
	},
	
	cleanup: function() {
		this.controller.stopListening(this.controller.element, Mojo.Event.tap, this.clickHandler);
		this.controller.stopListening(this.controller.element, Mojo.Event.hold, this.clickHandler);
	},
	

	/** @private */
	updateFromModel: function() {
		var renderObj;
		
		// Find display name for value:
		var display = this.controller.model[this.valueName];
		this.choices = this.controller.model.choices || this.controller.attributes.choices;
		for(var i=0; i<this.choices.length; i++) {
			if(display == this.choices[i].value) {
				display = this.choices[i].label;
				break;
			}
		}
		

		// Don't do all the manipulation involved in enable/disable unless necessary
		if (this.disabled !== this.controller.model[this.disabledProperty]) {
			this.disabled = this.controller.model[this.disabledProperty];
			if (this.disabled) {
				this.controller.element.addClassName('disabled');
			} else {
				this.controller.element.removeClassName('disabled');
			}
		}
		
		
		renderObj = {label:this.controller.attributes.label, name:this.valueName, value:display};
		if(!this.controller.attributes.multiline) {
			renderObj.truncatingText = 'truncating-text';
		}
		
		if(this.controller.attributes.labelPlacement === Mojo.Widget.labelPlacementLeft) {
			Element.addClassName(this.controller.element, 'right');
		}
		
		this.controller.element.innerHTML = Mojo.View.render({object: renderObj, 
											template:  Mojo.Widget.getSystemTemplatePath("list-selector")});

		// Update reference to our hidden input element:
		this.hiddenInput = this.controller.element.querySelector('input');
		if (this.controller.model[this.valueName] !== undefined) {
			this.hiddenInput.value = this.controller.model[this.valueName];
		}
	},

	/** @private */
	closeSelector: function() {
		//assumes currently open.
		this.openElement.mojo.close();
	},

	/** @private */
	openSelector: function() {
			//assumes not currently open.
			if(!this.disabled) {
				this.openElement = this.controller.scene.popupSubmenu({
						onChoose:this.popupChoose.bind(this),
						placeNear:this.controller.element,
					// this is a bit of a hack, since a top level items array can't be a toggle group in a regular menu,
					// but the functionality is consistent with toggle groups, and quite valuable here.
						toggleCmd:this.controller.model[this.valueName],
						popupClass:'palm-list-selector-popup',
						items: this.choices.map(this.selectorChoiceToMenuItem)
					});
			}
	},


	/* @private */
	handleModelChanged: function() {
		if(this.openElement) {
			this.closeSelector();
			this.updateFromModel();
			this.openSelector();
		} else {
			this.updateFromModel();
		}
	},
	
	
	/** @private */
	clickHandler: function(event) {
		Event.stop(event);
		this.openSelector();
	},
	
	// Utility routine to convert choices from our model to standard menu items for use in the popup submenu.
	selectorChoiceToMenuItem: function(choice) {
		choice = Mojo.Model.decorate(choice);
		choice.command = choice.value;
		return choice;
	},
	
	/** @private */
	popupChoose: function(value) {
		
		var oldValue = this.controller.model[this.valueName];
		
		this.openElement = undefined;
		
		if(value === undefined || value == oldValue) {
			return;
		}
		
		
		// save value:
		this.controller.model[this.valueName] = value;
		
		// set value in our hidden input element.
		this.hiddenInput.value = value;
		
		// send change event
		Mojo.Event.send(this.controller.element, Mojo.Event.propertyChange,
			{ property: this.valueName,
				value: value,
				model: this.controller.model
			});
		
		if(this.controller.model[this.valueName] != oldValue) {
			// In case an event listener changed the value, 
			// we update after sending the event,
			this.updateFromModel();
			this.controller.modelChanged();
		}
		
		// Need to set the hidden input value again, since re-rendering the widget removes the old node from the DOM,
		// and/or an event listener might have modified the model.
		this.hiddenInput.value = this.controller.model[this.valueName];
		
	}
	
});

