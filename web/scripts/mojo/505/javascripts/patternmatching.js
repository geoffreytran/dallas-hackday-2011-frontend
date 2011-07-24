/*global escape, unescape*/

/**
 * @name patternmatching.js
 * @fileOverview This file has functions related to matching system widge patterns.
Copyright 2009 Palm, Inc.  All rights reserved.
*/

/**
 * This entire widget class is private. It is used primarily to perform common filtering and formatting functions for Contacts.
  * @private
  * @class
*/
Mojo.PatternMatching = {};

/**
 * Get the RegExp pattern for contacts where the first letter corresponds to first name and all other letters correspond to last name
 * @param {Object} filter string to match
 */
Mojo.PatternMatching.getContactPatternMatch = function(filter) {
  // does the filter string match the minimum for first/last name matching? (at least 2 chars w/ optional space)
		// strip the first space (if any) to normalize the first/last filter
		var strippedFilter = filter;
		var first;
		var last;
		var flPatternStr;
		var flPattern;
		
		strippedFilter = filter.split(" ");
		
		if (strippedFilter.length < 2) {
			first = strippedFilter[0].charAt(0);
			last = strippedFilter[0].substr(1);
		} else {
			first = strippedFilter[0];
			last = strippedFilter[1];
		}
		
		flPatternStr = "(^first)(.*\\s+)(last)";
		flPatternStr = flPatternStr.replace(/first/, first);
		flPatternStr = flPatternStr.replace(/last/, last);
		flPattern = new RegExp(flPatternStr, 'i');
		return flPattern;
};


/**
 * Properly highlight a contact string when it is being filtered/ matched
 * @param {Object} input text to change
 * @param {Object} filter string to match
 * @param {Object} template optional; what to use to draw the highlighting
 */
Mojo.PatternMatching.addContactMatchFormatting =  function(input, filter , template) {
  	var matchTemplateFile;
  	var formattedText;
  	var matchTemplate;
	var patternStr;
	var beginPattern;
	
	if (!input) {
		return input;
	}
	if (!filter || filter.length === 0) {
		return input;
	}
	
	matchTemplateFile = template || Mojo.Widget.getSystemTemplatePath('/matched');
	matchTemplate = Mojo.View.render({object: { match: 'ZZZZ' }, template: matchTemplateFile});
	
	//escape text in case of special chars
//	filter = escape(filter);
	
	patternStr = "\\b(" + filter + ")";
	beginPattern =  new RegExp(patternStr, 'ig');
	// does the filter string match the minimum for first/last name matching? (at least 2 chars w/ optional space)
	if (filter.search(/\S\s*\S/) != -1) {
		// strip the first space (if any) to normalize the first/last filter
		var flPattern = Mojo.PatternMatching.getContactPatternMatch(filter);
	}
	
	//escape the html before we apply our pattern matching
	input = input.escapeHTML();
	formattedText = input.replace(beginPattern, function(whole, match) {
			return matchTemplate.replace('ZZZZ', match);
	});

	// no matches?  try the first initial/last name approach
	if (flPattern && formattedText == input) {
		formattedText = input.replace(flPattern, function(whole, first, other, last) {
			return matchTemplate.replace('ZZZZ', first) + other + matchTemplate.replace('ZZZZ', last);
		});
	}
	return unescape(formattedText);
};

Mojo.PatternMatching.addContactNameFormatting = function(c, addr) {
	var firstLetter;
	var display = "";
    if (c.firstName) {
		display = c.firstName;
	}
	if (c.lastName) {
		display += " " + c.lastName;
		firstLetter = c.lastName.slice(0,1).toLocaleUpperCase();
	}
	if (display.blank()) {
		display = c.companyName || "";
	}
	if (display.blank()) {
		display = c.displayText || "";
	}
		
	if (display.blank() && addr) {
		//get what comes before @
		var str = addr;
		if (str) {
			var atSign = str.indexOf('@');
			if (atSign > -1) {
				display = str.substring(0, atSign); 
				c.displayIsEmail = true;        
			} else {
				display = str; //always put SOMETHING in there
			}
		}
	}
	
	if (display.blank() && c.contactDisplay) {
		display = c.contactDisplay; //possible was already assigned
	}
	
	return display;
};

Mojo.PatternMatching.addContactLabelFormatting = function(type, label, customLabel, serviceName) {
	var formattedLabel = '';
	
	label = parseInt(label, 10);
	if (type === 'PHONE') {
		switch(label) {
			case 0:
				formattedLabel = $LL('home');
				break;
			
			case 1:
				formattedLabel = $LL('work');
				break;
			
			case 2:
				if (!customLabel || customLabel.blank()) {
					formattedLabel = $LL('other');
				} else {
					formattedLabel = customLabel;
				}
				break;
			
			case 3:
				formattedLabel = $LL('mobile');
				break;
			
			case 4:
				formattedLabel = $LL('pager');
				break;
			
			case 5:
				formattedLabel = $LL('personal fax');
				break;
			
			case 6:
				formattedLabel = $LL('work fax');
				break;
			
			case 7:
				formattedLabel = $LL('main');
				break;
			
			default:
				break;
		}
	} else if (type === 'EMAIL') {
		switch(label) {
			case 0:
				formattedLabel = $LL('home');
				break;
			
			case 1:
				formattedLabel = $LL('work');
				break;
			
			case 2:
				if (!customLabel || customLabel.blank()) {
					formattedLabel = $LL('other');
				} else {
					formattedLabel = customLabel;
				}
				break;
			
			default:
				break;
		}
	} else if (type === 'IM') {
		if (serviceName) {
			formattedLabel = Mojo.PatternMatching.IMNamelabels[serviceName.toLowerCase()] || 'IM';
		} else {
			switch(label) {
				case 0:
				case 1:
					formattedLabel = $LL('IM');
					break;
			
				case 2:
					if (!customLabel || customLabel.blank()) {
						formattedLabel = $LL('other');
					} else {
						formattedLabel = customLabel;
					}
					break;
			
				default:
					break;
			}
		}
	}
	return formattedLabel;
};


Mojo.PatternMatching.IMNamelabels = { 'aol': 'AIM',
                  'yahoo': 'Yahoo!', 
                  'gmail': 'Google', 
                  'msn': 'MSN', 
                  'jabber': 'Jabber', 
                  'icq': 'ICQ',
                  'irc': 'IRC',
					'qq': 'QQ',
					'skype': 'Skype',
					'noDomain': 'IM'
					};
