/**
 * @name validationlibrary.js
 * @fileOverview This file has functions validating different input like
 * phone number, email address...
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/


Mojo.FormValidation.validatePhonenumber = function(number) {
	if (!number) {
		return false;
	}

	var length = number.length;
	var numDigits = 0;
	for (var i= 0; i < length; i++) {
		var c = number.charAt(i);
		if (Mojo.Format._PhoneNumberFormatter.enterableChars.indexOf(c) == -1) {
			return false;
		}
		if (Mojo.FormValidation.isDigit(c)) {
			numDigits++;
		}
	}

	// a valid phone number must have at least 1 digit (e.g. "*2" for customer service)
	if (numDigits < 1) {
		return false;
	}

	return true;
};


Mojo.FormValidation.validateEmail = function(emailStr) {
	Mojo.Log.warn("Warning: validateEmail needs to be reimplemented.");
	return true;
};

Mojo.FormValidation.validateRegexpString = function(regexString, flags, input) {
	var pattern = new RegExp(regexString, flags);
	return input.match(pattern);
};

Mojo.FormValidation.validateRegexp = function(regex, input) {
	return input.match(regex);
};

Mojo.FormValidation.isDigit = function(c) {
	return ((c >= "0") && (c <= "9"));
};