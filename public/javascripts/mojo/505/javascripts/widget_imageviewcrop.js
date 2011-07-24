/**
 * @name widget_imageviewcrop.js
 * @fileOverview This file describes the ImageViewCrop widget designed to
 * crop an image; See {@link Mojo.Widget.ImageViewCrop} for more info. 

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/*
@private
### Overview ###
As the name implies, this is a variation on ImageView to present a cropping rectangle over a single image. 
It is limited to a single image at a time and allows you to center a cropping rectangle of any size over a 
selected image with a single action button. There are no events to listen to, just a callback routine when 
the button is tapped.


### Declaration ###

		<div x-mojo-element="ImageViewCrop" id="ImageCropId" class="ImageCropClass" name="ImageCropName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element	Required	ImageViewCrop	Declares the widget as type 'ImageViewCrop' 
	    id				Required	Any String		Identifies the widget element for use when instantiating or rendering
	    class			Optional	Any String		Provide your own unique class and override the frameworks styles
	    name			Optional	Any String		Add a unique name to the ImageViewCrop widget; generally used in templates when used 


### Events ###

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		None


### Instantiation ###

		this.controller.setupWidget("ImageCropId",
			this.attributes = {
				source: 'images/Roberts.jpg',
				text: 'Approve!',
				width: 75,
				height: 75,
				callback: this.handleCrop.bind(this)
				},
			this.model = {
			}
		});


### Attribute Properties ###

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
	    source               String			Required                Full path of picture to crop
	    text                 String			Optional    Null        Wording on the crop action button
	    html                 String			Optional    Null        Contents to put in the crop action button, overriding text    
	    width                Integer		Required    Target      Width of view window
	    height               Integer		Required    Target      Height of view window
	    background           String			Optional    None        Background of view window
	    callback             Function		Required    Callback    Function if accept button is tapped; returns windowParams & fullParams
	 																- each includes:
																		focusX			String		X-scale as a fraction where 1.0 is 100%
																		focusY			String		Y-scale as a fraction where 1.0 is 100%
																		sourceImage		String		Pathname of source image 
																		scale			Integer		Overall scale as a fraction where 1.0 is 100%
																		sourceWidth		Integer		Width in pixels
																		suggestedXSize	Integer		Target size in pixels
																		suggestedYSize	Integer		Target size in pixels      
																		suggestedXTop	Integer		Target start point in pixels      
																		suggestedYTop	Integer		Target start point in pixels      


### Model Properties ###

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		None


### Methods ###

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		None


@field
*/

Mojo.Widget.ImageViewCrop = Class.create({
	IMG_WIDTH_ADJUST: 38,
	
	initialize : function()
	{
	},

	/** @private */
	setup : function()
	{
		Mojo.assert(this.controller.element,
			"Mojo.Widget.ImageViewCrop requires an element");
		Mojo.assert(this.controller.model,
			"Mojo.Widget.ImageViewCrop requires a model. " + 
			"Did you call controller.setupWidgetModel() for " +
			this.controller.widgetName+"?");

		Mojo.assert(this.controller.attributes.source,
			"Mojo.Widget.ImageViewCrop requires source");
		Mojo.assert(this.controller.attributes.callback,
			"Mojo.Widget.ImageViewCrop requires callback");
		Mojo.assert(this.controller.attributes.width,
			"Mojo.Widget.ImageViewCrop requires width");
		Mojo.assert(this.controller.attributes.height,
			"Mojo.Widget.ImageViewCrop requires height");

		this.source = this.controller.attributes.source;
		this.targetWidth = this.controller.attributes.width;
		this.targetHeight = this.controller.attributes.height;
		this.limitZoom = (this.controller.attributes.limitZoom === undefined) ? true : this.controller.attributes.limitZoom;
		this.background =
				this.controller.attributes.background ||
				this.controller.attributes.backgroundColor;
		this.backgroundImage =
				this.controller.attributes.backgroundImage;
		this.element = this.controller.element;

		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;


		this.element.innerHTML = Mojo.View.render({
			object: {title: this.controller.attributes.text || ""},
			template: Mojo.Widget.getSystemTemplatePath(
							'/imageviewcrop'),
			attributes: {divPrefix: this.divPrefix}
		});
		
		this.heightElement = this.controller.get(this.divPrefix+'ViewportHeight');
		this.widthElement = this.controller.get(this.divPrefix+'ViewportWidth');



		this.imageViewWidget = this.element.down();
		this.overlayElement = this.element.down().next(1);

		this.buttonElement = this.element.down('.palm-button');
		
		if (this.controller.attributes.html)
		{
			this.buttonElement.innerHTML = this.controller.attributes.html;
		}

		this.imageViewWidget.width = this.element.width;
		this.imageViewWidget.height = this.element.height;
		this.imageViewWidget.style.width = this.element.style.width;
		this.imageViewWidget.style.height = this.element.style.height;

		this.imageViewWidget.identify();


		this.widthElement.style.width = (this.targetWidth - this.IMG_WIDTH_ADJUST) + "px";
		this.heightElement.style.height = this.targetHeight + "px";
		this.controller.scene.setupWidget(this.imageViewWidget.id,
		{
			noExtractFS: true,
			limitZoom: this.limitZoom,
			panInsetX: (this.element.width - this.targetWidth) / 2,
			panInsetY: (this.element.height - this.targetHeight) / 2

		},{
			background: this.background,
			backgroundImage: this.backgroundImage
		});

		this.controller.instantiateChildWidgets(this.element);

		this.imageViewWidget.mojo.centerUrlProvided(this.source);

		this.buttonElement.observe(Mojo.Event.tap,
					this._callbackWrapper.bind(this));

		this._addPassthroughEvent(this.overlayElement,
			this.imageViewWidget, Mojo.Event.tap);
		this._addPassthroughEvent(this.overlayElement,
			this.imageViewWidget, Mojo.Event.flick);
		this._addPassthroughEvent(this.overlayElement,
			this.imageViewWidget, Mojo.Event.dragStart);
		this._addPassthroughEvent(this.overlayElement,
			this.imageViewWidget, Mojo.Event.dragEnd);
		this._addPassthroughEvent(this.overlayElement,
			this.imageViewWidget, Mojo.Event.dragging);
		this._addPassthroughEvent(this.overlayElement,
			this.imageViewWidget, 'gesturestart');
		this._addPassthroughEvent(this.overlayElement,
			this.imageViewWidget, 'gesturechange');
		this._addPassthroughEvent(this.overlayElement,
			this.imageViewWidget, 'gestureend');
		
		this.controller.exposeMethods(['manualSize']);
		Mojo.Log.info("Setting up cropview widget!");
	},

	manualSize : function(width, height)
	{
		this.imageViewWidget.mojo.manualSize(width, height);
		this.element.width = width;
		this.element.height = height;
		this.element.style.width = width + "px";
		this.element.style.height = height + "px";
	},

	_addPassthroughEvent : function(sourceElement, targetElement, eventName)
	{
		sourceElement[eventName+'Handler_mojo'] = function(name, event) {
			this._mojoController.assistant._cropHandler(
								name, event);
		}.bind(targetElement, eventName);
		
		sourceElement.observe(eventName, sourceElement[eventName+'Handler_mojo']);
	},
	
	_removePassthroughEvent: function(sourceElement, eventName) {
		sourceElement.stopObserving(eventName, sourceElement[eventName+'Handler_mojo']);
	},
		
	/** @private */
	cleanup : function()
	{
		this.buttonElement.stopObserving(Mojo.Event.tap);
		
		this._removePassthroughEvent(this.overlayElement, Mojo.Event.tap);
		this._removePassthroughEvent(this.overlayElement, Mojo.Event.flick);
		this._removePassthroughEvent(this.overlayElement, Mojo.Event.dragStart);
		this._removePassthroughEvent(this.overlayElement, Mojo.Event.dragEnd);
		this._removePassthroughEvent(this.overlayElement, Mojo.Event.dragging);
		this._removePassthroughEvent(this.overlayElement, 'gesturestart');
		this._removePassthroughEvent(this.overlayElement, 'gesturechange');
		this._removePassthroughEvent(this.overlayElement, 'gestureend');
	},

	_callbackWrapper : function()
	{
		var state = this.imageViewWidget.mojo.getCurrentParams();

		var viewedWidth = state.sourceWidth * state.scale;
		var viewedHeight = state.sourceHeight * state.scale;

		state.suggestedXSize = Math.round(
					this.targetWidth / state.scale);
		state.suggestedYSize = Math.round(
					this.targetHeight / state.scale);

		state.suggestedXSize = Math.min(state.suggestedXSize,
							state.sourceWidth);
		state.suggestedYSize = Math.min(state.suggestedYSize,
							state.sourceHeight);

		state.suggestedScale = Math.round(state.scale * 100);
		state.suggestedXTop = Math.round(
					(state.sourceWidth * state.focusX) -
					(state.suggestedXSize / 2));
		state.suggestedYTop = Math.round(
					(state.sourceHeight * state.focusY) -
					(state.suggestedYSize / 2));

		state.suggestedXTop = Math.max(0, state.suggestedXTop);
		state.suggestedYTop = Math.max(0, state.suggestedYTop);

		var overall = this.imageViewWidget.mojo.getCurrentParams();

		overall.suggestedXSize = Math.round(
					this.element.width / overall.scale);
		overall.suggestedYSize = Math.round(
					this.element.height / overall.scale);

		overall.suggestedXSize = Math.min(overall.suggestedXSize,
							overall.sourceWidth);
		overall.suggestedYSize = Math.min(overall.suggestedYSize,
							overall.sourceHeight);

		overall.suggestedScale = Math.round(overall.scale * 100);
		overall.suggestedXTop = Math.round(
					(overall.sourceWidth * overall.focusX) -
					(overall.suggestedXSize / 2));
		overall.suggestedYTop = Math.round(
				(overall.sourceHeight * overall.focusY) -
					(overall.suggestedYSize / 2));

		overall.suggestedXTop = Math.max(0, overall.suggestedXTop);
		overall.suggestedYTop = Math.max(0, overall.suggestedYTop);

		return this.controller.attributes.callback(state, overall);
	}

});

