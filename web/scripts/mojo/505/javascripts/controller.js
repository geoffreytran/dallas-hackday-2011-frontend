/**
 * @name controller.js
 * @fileOverview This file has functions related to documenting the Mojo Controller;
 * see {@link Mojo.Controller} for more info.
 *
 * Copyright 2009 Palm, Inc.  All rights reserved.
 */

/*globals Event Mojo $ $LL PalmSystem */

/**
@namespace 
@name Mojo.Controller 
@description 
Nova's user experience architecture provides for a greater degree of application 
scope than is normally considered in a web application; to support this and 
specific functions of the framework, Palm has introduced a structure for Nova 
applications built around stages and scenes.

The framework has a number of Controller functions specifically designed to 
assist you in managing stages and scenes.


  1. See {@link Mojo.Controller.AppController}
  1. See {@link Mojo.Controller.StageController}
  1. See {@link Mojo.Controller.SceneController}


 

 */
Mojo.Controller = {};

/** @private */
Mojo.Controller.setup = function(){
	var paramsFromURI = document.baseURI.toQueryParams();
	Mojo.Controller.appInfo = Mojo.appInfo;
	if (Mojo.Host.current === Mojo.Host.browser && paramsFromURI.mojoBrowserWindowMode === 'single') {
		Mojo.Controller.appController = new Mojo.Controller.AppController();
		Mojo.requireDefined(Mojo.Controller.appController, "Mojo.Controller.appController must be defined.");
		Mojo.Controller.appController.setupAppAssistant();
		Mojo.relaunch();
		Mojo.Controller.setupStageController(window);		
	} else if (Mojo.Controller.isChildWindow(window)) { // only happens for heavyweight child stages
		Mojo.Controller.appController = Mojo.Controller.getAppController();
		Mojo.Controller.setupStageController(window);
	} else {
		Mojo.Controller.appController = new Mojo.Controller.AppController();
		Mojo.requireDefined(Mojo.Controller.appController, "Mojo.Controller.appController must be defined.");
		Mojo.Controller.appController.setupAppAssistant();
		if (Mojo.Controller.appInfo.noWindow) {
			if (Mojo.Host.current === Mojo.Host.browser){
				var launchPage = Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath('emulated-launch')});
				document.body.innerHTML = launchPage;
				$('faceless_launch_button').observe(Mojo.Event.tap, Mojo.Controller.doRelaunch);
			}

			Mojo.Controller.appController.frameworkHideSplashScreen();
		} else {
			Mojo.Controller.setupStageController(window);
		}
	}

};

/** @private */
Mojo.Controller.setupStageController = function setupStageController (stageWindow) {
	var stageProxy, sc;
	
	// For all stages, tell SysMgr we use simulated mouse clicks.
	if(stageWindow.PalmSystem && stageWindow.PalmSystem.useSimulatedMouseClicks) {
		stageWindow.PalmSystem.useSimulatedMouseClicks(true);
	}
	
	// If the app controller has a proxy for this stage, remove it & pass it into the StageController.
	stageProxy = Mojo.Controller.appController._stageProxies[stageWindow.name];
	sc = new Mojo.Controller.StageController(Mojo.Controller.appController, stageWindow, stageProxy);
	
	if (stageWindow._mojoLightweightWindow && !(Mojo.Host.current === Mojo.Host.browser && sc.paramsFromURI.mojoBrowserWindowMode === 'single')) {
		stageWindow.Mojo = {Controller: {stageController: sc}, 
							handleGesture: Mojo.handleGesture,
							handleSingleTap: Mojo.handleSingleTapForDocument.curry(stageWindow.document),
							sceneTransitionCompleted: Mojo.doNothing };
		
		if(stageWindow.PalmSystem && stageWindow.PalmSystem.stagePreparing) {
			stageWindow.PalmSystem.stagePreparing();
		}
		
	} else {
		Mojo.Controller.stageController = sc;
	}
	
	if ( ! stageWindow._mojoLightweightWindow ) {
		Mojo.View.setup();
	}
	Mojo.View.childSetup(stageWindow.document);
	
	sc.setupStageAssistant();		
	Mojo.Controller.appController.callCreateStageCallback(stageWindow.name, sc);
	// If the callback didn't push any scenes, we won't need the proxy and must
	// delete it now.
	if (!sc.hasPendingSceneOperations()) {
		sc.frameworkHideSplashScreen();
		sc.deleteProxy();
	}	
};

/** 
 * @private
 * Function used in mojo-host to simulate launch and relaunch.
*/
Mojo.Controller.doRelaunch = function doRelaunch() {
	$('launch_params').blur();
	var f = function() {
		PalmSystem.launchParams = $('launch_params').value;
		Mojo.relaunch();		
	};
	f.defer();
};


/** @private */
Mojo.Controller.assistantFunctionName = function(functionName) {
	return "assistant" + functionName.charAt(0).toUpperCase() + functionName.substring(1);
};

/** @private
 * @function 
 * @description Utility function to find out if the given window is a child window.
 * @returns {Boolean} true for child windows.
 */
Mojo.Controller.isChildWindow = function(theWindow) {
	// TODO: Remove this deprecated/legacy compatibility code
	if(!theWindow) {
		Mojo.Log.error("WARNING: Don't call Mojo.Controller.isChildWindow(), instead call isChildWindow() on the stage controller you're interested in.");
		theWindow = window;
	}
	return (theWindow.opener && theWindow.opener.Mojo !== undefined);
};

/**
Utility function to return a reference to the application controller. 
Works correctly in parent or child windows.

		@returns {Object} reference to the application controller


@field
 */
Mojo.Controller.getAppController = function() {
	if (window.opener && window.opener.Mojo && window.opener.Mojo.Controller && window.opener.Mojo.Controller.appController) {
		return window.opener.Mojo.Controller.appController;
	}
	Mojo.requireDefined(Mojo.Controller.appController);
	return Mojo.Controller.appController;
};

// Widget: Dialog Box
/** @private */
Mojo.Controller.notYetImplemented = function (optionalWindow) {
	Mojo.Controller.errorDialog(Mojo.View.nyiMessages[Math.floor(Math.random() * Mojo.View.nyiMessages.length)], optionalWindow);
};


/**
#### Overview ####
The simplest dialog case is a modal error dialog with a fixed dialog title of 'Error', a short message 
and an confirmation button. Dialogs are accessed through controller functions rather than as widgets. 
We've included them here because we think that fit more closely with the UI widgets than with the 
other UI APIs.


#### Function Call ####

		Mojo.Controller.errorDialog(message);


#### Arguments ####

		Argument        Type        Required    Default     Description     
		------------------------------------------------------------------------------------
	    message         String      Required    Null        Displayed message in modal dialog


#### Styles ####

	    Class Names                 Properties
		------------------------------------------------------------------------------------
	    TBD


@field
*/
Mojo.Controller.errorDialog = function (message, optionalWindow) {
	var targetWindow = optionalWindow || window;
	var targetStageController = targetWindow.Mojo && targetWindow.Mojo.Controller.stageController;
	var onChoose = Mojo.Controller._getAlertElem.bind(this, optionalWindow);
	var topScene;
	var widgetElem;
	
	if(!targetStageController) { return undefined; }
	
	topScene = targetStageController.topScene();

	if(!topScene) { return undefined; }
	
	widgetElem = topScene.showAlertDialog({
			title: $LL("Error"), message: message, onChoose: onChoose, choices: [{label: $LL("OK")}]});

	targetWindow.Mojo.Controller._openAlertDialog = widgetElem;

	return widgetElem;
};

/** @private */
Mojo.Controller.closeDialogBox = function(optionalWindow) {
	var alertElem = Mojo.Controller._getAlertElem();
	if(alertElem) {
		alertElem.mojo.close();
	}
};


/** @private */
Mojo.Controller._getAlertElem = function(optionalWindow, calledFromOnChoose) {
	var targetWindow = optionalWindow || window;
	var alertElem = targetWindow.Mojo && targetWindow.Mojo.Controller._openAlertDialog;

	delete targetWindow.Mojo.Controller._openAlertDialog;
	
	if(!alertElem || calledFromOnChoose) {
		return undefined;
	} else {
		return alertElem;
	}

};


// END Widget: Dialog Box

// Key Handlers
/** @private */
Mojo.Controller.isGoBackKey = function(event) {
	return (event.keyCode == Event.KEY_ESC);
};

/*
@constant
@description Constant for stage types

 1. popupAlert:	'popupalert'
 1. bannerAlert:	'banneralert'
 1. activeBanner:	'activebanner'
 1. dashboard:	'dashboard'
 1. card:		'card'
 1. stackedCard:	'childcard'

 */

Mojo.Controller.StageType = {
	popupAlert: 'popupalert',
	bannerAlert: 'banneralert',
	activeBanner: 'activebanner',
	dashboard: 'dashboard',
	card: 'card',
	stackedCard: 'childcard',
	dockMode: 'dockMode'
};
