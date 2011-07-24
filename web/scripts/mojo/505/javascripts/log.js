/**
 * @name log.js
 * @fileOverview This file has functions related to logging.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
@namespace
@description 
The framework provides a set of logging methods aimed at providing an efficient 
way to output interesting information from a running application but not have 
it slow down the application.

There are three levels of logging, in descending order, info, warn and error, 
with corresponding methods {@link Mojo.Log.info}(), {@link Mojo.Log.warn}() and 
{@link Mojo.Log.error}().  Only messages at or below the current logging level 
are printed.

The reason these new logging APIs can keep an application from slowing down is 
that they don't end up constructing additional string objects unless the message 
is at a level where it will be printed. This isn't possible if you use 
console.log() and create the string to log by string addition. With these APIs, 
all the objects needed for logging are passed to the logging function, and only 
turned into strings if the message is actually going to be printed. This should 
make logging statements in an application pretty cheap, unless one is creating 
extra objects just for the purposes of logging.


#### Using logging ####

The logging methods are designed to work like the ones in the [Firebug Console 
API](http://getfirebug.com/console.html).

By default, all parameters passed to a logging function are concatenated together 
with a single space separating each parameter, using `Array.join()`

		Mojo.Log.info("I have", 3, "eggs.");
		
would output

		"I have 3 eggs."
		
You can also use a limited number of formatting characters, akin to those found in 
Java and C. For example:

		var favoriteColor = 'blue';
		Mojo.Log.info("My favorite color is %s.", favoriteColor);

would output

		My favorite color is blue.

Right now you can use %s, %d, %f, %i, %o and %j. The first four are essentially 
the same, although we might eventually support more sophisticated number formatting. 
%o converts the parameter to a string using Prototype'sObject.inspect(), while %j 
converts it using `Object.toJSON()`.

In desktop browsers, these messages will frequently be adorned based on the level. 
For MojoSysMgr I've added some text to the message and some delimiters to try to 
get the messages to stand out a little more.

#### Adding logging to your objects ####

If it feels inconvenient to have to type `Mojo.Log.[info|warn|error]` everywhere, 
you can add the logging methods to the prototype on your objects.

For example, the following line is used to add these logging methods to every scene 
controller:

		Mojo.Log.addLoggingMethodsToPrototype(Mojo.Controller.SceneController);

So in your scene assistants you can access the logging with

		this.controller.info("Welcome to the dollhouse.");

If you find yourself doing even more logging than that, you could add the logging 
methods directly to your scene assistant using the technique used for the scene 
controller.

#### Controlling logging ####

The current logging level is found in Mojo.Log.currentLogLevel, and defaults to 0. 
You can control the level of logging for your application by creating a file called 
framework_config.json in your application's directory that looks like

		{
			"logLevel": 99
		}

The values are

		Mojo.Log.LOG_LEVEL_ERROR = 0;
		Mojo.Log.LOG_LEVEL_WARNING = 10;
		Mojo.Log.LOG_LEVEL_INFO = 20;

*/
Mojo.Log = {};

/**
 * Create a logs on the console with a message and values.
 * @param {Object} message describe
 * @param {Object} values describe
 * @private
 */
Mojo.log = function(message, values) {
	if (console && console.log) {
		if (message.match(/#\{.*?\}/)) {
			Mojo.Log.warn("Mojo.log() with template evaluation is deprecated. Please use %%s-style format strings instead.");
			if (values) {
				var template = new Template(message);
				message = template.evaluate(values);
			}
			Mojo.Log.warn(message);			
		} else {
			Mojo.Log._logImplementation(Mojo.Log.LOG_LEVEL_INFO, $A(arguments));
		}
	}
};

/**
 * @private
 */
Mojo.Log.conditionalLogger = function() {
	if (this.loggingEnabled) {
		Mojo.Log.info.apply(Mojo, arguments);
	}
};


/**
 * Logs all the properties of an object. Handy for debugging.  Each property has its own line in the log.
 * @param {Object} obj object to dump
 * @param {Object} name name to show for object
 * @param {Object} includePrototype if true, also include properties inherited from a prototype
 */
Mojo.Log.logProperties = function(obj, name, includePrototype) {
	name = name || 'obj';

	Mojo.Log.info("Properties in object "+obj+':');
	if (console.dir) {
		console.dir(obj);
	} else {
		for(var propName in obj) {
			if(includePrototype || obj.hasOwnProperty(propName)) {
				Mojo.Log.info(name+"."+propName+" = "+obj[propName]);
			}
		}
	}
};

/**
 * Returns a string containing all the non-function properties of an object.
 * @param {Object} targetObject object which is the source of the properties.
 * @param {Object} includePrototype true if you want properties from the object's prototype as well.
 */
Mojo.Log.propertiesAsString = function propertiesAsString(targetObject, includePrototype) {
	var props = [];
	for(var propName in targetObject) {
		if(includePrototype || targetObject.hasOwnProperty(propName)) {
			var p = targetObject[propName];
			if (p && !Object.isFunction(p)) {
				props.push(propName + ":" + p.toString());
			}
		}
	}
	return "{" + props.join(", ") + "}";
};

/**
 * Log an exception.
 *
 * @param {Object} e	The exception to log.
 * @param {Object} msg	An optional message to prefix with exception log message.
 */
Mojo.Log.logException = function(e, msg) {
	var logMsg = "EXCEPTION";
	if (msg) {
		logMsg = logMsg + ' [' + msg + ']';
	}
	else {
		logMsg = logMsg;
	}
	if (e) {
		logMsg = logMsg + ', (' + e.name + '): "';

		if (e.message) {
			logMsg = logMsg + e.message;
		}
		logMsg = logMsg + '"';

		if (e.sourceURL) {
			logMsg = logMsg + ', ' + e.sourceURL;
		}
		if (e.line) {
			logMsg = logMsg + ':' + e.line;
		}
	}
	Mojo.Log.error(logMsg);
};

/**
 * Implements the mojo logging system, including suppressing messages below the current
 * logging limit and handling substitution and concatenation.
 * @private
 * @param {Number} messageLevel Numberic log level, where lower levels are more important and likely to be printed
 * @returns String that was logged, or undefined if the logging level wasn't high enough
 * @type String
 */
Mojo.Log._logImplementation = function _logImplementation (messageLevel, args) {
	var stringToLog;
	if (Mojo.Log.currentLogLevel >= messageLevel) {
		var formatString = args.shift();
		if (formatString) {
		  // make sure the format string is in fact a string
		  formatString = "" + formatString;
			var nextArgument = function(stringToReplace) {
				var target;
				if (stringToReplace === "%%") {
					return  "%";
				}
				
				target = args.shift();
				switch (stringToReplace) {
				case "%o":
					return Object.inspect(target);
				case "%j":
					return Object.toJSON(target);
				}

				return target;
			};
			var resultString = formatString.replace(/%[jsdfio%]/g, nextArgument);
			stringToLog = [resultString].concat(args).join(" ");
			var loggingFunction, banners = {};
			var makeBanners = function(label) {
				var appTitle = Mojo.appInfo.title || "foo";
				var loggingPrefix = label + ": ";
				return {loggingPrefix: loggingPrefix};
			};
			if (messageLevel <= Mojo.Log.LOG_LEVEL_ERROR) {
				loggingFunction = "error";
				banners = makeBanners("Error");
			} else if (messageLevel <= Mojo.Log.LOG_LEVEL_WARNING) {
				loggingFunction = "warn";
				banners = makeBanners("Warning");
			} else {
				loggingFunction = "info";
				banners = makeBanners("Info");
			} 
			if (console[loggingFunction]) {
				if (Mojo.Host.current !== Mojo.Host.browser && banners.loggingPrefix) {
					stringToLog = banners.loggingPrefix + stringToLog;
					if (banners.loggingSuffix) {
						stringToLog += banners.loggingSuffix;
					}
				}
				console[loggingFunction](stringToLog);				
			}
		}
	}
	return stringToLog;
};

/**
By default, all parameters passed to a logging function are concatenated together 
with a single space separating each parameter, using `Array.join()`

		Mojo.Log.error("I have", 3, "eggs.");

would output

		"I have 3 eggs."

See {@link Mojo.Log} for more info.

 */
Mojo.Log.error = function error () {
	Mojo.Log._logImplementation(Mojo.Log.LOG_LEVEL_ERROR, $A(arguments));
};

/**
By default, all parameters passed to a logging function are concatenated together 
with a single space separating each parameter, using `Array.join()`

		Mojo.Log.warn("I have", 3, "eggs.");

would output

		"I have 3 eggs."

See {@link Mojo.Log} for more info.
*/

Mojo.Log.warn = function warn () {
	if (Mojo.Log.currentLogLevel >= Mojo.Log.LOG_LEVEL_WARNING) {
		Mojo.Log._logImplementation(Mojo.Log.LOG_LEVEL_WARNING, $A(arguments));
	}
};

/**
By default, all parameters passed to a logging function are concatenated together 
with a single space separating each parameter, using `Array.join()`

		Mojo.Log.info("I have", 3, "eggs.");

would output

		"I have 3 eggs."

See {@link Mojo.Log} for more info.
*/
Mojo.Log.info = function info () {
	if (Mojo.Log.currentLogLevel >= Mojo.Log.LOG_LEVEL_INFO) {
		Mojo.Log._logImplementation(Mojo.Log.LOG_LEVEL_INFO, $A(arguments));
	}
};

/**
@constant
@description Error Log Level.
See {@link Mojo.Log} for more info.
 */
Mojo.Log.LOG_LEVEL_ERROR = 0;
/**
@constant
@description Warning Log Level.
See {@link Mojo.Log} for more info.
 */
Mojo.Log.LOG_LEVEL_WARNING = 10;
/**
@constant
@description Info Log Level.
See {@link Mojo.Log} for more info.
 */
Mojo.Log.LOG_LEVEL_INFO = 20;
Mojo.Log.currentLogLevel = Mojo.Log.LOG_LEVEL_ERROR;	

/**
 * @private
 * @param {Object} targetClass describe
 */
Mojo.Log.addLoggingMethodsToClass = function(targetClass) {
	targetClass.addMethods({log: Mojo.Log.conditionalLogger});
};

/**
 * Call to add standard logging methods to an object's prototype.
 * @param {Object} targetObject Object whose prototype should be extended with logging methods.
 */
Mojo.Log.addLoggingMethodsToPrototype = function(targetObject) {
	var methods = ["info", "warn", "error"];
	var addToPrototype = function(functionName) {
		if(targetObject.prototype[functionName] !== undefined) {
			Mojo.Log.warn("Overwriting existing method with logging method ", functionName);
		}
		targetObject.prototype[functionName] = Mojo.Log[functionName];
	};
	methods.each(addToPrototype);
};
