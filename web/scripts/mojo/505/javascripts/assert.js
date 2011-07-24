/**
@name assert.js
@fileOverview Collection of assertion methods to use in the framework and applications to catch runtime errors.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

Mojo._assertLog = function(message, warnOrError) {
	warnOrError = warnOrError || "warn";
	Mojo.Log[warnOrError](message);
};



/**
@name Mojo.assert
@description Writes an error to the log if expression doesn't evaluate to boolean true.

The Mojo.require or Mojo.assert methods will do the same, except that require will throw an exception when their requirements
aren't met. These are intended to be used in cases where framework code or application cannot reasonably continue
if the requirements aren't met.

Example:

		Mojo.assert(dogs > 3, "expected dogs to be greater than #{count}, but it was #{amount}", {count: 3, amount: dogs})


@param {Boolean}	expression expression that must evaluate to true
@param {String}		message a custom message to use if the assertion fails. This message
        	        will be run through template evaluation against the messageProperies
            	    object, so you can include details of the assertion failure in the message.
@param {Object} 	messageProperties object containing values to use with template evaluation.
@returns {String} 	the message that was written to the log.

@function
 */

/**
@name Mojo.require
@description Writes an error to the log if expression doesn't evaluate to boolean true.

The Mojo.require or Mojo.assert methods will do the same, except that Mojo.require will throw an exception when its requirements
aren't met. The Mojo.requireXxxx methods are intended to be used in cases where framework code or application cannot reasonably continue
if the requirements aren't met.

Example:

		Mojo.require (dogs > 3, "expected dogs to be greater than #{count}, but it was #{amount}", {count: 3, amount: dogs})


@param {Boolean}	expression expression that must evaluate to true
@param {String}		message a custom message to use if the assertion fails. This message
        	        will be run through template evaluation against the messageProperies
            	    object, so you can include details of the assertion failure in the message.
@param {Object} 	messageProperties object containing values to use with template evaluation.
@returns {String} 	the message that was written to the log.

@function
 */
Mojo._assertInternal = function(logLevel, expression, message, messageProperties) {
	if (!expression) {
		if (messageProperties) {
			var template = new Template(message);
			message = template.evaluate(messageProperties);
		} else if (!message) {
			message = "assertion failed";
		}
		Mojo._assertLog(message, logLevel);
		return message;
	}
	return "";
};

Mojo._assert = function(expression, message, messageProperties) {
	return Mojo._assertInternal(arguments.callee.__logLevel, expression, message, messageProperties);
};

/**
@name Mojo.assertFalse
@description
Writes an error to the log if expression evaluates to boolean true.

@param {Boolean} expression expression that must evaluate to false
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */

/**
@name Mojo.requireFalse
@description
Writes an error to the log if expression evaluates to boolean true and throws an exception.

@param {Boolean} expression expression that must evaluate to false
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */
Mojo._assertFalse = function(value, message, messageProperties) {
	return Mojo._assertInternal(arguments.callee.__logLevel, !value, message, messageProperties);
};

/**
@name Mojo.assertEqual
@description
Writes an error to the log if expected === actual is not true.

@param {anything} expected expected value
@param {anything} actual actual value
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string

@function
 */

/**
@name Mojo.requireEqual
@description
Writes an error to the log if expected === actual is not true and throws an exception.

@param {anything} expected expected value
@param {anything} actual actual value
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string

@function

 */

Mojo._assertEqual = function(expected, actual, message, messageProperties) {
	if (!message) {
		message = "'#{expected}' was expected, but it was '#{actual}' instead.";
		messageProperties = {actual: actual, expected: expected};
	}
	return Mojo._assertInternal(arguments.callee.__logLevel, expected === actual, message, messageProperties);
};


/**
@name Mojo.assertMatch
@description
Writes an error to the log if the regex doesn't match the testValue.

@param {Regex} regex regex to match
@param {String} testValue string to attempt to match against the regex.
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */

/**
@name Mojo.requireMatch
@description 
Writes an error to the log if the regex doesn't match the testValue and throws an exception. 

@param {Regex} regex regex to match
@param {String} testValue string to attempt to match against the regex.
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */
Mojo._assertMatch = function(regex, testValue, message, messageProperties) {
	if (!message) {
		message = "'#{regex}' was expected to match #{testValue}, but didn't";
		messageProperties = {regex: regex, testValue: testValue};
	}
	return Mojo._assertInternal(arguments.callee.__logLevel, testValue.match(regex), message, messageProperties);
};

/**
@name Mojo.assertDefined
@description
Writes an error to the log if value evaluates to undefined.
@param {Boolean} value value that must not evaluate to undefined
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function

 */

/**
@name Mojo.requireDefined
@description
Writes an error to the log if value evaluates to undefined and throws an exception.
@param {Boolean} value value that must not evaluate to undefined
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function

 */

Mojo._assertDefined = function(value, message, messageProperties) {
	if (!message) {
		message = "value was expected to be defined, but wasn't";
	}
	return Mojo._assertInternal(arguments.callee.__logLevel, value, message, messageProperties);
};

Mojo._assertImpl = function(logLevel, expected, testFunction, defaultMessage, message, messageProperties) {
	if (!message) {
		message = defaultMessage;
		messageProperties = {target: Object.inspect(expected), actualType: typeof expected};
	}
	return Mojo._assertInternal(logLevel, testFunction(expected), message, messageProperties);
};

/**
@name Mojo.assertString
@description
Writes an error to the log if expectedString fails the Prototype isString method.

@param {Boolean} expectedString object that must be a string
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function

 */

/**
@name Mojo.requireString
@description
Writes an error to the log if expectedString fails the Prototype isString method and throws an exception. 

@param {Boolean} expectedString object that must be a string
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */
Mojo._assertString = function(expectedString, message, messageProperties) {
	return Mojo._assertImpl(arguments.callee.__logLevel, expectedString, Object.isString, 
		"string was expected, but instead got '#{target}' of type '#{actualType}'", 
							message, messageProperties);
};

/**
@name Mojo.assertArray
@description
Writes an error to the log if expectedArray fails the Prototype isArray method.

@param {Boolean} expectedArray object that must be an array
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
*/

/**
@name Mojo.requireArray
@description
Writes an error to the log if expectedArray fails the Prototype isArray method and throws an exception.

@param {Boolean} expectedArray object that must be an array
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
*/
Mojo._assertArray = function(expectedArray, message, messageProperties) {
	return Mojo._assertImpl(arguments.callee.__logLevel, expectedArray, Object.isArray, 
		"array was expected, but instead got '#{target}' of type '#{actualType}'", 
							message, messageProperties);
};

/**
@name Mojo.assertElement
@description
Writes an error to the log if expectedElement fails the Prototype isElement method.
@param {Boolean} expectedElement object that must be an element
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */

/**
@name Mojo.requireElement
@description
Writes an error to the log if expectedElement fails the Prototype isElement method and throws an exception.
@param {Boolean} expectedElement object that must be an element
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */
Mojo._assertElement = function(expectedElement, message, messageProperties) {
	return Mojo._assertImpl(arguments.callee.__logLevel, expectedElement, Object.isElement, 
		"element was expected, but instead got '#{target}' of type '#{actualType}'", 
							message, messageProperties);
};

/**
@name Mojo.assertFunction
@description
Writes an error to the log if expectedFunction fails the Prototype isFunction method.
@param {Boolean} expectedFunction object that must be a function
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */

/**
@name Mojo.requireFunction
@description
Writes an error to the log if expectedFunction fails the Prototype isFunction method and throws an exception.
@param {Boolean} expectedFunction object that must be a function
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */
Mojo._assertFunction = function(expectedFunction, message, messageProperties) {
	return Mojo._assertImpl(arguments.callee.__logLevel, expectedFunction, Object.isFunction, 
		"function was expected, but instead got '#{target}' of type '#{actualType}'", 
							message, messageProperties);
};


/**
@name Mojo.assertNumber
@description
Writes an error to the log if expectedNumber fails the Prototype isNumber method.

@param {Boolean} expectedNumber object that must be a number
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */
/**
@name Mojo.requireNumber
@description
Writes an error to the log if expectedNumber fails the Prototype isNumber method and throws an exception.

@param {Boolean} expectedNumber object that must be a number
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */
Mojo._assertNumber = function(expectedNumber, message, messageProperties) {
	return Mojo._assertImpl(arguments.callee.__logLevel, expectedNumber, Object.isNumber, 
		"number was expected, but instead got '#{target}' of type '#{actualType}'", 
							message, messageProperties);
};

/**
@name Mojo.assertProperty
@description
Writes an error to the log if targetObject doesn't have values for the property
name or names passed in.

@param {String||Array} properties individual name or array of names of properties to check
@function
 */
/**
@name Mojo.requireProperty
@description
Writes an error to the log if targetObject doesn't have values for the property
name or names passed in and throws an exception.

@param {String||Array} properties individual name or array of names of properties to check
@function
 */

Mojo._assertProperty = function(targetObject, properties, message, messageProperties) {
	if (!Object.isArray(properties)) {
		properties = $A([properties]);
	}
	var missingProperties = [];
	properties.each(function(p) {
		if (targetObject[p] === undefined) {
			missingProperties.push("'" + p + "'");
		}
	});
	
	if (missingProperties.length > 0) {
		if (!message) {
			message = 'object #{object} was missing expected properties #{properties}';
			messageProperties = {object: Object.inspect(targetObject), properties: missingProperties};
		}
		return Mojo._assertInternal(arguments.callee.__logLevel, false, message, messageProperties);
	}
	return "";
};

Mojo._assertProperties = Mojo._assertProperty;


/**
@name Mojo.assertClass
@description
Writes an error to the log if targetObject wasn't constructed by the passed in constructor
function.

@param {Object} object object to check for constructing function.
@param {Function} constructorFunction expected constructor function.
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */
/**
@name Mojo.requireClass
@description
Writes an error to the log if targetObject wasn't constructed by the passed in constructor
function and throws an exception.

@param {Object} object object to check for constructing function.
@param {Function} constructorFunction expected constructor function.
@param {String} message a custom message to use if the assertion fails. This message
                 will be run through template evaluation against the messageProperies
                 object, so you can include details of the assertion failure in the message.
@param {Object} messageProperties object containing values to use with template evaluation.
@returns the message that was written to the log
@type string
@function
 */
Mojo._assertClass = function(object, constructorFunction, message, messageProperties) {
	if (!(object.constructor === constructorFunction)) {
		if (!message) {
			message = 'object #{object} was expected to have constructor #{constructorFunction}, but had constructor #{actualConstructor}.';
			messageProperties = {object: Object.inspect(object), constructorFunction: constructorFunction, actualConstructor: object.constructor};
		}
		return Mojo._assertInternal(arguments.callee.__logLevel, false, message, messageProperties);
	}
	return "";
};

/*

The following code creates functions of the pattern requireXxxxx, where Xxxxxx are the terms
following each of the assert methods. For example, there will be a require and requireFunction. These
operate just like the assertion functions, except that they will throw an exception when their requirements
aren't met. These are intended to be used in cases where framework code or application cannot reasonably continue
if the requirements aren't met.
@private

 */

["Number", "Function", "String", "Array", "", "False", "Equal", "Defined", "Match", "Property", "Properties", "Class", "Element"].each(function(assertPartialName) {
	var requireName = "require" + assertPartialName;
	var assertName = "assert" + assertPartialName;
	var privateName = "_assert" + assertPartialName;
	var requireFunc, assertFunc;

	requireFunc = function() {
		var result;

		result = Mojo[privateName].apply(null, arguments);
		if (result) {
			throw new Error(requireName + " Failed: " + result);
		}
	};
	requireFunc.__logLevel = "error";
	Mojo[requireName] = requireFunc;

	assertFunc = function() {
		var result;
		result = Mojo[privateName].apply(null, arguments);
		return result;
	};
	assertFunc.__logLevel = "warn";
	Mojo[assertName] = assertFunc;
});


