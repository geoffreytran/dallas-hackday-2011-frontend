/**
 * @name widget_spinner.js
 * @fileOverview This file defines a Spinner control; 
 * See {@link Mojo.Widget.Spinner} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/
/**
#### Overview ####

The spinner widget provides all scrolling behavior. One is installed automatically in every scene 
(you can disable this behavior by having a truthy value in the disableSceneSpinner property in 
the scene arguments to pushScene and you can have any number of additional spinners anywhere 
in the DOM.

If you just need show that activity is taking place, use the Spinner. The framework uses it as 
part of the activity button type, and you'll see it in many of the core applications. There are 
two sizes, the large Spinner is 128 pixels wide (and high) and the small Spinner is 32 pixels. 
These metrics are for the Pre screen and may vary on other devices but the proportions and fit 
within the UI will be maintained. All attribute properties are optional, but the spinnerSize is 
commonly used; set it to "large", the default, or "small". To start the Spinner, set its model 
property (default name is 'spinning') to true; to stop it, set the property to false.


#### Declaration ####

		<div x-mojo-element="Spinner" id="spinnerId" class="spinnerClass" name="spinnerName"></div>
	    

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element	Required	Spinner			Declares the widget as type 'Spinner' 
	    id				Required	Any String		Identifies the widget element for use when instantiating or rendering
	    class			Optional	Any String		Spinner uses the .palm-spinner-container by default but you override this setting
	    name			Optional	Any String		Add a unique name to the spinner widget; generally used in templates when used 


#### Events ####

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		None

#### Instantiation ####
    
		this.controller.setupWidget("spinnerId",
		     this.attributes = {
		         spinnerSize: "large"
		     },
		     this.model = {
		         spinning: false 
		     });


#### Attribute Properties ####

		Attribute Property	Type			Required	Default				Description
		---------------------------------------------------------------------------------------------------------------------------------
	    property			String			Optional	spinning			DEPRECATED Name of model property for this widget instance
		modelProperty		String			Optional	spinning			Name of model property for this widget instance; default is "spinning"
	    spinnerSize			String			Optional	Mojo.Widget.spinnerSmall	Either Mojo.Widget.spinnerLarge or Mojo.Widget.spinnerSmall (small=32 or large=128)
	    superClass			String			Optional	.palm-activity-indicator	Specifies the CSS class name for the background image when you specify a custom
	    startFrameCount		Integer			Optional	None				if the spinner widget is in custom mode, this specifies the number of frames 
																			allocated to the pre-main loop animation
	    mainFrameCount		Integer			Optional	10					if the spinner widget is in custom mode, this specifies the number of frames 
																			allocated to the main loop animation
	    finalFrameCount		Integer			Optional	None				if the spinner widget is in custom mode, this specifies the number of frames 
																			allocated to the post-main loop animation
	    frameHeight			Integer			Optional	small				Explicitly sets the frame height of the animation (small=32 or large=128)
	    fps					Integer			Optional	10					Number of frames per second


#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
	    spinning			Boolean			Required	false		Spinner state, true is spinning


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		start		None			Start the spinner
		stop		None			Stop the spinner
		toggle		None			Change the spinner (spinning to not, stopped to spinning)


*/

Mojo.Widget.Spinner = Class.create({

	setupOptional: true,
	defaultModelProperty: 'spinning',
	DEFAULT_FPS: 12,
	DEFAULT_FRAMECOUNT: 12,
	DEFAULT_FRAMEHEIGHT: 32,
	LARGE_FRAMEHEIGHT: 128,
	
	initializeDefaultValues: function() {

		this.controller.attributes = this.controller.attributes || {};
		this.controller.model = this.controller.model || {};
		this.superClass = this.controller.attributes.superClass;
		this.spinningPropName = this.controller.attributes.modelProperty || this.controller.attributes.property || this.defaultModelProperty;
		this.controller.attributes.spinnerSize = this.controller.attributes.spinnerSize || Mojo.Widget.spinnerSmall;
		
		if(this.controller.attributes.mainFrameCount) {
			this.spinnerMode = 'custom';

			//explicit custom spinner.
			this.fps = this.controller.attributes.fps || this.DEFAULT_FPS;

			this.startFrameCount = this.controller.attributes.startFrameCount;
			this.mainFrameCount = this.controller.attributes.mainFrameCount;
			this.finalFrameCount = this.controller.attributes.finalFrameCount || 0;
			this.frameHeight = this.controller.attributes.frameHeight || this.DEFAULT_FRAMEHEIGHT;
			if (typeof this.frameHeight === 'string') {
				if (this.frameHeight === Mojo.Widget.spinnerLarge) {
					this.frameHeight = this.LARGE_FRAMEHEIGHT;
				} else {
					this.frameHeight = this.DEFAULT_FRAMEHEIGHT;
				}
			}
		} else {
			if(this.controller.attributes.spinnerSize === Mojo.Widget.spinnerSmall) {
				//use default small spinner settings.
				this.spinnerMode = 'defaultSmall';
				this.fps = this.DEFAULT_FPS;
				this.mainFrameCount = this.DEFAULT_FRAMECOUNT;
				this.frameHeight = this.DEFAULT_FRAMEHEIGHT;
			} else if (this.controller.attributes.spinnerSize === Mojo.Widget.spinnerLarge) {
				//use default full screen spinner settings.
				this.spinnerMode = 'defaultLarge';
				this.fps = this.DEFAULT_FPS;
				this.mainFrameCount = this.DEFAULT_FRAMECOUNT;
				this.frameHeight = this.LARGE_FRAMEHEIGHT;
			}
			this.finalFrameCount = 0;
		}

		this.drawInterval = Math.max(1, Mojo.Animation.targetFPS/ this.fps);

		this.startLastFrame = this.startFrameCount || 0;
		this.mainLastFrame = this.startLastFrame + this.mainFrameCount;
		this.finalLastFrame = this.mainLastFrame + this.finalFrameCount;

		if(this.startFrameCount) {
			this.spinnerPhase = "start";
		} else {
			this.spinnerPhase = "main";
		}
		
	},
	
	subtreeShown: function() {
		if(this.controller.model[this.spinningPropName]) {
			this.start();
		} else {
			this.stop();
		}
	},

	/** @private */
	setup : function() {
		var i;

		Mojo.assert(this.controller.element, "Mojo.Widget.Spinner requires an element");
		this.initializeDefaultValues();

		// This array is initialized here so the call to
		// setFrame in renderWidget will suceed before we
		// compute the frameOffsets
		this.frameOffset = ['0px 0px'];

		this.renderWidget();

		this.controller.exposeMethods(['start', 'stop', 'toggle']);
		this.frameIndex = 1;

		this.queue = Mojo.Animation.queueForElement(this.controller.element);
		this.frameHeight = this.frameHeight || this.controller.attributes.frameHeight || Mojo.View.getDimensions(this.controller.element).height;

		for (i = 0; i < this.finalLastFrame; i++) {
			this.frameOffset[i] = '0px ' + String(-this.frameHeight * i) + 'px';
		}

	},

	//cleanup should stop the spinner but not cause the model to be changed for the client app
	cleanup: function() {
		this.shouldStop = true;
		this.stopAnimate();
	},

	/** @private */
	renderWidget: function() {
		if (this.superClass !== undefined) {
			Element.addClassName(this.controller.element, this.superClass);
		} else {
			if (this.spinnerMode == 'defaultLarge') {
				this.controller.element.addClassName('palm-activity-indicator-large');
			} else {
				this.controller.element.addClassName('palm-activity-indicator-small');
			}
		}
		this.setFrame(1);
		Element.hide(this.controller.element);
	},

/**
 * @public
 * @description Use <code>element.mojo.start()</code> to show a spinner and <code>element.mojo.stop(elementId)</code> to stop it.
	The element timer will automatically stop once there are no longer any spinners, so you do not need to stop
	a spinner in a scene before popping the scene.<p>
	This widget is declared in the scene HTML like this:
	<fieldset><samp>
	&lt;div id="login_spinner" x-mojo-element="Spinner">&lt;/div>
	</samp></fieldset>
	<p>
 */
	start: function() {
		if(!this.isSpinning) {
			Element.show(this.controller.element);
			this.frameHeight = this.frameHeight || Mojo.View.getDimensions(this.controller.element).height;
			Mojo.require(this.frameHeight, "frame height must be defined. Is the spinner widget currently hidden?");
			
			this.shouldStop = false;
			this.spinnerPhase = "start";
			this.drawCount = 0;
			this.controller.model[this.spinningPropName] = true;
			this.isSpinning = true;
			this.queue.add(this);
			this.frameIndex = 1;
		}
	},

/**
 * @public element.mojo.stop()
 * @description Use <code>element.mojo.stop(elementId)</code> to stop a spinner and <code>element.mojo.start()</code> to start it.
	The element timer will automatically stop once there are no longer any spinners, so you do not need to stop
	a spinner in a scene before popping the scene.<p>
	This widget is declared in the scene HTML like this:
	<fieldset><samp>
	&lt;div id="login_spinner" x-mojo-element="Spinner">&lt;/div>
	</samp>	</fieldset>
	<p>
 */
	stop: function() {
		if(this.isSpinning) {
			this.controller.model[this.spinningPropName] = false;
			this.shouldStop = true;
			this.stopAnimate();
			this.spinnerPhase = "done";
		}
	},

	toggle: function() {
		if (this.isSpinning) {
			this.stop();
		} else {
			this.start();
		}
	},

	stopAnimate: function() {
		if(this.isSpinning && this.shouldStop) {
			this.isSpinning = false;
			Element.hide(this.controller.element);
			this.queue.remove(this);
		}
	},

	handleModelChanged: function() {
		if(this.controller.model[this.spinningPropName]) {
			this.start();
		} else {
			this.stop();
		}
	},

	setFrame: function(frameNum) {
		this.controller.element.style['background-position'] = this.frameOffset[frameNum - 1];
	},



	updateFrameIndex: function() {
		var overLastFrame;
		this.frameIndex++;
		overLastFrame = (this.frameIndex > this[this.spinnerPhase + "LastFrame"]);
		if(overLastFrame || (this.shouldStop && 
				     this.spinnerPhase === "main" && 
				     !this.finalFrameCount)) {
			if(this.spinnerPhase === "start") {
				if(this.shouldStop) {
					this.spinnerPhase = "final";
					this.frameIndex = this.mainLastFrame + 1;
				} else {
					this.spinnerPhase = "main";
				}
			} else if (this.spinnerPhase === "main") {
				if(this.shouldStop) {
					if(this.finalFrameCount) {
						this.spinnerPhase = "final";
					} else {
						//stopped it immediately on stop calls
						this.spinnerPhase = "done";
  					}
				} else {
					this.frameIndex = this.startLastFrame + 1;
				}
			} else if (this.spinnerPhase === "final"){
				this.stopAnimate();
				this.spinnerPhase = "done";
			}
		}
		return this.spinnerPhase;
	},


	animate: function() {
		if (this.drawCount < this.drawInterval) {
			this.drawCount++;
		} else {
			this.drawCount -= this.drawInterval;
			this.updateFrameIndex();

			if(!(this.spinnerPhase === "done")) {
				this.setFrame(this.frameIndex);
			}
		}
	}
});
