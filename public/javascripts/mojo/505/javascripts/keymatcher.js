/**
 * @name keymatcher.js
 * @fileOverview This is a private file.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**#nocode+*/

/** @private
	
	options{
		itemsRange: Object {min: max:} describes integer range to match against.
						May also contain an optional 'interval' property indicating the step value. This defaults to 1 if unspecified.
		items: Array of {label: value:} objects to match against.
		window: Optional window in which to run the clear timeout.
		numeric: If true, input will be passed through a letter->number mapping before processing.
	}
	
*/
Mojo.Event.KeyMatcher = function(onMatch, options) {
	Mojo.assert(options.items || options.itemsRange, "Mojo.Event.KeyMatcher: Options must include items or itemsRange.");
	
	if(options.items) {
		this.items = options.items;
	} else {
		this.itemsRange = options.itemsRange;
		this.interval = this.itemsRange.interval || 1; // defaults to 1, 0 not allowed
		this.memoizedRangeStrings={};
	}
	
	this.numeric = !!options.numeric;
	this.onMatch = onMatch;
	
	// We use a debounce function to manage the clear delay.
	// If there are no keypresses within a second of the last one, then we clear the match string.
	this.delayedClear = Mojo.Function.debounce(undefined, this.clear.bind(this), 1, options.window);
	
	this.clear();
};

/**
	Call this with the charCode from a keypress event to handle keymatching for that event.
*/
Mojo.Event.KeyMatcher.prototype.keyPress = function(charCode) {
	var keyStr;
	
	keyStr = String.fromCharCode(charCode).toLowerCase();
	if(this.numeric) {
		keyStr = this.numericMap[keyStr];
	}
	
	// The numericMap will filter out non-digits.
	if(keyStr) {
		this.matchStr += keyStr;
		this._checkForMatch();
		this.delayedClear();
	}
};

/*
	Clears the current match string, so the next key will start a fresh match
*/
Mojo.Event.KeyMatcher.prototype.clear = function() {
	this.matchStr = '';
	delete this.currentMatch;
};

Mojo.Event.KeyMatcher.prototype._foundMatch = function(value) {
	if(this.currentMatch !== value) {
		this.currentMatch = value;
		this.onMatch(value);
	}
};


Mojo.Event.KeyMatcher.prototype._checkForMatch = function() {
	var i;
	var items = this.items;
	var matchStr = this.matchStr;
	var rangeStrs, curStr;
	
	while(matchStr.length > 0) {
		
		if(this.items) {
			// Search through items list for something beginning with our match string.
			for(i=0; i<items.length; i++) {
				// The .toString() is needed here in case the label is actually a localized string proxy (which don't support the standard string methods).
				if(items[i].label.toString().toLowerCase().startsWith(matchStr)) {
					// Found one! Save it & return, we're done.
					this._foundMatch(items[i].value);
					return;
				}
			}
		}
		else {
			// Special case for matching an integer range.
			
			rangeStrs = this.memoizedRangeStrings;
			
			for(i=this.itemsRange.min; i<=this.itemsRange.max; i+= this.interval) {
				
				// This can generate a lot of string objects, so we memoize them.
				curStr = rangeStrs[i];
				if(curStr === undefined) {
					rangeStrs[i] = i.toString();
					curStr = rangeStrs[i];
				}
				
				if(curStr.startsWith(matchStr)) {
					// Found one! Save it & return, we're done.
					this._foundMatch(i);
					return;
				}
			}
		}
		// No match? Drop the first char, and try again.
		matchStr = matchStr.slice(1);
		this.matchStr = matchStr;
	}
};

Mojo.Event.KeyMatcher.prototype.numericMap = {
	e: '1', r:'2', t:'3',
	d: '4', f:'5', g:'6',
	x: '7', c:'8', v:'9', 
	      '@':'0',
	
	1: '1', 2:'2', 3:'3',
	4: '4', 5:'5', 6:'6',
	7: '7', 8:'8', 9:'9', 
	        0:'0'
};


/** @private
	A small KeyMatcher subclass that overrides _checkForMatch in order to implement custom behavior for matching years.
*/
Mojo.Event.YearKeyMatcher = function(onMatch, options) {
	Mojo.require(options.itemsRange, "Mojo.Event.YearKeyMatcher requires the years to be defined in itemsRange.");
	Mojo.Event.KeyMatcher.apply(this, arguments);
};

// Inherit from KeyMatcher via decorate() so we can override _checkForMatch().
Mojo.Event.YearKeyMatcher.prototype = Mojo.Model.decorate(Mojo.Event.KeyMatcher.prototype);

Mojo.Event.YearKeyMatcher.prototype._checkForMatch = function() {
	var val;
	
	while(this.matchStr.length > 0) {
		val = parseInt(this.matchStr, 10);
		
		// Entered values less than 50 match to the range 2000-2050,
		// higher numbers match to the range 1950-1999
		if(val < 50) {
			val += 2000;
		} else if(val < 100) {
			val += 1900;
		}

		if(val >= this.itemsRange.min && val <= this.itemsRange.max) {
			this._foundMatch(val);
			break;
		} else if(val > this.itemsRange.max) {
			// Remove the first digit and try again.
			this.matchStr = this.matchStr.slice(1);
		}
		else {
			// No match.
			break;
		}
	}
	
};

/**#nocode-*/



