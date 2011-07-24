/**
@name widget_button.js
@fileOverview Buttons are the most basic UI element, which allow an action to be bound to a region; 
See {@link Mojo.Widget.Button} for more info. 

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####
Buttons are the most basic UI element, which allow an action to be bound to a region. 
Buttons have a text label that can be updated dynamically. ButtonWidgets are automatically styled to look like other buttons within the webOS.

#### Declaration ####

		<div x-mojo-element="Button" id="buttonId" class="buttonClass" name="buttonName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
		x-mojo-element	Required	Button			Declares the widget as type 'Button' 
		id				Required	Any String		Identifies the widget element for use when instantiating or rendering; should be unique in the 		
													document
		class			Optional	Any String		All buttons belong to the class palm-button but override this with a custom class 
		name			Optional	Any String		Add a unique name to the button widget; generally used in templates when used 


#### Events ####

		Mojo.Event.listen("buttonId",Mojo.Event.tap, this.handleUpdate)
		
		Event Type		Value		Event Handling
		----------------------------------------------------
		Mojo.Event.tap	None		Respond to button tap


#### Instantiation ####

		this.controller.setupWidget("buttonId",
			this.attributes = {
				},
			this.model = {
				label : "BUTTON",
				disabled: false
			});


#### Attribute Properties ####

		Attribute Property	Type		Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		label				String		Optional	null		Button's label if none is supplied by the model
		type				String		Optional	Mojo.Widget.defaultButton	Type options:
																	Mojo.Widget.defaultButton - simple pushbutton
																	Mojo.Widget.activityButton- pushbutton with spinner activated on tap of the 		
																	button
		disabledProperty	String		Optional	"disabled"	Model property name for disabled
		labelProperty		String		Optional	"label"		Model property name for label


#### Model Properties ####

		Model Property	Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		buttonLabel		String			Optional	null		DEPRECATED Button's label
		buttonClass		String			Optional	primary		Model property that has the CSS class name of this button
		disabled		Boolean			Optional	FALSE		If true, button is inactive
		label			String			Optional	null		Button's label


#### Methods ####

		Method		Arguments 	Description
		----------------------------------------------------------------------------------------------
		activate 	None 		For an activity button, start the spinner
		deactivate 	None 		For an activity button, stop the spinner


#### Activate ####

		buttonWidget.mojo.activate();


#### Deactivate ####

		buttonWidget.mojo.deactivate();



@field
*/
Mojo.Widget.Button = Class.create({
	/** @private */
	setup: function() {
		this.initializeDefaultValues();
		this.renderWidget();
		
		this.updateDisabledState();
		
		this.maybeConsumeTap = this.maybeConsumeTap.bind(this);
		this.controller.listen(this.button, Mojo.Event.tap, this.maybeConsumeTap);
		this.controller.exposeMethods(['activate', 'deactivate']);
	},
	
	/** @private */
	cleanup: function() {
		this.controller.stopListening(this.button, Mojo.Event.tap, this.maybeConsumeTap);
	},
	
	/** Start the spinner on a button of type Mojo.Widget.activityButton */
	activate: function() {
		this.active = true;
		this.startSpinner();
	},
	
	/** Stop the spinner on a button of type Mojo.Widget.activityButton */
	deactivate: function() {
		this.active = false;
		this.stopSpinner();
	},
	
	/** @private */
	startSpinnerFunc: function() {
		this.spinner.mojo.start();
	},
	
	/** @private */
	stopSpinnerFunc: function() {
		this.spinner.mojo.stop();
	},
	
	/** @private */
	maybeConsumeTap: function(e) {
		var focusedElement;
		 
		if (this.disabled) {
			Event.stop(e);
		} else {
			//use this to blur the currently focused item
			focusedElement = Mojo.View.getFocusedElement(this.controller.scene.sceneElement);
			if (focusedElement) {
				focusedElement.blur();
			}
			
			if (!this.active && (this.buttonType === Mojo.Widget.activityButton)) {
				this.active = true;
				//make this disabled 
				this.startSpinner();
			}
		}
	},
	
	/** @private */
	updateDisabledState: function() {
		this.disabled = this.controller.model[this.disabledProp];
		
		if (this.disabled) {
			this.button.removeAttribute('x-mojo-tap-highlight');
			this.button.addClassName('disabled');
		} else {
			this.button.setAttribute('x-mojo-tap-highlight', 'momentary');
			this.button.removeClassName('disabled');
		}			
	},
	
	/** @private */
	initializeDefaultValues: function() {
		var labelProp = this.controller.attributes.labelProperty || 'label';
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		this.buttonClass = this.controller.model.buttonClass || '';
		this.buttonLabel = this.controller.model[labelProp] || this.controller.model.buttonLabel || this.controller.attributes.label || '';
		this.buttonType = this.controller.attributes.type || Mojo.Widget.defaultButton;
		this.startSpinner = Mojo.doNothing;
		this.stopSpinner = Mojo.doNothing;
		this.disabledProp = this.controller.attributes.disabledProperty || Mojo.Widget.defaultDisabledProperty;
	},
	
	/** @private */
	renderWidget: function() {
		var model;
		var buttonContent;
		var spinnerContent;
		var spinnerAttrs;
		
		if (this.buttonType === Mojo.Widget.activityButton) {
			//add a spinner
			spinnerContent = Mojo.View.render({object: model, template: Mojo.Widget.getSystemTemplatePath('/button/button-spinner'), attributes: {divPrefix: this.divPrefix}});
		} 
		model = {
			divPrefix: this.divPrefix,
			label: this.buttonLabel,
			type: this.buttonClass,
			spinnerContent: spinnerContent
		};
		
		buttonContent = Mojo.View.render({object: model, template: Mojo.Widget.getSystemTemplatePath('/button/button-widget')}); 
		this.controller.element.innerHTML = buttonContent;
		this.buttonLabel = this.controller.get(this.divPrefix+"-buttonLabel");
		this.button = this.controller.get(this.divPrefix+"-button");
		this.spinner = this.controller.get(this.divPrefix+"-activity-spinner");
		
		if (this.spinner)  {
			spinnerAttrs = {
				spinnerSize: Mojo.Widget.spinnerSmall
			};
			this.controller.scene.setupWidget(this.spinner.id, spinnerAttrs,{});
			this.controller.instantiateChildWidgets(this.controller.element); //instantiate the spinner
			this.startSpinner = this.startSpinnerFunc.bind(this);
			this.stopSpinner = this.stopSpinnerFunc.bind(this);
		}
	},
	
	
	/** @private */
	handleModelChanged: function() {
		var labelProp = this.controller.attributes.labelProperty || 'label';
		if (this.controller.model.buttonClass !== this.buttonClass) {
			this.button.removeClassName(this.buttonClass);
			this.buttonClass = this.controller.model.buttonClass;
			this.button.addClassName(this.buttonClass);
		}
		if (!this.controller.attributes.label) { //this was in the model, so look for a change
			//when we don't have deprecated button label anymore, do a check of this.buttonLabel vs this.controller.model[labelProp]
			this.buttonLabel.innerHTML = this.controller.model[labelProp] || this.controller.model.buttonLabel || '';
		}
		
		this.updateDisabledState();
	}
});