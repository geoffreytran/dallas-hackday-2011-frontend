/**
 * @name format.js
 * @fileOverview This file has functions related to formatting dates, times and numbers.
 *
 * Copyright 2009 Palm, Inc.  All rights reserved.
 */

/**
 * @namespace Holds functionality related to formatting dates, times and numbers.
 * @description 
 * Mojo.Format has functions related to formatting dates, times and numbers.
 * 
 * Most of the API methods accept an optional `options` parameter which can be 
 * used to specify extended options for each method.  Currently, five properties are 
 * recognized:
 * 
 * 		countryCode: The two letter IETF/ISO 639 code for a country or region
 * 		fractionDigits: The number of digits to use after the decimal place when representing fractional values
 * 		format: A date/time format string
 * 		date: A date format string
 * 		time: A time format string
 * 
 * Not all APIs use all properties; see each API's documentation for details.
 * 
 * All APIs default to using the device's current locale, so supplying the `countryCode`
 * is only necessary in the specific case of desiring formatting other than that
 * of the device's current locale, and can be omitted otherwise.
 */

/*globals Mojo PalmSystem Template */

Mojo.Format = {};


/**
 * @private
 */
Mojo.Format._timezoneRequest = {};


/**
 * @private
 * Initiates asynchronous request to system services for the current timezone
 * name.
 */
Mojo.Format.setup = function() {
	if (Mojo.Host.current !== Mojo.Host.browser) {
		Mojo.Format._timezoneRequest = Mojo.Format._createTimezoneRequest();
	}
	
	Mojo.Format._lastTimeFormat = Mojo.Format.using12HrTime();
};


/**
 * Formats the date object based on the options.
 * @param {Date} date object to be formatted
 * @param {String|Object} options Options for the formatter.
 * 	 Let LENGTH represent an element of the set {'short', 'medium', 'long', 'full', 'default'} <br/>
 * 
 *   options accepts a LENGTH directly as a format or {date: LENGTH (optional), time: LENGTH (optional)} with either
 *   date, time, or both specified as a property in the object, or {format: LENGTH}. <br/>
 * 
 *   If options is solely a LENGTH, formatDate outputs both the date and time formatted according to this string. <br/>
 * 
 *   If only date or time is specified as a property in an object hash, only the date or time will be
 *   returned as formatted in the LENGTH string. <br/>
 * 
 *   If both date and time are specified as properties in an object hash, both the date or time will be
 *   returned and formatted appropriately for the locale and according to their LENGTHs. <br/>
 * 
 *   If format is specified as a property in an object hash, both the date and time will be returned
 *   as formatted in the LENGTH string.  The format property is equivalent to specifying both date 
 *   and time with the same LENGTH string, and takes precedence over the date and time properties. <br/>

 *   If countryCode is specified as a property in an object hash, the date and/or time will be returned
 *   and formatted as appropriate for the specified country.  The countryCode property is a two letter
 *   IETF/ISO 639 code for a country/region.  If absent, formatting defaults to the device's current
 *   locale (which is usually what is desired).
 * 
 * @returns {string} The date formatted as a string.
 */
Mojo.Format.formatDate = function(date, options) {
	var dateFormat;
	var timeFormat;
	var finalFormat;
	var tokenized;
	var result;
	var formatType;
	
	var cacheBucket = '';
	var cacheBucketKey = '';
	var cachedTokenized;
	var dontCache = 0;
	var lastHourTimeFormat = Mojo.Format.using12HrTime();
	
	if (typeof options === "string") {
		formatType = options;
	} else {
		formatType = options && options.format;
	}

	if(Mojo.Format._lastTimeFormat !== lastHourTimeFormat) {
		Mojo.Format._formatCache = {datetime:{}, date:{}, time:{}, formatType:{}};
		Mojo.Format._lastTimeFormat = lastHourTimeFormat;
	}

	try {
	    if (!date) {
			return "";
	    }
		
		if(options.countryCode) {
			dontCache++;
		} else {
			if(formatType) {
				cachedTokenized = Mojo.Format._formatCache.formatType[formatType];
			} else {
				if(options.date) {
					if(options.time) {
						cachedTokenized = Mojo.Format._formatCache.datetime[options.date+options.time];
					} else {
						cachedTokenized = Mojo.Format._formatCache.date[options.date];
					}
				} else if(options.time) {
					cachedTokenized = Mojo.Format._formatCache.time[options.time];
				}
			}	
		}
	
		if(cachedTokenized) {
			return this._reconstructDate(date, cachedTokenized);
		} else {
			if (formatType) {
				switch (formatType) {
				case "short":
				case "medium":
				case "long":
				case "full":
				case "default":
					finalFormat = this._finalDateTimeFormat(this._getDateFormat(formatType, options),
															this._getTimeFormat(formatType, options),
															options);
					break;
				default:
					finalFormat = formatType;
				}
				cacheBucket = 'formatType';
				cacheBucketKey = formatType;
			} else {
				dontCache++;
				if (options.date) {
					dontCache--;
					dateFormat = this._getDateFormat(options.date, options);
					cacheBucket += 'date';
					cacheBucketKey += options.date;
				}
				if (options.time) {
					dontCache--;
					timeFormat = this._getTimeFormat(options.time, options);
					cacheBucket += 'time';
					cacheBucketKey += options.time;
				}

				finalFormat = this._finalDateTimeFormat(dateFormat, timeFormat, options);
			}
		    tokenized = this._getDateTimeRegexp(finalFormat).exec(finalFormat);
			if(!dontCache) {
				Mojo.Format._formatCache[cacheBucket][cacheBucketKey] = tokenized;
			}
		    result = this._reconstructDate(date, tokenized);
		}
	    return result;

	} catch (e) {
		Mojo.Log.logException(e, "format date error");
		return "";
	}
};

/**
 * Formats the date object based on the options.
 * @param {Date}			date	Object to be formatted
 * @param {String|Object}	options	Options for the formatter.
 * 	 If options is a string, it is one of 'short', 'medium', 'long', 'full', or 'default' and outputs
 *   the date formatted according to this string if the date is later than tomorrow
 *   or earlier than last week. If the date is in the last week, it returns
 *   the localized day. If yesterday/today/tomorrow, it provides the property
 *   localized strings for those words. <br/>
 *   If options is an object, it can contain both or either of the properties 'format',
 *   which is a format string as specified above, and 'countryCode', which is a two 
 *   letter IETF/ISO 639 code for a country/region.  If present, this property specifies
 *   what country's/region's formatting should be used for the operation.  If absent, 
 *   defaults to the device's current locale (which is usually what is desired).
 *
 * @returns {string} The date formatted as a string.
 */
Mojo.Format.formatRelativeDate = function(date, options) {
	try {
		var formatType;
		if (typeof options === "string") {
			formatType = options;
		} else {
			formatType = options && options.format;
		}
		var dateTimeHash = this.getDateTimeHash();
		var now = new Date();
		var offset = this._dayOffset(now, date);
		switch (offset) {
		case "today":
		case "tomorrow":
		case "yesterday":
			return dateTimeHash.relative[offset];
		case "future":
		case "past":
			switch (formatType) {
			case "short":
			case "medium":
			case "long":
			case "full":
				return this.formatDate(date, {date: formatType, countryCode: options && options.countryCode});
			default:
				return this.formatDate(date, {date: "default", countryCode: options && options.countryCode});
			}
			break; // I know this isn't needed, but it makes jslint happy.
		case "lastWeek":
			switch (formatType) {
			case "full":
				formatType = "long";
				return dateTimeHash[formatType].day[date.getDay()];
			case "short":
			case "medium":
			case "long":
				return dateTimeHash[formatType].day[date.getDay()];
			default:
				return dateTimeHash.medium.day[date.getDay()];
			}
			break; // I know this isn't needed, but it makes jslint happy.
		}
	} catch (e) {
		Mojo.Log.logException(e);
		return this.formatDate(date, {date: "default", countryCode: options && options.countryCode});
	}
};

/**
 * Converts a number into a string, using the proper locale-based format for numbers.
 * @param {Number} number Number to convert
 * @param {Number|Object} options (optional) If a Number, then the number of places after the decimal place.
 *   If an Object, then an object containing various extended options
 *   Currently supports two properties:
 * 	<table>
 *  	<tr><td width="20%">'fractionDigits'</td>	<td>the number of places after the decimal place.
 *  												</td></tr>
 *  	<tr><td width="20%">'countryCode'</td> 		<td>a two letter IETF/ISO 639 code for a country/region.  If
 *  													present, this property specifies what country's/ region's
 *  													formatting should be used for the operation.  If absent, 
 *  													defaults to the device's current locale (which is usually
 *  													what is desired).
 *  												</td></tr>
 * 	</table>
 * @returns {string} Input number formatted as a string using the current locale formatting
*/
Mojo.Format.formatNumber =  function formatNumber(number, options) {
	var fractionDigits;
	try {
		if (typeof options === "number") {
			fractionDigits = options;
		} else if (options) {
			fractionDigits = options.fractionDigits || 0;
		}
		var formatHash = this.getFormatHash(options && options.countryCode);
		var decimal = formatHash.numberDecimal;
		var tripleSpacer = formatHash.numberTripleDivider;
		var rawFormat = number.toFixed(fractionDigits);
		var parts = rawFormat.split(".");
		var wholeNumberPart = parts[0];
		var numberGroupRegex = /(\d+)(\d{3})/;
		while (tripleSpacer && numberGroupRegex.test(wholeNumberPart)) {
			wholeNumberPart = wholeNumberPart.replace(numberGroupRegex, '$1' + tripleSpacer + '$2');
		}
		parts[0] = wholeNumberPart;
		return parts.join(decimal);
	} catch(e) {
		Mojo.Log.error("formatNumber error : " + e.message);
		return (number || "0") + "." + (fractionDigits || "");
	}
};

/**
 * Converts a number representing an amount of currency into a string, using the proper locale-based format for currency.
 * @param {Number} amount Currency amount to convert
 * @param {Number|Object} options (optional) If a Number, then the number of places after the decimal place.<br/>
 * 				  If an Object, then an object containing various extended options. Currently supports two properties:
 * 				 <table>
 * 				 	<tr><td width="20%">'fractionDigits'</td>	<td>the number of places after the decimal place.
 * 				 												</td></tr>
 * 				 	<tr><td width="20%">'countryCode'</td> 		<td>a two letter IETF/ISO 639 code for a country/region.  If
 * 				 													present, this property specifies what country's/ region's
 * 				 													formatting should be used for the operation.  If absent, 
 * 				 													defaults to the device's current locale (which is usually
 * 				 													what is desired).
 * 				 												</td></tr>
 * 				 </table>
 * @returns {string} Input currency value formatted as a string using the current locale formatting
 */
Mojo.Format.formatCurrency = function(amount, options) {
	try {
		var formatHash = this.getFormatHash(options && options.countryCode);
		return formatHash.currencyPrepend + Mojo.Format.formatNumber(amount, options) + formatHash.currencyAppend;
	} catch(e) {
		Mojo.Log.error("formatCurrency error : " + e.message);
		return (amount || "0") + "." + (options.fractionDigits || options || "");
	}
};

/**
 * Converts a number into a percent string, using the locale-based format for percentages. The number is expected to already
 * be a percentage, and will not be multiplied by 100.
 * @param {Number} percent Percent to format as a string
 * @param {Object} options (optional) An object containing various extended options
 *   Currently only supports a 'countryCode' property, which is a two letter IETF/ISO 639
 *   code for a country/region.  If present, this property specifies what country's/
 *   region's formatting should be used for the operation. If absent, defaults
 *   to the device's current locale (which is usually what is desired).
 * @returns {string} Input argument formatted as a percentage string using the current locale formatting
 */
Mojo.Format.formatPercent = function formatPercent(percent, options) {
	try {
		var formatHash = this.getFormatHash(options && options.countryCode);
		return Math.round(percent) + (formatHash.percentageSpace? " %" : "%");
	} catch(e) {
		Mojo.Log.error("formatPercent error : "+ e.message);
		return Math.round(percent) + "%";
	}
};

/**
 * Searches the parameter text for URLs (web and mailto) and emoticons (if support
 * is enabled) and returns a new string with those entities replaced by HTML links 
 * and images (respectively).
 *
 * @param {string}		text	The text to transform into HTML
 * @returns {string}			HTML-ized version of input string
*/
Mojo.Format.runTextIndexer = function(text, options) {
	if (window.PalmSystem && window.PalmSystem.runTextIndexer) {
		return window.PalmSystem.runTextIndexer(text, options);
	}
	Mojo.Log.warn("Mojo.Model.runTextIndexer() is not implemented on this platform.");
	return text;
};

/**
 * Returns whether the current locale "normally" uses AM/PM as opposed to 24 hour time.
 * @param {Object} options (optional) An object containing various extended options
 *   Currently only supports a 'countryCode' property, which is a two letter IETF/ISO 639
 *   code for a country/region.  If present, this property specifies what country's/
 *   region's formatting should be used for the operation. If absent, defaults
 *   to the device's current locale (which is usually what is desired).
 *
 * @returns {Boolean} True if 12-hour (AM/PM) is the default; false if 24-hour is the default.
 */
Mojo.Format.isAmPmDefault = function(options) {
	try {
		var format = this.getFormatHash(options && options.countryCode);
		return format.is12HourDefault;
	} catch(e) {
		Mojo.Log.error("Could not determine default AM/PM setting");
		return true;
	}
};

/**
 * Returns whether the current app should use AM/PM as opposed to 24 hour time.
 *
 * @returns {Boolean} True if 12-hour (AM/PM) is selected; false if 24-hour is selected.
 */
Mojo.Format.using12HrTime = function() {
	return PalmSystem.timeFormat === "HH12";
};


/**
 * Returns a zero-based index into the week indicating what day is the first day
 * of the country's or region's calendar week:
 *    Sunday: 0
 *    Monday: 1
 *    Tuesday: 2
 *    etc.
 * By default, returns the index appropriate for the device's current region
 * setting.
 * @param {Object} options (optional) An object containing various extended options
 *   Currently only supports a 'countryCode' property, which is a two letter IETF/ISO 639
 *   code for a country/region.  If present, this property specifies what country's/
 *   region's formatting should be used for the operation. If absent, defaults
 *   to the device's current locale (which is usually what is desired).
 *
 * @returns {Number} Day of the week as a number, where 0 represents Sunday and 7 represents Saturday.
 */
Mojo.Format.getFirstDayOfWeek = function(options) {
	var formatHash = this.getFormatHash(options && options.countryCode);
	return formatHash.firstDayOfWeek;
};


/**
 * Returns the current timezone of the device. The timezone is updated whenever the user
 * changes it, if set manually, or by the network, if automatic.
 * @returns {String} Name of timezone. 
 */
Mojo.Format.getCurrentTimeZone = function() {
	return Mojo.Format._TZ;
};


/**
 * Format a choice string according to the given value and model.
 * The choice string is a sequence of choices separated by a vertical 
 * bar character. Each choice has a value to match, a hash character,
 * followed by the string to use if the value matches. The string
 * cannot contain a vertical bar. The strings may contain references
 * to objects in the given model that are use to format that string
 * using the Template object. The syntax for the value of "2>" 
 * means "greater than 2". Similarly, the syntax "2<" means "less than 2".
 * If the value of the choice is empty, that means to use that choice
 * as the default string.
 * 
 * Example choice string:
 * 0#There are no files|1#There is one file|2<#There are #{num} files.|#There are some files.
 * 
 * In the above example, if the value passed in with the first
 * parameter is 0, then use the first string "There are no files".
 * If the value passed in with the first parameter is 1, then use 
 * the second string "There is one file". If the value is 2 or more,
 * use the last string, "There are #{num} files." If no other choices 
 * match, then the default string of "There are some files." is used 
 * instead.
 * 
 * The strings may contain references (such as #{num}) to objects in 
 * the given model that are used to format the final string.
 * 
 * When this function is called this way:
 * var files = 2185;
 * var model = { num: files };
 * print(Mojo.Format.formatChoice(files, "0#There are no files|1#There is one file|2<#There are #{num} files.", model);
 * 
 * The output is:
 * There are 2185 files.
 * 
 * @param {Number} value			A value used to choose the right choice in the choice string
 * @param {String} choiceString	A concatenation of string choices
 * @param {Object} model			An object from which values in the string choices are formatted
 * @returns {String} 				A formatted string corresponding to the given value and formatted with the given model
 */
Mojo.Format.formatChoice = function(value, choiceString, model) {
	try {
		// first split the choices on the vertical bar
		var choices = choiceString.split('|');
		var limits = [];
		var strings = [];
		var defaultChoice = '';
		var temp;
		var i;
		
		model = model || {};
		
		// the syntax for each choice is <number> # <string>
		// where the number (called a "limit") is separated from the string 
		// by a hash. 
		for (i = 0; i < choices.length; i++) {
			// Note that the string can contain more hashes for 
			// replacement parameters, so only search for the first one with indexOf.
			var index = choices[i].indexOf('#');
			if ( index != -1 ) {
				limits[i] = choices[i].substring(0,index);
				strings[i] = choices[i].substring(index+1);
				if ( value == limits[i] ) {
					// found exact match, so short circuit the parsing and
					// just format and return the final string right now
					temp = new Template(strings[i]);
					return temp.evaluate(model);
				}
				if ( limits[i] === '' ) {
					defaultChoice = strings[i];
				}
			}
			// else ... no hash sign in the choice? Well, just ignore that 
			// choice then because it doesn't conform to the proper syntax
		}
		
		// no exact match, so now check ranges
		for (i = 0; i < choices.length; i++) {
			var lastChar = limits[i].charAt(limits[i].length-1);
			var num = parseFloat(limits[i]);
			if ( (lastChar == '<' && value < num) || (lastChar == '>' && value > num) ) {
				// take the first range that matches
				temp = new Template(strings[i]);
				return temp.evaluate(model);
			}
		}
		
		// no ranges matched, so just use the default choice if there is one.
		temp = new Template(defaultChoice);
		return temp.evaluate(model);
	} catch(e) {
		Mojo.Log.error("formatChoice error : "+ e.message);
		return '';
	}
};

/**
 * @private
 */
Mojo.Format._roundToMidnight = function(date) {
	var numMs = date.getTime();
	var rounded = new Date();
	rounded.setTime(numMs);
	rounded.setHours(0);
	rounded.setMinutes(0);
	rounded.setSeconds(0);
	rounded.setMilliseconds(0);
	return rounded;
};

/**
 * @private
 */
Mojo.Format._dayOffset = function(now, date) {
	var diff;

	date = this._roundToMidnight(date);
	now = this._roundToMidnight(now);
	//ms in day = 60*60*24*1000 = 864e5
	diff = (now.getTime() - date.getTime()) / 864e5;

	switch(diff) {
	case 0:
		return "today";
	case 1:
		return "yesterday";
	case -1:
		return "tomorrow";
	default:
		if(diff < -1) {
			return "future";
		} else if(diff < 7){
			return "lastWeek";
		} else {
			return "past";
		}
	}
};

/*

yy | yyyy 96 | 1996
M-MMMM 9,09, Sept, September
d | dd 2, 02
zzz PDT
a AM/PM
h | hh hour in am/pm 1-12
H | HH hour in day 0-23
k | kk hour in day 1-24
K | KK hour in am/pm 0-11
EEEE Tuesday
m | mm minute in hour
s | ss second in minute 5, 05
(non letter)*

*/
/**
 * @private
 */
Mojo.Format._reconstructDate = function(date, parsedArray) {
	var hr;
	var dateTimeHash = this.getDateTimeHash();
	var acc = [];
	var dateTimeVerbosity;
	var dateTimeType;
	var dateTimeIdx;
	var tokenized;
	var tz;
	for(var i=1; i < parsedArray.length; i++) {
		if(parsedArray[i] === undefined) {
			break;
		}
		
		switch(parsedArray[i])
			{
			case 'yy':
				dateTimeVerbosity = '';
				acc.push((date.getFullYear() + "").substring(2));
				break;
			case 'yyyy':
				dateTimeVerbosity = '';
				acc.push(date.getFullYear());
				break;
			case 'MMMM':
				dateTimeVerbosity = 'long';
				dateTimeType = 'month';
				dateTimeIdx = date.getMonth();
				break;
			case 'MMM':
				dateTimeVerbosity = 'medium';
				dateTimeType = 'month';
				dateTimeIdx = date.getMonth();
				break;
			case 'MM':
				dateTimeVerbosity = 'short';
				dateTimeType = 'month';
				dateTimeIdx = date.getMonth();
				break;
			case 'M':
				dateTimeVerbosity = 'single';
				dateTimeType = 'month';
				dateTimeIdx = date.getMonth();
				break;
			case 'dd':
				dateTimeVerbosity = 'short';
				dateTimeType = 'date';
				dateTimeIdx = date.getDate()-1;
				break;
			case 'd':
				dateTimeVerbosity = 'single';
				dateTimeType = 'date';
				dateTimeIdx = date.getDate()-1;
				break;
				//XXX FIXME
			case 'zzz':
				dateTimeVerbosity = '';
				tz = Mojo.Format.getCurrentTimeZone();
				acc.push(tz);
				break;
			case 'a':
				dateTimeVerbosity = '';
				if(date.getHours() > 11) {
					acc.push(dateTimeHash.pm);
				} else {
					acc.push(dateTimeHash.am);
				}
				break;
			case 'K':
				dateTimeVerbosity = '';
				acc.push(date.getHours() % 12);
				break;
			case 'KK':
				dateTimeVerbosity = '';
				hr = date.getHours() % 12;
				//fix ugliness?
				acc.push((hr < 10) ? "0"+(""+hr) : hr);
				break;
			case 'h':
				dateTimeVerbosity = '';
				hr = (date.getHours() % 12);
				acc.push(hr === 0 ? 12 : hr) ;
				break;
			case 'hh':
				dateTimeVerbosity = '';
				hr = (date.getHours() % 12);
				// fix ugliness?
				acc.push(hr === 0 ? 12 : (hr < 10 ? "0" + (""+hr) : hr )) ;
				break;
			case 'H':
				dateTimeVerbosity = '';
				acc.push(date.getHours());
				break;
			case 'HH':
				dateTimeVerbosity = '';
				hr = date.getHours();
				//fix ugliness?
				acc.push(hr < 10 ? "0" + (""+hr) : hr);
				break;
			case 'k':
				dateTimeVerbosity = '';
				hr = (date.getHours() % 12);
				acc.push(hr === 0 ? 12 : hr) ;
				break;
			case 'kk':
				dateTimeVerbosity = '';
				hr = (date.getHours() % 12);
				//fix ugliness?
				acc.push(hr === 0 ? 12 : (hr < 10 ? "0"+(""+hr) : hr)) ;
				break;

			case 'EEEE':
				dateTimeVerbosity = 'long';
				dateTimeType = 'day';
				dateTimeIdx = date.getDay();
				break;
			case 'EEE':
				dateTimeVerbosity = 'medium';
				dateTimeType = 'day';
				dateTimeIdx = date.getDay();
				break;
			case 'EE':
				dateTimeVerbosity = 'short';
				dateTimeType = 'day';
				dateTimeIdx = date.getDay();
				break;
			case 'E':
				dateTimeVerbosity = 'single';
				dateTimeType = 'day';
				dateTimeIdx = date.getDay();
				break;
			case 'mm':
			case 'm':
				//no single minute?
				dateTimeVerbosity = '';
				var mins = date.getMinutes();
				acc.push(mins < 10 ? "0" + (""+mins) : mins);
				break;
			case 'ss':
			case 's':
				//no single second?
				dateTimeVerbosity = '';
				var secs = date.getSeconds();
				acc.push(secs < 10 ? "0" + (""+secs) : secs);
				break;
			default:
				tokenized = /'([A-Za-z]+)'/.exec(parsedArray[i]);
                dateTimeVerbosity = '';
                if(tokenized) {
                    acc.push(tokenized[1]);
				} else {
					acc.push(parsedArray[i]);
				}
			}

		if(dateTimeVerbosity) {
			acc.push(dateTimeHash[dateTimeVerbosity][dateTimeType][dateTimeIdx]);
		}

	}

	return acc.join("");


};



/**
 * @private
 */
Mojo.Format.defaultDateTimeFormat = "DATE TIME";


/**
 *
 * _finalDateTimeFormat takes a date and time format and concats them in a locale-appropriate way.
 * e.g. "M/d/yy" and "h:mm a" may be combined to form "M/d/yy h:mm a" and this is returned.
 *
 * The combination format depends on "dateTimeFormat" in datetime_table.json.
 * DATE and TIME are considered to be special values where the appropriate format is substituted in.
 * a letter or several letters should be escaped by surrounding them with single quotes ('s)
 * non-letters will be taken literally.
 *
 * If the date or time argument is omitted, the remaining argument is returned unmodified as
 * the finalized format since no merged format form is required.
 *
 * @param {Object} options (optional) An object containing various extended options
 *   Currently only supports a 'countryCode' property, which is a two letter IETF/ISO 639
 *   code for a country/region.  If present, this property specifies what country's/
 *   region's formatting should be used for the operation. If absent, defaults
 *   to the device's current locale (which is usually what is desired).
 */

/**
 * @private
 */
Mojo.Format._finalDateTimeFormat = function(dateFormat, timeFormat, options) {
	var i;
	var acc = [];
	var tokenized;
	var escapedText;
	var formatHash = this.getFormatHash(options && options.countryCode);
	var dateTimeFormat = formatHash.dateTimeFormat || Mojo.Format.defaultDateTimeFormat;

	if(dateFormat && timeFormat) {
		tokenized = this._getDateTimeRegexp(dateTimeFormat, true).exec(dateTimeFormat) || [];
		for(i=1; i<tokenized.length && tokenized[i] !== undefined; i++) {
			switch(tokenized[i]) {
			case "TIME":
				acc.push(timeFormat);
				break;
			case "DATE":
				acc.push(dateFormat);
				break;
			default:
				escapedText = /'([A-Za-z]+)'/.exec(tokenized[i]);
                if(escapedText) {
                    acc.push(escapedText[1]);
				} else {
					acc.push(tokenized[i]);
				}
			}
		}
		return acc.join("");
	} else {
		return timeFormat || dateFormat || "M/d/yy h:mm a";
	}
};



/** @private */
Mojo.Format.dateParserChunk = "('[A-Za-z]+'|y{2,4}|M{1,4}|d{1,2}|z{1,3}|a|h{1,2}|H{1,2}|k{1,2}|K{1,2}|E{1,4}|m{1,2}|s{1,2}|[^A-Za-z]+)?";
/** @private */
Mojo.Format.comboParserChunk = "(DATE|TIME|[^A-Za-z]+|'[A-Za-z]+')?";

/** @private */
Mojo.Format._getDateTimeRegexp = function(format, combo) {
	var acc = ["^"];
	var regexFragment = (combo ? Mojo.Format.comboParserChunk : Mojo.Format.dateParserChunk);
	for(var i=0; i< format.length; i++) {
		acc.push(regexFragment);
	}
	acc.push("$");
	return new RegExp(acc.join(""));
};




/** @private */
Mojo.Format._formatFetch = function(dateLen, type, options) {
	var formatHash = Mojo.Format.getFormatHash(options && options.countryCode);
	switch(dateLen)
		{
		case 'short':
		case 'medium':
		case 'long':
		case 'full':
		case 'default':
			return formatHash[dateLen + type];
		default:
			//assume format was passed in if it's not a type
			return dateLen;
		}
};

/** @private */
Mojo.Format._getDateFormat = function(dateLen, options) {
	return this._formatFetch(dateLen, "Date", options);
};

/** @private */
Mojo.Format._getTimeFormat = function(dateLen, options) {
	return this._formatFetch(dateLen, this.using12HrTime() ? "Time12" : "Time24", options);
};


/** @private */
Mojo.Format.getDateTimeHash = function() {
	return Mojo.Locale.DateTimeStrings || {};
};

/** @private */
Mojo.Format.getFormatHash = function(countryCode) {
	if (!countryCode || countryCode === Mojo.Locale.formatRegion) {
		return Mojo.Locale.formats || {};
	}
	if (Mojo.Format._formatsByCountry === undefined) {
		Mojo.Format._formatsByCountry = {};
	}
	var formatHash;
	formatHash = Mojo.Format._formatsByCountry[countryCode];
	if (!formatHash) {
		formatHash = Mojo.Locale.readFormatsTable(countryCode);
		Mojo.Format._formatsByCountry[countryCode] = formatHash;
	}
	return formatHash || {};
};


/*
 * This set of functions caches the current timezone name (e.g. "PST") and sets 
 * up to receive notifications should it change.  This is for use by 
 * Mojo.Format.formatDate(), which needs the current timezone for the 'zzz' 
 * specifier, and isn't suited for fetching the value asynchronously from
 * the service.
 */

/**
 * @private
 */
Mojo.Format._timezoneCallback = function(response) {
	if (!response.TZ) {
		return;
	}
	this._setCurrentTimeZone(response.TZ);
};

/**
 * @private
 */
Mojo.Format._TZ = '';
Mojo.Format._createTimezoneRequest = function() {
	var request = new Mojo.Service.Request('palm://com.palm.systemservice/time', {
		method: 'getSystemTime',
		parameters: {
			subscribe: true
		}, 
		onSuccess: Mojo.Format._timezoneCallback.bind(Mojo.Format)
	});
	return request;
};

/**
 * @private
 */
Mojo.Format._setCurrentTimeZone = function(timeZone) {
	Mojo.Format._TZ = timeZone;
};

/**
 * Return a string containing the class of all characters that 
 * are valid in phone number formats for the given locale. If 
 * the locale argument is null, the current Mojo format region 
 * is used. If the locale is not known, a default string will
 * be returned. These strings are specified in the format json
 * files for each region.
 * 
 * Example: getPhoneNumberFormatChars("en_us") will return
 * the string:
 * 
 * "0123456789 pPtT()-+#*"
 * 
 * The default string is:
 * 
 * "0123456789+#*"
 * 
 * @param {Object} locale return the class of characters for the 
 * given locale, or null to cause it to use the current Mojo locale 
 */
Mojo.Format.getPhoneNumberFormatChars = function(locale) {
	var region;
	var formatHash;
	
	if ( !locale ) {
		region = Mojo.Locale.getCurrentFormatRegion().toLocaleLowerCase().slice(-2);
	} else {
		region = locale.toLocaleLowerCase().slice(-2);
	}

	formatHash = this.getFormatHash(region);
	
	return (formatHash && formatHash.phoneNumberChars) || "0123456789+#*";
};

