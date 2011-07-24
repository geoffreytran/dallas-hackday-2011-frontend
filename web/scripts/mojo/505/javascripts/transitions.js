/**
 * @name transitions.js
 * @fileOverview This file defines the Mojo.Transition namespace, which contains public constants and private implementation.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/


/**
@namespace
@description
This class contains public constants for the graphical transitions usually used for pushing & popping scenes.
The constants allow specific transitions to be specified when scenes are pushed or popped (by specifying a transition:transition_name property),
or when using the SceneController.prepareTransition() method.
*/
Mojo.Transition = {};

/**
 * @constant 
 * @description No graphical transition, just an instantaneous switch to the new frame.
 */
Mojo.Transition.none = 'none';

/**
 * @constant 
 * @description A combination zoom & fade transition.  This is the default scene transition, and the direction is reversed when run in "scene pop" mode.
 */
Mojo.Transition.zoomFade = 'zoom-fade';

/**
 * @constant 
 * @description A quick and relatively subtle cross-fade to the new frame.
 */
Mojo.Transition.crossFade = 'cross-fade';

/**
 * @constant 
 * @description defaultTransition is the value to use to perform a default system defined transition.
 */
Mojo.Transition.defaultTransition = Mojo.Transition.zoomFade;


Mojo.Transition.crossApp = 'cross-app'; /** @private For Mojo internal use only. */


/**
@private
@function
@name Mojo.Controller.Transition
This class currently passes through to the PlaceholderTransition and
ZoomFadeTransition classes.  At some point, we'll stub out the PalmSystem
methods for use in sim and browser, and the separate classes will go away,
with ZoomFadeTransition's functionality getting absorbed into this class.
*/
Mojo.Controller.Transition = function(theWindow, isPop) {
	if (Mojo.Host.current === Mojo.Host.browser) {
		this._currentTransition = new Mojo.Controller.Transition.PlaceholderTransition(theWindow, isPop);
	} else {
		this._currentTransition = new Mojo.Controller.Transition.ZoomFadeTransition(theWindow, isPop);
	}
};

Mojo.Controller.Transition.prototype =
{
	setTransitionType : function(type, isPop) {
		this._currentTransition.setTransitionType(type, isPop);
	},
	
	run : function(onComplete) {
		this._currentTransition.begin(onComplete || Mojo.doNothing);
	},

	cleanup : function() {
		this._currentTransition.cleanup();
	},
	
	preparingNewScene: function(onComplete) {
		var trans = this._currentTransition;
		
		if(trans.preparingNewScene) {
			trans.preparingNewScene(onComplete);
		}
	}
	
};



/** 
@private
@function
@name Mojo.Controller.Transition.PlaceholderTransition
This is a sample transition class.
Constructor arguments are the window we're running the transition in, and a boolean value indicating push or pop (used to control transition direction).
The "real" transition is intended to snapshot the pre-transition state of the window, and then keep that snapshot displayed while
the new state is set up.  Then, when the new state is set up, the transition animation is run, and finally the new state is displayed.

We can't do all that from JavaScript, so we just display a big colored rectangle in place of a snapshot, and animate its color
instead of doing a fancier animated transition.
	
*/
Mojo.Controller.Transition.PlaceholderTransition = function(theWindow, isPop) {
	var startColor;
	
	// Save important stuff
	this.document = theWindow.document;
	this.window = theWindow;
	this.isPop = !!isPop;
		
	// Set up the "glass" -- this represents the "snapshot", and the blocking of events while the transition is in progress. 
	startColor = isPop ? '#F33' : '#33F';
	this._transitionGlass = Mojo.View.convertToNode("<div style='position:absolute; top:0px; left:0px; width:100%; height:100%; z-index:1000000; background-color:"+startColor+";'></div>", this.document);
	this._transitionGlass._mojoIsPop = isPop;
	this.document.body.appendChild(this._transitionGlass);
	
//	Mojo.Log.info('transition created');
};

Mojo.Controller.Transition.PlaceholderTransition.prototype.setTransitionType = function(type) {
	this.transitionType = type;
};

/** @private
	Called by the stage controller when the transition animation should begin.
	'onComplete' is a completion function provided by the stage controller which should be called when the transition animation is complete.
	It's responsible for activating the new scene, etc.
*/
Mojo.Controller.Transition.PlaceholderTransition.prototype.begin = function(onComplete) {
	
	var that = this;
	var counter=0;
	var hexLookup;
	
	//Mojo.Log.info('transition begun');
	
	Mojo.Log.info("Beginning placeholder scene transition ", this.transitionType);
	
	if(this.transitionType === Mojo.Transition.none) {
		that.cleanup();
		onComplete();
		return;
	}
	
	hexLookup = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
	
	// This function is called repeatedly with an interval timer to animate the div's color.
	// Animation state variables are stored in the closure.
	var transitionAnimator = function () {
		//Mojo.Log.info('transition animated');
		
		// Animate for 12 frames, modifying the red channel in one direction, and the blue channel in the opposite.
		if(counter < 12) {
			if(that._transitionGlass._mojoIsPop) {
				that._transitionGlass.style.backgroundColor = '#'+hexLookup[15-counter]+'3'+hexLookup[3+counter];
			} else {
				that._transitionGlass.style.backgroundColor = '#'+hexLookup[3+counter]+'3'+hexLookup[15-counter];
			}
			counter++;
		}
		// When the animation is complete, clear the timer and call our "end" method.
		else {
			that.cleanup();
			onComplete();
		}
	};
	
	// Set an interval timer to begin the animation
	this._intervalID = this.window.setInterval(transitionAnimator, 1000/30);
};

/** @private 
Called when the animation is complete.
Cleans up the interval timer & transition glass.
May be called directly by the stage controller instead of begin(), in order to prematurely cancel/end a transition.
*/
Mojo.Controller.Transition.PlaceholderTransition.prototype.cleanup = function() {
	
	if(this._intervalID !== undefined) {
		this.window.clearInterval(this._intervalID);
	}
	
	//Mojo.Log.info('transition done');
	if(this._transitionGlass) {
		this.document.body.removeChild(this._transitionGlass);
		delete this._transitionGlass;
	}
	
};



/**
@private
@function
@name Mojo.Controller.Transition.ZoomFadeTransition
Standard scene transition, available in MojoSysMgr only.
Produces a simultaneous zoom/fade effect.
*/
Mojo.Controller.Transition.ZoomFadeTransition = function(theWindow, isPop) {
	this.window = theWindow;	
	this.isPop = !!isPop;
	this.cleanedup = false;

	this.finish = this.finish.bind(this);
	this.preparingNewScene = this.preparingNewScene.bind(this);
	Mojo.require(this.window.Mojo._nativeTransitionInProgress !== true, "Only one transition may be run at a time");
	this.window.Mojo._nativeTransitionInProgress = true;

	// TODO: 'isPop' cannot reliably be specified at this point, but prepareSceneTransition() needs it, so sometimes it can be wrong.
	// Soon, it will be passed to runSceneTransition() instead.
	this.window.PalmSystem.prepareSceneTransition(isPop);
	
	
};

Mojo.Controller.Transition.ZoomFadeTransition.prototype.setTransitionType = function(type, isPop) {
	this.transitionType = type;
	if(isPop !== undefined) {
		this.isPop = isPop;
	}
};

Mojo.Controller.Transition.ZoomFadeTransition.prototype.begin = function(onComplete) {
	// Special case for transition type === none.
	// We immediately cancel the native transition & call the completion function.
	this.onComplete = onComplete;

	if(this.transitionType === Mojo.Transition.none || this.ranTransition) {
		this.finish();
		return;
	}


	Mojo.Log.info("Beginning native scene transition:", this.transitionType, ", isPop=", this.isPop);
	
	
	
	if(this.window.Mojo.sceneTransitionCompleted !== Mojo.doNothing) {
		Mojo.Log.warn('WARNING -- this.window.Mojo.sceneTransitionCompleted is not Mojo.doNothing!');
	}
	
	this.runNativeTransition();
	
};

Mojo.Controller.Transition.ZoomFadeTransition.prototype.preparingNewScene = function(onComplete) {
	var i;
	this.onComplete = onComplete;
	//a new scene's DOM elements have just been inserted and no waiting is needed for anything like aboutToActivate.

	if(this.transitionType !== Mojo.Transition.none && 
		this.transitionType !== Mojo.Transition.crossApp && 
		!this.isPop && 
		!this.ranTransition) {
		this.ranTransition = true;
		this.runNativeTransition(true);
	}
};


Mojo.Controller.Transition.ZoomFadeTransition.prototype.runNativeTransition = function(skipSynchronize) {
	var synchronizer;
	// Now we know we'll be running a transition.
	this.ranTransition = true;
	
	
	
	// Special case cross-app transitions...
	// In the former case, we simply complete immediately.  In the latter, we call a different "run" API, and then complete immediately.
	if(this.transitionType === Mojo.Transition.crossApp) {
		if(this.window.PalmSystem.runCrossAppTransition) {
			this.window.PalmSystem.runCrossAppTransition(this.isPop);
		} else {
			// Temporary hack -- this makes sure that we will at least cancel the current scene 
			// transition until MojoSysMgr support for runCrossAppTransition() is available.
			this.ranTransition = false;
		}
		
		// complete immediately -- no graphical transition for pushing the proxy scene.
		this.finish();
		
	} else {
		// TODO: Currently, runSceneTransition() does not accept arguments, but it will be changing to use these soon,
		// and isPop will no longer need to be passed to prepareSceneTransition.
		this.window.PalmSystem.runSceneTransition(this.transitionType, this.isPop);
		this.finish.defer();
	}
};

Mojo.Controller.Transition.ZoomFadeTransition.prototype.finish = function() {
	if(this.cleanedup) {
		return;
	}
	var onComplete = this.onComplete;
	this.cleanup();
	if(onComplete) {
		onComplete();
	}
};

Mojo.Controller.Transition.ZoomFadeTransition.prototype.cleanup = function() {
	if(!this.ranTransition && this.window.PalmSystem) {
		this.window.PalmSystem.cancelSceneTransition();
		this.ranTransition = true; // it has effectively 'run' now.  Also, now we won't cancel it twice.
	}
	if(this.window.Mojo && !this.cleanedup) {
		this.window.Mojo._nativeTransitionInProgress = false;
	}
	this.onComplete = undefined;
	this.cleanedup = true;
};



