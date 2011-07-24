/**
 * @name widget_slider.js
 * @fileOverview This file discusses Sliders control that is used to present a continuum of mutually exclusive values, like a volume control;
 * See {@link Mojo.Widget.Slider} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####

The Slider presents a range of selection options in the form of a horizontal slider with a control knob 
that can be tapped and dragged to the desired location. You must specify minimum (left-most) and maximum 
(right-most) values for the slider and you can optionally indicate intermediate choices which will trigger 
additional behavior.


#### Declaration ####

		<div x-mojo-element="Slider" id="sliderId" class="sliderClass" name="sliderName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
		x-mojo-element	Required	Slider			Declares the widget as type 'Slider' 
		id				Required	Any String		Identifies the widget element for use when instantiating or rendering
		class			Optional	Any String		Slider uses the .palm-slider-container by default but you override this setting
		name			Optional	Any String		Add a unique name to the slider widget; generally used in templates when used 


#### Events ####

		Mojo.Event.listen("sliderId", Mojo.Event.propertyChange, this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		Mojo.Event.propertyChange	{value: pos}


#### Instantiation ####

		this.controller.setupWidget("listselectorId",
		  this.attributes = {
		      minValue: 0,
			  maxValue: 100
		},

		  this.model = {
		      value: 3,
		      disabled: false
		});
    

#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		modelProperty		String			Optional	value       Model property name for slider state
		minValue			Integer			Required				Starting value, or leftmost value on slider
		maxValue			Integer			Required				Ending value, or rightmost value on slider
		round				Boolean			Optional	FALSE		If true, will round the slider value to the nearest integer
																	if 1, will be used for starting value
		updateInterval		Integer			Optional	0			if >0, will send updates every updateInterval seconds


#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		value				Integer			Required	none		value of widget; this will be sanitized to be between minValue and maxValue


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		None


*/
Mojo.Widget.Slider = Class.create({
	initialize: function() {
    	
	},
  
  	setup: function() {
    	this.initializeDefaultValues();
		Mojo.assert(this.controller.model.minValue !== undefined, "Mojo.Widget.Slider requires a minimum value.");
		Mojo.assert(this.controller.model.maxValue !== undefined, "Mojo.Widget.Slider requires a maximum value.");
		
		if (this.controller.attributes.updateInterval) {
			this.draggingUpdate = this.sendDragUpdate.bind(this);
		}
    	this.renderWidget();
		this.controller.exposeMethods(['updateDraggingArea']);
  	},

	/** @private **/
	_sanitizeModelValue: function() {
		var value = this.controller.model[this.modelProperty];
		value = Math.min(value, this.originalMaxValue);
		value = Math.max(value, this.originalMinValue);
		this.controller.model[this.modelProperty] = value; //sanitized
		return value;
	},
	
	remeasure: function(e) {
		this.positionSlider();
		if (!this.dragStartHandler) {
			this.dragStartHandler = this.dragStartHandlerFunc.bindAsEventListener(this);
			this.controller.listen(this.slider, Mojo.Event.dragStart, this.dragStartHandler);
		}
		Mojo.Drag.setupDropContainer(this.controller.attributes.backgroundElement || this.controller.element, this);
	},
	
	cleanup: function() {
		if (this.dragStartHandler) {
			this.controller.stopListening(this.slider, Mojo.Event.dragStart, this.dragStartHandler);
		}
	},

	
	//send an update to the model
	sendDragUpdate: function() {
		this.updateModel();
		//put next one in the queue
		if (this.seeking) { //stop making new events when seeking has stopped because slider dropped
			this.queuedDragUpdate = this.draggingUpdate.delay(this.controller.attributes.updateInterval);
		}
	},

	initializeDefaultValues: function() {
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		this.controller.model = this.controller.model || {};
		this.controller.attributes = this.controller.attributes || {};
		this.increments = 0;
		this.controller.model.maxValue = this.controller.valueFromModelOrAttributes('maxValue', 0);
		this.controller.model.minValue = this.controller.valueFromModelOrAttributes('minValue', 0);
		this.originalMaxValue = this.controller.model.maxValue;
		this.originalMinValue = this.controller.model.minValue;
		this.modelProperty = this.controller.attributes.modelProperty || Mojo.Widget.defaultModelProperty;
	},
	
	renderWidget: function() {
		var model = {
			divPrefix: this.divPrefix
		};
		var label, labelContent = '', width = '0px', i = 0; //width is the spacing between items; does not apply to first or last
		var max = this.controller.model.maxValue;
		var min = this.controller.model.minValue;
		var diff = max - min;
		var value = 0, that = this;
		
		if (this.controller.attributes.labels) {
			this.increments = this.controller.attributes.labels.length;
			//need to make labels that fit over the bar
			this.controller.attributes.labels.each( function (l) {
				label = {'label': l, 'width': width, 'name': i, 'value': value};
				labelContent += Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath('/slider/slider-label'), object: label});
				i++;
				value += (diff/(that.increments-1));
			});
			model.labelContent = labelContent;
		}
		
		var sliderContent = Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath('/slider/slider'), object: model});
		if (!this.controller.attributes.backgroundElement) {
			var content = Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath('/slider/slider-background'), object: model});
			this.controller.element.innerHTML = content;
		}
		this.sliderBackground = this.controller.get(this.controller.attributes.backgroundElement) || this.controller.get(this.divPrefix+"-sliderBackground");
		this.sliderBackground.insert({bottom: sliderContent});
		this.slider = this.controller.get(this.divPrefix+"-slider");
		this.remeasure();
	},
	
	updateDraggingArea: function(min, max) {
		this.controller.model.maxValue = max;
		this.controller.model.minValue = min;
	},
	
	positionSlider: function() {
		var pos;
		var maxPix;
		var minPix;
		var diff;
		var percent;
		var sliderPos;
		var max = this.controller.model.maxValue;
		var min = this.controller.model.minValue;
		if (this.controller.model[this.modelProperty] === undefined) {
			return;
		}
		
		pos = this._sanitizeModelValue();
		maxPix = this.getMaxPixel();
		minPix = this.getMinPixel();
		diff = maxPix - minPix;
		percent = (pos-min) / (max-min);
		sliderPos = (percent * diff) + minPix;
		
		if (sliderPos < minPix) {
			sliderPos = minPix;
		} 
		if (sliderPos > maxPix) {
			sliderPos = maxPix;
		}
		this.slider.setStyle({'left': sliderPos+ 'px' });	
	},
	
	handleModelChanged: function() {
		if (!this.seeking) {
			this.positionSlider();
		}
	},
	
	getMaxPixel: function() {
		return this.getSliderbarWidth();
	},
	
	getMinPixel: function() {
		return this.sliderBackground.offsetLeft - this.slider.getWidth()/2;
	},
	
	/** @private **/
	/** Method for getting the real width of where the slider can be dragged! **/
	getSliderbarWidth: function() {
		//if we are forcing a position, don't use anything to do with draggable elements
		this.slider.removeClassName('palm-drag-element'); //get rid of this extra class added for dragging
		return this.sliderBackground.getWidth() - (this.slider.getWidth()/2) + this.sliderBackground.offsetLeft; // - (this.slider.getWidth()/2); //get the width of what is drawn without any borders
	},
	
	/**
	* @private
	* Event handler for dragStart events.
	* This is used to start drag'n'drop operation for swipe-to-delete.
	* 
	* @param {Object} event
	*/
	dragStartHandlerFunc: function(event) {
		//set max and min based on max and min vals which might not be the full length
		var minimumPixel =  this.getMinPixel();//20; //0; // - (this.slider.getWidth() / 2); //based on 0 as the starting point of the container
		var maximumPixel = this.getMaxPixel();//+ this.sliderBackground.offsetLeft; ///2;
		var viewportDimensions = Mojo.View.getViewportDimensions(this.controller.element.ownerDocument);
		if (maximumPixel > viewportDimensions.width) {
			maximumPixel = viewportDimensions.width;
		}

		
		Mojo.Drag.startDragging(this.controller.scene, this.slider, event.down, {preventVertical:true, preventDropReset:true, minHorizontalPixel: minimumPixel, maxHorizontalPixel: maximumPixel});
		this.seeking = true;
		
		if (this.controller.attributes.updateInterval) {
			//set off the timer to get the current position from dragging
			this.queuedDragUpdate = this.draggingUpdate.delay(this.controller.attributes.updateInterval);
		}
		
		Mojo.Event.send(this.controller.element, Mojo.Event.sliderDragStart); //allow applications to see this event
	},
		
	/**
	 * @private
	 * describe this
	 * 
	 * @param {Object} el
	 */
	dragDrop: function(el) {
		if (this.controller.attributes.updateInterval && this.queuedDragUpdate) {
			this.controller.window.clearTimeout(this.queuedDragUpdate);
			this.queuedDragUpdate = undefined;
		}
		this.updateModel();	
		Mojo.Event.send(this.controller.element, Mojo.Event.sliderDragEnd); //allow applications to see this event
		this.seeking = false;
	},
	
	//aim for the middle of the slider
	updateModel: function() {
		var pos = this.determineSliderValue(this.slider.offsetLeft);
		if (pos !== this.controller.model[this.modelProperty]) {
			this.controller.model[this.modelProperty] = pos;
			Mojo.Event.send(this.controller.element, Mojo.Event.propertyChange, {value: pos});
		}
	},
	
	determineSliderValue: function(position) {
		var max = this.originalMaxValue || 0;
		var min = this.originalMinValue || 0;
		var diff = max - min;
		
		var maxPix = this.getMaxPixel();
		var minPix = this.getMinPixel();
		//position = (maxPix - minPix)/2;
		
		var relativePos = position - minPix; //this is the center of the item
		var diffPix = maxPix - minPix;
		
		
		var percent = relativePos / diffPix;

		
		var value = (percent * diff) + min;
		if (value > max) {
			value = max;
		}
		else if (value < min) {
			value = min;
		}
		
		if (this.controller.attributes.round) {
			value = Math.round(value);
		} else if (this.increments > 0) {
			//find the closest increment to the value determined here
			var sectionSize = diff / this.increments;
			var i = this.increments-1, size = max;
			while (size > value && i > 0) {
				size -= sectionSize;
				i--;
			}
			//i = i+1; //we stopped at the one right before
			if (size > value) {
			//	i++; //if we went past it
			}
			//get the lower bound for one of this value and the upper bound
			var increment = this.controller.element.select('[name="'+i+'"]')[0];
			increment = increment.select('[name="incrementvalue"]')[0];
			increment = parseFloat(increment.value, 10);
			var increment2 = this.controller.element.select('[name="'+(i+1)+'"]')[0]; //this is the higher end one, so set to infinity
			if (increment2) {
				increment2 = increment2.select('[name="incrementvalue"]')[0];
				increment2 = parseFloat(increment2.value, 10);
				
				if (Math.abs(increment - value) < Math.abs(increment2 - value)) {
					value = increment;
				} else {
					value = increment2;
				}
			} else {
				 value = increment;
			}
			
			this.controller.model[this.modelProperty] = value;
			this.positionSlider();
		}
		return value;
	},
	
	updateProgressStart: function(percent) {
		
	},
	
	updateProgressEnd: function(percent) {
		
	}
});
