/**
 * @name widget_progressslider.js
 * @fileOverview TBD documentation;
 * See {@link Mojo.Widget.ProgressSlider} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####
For media, or other applications where you want to show progress as part of a tracking slider, then the Progress 
Slider is an ideal choice. Combining the Slider widget with the Progress Pill, you almost have both widgets in 
one but not all of the options are represented.


#### Declaration ####

		<div x-mojo-element="ProgressSlider" id="progresssliderId" class="progresssliderClass" name="progresssliderName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element	Required	ProgressSlider	Declares the widget as type 'ProgressSlider' 
	    id				Required	Any String		Identifies the widget element for use when instantiating or rendering
	    class			Optional	Any String		Provide your own unique class and override the frameworks styles
	    name			Optional	Any String		Add a unique name to the progressslider widget; generally used in templates when used 


#### Events ####

		Mojo.Event.listen("progresssliderId", Mojo.Event.propertyChange, this.handleUpdate)
		
		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
	    Mojo.Event.propertyChange	{value: pos}
	    Mojo.Event.progressComplete					Progress is complete

   
#### Instantiation ####
    
		this.controller.setupWidget("progresssliderId",
			this.attributes = {
				property: "value",
				round: true,
				maximumValue: 100,
				mininumValue: 0
				},
			this.model = {
				value: 20
				}
		);


#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
	    sliderProperty		String			Optional	"slider"	Name of model property for this widget instance for the slider position
		progressProperty	String			Optional	"progress"	Name of model property for this widget instance for the progress bar position
		progressStartProperty	Integer		Optional    Null		Starting position of the progress bar
	    minValue			Integer			Required				Minimum slider value returned at leftmost position
	    maxValue			Integer			Required				Maximum slider value returned at leftmost position
	    round				Boolean			Required				Round the value returned to the nearest integer
	    cancellable			Boolean			Required				If true, progress cancel option is shown
	    updateInterval		Integer			Optional	0			if >0, will send updates every updateInterval seconds


#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		value				Integer			Required    Null		Current value of widget; this will be sanitized to be between minValue and maxValue
		

#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		reset						Reset the progress to 0


@field
*/
Mojo.Widget.ProgressSlider = Class.create({
	
	DEFAULT_PROGRESS_PROPERTY: 'progress',
	DEFAULT_SLIDER_PROPERTY: 'slider',
	
	initialize: function() {
    
	},
	
	updateDisabledState: function() {
		this.disabled = this.controller.model[this.disabledProperty];
		if (this.disabled) {
			this.controller.element.addClassName("disabled");
		} else {
			this.controller.element.removeClassName("disabled");
		}
	},
	
	handleModelChanged: function() {
		this.updateDisabledState();
	},
  
  	setup: function() {
    	this.initializeDefaultValues();
    	this.originalMax = this.controller.model.maximumValue || this.controller.model.maxValue;
		this.originalMin = this.controller.model.minimumValue || this.controller.model.minValue;
		this.disabledProperty = this.controller.attributes.disabledProperty || Mojo.Widget.defaultDisabledProperty;
    	this.renderWidget();
		this.controller.exposeMethods(['reset']);
		this.controller.scene.pushCommander(this);
		this.updateDisabledState();
  	},

	reset: function() {
		this.progressPill.mojo.reset();
	},

	initializeDefaultValues: function() {
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		this.controller.model = this.controller.model || {};
		this.controller.attributes = this.controller.attributes || {};
		this.progressPillId = this.divPrefix+'-progressPill';
		this.sliderId = this.divPrefix+'-slider';
	},
	
	renderWidget: function() {
		var model;
		//insert the content
		var content;

		model = {
			divPrefix: this.divPrefix
		};
		content = Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath('/progress-slider/progress-slider-widget'), object: model});
		
		this.controller.element.innerHTML = content;
		this.progressPill = this.controller.get(this.progressPillId);
		this.slider = this.controller.get(this.sliderId);
		
		//setup the slider
		this.sliderAttributes = {};
		this.sliderAttributes.maxValue = this.originalMax;
		this.sliderAttributes.minValue = this.originalMin;
		this.sliderAttributes.modelProperty = this.controller.attributes.sliderProperty || this.DEFAULT_SLIDER_PROPERTY;
		this.sliderAttributes.round = this.controller.attributes.round;
		this.sliderAttributes.labels = this.controller.attributes.labels;
		this.sliderAttributes.backgroundElement = this.progressPill;
		this.sliderAttributes.updateInterval = this.controller.attributes.updateInterval;
		this.sliderModel = this.controller.model;
		this.controller.scene.setupWidget(this.sliderId, this.sliderAttributes, this.sliderModel);
		
		//setup the progress pill
		this.progressPillAttributes = {
			modelProperty: this.controller.attributes.progressProperty || this.DEFAULT_PROGRESS_PROPERTY,
			modelStartProperty: this.controller.attributes.progressStartProperty,
			type: Mojo.Widget.ProgressPill.slider,
			cancellable: this.controller.attributes.cancellable,
			completeFunction: this.onComplete.bind(this)
		};
		this.progressPillModel = this.controller.model;
		this.controller.scene.setupWidget(this.progressPillId, this.progressPillAttributes, this.progressPillModel);
	
		this.controller.instantiateChildWidgets(this.controller.element); //this should instantiate the big list and the filter field
	},
	
	onComplete: function() {
		//change the width of the progress pill
		//this.progressPill.style.width = '36px';
		this.slider.mojo.updateBackgroundElement(this.progressPill.select('div.stream-buffered')[0]);
	}
});
