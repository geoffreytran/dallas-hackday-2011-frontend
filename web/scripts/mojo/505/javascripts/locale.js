/**
 * @name locale.js
 * @fileOverview This file has conventions related to localization.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/*globals Mojo palmGetResource */

/**
 * @namespace No specific APIs, but conventions for identifying strings for
 * extraction, structure for storing localized strings to be used based on
 * locale selection and an extraction tool. 
 */
Mojo.Locale = {};


/**
 * This method loads and merges the localized string tables present in the 
 * application's or framework's resource locale hierarchy and returns the parsed results.
 *
 * @param {String} fileName - name of JSON file. defaults to "strings.json" if falsy.
 * @param {String} locale - name of locale. defaults to current locale if null/
 *                          undefined. nothing if empty string.
 * @param {String} pathToResourcesDir - defaults to the framework's resources directory.
 * @param {Function} mergeFunc - a function for merging an array of string "tables" 
 *                               into a single object.  It takes the form of
 *                               mergeFunc(tables), where 'tables' is an array 
 *                               of objects/arrays whose properties/values represent 
 *                               entries in a string table, and returns the resulting
 *                               merger of those tables.  The 'tables' param 
 *                               is sorted in order of locale precedence from
 *                               lowest to highest: unlocalized first, language
 *                               second, region last.  Missing string table files
 *                               at any of those levels will be represented by an
 *                               empty object: {}.  Defaults to a function that
 *                               merges Objects using Object.extend().
 */
Mojo.Locale.readStringTable = function(fileName, locale, pathToResourcesDir, mergeFunc) {
	if (typeof locale === 'string' && locale.length === 5) {
		locale = {
			base: locale,
			language: locale.slice(0, 2),
			region: locale.slice(-2)
		};
	} else if (locale === '') {
		locale = { base: locale };
	} else {
		locale = {
			base: Mojo.Locale.current,
			language: Mojo.Locale.language,
			region: Mojo.Locale.region
		};
	}
	
	pathToResourcesDir = pathToResourcesDir || Mojo.Locale.resourcePath;

	var table = Mojo.Locale._stringTableLoader(fileName, locale.base, pathToResourcesDir);
	if (!table && locale.language && locale.region) {
		table = Mojo.Locale._readMergingStringTables(fileName, pathToResourcesDir, locale.language, locale.region, mergeFunc || Mojo.Locale.mergeObjectStringTables);
	}

	return table || {};
};

/**
 * Returns the currently set locale as an ISO 639-formatted string (e.g., 'en_us'
 * for US English).
 * @returns Current locale identifier string
 */
Mojo.Locale.getCurrentLocale = function() {
	return Mojo.Locale.current;
};

/**
 * Returns the currently set region used for formatting (numbers, currency, 
 * dates, etc.; see {@link Mojo.Format} for more information) as an ISO 639-
 * formatted string (e.g., 'us' for US formatting).
 * @returns Current format region identifier string
 */
Mojo.Locale.getCurrentFormatRegion = function() {
	return Mojo.Locale.formatRegion;
};

/** @private */
Mojo.Locale._getDateNamesHelper = function(type, length) {
	length = length || 'long';
	var hash = Mojo.Locale.DateTimeStrings;
	return hash && hash[length] && hash[length][type];
};

/**
 * Returns an array containing the names of the months in calendar order for the current locale.
 * Array always starts with January.
 * @param {String} length (optional) Controls the size of the names in the returned 
 *                                   array; defaults to 'long'.  One of 'long',
 *                                   'medium', 'short', 'single':
 *                                   'long': Full month names; e.g., 'January'
 *                                   'medium': Common month name abbreviations; e.g., 'Jan'
 *                                   'short': Usually double-digit month number; e.g., '01'
 *                                   'single': Single-digit month number (where possible); e.g., '1'
 */
Mojo.Locale.getMonthNames = Mojo.Locale._getDateNamesHelper.curry('month');

/**
 * Returns an array containing the names of the weekdays in calendar order for the current locale.
 * Array always starts with Sunday.
 * @param {String} length (optional) Controls the size of the names in the returned 
 *                                   array; defaults to 'long'.  One of 'long',
 *                                   'medium', 'short', 'single':
 *                                   'long': Full day names; e.g., 'Monday'
 *                                   'medium': Common day name abbreviations; e.g., 'Mon'
 *                                   'short': Usually two-character day abbreviation; e.g., 'Mo'
 *                                   'single': Single-letter day name; e.g., 'M'
 */
Mojo.Locale.getDayNames = Mojo.Locale._getDateNamesHelper.curry('day');

/** @private
 *	Merges two sorted arrays, with order-equivalent values in 'overlay' replacing
 *	those in 'base' in the merged array.  Returns the merged array.
 *
 *	@param {Array} base - A sorted array of values
 *	@param {Array} overlay - A sorted array of values to be merged with 'base'
 *	@param {Function} compare - A function for comparing values in the arrays
 *                              with the form taken by Array.sort().
 */
Mojo.Locale.mergeArrays = function(base, overlay, compare) {
	Mojo.requireFunction(compare, "Mojo.Locale.mergeArrays requires a valid compare function");
	
	// Short circuits
	if (!base) {
		return overlay || [];
	}
	if (!overlay) {
		return base || [];
	}
	if (!base.length) {
		return overlay;
	}
	if (!overlay.length) {
		return base;
	}

	var result = [];
	var bi = 0;
	var oi = 0;
	var diff;

	while (bi < base.length && oi < overlay.length) {
		diff = compare(base[bi], overlay[oi]);
		if (diff < 0) {
			result.push(base[bi]);
			++bi;
		} else if (diff > 0) {
			result.push(overlay[oi]);
			++oi;
		} else {
			result.push(overlay[oi]);
			++bi;
			++oi;
		}
	}

	// Push any remaining elements in base
	for (;bi < base.length; ++bi) {
		result.push(base[bi]);
	}
	// Push any remaining elements in overlay
	for (;oi < overlay.length; ++oi) {
		result.push(overlay[oi]);
	}

	return result;
};

/** @private
 *	Merges an array of object-based string "tables" into a single object, with
 *	duplicate entries overlaid from higher precedence tables.
 *
 *	@param {Array} tables - An array of objects whose properties represent entries
 *                          in a string table, sorted in order of precedence from
 *                          lowest to highest.
 */
Mojo.Locale.mergeObjectStringTables = function(tables) {
	var mergedTable = tables.shift() || {};
	tables.each(function(t) {
		Object.extend(mergedTable, t);
	});
	return mergedTable;
};

/** @private
 *	Merges an array of array-based string "tables" into a single array, with
 *	duplicate entries overlaid from higher precedence tables.
 *
 *	@param {Function} compareFunc - A function for comparing values in the arrays,
 *                                  with the form taken by Array.sort().
 *	@param {Array} tables - An array of arrays whose values represent entries in
 *                          a string table, sorted in order of precedence from
 *                          lowest to highest.  If a value in 'tables' is a
 *                          non-array object, it will be skipped.
 */
Mojo.Locale.mergeArrayStringTables = function(compareFunc, tables) {
	var mergedTable = tables.shift() || [];
	tables.each(function(t) {
		if (Object.isArray(t)) {
			t.sort(compareFunc);
			mergedTable = Mojo.Locale.mergeArrays(mergedTable, t, compareFunc);
		}
	});
	return mergedTable;
};

/** @private
 *	Comparison function for entries in alternate character tables; useful for
 *	sorting and merging.  Assumes each entry is an object with at least these
 *	properties:
 *		keyCode: integer
 *		letter: string
 *
 *	Orders by keyCode (numeric) then letter (String.localeCompare()).
 *
 *	@param {Object} a - Left item in comparison
 *	@param {Object} b - Right item in comparison
 */
Mojo.Locale.alternateCharactersCompare = function(a, b) {
	var result = a.keyCode - b.keyCode;
	if (result === 0) {
		result = a.letter.localeCompare(b.letter);
	}
	return result;
};

/** @private
 *	Loads the specified string table file in unlocalized, by language, and by 
 *	region versions and merges them into a single table with duplicate entries 
 *	being overlaid, region taking precedence over language and language taking 
 *	precedence over unlocalized.
 *
 *	@param {String} fileName - The name of the string table file
 *	@param {String} pathToResourcesDir - Base directory to look for 'fileName' in
 *	@param {String} language - The language to overlay on unlocalized strings
 *	@param {String} region - The region to overlay on language and unlocalized strings
 *	@param {Function} mergeFunc - A function for merging the three tables.  Takes
 *                                an array of tables, ordered by region,
 *                                language, unlocalized.
 */
Mojo.Locale._readMergingStringTables = function(fileName, pathToResourcesDir, language, region, mergeFunc) {
	var unlocalizedStrings = Mojo.Locale._stringTableLoader(fileName, '', pathToResourcesDir);
	var languageStrings = Mojo.Locale._stringTableLoader(fileName, language, pathToResourcesDir);
	var regionStrings = Mojo.Locale._stringTableLoader(fileName, language + '/' + region, pathToResourcesDir);

	return mergeFunc([unlocalizedStrings, languageStrings, regionStrings]);
};

/** @private */
Mojo.Locale._stringTableLoader = function(fileName, locale, pathToStringTable, mergeFunc) {
	var stringTable;
	var stringsAsJson;

	if (locale) {
		pathToStringTable += "/" + locale;
	}
	fileName = fileName || "strings.json";

	pathToStringTable += "/" + fileName;

	stringsAsJson = palmGetResource(pathToStringTable, true);

	if (stringsAsJson) {
		stringTable = Mojo.parseJSON(stringsAsJson);
	}
	return stringTable;
};

/** @private 
 *	@param {String} currentLocale - An IETF/ISO 693 locale identifier (e.g., en_us).
 *                                  Can be null or undefined to clear paths and information
 *                                  about the locale.  Loaded data -- translation strings
 *                                  and formats -- will be retained, as other parts of
 *                                  the framework rely on them existing at all times.
 *	@param {String} formatRegion (optional) - An IETF/ISO 693 country/region identifier (e.g., us).
 *                                            Will be ignored if currentLocale is falsy.
 */
Mojo.Locale.set = function(currentLocale, formatRegion) {
	var deviceInfo = Mojo.Environment.DeviceInfo;
	var altCharFullTable, altCharTable;
	
	if (Mojo.Locale.current != currentLocale) {
		Mojo.Locale.current = currentLocale;
		Mojo.Log.info("Current locale is " + Mojo.Locale.current);
		Mojo.Locale.strings = {};
		Mojo.Locale.frameworkStrings = {};
		Mojo.View.templates = {};
		if (Mojo.Locale.current) {
			Mojo.Locale.language = Mojo.Locale.current.slice(0, 2);
			Mojo.Locale.region = Mojo.Locale.current.slice(-2).toLocaleLowerCase();

			Mojo.Locale.resourcePath = Mojo.appPath + "resources";
			Mojo.Locale.localizedResourcePath = Mojo.Locale.resourcePath + "/" + Mojo.Locale.current;
			Mojo.Locale.languageResourcePath = Mojo.Locale.resourcePath + "/" + Mojo.Locale.language;
			Mojo.Locale.regionResourcePath = Mojo.Locale.languageResourcePath + "/" + Mojo.Locale.region;

			Mojo.Locale.frameworkResourcePath = Mojo.Config.MOJO_FRAMEWORK_HOME + "/resources";
			Mojo.Locale.frameworkLocalizedResourcePath = Mojo.Locale.frameworkResourcePath + "/" + Mojo.Locale.current;
			Mojo.Locale.frameworkLanguageResourcePath = Mojo.Locale.frameworkResourcePath + "/" + Mojo.Locale.language;
			Mojo.Locale.frameworkRegionResourcePath = Mojo.Locale.frameworkLanguageResourcePath + "/" + Mojo.Locale.region;
			
			Mojo.Locale.appTemplatePath = Mojo.Locale.localizedResourcePath + "/views/";
			Mojo.Locale.appLanguageTemplatePath = Mojo.Locale.languageResourcePath + "/views/";
			Mojo.Locale.appRegionTemplatePath = Mojo.Locale.regionResourcePath + "/views/";

			Mojo.Locale.frameworkTemplatePath = Mojo.Locale.frameworkLocalizedResourcePath + "/views/";
			Mojo.Locale.frameworkLanguageTemplatePath = Mojo.Locale.frameworkLanguageResourcePath + "/views/";
			Mojo.Locale.frameworkRegionTemplatePath = Mojo.Locale.frameworkRegionResourcePath + "/views/";

			var altCharArrayMerge = Mojo.Locale.mergeArrayStringTables.curry(Mojo.Locale.alternateCharactersCompare);

			// We don't delete this below because even if we don't have a locale, we are still going
			// to need *some* kind of translation and format data, otherwise we'll end up with "undefined" 
			// strings and other UI jankiness.
			Mojo.Locale.strings = Mojo.Locale.readStringTable("strings.json", Mojo.Locale.current, Mojo.Locale.resourcePath);
			Mojo.Locale.frameworkStrings = Mojo.Locale.readStringTable("strings.json", Mojo.Locale.current, Mojo.Locale.frameworkResourcePath);
			
			switch(deviceInfo.keyboardType) {
				case Mojo.Environment.AZERTY:
					altCharTable = "alternatechars_table_azerty.json";
					altCharFullTable = "alternatechars_fulltable.json";
					break;
				case Mojo.Environment.QWERTZ:
					altCharTable = "alternatechars_table_qwertz.json";
					altCharFullTable = "alternatechars_fulltable.json";
					break;
				case Mojo.Environment.QWERTZ_ACC:
					altCharTable = "alternatechars_table_qwertz_accented.json";
					altCharFullTable = "alternatechars_fulltable_qwertz_accented.json";
					break;
				case Mojo.Environment.AZERTY_ACC:
					altCharTable = "alternatechars_table_azerty_accented.json";
					altCharFullTable = "alternatechars_fulltable_azerty_accented.json";
					break;
				default:
					altCharTable = "alternatechars_table.json";
					altCharFullTable = "alternatechars_fulltable.json";
			}
			
			Mojo.Locale.alternateCharacters = Mojo.Locale.readStringTable(altCharTable, Mojo.Locale.current, Mojo.Locale.frameworkResourcePath, altCharArrayMerge);
			Mojo.Locale.alternateCharactersFull = Mojo.Locale.readStringTable(altCharFullTable, Mojo.Locale.current, Mojo.Locale.frameworkResourcePath, altCharArrayMerge);
			Mojo.Locale.DateTimeStrings = Mojo.Locale.readStringTable("datetime_table.json", Mojo.Locale.current, Mojo.Locale.frameworkResourcePath);


			
			Mojo.loadStylesheets(document, true);
			Mojo.Locale.loadLocaleSpecificStylesheets(document);
		} else {
			delete Mojo.Locale.language;
			delete Mojo.Locale.region;
			delete Mojo.Locale.formatRegion;

			delete Mojo.Locale.resourcePath;
			delete Mojo.Locale.localizedResourcePath;
			delete Mojo.Locale.languageResourcePath;
			delete Mojo.Locale.regionResourcePath;

			delete Mojo.Locale.frameworkResourcePath;
			delete Mojo.Locale.frameworkLocalizedResourcePath;
			delete Mojo.Locale.frameworkLanguageResourcePath;
			delete Mojo.Locale.frameworkRegionResourcePath;

			delete Mojo.Locale.appTemplatePath;
			delete Mojo.Locale.appLanguageTemplatePath;
			delete Mojo.Locale.appRegionTemplatePath;

			delete Mojo.Locale.frameworkTemplatePath;
			delete Mojo.Locale.frameworkLanguageTemplatePath;
			delete Mojo.Locale.frameworkRegionTemplatePath;
		}
	}

	formatRegion = formatRegion || Mojo.Locale.region;
	if (currentLocale && formatRegion && formatRegion != Mojo.Locale.formatRegion) {
		Mojo.Locale.formatRegion = formatRegion.slice(-2).toLocaleLowerCase();
		Mojo.Locale.formatsPath = Mojo.Config.MOJO_FRAMEWORK_HOME + "/formats";
		Mojo.Locale.formats = Mojo.Locale.readFormatsTable();
		Mojo.Format._formatCache = {datetime:{}, date:{}, time:{}, formatType:{}};
	}
};

/** private */
Mojo.Locale._objectIsEmpty = function(object) {
	var property;
	for (property in object) {
		if (true) {			// To make JSLint happy
			return false;
		}
	}
	return true;
};

/** @private */
Mojo.Locale.readFormatsTable = function(region, path) {
	region = (region && region.slice(-2).toLocaleLowerCase()) || Mojo.Locale.formatRegion;
	path = path || Mojo.Locale.formatsPath;
	var formats = Mojo.Locale.readStringTable(Mojo.Locale.language + '_' + region + '.json', '', path);
	if (!formats || Mojo.Locale._objectIsEmpty(formats)) {
		// Fall back to using just the country code to look up formats
		formats = Mojo.Locale.readStringTable(region + '.json', '', path);
	}
	return formats;
};

/** @private */
Mojo.Locale._loadLocalizedStylesheet = function loadLocalizedStylesheet (theDocument, path) {
	var localizedSheet = Mojo.Locale.localizedResourcePath + "/" + path;
	var languageSheet = Mojo.Locale.languageResourcePath + "/" + path;
	var regionSheet = Mojo.Locale.regionResourcePath + "/" + path;
	Mojo.loadStylesheet(theDocument, localizedSheet);
	Mojo.loadStylesheet(theDocument, languageSheet);
	Mojo.loadStylesheet(theDocument, regionSheet);
};

/** @private */
Mojo.Locale.loadLocaleSpecificStylesheets = function loadLocaleSpecificStylesheet(theDocument) {
	var links = theDocument.querySelectorAll('link[type="text/css"]');
	for (var i=0; i < links.length; i++) {
		var path = links[i].href;
		if (path.startsWith(Mojo.appPath)) {
			Mojo.Locale._loadLocalizedStylesheet(theDocument, path.gsub(Mojo.appPath, ""));
		}
	}
};

/** @private */
Mojo.Locale.localizeString = function localizeString(stringToLocalize, stringTable) {
	var key, value;
	if(Object.isString(stringToLocalize)) {
		key = stringToLocalize;
		value = stringToLocalize;
	} else {
		key = stringToLocalize.key;
		value = stringToLocalize.value;
	}

	return (stringTable && stringTable[key]) ||	value;
};

/**
 * Constructor function for an object that acts as a proxy for localized strings.
 * It is used by the $L() and $LL() functions when they are invoked before the
 * string table is loaded. Since this CF provides a toString method in its prototype,
 * it will be converted to a string whenever a string object is needed.
 * @private
 * @param {Boolean} useFramework Pass true to use the framework string table
 * @param {String|Object} stringToLocalize parameter to pass to Mojo.Locale.localizeString
 * @returns localized string proxy object
 * @type Object
 */
Mojo.Locale.StringProxy = function StringProxy(useFramework, stringToLocalize) {
	this.useFramework = useFramework;
	this.stringToLocalize = (stringToLocalize === undefined) ? "" : ("" + stringToLocalize);
};

/**
 * Converts a localized string proxy to the localized string. If the string table
 * isn't loaded yet, just return the unlocalized version. Otherwise, store the localized
 * result and return it.
 * @private
 * @returns Localized string.
 * @type String
 */
Mojo.Locale.StringProxy.prototype.toString = function() {
	// if we already succesfully localized the string, return it.
	if (this.localized) {
		return this.localized;
	}
	
	// pick a string table
	var stringTable;
	if (this.useFramework) {
		stringTable = Mojo.Locale.frameworkStrings;
	} else {
		stringTable = Mojo.Locale.strings;
	}
	
	// If we found it, localize with it.
	if (stringTable) {
		this.localized = Mojo.Locale.localizeString(this.stringToLocalize, stringTable);
		return this.localized;
	}
	
	// Otherwise, return the non-localized string
	return this.stringToLocalize;
};

/**
 * Make sure that when json encoded it encodes as a string.
 * @private
 */
Mojo.Locale.StringProxy.prototype.toJSON = function() {
	return this.toString().toJSON();
};

/**
 * Return the localized version of a string
 * @param {Object} stringToLocalize non-localized string
 */
window.$L = function(stringToLocalize) {
	if (Mojo.Locale.strings) {
		return Mojo.Locale.localizeString(stringToLocalize, Mojo.Locale.strings);
	}
	return new Mojo.Locale.StringProxy(false, stringToLocalize);
};

/**
 * Return the localized version of a string from the framework
 * @private
 * @param {Object} stringToLocalize non-localized string
 */
window.$LL = function(stringToLocalize) {
	if (Mojo.Locale.frameworkStrings) {
		return Mojo.Locale.localizeString(stringToLocalize, Mojo.Locale.frameworkStrings);
	}
	return new Mojo.Locale.StringProxy(true, stringToLocalize);
};
