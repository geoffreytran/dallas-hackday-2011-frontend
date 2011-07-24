/**
 * @name widget_radiobutton.js
 * @fileOverview This file has functions related to the RadioButton widget 
 * which is used to select a value for a property between a small number 
 * of choices;
 * See {@link Mojo.Widget.RadioButton} for more info.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####

If you need to a single widget to switch between multiple states while revealing all the 
state options on the screen, then a RadioButton may fit your needs. Mojo provides a classic 
RadioButton which presents each button as a labeled selection option in a horizontal array, 
where only one option can be selected at at time. The number of options is variable, 
constrained only by the width of the display and the minimum button size that can be 
pleasingly presented or selected. You can expect to handle between 2 and 5 states given 
the typical screen size for a webOS device, but the framework won't limit you.

#### Declaration ####

		<div x-mojo-element="RadioButton" id="radiobuttonId" class="radiobuttonClass" name="radiobuttonName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
		x-mojo-element	Required	RadioButton		Declares the widget as type 'RadioButton' 
		id				Required	Any String		Identifies the widget element for use when instantiating or rendering
		class			Optional	Any String		RadioButton uses the .palm-radiobutton-container by default but you override this setting
		name			Optional	Any String		Add a unique name to the radiobutton widget; generally used in templates when used 

#### Events ####

		Mojo.Event.listen("radiobuttonId", Mojo.Event.propertyChange, this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
	    Mojo.Event.propertyChange        { property: this.valueName,
											value: this.choices[clicked._mojoListIndex].value,
											model: this.controller.model
										}

#### Instantiation ####
    
		this.controller.setupWidget("myRadioBtn",
			this.attributes = {
				choices: [
				    {label: "One", value: 1},
    				{label: "Two", value: 2}
				]
			},

			this.model = {
    			value: 1,
    			disabled: false
    		}
    	);


#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		modelProperty		String			Optional	value		Model property name for radiobutton state
		disabledProperty	String			Optional	disabled	Model property name for disabled boolean
		choices				Array			Required	null		Array of button descriptions, each of which is a {label: 'string', value: value} entry; 
																	number of entries defines scope of widget

#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		value				User-defined	Required	none		value of widget
		disabled			Boolean			Optional	false		If true, radiobutton is inactive


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		None


*/
Mojo.Widget.RadioButton = Class.create({
	/** @private */
	setup: function setup(){
		// TODO: remove this legacy code.
		if((this.controller.model.choices === undefined || this.controller.attributes.choices === undefined) && 
				(this.controller.model.options !== undefined || this.controller.attributes.options !== undefined)) {
			Mojo.Log.error("WARNING: RadioButton attributes now use 'choices' instead of 'options'.");
		}    
		
		this._clickHandler = this._clickHandler.bindAsEventListener(this);
		this.controller.listen(this.controller.element, Mojo.Event.tap, this._clickHandler);
		this.valueName = this.controller.attributes.modelProperty ||Mojo.Widget.defaultModelProperty;
		this.disabledProperty = this.controller.attributes.disabledProperty || Mojo.Widget.defaultDisabledProperty;
		this._buildFromModel();
				
		// TODO: remove this legacy code.
		if(this.controller.model === undefined || this.controller.model === this.controller.attributes) {
			this.controller.model = {};
		}
	},
	
	cleanup: function() {
		this.controller.stopListening(this.controller.element, Mojo.Event.tap, this._clickHandler);
	},
	
	/* @private */
	handleModelChanged : function() {
		this._buildFromModel();
	},
	
	/** @private */
	_buildFromModel : function _buildFromModel() {
		var el = this.controller.element;
		
		// TODO: remove this legacy code. No need to check for options.
		this.choices = this.controller.model.choices || this.controller.attributes.choices || this.controller.model.options || this.controller.attributes.options;
		var wrapperTemplate = Mojo.Widget.getSystemTemplatePath("radio-button/radio-button-wrapper");
		var itemTemplate = Mojo.Widget.getSystemTemplatePath("radio-button/radio-button");
		this.listItemsParent = Mojo.Widget.Util.renderListIntoDiv(el, this.controller.attributes, wrapperTemplate,
			this.choices, itemTemplate);
		
		//Apply initial selection
		if (this.controller.model[this.valueName] !== undefined) {
			var children = this.listItemsParent.childElements();
			if (children.length == 2) {
			  this.listItemsParent.addClassName("two");
			} else if (children.length == 3) {
        		this.listItemsParent.addClassName("three");			
      }
			for(var i = 0; i < children.length; i++){
				var child = children[i];
				if(child._mojoListIndex !== undefined){
					if(this.choices[child._mojoListIndex].value == this.controller.model[this.valueName]){
						child.addClassName("selected");
						this.currentItem = child;
						break;
					}
				}
			}
		}
		this.hiddenInput = el.querySelector('input');
		this.hiddenInput.value = this.controller.model[this.valueName];
		this.hiddenInput.name = this.valueName;
		
		// Cache 'disabled', so clients are forced to call modelChanged() to modify it.
		// This will keep them working once we support visual changes based on disable state.
		this.disabled = this.disabledProperty ? this.controller.model[this.disabledProperty] : false;
	},
	
	/** @private */
	_getButtonCell : function(elem) {
		while(elem !== this.controller.element){
			if(elem.parentNode === this.listItemsParent){
				return elem;
			}
			elem = elem.parentNode;
		}
		return undefined;
	},
	
	/** @private */
	_clickHandler : function(e) {
		var clicked = this._getButtonCell(e.target);
		if(clicked === undefined || clicked === this.currentItem || this.disabled) {
			return;
		}
		
		e.stop();
		
		if(this.currentItem) {
			this.currentItem.removeClassName("selected");
		}

		clicked.addClassName("selected");

		this.currentItem = clicked;
		this.hiddenInput.value = this.choices[clicked._mojoListIndex].value;
		this.controller.model[this.valueName] = this.choices[clicked._mojoListIndex].value;
		Mojo.Event.send(this.controller.element, Mojo.Event.propertyChange,
			{ property: this.valueName,
				value: this.choices[clicked._mojoListIndex].value,
				model: this.controller.model
			});    
	}
});
