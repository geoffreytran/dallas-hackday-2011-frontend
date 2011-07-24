/**
 * @name widget_imageview.js
 * @fileOverview This file describes the ImageView control designed to view
 * an image full screen; See {@link Mojo.Widget.ImageView} for more info. 

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####

This widget is designed to view an image full screen with support for zooming and panning while 
optionally moving between additional images. You can use this for single images, or flick left 
and right through a series of images. You can assign handlers through the onLeftFunction and 
onRightFunction attributes properties and listen to mojo-imageViewChanged; from the handlers 
use the methods leftUrlProvided(url), rightUrlProvided(url), and centerUrlProvided(url) to 
build a scrolling list of images.

#### Declaration ####

		<div x-mojo-element="ImageView" id="ImageId" class="ImageClass" name="ImageName"></div>

		Properties			Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element		Required	ImageView		Declares the widget as type 'ImageView' 
	    id					Required	Any String		Identifies the widget element for use when instantiating or rendering
	    class				Optional	Any String		Provide your own unique class and override the frameworks styles
	    name				Optional	Any String		Add a unique name to the ImageView widget; generally used in templates when used 


#### Events ####

		Mojo.Event.listen("ImageId",Mojo.Event.propertyChange, this.handleUpdate)

		Event Type						Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
	    Mojo.Event.imageViewChanged		event.url		event fires when image in view changes
    

#### Instantiation ####
    
		this.controller.setupWidget("ImageId",
			this.attributes = {
				noExtractFS: true
				},
			this.model = {
				onLeftFunction: this.onLeft.bind(this),
				onRightFunction: this.onRight.bind(this)
			}
		});


#### Attribute Properties ####

		Attribute Property	Type		Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		highResolutionLoadTimeout
							Number		Optional	1.2			Time to wait before switching photo to high res
		extractfsParams		String		Optional	"800:800:3" 
		lowResExtractFSParams String	Optional	"160:160:3"
		noExtractFS			Boolean		Optional	false		Flag to prevent looking up a high res versio				
		limitZoom			Boolean		Optional	false		Flag to prevent or limit zooming			
		panInsetX			Number		Optional	0
		panInsetY			Number		Optional	0
		

#### Model Properties ####

		Model Property		Type		Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		onLeftFunction		Function	Optional	None		Called after a left transition
	    onRightFunction		Function	Optional	None		Called after a right transition 

 
#### Methods ####

		Method				Arguments			Description
		---------------------------------------------------------------------------------------------------------------------------------
		getCurrentParams	None				Return the current zoom level and focus [0,1]
		manualSize			width, height		Manually size the widget
		leftUrlProvided		filepath or url		Tell the widget to use this image as the left
		rightUrlProvided	filepath or url		Tell the widget to use this image as the right
		centerUrlProvided	filepath or url		Tell the widget to use this image as the center



@field
*/
Mojo.Widget.ImageView = Class.create({

	defaultExtractFSParams : "800:800:3",
	defaultLowResExtractFSParams : "160:160:3",
	defaultGutterWidth : 25,
	defaultZoomThreshold : 25,
	dragSnapThreshold : 0.4,
	highResolutionLoadTimeout : 1.2,
	extractFSPath : "/var/luna/data/extractfs",
	corruptImage: Mojo.Config.IMAGES_HOME+'/corrupt-image.png',

	/** @private */
	setup : function()
	{
		// sanity checks
		Mojo.assert(this.controller.element,
			"Mojo.Widget.ImageView requires an element");
		Mojo.assert(this.controller.model,
			"Mojo.Widget.ImageView requires a model. " + 
			"Did you call controller.setupWidgetModel() for " +
			this.controller.widgetName+"?");
		
		// target transition time in seconds...
		this.zoomTargetTime = 0.5;
		this.flickTargetTime = 0.3;
		this.sameTargetTime = 0.5;
		this.dragTargetTime = 0.4;
		this.flickScale = 0.075;
		
		this.targetDecodeResolution = 1536;
		
		this.dragAnimationSteps = this.dragTargetTime *
						Mojo.Animation.targetFPS;
		
		// TODO: see if we want a decay at all...
		this.dragIntermediateSteps = 8;
		this.zoomIntermediateSteps = 5;
		this.zoomConstant = 85;
		
		// pull data from setup widget
		this.element = this.controller.element;
		
		// internal variables
		this.centerImageExists = false;
		this.leftImageExists = false;
		this.rightImageExists = false;
		this.inTransition = false;
		
		this.zoomMax = 1.0;
		this.zoomLevel = 1.0;
		this.panX = 0;
		this.panY = 0;
		
		this.imageCenter  = this._newImage();
		this.imageRight   = this._newImage();
		this.imageLeft    = this._newImage();
		this.imageHighRes = this._newImage();
		
		this.highResolutionLoadTimeoutSetting =
			this.controller.attributes.highResolutionTimeout ||
			this.highResolutionLoadTimeout;
		this.extractFSParams =
			this.controller.attributes.extractfsParams ||
			this.defaultExtractFSParams;
		this.lowResExtractFSParams =
			this.controller.attributes.lowResExtractfsParams ||
			this.defaultLowResExtractFSParams;
		
		this.noExtractFS = this.controller.attributes.noExtractFS;
		this.limitZoom = this.controller.attributes.limitZoom;
		this.panInsetX = this.controller.attributes.panInsetX || 0;
		this.panInsetY = this.controller.attributes.panInsetY || 0;
		this.allowExperimentalSwitch = this.controller.attributes.allowExperimentalSwitch || false;
		this.autoSize = (!!this.controller.attributes.autoSize) || false;
		
		this._bindLoads();
		
		this.canvasElement = this.controller.document.createElement('canvas');
		this.canvasElement.observe(Mojo.Event.tap,
					this._tapHandler.bind(this));
		this.canvasElement.observe(Mojo.Event.flick,
					this._flickHandler.bind(this));
		this.canvasElement.observe(Mojo.Event.dragStart,
					this._dragStartHandler.bind(this));
		this.canvasElement.observe(Mojo.Event.dragging,
					this._draggingHandler.bind(this));
		this.canvasElement.observe(Mojo.Event.dragEnd,
					this._dragEndHandler.bind(this));
		
		this.element.appendChild(this.canvasElement);
		
		this.animationQueue = Mojo.Animation.queueForElement(
							this.canvasElement);
		
		this._readModelProperties(this.controller.model);
		
		this.resizer = this._resizeHandler.bindAsEventListener(this);
		this.manualSize(this.element.offsetWidth, this.element.offsetHeight);
		this.controller.listen(
			this.controller.window, 'resize', this.resizer);
		
		this.activateHandler = this._activate.bind(this);
		this.deactivateHandler = this._deactivate.bind(this);
		this.gestureStartHandler = this._gestureStart.bind(this);
		this.gestureChangeHandler = this._gestureChange.bind(this);
		this.gestureEndHandler = this._gestureEnd.bind(this);
		this._overscrollTimeout = this._overscrollTimeout.bind(this);
		
		this.controller.listen(
			this.controller.scene.sceneElement,
			Mojo.Event.activate, this.activateHandler);
		this.controller.listen(
			this.controller.scene.sceneElement,
			Mojo.Event.deactivate, this.deactivateHandler);
		
		this.controller.exposeMethods(['getCurrentParams']);
		this.controller.exposeMethods(['manualSize']);
		this.controller.exposeMethods(['leftUrlProvided']);
		this.controller.exposeMethods(['rightUrlProvided']);
		this.controller.exposeMethods(['centerUrlProvided']);
	},

	_newImage : function()
	{
		return this.controller.document.createElement('img');
	},

	_activate : function()
	{
		this.controller.document.observe('gesturestart',
						this.gestureStartHandler);
		this.controller.document.observe('gesturechange',
						this.gestureChangeHandler);
		this.controller.document.observe('gestureend',
						this.gestureEndHandler);
	},

	_deactivate : function()
	{
		this.controller.document.stopObserving('gesturestart',
						this.gestureStartHandler);
		this.controller.document.stopObserving('gesturechange',
						this.gestureChangeHandler);
		this.controller.document.stopObserving('gestureend',
						this.gestureEndHandler);
	},

	/** @private */
	_cropHandler : function(name, event)
	{
		switch(name)
		{
			case Mojo.Event.tap:
				return this._tapHandler(event);
			case Mojo.Event.flick:
				return this._flickHandler(event);
			case Mojo.Event.dragStart:
				return this._dragStartHandler(event);
			case Mojo.Event.dragEnd:
				return this._dragEndHandler(event);
			case Mojo.Event.dragging:
				return this._draggingHandler(event);
			case 'gesturestart':
				return this._gestureStart(event);
			case 'gesturechange':
				return this._gestureChange(event);
			case 'gestureend':
				return this._gestureEnd(event);
		}
	},

	getCurrentParams : function()
	{
		var result = {};

		var imageWidth = this.imageCenter.width * this.zoomLevel;
		var imageHeight = this.imageCenter.height * this.zoomLevel;

		result.focusX = (-this.panX +
				(this.canvasElement.width/2)) / imageWidth;

		result.focusY = (-this.panY +
				(this.canvasElement.height/2)) / imageHeight;

		result.sourceImage = this._getHighResUrl(
						this.originalCenterUrl);
		result.scale = this.zoomLevel;
		result.sourceWidth = this.imageCenter.width;
		result.sourceHeight = this.imageCenter.height;

		return result;
	},

	/* @private */
	noAction : function()
	{
	},
	
	/* @private */
	handleModelChanged : function(model, what)
	{
		this._readModelProperties(this.controller.model);
		if (this.autoSize) {
			this.resizer();
		} else {
			this._adjustToSize();
		}
	},

	/** @private */
	_readModelProperties : function(model)
	{
		this.background =
				this.controller.model.background ||
				this.controller.model.backgroundColor;
		this.backgroundImage =
				this.controller.model.backgroundImage;
		this.onLeftFunction = this.controller.model.onLeftFunction || Mojo.doNothing;
		this.onRightFunction = this.controller.model.onRightFunction || Mojo.doNothing;

		if (this.backgroundImage)
		{
			this.loadedBackgroundImage = this._newImage();
			this.loadedBackgroundImage.onload =
						this._render.bind(this);
			this.loadedBackgroundImage.src = this.backgroundImage;
		}

		this._modelChanged();
	},

	/** @private */
	_bound : function(viewSize, imageSize, inset, coord, zoom)
	{
		var imageRealSize = imageSize * (zoom || this.zoomLevel);
		
		if ((viewSize - (inset * 2)) > imageRealSize) {
			return (viewSize - imageRealSize) / 2;
		}

		if (coord >= inset) {
			return inset;
		}

		if ((coord - viewSize) < -(inset + imageRealSize)) {
			return -((inset + imageRealSize) - viewSize);
		}

		return coord;
	},

	/** @private */
	_boundX : function(x, customZoom)
	{
		return this._bound(	this.canvasElement.width,
					this.imageCenter.width,
					this.panInsetX,
					x, customZoom);
	},

	/** @private */
	_boundY : function(y, customZoom)
	{
		return this._bound(	this.canvasElement.height,
					this.imageCenter.height,
					this.panInsetY,
					y, customZoom);
	},

	/** @private */
	cleanup : function()
	{
		// TODO: cancel outstanding ipc calls.
		this.canvasElement.stopObserving(Mojo.Event.tap);
		this.canvasElement.stopObserving(Mojo.Event.flick);
		this.canvasElement.stopObserving(Mojo.Event.dragStart);
		this.canvasElement.stopObserving(Mojo.Event.dragging);
		this.canvasElement.stopObserving(Mojo.Event.dragEnd);
		this.controller.stopListening(
			this.controller.window, 'resize', this.resizer);
		delete this.imageCenter;
		delete this.imageRight;
		delete this.imageLeft;
		delete this.imageHighRes;
	},

	/** @private */
	_modelChanged : function()
	{
		this.imageHighRes.src = null;
		this.imageCenter.src = null;
		this.imageLeft.src   = null;
		this.imageRight.src  = null;

		this.leftImageExists = false;
		this.rightImageExists = false;
		this.centerImageExists = false;
	},

	_calculateGutterWidth : function(middleWidth)
	{
		var actualWidth = middleWidth ||
					this.imageCenter.width * this.zoomLevel;
		var gutter = this.defaultGutterWidth;
		if (actualWidth < this.canvasElement.width)
		{
			var middleBuffer =
				(this.canvasElement.width - actualWidth) / 2;
			gutter = Math.max(middleBuffer, gutter);
		}

		return gutter;
	},

	_isImageFullyLoaded: function(image)
	{
		return (image.complete && image.width && image.height);
	},

	/** @private */
	_render : function(panXLeft, panXRight)
	{
		var context = this.canvasElement.getContext('2d');

		if (this.background)
		{
			context.fillStyle = this.background;
			context.fillRect(0, 0,	this.canvasElement.width,
						this.canvasElement.height);
		}
		else
		{
			context.clearRect(0, 0, this.canvasElement.width,
						this.canvasElement.height);
		}
		
		if (	this.backgroundImage &&
			this.loadedBackgroundImage &&
			this._isImageFullyLoaded(this.loadedBackgroundImage))
		{
			context.drawImage(this.loadedBackgroundImage, 0, 0);
		}

		var centerWidth = this.imageCenter.width * this.zoomLevel; 
		var centerHeight = this.imageCenter.height * this.zoomLevel; 
		var gutter = this._calculateGutterWidth(centerWidth);

		var offsetX;
		var offsetY;

		if (this._isImageFullyLoaded(this.imageCenter))
		{
			offsetX = this.panX;
			offsetY = this.panY;

			context.drawImage(this.imageCenter,
						offsetX, offsetY,
						centerWidth, centerHeight);
		}
		else
		{
			Mojo.Log.info("Render with blank middle image!!!");
			return;
		}

		if (this._isImageFullyLoaded(this.imageLeft))
		{
			var leftWidth = this.imageLeft.width * this.zoomLeft; 
			var leftHeight = this.imageLeft.height * this.zoomLeft; 

			if (panXLeft !== undefined)
			{
				offsetX = panXLeft;
			}
			else
			{
				offsetX = this.panX - (leftWidth + gutter);
			}

			context.drawImage(this.imageLeft, offsetX,
					(this.canvasElement.height -
						leftHeight) / 2,
					leftWidth, leftHeight);
		}

		if (this._isImageFullyLoaded(this.imageRight))
		{
			var rightWidth = this.imageRight.width * this.zoomRight;
			var rightHeight = this.imageRight.height *
								this.zoomRight; 

			if (panXRight !== undefined)
			{
				offsetX = panXRight;
			}
			else
			{
				offsetX = this.panX + centerWidth + gutter;
			}

			context.drawImage(this.imageRight, offsetX,
						(this.canvasElement.height -
							rightHeight) / 2,
						rightWidth, rightHeight);
		}
	},

	/** @private */
	_getExtractFSUrl : function(url, params)
	{
		if (!url)
		{
			return null;
		}

		if (this.noExtractFS || !url.startsWith("/media/internal"))
		{
			return url;
		}

		return this.extractFSPath + encodeURIComponent(url) +
				(url.indexOf(":") >= 0 ? ":" : ":0:0:") + 
				params;
	},

	/** @private */
	_getLowResUrl : function(url)
	{
		// exif thumbs are generally of the 120x160 dimensions,
		// there is no sense in extractfs scaling up the image.
		return this._getExtractFSUrl(url, this.lowResExtractFSParams);
	},

	/** @private */
	_getMediumResUrl : function(url)
	{
		return this._getExtractFSUrl(url,
					this.canvasElement.width + ":" +
					this.canvasElement.height + ":3");
	},

	/** @private */
	_getHighResUrl : function(url)
	{
		return this._getExtractFSUrl(url, this.extractFSParams);
	},

	/** @private */
	_applyHighResExtractFSParams : function(image, url)
	{
		Mojo.Log.info("Try applying high res ", url);
		if (this.inNextFlickTransition || this.noExtractFS ||
						this.originalHighResUrl !== url)
		{
			Mojo.Log.info("Dropping high res.");
			return;
		}

		if (this._userBusy())
		{
			this.highResolutionTimer =
				this._applyHighResExtractFSParams.bind(this)
				.delay(0.5, image, url);
			return;
		}

		image.src = this._getHighResUrl(url);
	},

	/** @private */
	_userBusy : function()
	{
		return this.inGesture || this.inDrag ||
			this.inZoomTransition || this.inSameTransition;
	},

	leftUrlProvided : function(url, thumbUrl)
	{
		Mojo.Log.info("provided left: " + url);
		if (url !== this.originalLeftUrl)
		{
			this.leftImageExists = false;
			this.originalLeftUrl = url;
			this.imageLeft.src = this._getLowResUrl(thumbUrl || url);
		}
	},

	centerUrlProvided : function(url, thumbUrl)
	{
		Mojo.Log.info("provided center: " + url);
		if (url !== this.originalCenterUrl)
		{
			this.centerImageExists = false;
			this.originalCenterUrl = url;
			this.imageCenter.src = this._getLowResUrl(thumbUrl || url);
		}
	},

	rightUrlProvided : function(url, thumbUrl)
	{
		Mojo.Log.info("provided right: " + url);
		if (url !== this.originalRightUrl)
		{
			this.rightImageExists = false;
			this.originalRightUrl = url;
			this.imageRight.src = this._getLowResUrl(thumbUrl || url);
		}
	},

	/** @private */
	_leftImageLoaded : function(event)
	{
		this.zoomLeft = this._calculateInitialZoom(this.imageLeft);
		this.leftImageExists = true;
		Mojo.Log.info("Left Image done loading!", this.imageLeft.src);
	},

	/** @private */
	_rightImageLoaded : function(event)
	{
		this.zoomRight = this._calculateInitialZoom(this.imageRight);
		this.rightImageExists = true;
		Mojo.Log.info("Right Image done loading!", this.imageRight.src);
	},

	/** @private */
	_highResImageFailed : function(event)
	{
		Mojo.Log.error("Failed to load high res image!",
						this.originalHighResUrl);
	},
	
	_recoverFromFailedImage: function(side) {
		var src;		
		Mojo.Log.info("Recovering from failed image load by displaying a corrupt image placeholder.");
		
		if (side === 'center') {
			src = this.imageCenter.src;
			if (src.substring(src.length - this.corruptImage.length) !== this.corruptImage) {
				this.imageCenter.src = this.corruptImage;
				return;
			}
		} else if (side === 'right') {
			src = this.imageRight.src;
			if (src.substring(src.length - this.corruptImage.length) !== this.corruptImage) {
				this.imageRight.src = this.corruptImage;
				return;
			}
		} else if (side === 'left') {
			src = this.imageLeft.src;
			if (src.substring(src.length - this.corruptImage.length) !== this.corruptImage) {
				this.imageLeft.src = this.corruptImage;
				return;
			}
		}
	},

	/** @private */
	_alignCenterImage : function()
	{
		this.zoomBase = this._calculateBaseZoom(this.imageCenter);
		this.zoomMax = this._calculateMaxZoom(this.imageCenter);
		this.zoomInitial = this._calculateInitialZoom(this.imageCenter);
		this.zoomLevel = this.zoomInitial;
		this.panY = (this.canvasElement.height -
				(this.imageCenter.height * this.zoomLevel)) / 2;
		this.panX = (this.canvasElement.width -
				(this.imageCenter.width * this.zoomLevel)) / 2;
	},

	_getFocus : function(pan, viewSize, imageSize)
	{
		return ((viewSize / 2) - pan) / (this.zoomLevel * imageSize);
	},

	/** @private */
	_highResImageLoaded : function(event, retry)
	{
		if (this.originalCenterUrl != this.originalHighResUrl)
		{
			return;
		}

		Mojo.Log.info("High Res image done loading! " +
							this.imageHighRes.src);

		var oldFocusX = this._getFocus(	this.panX,
						this.canvasElement.width,
						this.imageCenter.width);
		var oldFocusY = this._getFocus(	this.panY,
						this.canvasElement.height,
						this.imageCenter.height);
		var zoomPercent;
		if (this.isZoomed) {
			var zoomRange = this.zoomMax - this.zoomBase;
			if (zoomRange !== 0)
			{
				zoomPercent = (this.zoomLevel - this.zoomBase) /
						(this.zoomMax - this.zoomBase);
			}
			else
			{
				zoomPercent = 0;
			}
		}

		this.zoomInitial = this._calculateInitialZoom(
							this.imageHighRes);
		this.zoomBase = this._calculateBaseZoom(this.imageHighRes);
		this.zoomMax = this._calculateMaxZoom(this.imageHighRes);
		if (this.isZoomed) {
			this.zoomLevel = this.zoomBase +
					(zoomPercent * (this.zoomMax - this.zoomBase));
		} else {
			this.zoomLevel = this.zoomInitial;
		}
		this.panY = (this.canvasElement.height / 2) -
			(oldFocusY * this.imageHighRes.height * this.zoomLevel);
		this.panX = (this.canvasElement.width / 2) -
			(oldFocusX * this.imageHighRes.width * this.zoomLevel);

		this.imageCenter = this.imageHighRes;

		this.imageHighRes = this._newImage();

		// after making a new high res to avoid reset the src
		// on the imageCenter
		this._resetHighResImage();

		// bind center to prepare for new UrlProvided.
		this._bindCenter();

		Mojo.Log.info("Render via highres image loaded.");
		this._render();
	},

	/** @private */
	_centerImageLoaded : function(event, retry)
	{
		var src = this.imageCenter.src;
		Mojo.Log.info("Center Image done loading! " +
							this.imageCenter.src);
		this.centerImageExists = true;
		this._alignCenterImage();
		Mojo.Log.info("Render via center image loaded.");
		this._render();
		
		if (src.substring(src.length - this.corruptImage.length) !== this.corruptImage) {
			this._scheduleHighResTimer();
			Mojo.Event.send(this.element, Mojo.Event.imageViewChanged,
				{url : this.originalCenterUrl, error : false});
		} else {
			Mojo.Event.send(this.element, Mojo.Event.imageViewChanged,
				{url : this.originalCenterUrl, error : true});
		}
		
	},

	_scheduleHighResTimer : function()
	{
		this._clearHighResTimeout();
		this.originalHighResUrl = this.originalCenterUrl;
		if (this.noExtractFS)
		{
			return;
		}
		Mojo.Log.info("Scheduling high res for", this.originalHighResUrl);
		this.highResolutionTimer =
			this._applyHighResExtractFSParams.bind(this)
			.delay(this.highResolutionLoadTimeoutSetting,
				this.imageHighRes, this.originalHighResUrl);
	},

	/** @private */
	_calculateMaxZoom : function(img)
	{
		if (this.limitZoom)
		{
			return 1.0;
		}

		// fit inside, but works because decode res is the same w/h
		if (img.width > img.height)
		{
			// wider image than tall
			return this.targetDecodeResolution / img.width;
		}
		else
		{
			// taller than wide
			return this.targetDecodeResolution / img.height;
		}
	},

	_capZoom : function(desiredZoom)
	{
		if (this.limitZoom)
		{
			return Math.min(1.0, desiredZoom);
		}
		else
		{
			return desiredZoom;
		}
	},

	/** @private */
	_calculateBaseZoom : function(img)
	{
		// fit inside algorithm.
		var canvasRatio = this.canvasElement.width /
					this.canvasElement.height;
		var imageRatio = img.width / img.height;

		var desiredZoom;

		if (imageRatio > canvasRatio)
		{
			// wider image than canvas wide ratio
			desiredZoom = this.canvasElement.width / img.width;
		}
		else
		{
			// taller than canvas tall ratio
			desiredZoom = this.canvasElement.height / img.height;
		}

		return this._capZoom(desiredZoom);
	},

	/** @private */
	_calculateInitialZoom : function(img)
	{
		var zoom = this._calculateBaseZoom(img);

		var imgWidth = zoom * img.width;
		var imgHeight = zoom * img.height;

		var thresholdWidth = (this.defaultZoomThreshold * imgWidth)/100;
		var thresholdHeight = (this.defaultZoomThreshold * imgHeight)/100;

		var targetWidth = this.canvasElement.width;
		var targetHeight = this.canvasElement.height;

		var diffWidth = targetWidth - imgWidth;
		var diffHeight = targetHeight - imgHeight;

		if (diffWidth >= 1 && diffWidth <= thresholdWidth)
		{
			zoom = targetWidth / img.width;
		}

		if (diffHeight >= 1 && diffHeight <= thresholdHeight)
		{
			zoom = targetHeight / img.height;
		}

		return this._capZoom(zoom);
	},

	/** @private */
	_scheduleSame : function(x, y, dragging)
	{
		if (x == this.panX && y == this.panY)
		{
		//	Mojo.Log.info("same x,y, not doing new schedule same.");
		//	return;
		}

		if (!this.inSameTransition)
		{
			this.inSameTransition = true;
			this.animationQueue.add(this);
		}

		this.transitionStep = 0;

		if (dragging)
		{
			this.transitionSteps = 8;
		}
		else
		{
			this.transitionSteps = 20;
		}
		this.dragStartPanX = this.panX;
		this.dragStartPanY = this.panY;
		this.dragTargetPanX = x;

		if ((this.zoomLevel && this.zoomInitial &&
			this.zoomLevel > this.zoomInitial + 0.01) ||
			this.panInsetY)
		{
			this.dragTargetPanY = y;
		}
		else
		{
			this.dragTargetPanY =
				(this.canvasElement.height -
				(this.imageCenter.height * this.zoomLevel))/2;
		}
	},

	/** @private */
	animate : function(value)
	{
		if (this.inSameTransition)
		{
			this.transitionStep += 1;
			this.panX = this._calculateWithDecay(
							this.dragStartPanX,
							this.dragTargetPanX,
							this.transitionStep,
							this.transitionSteps);
			this.panY = this._calculateWithDecay(
							this.dragStartPanY,
							this.dragTargetPanY,
							this.transitionStep,
							this.transitionSteps);

			if (this.transitionStep >= this.transitionSteps)
			{
				Mojo.Log.info("ending same trans.");
				this._endSame();
			}
			this._render();
		}
		else if (this.inGesture)
		{
			// else, we're in a zoom gesture.
			// half decay the target zoom level from gesture.
			var decayedZoom = this.zoomLevel;
			if (decayedZoom != this.gestureZoomLevel)
			{
				decayedZoom +=
					(this.gestureZoomLevel - decayedZoom)/2;
			}

/*
	 * this.zoomFocusX/Y, floating point 0,1 of center of image
	 * this.zoomStart, floating point of zoomlevel to start at
	 * this.zoomTarget, floating point of zoomlevel to end at
	 * value, to be an integer multiple of zoomlevel * zoomConstant
	 * this.zoomStartPanX/Y, int starting pan of zoom transition
	 */
			this.zoomTarget = decayedZoom;
			this._animateZoom(decayedZoom * this.zoomConstant);
		}
		else
		{
			Mojo.Log.info("In animation queue for unknown reasons.");
			this.animationQueue.remove(this);
		}
	},

	/** @private */
	_endSame : function()
	{
		if (this.inSameTransition)
		{
			/*Mojo.Log.info(" end with target: " + this.dragTargetPanX +

					"," + this.dragTargetPanY + " and pan" +
					this.panX + "," + this.panY);
					*/

			this.animationQueue.remove(this);
			this.inSameTransition = false;
		}
	},

	/** @private */
	_storeZoomFocus : function(x, y)
	{
		var realX = x || (this.canvasElement.width / 2);
		var realY = y || (this.canvasElement.height / 2);

		var currentWidth = this.imageCenter.width * this.zoomLevel;
		var currentHeight = this.imageCenter.height * this.zoomLevel;

		var pixFocusX = realX - this.panX;
		var pixFocusY = realY - this.panY;

		realX = Math.max(0, Math.min(realX, currentWidth));
		realY = Math.max(0, Math.min(realY, currentHeight));

		this.zoomFocusX = pixFocusX / currentWidth;
		this.zoomFocusY = pixFocusY / currentHeight;
	},

	/** @private */
	_scheduleZoom : function(target, targetX, targetY)
	{
		if (this.inNextFlickTransition)
		{
			Mojo.Log.info("Ignoring zoom transition while in " +
					"next flick");
			return false;
		}

		if (this.inSameTransition)
		{
			Mojo.Log.info("Stopping same transition for a zoom.");
			this._endSame();
		}

		var zoomTarget;
		if (target > this.zoomMax)
		{
			zoomTarget = this.zoomMax;
		}
		else if (target < this.zoomBase)
		{
			zoomTarget = this.zoomBase;
		}
		else
		{
			zoomTarget = target;
		}

		if (zoomTarget == this.zoomLevel)
		{
			return;
		}

		if (this.inZoomTransition)
		{
			Mojo.Log.info("Already in zoom transition.");
			return false;
		}

		this.inZoomTransition = true;

		this.zoomStart = this.zoomLevel;
		this.zoomTarget = zoomTarget;
		var isZoomed = this.zoomTarget > this.zoomStart;

		this._storeZoomFocus(targetX, targetY);

		this.zoomStartPanX = this.panX;
		this.zoomStartPanY = this.panY;

		var options = {};
		options.onComplete = this._completeZoom.bind(this, isZoomed);
		options.reverse = false;
		options.curve = "ease-in-out";
		options.from = this.zoomLevel * this.zoomConstant;
		options.to = this.zoomTarget * this.zoomConstant;
		options.duration = this.zoomTargetTime;
		this.animator = Mojo.Animation.animateValue(
					this.animationQueue,
					'bezier',
					this._animateZoom.bind(this), 
					options);

		return true;
	},

	/** @private */
	/* depends upon
	 * this.zoomFocusX/Y, floating point 0,1 of center of image
	 * this.zoomStart, floating point of zoomlevel to start at
	 * this.zoomTarget, floating point of zoomlevel to end at
	 * value, to be an integer multiple of zoomlevel * zoomConstant
	 * this.zoomStartPanX/Y, int starting pan of zoom transition
	 */
	_animateZoom : function(value)
	{
	/*
		Mojo.Log.info("zoomFocusX: " + this.zoomFocusX);
		Mojo.Log.info("zoomTarget: " + this.zoomTarget);
		Mojo.Log.info("zoomStart: " + this.zoomStart);
		*/

		if (this.zoomTarget == this.zoomStart)
		{
			return;
		}

		var targetFocusPixX = this.zoomFocusX *
				(this.imageCenter.width * this.zoomTarget);
		var targetFocusPanX = this._boundX(
					-(targetFocusPixX -
						(this.canvasElement.width/2)),
					this.zoomTarget);

		var targetFocusPixY = this.zoomFocusY *
				(this.imageCenter.height * this.zoomTarget);
		var targetFocusPanY = this._boundY(
					-(targetFocusPixY -
						(this.canvasElement.height/2)),
					this.zoomTarget);

		this.zoomLevel = value / this.zoomConstant;

		var zoomPercent = (this.zoomLevel - this.zoomStart) /
					(this.zoomTarget - this.zoomStart);
		
		this.panX = this.zoomStartPanX +
				((targetFocusPanX - this.zoomStartPanX) *
					zoomPercent);

		this.panY = this.zoomStartPanY +
				((targetFocusPanY - this.zoomStartPanY) *
					zoomPercent);

		this._render();
	},

	/** @private */
	_completeZoom : function(isZoomed, element, cancelled)
	{
		this.isZoomed = isZoomed;
		this.inZoomTransition = false;
	},

	_clearHighResTimeout: function() {
		if (this.highResolutionTimer) {
			this.controller.window.clearTimeout(
				this.highResolutionTimer);
			this.highResolutionTimer = undefined;
		}
	},

	_resetHighResImage: function() {
		// Clear any high res image we might already be loading
		this.imageHighRes.src = null;
		this.imageHighRes.onload = null;
		this.imageHighRes.onerror = null;
		// setup again
		this.imageHighRes = this._newImage();
		this._bindHighRes();
		delete this.originalHighResUrl;
	},

	/** @private */
	_scheduleNextFlick : function(go_left, fastCurve)
	{
		if (this.allowExperimentalSwitch) {
			if (go_left) {
				if (!this.originalLeftUrl) {
					Mojo.Log.info("Going left return false.");
					return false;
				}
			} else {
				if (!this.originalRightUrl) {
					Mojo.Log.info("Going right return false.");
					return false;
				}
			}
		} else {
			if (go_left && !this.leftImageExists) {
				Mojo.Log.info("Going left return false.");
				return false;
			}
	 
			if (!go_left && !this.rightImageExists) {
				Mojo.Log.info("Going right return false.");
				return false;
			}
		}

		if (this.inNextFlickTransition)
		{
			Mojo.Log.info("Already in flick next transition.");
			return false;
		}

		this._clearHighResTimeout();
		this._resetHighResImage();
		
		this._clearOverscrollTimeout();
		this.inNextFlickTransition = true;

		if (this.inSameTransition)
		{
			Mojo.Log.info("Stopping same transition for a zoom.");
			this._endSame();
		}

		if (this.inGesture)
		{
			this.animationQueue.remove(this);
			this.inGesture = false;
		}

		var curve = "ease-in-out";
		if (fastCurve)
		{
			curve = "ease";
		}

		this.flickDirectionLeft = go_left;

		var flickTarget;

		var middleWidth = this.imageCenter.width * this.zoomLevel;
		var gutter = this._calculateGutterWidth();
		var leftWidth = this.imageLeft.width * this.zoomLeft;
		var rightWidth = this.imageRight.width * this.zoomRight;

		if (go_left)
		{
			if (leftWidth < this.canvasElement.width)
			{
				flickTarget = this.canvasElement.width;
			}
			else
			{
				flickTarget = this.canvasElement.width +
					this._calculateGutterWidth(leftWidth);
			}
		}
		else
		{
			if (rightWidth < this.canvasElement.width)
			{
				flickTarget = -middleWidth;
			}
			else
			{
				flickTarget = -(middleWidth + gutter);
			}
		}

		var options = {};
		options.onComplete = this._completeNextFlick.bind(this);
		options.reverse = false;
		options.curve = curve;
		options.from = this.panX;
		options.to = flickTarget;
		options.duration = this.flickTargetTime;

		this.animatorFlickNext =
			Mojo.Animation.animateValue(
				this.animationQueue,
				'bezier',
				this._animateNextFlick.bind(this),
				options);


		// the animation for the incoming center image.
		this.panXLeftCustom = undefined;
		this.panXRightCustom = undefined;

		var nextOptions = {};
		nextOptions.reverse = false;
		nextOptions.curve = options.curve;
		nextOptions.duration = this.flickTargetTime;

		if (go_left)
		{

			nextOptions.from = this.panX - (leftWidth + gutter);
			nextOptions.to =
				(this.canvasElement.width - leftWidth) / 2;

			this.animatorFlickNext =
				Mojo.Animation.animateValue(
					this.animationQueue,
					'bezier',
					this._animateLeftFlick.bind(this),
					nextOptions);
		}
		else
		{
			nextOptions.from = this.panX + middleWidth +
						this._calculateGutterWidth();
			nextOptions.to =
				(this.canvasElement.width - rightWidth) / 2;

			this.animatorFlickNext =
				Mojo.Animation.animateValue(
					this.animationQueue,
					'bezier',
					this._animateRightFlick.bind(this),
					nextOptions);
		}

		return true;
	},

	/** @private */
	_animateNextFlick : function(value)
	{
		this.panX = value;
		this._render(this.panXLeftCustom, this.panXRightCustom);
	},

	/** @private */
	_animateLeftFlick : function(value)
	{
		this.panXLeftCustom = value;
	},

	/** @private */
	_animateRightFlick : function(value)
	{
		this.panXRightCustom = value;
	},

	_bindCenter : function()
	{
		var centerImageFailed = this._recoverFromFailedImage.bind(this, 'center');
		this.imageCenter.onload = this._centerImageLoaded.bind(this);
		this.imageCenter.onabort = centerImageFailed;
		this.imageCenter.onerror = centerImageFailed;
	},

	_bindHighRes : function()
	{
		var highResFailed = this._highResImageLoaded.bind(this);
		this.imageHighRes.onload = highResFailed;
		this.imageHighRes.onabort = highResFailed;
		this.imageHighRes.onerror = highResFailed;
	},

	_bindLoads : function()
	{
		var imageRightError =  this._recoverFromFailedImage.bind(this, 'right');
		var imageLeftError =  this._recoverFromFailedImage.bind(this, 'left');
		
		this._bindHighRes();
		this._bindCenter();
		
		this.imageRight.onload  = this._rightImageLoaded.bind(this);
		this.imageRight.onabort = imageRightError;
		this.imageRight.onerror = imageRightError;

		this.imageLeft.onload  = this._leftImageLoaded.bind(this);
		this.imageLeft.onabort = imageLeftError;
		this.imageLeft.onerror = imageLeftError;
	},

	/** @private */
	_completeNextFlick : function(element, cancelled)
	{
		Mojo.Log.info("complete next flick");

		this._clearOverscrollTimeout();
		this.resetOffsetY = 0;
		this.resetOffsetX = 0;

		// fake the center image loading so we can figure out
		// our zoom params and other nonsense.
		this.centerImageExists = false;
		this.leftImageExists = false;
		this.rightImageExists = false;

		if (this.flickDirectionLeft)
		{
			this.imageRight = this.imageCenter;
			this.originalRightUrl = this.originalCenterUrl;
			this.imageCenter = this.imageLeft;
			this.originalCenterUrl = this.originalLeftUrl;
			this.imageLeft = this._newImage();
			delete this.originalLeftUrl;

			this._bindLoads();

			this._centerImageLoaded();
			this._rightImageLoaded();

			this.onLeftFunction();
		}
		else
		{
			this.imageLeft = this.imageCenter;
			this.originalLeftUrl = this.originalCenterUrl;
			this.imageCenter = this.imageRight;
			this.originalCenterUrl = this.originalRightUrl;
			this.imageRight = this._newImage();
			delete this.originalRightUrl;

			this._bindLoads();

			this._centerImageLoaded();
			this._leftImageLoaded();

			this.onRightFunction();
		}

		this.zoomTarget = this.zoomLevel;
		
		this.panXLeftCustom = undefined;
		this.panXRightCustom = undefined;

		this.inNextFlickTransition = false;
	},

	/** @private */
	_calculateWithDecay : function(start, stop, step, total)
	{
		var diff = stop - start;

		if (diff === 0 || step >= total)
		{
			return stop;
		}

		var percent = step / total;
		var onePixelTarget = Math.log(Math.abs(diff)); 

		return Math.round((stop - (diff *
			(1 / Math.pow(Math.E, onePixelTarget * percent)))));
	},

	/** @private */
	_dragStartHandler : function(event)
	{
		if (!this.centerImageExists)
		{
			Mojo.Log.info("No center image to handle gesture!");
			return;
		}

		if (this.inGesture || this.inNextFlickTransition)
		{
			return;
		}

		this._scheduleOverscrollTimeout();

		Mojo.Log.info("Drag start ...");

		this.inSameFromFlick = false;

		this.inDrag = true;
		this.imageDragStart = this.imageCenter.src;
		this.dragDownPanX = this.panX;
		this.dragDownPanY = this.panY;
		this.resetOffsetX = 0;
		this.resetOffsetY = 0;

		this.lastDragNewX = 0;
		this.lastDragNewY = 0;

		// work around for bug 33049
		this.dragDownClientX = event.down.clientX;
		this.dragDownClientY = event.down.clientY;
		event.stop();

		return Mojo.Gesture.CONSUMED_EVENT;
	},

	/** @private */
	_draggingWrap : function(diffX, diffY, ending)
	{
		var newX = this.dragDownPanX;
		var newY = this.dragDownPanY;

		if (ending)
		{
			newX += this.lastDiffX || 0;
			newY += this.lastDiffY || 0;

			// see if we peeked so far, we roll to the next image
			var middleWidth = this.imageCenter.width *
							this.zoomLevel;
			var snapPixels = this.canvasElement.width *
							this.dragSnapThreshold;
			if (newX > snapPixels)
			{
				Mojo.Log.info("go to the left", newX, snapPixels, middleWidth);
				if (!this._scheduleNextFlick(true))
				{
					this._scheduleOverscrollTimeout();
				}
			}
			else if (newX < -(middleWidth - (this.canvasElement.width - snapPixels)))
			{
				Mojo.Log.info("go to the right", newX, snapPixels, middleWidth);
				if (!this._scheduleNextFlick(false))
				{
					this._scheduleOverscrollTimeout();
				}
			}
			else
			{
				Mojo.Log.info("stay the same: " + (this.imageCenter.width * this.zoomLevel));
				Mojo.Log.info("staying zoom: " + this.zoomLevel);
				Mojo.Log.info("staying width: " + this.imageCenter.width);
				this._scheduleOverscrollTimeout();
			}
		}
		else
		{
			newX += diffX;
			newY += diffY;
			this.lastDiffX = diffX;
			this.lastDiffY = diffY;
			delete this.scheduledReturn;
			this._scheduleSame(newX, newY, true);
			if (Math.abs(this.lastDragNewX - newX) > 2 ||
				Math.abs(this.lastDragNewY - newY) > 2)
			{
				this.lastDragNewX = newX;
				this.lastDragNewY = newY;
				this._scheduleOverscrollTimeout();				
			}
		}

		this.controller.window.event.stop();

		return Mojo.Gesture.CONSUMED_EVENT;
	},

	/** @private */
	_overscrollTimeout : function(event)
	{
		var overscrollX = this.panX - this._boundX(this.panX);
		var overscrollY = this.panY - this._boundY(this.panY);

		this._clearOverscrollTimeout();

		if (this.scheduledReturn)
		{
			if (!overscrollX && !overscrollY)
			{
				delete this.scheduledReturn;
			}

			Mojo.Log.info("overscroll...", overscrollX, overscrollY);

			this._scheduleOverscrollTimeout();
			Mojo.Log.info("Scheduled return in prog.");
			return;
		}

		if (!this.inDrag)
		{
			// no longer in drag, stop scheduling.
			if (!overscrollX && !overscrollY)
			{
				return;
			}

			Mojo.Log.info("Not in drag overscroll timer..");
			this._scheduleSame(
				this._boundX(this.panX),
				this._boundY(this.panY), false);
			return;
		}
		
		Mojo.Log.info("regular drag overscroll timer..");

		this.resetOffsetY = overscrollY;
		this.dragDownPanY -= this.resetOffsetY;

		var potentialX = this.panX;

		if ((overscrollX > 0 && !this.leftImageExists) ||
			(overscrollX < 0 && !this.rightImageExists))
		{
			this.resetOffsetX = overscrollX;
			this.dragDownPanX -= this.resetOffsetX;
			potentialX = this._boundX(this.panX);
		}

		if (!this.scheduledReturn &&
			(potentialX != this.panX) || overscrollY)
		{
			Mojo.Log.info("Scheduling return.");
			this.scheduledReturn = true;
			this._scheduleSame(
				potentialX, this._boundY(this.panY), false);
		}

		this._scheduleOverscrollTimeout();
	},

	/** @private */
	_clearOverscrollTimeout : function()
	{
		if (!this.overscrollTimer)
		{
			return;
		}

		this.controller.window.clearTimeout(this.overscrollTimer);
		delete this.overscrollTimer;
	},

	/** @private */
	_scheduleOverscrollTimeout : function()
	{
		this._clearOverscrollTimeout();
		this.overscrollTimer = this.controller.window.setTimeout(
			this._overscrollTimeout,
			250);//Mojo.Widget.Scroller.CORRECT_OVERSCROLL_TIME_MS);
	},

	/** @private */
	_draggingHandler : function(event)
	{
		if (this.inGesture || !this.inDrag || this.inNextFlickTransition)
		{
			return;
		}
		return this._draggingWrap(
				event.move.clientX - event.down.clientX,
				event.move.clientY - event.down.clientY);
	},

	/** @private */
	_dragEndHandler : function(event)
	{
		Mojo.Log.info("Drag end...");

		if (this.inGesture || !this.inDrag ||
						this.inNextFlickTransition)
		{
			this.inDrag = false;
			return;
		}

		this.inDrag = false;
		
		if (!this.inSameFromFlick)
		{
			var diffX = event.up.clientX - this.dragDownClientX;
			var diffY = event.up.clientY - this.dragDownClientY;
			
			return this._draggingWrap(diffX, diffY, true);
		}
	},

	/** @private */
	_gestureStart : function(event)
	{
		if (!this.centerImageExists)
		{
			Mojo.Log.info("No center image to handle gesture!");
			return;
		}

		if (this.inSameTransition)
		{
			Mojo.Log.info("Stopping same transition for a zoom.");
			this._endSame();
		}

		this.inGesture = true;
		this.gestureStartZoomLevel = this.zoomLevel;
		this.gestureZoomLevel = this.gestureStartZoomLevel;

		this.zoomStartPanX = this.panX;
		this.zoomStartPanY = this.panY;
		this.zoomStart = this.gestureStartZoomLevel;

		Mojo.Log.info("event xy: " + event.pointerX());
		Mojo.Log.info("event xy: " + event.pointerY());

		// TODO: not working yet..
		//should center these around pinch...
		this._storeZoomFocus();

		this.animationQueue.add(this);

		event.stop();

		return Mojo.Gesture.CONSUMED_EVENT;
	},

	/** @private */
	_gestureChange : function(event)
	{
		if (this.inSameTransition || !this.inGesture)
		{
			return Mojo.Gesture.CONSUMED_EVENT;
		}
		// takes too long
		//this._scheduleZoom(this.gestureStartZoomLevel * event.scale);
		//
		// does not offset x/y right
		//this.zoomLevel = this.gestureStartZoomLevel * event.scale;

		var zoomTarget = this.gestureStartZoomLevel * event.scale;
		if (zoomTarget > this.zoomMax)
		{
			zoomTarget = this.zoomMax;
		}
		else if (zoomTarget < this.zoomBase)
		{
			zoomTarget = this.zoomBase;
		}

		if (zoomTarget == this.zoomLevel)
		{
			return;
		}
		this.gestureZoomLevel = zoomTarget;

		// TODO: add in rotation

		event.stop();

		return Mojo.Gesture.CONSUMED_EVENT;
	},

	/** @private */
	_gestureEnd : function(event)
	{
		if (this.inSameTransition || !this.inGesture)
		{
			return Mojo.Gesture.CONSUMED_EVENT;
		}

		this.animationQueue.remove(this);
		this.inGesture = false;

		event.stop();

		return Mojo.Gesture.CONSUMED_EVENT;
	},

	/** @private */
	_tapHandler : function(event)
	{
		if (!this.centerImageExists)
		{
			Mojo.Log.info("No center image to handle tap!");
			return;
		}

		if (event.count >= 2)
		{
			if (this.zoomLevel > (this.zoomBase +
					((this.zoomMax - this.zoomBase)/2)))
			{
				this._scheduleZoom(this.zoomInitial);
			}
			else
			{
				// should center these around the tap
				this._scheduleZoom(	this.zoomMax,
							event.down.clientX,
							event.down.clientY);
			}
			event.stop();
		}
	},

	/** @private */
	_zoomLessThanEqualToInitial : function()
	{
		return (this.zoomInitial >= (this.zoomLevel - 0.01));
	},

	/** @private */
	_calculateFlickTarget : function(start, velocity)
	{
		return start +
			(velocity * (this.flickScale / this.sameTargetTime));
	},

	/** @private */
	_flickHandler : function(event)
	{
		if (!this.centerImageExists)
		{
			Mojo.Log.info("No center image to handle flick!");
			return;
		}

		var centerWidth = this.imageCenter.width * this.zoomLevel;
		var centerHeight = this.imageCenter.height * this.zoomLevel;
		var pixelThreshold = 5;

		Mojo.Log.info("Velocity: " + event.velocity.x);
		Mojo.Log.info("panx " + this.panX);
		Mojo.Log.info("Center wid " + centerWidth);
		Mojo.Log.info("canvas width: " + this.canvasElement.width);

		if (Math.abs(event.velocity.y) > Math.abs(event.velocity.x) &&
			centerHeight <= this.canvasElement.height)
		{
			// was a vertical flick on a zoomed out image.
			Mojo.Log.info("Dropping flick because of y velocity.");
		}
		else if (event.velocity.x > 0 &&
			(this.panX >= -pixelThreshold ||
				this._zoomLessThanEqualToInitial()))
		{
			if (!this._scheduleNextFlick(true, true))
			{
				this._scheduleOverscrollTimeout();
			}
			event.stop();
		}
		else if (event.velocity.x < 0 &&
			((this.panX + centerWidth) <=
				(this.canvasElement.width + pixelThreshold) ||
				this._zoomLessThanEqualToInitial()))
		{
			if (!this._scheduleNextFlick(false, true))
			{
				this._scheduleOverscrollTimeout();
			}
			event.stop();
		}
		else
		{
			var newX = this._boundX(this._calculateFlickTarget(
						this.panX, event.velocity.x));
			var newY = this._boundY(this._calculateFlickTarget(
						this.panY, event.velocity.y));
			Mojo.Log.info("target: " + newX + "," + newY +
				" current: " + this.panX + "," + this.panY);

			this.inSameFromFlick = true;
			this._scheduleSame(newX, newY, false);

			this._scheduleOverscrollTimeout();

			event.stop();
		}
	},

	_adjustToSize : function()
	{
		var dim = Element.getDimensions(this.element);
		this.canvasElement.height = dim.height;
		this.canvasElement.width = dim.width;
	},

	manualSize : function(width, height)
	{
		var needRender = false;

		if (	width == this.canvasElement.width &&
			height == this.canvasElement.height)
		{
			return;
		}

		this.inGesture = false;
		this.inDrag = false;
		this.inSameTransition = false;
		this._endSame();

		this.canvasElement.height = height;
		this.canvasElement.width = width;

		if (this.originalCenterUrl)
		{
			if (this.centerImageExists)
			{
				needRender = true;
				this._alignCenterImage();
				this._scheduleHighResTimer();
			}
			else
			{
				this.imageCenter.src = this._getMediumResUrl(
							this.originalCenterUrl);
			}
		}
		if (this.originalLeftUrl)
		{
			if (this.leftImageExists)
			{
				needRender = true;
				this.zoomLeft = this._calculateInitialZoom(
								this.imageLeft);
			}
			else
			{
				this.imageLeft.src = this._getMediumResUrl(
							this.originalLeftUrl);
			}
		}
		if (this.originalRightUrl)
		{
			if (this.rightImageExists)
			{
				needRender = true;
				this.zoomRight = this._calculateInitialZoom(
							this.imageRight);
			}
			else
			{
				this.imageRight.src = this._getMediumResUrl(
							this.originalRightUrl);
			}
		}

		if (needRender)
		{
			this._render();
		}
	},

	_resizeHandler : function(event)
	{
		Mojo.Log.info("resize event!: " + Object.keys(event));
		Mojo.Log.info("width!: " + this.element.clientWidth);
		Mojo.Log.info("height !: " + this.element.clientHeight);
		Mojo.Log.info("autoSize!:", this.autoSize);
		if (this.autoSize) {
			var orientation = this.controller.stageController.getWindowOrientation();
			var portrait = orientation === 'up' || orientation === 'down';
			this.manualSize(
				portrait ? this.element.clientWidth : this.element.clientHeight,
				portrait ? this.element.clientHeight : this.element.clientWidth);
		}
	}

});

