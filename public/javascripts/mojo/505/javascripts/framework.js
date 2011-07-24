/* Copyright 2009 Palm, Inc.  All rights reserved. */

// ********************** IMPORTANT ********************** //
// This file is reserved for framework-wide functionality,
// not including any framework loading logic.
// ******************************************************* //
/*jslint evil: true */
/**
 * @name framework.js
 * @fileOverview This file contains framework-wide functionality.
 */
/**
 * @private
 * @namespace Holds framework-wide functionality
 */

Mojo.Config = {};

// WebKit may someday be whitelisting paths to be accessible by getResource().
Mojo.Config.MOJO_HOME = "/usr/palm/frameworks/mojo";
Mojo.Config.MOJO_FRAMEWORK_HOME = Mojo.Config.MOJO_HOME + Mojo.generateFrameworkHome();

Mojo.Config.REQUIRED_PROTOTYPE =  '1.6.0';

Mojo.Config.COMPONENT_TYPES = ["javascript", "template", "image", "stylesheet"];
Mojo.Config.TEMPLATES_HOME = Mojo.Config.MOJO_HOME + Mojo.generateFrameworkHome() + '/templates';
Mojo.Config.IMAGES_HOME = Mojo.Config.MOJO_HOME + Mojo.generateFrameworkHome() + '/images';
Mojo.Config.ACCOUNT_IMAGES_HOME = Mojo.Config.IMAGES_HOME + '/accounts';
Mojo.Config.CSS_HOME = Mojo.Config.MOJO_HOME + Mojo.generateFrameworkHome() + '/stylesheets';
Mojo.Config.JS_HOME = Mojo.Config.MOJO_HOME + Mojo.generateFrameworkHome() + '/javascripts';

Mojo.Config.debuggingEnabled = false;
Mojo.Config.loadStylesWithLink = true;

/**
 * @namespace Holds framework-wide environment functionality and settings.
 */
Mojo.Environment = {
};

/**
 * @constant 
 * @description AZERTY keyboard type
 */
Mojo.Environment.AZERTY = 'AZERTY';
/**
 * @constant 
 * @description accented AZERTY keyboard type
 */
Mojo.Environment.AZERTY_ACC = 'AZERTY_FR';

/**
 * @constant 
 * @description QWERTZ keyboard type
 */
Mojo.Environment.QWERTZ = 'QWERTZ';

/**
 * @constant 
 * @description accented QWERTZ keyboard type
 */
Mojo.Environment.QWERTZ_ACC = 'QWERTZ_DE';

/**
 * @constant 
 * @description QWERTY keyboard type
 */
Mojo.Environment.QWERTY = 'QWERTY';
/** @private */
Mojo.Environment.TOUCHABLE_ROW_HEIGHT = 48;

/** 
 * Provides information on the platform on which the application is running. 
 * It is a JSON object containing: 
 * <table border="1">
 * <tr><td>bluetoothAvailable</td><td>Boolean</td><td>True if bluetooth is available on device</td><tr> 
 * <tr><td>carrierName</td><td>String</td><td>Name of carrier</td><tr> 
 * <tr><td>coreNaviButton</td><td>Boolean</td><td>True if physical core navi button available on device</td><tr>
 * <tr><td>keyboardAvailable</td><td>Boolean</td><td>True if physical keyboard available on device</td><tr> 
 * <tr><td>keyboardSlider</td><td>Boolean</td><td>True if keyboard slider available on device</td><tr> 
 * <tr><td>keyboardType</td><td>String</td><td>Keyboard type (e.g. Mojo.Environment.QWERTY; refer to full list of keyboard types)</td></tr>
 * <tr><td>maximumCardWidth</td><td>Integer</td><td>Maximum card width in pixels</td></tr>
 * <tr><td>maximumCardHeight</td><td>Integer</td><td>Maximum card height in pixels</td></tr> 
 * <tr><td>minimumCardWidth</td><td>Integer</td><td>Minimum card width in pixels</td></tr>
 * <tr><td>minimumCardHeight</td><td>Integer</td><td>Minimum card height in pixels</td></tr>
 * <tr><td>modelName</td><td>String</td><td>Model name of device in UTF-8 format</td><tr> 
 * <tr><td>modelNameAscii</td><td>String</td><td>Model name of device in ASCII format</td><tr> 
 * <tr><td>platformVersion</td><td>String</td><td>Full OS version string in the form "Major.Minor.Dot.Sub"</td><tr> 
 * <tr><td>platformVersionDot</td><td>Integer</td><td>Subset of OS version string: Dot version number</td><tr> 
 * <tr><td>platformVersionMajor</td><td>Integer</td><td>Subset of OS version string: Major version number</td><tr> 
 * <tr><td>platformVersionMinor</td><td>Integer</td><td>Subset of OS version string: Minor version number</td><tr> 
 * <tr><td>screenWidth</td><td>Integer</td><td>Width in pixels</td></tr>
 * <tr><td>screenHeight</td><td>Integer</td><td>Height in pixels</td></tr> 
 * <tr><td>serialNumber</td><td>String</td><td>Device serial number</td><tr> 
 * <tr><td>touchableRows</td><td>Integer</td><td>Number of rows</td></tr>
 * <tr><td>wifiAvailable</td><td>Boolean</td><td>True if WiFi available on device</td><tr>
 * </table>
 * 
 * Use touchable rows to layout the screen of your application per the HI user interface guidelines. 
 *
 *@name Mojo.Environment.DeviceInfo 
 */
Mojo.Environment.__defineGetter__("DeviceInfo", function(){
	var height;
	var bannerHeight = 28; //from luna.conf 
	var touchableHeight;
	 
	delete this.DeviceInfo;
	this.DeviceInfo = Mojo.parseJSON(PalmSystem.deviceInfo);
	
	//this is an override only in the case we don't have touchableRows from PalmSystem.deviceInfo
	if (!this.DeviceInfo.touchableRows) {
		height = this.DeviceInfo.maximumCardHeight - bannerHeight;
		touchableHeight = Mojo.Environment.TOUCHABLE_ROW_HEIGHT; 
		this.DeviceInfo.touchableRows = Math.floor(height/ touchableHeight);
	}
	return this.DeviceInfo;
});

/**
 * @private
 * Boolean value, true if querySelector() and querySelectorAll are implemented in native code.
 */
Mojo.Environment.hasQuerySelector = function() {
	var hasQuerySelector = HTMLElement.prototype.querySelector !== undefined;

	// implement query selector if it's missing
	if(!hasQuerySelector){
		HTMLElement.prototype.querySelector = function(sel)
			{
				var results = this.select(sel);
				return results && results[0];
			};

		HTMLElement.prototype.querySelectorAll = function(sel)
			{
				return this.select(sel);
			};
	}

	return hasQuerySelector;
}();

/** @private */
Mojo.relaunch = function() {
	var result = false;
	try {
		Mojo.Log.info("Relaunch requested for application: " + Mojo.appName);
		Mojo.requireDefined(Mojo.Controller, "Mojo.Controller must be defined.");
		Mojo.requireFunction(Mojo.Controller.getAppController, "Mojo.Controller.getAppController must be a function.");
		var appController = Mojo.Controller.getAppController();
		Mojo.requireDefined(appController, "Mojo.Controller.getAppController() must return the application controller.");
		Mojo.requireFunction(appController.handleRelaunch, "Mojo.Controller.getAppController().handleRelaunch must be a function.");
		var params = Mojo.getLaunchParameters();
		Mojo.Controller.getAppController().handleRelaunch(params);
		result = true;
		// console.log("launchParams " + (Mojo.detectJSON(PalmSystem.launchParams) ? "is" : "is not") + " valid JSON" );
	} catch (e) {
		Mojo.Log.error("Relaunch failed.");
		Mojo.Log.logException(e, "Relaunch failed.");
		if (params) {
			Mojo.Log.logProperties(params, "relaunchParams");
		}
	}
	return result;
};

/**
 * @private
 */
Mojo.imagePath = function(file) {
	//search for the last /
	//if there is a ., then don't add on the default img extension
	var img = Mojo.Config.IMAGES_HOME + "/" + file;
	var lastSlash = img.lastIndexOf('/',0);
	if (img.indexOf('.', lastSlash) == -1) {
		img += Mojo.Config.DEFAULT_IMAGE_EXT;
	}
	return img;
};

/**
 * @private
 */
Mojo.templatePath = function(file) {
	return Mojo.Config.TEMPLATES_HOME + "/" + file + Mojo.Config.TEMPLATE_EXT;
};

/**
 * @private
 * description stylesheetPath function
 * @param {Object} file describe file param
 */
Mojo.stylesheetPath = function(file) {
	return Mojo.Config.CSS_HOME + "/" + file + Mojo.Config.CSS_EXT;
};

/**
 * @private
 * description javascriptPath function
 * @param {Object} file describe file param
 */
Mojo.javascriptPath = function(file) {
	return Mojo.Config.JS_HOME + "/" + file + Mojo.Config.JS_EXT;
};

/** @private */
Mojo.convertLaunchParams = function(launchParams) {
	if(!Object.isString(launchParams)) {
		Mojo.Log.warn("Warning: launch parameters in any format but JSON is deprecated.");
		return launchParams;
	}
	if(Object.isString(launchParams) && launchParams.isJSON()) {
		try {
			// Mojo.Log.info("launchParams is JSON");
			var params = launchParams.evalJSON();
			
			// hack fix for NOV-115876.
			// suppress Activity Manager block for v1 apps as some of them misbehave.
			// v1 apps cannot take advantage of Activity Manager as a receiving client.
			if (params && params.$activity && Object.keys(params).length === 1) {
				params = "";
			}
			
			return params;
		} catch (error) {
		}
	}
	if(Object.isString(launchParams)) {
		if (launchParams.length > 0) {
			Mojo.Log.warn("Warning: launch parameters in any format but JSON is deprecated.");			
		}
		return launchParams;
	}
	throw "Error, launch parameters are not valid! Must be a string in JSON format.";
};

/**
 * @private
 * describe getLaunchParameters function
 */
Mojo.getLaunchParameters = function() {
	return Mojo.convertLaunchParams(PalmSystem.launchParams);
};

// Don't change these
Mojo.Config.CORE_JS_FRAMEWORK_COMPONENTS = ["controller", "model", "service", "view"];

Mojo.Config.CORE_FRAMEWORK_COMPONENTS = Mojo.Config.CORE_JS_FRAMEWORK_COMPONENTS;

Mojo.Config.MOJO_PREFIX_PATTERN = /^mojo-.*/;

Mojo.Config.HTML_EXT = ".html.ejs";
Mojo.Config.JS_EXT = ".js";
Mojo.Config.CSS_EXT = ".css";
Mojo.Config.TEMPLATE_EXT = ".html";
Mojo.Config.DEFAULT_IMAGE_EXT = ".png";

/**
 * @private
 */
Mojo.generateFrameworkComponentPaths = function(name, componentType, localized, optionalVersion) {
	var paths = [];
	var componentDir;
	var fileExtension;
	var cssVersion = optionalVersion || "";

	var allowed;
	var i = 0;
	while (!allowed && i < Mojo.Config.COMPONENT_TYPES.length) {
		allowed = (Mojo.Config.COMPONENT_TYPES[i] == componentType);
		i++;
	}


	if(allowed){

		switch (componentType) {
			case "javascript":
				componentDir = "javascripts";
				fileExtension = Mojo.Config.JS_EXT;
				break;
			case "template":
				componentDir = "templates";
				fileExtension = Mojo.Config.TEMPLATE_EXT;
				break;
			case "images":
				componentDir = "images";
				fileExtension = ".png";
				break;
			case "stylesheet":
				componentDir = "stylesheets";
				fileExtension = Mojo.Config.CSS_EXT;
				if (cssVersion !== "") {
					fileExtension = "-" + cssVersion + fileExtension;
				}
				break;
		}

		if (localized) {
			paths.push(Mojo.Locale.frameworkLocalizedResourcePath + "/" + componentDir +  "/" + name + fileExtension);
			paths.push(Mojo.Locale.frameworkLanguageResourcePath + "/" + componentDir +  "/" + name + fileExtension);
			paths.push(Mojo.Locale.frameworkRegionResourcePath + "/" + componentDir +  "/" + name + fileExtension);
		} else {
			paths.push(Mojo.Config.MOJO_FRAMEWORK_HOME + "/" + componentDir +  "/" + name + fileExtension);
		}
		return paths;
	}
};

/** @private */
Mojo.loadJSONFile = function loadJSONFile (pathToFile, suppressWarning) {
	var resultingObject;
	try {
		var jsonText = palmGetResource(pathToFile, suppressWarning);
		if (jsonText) {
			resultingObject = Mojo.parseJSON(jsonText);		
		}
	} catch (e) {
		if (!suppressWarning && Mojo.Log) {
			Mojo.Log.error("Failed to load json file from '%s'", pathToFile);
			Mojo.Log.logException(e);			
		}
	}
	return resultingObject;
};

/** @private */
Mojo.loadAppInfo = function loadAppInfo() {
	Mojo.appInfo = {noWindow: false};
	var loadedInfo = Mojo.loadJSONFile(Mojo.appPath + "appinfo.json");
	Mojo.appInfo = Object.extend(Mojo.appInfo, loadedInfo);
};

/** @private */
Mojo.loadFrameworkConfigurationFrom = function(configSource) {
	var moreFrameworkConfig = Mojo.loadJSONFile(configSource + "framework_config.json", true);
	Mojo.Environment.frameworkConfiguration = Object.extend(Mojo.Environment.frameworkConfiguration, moreFrameworkConfig);
};

/** @private */
Mojo.loadFrameworkConfiguration = function() {
	var htmlEscapeOverride;
	var placesToLook;
	var defaultLoggingLevel = Mojo.Log.LOG_LEVEL_ERROR;
	var loadAllWidgets = (Mojo.Host.current === Mojo.Host.browser);
	
	if (Mojo.Host.current === Mojo.Host.browser) {
		defaultLoggingLevel = Mojo.Log.LOG_LEVEL_INFO;	
	}
	
	Mojo.Environment.frameworkConfiguration = {
		logLevel: defaultLoggingLevel,
		loadAllWidgets: loadAllWidgets
	};
	
	// This is a hack to prevent auto HTML escaping from being turned on by default for certain apps.
	// remove this legacy/deprecated code.
	htmlEscapeOverride = {
		"net.likeme": true,
		"com.zumobi.todayshow": true,
		"com.zumobi.mlb": true,
		"com.ulocate.app.where": true,
		"com.splashdata.app.splashid": true,
		"com.splashdata.app.mcraig": true,
		"com.splashdata.app.infopedia": true,
		"com.shortcovers.palm.pre": true,
		"com.pivotallabs.webos.tweed": true,
		"com.palm.pandora": true,
		"com.nytimes.reader": true,
		"com.match.mobile.palm": true,
		"com.markspace.mybookmarks": true,
		"com.markspace.missingsync": true,
		"com.lumoslabs.speed-brain": true,
		"com.linkedin.mobile": true,
		"com.handmark.app.stocks": true,
		"com.goodrec.app.goodfood": true,
		"com.flixster.app.movies": true,
		"com.flightview.palm": true,
		"com.fandango.app.fandango": true,
		"com.evernote.palm.app.evernote": true,
		"com.ea.connect4": true,
		"com.citysearch.mobile": true,
		"com.chapura.pocketmirror": true,
		"com.cakefight.sudoku": true,
		"com.beeweeb.gopayment": true,
		"com.apnews.webos": true,
		"com.accuweather.palm": true,
		"com.motionapps.app.classic": true,
		"com.funkatron.app.spaz": true
	};
	
	if(htmlEscapeOverride[Mojo.appInfo.id]) {
		Mojo.Environment.frameworkConfiguration.escapeHTMLInTemplates = false;
		Mojo.Config.compatibilityMode = true;
	}
	
	placesToLook = [Mojo.Config.MOJO_FRAMEWORK_HOME + "/", Mojo.appPath];
	placesToLook.each(Mojo.loadFrameworkConfigurationFrom);
};

/**
 * @private
 * describe loadFramework function
 */
Mojo.loadFramework = function() {
	var noSetInterval;

	if (Mojo.Host.current === Mojo.Host.browser) {
		var queryParams = document.URL.toQueryParams();
		PalmSystem.launchParams = queryParams.mojoHostLaunchParams || "{}";
		if (PalmSystem.launchParams === "undefined") {
			PalmSystem.launchParams = "{}";
		}
	}

	var match;
	Mojo.appPath = Mojo._calculateAppRootPath();
	Mojo.appName = Mojo._calculateAppName();
	
	Mojo.loadAppInfo();

	var re = /http:\/\/(.*:[0-9]+)/;
	match = document.baseURI.match(re);
	if (!match) {
		Mojo.hostingPrefix = "file://";
	} else {
		Mojo.hostingPrefix = match[0];
	}

	match = Mojo.loadString && Mojo.loadString.match(/mode=test/);
	if (match) {
		console.log("Framework in test mode.");
		Mojo.mode = "test";
	}

	if (Mojo.mode !== "production") {
		Mojo.Config.FRAMEWORK_COMPONENTS.each(function(c) {
			// HACK: We know that if the component isn't localized, there will only be one path
			document.write('<script type="text/javascript" src="' + Mojo.generateFrameworkComponentPaths(c, "javascript")[0] +'"><\/script>');
		});

		if (!window.palmService && !window.PalmServiceBridge) {
			// HACK: We know that if the component isn't localized, there will only be one path
			document.write('<script type="text/javascript" src="' + Mojo.generateFrameworkComponentPaths("service_emulation", "javascript")[0] + '"><\/script>');
		}
	}

	if (Mojo.mode !== "test") {
		Mojo.loadStylesheets();
	}
	
	if (Mojo.appInfo.noWindow && Mojo.Host.current !== Mojo.Host.browser && !window.opener) {
		noSetInterval = function() {
			Mojo.Log.warn("Cannot use the global setInterval function from a hidden window. Use window.setInterval from a visible window.");
		};
		window.setInterval = noSetInterval;
	}
	
};

/** @private */
Mojo.loadStylesheetsWithLink = function(stageDocument, localized) {
	var cssVersion = Mojo.appInfo["css-styling-version"];
	var targetDocument = stageDocument || document;
	var queryParams = targetDocument.URL.toQueryParams();
	var stageType = queryParams.window;
	var styleSheetList = ["global", "global-dev", "global-dark"];
	if (!stageType || stageType === 'card' || stageType === 'childcard' || stageType === 'menu' || stageType === 'dockMode') {
		if(Mojo.appInfo.theme === 'light') {
			styleSheetList = ["global", "global-dev"];
		}
		if (!Mojo.appInfo.noDeprecatedStyles) {
			styleSheetList.push("global-deprecated");
		}
	}
	else {
		styleSheetList = ["global-base", "global-notifications"];
	}

	styleSheetList.each(function(cssFileName) {
		Mojo.generateFrameworkComponentPaths(cssFileName, "stylesheet", localized, cssVersion).each(function(path) {
			Mojo.loadStylesheet(targetDocument, Mojo.hostingPrefix + path);
		});
	});
};

/**
 * Loads the stylesheets required by the framework.
 * @private
 * @param {Object} stageDocument Document to receive the stylesheets.
 * @param {Boolean} localized Pass true to load the locale-specific versions of the stylesheets.
 */
Mojo.loadStylesheetsWithPalmGetResource = (function() {
	var CACHE = {};
	
	function hash(files, localized) {
		return files.join('$') + !!localized;
	}
	
	return function(stageDocument, localized) {
		var cssVersion = Mojo.appInfo["css-styling-version"];
		var targetDocument = stageDocument || document;
		var queryParams = targetDocument.URL.toQueryParams();
		var stageType = queryParams.window;
		var styleSheetList = ["global", "global-dev", "global-dark"];
		if(Mojo.appInfo.theme === 'light') {
			styleSheetList = ["global", "global-dev"];
		}
		if (!Mojo.appInfo.noDeprecatedStyles) {
			styleSheetList.push("global-deprecated");
		}
		switch(stageType) {
			case 'popupalert':
			case 'banneralert':
			case 'activebanner':
			case 'dashboard':
				styleSheetList = ["global-base", "global-notifications"];
				break;
		}
		
		var key = hash(styleSheetList, localized), css = CACHE[key];
		if ( css === undefined ) {
			var sources = [];
			styleSheetList.each(function(cssFileName) {
				Mojo.generateFrameworkComponentPaths(cssFileName, "stylesheet", localized, cssVersion).each(function(path) {
					var source = palmGetResource(path);
					if ( source ) {
						sources.push(source);
					}
				});
			});
			css = CACHE[key] = sources.join('');
		}
		
		var style = targetDocument.createElement("style");
		style.type = "text/css";
		style.media = "screen";
		style.appendChild(targetDocument.createTextNode(css));
		Mojo.addElementToHead(targetDocument, style);
	};
})();

/**
 * Loads the stylesheets required by the framework.
 * @private
 * @param {Object} stageDocument Document to receive the stylesheets.
 * @param {Boolean} localized Pass true to load the locale-specific versions of the stylesheets.
 */
Mojo.loadStylesheets = function(stageDocument, localized) {
	if (Mojo.Host.current === Mojo.Host.browser || Mojo.Config.loadStylesWithLink) {
		Mojo.loadStylesheetsWithLink(stageDocument, localized);		
	} else {
		Mojo.loadStylesheetsWithPalmGetResource(stageDocument, localized);
	}
};

/**
 * Finds all the style sheet link tags in the source documents and replicates them in
 * the target document. Uses when setting up style sheets in lightweight stages.
 * @private
 * @param {Object} sourceDocument Document to provide the stylesheet links.
 * @param {Object} destinationDocument Document to receive the stylesheets.
 */
Mojo.cloneStylesheets = function cloneStylesheets(sourceDocument, destinationDocument) {
	var links = sourceDocument.querySelectorAll('link[type="text/css"]');
	for (var i=0; i < links.length; i++) {
		var path = links[i].href;
		Mojo.loadStylesheet(destinationDocument, path);
	}
};

/**
 * @private
 */
Mojo._calculateAppRootPath = function() {
	var appRootPath;

	var re = /file:\/\/\/.*\/(.*)\//;
	var match = document.baseURI.match(re);
	if (match) {
		// console.log("baseURI = " + document.baseURI);
		appRootPath = match[0];
	} else {
		re = /http:\/\/.*\//;
		match = document.baseURI.match(re);
		// console.log(document.baseURI);
		appRootPath = match[0];
	}
	// console.info("Application Root Path: " + appRootPath);
	return appRootPath;
};

/**
 * @private
 * Extracts the app name from the path to the calling app.  Probably
 * don't need to do this since there's an appIdentifier that should
 * match.  Might actually be a good sanity check to verify that the
 * appIdentifier on the document object matches this path and if not
 * throw an exception.
 */
Mojo._calculateAppName = function() {
	if (Mojo.appPath === undefined) {
		Mojo.appPath = Mojo._calculateAppRootPath();
	}
	var re = /\/+.*\/(.*)\/$/;
	var match = Mojo.appPath.match(re);
	var appName = "unknown";
	if (match) {
		appName = Mojo.appPath.match(re)[1];
	}
	//console.info("Application Name is: " + appName);
	return appName;
};

/**
 * @private
 */
Mojo._injectScript = function(path) {
	document.write('<script type="text/javascript" src="' + path + '"><\/script>');
};


Mojo._loadScriptQueue = [];


/**
 * @private
 */
Mojo._addToScriptQueue = function(scripts, onComplete, optionalDocument) {
	Mojo._loadScriptQueue.push({scripts: scripts, onComplete: onComplete, optionalDocument: optionalDocument});
	//is first in line. should execute.
	if(Mojo._loadScriptQueue.length == 1) {
		Mojo._executeNextInScriptQueue();
	} 
};

/**
 * @private
 */
Mojo._removeFromScriptQueue = function() {
	var first = Mojo._loadScriptQueue.shift();
	
	//execute the queued item's onComplete if it exists.
	if(first.onComplete) {
		first.onComplete();
	}

	//execute next if anyone waiting.
	if(Mojo._loadScriptQueue.length > 0) {
		Mojo._executeNextInScriptQueue();
	}
};

/**
 * @private
 */
Mojo._executeNextInScriptQueue = function() {
	var first = Mojo._loadScriptQueue[0];
	if(first.scripts && first.scripts.length > 0) {
		Mojo.loadScripts(first.scripts, Mojo._removeFromScriptQueue, first.optionalDocument);
	} else {
		Mojo._removeFromScriptQueue();
	}
};


/** @private @deprecated
 * Uses document.write to add a script tag to the currently loading document. Can only be
 * used during document load. Not recommended.
 *
 * @param {Object} path Path to the javascript file to be loaded.
 */
Mojo.loadScript = function(path) {
	Mojo._injectScript(path);
};

/**
 * Asynchronously load a JavaScript file by adding a script tag to the header of the document.
 * @param {String} path Path to the source file. If relative it is relative to the document.
 * @param {Function} callback Function that is called when the script either completes loading or fails to load.
 * @param {HTMLDocument} optionalDocument Document to which to add the script tag. Defaults to the global document.
 */
Mojo.loadScriptWithCallback = function(path, callback, optionalDocument) {
    var scriptTag;

	optionalDocument = optionalDocument || document;	
 	scriptTag = optionalDocument.createElement("script");
    scriptTag.src = path;
    scriptTag.type = "text/javascript";
	if (callback) {
		var f = function(event) {
			if (event.type === 'error') {
				Mojo.Log.error("warning, script load failed for " + event.target.src + ", either remove the script or fix the src path.");				
			}
			callback(event);
			Mojo.Event.stopListening(scriptTag, 'load', arguments.callee);
			Mojo.Event.stopListening(scriptTag, 'error', arguments.callee);
		};
		Mojo.Event.listen(scriptTag, 'load', f);
		Mojo.Event.listen(scriptTag, 'error', f);
	}
	Mojo.addElementToHead(optionalDocument, scriptTag);
};

/** @private */
Mojo.loadScripts = function loadScripts(collection, loadFinishedCallback, optionalDocument) {
	var sync, loadCallback;
	var collectionCopy = $A(collection);
	var syncCallback = loadFinishedCallback || Mojo.doNothing;
	var inMojoHost = (Mojo.Host.current === Mojo.Host.browser);
	
	optionalDocument = optionalDocument || document;
	
	function loadOneFile () {
		var sourceSpec = collectionCopy.shift();
		if (sourceSpec) {
			
			// Only load scripts which do not specify any scenes that cause them to be loaded,
			// or load everything if we're in MojoHost, so script names appear properly in the list.
			if(!sourceSpec.scenes || inMojoHost) {
				Mojo.loadScriptWithCallback(sourceSpec.source, loadOneFile, optionalDocument);
				collection.splice(collection.indexOf(sourceSpec), 1); // remove it now that it's loaded.
			} else {
				loadOneFile();
			}
			
		} else {
			syncCallback();
		}
	}
	
	loadOneFile();
};

/**
 * Adds an element to the head element of the target document, creating
 * the head element if needed.
 * @private
 * @param {Object} targetDocument Document to get the new head element.
 * @param {Object} element The new element
 */
Mojo.addElementToHead = function(targetDocument, element) {
	var h = Element.select(targetDocument, 'head')[0];
	if (h === undefined || h === null) {
		var fc = targetDocument.firstChild;
		h = targetDocument.createElement("head");
		fc.insertBefore(h, fc.firstChild);
	}
    h.appendChild(element);
};

/**
 * Adds a link statement to the header to load a stylesheet.
 * @private
 * @param {Object} targetDocument Document to get the new head element.
 * @param {String} targetDocument Full or document-relative path name.
 */
Mojo.loadStylesheet = function(targetDocument, path) {
    var link = targetDocument.createElement("link");
    link.href = path;
    link.type = "text/css";
    link.media = "screen";
    link.rel = "stylesheet";
	Mojo.addElementToHead(targetDocument, link);
};

/**
 * Synchronously loads the indicated script file, using eval().
 * Used to lazily load widget code as needed.
 * @private
 */
Mojo.loadScriptSync = function(filename) {
	var sourcesText;
	var loadedWidgets = arguments.callee.loadedWidgets;
		
	// We save the names of loaded files in a property on this function object.
	if(!loadedWidgets) {
		loadedWidgets = {};
		 arguments.callee.loadedWidgets = loadedWidgets;
	}
	
	// If we already loaded this file, just return.
	if(loadedWidgets[filename]) {
		return;
	}
	
	// Otherwise, remember that we processed it so we don't do it again.
	loadedWidgets[filename] = true;
	
	// Actually load the code & eval() it.
	filename = Mojo.Config.MOJO_FRAMEWORK_HOME + "/javascripts/"+filename+'.js';
	sourcesText = palmGetResource(filename, true);
	if(sourcesText) {
		eval(sourcesText);
	} else {
		Mojo.Log.warn("warning, script load failed for " + filename + ", either remove the script or fix the src path.");				
	}
};

/**
 * Loads the indicated widget, including any dependencies.
 * Called by widget instantiation code when needed.
 * @private
 * @param {String/Array} widgetName Name of widget constructor function required to be loaded.
 */
Mojo.loadWidget = function(widgetName) {
	Mojo.applyToWidgetFiles(widgetName, Mojo.loadScriptSync);
};

/**
 * Given the name of a widget constructor function, and another function, 
 * looks up the widget in our table and applies the function to each filename needed to load the widget's code.
 * @private
 */
Mojo.applyToWidgetFiles = function(widgetName, func) {
	var files = Mojo.Config.JS_FRAMEWORK_WIDGETS[widgetName];
	var i;

	// If it's not in our widget list, we have nothing to do.
	if(files === undefined) {
		return;
	}
		
	// no longer need to remember how to load this widget.
	delete Mojo.Config.JS_FRAMEWORK_WIDGETS[widgetName];

	// If it's null, use 'default' value.
	files = files || ('widget_'+widgetName).toLowerCase();

	// 'files' must be an array or string.
	// If it's an array, load each filename in order.
	if(typeof files === "string") {
		func(files);
	}
	else {		
		for(i=0; i<files.length; i++){
			func(files[i]);
		}
	}
};

/**
 * Given an array of scene names, looks up and loads the needed source files from sources.json.
 * Each source file in sources.json may be tagged with a 'scenes' property containing the 
 * scene name or array of scene names that require that source file.  Sources which
 * specify this property will not be loaded at app launch time, instead they'll be loaded 
 * when the scene requiring them is pushed.
 * @private
 */
Mojo.loadScriptsForScenes = function(scenes, onComplete) {
	var whichScene, i, source, sceneName;
	var scripts = [];

	// Call onComplete immediately if we have no sources to load.
	if(!scenes || scenes.length === 0 || !Mojo.sourcesList) {
		onComplete();
		return;
	}
	
	// For each scene we're pushing, search the sources list and build an array of needed sources.
	// Note that the ordering is important: scripts are loaded in the order their scenes are pushed, 
	// and then in the order they're defined in source.json.
	for(whichScene=0; whichScene<scenes.length; whichScene++) {
		sceneName = scenes[whichScene];
		
		for(i=0; i<Mojo.sourcesList.length; i++) {
			source = Mojo.sourcesList[i];

			if( source.scenes === sceneName || 	// check for string match here, then array match below.
					(source.scenes && !Object.isString(source.scenes) && source.scenes.include && source.scenes.include(sceneName))) {
				
				delete source.scenes;	// Remove this so loadScripts will actually load it.
				scripts.push(source);
				
				// It only needs to be loaded once, so remove it.
				Mojo.sourcesList.splice(i, 1);
				i--;
			}
		}
	}
	
	Mojo._addToScriptQueue(scripts, onComplete);	
};

Mojo.handleWindowClosed = Mojo.doNothing;

/**
 * Called by SysMgr when a memory condition changes.  Params is an object with a "state" string property,
 * which can have values "low", "critical", "normal".  Gives the app a chance to handle the condition.
 * @private	
*/
Mojo.lowMemoryNotification = function(params) {
	Mojo.Event.send(document, Mojo.Event.lowMemory, {
		data: params
	});
};

/*
	These components are always loaded at app launch time.
	Widgets should no longer be included in this list -- they are loaded lazily, using the JS_FRAMEWORK_WIDGETS configuration below.
*/
Mojo.Config.JS_FRAMEWORK_COMPONENTS = [
	"log", "controller_app", "controller_commander", "controller_scene", "controller_stage", "cookie", 
	"animation", "animation_generator", "depot", "widget_controller", "widget", 
	"format", "format_phonenumber",
	"event", "eval", "assert", "gesture", "locale", "ste_options",
	"dragndrop", "noderef",
	"widget_scroller", "widget_menu",
	"patternmatching", "keycodes", "filepicker", 
	"test", "function", "cross_app", "transitions", "keymatcher", "container", "activerecordlist",
	"timing",
	"scene"
];

/*
	The framework widgets are loaded lazily, as needed.
	The object consists of properties mapping widget constructor function names to the javascript files required by them.
	The value of these properties may be:
	String, the given filename will be loaded.
	Array, all filenames in the array will be loaded.
	null, the default filename of "widget_"+<property_name> will be loaded.
	
	All files must be located in the framework javascripts directory and end with '.js'.	
*/
Mojo.Config.JS_FRAMEWORK_WIDGETS = {
	
	ListSelector: null,  
	_AlertDialog: 'widget_alert', 
	WebView: ['widget_webview'],
	ExperimentalComboBox: 'widget_combobox',
	ToggleButton: null, 
	CheckBox: ['widget_togglebutton', 'widget_checkbox'], 
	RadioButton: null, 
	PeoplePicker: ['widget_peoplepicker', 'peoplepickermockdata'], 
	ContactsService: ['widget_peoplepicker', 'peoplepickermockdata'], // TODO: Should this be in the public widget namespace?
	ImageView: null, 
	ImageViewCrop: null, 
	TextField: null,
	SmartTextField: ['widget_smarttextfield'],
	TruncTextField: ['widget_textfield'],
	RichTextEdit: null,
	PasswordField: ['widget_textfield', 'widget_passwordfield'], 
	FilterField: 'widget_filterfield',
	Spinner: null,
	List: ['bigarray', 'widget_list'],
	_Dialog: 'widget_dialog', 
	Pager: null, 
	Drawer: null, 
	CharSelector: null, 
	FilterList: null, 
	_Submenu: 'widget_submenu', 
	ExperimentalGridList: 'widget_grid', 
	Slider: null, 
	ProgressPill: null, 
	Button: null, 
	ProgressBar: ['widget_progresspill', 'widget_progressbar'], 
	Progress: ['widget_progresspill', 'widget_progressbar'], 
	ProgressSlider: ['widget_progresspill', 'widget_progressslider'], 
	ExperimentalWrapAround: 'widget_wrap_around',
	_PickerPopup: 'widget_pickerpopup',
	TimePicker: ['widget_pickerpopup', 'widget_datetimepicker'],
	DatePicker: ['widget_pickerpopup', 'widget_datetimepicker'],
	IntegerPicker: ['widget_pickerpopup', 'widget_datetimepicker'],
	ExperimentalForm: ['widget_form'],
	ExperimentalDataDiv: ['widget_datadiv']
};

Mojo.Config.JS_FRAMEWORK_SCENES = {
	
};

Mojo.Config.FRAMEWORK_COMPONENTS = Mojo.Config.CORE_FRAMEWORK_COMPONENTS.concat(Mojo.Config.JS_FRAMEWORK_COMPONENTS);

/** @private */
function simulatePalmGetResource(pathToResource) {
	var uri = pathToResource;
	var responseText = null;
	var request = new Ajax.Request(uri, {
		method: 'get',
		asynchronous: false,
		evalJS: false,
		parameters: {"palmGetResource": true},
		onSuccess: function(transport) {
			responseText = transport.responseText;
		}
	});
	return responseText;
}

// Check to see if we're running on mojo-host once
// remove this once we find a better way to detect that we're in a child window
Mojo.hasPalmGetResource = !!window.palmGetResource;
Mojo.Host = {mojoHost: 'mojo-host', browser: 'mojo-host', palmSysMgr: 'palm-sys-mgr'};
Mojo.Host.current = Mojo.hasPalmGetResource ? Mojo.Host.palmSysMgr : Mojo.Host.browser;

if (window.palmGetResource === undefined) {
	window.palmGetResource = simulatePalmGetResource;		
}

if (window.PalmSystem === undefined) {
	/** @private */
	var simAddBanner = function simulateAddBannerMessage () {
		Mojo.Log.info("Banner: %s", $A(arguments).join(","));
	};
	var simPlaySoundNotification = function simPlaySoundNotification(soundClass, soundFile) {
		Mojo.Log.info("playSoundNotification: ", soundClass, soundFile);		
	};
	var paramsFromURI = document.baseURI.toQueryParams();
	window.PalmSystem = {
		deviceInfo: '{"screenWidth": ' + document.width + ', "screenHeight": ' + document.height + ', "minimumCardWidth": ' + document.width + ', "minimumCardHeight": 188, "maximumCardWidth": ' + document.width + ', "maximumCardHeight": ' + document.height + ', "keyboardType": "QWERTY"}',
		launchParams: paramsFromURI.launchParams || "{}",
		addBannerMessage: simAddBanner,
		removeBannerMessage: function() {},
		clearBannerMessages: function() {},
		simulateMouseClick: function() {},
		stageReady: function() {},
		playSoundNotification: simPlaySoundNotification,
		runTextIndexer: function(a) { return a;},
		version: "mojo-host",
		simulated: true,
		timeFormat: "HH12",
		locale: paramsFromURI.mojoLocale || "en_us",
		localeRegion: paramsFromURI.mojoLocaleRegion || "en_us",
		screenOrientation: 'up',
		windowOrientation: 'up',
		receivePageUpDownInLandscape: function() {},
		enableFullScreenMode: function() {},
		setWindowProperties: function() {},
		identifier: Mojo._calculateAppName(),
		isMinimal: false
	};		
}

// We have to do this here, because in luna-host, PalmSystem isn't defined until now.
Mojo.Environment.version = PalmSystem.version;


/**
 * Provides the build number to applications. Use this to determine if the feature you need is available in this device's build of version 1 framework
 * @since 1.2
 */
Mojo.Environment.build = Mojo.Version.use;

/** @private */
Mojo.loadAllWidgets = function loadAllWidgets () {
	var widgets = Mojo.Config.JS_FRAMEWORK_WIDGETS;
	var allFiles = {};
	var propName;
	var filesToLoad = [];
	
	// local function for adding a filename to the global framework components list.
	// It uses 'allFiles' to ensure we don't add a file more than once.
	var addToLoadList = function(filename) {
		if(!allFiles[filename]) {
			filename = Mojo.Config.MOJO_FRAMEWORK_HOME + "/javascripts/"+filename+'.js';
			filesToLoad.push({source: filename});
			allFiles[filename] = true;
		}
	};
	
	// Iterate through widgets, adding all the files to the main components list.
	for(propName in widgets) {
		if(widgets.hasOwnProperty(propName)) {
			Mojo.applyToWidgetFiles(propName, addToLoadList);
		}
	}
	Mojo._addToScriptQueue(filesToLoad);
};

/*
	In mojo-host we load all the widgets with the rest of the framework, 
	so the filenames show up properly in the script menu.
*/
//Previously, widgets were only not lazy loaded when using luna or palm-host: 
//Mojo.Host.current === Mojo.Host.browser; we are turning off lazy widget loading for performance reasons assuming a built-in framework
//For later timing, each load of a unique widget on a scene / apps takes approximately 40ms
if(Mojo.mode !== 'production') { 
	(function(){
		var widgets = Mojo.Config.JS_FRAMEWORK_WIDGETS;
		var allFiles = {};
		var propName, files, i;
		
		// local function for adding a filename to the global framework components list.
		// It uses 'allFiles' to ensure we don't add a file more than once.
		var addToComponents = function(filename) {
			if(!allFiles[filename]) {
				Mojo.Config.FRAMEWORK_COMPONENTS.push(filename);
				allFiles[filename] = true;
			}
		};
		
		// Iterate through widgets, adding all the files to the main components list.
		for(propName in widgets) {
			if(widgets.hasOwnProperty(propName)) {
				Mojo.applyToWidgetFiles(propName, addToComponents);
			}
		}
	})();
}


/**
 * A simple empty function useful as a stub.
 */
Mojo.doNothing = function() {};


/**
 * @deprecated Callback for sysmgr on transition completion
 */
Mojo.sceneTransitionCompleted = Mojo.doNothing;

/**
 * @private
 * describe createWithArgs
 * @param {Object} constructorFunction description
 * @param {Object} constructorArguments description
 */

(function() {
	function WrapperFunc(ctor, args) {
		ctor.apply(this, args);
	}
	
	Mojo.createWithArgs = function(constructorFunction, constructorArguments) {
		WrapperFunc.prototype = constructorFunction.prototype;
		return new WrapperFunc(constructorFunction, constructorArguments);
	};
})();

/**
 * @private
 * describe identifierToCreatorFunctionName
 * @param {Object} sceneName describe
 * @param {Object} suffix describe
 */
Mojo.identifierToCreatorFunctionName = function(sceneName, suffix) {
	suffix = suffix || "Assistant";
	var className = sceneName.camelize();
	return className.charAt(0).toUpperCase() + className.substring(1) + suffix;
};

/**
 * @private
 * describe findConstructorFunction
 * @param {Object} functionName describe
 */
Mojo.findConstructorFunction = function(functionName) {
	if (!functionName) {
		return undefined;
	}
	var sourceObject = window;
	var nameParts = functionName.split(".");
	var lastPart = nameParts.pop();
	var part = nameParts.shift();
	while (part) {
		sourceObject = sourceObject[part];
		if (sourceObject === undefined) {
			return sourceObject;
		}
		part = nameParts.shift();
	}
	var constructorFunction = sourceObject[lastPart];
	if (constructorFunction) {
		Mojo.requireFunction(constructorFunction);
	}
	return constructorFunction;
};

/**
 * describe Parses a text string of encoded in JSON, returning a JavaScript object (result) when successful
 * @param {String} jsonText input string with encoded JSON
 */

Mojo.parseJSON = function(jsonText) {
	var result;
	var nativeParserFailed = false;
	if(window.JSON && JSON.parse) {
		try {
			result = JSON.parse(jsonText);
		} catch (e) {
			Mojo.Log.error("ERROR: native parser didn't like '" + jsonText + "'");
			Mojo.Log.logException(e, "JSON.parse");
			nativeParserFailed = true;
		}
		if (nativeParserFailed) {
			result = jsonText.evalJSON(true);
		}
	} else {
		result = jsonText.evalJSON(true);
	}
	return result;
};

/** @private */
Mojo.enhancePrototype = function() {
	ObjectRange.addMethods({
		length: function() {
			return this.realEnd() - this.start;
		},

		realEnd: function() {
			if (this.exclusive) {
				return this.end;
			}
			return this.end + 1;
		},

		toString: function() {
			if (this.exclusive) {
				return this.start + ".." + this.end;
			}
			return this.start + "..." + this.end;
		},

		intersect: function(otherRange) {
			var newStart = Math.max(this.start, otherRange.start);
			var newEnd = Math.min(this.realEnd(), otherRange.realEnd());
			if (newEnd < newStart) {
				return $R(newStart, newStart);
			}
			return $R(newStart, newEnd);
		}
	});

	Object.extend(String.prototype, {
		constantize: function() {
			return this.strip().gsub(" ", "_").toUpperCase();
		}
	});

}();

/**
 * @private
 */
Mojo.installExtensions = function() {
	if (Date.now === undefined) {
		Date.now = function() {
			return new Date().getTime();
		};
	}
	
};

/**
 * @private
 */
Mojo.removeAllEventListenersRecursive = function(element) {
	if(element.removeAllEventListenersRecursive) {
		element.removeAllEventListenersRecursive();
	}
};


/**
 * @private
 */
Mojo.continueSetupFramework = function() {
	Mojo.View.setup();
	Mojo.View.childSetup(document);
	Mojo.Gesture.setup(document);
	Mojo.SteOptions.setup(window);
	Mojo.Animation.setup(window);
	Mojo.Controller.setup();
	Mojo.Format.setup();
};

/**
 * @private
 */
Mojo.loadApplicationSources = function() {
	var sourcesText = palmGetResource(Mojo.appPath + "sources.json", true);
	if (sourcesText) {
		// Some early apps have invalid json in their sources.json files.
		// Remove this legacy compatibility code in v2.
		if(Mojo.Config.compatibilityMode) {
			Mojo.sourcesList = sourcesText.evalJSON();
		} else {
			Mojo.sourcesList = Mojo.parseJSON(sourcesText);
		}
		Mojo._addToScriptQueue(Mojo.sourcesList, Mojo.continueSetupFramework);
	} else {
		Mojo.continueSetupFramework();
	}
};

/** @private */
Mojo.Environment.applyConfiguration = function(configurationObject) {
	var propertyName;
	for(propertyName in configurationObject) {
		if(configurationObject.hasOwnProperty(propertyName)) {
			switch(propertyName) {
			case "logLevel":
				Mojo.Log.currentLogLevel = configurationObject.logLevel;
				break;
			case "logEvents":
				Mojo.Event.logEvents = configurationObject.logEvents;
				break;
			case "timingEnabled":
				Mojo.Timing.enabled = configurationObject.timingEnabled;
				break;
			case "escapeHTMLInTemplates":
				Mojo.View.escapeHTMLInTemplates = configurationObject.escapeHTMLInTemplates;
				break;
			case "debuggingEnabled":
				Mojo.Config.debuggingEnabled = configurationObject.debuggingEnabled;
				break;
			case "animateWithCSS":
				Mojo.Config.animateWithCSS = configurationObject.animateWithCSS;
				break;
			}
		}
	}
};

/**
 * @private
 */
Mojo.setupFramework = function() {
	Mojo.loadFrameworkConfiguration();
	if (Mojo.Environment.frameworkConfiguration.loadAllWidgets) {
		Mojo.loadAllWidgets();
	}
	Mojo.Environment.applyConfiguration(Mojo.Environment.frameworkConfiguration);
	Mojo.Log.info("Requested submission : " + Mojo.Version.use);
	if(Mojo.Version.warnAboutSubmissionMethod) {
		Mojo.Log.warn("Using 'mojo.js?submission=n' is deprecated. Please use x-mojo-submission=n to specify a submission.");
	}
	if(Mojo.Version.use === 'trunk') {
		Mojo.Log.info("Using framework trunk. To avoid being broken by updates to the framework trunk please specify a submission.");
	}
	Mojo.installExtensions();
	Mojo.Locale.set(PalmSystem.locale, PalmSystem.localeRegion);
	Mojo.loadApplicationSources();
};

/**
 * @private
 */

Mojo.loadFramework();

/**
 * @private
 */
window.addEventListener('load', function(e) {
	Mojo.setupFramework();
});
