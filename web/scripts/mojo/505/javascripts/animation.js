/**
@name animation.js
@fileOverview This file holds the implementation & APIs for Mojo animation support.;
See {@link Mojo.Animation} for more info.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
@namespace
@description Holds the infrastructure for coordinating timers for multiple animations, and 
animating DOM element styles & numeric values over time.  Since the overhead associated with timers can be
significant, an animation queue allows multiple periodic tasks to be run at the standard frequency of 40 fps
while using only a single timer.

The other public methods are for animating style properties of DOM elements (visually animating elements on screen),
or generally animating numeric values over time.

@name Mojo.Animation
 */

Mojo.Animation = {};

// Animation parameters when animating with JavaScript
Mojo.Animation.kAnimationDuration = 0.1;  //the duration of both the opacity animation and the dialog movement
Mojo.Animation.kAppMenuAnimationDuration = 0.08;
Mojo.Animation.kScrimAnimationDuration = Mojo.Animation.kAppMenuAnimationDuration * 0.8;

// Animation parameters when using CSS transitions
Mojo.Animation.kCSSAnimationDuration = 0.1;
Mojo.Animation.kCSSAnimationTimingFunction =  'ease-out'; // replace with a legal css timing function
Mojo.Animation.kCSSAppMenuAnimationDuration = 0.1;
Mojo.Animation.kCSSAppMenuAnimationTimingFunction = 'ease-out'; 
Mojo.Animation.kCSSScrimAnimationDuration = 0.1;
Mojo.Animation.kCSSScrimAnimationTimingFunction = undefined; // replace with a legal css timing function

Mojo.Animation.targetFPS = 40;
Mojo.Animation.stepRate = (1/Mojo.Animation.targetFPS) * 1000;
Mojo.Animation.showFPS = false;
Mojo.Animation.showFPSUpdate = 1000;
Mojo.Animation.maxExtraFrames = 1; // never run more than N frames in one step.

Mojo.Animation.NullQueue = {add: Mojo.doNothing, remove: Mojo.doNothing};


/**
@constant 
@description An animation curve that is quick in the middle, and slow at both ends.
 */
Mojo.Animation.easeInOut = 'ease-in-out';

/**
@constant 
@description An animation curve that starts slowly, and speeds up.
 */
Mojo.Animation.easeIn = 'ease-in';

/**
@constant 
@description An animation curve that starts quickly, and slows down.
 */
Mojo.Animation.easeOut = 'ease-out';


/** @private  */
Mojo.Animation.setup = function(targetWindow) {
	targetWindow._mojoAnimationQueue = new Mojo.Animation.Queue(targetWindow);
	if (targetWindow.Mojo && targetWindow.Mojo.Animation) {
		targetWindow.Mojo.Animation.queue = targetWindow._mojoAnimationQueue;
	}
};

/** @private  */
Mojo.Animation.cleanup = function(targetWindow) {
	if (targetWindow._mojoAnimationQueue) {
		targetWindow._mojoAnimationQueue.cleanup();
	}
};

/**
	Given a DOM element, returns a reference to the appropriate animation queue to use.
*/
Mojo.Animation.queueForElement = function(element) {
	var q = Mojo.Animation.NullQueue;
	var oDoc = element.ownerDocument;
	if (oDoc) {
		var w = oDoc.defaultView;
		if (w) {
			q = w._mojoAnimationQueue;
		}
	}
	return q;
};


/**
Allows for running multiple animations using a shared timer, since
the overhead of running multiple timers is pretty high.
Mojo instantiates animation queues automatically, and applications 
are generally expected to work with the animation queue for the appropriate window,
obtained via the Mojo.Animation.queueForElement() function.
@class
 */
Mojo.Animation.Queue = Class.create(
	/**
	 * @lends Mojo.Animation.Queue
	 */
		
	{
	/** @private */
	initialize: function(targetWindow) {
		var timeNow;
		this.window = targetWindow || window;
		this.animations = [];
		this.frameTimeStamps = [];
		this.stepRate = Mojo.Animation.stepRate;
		this.nextFPSUpdate = new Date().getTime() + Mojo.Animation.showFPSUpdate;
		
		// Deprecated/legacy compatibility code, remove as soon as we can risk introducing compatibility issues.
		timeNow = Date.now();
		if (!Object.isNumber(timeNow)) {
			Mojo.Log.error("Date.now() isn't returning a number, please remove the JavaScript library date.js.");
			this._millisecondsNow = this._slowMillisecondsNow;
		}
	},

	/** @private */
	cleanup: function() {
		if (this.timer) {
		    this.window.clearInterval(this.timer);
			delete this.timer;
		}
		delete this.animations;
		delete this.window._mojoAnimationQueue;
		delete this.window;
	},

	/**
	 * Adds an 'animation' object to the queue.
	 * These objects must have an 'animate' method, which will be called repeatedly to run the animation.
	 * @param {Object} animation
	 */
	add: function(animation) {
		var index = this.animations.indexOf(animation);
		if (index === -1) {
			this.animations.push(animation);
			if (this.animations.length == 1) {
			    this.timer = this.window.setInterval(this.step.bind(this), Mojo.Animation.stepRate);
				this.frameTimeStamps = [];
				this.renderTime = this._millisecondsNow() + Mojo.Animation.stepRate;
				// Convenient logging code for measuring frame timing.
//				this.messages = ['Beginning. StepRate='+Mojo.Animation.stepRate+', rTime='+this.renderTime];
			}
		}
	},

	/**
	 * Removes the given animation object from the list, so its 'animate' method will no longer be called.
	 * @param {Object} animation
	 */
	remove: function(animation) {
		var index = this.animations.indexOf(animation);
		if (index !== -1) {
			this.animations.splice(index, 1);
			if (this.animations.length === 0) {
			    this.window.clearInterval(this.timer);
				delete this.timer;
				if (Mojo.Animation.showFPS) {
					this.reportFPS();
				}
				
				// Convenient logging code for measuring frame timing.
//				this.messages.each(Mojo.Log.error);
			}
		}
	},

	/** @private
	 * Executes one frame of the current animation queue, calling each active animation in turn
	 */
	step: function() {
		var animations, tardy, i, count;
		var framesToRun;
		
		// Run at least one frame, plus extras if we've already passed their scheduled time
		framesToRun = Math.max(0, this._millisecondsNow() - this.renderTime); // how many ms late are we?
		framesToRun /= Mojo.Animation.stepRate; // how many frames late are we?
		framesToRun = Math.floor(framesToRun + 1); // run at least one.
		framesToRun = Math.min(framesToRun, Mojo.Animation.maxExtraFrames);
		
		// Convenient logging code for measuring frame timing.
//		this.messages.push('Running '+framesToRun+' frames, now='+Date.now()+', renderTime='+ this.renderTime);		
		
		animations = this.animations;
		while(framesToRun > 0) {
			
			if (Mojo.Animation.showFPS) {
				this.frameTimeStamps.push(this._millisecondsNow());
				if (this.frameTimeStamps.length > 10) {
					this.frameTimeStamps.shift();
				}
			}
			
			// animators may remove themselves from the queue within their animate() function,
			// so we run the loop backwards to avoid skipping one.
			for (i = animations.length - 1; i >= 0; i--){
				this._invokeAnimator(animations[i], (framesToRun > 1));
			}
			
			framesToRun--;
			this.renderTime += Mojo.Animation.stepRate;	
		}
		
		// TODO: In order to help avoid sporadic skipped frames, we could allow frames to 
		// come in slightly late without a penalty, by adjusting renderTime in that case.
		// This means we wouldn't have a slight lateness slowly accumulate, resulting in an occasional eye-jarring frame skip.		
		
		if (Mojo.Animation.showFPS) {
			var now = this._millisecondsNow();
			if (this.frameTimeStamps.length > 1 && now > this.nextFPSUpdate) {
				this.window.document.getElementById('mojo-fps-display-box').innerHTML = this.reportFPS();
				this.nextFPSUpdate = this._millisecondsNow() + Mojo.Animation.showFPSUpdate;
			}
		}
	},
	
	/** @private
		Invokes a single client from the animation queue.
	*/
	_invokeAnimator: function(a, catchingUp) {
		var failed;
		
		try {
			a.animate(this, catchingUp);
		} catch (e) {
			failed = true;
			this.remove(a);
			Mojo.Log.logException(e, "exception during animation");
		}
		
		// If we had a failure and the animator has a handleError function, call it
		// so the animator can clean up any other state. The scroller uses this to
		// clean up the rest of it's scrolling state.
		if (failed && a.handleError && Object.isFunction(a.handleError)) {
			try {
				a.handleError();
			} catch (e2) {
				Mojo.Log.logException(e, "exception during animator error handler");
			}
		}
	},
	
	/**
	 * Returns the current time in miliseconds. Provided so that we can replace it
	 * when someone has screwed up Date.now()
	 * Deprecated/legacy compatibility code, remove as soon as we can risk introducing compatibility issues.
	 * @private
	 */
	_millisecondsNow: function() {
		return Date.now();
	},
	
	/**
	 * Slow version to use when someone has screwed up Date.now()
	 * Deprecated/legacy compatibility code, remove as soon as we can risk introducing compatibility issues.
	 * @private
	 */
	_slowMillisecondsNow: function() {
		return new Date().getTime();
	},
	
	/**
	 * @private
	 * need description
	 */
	reportFPS: function() {
		var delta, averageTime, fps;
		var totalTime = 0;
		var frameTimeStamps = this.frameTimeStamps;
		for (var i=1; i < frameTimeStamps.length; i++) {
			delta = frameTimeStamps[i] - frameTimeStamps[i-1];
			totalTime += delta;
		}
		averageTime = totalTime/(frameTimeStamps.length-1);
		fps = Math.round(1000/averageTime);
		return fps;
	}
});


/**
Animates a value between the two given numbers, over the given duration, calling the
given callback with the "current value" at each step of the animation.
Returns an animation object that can be used to end the animation early.

#### 'details' properties ####

		onComplete		Function to call when animation is complete. Arguments are the animated element, and a boolean 'cancelled' value.
		reverse			Boolean.  If true, the animation will be "run in reverse".
		curve			What sort of curve to use for the animation.  Defaults to linear if unspecified.
						May be the name of one of the standard curves, or an array of coordinates for the
						control points of a cubic bezier curve.  See the curve name constants in Mojo.Animation.
		from			Starting value for the number we are animating
		to				Target value for the number we are animating
		duration		How long the animation should take, in seconds
		currentValue	If specified, the animation will be "picked up" at this value between the from & to values.
						This allows partially complete animations to be cancelled and properly animated back to their starting conditions.

#### Methods ####

		cancel()		Same as complete(), but the callback is never called with the target value.
		complete()		calls the value callback one last time with the target value,
						calls onComplete function if specified,	and removes the animator from the queue.
						Called automatically at completion of animation.

@param {Object} q				The animation queue to use in order to run the animation.
@param {String} animationType	Can be linear/bezier/zeno. This determines the speed of the animation at various times.
@param {Function} callback		This function is called at each step of the animation, as the value changes.
								It takes one argument, the current value.
@param {Object} [details]		A hash containing additional information.

*/
Mojo.Animation.animateValue = function(q, animationType, callback, details) {
	return new this.ValueAnimator(q, animationType, callback, details);
};


/**
This is used to animate style properties of DOM elements.
The implementation will animate a given attribute to the given value over the given duration.
Any existing animation on the indicated node for the indicated style attribute is cancelled when the new one is applied.
The animator will override external changes made to the animated attribute while the animation is in progress.
Currently, only integer valued attributes are supported, so colors and opacity cannot be animated (except using the 
styleSetter detail property).

One difference between this animator and CSS transitions is that both a 'fromValue and a 'toValue' must be specified.
This allows us to keep the animation speed "correct" when an attribute is being animated back and forth between
two values, and we need to run the 'back' animation while the 'forth' animation is only partially complete.

#### Example Use: ####

This code is used to animate the spacers to 0 height when doing drag'n'drop reordering in lists.
Note the use of an onComplete function to remove the 0-height spacer from the DOM.

		Mojo.Animation.animateStyle(this.curDragSpacer, 'height', this.dragHeight, 0, .2, {onComplete:function(el){Element.remove(el);}});

In addition, animateValue() is used to provide underlying functionality, so its details are generally supported as well.

#### 'details' properties ####

		currentValue	Current value of the style property being animated. 
						Default is to call parseInt() on the style property.
		styleSetter		Function to call with the value to actually apply the style change.  
						Allows for setting more complex style properties like 'clip'.
		from			Starting value for the number we are animating (Passed to ValueAnimator)
		to				Target value for the number we are animating (Passed to ValueAnimator)
		duration		How long the animation should take, in seconds

@param {Object} element		the DOM element whose style should be animated.
@param {Object} attr			The name of the style attribute to be animated, using HTML DOM naming conventions.
@param {String} animationType Can be linear/bezier/zeno. This determines the speed of the animation at various times.
@param {Object} details		Various animation details as described above.  Note that most ValueAnimator details are supported as well.
 */
Mojo.Animation.animateStyle = function(element, attr, animationType, details) {
	return new this.StyleAnimator(element, attr, animationType, details);
};


/**
This is used to animate the 'clip' style property of DOM elements.
Only one side may be animated at a time.
Any existing clip animation on the indicated node is cancelled when the new one is applied,
and this generally behaves like animateStyle().

In addition, animateStyle() is used to provide underlying functionality, so it's details are generally supported as well.

#### Example Use: ####
This is used to animate the clipping rectangle for ProgressPill widgets.

		clipStyleAnimator = Mojo.Animation.animateClip(this.progressDiv, 'left', this.oldWidth, width, 0.2,
			{ clip: {top: 0, left: this.oldWidth, bottom: 12, right: 0}, curve: 'ease-in-out'});

#### Animation 'details' ####

		clip	A required hash of numbers indicating current values for clip rect. 
				The indicated side is modified as the animation progresses.

@param {Object} element			DOM element whose style should be animated.
@param {String} side			Which side to animate. top, left, bottom, or right.
@param {String} animationType	Can be linear/bezier/zeno. This determines the speed of the animation at various times.
@param {Object} details			Various animation details.  May NOT be undefined, since 'clip' is required (See above description).

 */
Mojo.Animation.animateClip = function(element, side, animationType, details) {
	return new this.ClipStyleAnimator(element, side, animationType, details);
};


/**#nocode+*/


/***************************
      StyleAnimator
 ***************************/


/** @private */
Mojo.Animation.StyleAnimator = function(element, attr, animationType, details) {
	var animator;
	var currentValue;

	// Save important arguments:
	details = details || {};
	this.details = details;
	this.element = element;
	this.attr = attr;

	// Add a hash of animators on the node, if there isn't one already.
	if(!element._mojoStyleAnimators) {
		element._mojoStyleAnimators = {};
	}

	// If an animation on this attribute already exists, cancel it:
	animator = element._mojoStyleAnimators[attr];
	if(animator) {
		animator.cancel();
	}

	// Add us to the list of transitions on this element:
	element._mojoStyleAnimators[attr] = this;


	// Find current value of this style attribute
	if(details.currentValue !== undefined) {
		currentValue = details.currentValue;
	} else {
		currentValue = parseInt(Element.getStyle(element, attr) || '0', 10);
	}

	// Decorate the details object so we can wrap any onComplete function, and add in currentValue.
	details = Mojo.Model.decorate(details, {onComplete:this.completeWrapper.bind(this), currentValue: currentValue});
	
	// We treat 'currentValue out of bounds' a bit differently than the default valueAnimator.
	// Instead, we always want to run the style animation from the current value, so we set
	// fromValue to currentValue.
	if(currentValue < Math.min(details.from, details.to) ||
			currentValue > Math.max(details.from, details.to)) {
		details.from = currentValue;
		
	}

	// Install style setter override, if provided.
	this.animateCallback = details.styleSetter || this.animateCallback.bind(this);
	var q = Mojo.Animation.queueForElement(element);
	//this.animator = Mojo.Animation.animateValue(q, fromValue, toValue, duration, this.animateCallback, details);
	this.animator = Mojo.Animation.animateValue(q, animationType, this.animateCallback, details);
};

/** @private
	Value callback that does the work of setting the element's style.
*/
Mojo.Animation.StyleAnimator.prototype.animateCallback = function(value) {
	this.element.style[this.attr] = Math.round(value)+'px';
};

/** @private
	Wrapper for ValueAnimator's onComplete.
	Removes the style animator from the element's hash, and calls any original onComplete function,
	prepending the animated element.
*/
Mojo.Animation.StyleAnimator.prototype.completeWrapper = function(cancelled) {
	this.element._mojoStyleAnimators[this.attr] = undefined;
	if(this.details.onComplete) {
		this.details.onComplete(this.element, cancelled);
	}
};

/** @private */
Mojo.Animation.StyleAnimator.prototype.cancel = function () {
	this.animator.cancel();
};


/** @private */
Mojo.Animation.StyleAnimator.prototype.complete = function() {
	this.animator.complete();
};



/***************************
       ClipAnimator
 ***************************/


/** @private */
Mojo.Animation.ClipStyleAnimator = function(element, side, animateType, details) {
	var currentValue;

	Mojo.assert(details && details.clip, "WARNING: ClipStyleAnimator: details must be defined and contain a 'clip' property.");

	this.details = details;
	this.element = element;
	this.side = side;

	currentValue = this.details.clip[side] || 0;
	details = Mojo.Model.decorate(details, {currentValue: currentValue, styleSetter:this.clipStyleSetter.bind(this)});

	this.animator = Mojo.Animation.animateStyle(element, 'clip', animateType, details);

};

/** @private */
Mojo.Animation.ClipStyleAnimator.prototype.clipStyleSetter = function(value) {
	this.details.clip[this.side] = Math.round(value);
	this.element.style.clip = 'rect('+this.details.clip.top+'px, '+this.details.clip.left+'px, '+this.details.clip.bottom+'px, '+this.details.clip.right+ 'px)';
};

/** @private */
Mojo.Animation.ClipStyleAnimator.prototype.cancel = function () {
	this.animator.cancel();
};

/** @private */
Mojo.Animation.ClipStyleAnimator.prototype.complete = function() {
	this.animator.complete();
};



/***************************
       ValueAnimator
 ***************************/

/** @private */
Mojo.Animation.ValueAnimator = function(queue, animationType, callback, details) {
	var delta = details.to - details.from;
	var newCurPos, detailsHadCurrentValue = false;

	// Save important arguments:
	this.queue = queue;
	this.details = details;
	this.callback = callback;

	Mojo.assert(typeof callback == 'function', "WARNING: ValueAnimator callback must be a function.");

	details.from = (details.from === undefined ? details.currentValue : details.from);
	if (details.currentValue === undefined) {
		if (details.reverse) {
			details.currentValue = details.to;
		} else {
			details.currentValue = details.from;			
		}
	} else {
		detailsHadCurrentValue = true;
		// if it's outside the from/to range, we basically ignore it and go from 'fromValue'.
		if(details.currentValue < Math.min(details.from, details.to) ||
		   details.currentValue > Math.max(details.from, details.to)) {
			if(details.reverse) {
				details.currentValue = details.to;
			} else {
				details.currentValue = details.from;
			}
		}
	}


	Mojo.assert(this.details.from !== undefined, "WARNING: A starting point and/or currentValue must be specified");

	// If start & end values are the same, then we're finished.
	if (delta === 0) {
		this.complete();
		return;
	}

	// Configure animation curve:

	animationType = animationType[0].toUpperCase() + animationType.substring(1);

	if(Mojo.Animation.Generator[animationType]) {
		this.valueGenerator = new Mojo.Animation.Generator[animationType](details);
	} else {
		this.valueGenerator = new Mojo.Animation.Generator.Linear(details);
	}


	// The animation is run using curPos, which goes from 0-1 (or 1-0 if reversed).
	// In order to pick up animation where we left off, we set it to match currentValue,
	// and tweak the duration.
	this.percentDone = (details.currentValue - details.from) / delta;

	if(this.valueGenerator.getTimeFromPosition) {
		this.percentDone = this.valueGenerator.getTimeFromPosition(this.percentDone);
	}

	// Adjust duration to match curPos.
	if (detailsHadCurrentValue) {
		if(details.reverse) {
			details.duration *= this.percentDone;
		} else {
			details.duration *= 1 - this.percentDone;
		}		
	}


	// Calculate animation state:
	if(this.valueGenerator.getNumberFrames) {
		this.framesRemaining = this.valueGenerator.getNumberFrames();
	} else {
		this.framesRemaining =  Math.ceil((details.duration * Mojo.Animation.targetFPS));
	}
	if(details.reverse) {
		this.stepValue = -this.percentDone/this.framesRemaining;
	} else {
		this.stepValue = (1-this.percentDone)/this.framesRemaining;
	}


	// If there are no frames to animate, complete immediately.
	// Otherwise, bind our animate function and add us to the animation queue.
	if(this.framesRemaining < 1) {
		this.complete();
	} else {
		// Bind our animation callback, and add us to the queue:
		this.animate = this.animate.bind(this);
		this.queue.add(this);
	}

};



// Performs one step of the animation.
// Incrementally modifies the target style attribute, and completes the animation if it is finished.
/** @private */
Mojo.Animation.ValueAnimator.prototype.animate = function animate(queue, catchingUp) {
	var value;

	Mojo.assert(this.framesRemaining > 0, "Mojo.Animation.ValueAnimator: animate() should never be called with no frames remaining!");

	if(this.framesRemaining > 1) {
		this.percentDone += this.stepValue;
		
		// Don't animate if this is just a "catchup frame".  Only update minimal state. 
		if(!catchingUp) {
			value = this.valueGenerator.getPositionFromTime(this.percentDone);
			if(value !== undefined) {
				this.currentPosition = value * (this.details.to-this.details.from) + this.details.from;
				try {
					this.callback(this.currentPosition);
				} catch(e) {
					Mojo.Log.error("WARNING: ValueAnimator caught exception in value callback(): "+e);
				}
			}
		}
		
		this.framesRemaining--;
	} else {
		this.complete();
	}
};


/**
End animation early, removing it from the queue and leaving the element at its current location.
 */
Mojo.Animation.ValueAnimator.prototype.cancel = function () {
	this.complete(true);
};


/**
Completes animation, immediately setting the final value for the
animated attribute, and calling the onComplete function (if any).
 */
Mojo.Animation.ValueAnimator.prototype.complete = function(cancelled) {

	// only complete once.
	if(this.completed) {
		return;
	}

	// Set attribute to final value, unless we were cancelled.
	if(!cancelled) {
		try {
			this.callback(this.details.reverse ? this.details.from : this.details.to);
		} catch(e) {
			Mojo.Log.error("WARNING: ValueAnimator caught exception in value callback(): "+e);
		}
	}

	// call onComplete func, if any.
	if(this.details.onComplete) {
		try {
			this.details.onComplete(!!cancelled);
		} catch(e2) {
			Mojo.Log.error("WARNING: ValueAnimator caught exception in onComplete(): "+e2);
		}
	}

	// clean everything up, we're done.
	this.queue.remove(this);

	this.completed = true;
};

/**
Animations for submeus
 */

/** @private */
Mojo.Animation.Submenu = {};

/** @private */
Mojo.Animation.Submenu.animate = function(popup, popupContent ,cornersFrom ,cornersTo, callback) {
	var kCSSAnimationDuration = Mojo.Animation.kCSSAnimationDuration;
	var kCSSAnimationTimingFunction = Mojo.Animation.kCSSAnimationTimingFunction;
	var animateStyleWithCSS = Mojo.Animation.animateStyleWithCSS;
	function makeDetails(property, value) {
		return {property: property, to: value + 'px', duration: kCSSAnimationDuration, timingFunction: kCSSAnimationTimingFunction};
	}
	if(Mojo.Config.animateWithCSS) {
		var details = [
			makeDetails('top', cornersTo.top),
			makeDetails('left', cornersTo.left),
			makeDetails('width', cornersTo.width)
		];
		animateStyleWithCSS(popup, details);
		animateStyleWithCSS(popupContent, makeDetails('height', cornersTo.height), callback);
	} else {
		Mojo.Animation.animateStyle(popup, 'top', 'bezier', {
					from: cornersFrom.top,
					to: cornersTo.top,
					duration: Mojo.Animation.kAnimationDuration,
					curve:'ease-out'
				}
		);
		Mojo.Animation.animateStyle(popup, 'left', 'bezier', {
					from: cornersFrom.left,
					to: cornersTo.left,
					duration: Mojo.Animation.kAnimationDuration,
					curve:'ease-out'
				}
		);
		Mojo.Animation.animateStyle(popup, 'width', 'bezier', {
					from: cornersFrom.width,
					to: cornersTo.width,
					duration: Mojo.Animation.kAnimationDuration,
					curve:'ease-out'
				}
		);
		Mojo.Animation.animateStyle(popupContent, 'height', 'bezier', {
					from: cornersFrom.height,
					to: cornersTo.height,
					duration: Mojo.Animation.kAnimationDuration,
					curve:'ease-out',
					onComplete: callback
				}
		);
	}
	
};

/** @private */
Mojo.Animation.Appmenu = {};

/** @private */
Mojo.Animation.Appmenu.animate = function(popup, fromTop, toTop, callback){
	if(Mojo.Config.animateWithCSS) {
		Mojo.Animation.animateStyleWithCSS(popup, {
					property: 'top', 
					to: toTop+"px",
					duration: Mojo.Animation.kCSSAppMenuAnimationDuration,
					timingFunction: Mojo.Animation.kCSSAppMenuAnimationTimingFunction
				},
				callback);
	} else {
		Mojo.Animation.animateStyle(popup, 'top', 'bezier', {
					from: fromTop,
					to: toTop,
					duration: Mojo.Animation.kAppMenuAnimationDuration,
					curve:'ease-out',
					onComplete:callback
				}
		);
	}
};

/**
Animations for dialogs
 */

/** @private */
Mojo.Animation.Dialog = {};

/** @private */
Mojo.Animation.Scrim = {};

/** @private */
Mojo.Animation.Scrim._opacitySetter = function(element, value) {
	element.style.opacity = value;
};

/** @private */
Mojo.Animation.Dialog.animateDialogOpen = function(box,scrim,callback){
	var animateDialog;
	var boxHeight = box.offsetHeight;
    box.style.bottom = (-boxHeight)+'px';              
	scrim.style.opacity = 0;
	//animate the submenu onto the scene
	Mojo.Animation.Scrim.animate(scrim, 0, 1, Mojo.Animation.Dialog.animateDialog.curry(box, -boxHeight, 0, Mojo.Animation.easeOut, callback));
};

/** @private */
Mojo.Animation.Dialog.animateDialogClose = function(box,scrim,callback){
	var boxHeight = box.offsetHeight;
	//animate the submenu off the scene
	Mojo.Animation.Dialog.animateDialog(box, 0, -boxHeight, Mojo.Animation.easeIn, Mojo.Animation.Scrim.animate.curry(scrim, 1, 0, callback));
};

/** @private */
Mojo.Animation.Scrim.animate = function(scrim, fromOpacity, toOpacity, callback){
	if(Mojo.Config.animateWithCSS) {
		Mojo.Animation.animateStyleWithCSS(scrim, {
					property: 'opacity', 
					to: toOpacity,
					duration: Mojo.Animation.kCSSScrimAnimationDuration,
					timingFunction: Mojo.Animation.kCSSScrimAnimationTimingFunction
				},
				callback);
	} else {
		Mojo.Animation.animateStyle(scrim, 'opacity', 'bezier', {
					from: fromOpacity,
					to: toOpacity,
					duration: Mojo.Animation.kScrimAnimationDuration,
					curve:'over-easy',
					styleSetter: Mojo.Animation.Scrim._opacitySetter.bind(this, scrim),
					onComplete: callback
				}
		);
	}
};

/** @private */
Mojo.Animation.Dialog.animateDialog = function(box, fromTop, toTop, animation, callback){
	if(Mojo.Config.animateWithCSS) {
		Mojo.Animation.animateStyleWithCSS(box, {
					property: 'bottom',
					to: toTop + "px",
					duration: Mojo.Animation.kCSSAnimationDuration,
					timingFunction: animation
				},
				callback);
	} else {
		Mojo.Animation.animateStyle(box, 'bottom', 'bezier', {
					from: fromTop,
					to: toTop,
					duration: Mojo.Animation.kAnimationDuration,
					curve: animation,
				   	onComplete: callback
				}
		);
	}
};

/**
This is used to animate style properties of DOM elements using CSS.

#### Example Use: ####

	Mojo.Animation.animateStyleWithCSS(box, {
				property: 'bottom',
				to: toTop + "px",
				duration: 0.3
			},
			callback
	);

#### 'details' properties ####

		property		css property to animate
		to				Target value for the property, as a string. For pixel values do not omit the 'px' suffix.
		duration		How long the animation should take, in seconds
		delay			CSS delay value, in seconds
		timingFunction  CSS timing function
		setToComputed	true if this value needs to be first set to it's computed value and have the transition
						deferred. This is necessary if, for example, the height property wants to be transitioned
						but it is currently set to 'auto'. For some reason, webkit won't animate that transition.

@param {Object} element			the DOM element whose style should be animated.
@param {Object|Array} details	Animation details as described above. Can be a single object or an array
								of such objects.
@param {Object} onComplete		Function to call when transition is complete. Argument is the target element.
 */

Mojo.Animation.animateStyleWithCSS = (function() {
	var error = Mojo.Log.error;
	var slowMode = false;

	function getWindow(element) {
		return element.ownerDocument.defaultView;
	}
	
	function addOptionalTerm(s, value, suffix) {
		if (value) {
			s += (" " + value);
			if (suffix) {
				s += suffix;
			}
		}
		return s;
	}
	
	function transitionString(property, duration, timingFunction, delay) {
		var s = property;
		s = addOptionalTerm(s, duration, "s");
		s = addOptionalTerm(s, timingFunction);
		s = addOptionalTerm(s, delay, "s");
		return s;
	}
	
	function animateSingleStyleWithCSS(element, details, onCompleteFunction) {
		var property = details.property;
		var toValue = details.to;
		var setToComputed = true;
		var duration = details.duration;
		if (slowMode) {
			duration *= 10;
		}
		function completionFunction() {
			element.style["-webkit-transition"] = "";
			if (onCompleteFunction) {
			 	onCompleteFunction(element);			
			}
		}
		function animateChange() {
			var ts;
			ts = transitionString(property, duration, details.timingFunction, details.delay);
			element.style["-webkit-transition"] = ts;
			element.style[property] = toValue;
			getWindow(element).setTimeout(completionFunction, duration*1000);
		}
		if (setToComputed) {
			element.style[property] = getWindow(element).getComputedStyle(element, null)[property];
			animateChange.defer();			
		} else {
			animateChange();
		}
	}
	
	function animateMultipleStylesWithCSS(element, details, onCompleteFunction) {
		var d, properties = [], toValues = [], transitionStrings = [], count = details.length, i, property, computedStyle, duration;
		var maxDuration = 0;
		var setToComputed = true;
		for (i = 0; i < count; ++i) {
			d = details[i];
			duration = d.duration;
			if (slowMode) {
				duration *= 10;
			}
			property = d.property;
			properties[i] = property;
			toValues[i] = d.to;
			maxDuration = Math.max(maxDuration, duration);
			if (setToComputed) {
				computedStyle = getWindow(element).getComputedStyle(element, null)[property];
				element.style[property] = computedStyle;				
			}
			transitionStrings[i] = transitionString(property, duration, d.timingFunction, d.delay);
		}
		
		function completionFunction() {
			element.style["-webkit-transition"] = "";
			if (onCompleteFunction) {
			 	onCompleteFunction(element);			
			}
		}

		function animateChange() {
			var ts;
			ts = transitionStrings.join(",");
			element.style["-webkit-transition"] = ts;
			for (i = 0; i < count; ++i) {
				element.style[property] = toValues[i];
			}
			getWindow(element).setTimeout(completionFunction, maxDuration*1000);
		}
		if (setToComputed) {
			animateChange.defer();			
		} else {
			animateChange();
		}
	}

	function animateStyleWithCSS(element, details, onCompleteFunction) {
		if (Object.isArray(details)) {
			animateMultipleStylesWithCSS(element, details, onCompleteFunction);
		} else {
			animateSingleStyleWithCSS(element, details, onCompleteFunction);
		}
	}
	return animateStyleWithCSS;
})();

/**#nocode-*/