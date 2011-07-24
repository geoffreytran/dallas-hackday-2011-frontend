/**
 * @name controller_stage.js
 * @fileOverview DOC TBD: describe the StageController file
 * See {@link Mojo.Controller.StageController} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/


/**
@class This class provides methods to manipulate scene on the stage.

@description 
This class provides methods to manipulate scene on the stage.
A stage is an HTML structure very similar to a standard browser window. 
A single application may have multiple stages and a single stage may contain multiple scenes.


 */
Mojo.Controller.StageController = Class.create(
	/** @lends Mojo.Controller.StageController */
	{
	
	/** @private */
	kDefaultSceneName: 'main',
	kSceneClassName: 'palm-scene',
	kBrowserObject: 'application/x-palm-browser',
	enableAltCharPicker: true,  //set to false if you dont want the alt char picker
	
	/**
	 * describe initialize
	 * @param {Object} appController
	 */
	/** @private */
	initialize: function(appController, stageWindow, stageProxy) {
		var that = this, focusWrapper;
		var bodyClassName = 'palm-default';
		this.window = stageWindow || window;
		this.document = this.window.document;		
		this.paramsFromURI = this.document.baseURI.toQueryParams();
		this.stageType = this.paramsFromURI.window || "card";
		this._stageProxy = stageProxy;
		
		this._stagePreparing = true; // we are still preparing, and must call PalmSystem.stageReady() after first scene push.
		
		switch(this.stageType) {
		case Mojo.Controller.StageType.popupAlert:
			bodyClassName = 'palm-popup-notification';
			break;
		case Mojo.Controller.StageType.bannerAlert:
			bodyClassName = 'palm-banner-notification';
			break;
		case Mojo.Controller.StageType.dashboard:
			bodyClassName = 'palm-dashboard-notification';
			break;
		}
		Mojo.requireFunction(this.document.body.addClassName, "body element must be extended by prototype");
		this.document.body.addClassName(bodyClassName);
		this._sceneStack = new Mojo.SceneStack();
		this._commanderStack = new Mojo.CommanderStack();

		this._appController = appController;
		
		this._deferredSceneOps = [];
		this._deferredLoadingScenes = [];
		this._deferredSceneOpLoader = this._deferredSceneOpLoader.bind(this);
		this._deferredSceneOpExecutor = this._deferredSceneOpExecutor.bind(this);

		this._endTransition = this._endTransition.bind(this);
		this._useSceneTransitions = true;
		
		// Add ourselves to this stage's commander stack so we can
		// provide default behavior for special keys like 'escape/back'.
		this.pushCommander(this);

		// push the app assistant on the commander chain to handle commands or notification processing
		if (appController && appController.assistant) {
			this.pushCommander(appController.assistant);
		}

		// Register a global key observer on the document.
		// We use this to convert special keys into mojo-events.
		this._boundKeyHandler = this._keyHandler.bindAsEventListener(this);
		this.document.addEventListener('keyup', this._boundKeyHandler, false);
		this._boundKeyDownHandler = this._keyDownHandler.bindAsEventListener(this);
		this.document.addEventListener('keydown', this._boundKeyDownHandler, false);
		this._boundKeyPressHandler = this._keyPressHandler.bindAsEventListener(this);
		this.document.addEventListener('keypress', this._boundKeyPressHandler, false);

		this._cleanup = this._cleanup.bindAsEventListener(this);
		this.window.addEventListener('unload', this._cleanup, false);

		// WARNING: It turns out that this is actually wrong for the Launcher & status bar stages, created at boot... it's not initially active.
		// Launcher will, for the moment, directly set the appropriate state in the stageController to false instead.
		this.updateActive(true);
		
		focusWrapper = function() {
			Mojo.Log.warn("Calling window.focus() is deprecated. Use the stage controller activate() method.");
			that.activate();
		};
		
		this.window.focus = focusWrapper;
		if (this.window._mojoLightweightWindow) {
			Mojo.Locale.loadLocaleSpecificStylesheets(this.document);
		}
	},

	/**
	 * @private
	 * Called when the window is closed.
	 * Gives app scene & stage assistants a chance to clean up.
	 */
	_cleanup: function() {
		var stageName;
		var appAssistantCleanup = Mojo.Controller.appController.getAssistantCleanup();
		this.window.removeEventListener('unload', this._cleanup, false);
		
		// Deactivate scene stack & pop all scenes synchronously.
		// This ensures that cleanup code won't typically execute after the window has been closed.
		this._sceneStack.deactivate();
		this._sceneStack.popScenesTo();
		
		// Cancel any deferred scene ops & transition that might be in progress.
		this._cancelDeferredSceneOps();
		
		try {
			// Call assistant's cleanup method, if any:
			if(this.assistant && this.assistant.cleanup) {
				this.assistant.cleanup();
			}
		} catch(e) {
			Mojo.Log.error("WARNING: Error cleaning up stage assitant.");
		} 

		stageName = this.window.name;
		Mojo.Gesture.cleanup(this.document);
		Mojo.Animation.cleanup(this.window);
		Mojo.Controller.appController._stageMgr.removeStageRef(stageName, this.window);
		
		try {
			if (!this.isChildWindow()) {
				Mojo.Controller.appController.closeAllStages();
				if (appAssistantCleanup) {
					appAssistantCleanup();
				}
			}
		} catch(e2) {
			Mojo.Log.error("WARNING: Error cleaning up app assistant.");
		} 
		
		this.document.removeEventListener('keyup', this._boundKeyHandler, false);
		this.document.removeEventListener('keydown', this._boundKeyDownHandler, false);
		this.document.removeEventListener('keypress', this._boundKeyPressHandler, false);
		
		this.indicateNewContent(false);
		
	},

	/**
	 * @private
	 * Installed as the stage activation & deactivation callbacks, called by SysMgr.
	 */
	updateActive: function(isActive) {
		var stageEventTarget;

		this.active = isActive;
		this.focused = isActive;
		
		// The stageActivate/stageDeactivate events go to the top scene if there is one, or else to the document.
		// The bubble up to the document in any case, so this is basically just a way to send them to the scene when there is one.
		stageEventTarget = this.topScene();
		stageEventTarget = stageEventTarget && stageEventTarget.sceneElement;
		stageEventTarget = stageEventTarget || this.document;
		
		if (this.active) {
			this.indicateNewContent(false);
			Mojo.Event.send(this.document, Mojo.Event.activate, undefined, false);
			Mojo.Event.send(stageEventTarget, Mojo.Event.stageActivate);
		} else {
			Mojo.Event.send(this.document, Mojo.Event.deactivate, undefined, false);
			Mojo.Event.send(stageEventTarget, Mojo.Event.stageDeactivate);
		}		
		
	},

	/**
	 * Return the current application controller.
	 */
	getAppController: function() {
		return this._appController;
	},

	/**
	 * Returns true if the stage is both active and has currently pushed.
	 */
	isActiveAndHasScenes: function() {
		if (!this.active) {
			return false;
		}
		return !!this.topScene();
	},
	
	/**
	 * @private
	 */
	isFocusedAndHasScenes: function() {
		return this.isActiveAndHasScenes();
	},
	
	/**
		Programmatically activate this stage.
		Causes card windows to be maximized.
	*/
	activate: function() {
		this.window.PalmSystem.activate();
	},
	
	/**
		Programatically deactivate this stage.
		Causes card windows to be minimized.
	*/
	deactivate: function() {
		this.window.PalmSystem.deactivate();
	},
	
	
	/**
	 * Sets the stage proxy, used in the case where a stage is set up, but the first scene is still
	 * 'transitioning' and calls to delegate to scene assistant would otherwise fail.
	 * @private
	 */	
	setProxy: function(stageProxy) {
		Mojo.assert(this._stageProxy === undefined, "Must not set the stage proxy more than once");
		this._stageProxy = stageProxy;
	},
	
	/**
	 * Delete's the stage proxy from the stage contoller and the proxies hash.
	 * @private
	 * @param {String|Object|Array|Boolean|Number} paramName Describe this parameter
	 * @returns Describe what it returns
	 * @type String|Object|Array|Boolean|Number
	 */
	deleteProxy: function() {
		if (this._stageProxy) {
			delete this._stageProxy;
			delete Mojo.Controller.appController._stageProxies[this.window.name];					
		}
	},
	
	/**
	 * Returns true of there are pending scene operations.
	 * Note that this CANNOT be used to determine whether there are scene operations currently in progress...
	 * After the first stage of a scene transition, the deferredSceneOps array is cleared to allow queuing of 
	 * successive operations separately from the current batch.
	 * @private
	 */	
	hasPendingSceneOperations: function() {
		var deferredSceneOps = this._deferredSceneOps;
		return deferredSceneOps && deferredSceneOps.length > 0;
	},
	
	/**
	 * @private
	 */	
	setSceneVisibility: function(sceneController, visible) {
		var targetElement;
		
		if (sceneController.sceneScroller) {
			targetElement = sceneController.sceneScroller;
		} else {
			targetElement = sceneController.sceneElement;
		}
		
		if (visible) {
			if (!targetElement.visible()) {
				targetElement.show();
			}
			sceneController.showWidgetContainer(targetElement);
		}
		
		if (!visible && targetElement.visible()) {
			sceneController.hideWidgetContainer(targetElement);
			targetElement.hide();
		}
		
	},
	
	/**
	 * Use to call a method on the assistant of the current scene of this stage. The first
	 * parameter is the name of the property that contains the function to call. The remaining
	 * parameters are passed to that function. The this keyword is bound to the scene assistant
	 * for this call.
	 * @param {Object} functionName name of property to use to get the function to call.
	 */
	delegateToSceneAssistant: function(functionName) {
		var scene = this.topScene();
		if(scene && scene.assistant) {
			var f = scene.assistant[functionName];
			if (f) {
				var myArguments = $A(arguments);
				myArguments.shift();
				f.apply(scene.assistant, myArguments);
			}
		}
	},
	
	/**
	 * describe setupStageAssistant
	 */
	/** @private */
	setupStageAssistant: function() {
		
		// This really has nothing to do with the StageAssistant, but this is the 
		// first method that gets called after Mojo is set up in the child window.
		// TODO: It would be tidier to explicitly call a StageController.setup() method, 
		// and call setupStageAssistant() from there.
		this.window.Mojo.screenOrientationChanged = this.screenOrientationChanged.bind(this);
		
		// Set up stage activation callbacks.
		this.window.Mojo.stageActivated = this.updateActive.bind(this, true);
		this.window.Mojo.stageDeactivated = this.updateActive.bind(this, false);
		
		this.body = this.document.body;

		var defaultStageAssistantName;
		if (!this.isChildWindow()) {
			defaultStageAssistantName = "StageAssistant";
		}
		var assistantName = this.paramsFromURI.assistantName || defaultStageAssistantName;

		var ConstructorFunction = Mojo.findConstructorFunction(assistantName);
		if (ConstructorFunction) {
			this.assistant = new ConstructorFunction(this);
			this.assistant.controller = this;

			if(this.assistant.setup) {
				this.assistant.setup();
			}
			else if(this.assistant.startup) {
				// TODO: Remove this deprecated code.
				Mojo.Log.error("WARNING: StageAssistant.startup() has been deprecated, please implement 'setup()' instead.");
				this.assistant.startup();
			}
			// push the stage assistant on the commander chain to handle commands or notification processing
			this.pushCommander(this.assistant);

		}
		
		// If there isn't an assistant or the create callback didn't push any scenes, then we try to push a default scene.
		// Any push operations would be on the deferred scene op queue at this point, so we can just check the length.
		// Note that we never do this in child stages, since the stageCreated callback should push scene.
		if(!this.hasPendingSceneOperations()  && !this.isChildWindow() && !this.assistant) {
			this.pushScene(this.kDefaultSceneName);
		}
		
		/* RWT- This is a useful hack for  development, as it allows you
		 * to load a particular scene in mojo-host by specifying it in
		 * the query parameters, for example
		 *    http://localhost:3000/apps/fr-playground?scene=textfields
		 */
		var queryParams = this.document.URL.toQueryParams();
		var sceneName = queryParams.scene;
		if (sceneName) {// Does
			this.pushScene(sceneName);
		}

	},
	
	/**
	 * @function 
	 * @description Utility function to find out if the current window is a child window.
	 * @returns {Boolean} true for child windows.
	 */
	isChildWindow:  function() {
		return Mojo.Controller.isChildWindow(this.window);
	},
	

	/**
	 * @returns {Boolean} returns true if the current stage has new content for the indicator, and false otherwise.
	 */
	hasNewContent: function() {
		return !!this._throbId;
	},
	
	/**
	 * Change properties of the window.
	 * @param {Object} props A map representing the properties to change.  Keys are the property names, and values are the new values.
	 * Possible values include:
	 * <table border="1">
	 * <tr><td>blockScreenTimeout</td><td>Boolean.  If true, the screen will not dim or turn off in the absence of user activity.  If false, the timeout behavior will be reinstated.</td></tr>
	 * <tr><td>setSubtleLightbar</td><td>Boolean.  If true, the light bar will be made somewhat dimmer than normal.  If false, it will return to normal.</td></tr>
	 * <tr><td>fastAccelerometer</td><td>Boolean.  If true, the accelerometer rate will increase to 30 hz; false by default, rate is at 4 hz. Note fast rate is active only for apps when maximized.</td></tr>
	 * </table>
	 */
	setWindowProperties: function(props) {
		// Pass through to PalmSystem.  Assume it's the responsibility of PalmSystem.setWindowProperties()
		// to deal with properties it's never heard of.
		this.window.PalmSystem.setWindowProperties(props);
	},

	/**
	 * @private
	 */
	frameworkHideSplashScreen: function() {
		if(this._stagePreparing) {
			Mojo.Controller.appController.frameworkHideSplashScreen(this.window);
		}
	},
	
	/**
	 * @function
	 * @description 
	 * 		This may be called on a stageController to manually control when the stage's splash screen is taken down
	 *
	 * 		e.g.
	 *    var pushSecond = function(stageController) {
	 *            stageController.enableManualSplashScreenMode();
	 *            stageController.pushScene('second');
     *       
	 *            setTimeout(function(){stageController.hideSplashScreen();}, 10000);
	 *    }
	 *    Mojo.Controller.getAppController().createStageWithCallback({
	 *           name: "newDelayed",
	 *           lightweight: true
	 *    }, pushSecond.bind(that));
	 */
	enableManualSplashScreenMode: function() {
		Mojo.Controller.appController.enableManualSplashScreenMode(this.window);
	},
	
	/**
	 * @function
	 * @description to be used with enableManualSplashScreenMode, see its description
	 */
	hideSplashScreen: function() {
		this._stagePreparing = undefined;		
		Mojo.Controller.appController.hideSplashScreen(this.window);
	},
	
	/**
	 * Makes the core navi button pulsate if true. This is mainly intended to alert the user to dashboard
	 * events that desire user attention.
	 *
	 */
	indicateNewContent: function(hasNew) {
		if(this.window.PalmSystem && this.window.PalmSystem.addNewContentIndicator) {
			if(hasNew) {
				if(this._throbId) {
					this.window.PalmSystem.removeNewContentIndicator(this._throbId);
					Mojo.Log.warn("indicated new content, but potentially already active.");
				} 
				this._throbId = this.window.PalmSystem.addNewContentIndicator();
				
			} else {
				if(this._throbId) {
					this.window.PalmSystem.removeNewContentIndicator(this._throbId);
					delete this._throbId;
				}
			}
		} else {
			Mojo.Log.warn("called throbber method, but no PalmSystem support.");
		}
	},
	
	/**
	 * Sends the given event through the entire command chain,
	 * starting with the CommanderStack in the current scene,
	 * and progressing to the StageController's stack if the
	 * current scene does not call event.stopPropagation().
	 * @param {Object} event
	 */
	sendEventToCommanders: function(event) {
		var scene = this.activeScene();

		if(!event._mojoPropagationStopped) {
			
			if (scene) {
				if(event.type === Mojo.Event.back) {
					scene.commitChanges();
				}
				
				scene.getCommanderStack().sendEventToCommanders(event);
			}
			
			if(!event._mojoPropagationStopped) {
				this._commanderStack.sendEventToCommanders(event);
			}
			

		}
	},

	/**
	 * @private
	 */
	sendNotificationDataToCommanders: function(notificationData) {
		var scene = this.activeScene();

		if (scene && notificationData) {
			notificationData = scene.getCommanderStack().sendNotificationDataToCommanders(notificationData);
		}

		if(notificationData) {
			notificationData = this._commanderStack.sendNotificationDataToCommanders(notificationData);
		}

		return notificationData;
	},

	/**
	 * Adds the given commander to the top of this StageController's stack.
	 * The commanders in this stack are only used when this scene is the current scene.
	 * @param {Object} cmdr
	 */
	pushCommander: function(cmdr) {
		this._commanderStack.pushCommander(cmdr);
	},

	/**
	 * Removes a commander from the commander stack.
	 * @param {Object} cmdr commander to remove.
	 */
	removeCommander: function(cmdr) {
		this._commanderStack.removeCommander(cmdr);
	},

	/** @private
	 * Obtain the commander stack for this scene.
	 * When this is the current scene, this commander stack forms
	 * the first half of the commander chain.
	 */
	getCommanderStack: function() {
		return this._commanderStack;
	},

	/**
	 * Return the topmost scene from this stage.
	 */
	topScene: function() {
		return this._sceneStack.currentScene();
	},
	
	/**
	 * Return the currently active scene from this stage, if any.
	 * If no scenes are active, returns undefined.
	 */
	activeScene: function() {
		var curScene = this.topScene();
		if(curScene && curScene.isActive()) {
			return curScene;
		}
	},
	
	/**
	 * Returns the scene assistant of the scene above this scene in the
	 * scene stack, or undefined if there is no such scene.
	 */	
	parentSceneAssistant: function(targetSceneAssistant) {
		return this._sceneStack.parentSceneAssistant(targetSceneAssistant);
	},
	
	/**
	 * Sets the orientation of the stage's window.
	 *
	 * @param {String} orientation One of 'up', 'down', 'left', 'right', or 'free'
	 */
	setWindowOrientation: function(orientation) {
		if (this.window.PalmSystem && this.window.PalmSystem.windowOrientation) {
			this.window.PalmSystem.windowOrientation = orientation;
		}
	},
	
	/**
	 * Gets the orientation of the stage's window.
	 *
	 * @param {String} orientation One of 'up', 'down', 'left' or 'right'
	 */
	getWindowOrientation: function() {
		if (this.window.PalmSystem && this.window.PalmSystem.windowOrientation) {
			return this.window.PalmSystem.windowOrientation;
		}
		return 'up';
	},

	/**
	 * Loads a stylesheet -- and any versions of it for the current locale --
	 * into the stage's document.
	 *
	 * @param {String} path A path relative to the application's root directory 
	 *                      specifying the stylesheet to load.
	 */
	loadStylesheet: function(path) {
		Mojo.loadStylesheet(this.window.document, path);
		Mojo.Locale._loadLocalizedStylesheet(this.window.document, path);
	},

	/**
	 * Unloads a stylesheet -- and any versions of it for the current locale --
	 * from the stage's document.
	 *
	 * @param {String} path A path relative to the application's root directory 
	 *                      specifying the stylesheet to unload.
	 */
	unloadStylesheet: function(path) {
		var i;
		var theDocument = this.window.document;
		var links = theDocument.querySelectorAll('link[type="text/css"][href$="' + path + '"]');
		var head = Element.select(theDocument, 'head')[0];
		if (!head) {
		Mojo.Log.warn("No <head> element!");
			return;
		}

		for (i = 0; i < links.length; ++i) {
			links[i].disabled = true;
			head.removeChild(links[i]);
		}
	},

	/**
		Returns an array of scene controllers currently on the stack.
		result[0] is the bottom scene on the stack.
	*/
	getScenes: function() {
		return this._sceneStack.getScenes();
	},	
	
	/** @private */
	useSceneTransitions: function(enabled) {
		this._useSceneTransitions = enabled;
	},
	
/**
 * Push a new scene; the Scene Lifecycle initial setup includes this function.
 * Note that this is an asynchronous operation.
 * An app calls `stageController.pushScene('myScene')`:
 * 
 * 1. A div is created with the view HTML for the new scene, and inserted into the `<body>`.
 * 2. A SceneController for 'myScene' is instantiated.
 * 3. A scene assistant for 'myScene' is instantiated, if available.
 * 4. The new scene is placed on the stage's scene stack then the Scene Controller and 
 * 	  assistant's `setup()` methods are called and Widgets (divs that specify 
 * 	  x-mojo-element) are created, rendered, and added to the DOM.
 *
 * At this point, scene should now be ready for initial display, even if the app is waiting for 
 * a service request to complete to provide dynamic data to fill out the scene.
 * 
 * 1. The StageController transitions the scene onto the stage.
 * 2. When the transition is complete, the scene controller and assistant's
 *    `activate` method is called, and the scene is ready for action.
 * 
 *
 * @param {String|Object} sceneArguments	either the name of the scene to push, or
 *											an object with these properties:
 *											{ name, assistantConstructor, sceneTemplate, [id] }
 *											Note that all additional arguments are passed to the constructor of the next scene's assistant.
 * @since 1.4 sceneArguments allows for template substitution on the new scene's html via a templateModel property. This is passed as 'object' to Mojo.View.render.
 */
	pushScene: function(sceneArguments) {
		Mojo.Timing.resetSceneTiming(this.window);
		Mojo.Timing.resume('scene#total');
		var myArguments;
		
		myArguments = $A(arguments);
		myArguments.shift(); // drop sceneArguments
		this._deferSceneOperation(this._syncPushOperation.bind(this, 'pushScene', sceneArguments, myArguments), false, sceneArguments);
	},
	
	/**
	 * Pops the current scene and simultaneously pushed a new scene without 
	 * activating & deactivating any underlying scenes.
	 * Note that this is an asynchronous operation.
	 * 
	 * @param {String|Object} sceneArguments either the name of the scene to push, or
	 *                        an object with properties including the name of the scene
	 *                        and the id to use as a DOM id.
	 * @since 1.4 sceneArguments allows for template substitution on the new scene's html via a templateModel property. This is passed as 'object' to Mojo.View.render.
	 */
	swapScene: function(sceneArguments) {
		Mojo.Timing.resetSceneTiming(this.window);
		Mojo.Timing.resume('scene#total');
		var myArguments;
		
		myArguments = $A(arguments);
		myArguments.shift(); // drop sceneArguments
		this._deferSceneOperation(this._syncPushOperation.bind(this, 'swapScene', sceneArguments, myArguments), false, sceneArguments);
	},
	
	/*
		Internal sequence of events for pushing/popping a scene:
		
		Phase One: Pushing/popping potentially multiple scenes on the stack.
		
		1. Push/pop scene called.
		2. A deferred scene operation is queued up, consisting of:
			{
				op: A function to perform the operation on the scene stack.
				transition: optional transition from the push/pop arguments, if specified.
				scene: sceneController to operate on.
				name: name of the scene to push
				isPop: boolean, true for pop operations.
			}
		
		3. For push operations, the name of the scene is recorded so we can handle lazy scene assistant loading.
		
		4. Execution of deferred scene ops is deferred, so we can go to #1 at this point.
		
		...
		Phase Two: Lazy Scene Assistant Loading
		1. If there are any scene assistants that we need to load, then we do it here asynchronously, and begin Phase Three when it's complete.
		2. If there are no scene assistants to load, we skip straight to Phase Three.
		
		Phase Three: Execution of Deferred Scene Ops
		1. Create a scene transition object to "snapshot" the current scene and prepare for the graphicsl transition.
			We always use the transition of the last scene op in the queue.  
			If this has been determined already, and is 'none', then we avoid creating the transition object here.		
		2. If there's a current scene, deactivate it.  Create a transition object (which snapshots it) if transition != none.
		3. Execute all deferred scene ops in order.
		4. Perform "aboutToActivate" sequence on the new top scene, an async operation.
		
		Phase 4: Activate the new scene.
		5. Run the scene transition.
		6. When transition is complete, activate the new scene.
		7. Repeat, if we've gotten any more push/pop requests in the mean time.
		
	*/
	
	
	
	/** @private
		Deferred function for creating new scene, used by pushScene & swapScene.
		Allows us to defer creation of the scene assistant too, so code running in the 
		assistant constructor function can't confuse us as easily.
	*/
	_syncPushOperation: function(opName, sceneArguments, myArguments, deferredOp) {
		var scene = this._prepareNewScene(sceneArguments, myArguments);		
		if(scene) {			
			this._sceneStack[opName](scene);
			
			// If push args did not specify a transition, then use the scene's default:
			deferredOp.transition = deferredOp.transition || scene.defaultTransition;
		}
		return;
	},
	
	
	/**
	 * Removes a scene from the scene stack, passing the return value
	 * to the newly revealed scene's activate method.
	 * Note that this is an asynchronous operation.
	 * 
	 * @param {Object} returnValue Value passed to the next scene active method
	 * @param {Object} options Optional object that can specify:
	 * 		{
	 * 			transition: @see Mojo.Transition
	 * 		}
	 */
	popScene: function(returnValue, options) {
		Mojo.Timing.resetSceneTiming(this.window);
		Mojo.Timing.resume('scene#total');
		this._deferSceneOperation(this._sceneStack.popScene.bind(this._sceneStack, returnValue), true, options);
	},
	
	/**
	 * Removes scenes from the scene stack until the target scene is reached, or there are no scenes remaining on the stack.
	 * targetScene may be either the SceneController for the desired scene, the scene DOM ID, or the scene name.
	 * If targetScene is undefined, all scenes will be popped.
	 * Intermediate popped scenes are *not* reactivated, nor is there any visual transition to signify their removal from the stack.
	 * Note that this is an asynchronous operation.
	 * 
	 * @param {Object} targetScene
	 * @param {Object} options @see #popScene
	 */
	popScenesTo: function(targetScene, returnValue, options) {
		Mojo.Timing.resetSceneTiming(this.window);
		Mojo.Timing.resume('scene#total');
		var op = this._sceneStack.popScenesTo.bind(this._sceneStack, targetScene, returnValue);
		this._deferSceneOperation(op, true, options);
	},
	
	
	/** @private 
		Adds the given function to the queue of deferred scene operations, and/or schedules the queue for execution by
		deferring a function to execute them all (unless we've already done it or we're in a transition).
		'options' is either the sceneArguments for a push/swap, or the pop options for a pop/popTo.
	*/
	_deferSceneOperation: function(op, isPop, options) {
		var sceneToLoad, curScene, transition;
				
		// op may be undefined, if we just want to check & possibly schedule the next set of scene operations.
		if(op) {
			
			transition = options && options.transition;
			
			// If this is a push, add the scene name to the list for lazy assistant loading.
			if(isPop === false) {
				sceneToLoad = options && (options.name || options); // scene arguments may be just a string.
				if(sceneToLoad) {
					this._deferredLoadingScenes.push(sceneToLoad);
				}
			
				// This is just a safety check, since we require cross-app pushes to use the crossApp transition.
				if(options && options.appId && transition) {
					Mojo.Log.warn("You cannot specify a transition when pushing a cross-app scene ", options.name, ", forcing to 'crossApp'.");
					options.transition = Mojo.Transition.crossApp;
				}
			}
			
			// Save operation on our stack, for later execution.
			this._deferredSceneOps.push({op:op, isPop:isPop, transition:transition});
		}
		
		if (this.hasPendingSceneOperations()) {	
			// Create a scene transition (unless someone disabled transitions).
			// Creating the transition object snapshots the window's current scene (if there is one) and "freezes" 
			// the display. This gives the new scene a chance to set things up before the transition begins.
			// While displaying the snapshot, we should not receive any key/mouse events.
			// It's important to do this synchronously with respect to the push/pop request because otherwise
			// apps can easily get into a state where tapping twice quickly can cause them to (for example) push a sub-scene twice.
			curScene = this._sceneStack.currentScene();
			if(!this._sceneTransitionInProgress && curScene && this._useSceneTransitions && !this._currentTransition && 
					transition !== Mojo.Transition.none) {
				this._currentTransition = new Mojo.Controller.Transition(this.window, isPop);
			}
			
		}
		
		// Schedule operations to be executed, if we haven't already.
		if(this._deferredSceneOpID === undefined && this.hasPendingSceneOperations()) {
			this._sceneTransitionInProgress = true;
			this._deferredSceneOpID = this._deferredSceneOpLoader.defer();
		}
		
	},
	
	
	/** @private 
		Makes a pass through the deferred scene ops and tries to load any scripts required for the scenes being pushed.
		The deferred ops are not executed until all scripts have been loaded.
		TODO: This lazy load mechanism is no longer "zero overhead"... we will iterate through unloaded scripts every time a scene is pushed.
			We could optimize it by only loading scripts for a pushed scene if the scene assistant class is not defined.
	*/
	_deferredSceneOpLoader: function() {
		var i;
		var scenes = [];
		
		scenes = this._deferredLoadingScenes;
		
		// Swap out the deferred op array so any new requests are not added to the current set.
		this._aboutToExecSceneOps = this._deferredSceneOps;
		this._deferredSceneOps = [];
		
		// If there's nothing left to do, return.  
		// This can happen if the stage is closed during a push/pop transition.
		if(!this._aboutToExecSceneOps || this._aboutToExecSceneOps.length === 0) {
			return;
		}
		
		// If we have pushed any scenes, make sure we load the sources for them.
		// If no loading is needed, this will fall through to _deferredSceneOpExecutor() immediately.
		if(scenes.length > 0) {
			this._deferredLoadingScenes = []; // only need to reset this if it had scenes in it.
			Mojo.loadScriptsForScenes(scenes, this._deferredSceneOpExecutor);
		} else {
			this._deferredSceneOpExecutor();
		}
		
	},
	
	/** @private */
	_deferredSceneOpExecutor: function() {
		var sceneOps, curScene, synchronizer, continueTransition, timeSinceHighlight;
		var syncCallback, amountToDelayToShowHightlight = 0;
		var timeBeforeSetup, scenePrepTimeout;
		var op, lastOp, transitionName, poppedScene;
		var defaultTransition;
		
		// Finally, after scene scripts are loaded, pick up our queue of deferred scene ops.
		sceneOps = this._aboutToExecSceneOps;
		delete this._aboutToExecSceneOps;
		
		// Do nothing if there are no scene ops.
		// This can happen if the stage is closed.
		if(!sceneOps || sceneOps.length < 1) {
			return;
		}
		
		// The maximum scene prep timeout needs to include setup time in addition
		// to any delay waiting for service request data to arrive.
		timeBeforeSetup = Date.now();
		
		// We're pushing or popping some scene, so we know we need to deactivate the current one, if any.
		this._sceneStack.deactivate();
		
		// save reference to last scene op.
		lastOp = sceneOps.last();

		// If there are no scenes in the stack (_sceneStack.length === 0), we
		// don't really need a graphical transition to occur -- we just want the
		// event "freezing" that a scene transition gives us -- so we use
		// Mojo.Transition.none in that case.
		if (this._sceneStack.length > 0) {
			defaultTransition =  Mojo.Transition.defaultTransition;
		} else {
			defaultTransition = Mojo.Transition.none;
		}
		
		// Do initial execution of the push operations, and determine what transition to use.
		// This creates the scene controllers, but does not push them.
		
		// Execute all deferred operations:
		while(sceneOps.length > 0) {
			
			// If this is a pop operation, we need to save a reference to
			// the popped scene so we can check its transition later.
			poppedScene = this._sceneStack.currentScene();
			
			// Execute the deferred op.
			// We pass the op object itself in so that a default transition set in the assistant's setup() can take affect.
			op = sceneOps.shift();
			op.op(op);
		}
		
		// Always use the transition for the last scene op.  This might be sub-optimal in exotic cases 
		// with multiple push/pop operations, but it's consistently a simple & reasonable choice.
		transitionName = lastOp.transition || (lastOp.isPop && poppedScene && poppedScene.defaultTransition) || defaultTransition;
		
		// If we have any scenes left to activate, then we begin the activation process on the top one.
		// We use a synchronizer to allow various clients (mostly the scene assistant, and any lazy lists in the scene)
		// to delay the start of the transition.
		curScene = this._sceneStack.currentScene();
		
		
		// Transition objects are created whenever there's a scene to transition FROM, but 
		// we only actually run them when we also have a scene to transition TO.
		// If there's no transition in affect, then we can just call our completion function directly.
		// This occurs when there is no scene to transition from, for example when the first scene is 
		// pushed onto a stack or the last one is popped.
		// It's okay to call _endTransition() directly (not yielding an inconsistent programming model),
		// since the important bit is that push/pop is always async.
		// However, we do need to make sure we always follow the "aboutToActivate" scheme when 
		// there is a destination scene.
		if(curScene) {
			
			Mojo.Log.info("About to activate scene ", curScene.sceneName);
			this._sceneStack.aboutToActivate(curScene);
			
			if(this._currentTransition) {
				this._currentTransition.setTransitionType(transitionName, lastOp.isPop);
				syncCallback = this._currentTransition.run.bind(this._currentTransition, this._endTransition);
			} else {
				syncCallback = this._endTransition;
			}
			
			// We use a Synchronize object to continue the scene transition so that it can be delayed
			// for service request data to be available, allowing us to transition to a scene that's 
			// fully-populated with data.
			scenePrepTimeout = 0.5;
			synchronizer = new Mojo.Function.Synchronize({
								syncCallback: syncCallback,
								timeout:scenePrepTimeout});
		
			// We always wrap one function, to prevent the synchronizer from firing early if the scene
			//  assistant (or some other client) immediately calls a wrapped function before any others 
			// are created.
			// If nothing else wraps functions with the synchronizer, then the transition will start 
			// immediately when continueTransition is called below.  The operation is asynchronous
			// either way, but we avoid one pass through webkit and back to javascript when no one
			// uses the synchronizer.
			continueTransition = synchronizer.wrap(Mojo.doNothing);
		
			// Pass the synchronizer to the scene controller.  
			// It will take care of wrapping whatever else needs it.
			this.setSceneVisibility(curScene, true);
			curScene.aboutToActivate(synchronizer);
		
			// Allow a brief moment to see any tap hightlight before starting the
			// transition
			if (Mojo.Gesture.highlightTarget) {
				timeSinceHighlight = Date.now() - Mojo.Gesture.highlightTargetTime;
				amountToDelayToShowHightlight = 100 - timeSinceHighlight;
			}
			
			if (amountToDelayToShowHightlight > 0) {
				continueTransition.delay(amountToDelayToShowHightlight/1000);
			} else {
				continueTransition();				
			}
		}
		else { // If there's no scene to transition to, then immediately complete the transition.
			if(this._currentTransition) {
				this._currentTransition.cleanup();
			}
			this._endTransition();
		}
				
	},
	
	/** @private 
		Cancels any deferred scene operations and/or transitions that are currently in progress.
		If they have not been executed yet, then they never will be.
		Called from StageController._cleanup, and important when a lightweight stage is 
		thrown away since the window object will shortly be invalid.
		This is a bit messy I'm afraid.
	*/
	_cancelDeferredSceneOps: function() {
		
		// If we have a timeout in progress, then clear it.
		// It may have already fired, though, so we must keep checking other state vars.
		if(this._deferredSceneOpID !== undefined) {
			this.window.clearTimeout(this._deferredSceneOpID);
			delete this._deferredSceneOpID;
		}
		
		// If we have created a transition, then cancel it:
		if(this._currentTransition) {
			this._currentTransition.cleanup();
			delete this._currentTransition;
		}
		
		// If we have scenes to load, remove them all:
		if(this._deferredLoadingScenes && this._deferredLoadingScenes.length > 0) {
			this._deferredLoadingScenes.clear();
		}
		
		// If we have deferred ops at the scene-loading stage, remove them all:
		if(this.hasPendingSceneOperations()) {
			this._deferredSceneOps.clear();
		}
		
		// If we have deferred scene ops to execute, then remove them:
		if(this._aboutToExecSceneOps) {
			delete this._aboutToExecSceneOps;
		}
		
		this._sceneTransitionInProgress = false;
		
	},
	
	/** @private
		Called when the scene transition is complete.
	*/
	_endTransition: function() {
		// Transition is over, allow scene ops, and process any pending ones if needed.
		delete this._deferredSceneOpID;
		delete this._currentTransition;
		this._sceneTransitionInProgress = false;
		
		this._sceneStack.activate();
		
		this.frameworkHideSplashScreen();		
		
		// If we have a StageController proxy object to deal with, then 
		// apply it's delegated calls to the assistant of the active scene.
		if(this._stageProxy) {
			this._stageProxy.applyToAssistant(this.activeScene().assistant);
			this.deleteProxy();
		}
		
		// Schedule the next set of deferred scene operations if needed.
		this._deferSceneOperation();
		Mojo.Log.info("Transition ended.");
	},
	
	
	/**
	 * @private
	 */
	_sceneIdFromName: function(sceneName) {
		return 'mojo-scene-' + sceneName;
	},

	tryEarlySynchronousTransition: function(transition, sceneController, sceneArguments) {
			//middle of transition
		if(transition && 
			//not disabled by app
			this._useSceneTransitions && 
			sceneArguments.transition != Mojo.Transition.none && 
			
			//can be done synchronously since not waiting for anything
			(!sceneController.assistant || !sceneController.assistant.aboutToActivate)) {
			transition.setTransitionType((sceneArguments && 
										(sceneArguments.assistantConstructor === Mojo.Controller.CrossAppSourceAssistant) && 
										Mojo.Transition.crossApp) || 
										((sceneArguments.transition == Mojo.Transition.crossFade) && Mojo.Transition.crossFade) ||
										Mojo.Transition.zoomFade);
			transition.preparingNewScene(this._endTransition);
		}
	},

	/**
	 * @private
	 * Helper function that sets up a new scene with controller.
	 * Used by pushScene and swapScene.
	 * @param {Object} sceneArguments
	 * @param {Object} myArguments
	 */
	_prepareNewScene: function(sceneArguments, myArguments) {
		var sceneId, scrollerId, scrollerContent, scroller;
		var setup, index, sceneName, sceneTemplateName;
		var content, nodeList, contentDiv;
		var sceneElement, sceneController;
		
		var transition, lastOp;
		
		if (Object.isString(sceneArguments)) {
			sceneId = sceneArguments;
			if (this.get(sceneId)) {
				index = 1;
				while(this.get(sceneId)) {
					sceneId = sceneArguments + '-' + index;
					index += 1;
				}
			}
			sceneArguments = {name : sceneArguments, id: this._sceneIdFromName(sceneId)};
		} else if (sceneArguments.appId) {
			setup = Mojo.Controller.setupCrossAppPush(sceneArguments, myArguments);
			sceneArguments = setup.sceneArguments;
			myArguments = setup.additionalArguments;
		}
		
		sceneName = sceneArguments.name;
		
		sceneTemplateName = sceneArguments.sceneTemplate || sceneName + "/" + sceneName + "-scene";
		
		
		sceneId = sceneArguments.id || this._sceneIdFromName(sceneArguments.name);
		content = Mojo.View.render({template: sceneTemplateName, object: (sceneArguments.templateModel || this)});
		content = content.strip();
		nodeList = Mojo.View.convertToNodeList(content, this.document);
		contentDiv = Mojo.View.wrapMultipleNodes(nodeList, this.document, !this._hasPalmSceneClass(nodeList));
		contentDiv.id = sceneId;
		if (sceneArguments.disableSceneScroller) {
			this.body.insert({top: contentDiv});
		} else {
			scrollerId = sceneId + "-scene-scroller";
			scrollerContent = "<div id='" + scrollerId + "' x-mojo-element='Scroller'></div>";
			this.body.insert({top: scrollerContent});
			scroller = this.get(scrollerId);
			scroller.appendChild(contentDiv);
		}
		
		sceneElement = this.get(sceneId);
		Mojo.requireFunction(sceneElement.hide, "scene element must be extended by prototype");

		// add scene-specific css classes
		sceneElement.addClassName(this.kSceneClassName);
		sceneElement.addClassName(sceneName + '-scene');

		try {
			sceneController = new Mojo.Controller.SceneController(this, sceneElement, sceneArguments, myArguments);
			sceneController.window = this.window;

			transition = this._currentTransition;
			this.tryEarlySynchronousTransition(transition, sceneController, sceneArguments);
		} catch (e){
			Mojo.Log.error("The scene '"+sceneArguments.name+"' could not be pushed because an exception occurred.");
			Mojo.Log.error("Error: %s, line %s, file %s", e.message, e.line, e.sourceURL);
			this.get(sceneId).remove();
			sceneController = undefined;
		}
		
		return sceneController;
	},
	
	/** @private */
	_hasPalmSceneClass: function(nodeList) {
		var i, length, node;
		length = nodeList.length;
		for(i=0; i<length; i++) {
			node = nodeList[i];
			if(node.nodeType === node.ELEMENT_NODE) {
				return node.hasClassName(this.kSceneClassName);
			}
		}
	},
	
	
	/**
	 * This allows the client application to send text to the clipboard to be pasted elsewhere later.
	 * @param {Boolean} escapeHTML: ignored in initial setClipboard api; later will allow pasting of rich text
	 */
	setClipboard: function(text, escapeHTML) {
		var scene = this.topScene();
		var tempTextarea;
		
		if(scene) {
			if (window.PalmSystem && PalmSystem.setManualKeyboardEnabled) {
				PalmSystem.setManualKeyboardEnabled(true);
			}
			tempTextarea = this.document.createElement('textarea');
			tempTextarea.value = text;
			
			scene.sceneElement.appendChild(tempTextarea);
			tempTextarea.select();
			this.document.execCommand('cut');
			tempTextarea.blur();
			tempTextarea.remove();
			if (window.PalmSystem && PalmSystem.setManualKeyboardEnabled) {
				PalmSystem.setManualKeyboardEnabled(false);
			}
		}
	},

	paste: function() {
		if (PalmSystem && PalmSystem.paste) {
			if (PalmSystem.setManualKeyboardEnabled) {
				PalmSystem.setManualKeyboardEnabled(true);
			}
			PalmSystem.paste();
			if (PalmSystem.setManualKeyboardEnabled) {
				PalmSystem.setManualKeyboardEnabled(false);
			}
		}
	},

	setAlertSound: function(soundClass, soundFile) {
		if (this.window.PalmSystem && this.window.PalmSystem.setAlertSound) {
			this.window.PalmSystem.setAlertSound(soundClass, soundFile);
		}
	},

	/**
	 * @private
	 */
	_keyHandler: function(event) {
		var scene = this.topScene();
		var tempTextArea, msg, scriptNode;
		var webView; 
		
		if (Mojo.Controller.isGoBackKey(event)) {
			var newEv = Mojo.Event.make(Mojo.Event.back, {originalEvent: event});
			this.sendEventToCommanders(newEv);
			if(newEv.defaultPrevented) {
				Event.stop(event);
			}
		} else if (event.altKey && event.keyCode === Mojo.Char.f && Mojo.Config.debuggingEnabled) {
			this.toggleFpsBox();
			Event.stop(event);
		} else if (Mojo.Host.current === Mojo.Host.browser && event.altKey && event.keyCode === Mojo.Char.m) {
			this.sendEventToCommanders(Mojo.Event.make(Mojo.Event.command, {command: Mojo.Menu.showAppCmd}));
		} else if (this.enableAltCharPicker && event.keyCode === Mojo.Char.sym) {
			if (this.doesTargetAcceptKeys(event.target)) {
				this._sendCharpickerEvent(Mojo.Event.renderAltCharacters, event.target, null);
			} else {
				webView = this._getWebview(event.target);
				if (webView) {
					webView.mojo.isEditing(this._sendCharpickerEventCallback.bind(this, Mojo.Event.renderAltCharacters, webView, null));
				}
			}
		} else if (event.keyCode === Mojo.Char.o && event.ctrlKey && event.shiftKey && Mojo.Config.debuggingEnabled) {
			//} else if (event.keyCode === Mojo.Char.o) {
			// Special key shortcut to open a DOM inspector for the current stage.
			this.openStageInspector();			
		} else if (event.keyCode === Mojo.Char.v && event.ctrlKey && event.shiftKey && Mojo.Config.debuggingEnabled) {
			// Special key shortcut to show framework info.
			scene = this.activeScene();
			if(scene) {
				msg = 'Using submission '+Mojo.Version.use+", version 1 = #"+Mojo.Versions["1"]+", ";
				
				scriptNode = Mojo.findScriptTag();
				if(scriptNode && scriptNode.hasAttribute('x-mojo-version')) {
					msg += 'x-mojo-version='+scriptNode.getAttribute('x-mojo-version')+".";
				}
				if(scriptNode && scriptNode.hasAttribute('x-mojo-submission')) {
					msg += 'x-mojo-submission='+scriptNode.getAttribute('x-mojo-submission')+".";
				}
				
				scene.showAlertDialog({
					onChoose:Mojo.doNothing,
					title: 'Framework Info',
					message: msg,
					choices: [{label:"OK", value:1}]
				});
			}
		} else if (event.keyCode === Mojo.Char.l && event.ctrlKey && event.shiftKey && Mojo.Config.debuggingEnabled) {
			//} else if (event.keyCode === Mojo.Char.l) {
			
			// Special key shortcut to save the current scene's HTML to the clipboard, and log it to the console.
			if(scene) {
				tempTextArea = this.document.createElement('textarea');
				console.log("HTML for scene '"+scene.sceneName+"':\n"+scene.sceneElement.innerHTML);
				tempTextArea.value = scene.sceneElement.innerHTML;
				scene.sceneElement.appendChild(tempTextArea);
				tempTextArea.select();
				this.document.execCommand('cut');
				tempTextArea.remove();
			}
			
		} else {			
			//console.log('got '+ String.fromCharCode(event.which)+", "+ [event.keyCode, event.type, " metaKey=", event.metaKey].join(' '));
			
			// Give current scene a chance to handle keyboard shortcuts:
			scene = this.activeScene();
			if(event.metaKey && scene && scene.handleShortcut(String.fromCharCode(event.which), event)) {
				Event.stop(event);
			}
		}
		
		this._forwardEventToTopContainer(Mojo.Event.keyup, event);
	},
	
	
	/**
	 * @private
	 */
	_keyDownHandler: function(event) {
		var webView;
		
		if (this.enableAltCharPicker && event.keyCode !== Mojo.Char.sym && event.ctrlKey) {
			if (this.doesTargetAcceptKeys(event.target)) { //this is coming over as ctrl locally
				this._sendCharpickerEvent(Mojo.Event.renderChordedAltCharacters, event.target, event.keyCode);
			} else  {
				webView = this._getWebview(event.target);
				if (webView) {
					webView.mojo.isEditing(this._sendCharpickerEventCallback.bind(this, Mojo.Event.renderChordedAltCharacters, webView, event.keyCode));
				}
			}
		}
		
		this._forwardEventToTopContainer(Mojo.Event.keydown, event);
	},
	
	/**
	 * @private
	 */
	_keyPressHandler: function(event) {
		if(event.metaKey) {
			if(Mojo.Host.current !== Mojo.Host.mojoHost) {
		 		event.stop();
			}
		 } else {
			this._forwardEventToTopContainer(Mojo.Event.keypress, event);
		}
	},
	

	/**
	 * @private
	 */	
	 _getWebview: function(target) {
		if (target.type === this.kBrowserObject) {
			//find the webview parent
			return Mojo.View.getParentWithAttribute(target, 'x-mojo-element', 'WebView');
		}
		return null;
	},

	/**
	 * @private
	 */	
	_sendCharpickerEventCallback: function(type, target, character, isEditing) {
		if (isEditing) {
			this._sendCharpickerEvent(type, target, character);
		}
	},
	
	/**
	 * @private
	 */
	_sendCharpickerEvent: function(type, target, character) {
		this.sendEventToCommanders(Mojo.Event.make(type, {selectionTarget: target, character: character}));
	},

	
	/**
	 * @private
	 */
	_forwardEventToTopContainer: function(type, originalEvent) {
		var scene = this.topScene();
		var container = scene && scene.topContainer();
		
		if (container) {
			Mojo.Event.send(container, type, {originalEvent: originalEvent}, false, true);
		}
	},

	
	/**
	 * @private Used only by alt char picker logic to determine if this should popup the alt char picker
	 */
	doesTargetAcceptKeys: function(target) {
		return Mojo.View.isTextField(target);
	},

	/**
	 * This is an event commander method we use to trigger default 'back' behavior.
	 * The app controller is itself added to the commander chain.
	 * @param {Object} event
	 * @private
	 */
	handleCommand: function(event) {
		if(event.type == Mojo.Event.back) {
			// TODO: Remove this legacy code.  I think nothing uses it to close dialogs anymore.
			var db = this.get('mojo-dialog');
			if (db) {
				Event.stop(event);
				Mojo.Controller.closeDialogBox();
			}

			else if (this._sceneStack.size() > 1) {
				Event.stop(event);
				
				if(!this._sceneTransitionInProgress) {
					this.popScene();
				}
			}
		}

		else if (event.type == Mojo.Event.commandEnable){

			// By default, the prefs & help items in the app-menu are disabled.
			// Scene or stage assistants may override this
			// often global to the app, so we'll leave them enabled for the moment.
			if(event.command == Mojo.Menu.prefsCmd || event.command == Mojo.Menu.helpCmd) {
				event.preventDefault();
				event.stopPropagation();
			}
		} 
	},
	/**
	 * @private
	 */
	toggleFpsBox: function() {
		var fpsBox = this.get('mojo-fps-display-box');
		if (fpsBox) {
			fpsBox.remove();
			Mojo.Animation.showFPS = false;
		} else {
			this.document.body.insert({bottom: '<div id="mojo-fps-display-box"></div'});
			Mojo.Animation.showFPS = true;
		}
	},
	/**
	 * @private
	 */
	considerForNotification: function(params) {
		var scene = this.activeScene();
		if (scene  && scene.assistant && scene.assistant.considerForNotification) {
			params = scene.assistant.considerForNotification(params);
		}
		return params;
	},
	
	get: function(elementOrElementId) {
		if (!Object.isString(elementOrElementId)) {
			return elementOrElementId;
		}
		return this.document.getElementById(elementOrElementId);
	},
	
	/**
	 * @private
	 */
	screenOrientationChanged: function(orientation) {
		var f = function(sceneController) {
			sceneController.handleOrientationChange(orientation);
		};
		this._sceneStack.forEach(f);
	},
	
	
	/** @private 
		Opens a lightweight child stage, and loads firebug-lite into it, directing at this stage.
		TODO: 
		Properly redirect eval stuff to the hidden window if this is a lightweight stage.
			Handle console in this case too.
			Basically set different inspectTarget and execTarget.
		Add scroller, and maybe a scene.
		Support one inspector per stage, by including stage name in the inspector's stage name.
	*/
	openStageInspector: function() {
		var that = this;
		var firebugStage;
		var initFirebugFunc;
		var restoreConsoleFunc = function() {
			window.console = window.realConsole;
		};

		var stageOpenedFunc = function(stageController){
			//Mojo.Log.error('Created inspector stage!');
			firebugStage = stageController;
			
			// Set up variables used by our modified firebug-lite, so it operates on the correct stage:
			firebugStage.window.mojoStylesheet = Mojo.hostingPrefix+Mojo.Config.MOJO_FRAMEWORK_HOME+'/firebug-lite/firebug-lite.css';
			firebugStage.window.mojoTargetDocument = that.document;
			firebugStage.window.mojoTargetWindow = window;
			firebugStage.window.Mojo.Event = window.Mojo.Event;

			// Load the firebug scripts in the child stage, initializing it when they're loaded.
			Mojo._addToScriptQueue([
				{source:Mojo.hostingPrefix+Mojo.Config.MOJO_FRAMEWORK_HOME+'/javascripts/prototype.js'},
				{source:Mojo.hostingPrefix+Mojo.Config.MOJO_FRAMEWORK_HOME+'/firebug-lite/pi.js'},
				{source:Mojo.hostingPrefix+Mojo.Config.MOJO_FRAMEWORK_HOME+'/firebug-lite/firebug-lite.js'}
				],  initFirebugFunc, stageController.document);
			
		};
		window.realConsole = window.console;
		
		initFirebugFunc = function() {
			//Mojo.Log.error('Firebug loaded!');
			
			// Operate in landscape mode if available:
			if(firebugStage.window.PalmSystem) {
				firebugStage.window.PalmSystem.setWindowOrientation("left");
			}
			
			
			firebugStage.pushScene({name:'firebug-lite', 
									sceneTemplate: Mojo.Config.MOJO_FRAMEWORK_HOME+'/firebug-lite/firebug-lite-scene',
									automaticFocusAdvance:false,
									assistantConstructor: Mojo.Controller._FirebugLiteAssistant});
			
			firebugStage.window.addEventListener('unload', restoreConsoleFunc, false);
			
			// Start up the inspector:
			firebugStage.window.firebug.init();
		};
		
		// Create a child lightweight stage to hold the firebug-lite inspector:
		Mojo.Controller.appController.createStageWithCallback({name:'firebug-lite', lightweight:true}, stageOpenedFunc);		
	}
		
	
});

/**
 * Checks to see if a call to delegateToSceneAssistant could possibly work for this window. Used
 * by the application controller to decide whether to create a stage proxy or not. Current algorithm
 * is that if the window doesn't have a Mojo yet, or it does but it's in transition, delegate will not work.
 * If Mojo exists but the scene stack is empty, delegation is allowed, even though it will fail.
 * @private
 * @param {Object} w Window to check for readiness.
 * @returns True if delegateToSceneAssistant would be a good idea, false if not	
 * @type Boolean
 */
Mojo.Controller.StageController.isReadyForDelegation = function isReadyForDelegation (w) {
	var readyAndStageController = {ready: false};
	var otherMojo, stageController, topScene, mojoController;
	if (w === undefined) {
		return readyAndStageController;
	}
	
	otherMojo = w.Mojo;
	if (otherMojo === undefined) {
		return readyAndStageController;
	}
	
	mojoController = otherMojo.Controller;
	if (mojoController === undefined) {
		return readyAndStageController;
	}
	
	stageController = mojoController.stageController;
	if (stageController === undefined) {
		return readyAndStageController;
	}
	
	readyAndStageController.stageController = stageController;
	topScene = stageController.topScene();
	if (topScene === undefined) {
		// If there are no scenes, but scene operations pending, consider this stage not
		// ready for delegation.
		readyAndStageController.ready = !stageController.hasPendingSceneOperations();
	} else {
		readyAndStageController.ready = true;
	}
	return readyAndStageController;
};

/** 
Method 
@private 
*/
Mojo.Controller._FirebugLiteAssistant = function() {};
Mojo.Controller._FirebugLiteAssistant.prototype.kFirebugWidth = '800px';
Mojo.Controller._FirebugLiteAssistant.prototype.kFirebugHeight = '600px';

/** 
Setup of _FirebugLiteAssistant within the controller
@private
@constructor
*/
Mojo.Controller._FirebugLiteAssistant.prototype.setup = function() {
	var container = this.controller.get('fblite-container');
	var fbElementIDs = ['Firebug', 'FirebugBorderInspector', 'FirebugBGInspector'];
	var that = this;
	var firebug = this.controller.get('Firebug');
	
	// Move firebug into the scene's container div
	fbElementIDs.each(function(elem) {
		elem = that.controller.get(elem);
		elem.parentNode.removeChild(elem);
		container.appendChild(elem);
	});
		
	this.controller.sceneElement.style.width = this.kFirebugWidth;
	container.style.width = this.kFirebugWidth;
	container.style.height = this.kFirebugHeight;
	firebug.style.width = this.kFirebugWidth;
	firebug.style.height = this.kFirebugHeight;
	
	this.controller.sceneScroller.mojo.setMode('free');
	
};

/** 
description?
@private
@class 
@name Mojo.SceneStack
*/
Mojo.SceneStack = Class.create(
	/** @lends Mojo.SceneStack */

	{

	/** 
	@constructor
	@private 
	*/
	initialize: function() {
		this._sceneStack = [];
		this._pendingHides = [];
	},
	
	/** @private
		Returns an array of scene controllers currently on the stack.
		result[0] is the bottom scene on the stack.
	*/
	getScenes: function() {
		return this._sceneStack.slice(0);
	},
	
	/** @private
		Deactivates the top scene controller on the stack, if it's active.
	*/
	deactivate: function() {
		var currentScene = this._sceneStack.last();
		if (currentScene && currentScene.isActive()) {
			currentScene.deactivate();
			currentScene.stageController.setSceneVisibility(currentScene, false);
		}
	},
	
	/** @private
		Activates the top scene controller on the stack, if it's active.
	*/
	activate: function() {
		var currentScene = this._sceneStack.last();
		var returnVal = this._returnValue;
		
		delete this._returnValue;
		
		if (currentScene && !currentScene.isActive()) {
			// keep this last since it could cause other scene operations.
			currentScene.activate(returnVal);
		}
	},
	
	/** @private
		Called at the beginning of a transition, when we're going to activate a scene.
		Hides any other scenes that were pushed.
	*/
	aboutToActivate: function(activatingScene) {
		var i, scene;
		
		for(i=0; i<this._pendingHides.length; i++) {
			scene = this._pendingHides[i];
			if(scene !== activatingScene) {
				scene.stageController.setSceneVisibility(scene, false);
			}
		}
		this._pendingHides.clear();
	},
	
	/**
	 * Describe popScene
	 * 
	 * @param {Object} returnValue
	 * @private
	 */
	popScene: function(returnValue) {
		this._returnValue = returnValue;
		this._removeTopScene();
	},

	/**
	 * pushScene
	 * 
	 * @param {Object} sceneController
	 */
	pushScene: function(sceneController) {
		this._addScene(sceneController);
	},

	/**
	 * pop the old scene, and push the new one without activating/deactivating any underlying scene.
	 * @param {Object} sceneController
	 */
	swapScene: function(sceneController) {
		this._removeTopScene();
		this._addScene(sceneController);
	},

	/**
	 * scene may be  the controller object itself, the scene id, or the scene name.
	 * @param {Object} scene
	 * @private	
	 */
	popScenesTo: function(scene, returnValue) {
		var curScene = this._sceneStack.last();
		
		this._returnValue = returnValue;
		
		while(curScene && curScene !== scene && curScene.sceneName !== scene && curScene.sceneId !== scene) {

			// Pop current scene.
			this._removeTopScene();
			
			// Move to next one.
			curScene = this._sceneStack.last();
		}
	},
	/**
	 * currentScene
	 */
	currentScene: function() {
		return this._sceneStack.last();
	},
	
	/**
	 * parentSceneAssistant
	 */
	parentSceneAssistant: function(targetScene) {
		var targetSceneController = targetScene.controller;
		var targetSceneIndex = this._sceneStack.indexOf(targetSceneController);
		if (targetSceneIndex <= 0) {
			return undefined;
		}
		var sceneController = this._sceneStack[targetSceneIndex - 1];
		return sceneController && sceneController.assistant;
	},
	/**
	 * size
	 * 
	 * @param {Object} scene
	 */
	size: function(scene) {
		return this._sceneStack.size();
	},

	/**
	 * Removes top scene from the stack & properly cleans it up.
	 * Does NOT activate any underlying scenes.
	 * 
	 * @private
	 */
	_removeTopScene: function() {
		var currentScene = this._sceneStack.last();
		if (currentScene) {
			currentScene.cleanup();
		}
		this._sceneStack.pop();
	},

	/**
	 * Adds a scene to the top of the stack & properly sets it up.
	 * Does NOT deactivate any underlying scenes.
	 * 
	 * @private
	 * @param {Object} sceneController
	 */
	_addScene: function(sceneController) {
		sceneController.setup();
		this._sceneStack.push(sceneController);
		this._pendingHides.push(sceneController);
	},
	
	/** @private */
	forEach: function(f) {
		this._sceneStack.each(f); 
	}

});

/**#nocode+*/
/* @private
	Small proxy class used in place of a real stage controller when the stage controller is not available yet.
	It implements delegateToSceneAssistant() such that the delegated calls will be made on the assistant of the
	first activated scene (after it's activated).
*/

Mojo.Controller.StageProxy = function(stageName) {
	this._delegatedCalls = [];
};

/** @private */
Mojo.Controller.StageProxy.prototype.delegateToSceneAssistant = function() {
	// We have no stage controller yet, so just save the arguments in an array.
	this._delegatedCalls.push($A(arguments));
	
};

/** @private */
Mojo.Controller.StageProxy.prototype.applyToAssistant = function(assistant) {
	// Apply each set of saved arguments to the given scene assistant.
	this._delegatedCalls.each(function (savedArgs) {
		var methodName = savedArgs.shift();
		assistant[methodName].apply(assistant, savedArgs);
	});
	this._delegatedCalls.push($A(arguments));
};

/**#nocode-*/
