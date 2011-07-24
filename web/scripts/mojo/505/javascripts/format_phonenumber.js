/**
 * @name format_phonenumber.js
 * @fileOverview This file contains the implementation of Mojo.Format.formatPhoneNumber(), used for formatting phone numbers.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

Mojo.Format._PhoneNumberFormatter = Class.create({	
	initialize: function(number) {
		this.originalNumber = number;
		this.inputNumber = number.replace(/[^\d\+A-Za-z#\*]/g, '');
		this.number = "";
		this.prefix = "";
		this.international = false;
		this.longDistance = false;
		this.currentState = this.startState;
	},
	
	format: function() {
		var count = this.inputNumber.length;
		var r = new RegExp(
			// Only handles formatting for US numbers; we may implement better
			// international support in the future
			// 234-5678,
			"(^[1-9A-Za-z][\\dA-Za-z]{6}$)|" +
			// 234-567-8901,
			"(^[1-9A-Za-z][\\dA-Za-z]{9}$)|" +
			// 1 234-567-8901,
			"(^1[\\dA-Za-z]{10}$)|" +
			// +1 234-567-8901
			"(^\\+1[\\dA-Za-z]{10}$)");
		if (r.test(this.inputNumber)) {
			for (var i = 0; i < count; ++i) {
				var c = this.inputNumber.charAt(i);
				if (c == '0') {
					this.currentState = this.currentState.handleZero(this);
				} else if (c == '1') {
					this.currentState = this.currentState.handleOne(this);
				} else {
					this.currentState = this.currentState.handleOther(this, c);
				}
			}
			this.currentState.handleEnd(this);
			this.extractParts();
			return this.formatParts();
		}
		
		// Everything else, we return as-is; in particular, "numbers" that are
		// not at all recognizaieble as such.
		return this.originalNumber;
	},
	
	appendToNumber: function(value) {
		this.number += value;
	},
	
	extractParts: function() {
		if (!this.international) {
			if (this.longDistance || this.number.length > 7) {
				this.areaCode = this.number.slice(0,3);
				this.exchange = this.number.slice(3, 6);
				this.numberPart = this.number.slice(6, 10);
			} else {
				this.areaCode = "";
				this.exchange = this.number.slice(0, 3);
				this.numberPart = this.number.slice(3, 7);
			}
		}
	},
	
	/** @deprecated */
	appendWithDelimeters: function(b, value, preDelim, postDelim){
		if (value && value.length > 0) {
			if (preDelim && (b.length > 0 || !preDelim ==" ")) {
				b = b + preDelim;				
			}
			b = b + value;
			if (postDelim) {
				b = b + postDelim;				
			}
		}
		return b;
	},
	
	formatParts: function() {
		var b = "";
		if (this.international) {
			if (this.prefix == "+") {
				b = this.appendWithDelimeters(b, this.prefix, null, null);
				b = this.appendWithDelimeters(b, this.number, null, null);
			} else {
				b = this.appendWithDelimeters(b, this.prefix, null, null);
				b = this.appendWithDelimeters(b, this.number, " ", null);
			}
		} else {
			if (this.number.length > 10) {
				b = b + this.prefix + this.number;
			} else {
				if (this.longDistance) {
					b = this.appendWithDelimeters(b, this.prefix, null, null);
					b = this.appendWithDelimeters(b, this.areaCode, " (", ") ");
				} else {
					b = this.appendWithDelimeters(b, this.areaCode, " (", ") ");
				}
				b = this.appendWithDelimeters(b, this.exchange, null, null);
				b = this.appendWithDelimeters(b, this.numberPart, "-", null);				
			}
		}
		return b;
	}
	
});


(function() {

	var AbstractState = Class.create({
		handleZero: function(formatter){
			return this.handleOther(formatter, "0");
		},

		handleOne: function(formatter){
			return this.handleOther(formatter, "1");
		},

		handleOther: function(formatter, character){
			formatter.appendToNumber(character);
			return this;
		},

		handleEnd: function(formatter){
			return formatter.endState;
		}
	});

	var StartState = Class.create(AbstractState, {
		handleZero: function(formatter) {
			formatter.appendToNumber("0");
			return formatter.zeroState;
		},

		handleOne: function(formatter){
			formatter.longDistance = true;
			formatter.prefix = "1";
			return formatter.collectNumberState;
		},

		handleOther: function(formatter, character){
			if (character == '+') {
				return formatter.plusState;
			}
			formatter.appendToNumber(character);
			return formatter.collectNumberState;
		}
	});

	var EndState = Class.create(AbstractState, {
		handleOther: function(formatter, character){
			return this;
		},

		handleEnd: function(formatter, character){
			return this;
		}
	});

	var ZeroState = Class.create(AbstractState, {
		handleOne: function(formatter){
			formatter.appendToNumber("1");
			return formatter.zeroOneState;
		},

		handleOther: function(formatter, character){
			//FIXME: why did we need this?
	//		formatter.appendToNumber("0");
			formatter.appendToNumber(character);
			return formatter.collectNumberState;
		}
	});

	var ZeroOneState = Class.create(AbstractState, {
		handleEnd: function(formatter){
			//FIXME: why did we need this?
	//		formatter.appendToNumber("01");
			return formatter.endState;
		},

		handleOne: function(formatter){
			formatter.appendToNumber("1");
	//		formatter.number = "";
			formatter.international = true;
			return formatter.collectNumberState;
		},

		handleZero: function(formatter){
			formatter.appendToNumber("0");
			return formatter.collectNumberState;
		},

		handleOther: function(formatter, character){
			//FIXME: why did we need this?
	//		formatter.appendToNumber("01");
			formatter.appendToNumber(character);
			return formatter.collectNumberState;
		}
	});

	var PlusState = Class.create(AbstractState, {
		handleEnd: function(formatter){
			formatter.appendToNumber("+");
			return formatter.endState;
		},

		handleOne: function(formatter){
			formatter.longDistance = true;
			formatter.prefix = "+1";
			return formatter.collectNumberState;
		},

		handleOther: function(formatter, character){
			formatter.international = true;
			formatter.prefix = "+";
			formatter.appendToNumber(character);
			return formatter.collectNumberState;
		}
	});

	var CollectNumberState = Class.create(AbstractState, {
		handleOther: function(formatter, character){
			formatter.appendToNumber(character);
			return this;
		}
	});
	
	Mojo.Format._PhoneNumberFormatter.prototype.collectNumberState = new CollectNumberState();
	Mojo.Format._PhoneNumberFormatter.prototype.endState = new EndState();
	Mojo.Format._PhoneNumberFormatter.prototype.startState = new StartState();
	Mojo.Format._PhoneNumberFormatter.prototype.plusState = new PlusState();
	Mojo.Format._PhoneNumberFormatter.prototype.zeroState = new ZeroState();
	Mojo.Format._PhoneNumberFormatter.prototype.zeroOneState = new ZeroOneState();
	
})();




Mojo.Format.formatPhoneNumber = function(number) {
	var digits;
	
	// Disable phone number formatting for regions outside north america,
	// since we currently only format numbers according to that scheme.
	var region = Mojo.Locale.getCurrentFormatRegion().toLocaleLowerCase().slice(-2);
	switch (region) {
 		case 'ca':
 		case 'us':
 			break;
		default:
 			return number;
 	}
	
	if (number.length === 0 || typeof number !== "string") {
		// TODO: wrap in something that returns a default value?
		return "";
	} 
	digits = '0123456789';

	// US phone number formatter; correct to do for 1.0
	// Don't format if it doesn't start with a digit, or isn't a '+1' long 
	// distance US number
	if ((digits.include(number.charAt(0)) && number.length >= 7) ||
		(number.charAt(0) === '+' && number.charAt(1) === '1' && number.length === 12)) {
		return new Mojo.Format._PhoneNumberFormatter(number).format();	
	}
	return number;
};
