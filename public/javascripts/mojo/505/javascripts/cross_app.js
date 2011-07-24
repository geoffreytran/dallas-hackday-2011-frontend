/**
 * @name cross_app.js
 * @fileOverview This file has functions related to documenting the Mojo Controller.
 * 
 * Cross-app scene pushing/popping is intended to allow one application to use a scene from another
 * application while maintaining the illusion that all the action is happening in the current application.
 *
 * The api for this will be to add an application ID to the scene parameters to pushScene. The framework will
 * take care of any inter-application communication needed on both ends. Right now this is done with the application
 * manager's open function, but it could change to something more direct in the future.
 *
 * At the moment, the cross application push causes a second card to open, but this will be corrected at some point.
 *
 * One restriction of this approach is that all parameters passed to and from this pushScene need to be able
 * to be converted to and from JSON format.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * Used to check if the launch parameters indicate this is a cross-application push related launch.
 * @private
 * @returns True if it is a cross-launch
 * @type Boolean
 */
Mojo.Controller.isCrossLaunch = function isCrossLaunch() {
	var launchParams = Mojo.getLaunchParameters();
	return launchParams.mojoCross !== undefined;
};

/**
 * Called by the framework in response to a cross application pop.
 * @private
 */
Mojo.Controller.handleCrossLaunchPop = function handleCrossLaunchPop() {
	var launchParams = Mojo.getLaunchParameters();
	var targetStage = Mojo.Controller.appController.getStageController(launchParams.sourceStageName);
	
	// If targetStage._crossAppProxyScene is not defined, then the proxy scene has 
	// probably already been popped, and the return value will be lost.
	if (targetStage && targetStage._crossAppProxyScene) {
		
		// First we need to tell the proxy scene that the target scene completed normally.
		// This allows us to differentiate from the case where code in the parent app popped the proxy scene, 
		// in which case we need to cancel the target one.
		targetStage._crossAppProxyScene.assistant.setCompleted(true);
		
		// Pop the source proxy scene, passing the appropriate return value back to our original caller.
		// We use a cross-app transition here, so sysmgr knows this is the "other half" of the cross-app pop.
		targetStage.popScene(launchParams.returnValue, {transition:Mojo.Transition.crossApp});
	}
};

/**
 * Called by the framework when the application receives a push request from another application.
 * @private
 * @param {Object} stageController Stage controller which should receive the pushed scene.
 */
Mojo.Controller.handleCrossLaunchPush = function handleCrossLaunchPush() {
	var launchParams = Mojo.getLaunchParameters();
	var augmentedSceneArguments = Object.extend({}, launchParams.originalSceneArguments);
	augmentedSceneArguments.mojoCrossLaunchPush = true;
	augmentedSceneArguments.transition = Mojo.Transition.none; // no transition when pushing target app scene, sysmgr handles it.
	
	var args = {
		sceneTemplate: Mojo.Widget.getSystemTemplatePath('cross-app-scene'),
		assistantConstructor: Mojo.Controller.CrossAppTargetAssistant,
		transition:Mojo.Transition.none, // no transition when pushing target proxy scene either.
		name: 'mojo-cross-app-target-proxy'
	};
	
	var f = function(stageController) {
		stageController.pushScene(args);
		try {
			stageController.pushScene.apply(stageController, [augmentedSceneArguments].concat(launchParams.remainingArguments));
		} catch (e) {
			Mojo.Log.logException(e, "Cross push failed.");
		}		
	};

	var stageName = "crossApp" + Date.now();
	var stageArgs = {
		name: stageName, 
		lightweight: true,
		parentidentifier: launchParams.sourceStageIdentifier
	};
	Mojo.Controller.appController.createStageWithCallback(stageArgs, f, Mojo.Controller.StageType.stackedCard);
};

/**
 * Called by the framework in response to a cross application callback.
 * @private
 */
Mojo.Controller.handleMojoCrossCallback = function handleMojoCrossCallback() {
	var launchParams = Mojo.getLaunchParameters();
	var targetStage = Mojo.Controller.appController.getStageController(launchParams.sourceStageName);
	if (targetStage) {
		var currentScene = targetStage.topScene();
		var assistant = currentScene.assistant;
		assistant.dispatchCallback(launchParams);
	}
};

/**
 * Called by the framework in response to a cross application callback response.
 * @private
 */
Mojo.Controller.handleMojoCrossCallbackResponse = function handleMojoCrossCallbackResponse() {
	var launchParams = Mojo.getLaunchParameters();
	var targetStage = Mojo.Controller.appController.getStageController(launchParams.sourceStageName);
	if (targetStage) {
		var currentScene = targetStage.topScene();
		var assistant = currentScene.assistant;
		var targetAssistant = targetStage.parentSceneAssistant(assistant);
		if (targetAssistant && targetAssistant.receiveResponse) {
			targetAssistant.receiveResponse(launchParams.callbackParams);			
		} else {
			Mojo.Log.warn("handleMojoCrossCallbackResponse: can't find assistant to call");
		}
	}
};

/**
 * Dispatcher function that handles cross push, pop or callback.
 * @private
 * @param {Object} controller Optional reference to the controller involved in the operation.
 */
Mojo.Controller.handleCrossLaunch = function handleCrossLaunch(controller) {
	var launchParams = Mojo.getLaunchParameters();
	if (launchParams.mojoCrossPush) {
		Mojo.Controller.handleCrossLaunchPush(controller);
	} else 	if (launchParams.mojoCrossPop) {
		Mojo.Controller.handleCrossLaunchPop();
	} else 	if (launchParams.mojoCrossCallback) {
		Mojo.Controller.handleMojoCrossCallback();
	} else 	if (launchParams.mojoCrossCallbackResponse) {
		Mojo.Controller.handleMojoCrossCallbackResponse();
	}
};

/**
 * Method called from _prepareNewScene to handle the cross app push. This method exists so that
 * all the cross app push functionality can be located in this file.
 * @private
 * @param {Object} sceneArguments The scene arguments intended for the remote push.
 * @param {Array} additionalArguments The remaining arguments for the remote push.
 * @returns An object containing the new scene arguments and remaining arguments for the local
 *			scene proxy.
 * @type Object
 */
Mojo.Controller.setupCrossAppPush = function setupCrossAppPush(sceneArguments, additionalArguments) {
	var newSceneArguments = {
		sceneTemplate: Mojo.Widget.getSystemTemplatePath('cross-app-scene'),
		assistantConstructor: Mojo.Controller.CrossAppSourceAssistant,
		name: 'mojo-cross-app-source-proxy'
	};
	var originalSceneArguments = Object.extend({}, sceneArguments);
	delete originalSceneArguments.appId;
	return {
		sceneArguments: newSceneArguments,
		additionalArguments: [sceneArguments.appId, originalSceneArguments, additionalArguments]
	};
};

/*
	=== Cross App Source Assistant ===
*/
/**
 * Constructor function for an object that is used as the scene assistant for a scene pushed 
 * in the source application during 
 * a cross-app push. It is responsible for making the request. Currently the framework takes care of
 * deliving the response to the previous scene on pop.	
 * @private @constructor
 * @param {String} appId Application ID of the application whose scene is being pushed.
 * @param {Object} originalSceneArguments Scene arguments passed to push scene, minus the appId argument.
 * @param {Array} remainingArguments Array of additional arguments passed to pushScene.
 */
Mojo.Controller.CrossAppSourceAssistant = function CrossAppSourceAssistant(appId, originalSceneArguments, remainingArguments) {
	this.appId = appId;
	this.originalSceneArguments = Object.extend({}, originalSceneArguments);
	this.remainingArguments = remainingArguments;
	this.handleLaunchFailure = this.handleLaunchFailure.bind(this);
	this.handleLaunchWorked = this.handleLaunchWorked.bind(this);
	this.handleCallback = this.originalSceneArguments.callbackHandler;
	if (this.handleCallback) {
		Mojo.requireFunction(this.handleCallback);
	}
	delete this.originalSceneArguments.callbackHandler;
};

/**
 * Uses the launch method to make the cross application push request.
 * @private
 */
Mojo.Controller.CrossAppSourceAssistant.prototype.setup = function setup() {
	var stage;
	var crossLaunchArgs = {
		mojoCross: true,
		mojoCrossPush: true,
		originalSceneArguments: this.originalSceneArguments,
		remainingArguments: this.remainingArguments,
		sourceStageName: this.controller.window.name,
		sourceStageIdentifier: this.controller.window.PalmSystem.identifier,
		sourceAppId: Mojo.Controller.appInfo.id
	};
	Mojo.Controller.appController.launch(this.appId, crossLaunchArgs, this.handleLaunchWorked, this.handleLaunchFailure);
	
	// Cross-app pushes must use the cross-app transition, so default to it.
	this.controller.defaultTransition = Mojo.Transition.crossApp;
	
	// Stages can't contain more than one cross-app proxy scene at a time.
	stage = this.controller.stageController;
	Mojo.require(!stage._crossAppProxyScene, "A stage's scene stack cannot have more than one cross-app scene.");
	
	// Save the proxy scene on the stage controller, so we can find it when needed.
	stage._crossAppProxyScene = this.controller;
	
};

Mojo.Controller.CrossAppSourceAssistant.prototype.activate = function activate() {
	// Change default transition we don't cause a cross-app transition to happen when we're popped.
	this.controller.defaultTransition = Mojo.Transition.none;
};

Mojo.Controller.CrossAppSourceAssistant.prototype.setCompleted = function setCompleted(value) {
	this.completed = value;
};

Mojo.Controller.CrossAppSourceAssistant.prototype.handleCommand = function(event) {
	
	// If we got an showAppMenu command, then we eat it and forward it to the target app by launching it with the secret command.
	if(event.type === Mojo.Event.command && event.command === Mojo.Menu.showAppCmd) {
		Mojo.Controller.appController.launch(this.appId, {'palm-command':'open-app-menu'});
		event.stop();
	}
};


Mojo.Controller.CrossAppSourceAssistant.prototype.cleanup = function cleanup() {
	var stage = this.controller.stageController;
	
	// If we've been popped before our target scene was pushed, we need to tell sysmgr to cancel it.
	if(!this.completed) {
		if(stage.window.PalmSystem.cancelCrossAppScene) {
			// DOLATER: This is likely not enough information for sysmgr, because the target app may have 
			// multiple cross-app scene stages... it may even have multiple ones pushed by THIS APP.
			stage.window.PalmSystem.cancelCrossAppScene(this.appId);
		} else {
			Mojo.Log.error("cancelCrossAppScene() not available, but we would have called it with", this.appId);
		}
	}
	
	if(stage._crossAppProxyScene !== this.controller) {
		Mojo.Log.error('CrossAppSourceAssistant cleaned up when stage._crossAppProxyScene is set to something else.');
	}
	
	delete stage._crossAppProxyScene;
	
};

/**
 * Handle a failure to launch the requested application.
 * @private
 */
Mojo.Controller.CrossAppSourceAssistant.prototype.handleLaunchFailure = function handleLaunchFailure(params) {
	this.controller.stageController.popScene({launchFailed: true});
};

/**
 * Handle a failure to launch the requested application.
 * @private
 */
Mojo.Controller.CrossAppSourceAssistant.prototype.handleLaunchWorked = function handleLaunchFailure(params) {
	if (params && (!params.processId || params.processId === "")) {
		this.handleLaunchFailure(params);
	}
};

Mojo.Controller.CrossAppSourceAssistant.prototype.dispatchCallback = function dispatchCallback(launchParams) {
	Mojo.assertArray(launchParams.callbackParams, "dispatchCallback requires an array.");
	this.targetStageName = launchParams.targetStageName;
	if (this.handleCallback) {
		var f = this.sendCallbackResponse.bind(this);
		var paramsWithResponseCallback = [f].concat(launchParams.callbackParams);
		this.handleCallback.apply(undefined, paramsWithResponseCallback);
	}
};

Mojo.Controller.CrossAppSourceAssistant.prototype.sendCallbackResponse = function sendCallbackResponse() {
	var crossLaunchArgs = {
		mojoCross: true,
		mojoCrossCallbackResponse: true,
		sourceStageName: this.targetStageName,
		callbackParams: $A(arguments)
	};
	Mojo.Controller.appController.launch(this.appId, crossLaunchArgs);
};

/*
	=== Cross App Target Assistant ===
*/
/**
 * Constructor function for an object that is used as the scene assistant for a scene pushed in the target
 * application during a cross application push. It is used to collect the results from the scene that
 * is pushed in order to send it back to the source application.
 * @private @constructor
 */
Mojo.Controller.CrossAppTargetAssistant = function CrossAppTargetAssistant() {
	var launchParams = Mojo.getLaunchParameters();
	this.originalSceneArguments = launchParams.originalSceneArguments;
	this.sourceAppId = launchParams.sourceAppId;
	this.sourceStageName = launchParams.sourceStageName;
};

Mojo.Controller.CrossAppTargetAssistant.prototype.aboutToActivate = function activate(returnValue) {
	var transition;
	
	// This is a hack to force the transition type to be 'cross-app' when popping the target app scene.
	// This is needed to give sysmgr a chance to snapshot the scene before the window closes. 
	transition = this.controller.stageController._currentTransition;
	if(transition) {
		transition.setTransitionType(Mojo.Transition.crossApp);
	} else {
		Mojo.Log.error("Cannot force cross-app transition on pop!");
	}
};

/**
 * Called by the framework when this scene is activated. The first time it does nothing,
 * since that happens when it is first pushed. The second time is when the desired scene
 * is popped, and it sends the return value back to the source application.
 * @private
 * @param {Object} returnValue Any return value passed to popScene.
 */
Mojo.Controller.CrossAppTargetAssistant.prototype.activate = function activate(returnValue) {
	var crossLaunchArgs = {
		mojoCross: true,
		mojoCrossPop: true,
		sourceStageName: this.sourceStageName,
		returnValue: returnValue
	};
	Mojo.Controller.appController.launch(this.sourceAppId, crossLaunchArgs);
	this.controller.window.close();		
};

Mojo.Controller.CrossAppTargetAssistant.prototype.sendCallback = function sendCallback() {
	var paramsToSend = $A(arguments);
	this.responseCallback = paramsToSend.shift();
	var crossLaunchArgs = {
		mojoCross: true,
		mojoCrossCallback: true,
		sourceStageName: this.sourceStageName,
		targetStageName: this.controller.stageController.window.name,
		callbackParams: paramsToSend
	};
	Mojo.Controller.appController.launch(this.sourceAppId, crossLaunchArgs);
};

Mojo.Controller.CrossAppTargetAssistant.prototype.receiveResponse = function receiveResponse(callbackParams) {
	if (this.responseCallback) {
		this.responseCallback.apply(undefined, callbackParams);
	}
};