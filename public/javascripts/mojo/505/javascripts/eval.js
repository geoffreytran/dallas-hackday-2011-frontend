/*jslint evil: true */
/*
	All calls to eval should be found in this file.
	
*/
/**
 * @name eval.js
 * @fileOverview This file has utility functions; See {@link Mojo.evalText} for more info. 
Copyright 2009 Palm, Inc.  All rights reserved.
*/

/**
 * Calls JavaScript eval. Used instead of the native eval function so that
 * we can easily do additional things for security around the use of eval.
 * @param {Boolean} textToEval text to be passed to eval
 * @returns the result of the last expression in the evaluated text, just like eval().
@field
@private
 */

Mojo.evalText = function(textToEval) {
	return eval(textToEval);
};