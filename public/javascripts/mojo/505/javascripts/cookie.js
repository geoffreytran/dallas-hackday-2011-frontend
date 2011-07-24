/**
 * @name cookie.js
 * @fileOverview This file has functions related to using cookies. Cookies are small (typically <4k) persistant objects
 * used to store application preferences and settings.
 * See {@link Mojo.Model.Cookie} for more info.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * Create a cookie object with the name provided.
 * @constructor
 * @param {String} cookieName name for the cookie
 * @param {Object} optionalDocument optional document in which to store the cookie. Defaults to
 * the current document.
 */
Mojo.Model.Cookie = function Cookie (cookieName, optionalDocument) {
	Mojo.requireString(cookieName);
	this.document = optionalDocument || document;
	this.name = cookieName;
	this.prefixedName = this.MOJO_COOKIE_PREFIX + this.name;
};

/**
 * @private
 * @constant
 * @description Prefix is used as part of each assigned cookie name.
 */
Mojo.Model.Cookie.prototype.MOJO_COOKIE_PREFIX = "mojo_cookie_";

/**
 * Returns the object stored in this cookie, or undefined if no such cookie exists.
 */
Mojo.Model.Cookie.prototype.get = function get() {
	var prefixedName = this.prefixedName;
	var result;
	var cookie = this.document.cookie;
	if (cookie) {
		var cookies = cookie.split(/; */);
		var matchingCookie = cookies.find(function(oneCookie) {
			var matches = oneCookie.startsWith(prefixedName+'=');
			return matches;
		});
		if (matchingCookie) {
			var cookieParts = matchingCookie.split("=");
			Mojo.assert(cookieParts.length === 2, "cookies should have two values separated by an equals sign.");
			var matchingCookieValue = cookieParts.last();
			var jsonString = decodeURIComponent(matchingCookieValue);
			if (jsonString.length > 0) {
				result = Mojo.parseJSON(decodeURIComponent(matchingCookieValue));
			}
		}
	}
	return result;
};

/**
 * Creates or updates the value of this cookie with the provided object.
 * @param {Object} objectToStore Object to store in a cookie. Must be something that can be
 *  that can be encoded in JSON.
 * @param {Date} expirationDate optional expiration date. Set to the current time or earlier
 * will cause the cookie to be deleted.
 */
Mojo.Model.Cookie.prototype.put = function put(objectToStore, expirationDate) {
	var objectData = encodeURIComponent(Object.toJSON(objectToStore));
	var terms = [];
	terms.push(objectData);
	if (expirationDate !== undefined) {
		terms.push('expires=' + expirationDate.toGMTString());
	}
	var cookieText = terms.join("; ");
	var cookieTotal = this.prefixedName + '=' + cookieText;
	this.document.cookie = cookieTotal;
};

/**
 * Deletes this cookie and frees the storage memory used by it.
 */
Mojo.Model.Cookie.prototype.remove = function remove() {
	this.put("", new Date());
};
