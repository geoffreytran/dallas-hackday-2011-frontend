/**
 * @name keycodes.js
 * @fileOverview This file has character code value
 * 
 * Copyright 2009 Palm, Inc.  All rights reserved.
 * 
 */
/**
 * @namespace Holds character code value (Refer to the actual source for values) and some useful key code checking methods.
 * @description 
 * Holds character code value (Refer to the actual source for values) and some useful key code checking methods.
 */

Mojo.Char = {};

Mojo.Char.backspace	=  8;
Mojo.Char.tab		=  9;
Mojo.Char.enter		= 13;
Mojo.Char.shift		= 16;
Mojo.Char.opt		= 17;
Mojo.Char.ctrl		= 17;
Mojo.Char.sym       = 17;
Mojo.Char.altKey	= 18;
Mojo.Char.pause		= 19;
Mojo.Char.breakKey	= 19;
Mojo.Char.capsLock	= 20;
Mojo.Char.escape	= 27;
Mojo.Char.spaceBar	= 32;
Mojo.Char.pageUp	= 33;
Mojo.Char.pageDown	= 34;
Mojo.Char.end		= 35;
Mojo.Char.home		= 36;
Mojo.Char.leftArrow	= 37;
Mojo.Char.upArrow	= 38;
Mojo.Char.rightArrow= 39;
Mojo.Char.downArrow	= 40;
Mojo.Char.insert	= 45;
Mojo.Char.deleteKey = 46;
Mojo.Char.zero= 48;
Mojo.Char.one= 49;
Mojo.Char.two= 50;
Mojo.Char.three=51;
Mojo.Char.four=	52;
Mojo.Char.five=	53;
Mojo.Char.six=	54;
Mojo.Char.seven=	55;
Mojo.Char.eight=	56;
Mojo.Char.nine=	57;
Mojo.Char.a=	65;
Mojo.Char.b=	66;
Mojo.Char.c=	67;
Mojo.Char.d=	68;
Mojo.Char.e=	69;
Mojo.Char.f=	70;
Mojo.Char.g=	71;
Mojo.Char.h=	72;
Mojo.Char.i=	73;
Mojo.Char.j=	74;
Mojo.Char.k=	75;
Mojo.Char.l=	76;
Mojo.Char.m=	77;
Mojo.Char.n=	78;
Mojo.Char.o=	79;
Mojo.Char.p=	80;
Mojo.Char.q=	81;
Mojo.Char.r=	82;
Mojo.Char.s=	83;
Mojo.Char.t=	84;
Mojo.Char.u=	85;
Mojo.Char.v=	86;
Mojo.Char.w=	87;
Mojo.Char.x=	88;
Mojo.Char.y=	89;
Mojo.Char.z=	90;
Mojo.Char.leftWindowKey=	91;
Mojo.Char.rightWindowKey=	92;
Mojo.Char.selectKey=	93;
Mojo.Char.numpad0=	96;
Mojo.Char.numpad1=	97;
Mojo.Char.numpad2=	98;
Mojo.Char.numpad3=	99;
Mojo.Char.numpad4=	100;
Mojo.Char.numpad5=	101;
Mojo.Char.numpad6=	102;
Mojo.Char.numpad7=	103;
Mojo.Char.numpad8=	104;
Mojo.Char.numpad9=	105;
Mojo.Char.multiply=	106;
Mojo.Char.add=	107;
Mojo.Char.subtract=	109;
Mojo.Char.decimalPoint=	110;
Mojo.Char.divide=	111;
Mojo.Char.f1=	112;
Mojo.Char.f2=	113;
Mojo.Char.f3=	114;
Mojo.Char.f4=	115;
Mojo.Char.f5=	116;
Mojo.Char.f6=	117;
Mojo.Char.f7=	118;
Mojo.Char.f8=	119;
Mojo.Char.f9=	120;
Mojo.Char.f10=	121;
Mojo.Char.f11=	122;
Mojo.Char.f12=	123;
Mojo.Char.numLock=	144;
Mojo.Char.scrollLock=	145;
Mojo.Char.semiColon=	186;
Mojo.Char.equalSign=	187;
Mojo.Char.comma=	188;
Mojo.Char.dash=	189;
Mojo.Char.period=	190;
Mojo.Char.forwardSlash=	191;
Mojo.Char.graveAccent=	192;
Mojo.Char.openBracket=	219;
Mojo.Char.backSlash=	220;
Mojo.Char.closeBracket=	221;
Mojo.Char.singleQuote=	222;

Mojo.Char.metaKey = 57575; //NEED THIS FOR META CUT/ COPY/ PASTE


Mojo.Char.asciiZero = 48;
Mojo.Char.asciiNine = 57;

/* key determination */

/** 
 * This functions returns true if `key` is the enter key.
 *  
 * @param	{int}	key		Key value to check
 * @return	{boolean}		true if key is the enter key; false otherwise
 *    
 */
Mojo.Char.isEnterKey = function(key) {
	if (key == Mojo.Char.enter) {
		return true;
	}
	return false;
};

/**
 * This function returns true if `key` is the "delete" key.
 * 
 * @param	{int}	key		Key value to check
 * @return	{boolean}		true if key is the "delete" key; false otherwise
 *   
 */
Mojo.Char.isDeleteKey = function(key) {
	if (key == Mojo.Char.deleteKey || key == Mojo.Char.backspace) {
		return true;
	}
	return false;
};

/**
 * Special list of keys HI has deemed commit items
 * 
 * @private
 */

Mojo.Char.isCommitKey = function(key) {
	//space, comma, semicolon
	if (key == 59 || key == Mojo.Char.semiColon || key == Mojo.Char.comma /*|| key == Mojo.Char.spaceBar */|| key == 44) {
		return true;
	}
	return false;
};
       
/**
 * This function returns true if `key` is a valid key within a text field.
 *
 * @param	{int}	keyCode		Key value to check
 * @return	{int}				Non-zero number if key is a "text" key; null otherwise
 * @deprecated Use Mojo.Char.isValidWrittenAsciiChar instead.
 */
Mojo.Char.isValidWrittenChar = function(keyCode) {
	var s = String.fromCharCode(keyCode);
	var valid ="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-+ !@#$%^&*()\"'/?><.,=_";
	if( valid.indexOf(s) >= 0 ) {
		return s;
	}
	return null;
};

/**
 * This function returns true if `key` is one of the keys for a digit (0-9).
 * 
 * @param	{int}	key		Key value to check
 * @return	{boolean}		true if key is a "digit" key; false otherwise
 *   
 */
Mojo.Char.isDigit = function(charCode) {
	return charCode >= Mojo.Char.zero && charCode <= Mojo.Char.nine;
};

/**
 * For keypress; in the browser, this sends the ascii code
 * @private
 */

Mojo.Char.isValidWrittenAsciiChar = function(keyCode) {
	return (keyCode >= 32 && keyCode < 127); //127 is delete
};



/**
 * This function returns true if `key` is a valid key within a text field.
 * 
 * @param	{int}	key		Key value to check
 * @return	{boolean}		true if key is a valid key within a text field; false otherwise
 *   
 */
Mojo.Char.isValid = function(keyCode) {
	//parens keys then 0 key to Z and special chars like _ & key
	if ((keyCode === 0x20) || (keyCode >= 0x26 && keyCode <= 0x5F) || 
	//Multiply key to Divide key
	(keyCode >= 0x6A && keyCode <= 0x6F) || 
	//';:' key to '`~' key
	(keyCode >= 0xBA && keyCode <= 0xC0) || 
	//'[{' key to miscellaneous characters
	(keyCode >= 0xDB && keyCode <= 0xDF) || 
	// angle bracket key or the backslash key
	//and euro sign for QWERTZ
	(keyCode === 0xE2) || (keyCode === 0x20AC)) {
		return true;
	}
	return  false;
};


//invalid ranges:
// 0 - 32 (with space being invalid; space is 32)
// 127-160 (with nbsp being invalid)
//55296-63743
Mojo.Char.isPrintableChar = function(keyCode, spacePrintable) {
	var firstMax;
	
	if (spacePrintable) {
		firstMax = 31;
	} else {
		firstMax = 32;
	}
	// 0 - 32 (with space being invalid; space is 32)
	if (keyCode >= 0 && keyCode <= firstMax) {
		return false;
	}
	// 127-160 (with nbsp being invalid)
	if (keyCode >= 127 && keyCode <= 160) {
		return false;
	}
	
	if (keyCode >= 55296 && keyCode <= 63743) {
		return false;
	}
	
	if (!keyCode) {
		return false;
	}
	
	return true;
};

