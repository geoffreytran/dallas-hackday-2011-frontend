/**
 * @name model.js
 * @fileOverview This file has functions related to documenting the Mojo Model.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * @namespace Holds functionality related to the Mojo Model. 
 * @description Holds functionality related to models.
 */
Mojo.Model = {};



// Support constructor for 'decorate'
/** @private */
Mojo.Model._decoratorCtor = function(clone) {
	if(clone) {
		Object.extend(this, clone);
	}
};



/**
 * The idea of a decorator is that the prototype references the original object,
 * so properties can be transparently added to (or modified in) the decorator
 * without affecting the original.  
 * This is really handy for widgets that need to add properties to their model
 * in preparation for rendering.
 * 
 * @returns {Object} It returns a new decorator object for the given 'original' object.
 * 
 * @param {Object} proto is the object to decorate.  The new decorator object's prototype field will refer to this object.
 * @param {Object} clone if specified, will have its properties copied into the new decorator.
 */

Mojo.Model.decorate = function(proto, clone) {
	this._decoratorCtor.prototype = proto;
	return new this._decoratorCtor(clone);
};

/**
 * Applies the relevant formatter functions in `formatters`, to the given `model` object.
 * The formatter results are placed in a newly created decorator, so the original model is unmodified.
 * 
 * Formatter functions receive their property value as the first argument, and the whole model object as a second argument.
 * They may return a string, which is used for the formatted version of the model property, or alternatively 
 * a hash of formattedPropertyName -> formattedValue, so one formatter function can create multiple formatted 
 * values from a single model property.
 * 
 * @param {Object} model      is the object containing the properties to be formatted.  It is left unmodified.
 * @param {Object} formatters is a hash of property names to formatter functions. The keys in the
 *                            'formatters' hash are names of properties in the model object to which 
 *                            the formatter functions should be applied. Formatted values have the 
 *                            text "formatted" appended to their names, so the unformatted value is
 *                            also available.
 * @param {Object} clone      if specified, is the clone object passed to 'decorate'. 
 *                            Its properties are copied to the model decorator object before
 *                            applying the formatter functions.
 */

Mojo.Model.format = function format(model, formatters, clone) {
	var newModel = this.decorate(model, clone);
	var propValue;
	var formattedValue;
	var formattedName;
	
	for(var propName in formatters) {
		if(formatters.hasOwnProperty(propName)) {
			propValue = newModel[propName];
			formattedValue = formatters[propName].call(undefined, propValue, model);
			
			if(typeof formattedValue == 'string') {
				newModel[propName+'Formatted'] = formattedValue;
			} else if (typeof formattedValue == 'object') {
				for(formattedName in formattedValue) {
					if(formattedValue.hasOwnProperty(formattedName)) {
						newModel[formattedName] = formattedValue[formattedName];
					}
				}
			}
		}
	}
	
	return newModel;
};

/**
The string returned is a base64 encoded version of the blowfish encrypted version of the source string.

Example

		var key = "sfhjasf7827387af9s7d8f";
		var in_string = "This is a test string.";

		var encrypted_string = Mojo.Model.encrypt( key, in_string );

		var decrypted_string = Mojo.Model.decrypt( key, encrypted_string );	

@param {string}		key		Encryption key to be used.
@param {string}		data	Data to be encrypted.

@returns {string}			base64 encoded version of the blowfish encrypted version of the source string.
*/

Mojo.Model.encrypt = function() {
	if (window.PalmSystem.encrypt) {
		return window.PalmSystem.encrypt.apply(window.PalmSystem, arguments);
	}
	Mojo.Log.warn("Mojo.Model.encrypt() is not implemented on this platform.");
	return undefined;
};

/**
The string returned is a base64 decoded version of the blowfish decrypted version of the source string.

Example

		var key = "sfhjasf7827387af9s7d8f";
		var in_string = "This is a test string.";

		var encrypted_string = Mojo.Model.encrypt( key, in_string );

		var decrypted_string = Mojo.Model.decrypt( key, encrypted_string );

	
@param {string}		key		is the key used to encrypt the data.  A discussion of proper key generation is
                     		beyond the scope of this document.
@param {string}		data	Base64 encoded data to be decrypted.

@returns {string}			base64 decoded version of the blowfish decrypted version of the source string.
*/

Mojo.Model.decrypt = function() {
	if (window.PalmSystem.decrypt) {
		return window.PalmSystem.decrypt.apply(window.PalmSystem, arguments);
	}
	Mojo.Log.warn("Mojo.Model.decrypt() is not implemented on this platform.");
	return undefined;
};
