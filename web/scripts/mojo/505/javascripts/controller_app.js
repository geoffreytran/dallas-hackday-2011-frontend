/**
 * @name controller_app.js
 * @fileOverview This file has functions the application controller.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * The application controller is responsible for creating the application assistant and providing the
 * interfaces for creating and managing stages.
 * @class
 */

Mojo.Controller.AppController = Class.create(
	/** @lends Mojo.Controller.AppController */
	{
	
	/** 
	Initialize function for App Controller
	@private 
	*/
	initialize: function() {
		this._stages = [];
		this._stageProxies = {};
		this._stageMgr = new Mojo.Controller.StageManager(this);
		this.banners = $H();
		
		if(!Mojo.Controller.appInfo.noWindow) {
			window._mojoStageType = Mojo.Controller.StageType.card;
			this._stageMgr.setStageRef("_originalMojoCard", window);
		} 
	},

	/** @private */
	setupAppAssistant: function() {
		var launchParams;
		this.body = window.document.body;
		var assistantName = "AppAssistant";
		if (this.body) {
			assistantName = this.body["x-mojo-assistant"] || assistantName;
		}

		var ConstructorFunction = window[assistantName];
		if (ConstructorFunction) {
			this.assistant = new ConstructorFunction(this);
			this.assistant.controller = this;

			if(this.assistant.setup) {
				this.assistant.setup();
			}
			else if(this.assistant.startup) {
				Mojo.Log.error("WARNING: AppAssistant.startup() has been deprecated, please implement 'setup()' instead.");
				this.assistant.startup();
			}

		}
		var that = this;
		["handleLaunch"].each(function(functionName) {
			var delegateFunctionName = Mojo.Controller.assistantFunctionName(functionName);
			if (that.assistant && that.assistant[functionName]) {
				that[delegateFunctionName] = that.assistant[functionName].bind(that.assistant);
			} else {
				that[delegateFunctionName] = Mojo.doNothing;
			}
		});

		launchParams = Mojo.getLaunchParameters();
		if (!this.handledAsFrameworkLaunch(launchParams)) {
			// if it's not a framework launch code, pass launch arguments to the assistant.
			this.assistantHandleLaunch(launchParams);			
		}

		if (Mojo.Controller.appInfo.noWindow) {
			window.addEventListener('unload',
									this._cleanup.bindAsEventListener(this),
									false);
		}

	},

	/**
	 * @private
	 * @function
	 * @description Method to create a new stage. This function is deprecated, please use createStageWithCallback() instead.
	 */
	createStage: function(createStageParams) {
		Mojo.Log.error("WARNING: AppController.createStage() has been deprecated, please use createStageWithCallback().");
		var stageParams = {};
		if (Object.isString(stageParams)) {
			stageParams.name = createStageParams;
		} else {
			stageParams = Object.extend(stageParams, createStageParams);
			stageParams.name = stageParams.windowName;
		}
		var f = function(stageController) {
			stageController.pushScene(stageController.paramsFromURI.scene);
		};
		this.createStageWithCallback(stageParams, f);
		return undefined;
	},

	/**
	 * @function
	 * @description Method to create a new stage and be called back when the stage is loaded. You can bind as much data to your
					callback function as needed, eliminating the need to pass parameters in the URI. The callback function can use
					the passed-in stage controller to push the first scene.
	 * @param {String|Object} stageArguments	If a string, the name of the new stage. If a stage exists
												with this name, its contents will be replaced. If an object, supported properties are:
												{
													name				string          Required	Stage name
													assistantName		string          Optional	Name of stageAssistant
													htmlFilePath		string          Optional	Name of stageAssistant
													htmlFileName		string          Optional	Name of stageAssistant
													lightweight			boolean         Optional	Should always be set to true
																									Defines stage as a lightweight stage
													 												(should always be set to true)
													height				integer         Optional	Popup stages only
																									Height of stage in pixels
													clickableWhenLocked	boolean         Optional	Dashboard stages only
																									Allows dashboard to receive tap events when locked
												}
											
	 * @param {Function} onCreate				A function that is called once the new stage is fully loaded.
												It is passed the new stage controller as its first parameter.
	 * @param {String} optionalStageType		The type of stage to create. See Mojo.Controller.StageType
												in controller.js for legal values.
	 */
	createStageWithCallback: function(stageArguments, onCreate, optionalStageType) {
		this._stageMgr.createStage(stageArguments, onCreate, optionalStageType);
	},

	/**
	 * @private
	 */
	callCreateStageCallback: function(stageName, stageController) {
		this._stageMgr.callCreateStageCallback(stageName, stageController);
	},

	/**
	 * @function
	 * @description Function to get the stage controller for a stage.
					Returns undefined if the stage does not exist, or is not yet fully constructed.
	 * @param {String} stageName			The name of the stage.
	 */
	getStageController: function(stageName) {
		return this._getStageControllerOrMaybeProxy(stageName, false);
	},


	/**
	 * @function
	 * @description Function to get a controller or proxy object for a stage.  Returns the stage controller if available,
	 * but if the stage is still in the process of being created a proxy object will be returned instead.  This proxy implements
	 * delegateToSceneAssistant(), and will delegate the calls as expected when the stage is available.
	 * @param {String} stageName			The name of the stage.
	 */
	getStageProxy: function(stageName) {
		return this._getStageControllerOrMaybeProxy(stageName, true);
	},

	/** @private
		Utility function for getStageController & getStageProxy.
	*/
	_getStageControllerOrMaybeProxy: function(stageName, useProxy) {
		var w, proxy, stageController, readyAndStageController;

		Mojo.requireString(stageName, "getStageController/Proxy: stageName must be a string.");
		if (stageName === window.name) {
			return Mojo.Controller.stageController;
		}
		w = this._stageMgr.getStageRef(stageName);

		if(w) {
			readyAndStageController = Mojo.Controller.StageController.isReadyForDelegation(w);
			if (useProxy) {
				if (!readyAndStageController.ready) {
					proxy = this._stageProxies[stageName];
					if (proxy === undefined) {
						proxy = new Mojo.Controller.StageProxy(stageName);
						stageController = readyAndStageController.stageController;
						if (stageController) {
							stageController.setProxy(proxy);
						}
						this._stageProxies[stageName] = proxy;
					}
					return proxy;
				}
			}
			return readyAndStageController.stageController;
		}

		return undefined;
	},
	
	/**
	 * @private
	 */
	frameworkHideSplashScreen: function(stage) {
		stage = stage || window;
		if(!stage.Mojo._mojoManualStageReady) {
			this.hideSplashScreen(stage);
		}
	},
	
	/**
	 * @function
	 * @description 
	 *	In the app assistant, an app may call enableManualSplashScreenMode on the appController to manually take down the splash screen on the main/first stage
	 *	It'll call hideSplashScreen when ready.
	 *
	 *	function AppAssistant(appController) {
	 *	        appController.enableManualSplashScreenMode();
	 *	        setTimeout(function(){appController.hideSplashScreen();}, 5000);
	 *	}
	 * @param {window} stage
	 */
	enableManualSplashScreenMode: function(stage) {
		stage = stage || window;
		stage.Mojo._mojoManualStageReady = true;
	},

	/**
	 * @function
	 * @description 
	 *	see 'enableManualSplashScreenMode'
	 *
	 * @param {window} stage
	 */
	hideSplashScreen: function(stage) {
		stage = stage || window;
		if(stage.PalmSystem && stage.PalmSystem.stageReady && !stage.Mojo._mojoCalledStageReady) {
			stage.Mojo._mojoCalledStageReady = true;
			stage.PalmSystem.stageReady();
		}
	},
	

	/**
	 * @function
	 * @description Function to close a stage.
	 * @param {String} stageName			The name of the stage.
	 */
	closeStage: function(stageName) {
		Mojo.requireString(stageName, "closeStage: stageName must be a string.");
		delete this._stageProxies[stageName];
		this._stageMgr.closeStage(stageName);
	},

	/**
	 * @function
	 * @description Function to close all stages.
	 */
	closeAllStages: function() {
		this._stageProxies = {};
		this._stageMgr.closeAllStages();
	},
	
	/** @private */
	generateStageName: function(url) {
		this.windowIndex = (this.windowIndex + 1) || 1;
		var baseName = this._extractStageNameFromUrl(url);
		return baseName + "-" + this.windowIndex;
	},

	/** @private */
	_extractStageNameFromUrl: function(url) {
		var re = /\/(.*)\.html/;
		var match = url.match(re);
		if (match === null) {
			match = "index";
		}
		return match[1];
	},

	/** @private */
	getStageMgr : function() {
	    return this._stageMgr;
	},

	/** @private */
	isTestLaunch: function() {
		var launchParams = Mojo.getLaunchParameters();
		return launchParams.mojoTest !== undefined;
	},

	/** @private */
	handleTestLaunch: function() {
		var launchParams = Mojo.getLaunchParameters();
		var f = function(stageController) {
			Mojo.Test.pushTestScene(stageController, {runAll: true, testId: launchParams.testId, resultsUrl: launchParams.resultsUrl});
		};
		this.createStageWithCallback({name: 'test-stage', lightweight: true}, f);
	},
	
	/** @private */
	handleCrossLaunch: function() {
		Mojo.Controller.handleCrossLaunch();
	},

	/** @private */
	handleConfigLaunch: function(launchParameters) {
		Mojo.Environment.applyConfiguration(launchParameters.mojoConfig);
	},
	
	/** @private */
	handleDebuggerLaunch: function(launchParameters) {
		var params = launchParameters.mojoDebugger;
		var keys, stageController;
		var that = this;
		
		function openInspector(nameOrController) {
			
			var otherWindow, stageController;
			
			if(Object.isString(nameOrController)) {
				otherWindow = that._stageMgr.getStageRef(nameOrController);
				stageController = otherWindow && otherWindow.Mojo.Controller.stageController;
			} else {
				stageController = nameOrController;
			}

			if(stageController) {
				stageController.openStageInspector();
			}
		}
		
		if(params.openAll) {
			keys = this._stageMgr.allStageKeys();
			for (var i = 0; i < keys.length; i++) {
				openInspector(keys[i]);
			}
		} else if(params.windowToOpen){
			//if you specify stage name.
			openInspector(params.windowToOpen);
		} else {
			//open inspector for active card.
			stageController = this.getActiveStageController(Mojo.Controller.StageType.card) || 
							this.getActiveStageController(Mojo.Controller.StageType.stackedCard);
			openInspector(stageController);
		}

	},

	/** @private */
	handledAsFrameworkLaunch: function(launchParameters) {
		var launchMethodName, launchMethod, launchCodeIndex, launchCode, frameworkLaunchParams = this.kFrameworkLaunchParams;
		for (launchCodeIndex = frameworkLaunchParams.length - 1; launchCodeIndex >= 0; launchCodeIndex--){
			launchCode = frameworkLaunchParams[launchCodeIndex];
			if (launchParameters[launchCode] !== undefined) {
				launchMethodName = launchCode.replace(/mojo(.*)/, "handle$1Launch");
				launchMethod = this[launchMethodName];
				Mojo.requireFunction(launchMethod, "Framework launch codes must match a launch method.");
				launchMethod.call(this, launchParameters);
				return true;
			}
		}
		return false;
	},

	/** @private */
	handleRelaunch: function(relaunchParameters) {

		if (this.handledAsFrameworkLaunch(relaunchParameters)) {
			return;
		}

		// TODO: Remove this legacy code.
		// This is just a temporary hack to show the app menu via a relaunch, until MojoSysMgr provides a mechanism to allow more direct communication.
		if(typeof relaunchParameters == 'object' && relaunchParameters['palm-command'] == 'open-app-menu') {
			var stageController = this.getActiveStageController(Mojo.Controller.StageType.card) || 
									this.getActiveStageController(Mojo.Controller.StageType.stackedCard);
			if (stageController) {
				stageController.sendEventToCommanders(Mojo.Event.make(Mojo.Event.command, {command: Mojo.Menu.showAppCmd}));
			}
		} else {
			this.assistantHandleLaunch(relaunchParameters);
			if(this.assistantHandleLaunch === Mojo.doNothing) {
				if (!Mojo.Controller.appInfo.noWindow) {
					Mojo.Log.info("AppAssistant didn't implement handleLaunch so giving focus to main window...");
					PalmSystem.activate();
				}
			}
		}

	},
	
	/**
	 * Show the message text from the bannerParams in the banner area. The launchArguments will be used to launch or relaunch the application
	 * if the banner is touched.
	
	 * The category parameter defaults to 'banner'. 
	
	 * New banners of each category will replace existing banners of the same category.
	 *
	 * @param {String|object} bannerParams bannerParams </br>
	             	Can be either a string, in which case it is simply message text, or an object with the following properties:</br>
					<table>
						<tr><td width="30%">messageText</td>	<td>text to display</td></tr>
						<tr><td width="30%">soundClass</td> 	<td>string containing the sound class to use</td></tr>
						<tr><td width="30%">soundFile</td> 		<td>partial or full path to a sound file to play</td></tr>
						<tr><td width="30%">icon</td> 			<td>partial or full path to an icon to show</td></tr>
						<tr><td width="30%">soundDuration</td> 	<td>duration of sound in milliseconds</td></tr>
					</table>

	 * @param {String} launchArguments 
					Arguments sent to the application when it is launched or relaunched if the banner is touched.
	 * @param {String} category 
			Value defined by the application. It is used if you have more than one kind of banner message. 
			Without categories, any banner shown would replace an existing banner that had not yet been shown.

	
	 */
	showBanner: function(bannerParams, launchArguments, category) {
		var bannerKey, bannerId, defaultsCopy;
		if (Object.isString(bannerParams)) {
			bannerParams = {messageText: bannerParams};
		}
		defaultsCopy = Object.extend({}, this.kDefaultBannerParams);
		bannerParams = Object.extend(defaultsCopy, bannerParams);
		this.removeBanner(category);
		try {
			bannerId = PalmSystem.addBannerMessage(bannerParams.messageText, Object.toJSON(launchArguments),
				bannerParams.icon, bannerParams.soundClass, bannerParams.soundFile, bannerParams.soundDuration);
			bannerKey = category || 'banner';
			this.banners.set(bannerKey, bannerId);
		} catch (addBannerMessageException) {
			Mojo.Log.error(addBannerMessageException.toString());
		}
	},

	/**
	 * Remove a banner from the banner area. The category parameter defaults to 'banner'. Will not remove
	 * messages that are already displayed.
	 * @param {String} category 
			Value defined by the application and usually same one used in {@link showBanner}. 
			It is used if you have more than one kind of banner message. 
	 */
	removeBanner: function(category) {
		var bannerKey = category || 'banner';
		var bannerId = this.banners.get(bannerKey);
		if (bannerId) {
			try { 
				PalmSystem.removeBannerMessage(bannerId); 
			} catch (removeBannerException) {
				Mojo.Log.error(removeBannerException.toString());
			}
		}
	},
	
	/**
	 * Remove all pending banner messages from the banner area. Will not remove messages that are already
	 * displayed.
	 */
	removeAllBanners: function() {
		this.banners = $H();
		try { 
			PalmSystem.clearBannerMessages();
		} catch (clearBannerMessagesException) {
			Mojo.Log.error(clearBannerMessagesException.toString());
		}
	},
	
	/**
	 * Immediately play a notification sound
	 * @param {String} soundClass class of the sound; supported classes are: "ringtones", "alerts", "alarm", "calendar", "notification"
	 * @param {String} soundFile partial or full path to the sound file
	 * @param {String} duration of sound in ms
	 */
	playSoundNotification: function(soundClass, soundFile, soundDurationInMs) {
		PalmSystem.playSoundNotification(soundClass, soundFile, soundDurationInMs);
	},

	/**
	 *
	 * @description deprecated alias for sendToNotificationChain.
	 * @param {Object} notificationData
	 * @private
	 */
	considerForNotification: function(notificationData) {
		Mojo.Log.error("Warning: AppController.considerForNotification is deprecated, used AppController.sendToNotificationChain");
		this.sendToNotificationChain(notificationData);
	},

	/**
	 * Hand the passed-in notification data to everyone in the commander stack
	 * of the focused window (scene assistant, stage assistant, app assistant,
	 * usually), calling considerForNotification, if present, on each. Each
	 * assistant before the app assistant should return the notification data
	 * with any properties that aren't needed for building a notification
	 * removed. The app assistant can then use the remaining data (in its own
	 * considerForNotification function) to call showBanner or to create or
	 * update a dashboard stage.
	 */
	sendToNotificationChain: function(notificationData) {
		var focusedStage = this.getActiveStageController(Mojo.Controller.StageType.card);
		if (focusedStage) {
			notificationData = focusedStage.sendNotificationDataToCommanders(notificationData);
		}
		if(notificationData && this.assistant && this.assistant.considerForNotification) {
			this.assistant.considerForNotification(notificationData);
		}
	},


	/**
	 * @description Function to return the first currently focused stage.
	 * @param {String} stageType optional parameter to limit the focused stage returned
	 * 							 to the specified type. See {@link Mojo.Controller.StageType} for details on stageType.
	 */
	getActiveStageController: function(stageType) {
		return this._stageMgr.getActiveStageController(stageType);
	},

	/**
	 * @private
	 */
	getFocusedStageController: function(stageType) {
		return this.getActiveStageController(stageType);
	},

	/**
	 * Launch another application, with optional parameters.
	 * @param {String} appId Application ID of application to launch.
	 * @param {Object} params Launch parameters to send to the launched application.
	 * @param {Function} onSuccess Function that is called if the launch is successful. Default is to do nothing.
	 * @param {Function} onFailure Function that is called if the launch fails. Default is to do nothing.
	 * @returns The Mojo.Service.Request object used to make the launch request.
	 * @type Object
	 */
	launch: function(appId, params, onSuccess, onFailure) {
		if (Mojo.Host.current === Mojo.Host.browser) {
			window.opener.MojoHost.launch(appId, false, params);
			if(onSuccess) {
				onSuccess.defer();
			}
			return;
		}
		return new Mojo.Service.Request('palm://com.palm.applicationManager', {
			method:'launch',
			onSuccess: onSuccess || Mojo.doNothing,
			onFailure: onFailure || Mojo.doNothing,
			parameters: {
				id: appId,
				params: params
			}
		});
	},

	/**
	 * Launch an application appropriate for "opening" the data indicated in the launch parameters.
	 * @param {Object} params Launch parameters to send to the opening application
	 * @param {Function} onSUccess Function that is called if the open is successful. Default is to do nothing.
	 * @param {Function} onFailure Function that is called if the open fails. Default is to do nothing.
	 * @returns The Mojo.Service.Request object used to make the launch request.
	 * @type Object
	 */
	open: function(params, onSuccess, onFailure) {
		if (Mojo.Host.current === Mojo.Host.browser) {
			window.opener.MojoHost.launch(params.id, false, params);
			if (onSuccess) {
				onSuccess.defer();
			}
			return;
		}
		return new Mojo.Service.Request('palm://com.palm.applicationManager', {
			method: 'open',
			onSuccess: onSuccess || Mojo.doNothing,
			onFailure: onFailure || Mojo.doNothing,
			parameters: params
		});
	},

	/**
	 * Returns the current orientation of the physical screen.
	 * 
	 * @returns {string} one of 'up', 'down', 'left', or 'right'.
	 */
	getScreenOrientation : function() {
		return PalmSystem.screenOrientation;
	},

	getIdentifier: function() {
		return PalmSystem.identifier;
	},

	isMinimal: function() {
		return PalmSystem.isMinimal;
	},

	/** @private */
	finishOpenStage: function(w) {
		Mojo.Gesture.setup(w.document);
		Mojo.Animation.setup(w);
		Mojo.Controller.setupStageController(w);
		w.Mojo.handleGesture = Mojo.doHandleGesture.bind(undefined, w);
		Mojo.SteOptions.setup(w);
	},

	/** @private */
	getAssistantCleanup: function() {
		return this.assistant && this.assistant.cleanup && this.assistant.cleanup.bind(this.assistant);
	},

	/** @private */
	_cleanup: function() {
		var assistantCleanup = this.assistant && this.assistant.cleanup;
		this._stageMgr.closeAllStages();

		if(assistantCleanup) {
			assistantCleanup.bindAsEventListener(this.assistant)();
		}
	},

	kDefaultBannerParams: {soundClass: '', soundFile: '', icon: '', messageText: ''},
	
	kFrameworkLaunchParams: ["mojoTest", "mojoCross", "mojoConfig", "mojoDebugger"]

});


/**	
@private
@description Stage Manager description
@class
*/

Mojo.Controller.StageManager = Class.create(
	/** @lends Mojo.Controller.StageManager	 */
	{
	
	/** 
	Initialize function for StageManager
	@constructor
	@private 
	*/
	initialize: function(appController) {
		this._windowHash = $H({});
		this._callbacks = $H({});
		this._appController = appController;
	},
	
	/** @private */
	calculateUrl: function(stageArgumentsWithLocale) {
		var url;
		var prefix;
		var urlWithParameters;
		var parts;
		if (stageArgumentsWithLocale.lightweight && !Mojo.sourcesList) {
			url = "about:blank?" + Object.toQueryString(stageArgumentsWithLocale);
		} else {
			urlWithParameters = document.baseURI;
			parts = urlWithParameters.split("?");
			url = parts[0];
			if (stageArgumentsWithLocale.htmlFileName) {
				prefix = stageArgumentsWithLocale.htmlFilePath || '$1';
				url = url.replace(/(.*\/).*\.html/, prefix) + stageArgumentsWithLocale.htmlFileName + ".html";
				delete stageArgumentsWithLocale.htmlFileName;
				delete stageArgumentsWithLocale.htmlFilePath;
			}
			url = url + '?' + Object.toQueryString(stageArgumentsWithLocale);
		}
		return url;
	},

	/** @private */
	createStage: function(stageArguments, onCreate, optionalStageType) {
		var stageName, newlyCreatedWindow;
		if (Object.isString(stageArguments)) {
			stageName = stageArguments;
			stageArguments = {name : stageName};
		} else {
			stageName = stageArguments.name;
		}
		Mojo.requireString(stageName, "createStageWithCallback: stageName must be a string");
		Mojo.requireFunction(onCreate, "createStageWithCallback: onCreate must be a function.");
		var existingStageController = this.getStageRef(stageName);
		Mojo.require(existingStageController === undefined, "createStageWithCallback: cannot create two stages with the same name. " + stageName);
				
		stageArguments.window = optionalStageType || Mojo.Controller.StageType.card;
		
		var defaultStageHeight = 432;
		if (stageArguments.window === Mojo.Controller.StageType.dashboard) {
			defaultStageHeight = 48;
		} else if (stageArguments.window === Mojo.Controller.StageType.bannerAlert) {
			defaultStageHeight = 48;
		} else if (stageArguments.window === Mojo.Controller.StageType.popupAlert) {
			defaultStageHeight = 200;
		}
		var stageHeight = stageArguments.height || defaultStageHeight;

		/* forget any existing query parameters, but add in the stage type so MojoSysMgr knows what
		   kind of stage it is */
		var stageArgumentsWithLocale = Object.extend({mojoLocale: Mojo.Locale.current}, stageArguments);
		var url = this.calculateUrl(stageArgumentsWithLocale);
		
		var strWindowFeatures = "resizable=no,scrollbars=no,status=yes,width=320,height=" + stageHeight;
		if (Mojo.Host.current === Mojo.Host.palmSysMgr) {
			strWindowFeatures += (",attributes=" + Object.toJSON(stageArgumentsWithLocale));
		}

		var paramsFromURI = document.baseURI.toQueryParams();
		if (Mojo.Host.current === Mojo.Host.browser && paramsFromURI.mojoBrowserWindowMode === 'single') {
			newlyCreatedWindow = window;
			newlyCreatedWindow.name = stageName;
			newlyCreatedWindow.resizable = false;
			newlyCreatedWindow.scrollbars = false;
			newlyCreatedWindow.width = 320;
			newlyCreatedWindow.height = stageHeight;
			Element.setStyle(newlyCreatedWindow.document.body, {width: '320px', height: stageHeight + 'px'});
		} else {
			newlyCreatedWindow = window.open(url, stageName, strWindowFeatures);
		}
		if (newlyCreatedWindow) {
			newlyCreatedWindow._mojoStageType = stageArguments.window;
			if (stageArguments.lightweight) {
				newlyCreatedWindow._mojoLightweightWindow = true;
			}

			/* The framework will ask the app controller for this callback while initializing in the child window. */
			this._callbacks.set(stageName, onCreate);
			this._windowHash.set(stageName, newlyCreatedWindow);
			if (stageArguments.lightweight) {
				if (!Mojo.sourcesList) {
					Mojo.cloneStylesheets(document, newlyCreatedWindow.document);
					this._appController.finishOpenStage(newlyCreatedWindow);
				}
			}
		} else {
			Mojo.Log.warn("WARNING: window.open failed, often due to popup blockers in effect.");
		}
	},

	/** @private */
	callCreateStageCallback: function(stageName, stageController) {
		var cf = this._callbacks.get(stageName);
		if (cf) {
			var paramsFromURI = document.baseURI.toQueryParams();
			cf(stageController);
			if (Mojo.Host.current !== Mojo.Host.browser || paramsFromURI.mojoBrowserWindowMode !== 'single') {
				this._callbacks.unset(stageName);
			}
		}
	},

	/** @private */
	showScene : function (window, sceneName, argHash, dontReplaceExisting) {
		var i;
		if (this.stageExists(window)) {
			if (dontReplaceExisting === true) {
				return;
			}
			this.closeStage(window);
		}
		var createStageArgs = Object.extend({scene: sceneName,
			       windowName : window}, argHash);
		this._appController.createStage(createStageArgs);
    },

	/** @private */
    closeStage : function(windowName) {
		if (this.stageExists(windowName)) {
		    var windowToClose = this._windowHash.get(windowName);
		    this.removeStageRef(windowName, windowToClose);
		    windowToClose.close();
		} else {
		    Mojo.Log.warn("WARNING: WINDOW DIDNT EXIST AND ATTEMPTED TO CLOSE.\n\n\n") ;
		}

    },

	/** @private */
    closeAllStages : function() {
		var stageKeys = this._windowHash.keys();
		for (var i = 0; i < stageKeys.length; i++) {
			if(stageKeys[i] !== "_originalMojoCard") {
				this.closeStage(stageKeys[i]);
			}
		}
	},
	
	/** @private */
	allStageKeys : function() {
		return this._windowHash.keys();
	},

	/** @private */
    stageExists : function(windowName) {
		var windowHandle = this._windowHash.get(windowName);
		return (windowHandle !== undefined && windowHandle !== null && Object.keys(windowHandle).length > 0 && !windowHandle.closed);
    },
	
	/** @private */
	setStageRef : function(windowName, windowReference) {
	    this._windowHash.set(windowName, windowReference);			
	},

	/** @private */
    getStageRef : function(windowName) {
		var windowHandle = this._windowHash.get(windowName);
		if (windowHandle === null || (windowHandle && (windowHandle.closed || Object.keys(windowHandle).length === 0))) {
		    this.removeStageRef(windowName, windowHandle);
			return undefined;
		}
		return windowHandle;
    },

	/** @private */
    removeStageRef : function(windowName, windowReference) {
		var windowHandle = this._windowHash.get(windowName);
		if (windowHandle !== undefined && windowHandle === windowReference) {
		    this._windowHash.unset(windowName);			
		}
    },

	/** @private */
    focusStage : function(windowName) {
		if(this.stageExists(windowName)) {
		    this.getStageRef(windowName).focus();
		} else {
		    Mojo.Log.warn("attempting to focus on window but didn't exist " + windowName);
		}
    },

	/** @private */
	getActiveStageController: function(stageType) {
		if (Mojo.Controller.stageController && 
			(stageType === undefined || Mojo.Controller.stageController._mojoStageType === stageType) && 
			Mojo.Controller.stageController.isActiveAndHasScenes()) {
			return Mojo.Controller.stageController;
		}
		var stageKeys = this._windowHash.keys();
		var focusedChildStage;
		for (var i = stageKeys.length - 1; i >= 0; i--){
			var stageName = stageKeys[i];
			var stage = this._windowHash.get(stageName);
			if (stage && stage.Mojo && stage.Mojo.Controller && stage.Mojo.Controller.stageController && stage.Mojo.Controller.stageController.active && (stageType === undefined || stage._mojoStageType === stageType)) {
				focusedChildStage = stage;
			}
		}
		return focusedChildStage && focusedChildStage.Mojo.Controller.stageController;
	},

	/** @private */
	focusOrCreateStage : function(windowName, scene, args) {
		Mojo.Log.error("DEPRECATED: focusOrCreateStage. Use getStageController & focus or createStageWithCallback instead.");
		if(this.stageExists(windowName)) {
			this.focusStage(windowName);
		} else {
			this.showScene(windowName, scene, args, false);
		}
	}
});
