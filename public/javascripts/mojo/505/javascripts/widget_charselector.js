
/**
* @name widget_charselector.js
* @fileOverview This file has functions related to the alternate character selector for
* text fields and text areas.
 * 
 * When property values are changed in the widget, a {@link Mojo.Event.propertyChange} event is dispatched to the widget's DOM element. This entire widget class  
 * is private. It is used by webOS to provide alternate characters to the device.

Copyright 2009 Palm, Inc.  All rights reserved.

*/


/**
* @private
* This entire widget class is private. It is used by webOS to provide alternate characters to the device.
* 
*/
Mojo.Widget.CharSelector = Class.create({
	/** @private */
	HI_PADDING_TOP: 40,
	/** @private */
	HI_PADDING_BOTTOM: 20,
	/** @private */
	HI_PADDING_LEFT: 20,
	/** @private */
	HI_PADDING_RIGHT: 20,
	/** @private */
	HI_COLUMNS: 5,
	/** @private */
	HI_MINIMUM_TOP: 10, //how many pixels from the top minimum
	/** @private */
	HI_MAX_BOTTOM: 5, //how many pixels from the bottom minimum
	
	/** @private */
	itemTemplate: Mojo.Widget.getSystemTemplatePath('/charselector/char'),
	
	/** @private */
	initialize: function() {
		this.CHARSELECTOR_OPEN = 0;
		this.CHARSELECTOR_FILTERING_STATE = 1;
		this.CHARSELECTOR_CLOSED = 2;
		this.CHARSELECTOR_EMPTY = 3;

		this.state = this.CHARSELECTOR_OPEN;

		this.charList = [];
		this.localizedTable = Mojo.Locale.alternateCharacters;
		this.localizedTableFull = Mojo.Locale.alternateCharactersFull;
	},

	/** @private */
	setup: function() {
		var model = this.controller.model;

		this.controller.exposeMethods(['close', 'isOpen']);
		if (this.controller.attributes.target) {
			this.target = this.controller.get(this.controller.attributes.target); 
		} else if (model.selectionTarget){
			this.target = this.controller.get(model.selectionTarget); 
		}    
		this.divPrefix = Mojo.View.makeUniqueId();
		this.currCode = this.controller.model.character;
		if (this.currCode !== undefined) { //zero is valid since it is shift
			this.chorded = true;
		}
		
		if (this.renderWidget(this.controller.model.character)) { //if the render failed because of invalid char, just exit
			this.handleKeyEvent = this.handleKeyEvent.bind(this);
			this.handleKeyUpEvent = this.handleKeyUpEvent.bind(this);
			this.handleMouseEvent = this.handleMouseEvent.bind(this);
			this.controller.listen(this.target, "keydown", this.handleKeyEvent, true);//was true
			this.controller.listen(this.target, "keyup", this.handleKeyUpEvent, true);//was true
			this.controller.listen(this.controller.document, Mojo.Event.tap, this.handleMouseEvent, true);
			
			if (this.chorded) {
				//we are starting with a chorded char AND we have results so this is filtering not just OPEN
				this.state = this.CHARSELECTOR_FILTERING_STATE;
			} else {
				this.enterOpenState();
			}
			this.controller.scene.pushContainer(this.controller.element, this.controller.scene.submenuContainerLayer,
								{cancelFunc:this._emptyAndClose.bind(this)});
			this.controller.scene.pushCommander(this); //only push commander when focused
		}
	},

	/** @private */
	cleanup: function() {
		//we don't cleanup unless there is a charpicker because cleanup is called when the controller.element is first moved into the correct position
		//before anything is actually rendered
		this.charPicker = undefined;
		this.selectedIndex = undefined;
		this.state = this.CHARSELECTOR_CLOSED;
		this.cleanupEventListeners();
	},
	
	//note: this may be called twice
	//once immediately on exitSelectors so dont get double selected alternate characters when delaying a close to show the momentary tap highlighting
	//once when the element is removed from the dom; seems harmless
	/**@private */
	cleanupEventListeners: function() {
		this.controller.stopListening(this.target, "keydown", this.handleKeyEvent, true);
		this.controller.stopListening(this.target, "keyup", this.handleKeyUpEvent, true);
		this.controller.stopListening(this.controller.document, Mojo.Event.tap, this.handleMouseEvent, true);
	},

	/** @private */
	loadTable: function(chr) {
		var data, list;
		var i = 0;
		var that = this;
		var table;
		
		this.charList = []; //empty it
		if (chr) {
			table = this.localizedTable;
		} else if (chr === undefined) {
			table = this.localizedTableFull;
		} else {
			return;
		}
		
		table.each( function(c) {
			if (chr) {
				if (c.keyCode == chr) {
					list = c.list;
				}
			} else {
				list = c.list;
			}
			if (list) {
				list.each( function(item) {
					data = {
						index: i,
						character: item
					};
					that.charList.push(data);
					i++;
				});
			}
			list = undefined;
		});
	},

	/** @private 
	 * Get correct top and left positions based on the cursor and HI's spacing algorithm
	 **/
	_setPopupPositions: function(picker) {
		var top = '', left = '';
		var cursorPos = Mojo.View.getCursorPosition(this.controller.window);
		var targetLeft; //get the dimensions of the target; need for positioning
		var targetTop;
		var pickerDims;//ugh how to get picker height before render?
		var viewDims;
		var maxWidth, minWidth;
		
		if (cursorPos) { //not implemented on mojo host
		 	targetLeft = this.target.offsetLeft;
			targetTop = this.target.offsetTop;
			
			//since we may be using the offscreen position filterfield
			if (targetLeft < 0) {
				cursorPos.x = Math.abs(targetLeft - cursorPos.x);
			}
			
			if (targetTop < 0) {
				cursorPos.y = Math.abs(targetTop - cursorPos.y);
			}
			
		 	viewDims = Mojo.View.getViewportDimensions(this.controller.document);
		 	
		 	//show and hide the picker so can get dimensions
			pickerDims = Mojo.View.getDimensions(picker);
			
			//put it on top!
			if ((pickerDims.height + this.HI_PADDING_BOTTOM + cursorPos.y) > viewDims.height) {
				top = cursorPos.y - (pickerDims.height + this.HI_PADDING_TOP);
				if (top < this.HI_MINIMUM_TOP) {
					top = this.HI_MINIMUM_TOP; //make sure it never goes higher than this
				}
			} else { //put it on the bottom
				top = cursorPos.y + cursorPos.height + this.HI_PADDING_BOTTOM;
				if ((top + pickerDims.height) > (viewDims.height - this.HI_MAX_BOTTOM)) {
					top = viewDims.height - this.HI_MAX_BOTTOM - pickerDims.height; //make sure it never goes lower than this
				}
			}
			
			left = cursorPos.x;// + cursorPos.width; //starting position
			maxWidth = viewDims.width - this.HI_PADDING_RIGHT;
			minWidth = targetLeft + this.HI_PADDING_LEFT;
			//take care of positioning; the goal is to get this centered without having the picker hang off the screen in either direction
			if ((pickerDims.width + cursorPos.x) > maxWidth) {
				//this will hang off the right of the screen
				left = maxWidth - pickerDims.width;
			} else if ((cursorPos.x - pickerDims.width) < minWidth) {
				//this will hang off the left of the screen
				left = minWidth;
			}
			
			left += 'px';
			top += 'px';
		} else if (this.target.type === 'application/x-palm-browser') {
			//its the browser, make the special browser call to figure out where to put this
		} else {
			left = '0px'; //set this to 0px so we get something that sort of works on luna host
			top = '0px';
		}
		
		this.charPicker.setStyle({'top':top, 'left': left});//hard-coded left until put in the next algorithm
	},
	
	/** @private */
	translateToRow: function(results) {
		//this.HI_COLUMNS per row, so take the results and turn them into rows
		var finished = false;
		var result;
		var newOffset = 0;
		var transformedResults = [];
		
		while (!finished) {
			result = {};
			
			//we take 5 at a time, and slice will just get to the end of the list if the limit is greater than the length
			result.characters = Mojo.View.render({collection: results.slice(newOffset, newOffset+this.HI_COLUMNS), attributes: {divPrefix: this.divPrefix}, template: this.itemTemplate});
			newOffset += this.HI_COLUMNS;
			transformedResults.push(result);
			if (newOffset >= results.length) { //reached the end; bail out
				finished = true;
			}
		}
		return transformedResults;
	},
	
	/** @private */
	renderWidget: function(chr) {
		var data;
		var charContent;
		var charContentModel;
		var pickerContent;
		var parent;
		
		this.loadTable(chr);
		if (this.charList && this.charList.length > 0) {	//dont render an empty list	
			//get the cursor position
			charContentModel = {
				divPrefix: this.divPrefix
			};
		
			this.itemsModel = {items: this.translateToRow(this.charList)};
			this.charPicker = undefined; //start as undefined so that cleanup doesnt get triggered on updates
			pickerContent = Mojo.View.render({object: charContentModel, template: Mojo.Widget.getSystemTemplatePath('/charselector/charselector')});
			//get the scene scroller
			parent = Mojo.View.getScrollerForElement(this.target);
			if (!parent) {
				parent = this.controller.scene.sceneElement;
			}
			if (this.controller.element.parentNode !== parent) {
				this.controller.reparent(parent);
			}
			this.controller.element.innerHTML = pickerContent;
			
			this.charPicker = this.controller.get(this.divPrefix+'-char-selector-div');
			
			this.controller.scene.setupWidget('char-list', 
								    {itemTemplate:Mojo.Widget.getSystemTemplatePath('charselector/char-selector-row'), renderLimit: 30}, this.itemsModel);
			this.controller.instantiateChildWidgets(this.charPicker);
			this.controller.scene.showWidgetContainer(this.charPicker);
			this._setPopupPositions(this.charPicker);
		
			this.selectedIndex = 0;
			this._updateSelected(null, this._selectedIdxElem());
			if (this._selectedIdxElem()) {  
				this.perLine =  Math.floor(Element.getWidth(this.charPicker) / Element.getWidth(this._selectedIdxElem()));
			} else {
				this.perLine = 0;
			}
			return true;
		} else {
			if (!this.chorded) {
				this.exitSelector(); //per new behavior, exit when we get a char that has no matches
				return false;
			} else {
				return true; //go through the motions for a chorded version
			}
		}
	},

	/** @private */
	enterOpenState: function() {
		//this state, all characters from the table should be drawn
		this.state = this.CHARSELECTOR_OPEN;
	},
	
	/** @private */
	_maybeRemoveCharpicker: function() {
		if (this.charPicker) {
			if (this.charPicker.parentNode) {
				Element.remove(this.charPicker);
			}
			this.charPicker = undefined;
		}
	},

	/** @private */
	enterFilteringState: function(keyCode) {
		//in this state, the user has either held the menu key AND held and released a letter
		this.state = this.CHARSELECTOR_FILTERING_STATE;

		if (this.currCode !== keyCode) {
			this.currCode = keyCode;
			//update the contents of the view area
			this._maybeRemoveCharpicker();
			this.renderWidget(this.currCode);
		} else {
			//advance
			this.advance();
		}
	},

	/** @private */
	handleModelChanged: function(model, what) {
		Element.show(this.charPicker);
		if (Mojo.Char.isPrintableChar(this.controller.model.character, false)) {
			this.enterFilteringState(this.controller.model.character);
		}
	},

	/** @private */
	_emptyAndClose: function() {
		this.state = this.CHARSELECTOR_EMPTY; //empty the char selector; we don't want any changes from a container submission
		this.close();
	},

	/** @private */
	close: function() {
		//check if there is a letter involved and a currently selected one, if so, need to select it on exit
		if (this.state === this.CHARSELECTOR_FILTERING_STATE || this.state === this.CHARSELECTOR_OPEN) {
			this.exitSelector(this.getEntered());
			return;
		}  
		      
		this._safeRemove();	
	},

	/** @private */
	isOpen: function() {
		return this.state !== this.CHARSELECTOR_CLOSED;
	},


	/** @private */
	exitSelector: function(chr) {
		var letter;
		var characterVal, selection;
		var tagName = this.target.tagName;
		var selectionStart, selectionEnd;
		var isWebView = false;
		
		//setup that this is a webview so we don't focus it
		if (this.target.mojo && this.target.mojo.insertStringAtCursor) {
			isWebView = true;
		}
		
		this.state = this.CHARSELECTOR_CLOSED;
		
		//do I want to set the content of the input area, or just update the property?
		if (chr) {
			letter = chr.character;
			selection = this.controller.window.getSelection();
			//make sure there are any available range to index as getRangeAt does not protect against that
			if (selection && selection.rangeCount > 0 && selection.getRangeAt(0)) { 
				this.controller.document.execCommand("insertText", true, letter);
			} else if (isWebView && letter !== null && letter !== undefined) {
				this.target.mojo.insertStringAtCursor(letter);
			}
			
			//need this for now to update hinttext in textfields
			if (this.target.mojo && this.target.mojo.setText) {
				selectionStart = this.target.selectionStart;
				selectionEnd = this.target.selectionEnd;
				this.target.mojo.setText(this.target.value || this.target.mojo.value);
				
				if (selectionStart !== undefined) {
				this.target.selectionStart = selectionStart;
				}
				if (selectionEnd !== undefined) {
				this.target.selectionEnd = selectionEnd;
			}
			}
			
			//we have to defer the closing of the char picker so that we can see the momentary highlight
			this.cleanupEventListeners();
			this._safeRemove.bind(this).delay(0.2);
		} else {
			this._safeRemove();
		}
		
		if (!isWebView) {
			this.target.focus();
		}
	},

	/** @private */
	_safeRemove: function() {
		this.controller.scene.removeContainer(this.controller.element);
		if (this.controller.element && this.controller.element.parentNode) {
			Element.remove(this.controller.element);
		}
	},

	/** @private */
	_insertChar: function(origValue, letter, start, end) {
		var value = '';
		if (origValue) {
			value = origValue.substring(0,start);
			value+= letter;
			value += origValue.substring(end, origValue.length);
		} else {
			value = letter;
		}
		return value;
	},

	/** @private */
	advance: function() {
		var old = this._selectedIdxElem();
		var newElm;
		
		if (this.selectedIndex + 1 > this.charList.length - 1) {
			this.selectedIndex = 0;
		} else {
			this.selectedIndex++;
		}
		
		newElm = this._selectedIdxElem();
		this._updateSelected(old, newElm);
	},

	/** @private */
	retreat: function() {
		var old, newElm;
		
		old = this._selectedIdxElem();
		if (this.selectedIndex === 0) {
			this.selectedIndex = this.charList.length -1;
		} else {
			this.selectedIndex = this.selectedIndex -1;
		}
		newElm = this._selectedIdxElem();
		this._updateSelected(old, newElm);
	},

	/** @private */
	_getMatching: function(element, query) {
		if (!element) {
			return;
		}
		return element.querySelector("[name='"+query+"']");
	},
	
	/** @private */
	_updateSelected: function(oldSelection, newSelection) {
		var node;
		if (oldSelection) {
			node = this._getMatching(oldSelection, oldSelection.getAttribute("name"));
			if (node) {
				node.removeClassName("selected-char");
			}
		}
		if (newSelection) {
			node = this._getMatching(newSelection, newSelection.getAttribute("name"));
			if (node) {
				node.addClassName("selected-char");
			}
		}
	},
	
	
	/** @private */
	moveDown: function() { 
		var old, newElm;
		if (this.selectedIndex + this.perLine < this.charList.length) {
			old = this._selectedIdxElement();
			this.selectedIndex = this.selectedIndex + this.perLine;
			newElm = this._selectedIdxElement();
			this._updateSelected(old, newElm);
		}
	},

	/** @private */
	moveUp: function() {
		var old, newElm;
		if (this.selectedIndex - this.perLine >= 0) {
			old = this._selectedIdxElem();
			this.selectedIndex = this.selectedIndex - this.perLine;
			newElm = this._selectedIdxElem();
			this._updatedSelected(old, newElm);
		}
	},

	/** @private */
	updatePosition: function(key) {
		switch (key) {
			case Mojo.Char.leftArrow:
			this.retreat();
			break;
			case Mojo.Char.upArrow:
			this.moveUp();
			break;
			case Mojo.Char.rightArrow:
			this.advance();
			break;
			case Mojo.Char.downArrow:
			this.moveDown();
			break;
			default: 
			break;
		}

		if (this.charPicker) {
			this.controller.get(this.divPrefix+'-char-selector').mojo.revealElement(this._selectedIdxElem()); //scroll to new element
		}
	},


	/** @private */
	handleKeyUpEvent: function(event) {
		var keyCode = event.keyCode;
		var chr;
		
		if (this.isSymKey(keyCode)) {
			if (this.state === this.CHARSELECTOR_FILTERING_STATE) {
				chr = this.getEntered();
			}
			this.exitSelector(chr);
			Event.stop(event);
			return;
		}
	},
	
	/** @private */
	handleKeyEvent: function(event) {
		var keyCode = event.keyCode;

		if (Mojo.Char.isEnterKey(keyCode)) {
			this.exitSelector(this.getEntered());
			Event.stop(event);
			//clear selected char
			return;
		}
		if (Mojo.Char.isDeleteKey(keyCode)) {
			this.exitSelector();
			Event.stop(event);
			return;
		}
		if (this.isDirectionalKey(keyCode)) {
			this.updatePosition(keyCode);
			Event.stop(event);
			return;
		}

		if (!Mojo.Char.isPrintableChar(keyCode, false)) {
			return; //don't bother triggering anything here
		}

		switch (this.state) {
			case this.CHARSELECTOR_OPEN:
			case this.CHARSELECTOR_FILTERING_STATE:
			case this.CHARSELECTOR_EMPTY:  
				this.enterFilteringState(keyCode);   
				Event.stop(event);   
				break;
			default:
				break;
		}
	},

	/** @private */
	handleMouseEvent: function(event) {
		
		switch (this.state) {
			case this.CHARSELECTOR_OPEN:
			case this.CHARSELECTOR_FILTERING_STATE:
			case this.CHARSELECTOR_SINGLEFILTER_STATE:
			if (this.isInCharPicker(event.target)) {
				this.exitSelector(this.getSelected(event.target));
				event.stop();
			} else {
				this.exitSelector();
			}
			break;
			default:
			break;
		}
	},

	/** @private */
	getEntered: function() {
		return this.charList[this.selectedIndex];
	},

	/** @private */
	getSelected: function(target) {
		var chr = target.getAttribute('name');
		//get the character corresponding to the input in this div
		return this.charList[chr];
	},

	/******* key determination for switching states *****/
	/** @private */


	/** @private */
	isDirectionalKey: function(key) {
		if (key == Mojo.Char.leftArrow|| key == Mojo.Char.upArrow|| key == Mojo.Char.rightArrow|| key == Mojo.Char.downArrow) {
			return true;
		}
		return false;
	},

	/** @private */
	isInCharPicker: function(target) {
		if (!this.charPicker) {
			return;
		}
		if (target.id == this.charPicker.id || Element.up(target, 'div#'+this.charPicker.id)) {
			return true;
		}
		return false;
	},
	
	/** @private */
	isSymKey: function(keyCode) {
		return keyCode === Mojo.Char.sym;
	},

	/** @private */
	_selectedIdxElem: function() {
		return this.controller.get(this.divPrefix+"-"+this.selectedIndex);			
	},
	
	/** @private */
	handleCommand: function(commandEvent) {
		if(commandEvent.type === Mojo.Event.back && (this.state !== this.CHARSELECTOR_CLOSED && this.state !== this.CHARSELECTOR_EMPTY)) {
			this.exitSelector();
			Event.stop(commandEvent);
		}
	}
});


/**
 * Returns whether or not the key matching keyCode corresponds to any alternate characters on the system.
 * 
 * @param {int} keyCode
 * @returns {boolean}
 */
Mojo.Widget.CharSelector.prototype.hasKeyAlternates = function(keyCode) {
	//check the list for associated items; if none, return
	var i = 0;
	var list = Mojo.Locale.alternateCharacters;
	for (i = 0; i < list.length; i++) {
		if (list[i].keyCode === keyCode) {
			return true;
		}
	}
	return false;
};
