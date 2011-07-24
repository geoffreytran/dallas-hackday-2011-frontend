/**
 * @name controller_scene.js
 * @fileOverview TBD: describe the SceneController file
 * See {@link Mojo.Controller.SceneController} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * Describes the Mojo.Controller.SceneController class
 * @class
 */
Mojo.Controller.SceneController = Class.create(
	/** @lends Mojo.Controller.SceneController */
	{
	
	/** Constants for standard pushContainer layers. */
	sceneContainerLayer: 0,
	dialogContainerLayer: 10,
	submenuContainerLayer: 20,
	

	/** @private */
	initialize: function(stageController, sceneElement, sceneArguments, remainingArguments) {
		var sceneName = sceneArguments.name;
		this.stageController = stageController;
		this.window = stageController.window;
		this.document = this.window.document;
		this.sceneName = sceneName;
		this.sceneId = sceneArguments.id || sceneArguments.name;
		this.scrollingEnabled = !sceneArguments.disableSceneScroller;
		this.crossLaunchPush = sceneArguments.mojoCrossLaunchPush;
		this.defaultTransition = sceneArguments.transition || Mojo.Transition.defaultTransition;
		if (sceneArguments.automaticFocusAdvance !== undefined) {
			this.automaticFocusAdvance = sceneArguments.automaticFocusAdvance;
		} else {
			this.automaticFocusAdvance = Mojo.Controller.SceneController.automaticFocusAdvance;
		}
		this.sceneElement = sceneElement;
		this._commanderStack = new Mojo.CommanderStack();
		this._modelWatchers = [];
		this._widgetSetups = {};
		this._menus = {};
		this._serviceRequestErrorHandler = this.serviceRequestError.bind(this);
		this.activeServiceRequests = [];
		this.activeSubscribedServiceRequests = []; //manage the subscribed version separately
		this.scrollbars = sceneArguments.scrollbars;
		this._active = false;
		this._useLandscapePageUpDown = false;
		this._enableFullScreenMode = false;
		
		this._containerStack = new Mojo.Controller.ContainerStack(this);
		this.pushContainer(this.sceneElement, this.sceneContainerLayer);
		
		this.keydownHandler = this.keydown.bindAsEventListener(this);
		this.keyupHandler = this.keyup.bindAsEventListener(this);
		this.updateSceneScrollerSizeHandler = this.updateSceneScrollerSize.bindAsEventListener(this);

		if (remainingArguments) {
			// TODO: Clean this up.
			var args = $A(remainingArguments);

		}
				
		var assistantName = sceneArguments.assistantName || Mojo.identifierToCreatorFunctionName(sceneName, "Assistant");
		var constructorFunction = sceneArguments.assistantConstructor || window[assistantName];
		
		// We used to try to load scene assistants automatically & lazily here, but it wasn't working and the laziness yields weird semantics anyways,
		// so now we require assistants to be defined (unless the option is specified), and fail with an explanatory message otherwise. 
		Mojo.require(sceneArguments.allowUndefinedAssistant || constructorFunction, 
			"The scene assistant '"+assistantName+"' is not defined. Did you remember to include it in sources.json?");
		
		if (constructorFunction) {
			var assistant = Mojo.createWithArgs(constructorFunction, remainingArguments);
			assistant.controller = this;
			this.assistant = assistant;
		}
		
		var controller = this;
		["setup", "cleanup", "activate", "deactivate", "orientationChanged"].each(function(functionName) {
			var delegateFunctionName = Mojo.Controller.assistantFunctionName(functionName);
			if (assistant && assistant[functionName]) {
				controller[delegateFunctionName] = assistant[functionName].bind(assistant);
			} else {
				controller[delegateFunctionName] = Mojo.doNothing;
			}
		});
		
		//setup the focus logic to blur focused area on first tap outside of it
		this.unfocusOnTapHandler = this.unfocusOnTap.bindAsEventListener(this);
	},
	
	/** @private */
	unfocusOnTap: function(event) {
		
		// Do not unfocus if someone called preventDefault() on the event.
		if(event.defaultPrevented) {
			return;
		}
		
		//first, get the currently focused element
		//compare it to what got tapped: if not the same, blur the other element
		var focusedElement = this.getFocusedElement();
		if (event.target !== focusedElement) {
			if (focusedElement) {
				focusedElement.blur();
			}
		}
	},
	
	/** @private */
	setup: function() {
		var timing = Mojo.Timing;
		timing.resume("scene#setup");
		if (this.scrollingEnabled) {
			this.sceneScroller = this.sceneElement.parentNode;
			this.updateSceneScrollerSize();
			this.scrollerController = new Mojo.Controller.WidgetController(this.sceneScroller, this, 
				{
					establishWidth: true, scrollbars: this.scrollbars, pageUpDown: true
				});
		}
		
		this.pushCommander(this);
		
		if(this.assistant) {
			this.pushCommander(this.assistant);
		}
		
		timing.resume("scene#assistantSetup");
		try {
			this.assistantSetup();
		}catch (e){
			Mojo.Log.error("An exception occurred in the '"+this.sceneName+"' scene's setup() method.");
			Mojo.Log.error("Error: %s, line %s, file %s", e.message, e.line, e.sourceURL);
		}
		
		timing.pause("scene#assistantSetup");
		
		// Instantiate/render all mojo widgets in this scene:
		this.instantiateChildWidgets(this.sceneElement);
		
		this._installMenus();
		
		//validate the scroll position of the scene scroller (if present) after everything is setup
		if (this.sceneScroller) {
			this.sceneScroller.mojo.validateScrollPosition();
		}
		
		// Call assistant's ready method, if implemented.
		if(this.assistant && this.assistant.ready) {
			timing.resume("scene#assistantReady");
			try {
				this.assistant.ready();
			}catch (e2){
				Mojo.Log.error("An exception occurred in the '"+this.sceneName+"' scene's ready() method.");
				Mojo.Log.error("Error: %s, line %s, file %s", e2.message, e2.line, e2.sourceURL);
			}
			
			timing.pause("scene#assistantReady");
		}

		this.focusFirstElement.bind(this).defer();
		timing.pause("scene#setup");
	},
	
	/** @private */
	cleanup: function() {
		
		// Allow container stack to clean up.
		this._containerStack.cleanup();


		try {
			this.assistantCleanup();
		}catch (e){
			Mojo.Log.error("An exception occurred in the '"+this.sceneName+"' scene's cleanup() method.");
			Mojo.Log.error("Error: %s, line %s, file %s", e.message, e.line, e.sourceURL);
		}
			
		// quickly remove all model watches for this scene.
		this._modelWatchers = undefined;
	
		this.activeServiceRequests.each( function(r) {
			r.originalCancel();
		}.bind(this));
		delete this.activeServiceRequests;
	
		this.activeSubscribedServiceRequests.each( function(r) {
			r.originalCancel();
		}.bind(this));
		delete this.activeSubscribedServiceRequests;
	
		if (this.scrollingEnabled) {
		    this.sceneScroller.remove();
			Mojo.removeAllEventListenersRecursive(this.sceneScroller);
		} else {
		    this.sceneElement.remove();
			Mojo.removeAllEventListenersRecursive(this.sceneElement);
		}
		
		if (this.assistant) {
			delete this.assistant.controller;
			delete this.assistant;      
		}
	},
	
	/** @private 
		Called when this scene is about to be activated, before the transition begins.
		The single argument is a Synchronize object, which can be used to wrap callbacks.
		The beginning of the transition will be delayed until all such callbacks have been called,
		or a pre-determined timout expires.
	*/
	aboutToActivate: function(synchronizer) {
		var timing = Mojo.Timing;
		timing.resume("scene#aboutToActivate");
		this.updateSceneScrollerSize();
		
		// start listening here, in case the window changes size during the transition
		Mojo.Event.listen(this.window, 'resize', this.updateSceneScrollerSizeHandler);

		// If the scene assistant implements aboutToActivate(), then wrap a doNothing()
		// and pass it to the scene assistant.  The wrapped doNothing() serves as a 
		// simple flag to begin the transition.  This is simpler for app authors than
		// learning about how to use the synchronizer.
		if(this.assistant && this.assistant.aboutToActivate) {
			try {
				this.assistant.aboutToActivate(synchronizer.wrap(Mojo.doNothing));
			}catch (e){
				Mojo.Log.error("An exception occurred in the '"+this.sceneName+"' scene's aboutToActivate() method.");
				Mojo.Log.error("Error: %s, line %s, file %s", e.message, e.line, e.sourceURL);
			}
		}
		
		// Also fire an aboutToActivate event on the scene element.
		// This allows widgets (and whatever else) to delay the scene transition if needed.
		// Lazy lists use this to automatically delay the transition until their initial
		// window of items is received & rendered.
		// It's important that this remain after the scene assistant call, so that assistants
		// have a chance to do something like call modelChanged() for a list, and trigger the 
		// List's aboutToActivate behavior.
	    Mojo.Event.send(this.sceneElement, Mojo.Event.aboutToActivate, {synchronizer: synchronizer});
		
		// Set full screen mode for the scene.
		// It's done here so that we'll be in or out of full screen before the application
		// tab tries to show up, which looks hokey.
		this._doEnableFullScreenMode();

		timing.pause("scene#aboutToActivate");
		timing.resume("scene#aboutToActivateLatency");
	},
	
	/** @private */
	activate: function(returnValue) {
		var timing = Mojo.Timing, that = this;
		timing.pause("scene#aboutToActivateLatency");
		timing.resume("scene#activate");
		this._active = true;
		
		// If we're a cross-app launched scene, we need to tell sysmgr we're ready for display.
		if(this.crossLaunchPush && !this._didInitialActivate) {
			this._didInitialActivate = true;
			if(this.window.PalmSystem.crossAppSceneActive) {
				this.window.PalmSystem.crossAppSceneActive();
			} else {
				Mojo.Log.error("crossAppSceneActive() not available, but we would have called it.");
			}
		}

		this._doUseLandscapePageUpDown();

		if(this.assistant) {
			try {
				this.assistantActivate(returnValue);			
				
			}catch (e){
				Mojo.Log.error("An exception occurred in the '"+this.sceneName+"' scene's activate() method.");
				Mojo.Log.error("Error: %s, line %s, file %s", e.message, e.line, e.sourceURL);
			}
		}
		
		Mojo.Event.send(this.sceneElement, Mojo.Event.activate, undefined, false);

		if (this.automaticFocusAdvance) {
			this.document.addEventListener("keydown", this.keydownHandler, true);
			this.document.addEventListener("keyup", this.keyupHandler, true);		
		}
		
		Mojo.Event.listen(this.document, Mojo.Event.tap, this.unfocusOnTapHandler); //make sure that selection vs focus works properly!
		timing.pause("scene#activate");
		var report = function(name) {
			timing.pause('scene#total');
			timing.reportSceneTiming(name, that.window);			
		};
		report.defer(this.sceneName);
	},
	
	/** @private */
	deactivate: function() {
		Mojo.Event.stopListening(this.window, 'resize', this.updateSceneScrollerSizeHandler);
		Mojo.Event.stopListening(this.document, Mojo.Event.tap, this.unfocusOnTapHandler);
		this._active = false;

		if (this.automaticFocusAdvance) {
			this.document.removeEventListener("keydown", this.keydownHandler, true);
			this.document.removeEventListener("keyup", this.keyupHandler, true);		
		}
		
		// Cancel all cancellable containers.  
		// This will cause a scene push/pop to dismiss dialogs & submenus.
		this._containerStack.cancelAll();
		
		if(this.assistant) {
			try {
				this.assistantDeactivate();
			}catch (e){
				Mojo.Log.error("An exception occurred in the '"+this.sceneName+"' scene's deactivate() method.");
				Mojo.Log.error("Error: %s, line %s, file %s", e.message, e.line, e.sourceURL);
			}
		}
		
		Mojo.Event.send(this.sceneElement, Mojo.Event.deactivate, undefined, false);
	},
	
	
	/**
	 * @description Sets the default transition to be used for pushing & popping this scene. 
	 * This transition will be used when not overridden by an option specified when pushing or popping the scene.
	 * 
	 * @param transitionType	{string}	A transition name from {@link Mojo.Transition}
	 * 
	 */
	setDefaultTransition: function(transitionType) {
		this.defaultTransition = transitionType;
	},

	/**
	 * @description Returns a boolean value indicating whether or not the scene is currently active.
     *
	 * @returns {boolean} Set to 'true' if the scene is currently active.
	 */
	isActive: function() {
		return this._active;
	},
	
	/**
	 * @description Returns elements of this scene that match the given CSS selector. Uses native querySelectorAll function.
	 *
	 * @param cssSelector {string}	The target CSS selector to be matched.
	 *
	 * @returns {array} Array of elements that match the passed selector, or undefined if there are no matches.
	 */
	select: function(cssSelector) {
		return $A(this.sceneElement.querySelectorAll(cssSelector));
	},
	
	/** @private */
	focusFirstElement: function() {
		this.firstActivate = false;
		var focusTarget = this.initialFocusedElement;
		if (focusTarget !== null) {
			var currentFocusedElement = this.getFocusedElement();
			if (currentFocusedElement !== null) {
				return;
			}
			if (focusTarget) {
				focusTarget = this.get(focusTarget);
				if (focusTarget) {
					if (focusTarget.mojo && focusTarget.mojo.focus) {
						focusTarget.mojo.focus();							
					}else if(focusTarget.focus) {
						focusTarget.focus();
					} 
				}
			} else {
				this.advanceFocus();
			}
		}
	},
	
	/** @private */
	advanceFocus: function(selection) {
		Mojo.View.advanceFocus(this.sceneElement, selection);
	},
	
	/** @private */
	
	keyup: function(keyupEvent) {
		if (keyupEvent.keyCode === Mojo.Char.enter) {
			var selection = Mojo.View.getFocusedElement(this.sceneElement);
			if (!Mojo.Gesture.handlesReturnKey(selection) || keyupEvent.shiftKey) {
				Event.stop(keyupEvent);
				this.advanceFocus(selection);
			}
		}
	},
	
	/** @private */
	
	keydown: function(keydownEvent) {
		if (keydownEvent.keyCode === Mojo.Char.enter) {
			var selection = Mojo.View.getFocusedElement(this.sceneElement);
			if (!Mojo.Gesture.handlesReturnKey(selection) || keydownEvent.shiftKey) {
				Event.stop(keydownEvent);
			}
		}
	},
	
	/**
	 * @description Utility function to call an idle handler when the user has been idle for a given amount of time. 
	 * Once set, the timeout will remain dormant until the user has been continuously idle for the given `delay` in milliseconds.
	 *
	 * @param {string}	 element	The element to watch for user events on.  
	 *								This can be the SceneController.sceneElement, or some element within the scene.  
	 *          					The id or element itself is accepted.
	 * @param {function} func		This is the idle handler that will be called after the user has been idle for enough time.
	 * @param {int}		 delay		This is the amount of time in milliseconds to wait after the last user event before 
	 * 								calling the idle handler.
	 * @param {boolean}	 watchMouse	If true, mouse events will be monitored and considered signs of user activity. 
	 * 								Defaults to true if unspecified.
	 * @param {boolean}	 watchKeys	If true, key events will be monitored and considered signs of user activity. 
	 * 								Defaults to true if unspecified.
	 *								
	 * @returns {Function}			Calling the returned function will cancel the idle timeout.
	 */
	setUserIdleTimeout: function(element, func, delay, watchMouse, watchKeys) {
		var timeoutID;// = window.setTimeout(func, delay);
		var resetFunc;
		
		element = this.get(element);
		
		// Default values to watch both mouse and key events for idleness:
		if(watchMouse === undefined) {
			watchMouse = true;
		}
		if(watchKeys === undefined) {
			watchKeys = true;
		}
		
		// This function is passed to setTimeout().
		// It's a wrapper for the user-provided function that removes our event observers. 
		var timeoutFunc = function() {      
			if(watchMouse) {
				Mojo.Event.stopListening(element, 'mousedown', resetFunc);
				Mojo.Event.stopListening(element, 'mousemove', resetFunc);
				Mojo.Event.stopListening(element, 'mousedown', resetFunc);
			}
			
			if(watchKeys) {
				Mojo.Event.stopListening(element, 'keydown', resetFunc);
				Mojo.Event.stopListening(element, 'keyup', resetFunc);
			}
			
			if(func){
				func();
			}
		};
		
		// This function is used for our event observers.
		// It simply cancels the old timeout and sets a new one.
		// We also call it directly to set up the initial timeout.
		resetFunc = function(event) {
			window.clearTimeout(timeoutID);
			timeoutID = window.setTimeout(timeoutFunc, delay);
		};
				
		// This function is returned to the caller.
		// It can be called to cancel the idle timeout.
		var cancelFunc = function() {
			window.clearTimeout(timeoutID);
			func = undefined;
			timeoutFunc();
		};
		
		// Install appropriate event observers:
		if(watchMouse) {
			Mojo.Event.listen(element, 'mousedown', resetFunc);
			Mojo.Event.listen(element, 'mousemove', resetFunc);
			Mojo.Event.listen(element, 'mousedown', resetFunc);
		}
		
		if(watchKeys) {
			Mojo.Event.listen(element, 'keydown', resetFunc);
			Mojo.Event.listen(element, 'keyup', resetFunc);
		}
		
		// Set up initial timer:
		resetFunc({type:'initial setup'});
		
		return cancelFunc;
	},
	
	/** Returns the top container in this scene. */
	topContainer: function() {
		return this._containerStack.topContainer();
	},
	
	/**
	 * @descriptionPushes a new container on the container stack for this scene.
	 * Mojo.Event.key* events are sent to the top container.  When a new 
	 * container is pushed, all containers with lower or same layer will 
	 * be cancelled if they specify a cancelFunc in their options.
	 *
	 * @param {Element}	container	The new container.
	 * @param {string}		layer		Constant for the layer of this container.
	 *								Usually one of dialogContainerLayer or submenuContainerLayer.
	 * @param {object}		[options]	Object specifying optional arguments. May be omitted, or may
	 *								contain a 'cancelFunc' property mapped to a function to be 
	 *								called when the container is cancelled.
	 */
	pushContainer: function(container, layer, options) {
		return this._containerStack.pushContainer(container, layer, options);
	},
	
	/**
	 * @description Removes the given container element from the stack.
	 * Returns true if it was successfully removed.
	 *
	 * @param {Element}	container	The container to remove.
	 */
	removeContainer: function(container) {
		return this._containerStack.removeContainer(container);
	},
	
	/**
	 * @description Adds the given commander to the top of this SceneController's stack.
	 * The commanders in this stack are only used when this scene is the current scene.
	 * 
	 * @param {Object} cmdr commander to add.
	 */
	pushCommander: function(cmdr) {
		this._commanderStack.pushCommander(cmdr);
	},
	
	/**
	 * @description Removes a commander from the commander stack.
	 * @param {Object} cmdr commander to remove.
	 */
	removeCommander: function(cmdr) {
		this._commanderStack.removeCommander(cmdr);
	},
	
	/**
	 * @private
	 * Obtain the commander stack for this scene.
	 * When this is the current scene, this commander stack forms
	 * the first half of the commander chain.
	 */
	getCommanderStack: function() {
		return this._commanderStack;
	},
	
	
	/**
	 * @private
	 * @deprecated.  
	 * {@link setupWidget}.
	 * 
	 */ 
	setupWidgetModel: function(name, attributes, model) {
		// TODO: Remove this legacy code.
		Mojo.Log.warn("WARNING: setupWidgetModel() is the old name. Use setupWidget().");
		this.setupWidget(name, attributes, model);
	},
	
	/**
	 * @description Register the given attributes and model to be used with the widget of the given name.
	 *
	 * Called by scene assistants in their `setup()` methods.
	 * If a model is specified here for a widget that is rendered in a list item, the model
	 * will be overridden by the one for the list item.
	 *
	 * @param {Object} name			Widget element id or name
	 * @param {Object} attributes	Widget's attributes object
	 * @param {Object} model		Widget's model object
	 */
	setupWidget: function(name, attributes, model) {
			
		this._widgetSetups[name] = {attributes:attributes, model:model};
	},
	

	/**
	 * Get the model registered for the given widget name.
	 * Intended for internal framwork use.
	 * @param {Object} name		Widget element id or name
	 */
	/** @private */
	getWidgetModel: function(name) {
		Mojo.Log.warn("WARNING: getWidgetModel() has been deprecated. Use getWidgetSetup().");
		return undefined;
	},
	
	// Get the attributes registered for the given widget name.
	// Intended for internal framwork use.
	/** @private */
	getWidgetSetup: function(name) {
		return this._widgetSetups[name];
	},
	
	
	/**
	* @description Sets the model for a widget, and notifies the widget of the new model.
	*
	* The widget can be specified by either the DOM element or the id.
	* Unlike `setupWidget()`, this API cannot operate on a widget *name*, since it is intended 
	* to operate on single widget only. The setup associated with the widget is not modified.
	*
	* @param {Object/String}	widget	Widget element or element id
	* @param {Object}			model	Widget's model object
	*/
	setWidgetModel: function(widget, model) {
		var elt = this.get(widget);
		
		// If the widget has not been instantiated yet, then we stash the model
		// in this private property on the DOM element.  It will be picked up 
		// by the controller code when the widget is actually instantiated.
		if (!elt._mojoController) {
			elt._mojoModel = model;
			return;
		}
		else {
			elt._mojoController.setModel(model);
		}    
	},
	
	
	/**
    * @description Scene assistants can call this method when their data changes and a 
    * widget displaying that data needs to be updated. Changes might include, for example,
    * added or removed an element, modified one or more properties of an element, etc.
    * 
    * 'who' is used to avoid notifying objects of their own changes to a model, in the case where both
    * the scene assistant and widget change & watch the same model.
    * 
    * 
    * @param {Object} model		Model object that changed
    * @param {Object} who		The object owning the changeFunc, used to ensure that
 	*							objects are not notified of their own changes to the model.
	*/
	modelChanged: function(model, who) {
		var changeInfo = {model:model, who:who, what:arguments[2]};
		
		// If we're already processing a modelChanged(), then we just queue up the change info.
		if(this._deferredChangedModels) {
			this._deferredChangedModels.push(changeInfo);
			Mojo.Log.info("INFO: modelChanged() was called while processing a previous model change. This is often unintended.");
		} else {
			
			// Otherwise, create a queue for any calls to modelChanged that come in while we're processing.
			// Then we process them all one at a time.
			// This lets widget implementations rely on their handleModelChanged() methods not being reentrant.
			// Otherwise, a DOM modificatins may fire events synchronously (like blur, DOMFocus*, etc.), and 
			// the handlers may end up calling back into modelChanged.
			
			this._deferredChangedModels = [changeInfo];
			
			while(this._deferredChangedModels.length > 0) {
				changeInfo = this._deferredChangedModels.shift();
				this._notifyModelWatchers(changeInfo);
			}
			
			delete this._deferredChangedModels;
		}
		
	},
	
	/** @private */
	_notifyModelWatchers: function(changeInfo) {
		var watcher, count, i;
		
		// Search the model watchers, and notify them as needed.
		// Watcher functions are called with the modified model object.
		count = 0;
		for(i=0; i<this._modelWatchers.length; i++) {
			watcher = this._modelWatchers[i];
			if(watcher.model === changeInfo.model) {
				if(watcher.who !== changeInfo.who) {
					watcher.onchange.call(watcher.who, changeInfo.model, changeInfo.what);
				}
				count++;
			}
		}

		Mojo.assert(count>0, "WARNING: modelChanged() found no watchers. Did you call it with the ORIGINAL model object, and not a replacement?");
	
	},
	
	/**
    * @description Sign up for change notifications for the given model. When someone calls 
	* modelChanged with the model of interest, the `changeFunc` will be called. Usually 
	* used by the framework to notify widgets when their models change.
    * 
    * @param {Object} model			Model name.
    * @param {Object} who			The object owning the changeFunc, used to ensure that
 	*								objects are not notified of their own changes to the model.
    * @param {Object} changeFunc	Function called when modelChanged with the model of interest,
	*								in the context of 'who'.
	*/
	watchModel: function(model, who, changeFunc) {
		if(model && who && changeFunc) {
			this._modelWatchers.push({model:model, who:who, onchange:changeFunc});
		}
	},
	
	/**
    * @description Remove a "model watch" for the given watcher.  If 'model' is undefined,
    * then all registered "model watches" for the given watcher are removed.
	* 
    * Used by the framework when re-rendering HTML that includes Mojo widgets,
    * so that the old/removed widgets are not notified of changes to models.
	* 
	* @param {Object} watcher	The object owning the changeFunc, when watchModel was called.
	* @param {Object} model		Model name, or left undefined all registered "model watches" for 
	*							the given watcher are removed.
	*/
	removeWatcher: function(watcher, model) {
		if(!this._modelWatchers) {
			return;
		}
		
		if(model !== undefined) {
			var watch;
			for(var i=0; i<this._modelWatchers.length; i++)
			{
				watch = this._modelWatchers[i];
				if(watch.who === watcher && watch.model === model) {
					this._modelWatchers.splice(i, 1);
					break;
				}
			}
		} else {
			this._modelWatchers = this._modelWatchers.reject(function(w){return w.who === watcher;});
		}
	},
	
	/**
	 * @description Tells the assistant about orientation changes and sends an event for the widgets.
	 * @private
	 */	
	handleOrientationChange: function(orientation) {
		this.assistantOrientationChanged(orientation);
		Mojo.Event.send(this.sceneElement, Mojo.Event.orientationChange, {orientation: orientation}, false);
	},

	/**
	 * @description Enables and disables receiving 'page up' and 'page down' key events in
	 *	response to the "swipe" gesture when the scene is in landscape mode, 
	 *	instead of the "back" signal.  This property is persistent for each
	 *	scene, so it is not necessary for client code to manage it.
	 *
	 *	@param {bool} yesNo  Is 'true' to enable and 'false' to disable receiving 
	 *	                     'page up/down' key events for just this scene.
	 */
	useLandscapePageUpDown: function(yesNo) {
		if (this._useLandscapePageUpDown !== yesNo) {
			this._useLandscapePageUpDown = yesNo;
			this._doUseLandscapePageUpDown();
		}
	},
	
	/**
	 * @description Enables and disables full screen mode for the scene.  This property is
	 * persistent for each scene, so it is not necessary for client code to
	 * manage it.
	 *
	 * @param {bool} yesNo  is 'true' to enable and 'false' to disable full
	 *	                     screen mode for just this scene.
	 */
	enableFullScreenMode: function(yesNo) {
		if (this._enableFullScreenMode !== yesNo) {
			this._enableFullScreenMode = yesNo;
			this._doEnableFullScreenMode();
		}
	},

	/** @private
	  */
	_doUseLandscapePageUpDown: function() {
		if (this.window.PalmSystem && this.window.PalmSystem.receivePageUpDownInLandscape) {
			this.window.PalmSystem.receivePageUpDownInLandscape(this._useLandscapePageUpDown);
		}
	},
	
	/** @private
	  */
	_doEnableFullScreenMode: function() {
		if (this.window.PalmSystem && this.window.PalmSystem.enableFullScreenMode) {
			this.window.PalmSystem.enableFullScreenMode(this._enableFullScreenMode);
		}
	},
	
	/** @private
		Forward shortcut to menu widget:
	*/
	handleShortcut: function(which) {
		return this._menu && this._menu.assistant.handleShortcut(which);
	},
	
	/**
	 * @description Makes the view or command menu either visible or hidden.
	 *
	 * @param {string} which	Menu name; either  Mojo.Menu.viewMenu or Mojo.Menu.commandMenu
	 * @param {boolean} visible	Set to 'true' to make the menu visible, or 'false' to hide it
	 */
	setMenuVisible: function(which, visible) {
		if (this._menu === undefined) {
			Mojo.Log.warn("WARNING: Attempting to set visibility on menu '", which, "' which does not exist yet. You may want to set the 'visible' property of the menu's model.");
		} else {
			this._menu.assistant.setMenuVisible(which, visible);
		}
	},
	
	/**
	 * @description Returns the visibility state of either the view or command menu.	
	 *
	 * @param {string} which	Menu name; either  Mojo.Menu.viewMenu or Mojo.Menu.commandMenu
	 * @returns {boolean} 		Returns 'true' if menu is visible.
	 */
	getMenuVisible: function(which) {
		if (this._menu === undefined) {
			return false;
		}
		return this._menu.assistant.getMenuVisible(which);
	},
	
	/**
	 * @description Toggles the visibility of the view or command menu. If visible, this function will hide the menu; if
	 * hidden, this function will make visible.
	 *
	 * @param {string} which	Menu name; either  Mojo.Menu.viewMenu or Mojo.Menu.commandMenu.
	 */
	toggleMenuVisible: function(which) {
		this._menu.assistant.toggleMenuVisible(which);
	},
	
	/** @private
	  */
	_installMenus: function() {
		var viewMenu = this._widgetSetups[Mojo.Menu.viewMenu];
		var cmdMenu = this._widgetSetups[Mojo.Menu.commandMenu];
		var appMenu = this._widgetSetups[Mojo.Menu.appMenu];
		
		Mojo.assert(!viewMenu || viewMenu.model, "WARNING: Mojo.Menu.viewMenu has an undefined model. Did you pass it as the attributes by mistake?");
		Mojo.assert(!cmdMenu || cmdMenu.model, "WARNING: Mojo.Menu.commandMenu has an undefined model. Did you pass it as the attributes by mistake?");
		Mojo.assert(!appMenu || appMenu.model, "WARNING: Mojo.Menu.appMenu has an undefined model. Did you pass it as the attributes by mistake?");
		
		this._menu = this.createDynamicWidget('_Menu', 
						{viewModel:viewMenu && viewMenu.model, 
						 viewAttrs:viewMenu && viewMenu.attributes, 
						 commandModel:cmdMenu && cmdMenu.model, 
						 commandAttrs:cmdMenu && cmdMenu.attributes, 
						 appModel:appMenu && appMenu.model, 
						 appAttrs:appMenu && appMenu.attributes});
	},
	
	/** @private */
	charSelectorIsOpen: function() {
	        return this.charSelector && this.charSelector.element && this.charSelector.element.mojo && this.charSelector.element.mojo.isOpen();
	},

	/** @private */
	doExecCommand: function(event, commandString) {
		this.document.execCommand(commandString);
		event.stopPropagation();
	},
	
	/** @private */
	handleCommand: function(event) {
		var cmd;
		if(event.type === Mojo.Event.command) {
		
			switch(event.command) {
				case Mojo.Menu.showAppCmd:
					if(this._menu) {
						this._menu.assistant.showAppMenu();
						event.stop();
					}
					break;
				
				case Mojo.Menu.cutCmd:
					this.doExecCommand(event, 'cut');
					break;
				case Mojo.Menu.copyCmd:
					this.doExecCommand(event, 'copy');
					break;
				case Mojo.Menu.pasteCmd:
					if(PalmSystem && PalmSystem.paste) {
						PalmSystem.paste();
					}
					break;
				case Mojo.Menu.selectAllCmd:
					this.doExecCommand(event, 'selectall');
					break;
			}
			
		} else if (event.type === Mojo.Event.commandEnable) {			
			this.doCommandEnable(event);
		} else if (event.type === Mojo.Event.renderChordedAltCharacters) {
			if (this.charSelectorIsOpen()) {
				return; //let the charselector handle these as it is already open!
			}
			this.charSelector = this.createDynamicWidget('CharSelector', {selectionTarget: event.selectionTarget, character: event.character}); //don't close it, leave that for key up
		} else if (event.type === Mojo.Event.renderAltCharacters) {
			//if there was one, close it
			if (this.charSelectorIsOpen()) {
				return; //let the charselector handle these as it is already open!
			}
			this.charSelector = this.createDynamicWidget('CharSelector', {selectionTarget: event.selectionTarget});
		}
	},
	
	/** @private
	@description Handles default menu item enablement behavior for the app-menu.
	Prefs & Help are disabled unless the scene overrides it.
	*/
	doCommandEnable: function(event) {
		var focusNode;
		switch(event.command) {
			case Mojo.Menu.cutCmd:
			case Mojo.Menu.copyCmd:
			case Mojo.Menu.pasteCmd:
			case Mojo.Menu.selectAllCmd:
				focusNode = this.getFocusedElement();
				if(!(focusNode && Mojo.View.isTextField(focusNode))) {
					event.preventDefault();
				}
				event.stopPropagation();
				break;

			case Mojo.Menu.boldCmd:
			case Mojo.Menu.italicCmd:
			case Mojo.Menu.underlineCmd:
				focusNode = this.getFocusedElement();
				if(!focusNode || !Mojo.View.isRichTextField(focusNode)) {
					event.preventDefault();
				}
				event.stopPropagation();
				break;
				
		}
	},
	
	/** @private */
	_completeRequest: function(r, data) {
		var i = -1;
	  	var subscribed = data.subscriberId; //if subscribed was true, this needs to be moved
		if (this.activeServiceRequests){
			i = this.activeServiceRequests.indexOf(r);
			if (i !== -1) {
				this.activeServiceRequests.splice(i, 1);
				if (data.subscriberId) {
					Mojo.Log.error("ERROR! We removed a subscribed request onComplete.");
				}
			}
		} 
	},
	
	/** @private */
	onComplete: function(appOnComplete, data, activeReq) {
		if (!data.failed) { //marked this as failed, so leave it in the list to be removed later
			this._completeRequest(activeReq, data);
  
			if (appOnComplete) {
		    	appOnComplete(data);
	    	}
		}
	},
	
	/**
	 * @description Remove a request from the scene's list of requests to manage. A removed request will not
	 * be cancelled when the scene is popped, and unless another reference is kept to the request
	 * it can be garbage collected (and thus cancelled) at any time.
	 * @param {Object} request 	Request object returned from original service request; used to
	 *							to identify service request to be removed.
	 */
	removeRequest: function(r) {
		var i = -1;
		if (this.activeServiceRequests){
		    i = this.activeServiceRequests.indexOf(r);
			if (i !== -1) {
				this.activeServiceRequests.splice(i, 1);
			}
		}
		
		if (i === -1 && this.activeSubscribedServiceRequests) { //try the subscribed list
			i = this.activeSubscribedServiceRequests.indexOf(r);
			if (i !== -1) {
				this.activeSubscribedServiceRequests.splice(i, 1);
			}
		}
		
		if (i === -1) {
			Mojo.Log.warn("WARNING: scene controller was asked to remove a request object that wasn't in either the active requests or subscribed requests list.");
		}
	},
	
	/**
	 * @description Cancels and removes a service request. This request must have been 
	 * created with the scene controller's serviceRequest method.
	 * @private
	 * @param {Object} request 	Request object returned from original service request; used to
	 *							to identify service request to be cancelled and removed.
	 */	
	cancelServiceRequest: function(request) {	
		this.removeRequest(request);
		request.originalCancel();
	},

	/**
	 * @description Creates a Palm service request which will be automatically cancelled when 
	 * the scene is popped. The parameters are passed directly to new Mojo.Service.Request().
	 * @param {String} url URL formatted string specifying the service name
	 * @param {Object} options Options for the request
	 * @param {Boolean} resubscribe Set to 'true' to automatically resubscribe when receiving an error from the service
	 * @returns A Mojo.Service.Request object
	 * @type Object
	 */
	serviceRequest: function(url, optionsIn, resubscribe) {
		var serviceRequestOptions;
		var options = optionsIn || {};
		
		if (!this.activeServiceRequests) {
			Mojo.Log.error(this.activeServiceRequests, "ActiveServiceRequests does not exist for this scene. Cleanup was called before this request was made.");
			return undefined;
		}
		
		serviceRequestOptions = {
			onFailure: this._serviceRequestErrorHandler,
			onComplete: this.onComplete.bind(this, options.onComplete)
		};
		
		delete options.onComplete;
		Object.extend(serviceRequestOptions, options);
		
		var request = new Mojo.Service.Request(url, serviceRequestOptions, resubscribe);
		request.originalCancel = request.cancel;
		request.cancel = this.cancelServiceRequest.bind(this, request);
		if (options.parameters && options.parameters.subscribe) {
			this.activeSubscribedServiceRequests.push(request);
		} else {
			this.activeServiceRequests.push(request);
		}
		return request;
	},
	
	/** @private */
	serviceRequestError: function(response) {
		Mojo.Log.error("Error: service request: %s", response.errorText);
		if(Mojo.Config.debuggingEnabled) {
			Mojo.Controller.errorDialog(response.errorText, this.window);
		}
		response.failed = true; //mark this as a failed request so that we leave it alone
	},
	
	/** @private */
	render: function(renderOptions) {
		var sceneRenderOptions = {sceneName: this.controller.sceneName};
		Object.extend(sceneRenderOptions, renderOptions || { });
		return Mojo.View.render(sceneRenderOptions);
	},
	
	/**
	 * @description If the elementId is a string, calls document.getElementById() with that string and returns
	 * the result. Otherwise, just returns elementId.
	 * @param {String|Element} elementId DOM Element reference or string
	 */
	get: function(elementId) {
		var e = elementId;
		if (Object.isString(elementId)) {
			e = this.window.document.getElementById(elementId);
		}
		return e;
	},
	
	/**
	 * @description Wrapper around Mojo.Event.listen that additionally will call get() on the element parameter
	 * if it is a string, converting it to a DOM node.
	 * @param {String|Element} element An elemement reference or DOM ID string identifying the target element.
	 * @param {String} eventType String identifier for the event type.
	 * @param {Function} callback Function object to be called when the event occurs.
	 * @param {Boolean} onCapture (optional) Pass true to listen during the capture phase, false to listen during bubbling.
	 */
	listen: function(element, eventType, callback, onCapture) {
		if (Object.isString(element)) {
			element = this.get(element);
		}
		Mojo.Event.listen(element, eventType, callback, onCapture);
	},
	
	/**
	 * @description Wrapper around Mojo.Event.stopListening that additionally will call get() on the element parameter
	 * if it is a string, converting it to a DOM node.
	 * @param {String|Element} element An elemement reference or DOM ID string identifying the target element.
	 * @param {String} eventType String identifier for the event type.
	 * @param {Function} callback Function object that was registered to be called when the event occurred.
	 * @param {Boolean} onCapture (optional) Pass true to listen during the capture phase, false to listen during bubbling.
	 */
	stopListening: function(element, eventType, callback, onCapture) {
		if (Object.isString(element)) {
			element = this.get(element);
		}
		Mojo.Event.stopListening(element, eventType, callback, onCapture);
	},
	
	/**
	 * @description Called by the scene assistant during setup to set the element that should 
	 * @param {String|Element|null} focusedElement Pass null to prevent automatic focus, or an elementId or element to focus.
	 */
	setInitialFocusedElement: function(initialFocusedElement) {
		this.initialFocusedElement = initialFocusedElement;
	},
	
	/** @private */
	getFocusedElement: function() {
		return this.sceneElement.querySelector(':focus');		
	},
	
	/** @private */
	notify: function(message) {
		Mojo.Log.warn("Warning: notify is deprecated, use showBanner instead.");
		this.showBanner(message);
	},
	
	/** 
	@private
	see {@link Mojo.Controller.appController.showBanner}
	*/
	showBanner: function() {
		Mojo.Controller.appController.showBanner.apply(Mojo.Controller.appController, arguments);
	},
	
	/** returns the automatically created scene scroller */
	getSceneScroller: function() {
		return this.sceneScroller;
	},
	
	/**
	  * @private
	  * @description Matches the scene scroller size to the window
	  */
	updateSceneScrollerSize: function() {
		var dimensions, targetDocument, body;
		if (this.sceneScroller) {
			targetDocument = this.document;
			body = targetDocument.body;
			dimensions = Mojo.View.getViewportDimensions(targetDocument);
			this.sceneScroller.setStyle({height: dimensions.height + 'px'});
			if (body && body.scrollTop !== 0) {
				Mojo.Log.warn("body element had scroll top set, resetting.");
				body.scrollTop = 0;
			}
			if (targetDocument && targetDocument.scrollTop !== 0) {
				Mojo.Log.warn("document had scroll top set, resetting.");
				targetDocument.scrollTop = 0;
			}
		}
	},
	
	/* 
	@private	
 	wrapper function for Element.update that also takes care of cleaning up and instantiating
 	child widgets 
 	*/

 	update: function(element, newContent) {
 		var extendedElement = this.get(element);
 		Element.update(extendedElement, newContent);
 		this.instantiateChildWidgets(extendedElement);
 		this.showWidgetContainer(extendedElement);
 	},


	
	/* 
	@private	
	@description Wrapper function for Element.remove that also takes care of cleaning up child widgets 
	*/
	remove: function(element) {
		var extendedElement = this.get(element);
		Element.remove(extendedElement);
	},
	
	/* 
	@private	
	@description Function to call when you've added new elements to the dom which might contain widgets 
	*/
	newContent: function(elementOrElements) {
		if (Object.isArray(elementOrElements)) {
			var that = this;
			elementOrElements.each(function(element) { that.newContent(element); });
			return;
		}

		var extendedElement = this.get(elementOrElements);
		this.instantiateChildWidgets(extendedElement);
		this.showWidgetContainer(extendedElement);
	},
	
	/** 
	@private	
	@description Temporary function to allow the messaging application to scroll to the
	bottom when they need to. Not sure this is the right API for the
	long term
	 */
	revealBottom: function() {
		if (this.sceneScroller) {
			this.sceneScroller.mojo.revealBottom();
		}
	},
	
	/** 
	@private	
	temporary function to allow an application to reveal an element.
	Not sure this is the right API for the
	long term
	*/
	revealElement: function(element) {
		if (this.sceneScroller) {
			this.sceneScroller.mojo.revealElement(element);
		}
	},
	
	/** @private */
	handleEdgeVisibility: function(edge, visible, marginAmount) {
		if (this.sceneScroller) {
			this.sceneScroller.mojo.handleEdgeVisibility(edge, visible, marginAmount);
		}
	},
	
	/**
	 * @function 
	 * @description Utility function to tell listening widgets to commit themselves
	 */
	commitChanges: function() {		
		//send stopediting event on the scene to any widgets that might care to send out a propertyChange event
		Mojo.Event.send(this.sceneElement, Mojo.Event.commitChanges);
	},
	
	/**
	 * @description Creates a Transition object that the caller can use to run a transition within the scene.
	 * Events to the scene are frozen and a snapshot of the scene's window is taken.  Any
	 * processing to change the scene's state should be done prior to calling run() on the
	 * returned Mojo.Transition object.  Once run() is called, events will flow to the scene
	 * again.
	 *
	 * This code example must run within a scene, e.g., when a change in toggle state results in
	 * the scene changing significantly.
	 *
	 * 		var transition = this.controller.prepareTransition(Mojo.Transition.crossFade, false);
	 * 		// Code setting up the scene's new state goes here
	 * 		transition.run();
	 *
	 * @param {string} [transitionType]  A transition name from {@link Mojo.Transition}
	 *									 specifies the kind of transition to run,
	 *                                   and may be one of {@link Mojo.Transition.none},
	 *                                   {@link Mojo.Transition.zoomFade}, 
	 *                                   {@link Mojo.Transition.crossFade},
	 *                                   or {@link Mojo.Transition.defaultTransition}.
	 * @param {bool} [isPop]             is true if the current scene is being popped,
	 *                                   false otherwise.
	 *
	 */
	prepareTransition: function(transitionType, isPop) {
		var transition = new Mojo.Controller.Transition(this.window, isPop);
		transition.setTransitionType(transitionType || Mojo.Transition.crossFade, isPop);

		return transition;
	}
});

Mojo.Controller.SceneController.automaticFocusAdvance = true;

Mojo.Log.addLoggingMethodsToPrototype(Mojo.Controller.SceneController);

