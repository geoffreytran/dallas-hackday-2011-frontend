/**
 * @name widget_pickerpopup.js
 * @fileOverview This file contains javascript code;

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/** @private
	PickerPopups
	
	Model:
	{
		value: 			Current value -- this item will be centered & displayed in bold.
		onChoose:		Function, required. 
	 					Called when user makes a choice and the popup is dismissed.
	 	placeOver: 		Element, optional. 
	 					Used to position the popup menu near the triggering element.
		items: 			Array of item objects, of the form {label: , value:}.
		itemsRange:		Object {min:integer, max:integer}.  List will be generated containing numeric items from min-max inclusive.
							May also contain an optional 'interval' property indicating the step value. This defaults to 1 if unspecified.
 	}
	
	
	
*/

Mojo.Widget._PickerPopup = Class.create({
	
	kValueAttribute: 'x-mojo-value',
	kValueSelector: 'div[x-mojo-value]',
	
	kMinTop: 10, // how close can the popup be to the top of the screen?
	
	kRenderLimit: 20, // This should be enough to keep the visible window full of content when scrolling fast.
	kDialogDiffHack: 30, //pixels to remove from top if this popup is in a dialog
	
	/** @private */
	setup : function() {
		var range;
		var selectedItem;
		
		Mojo.assert(this.controller.model, "Mojo.Widget._PickerPopup requires a model. Did you call controller.setupWidgetModel() with the name of this widget?");
		Mojo.assert(this.controller.model.items || this.controller.model.itemsRange, "Mojo.Widget._PickerPopup model requires items or itemsRange to be defined.");
		
		//don't pad numbers in this case
		if (!this.controller.model.padNumbers) {
			this.zeroPadding = null;
		}
		range = this.controller.model.itemsRange;
		this.range = range;
		this.items = this.controller.model.items || this.makeItems(range.min, range.max, range.interval);
		
		
		this.itemTemplate = Mojo.Widget.getSystemTemplatePath("picker/popup-item");
		

		// Move widget element to be a sibling of our placeover element.
		// This lets us use z-index to position the placeover elements over the scrim if needed.
		this.controller.reparent(this.controller.model.placeOver.parentNode);
		
		// Attach event handling stuff:
		this.tapHandler = this.tapHandler.bindAsEventListener(this);
		Mojo.listen(this.controller.element, Mojo.Event.tap, this.tapHandler);
		
		
		// Set initial rendering offset somewhat before the currently selected item, 
		// so the current item is rendered in the dom whenwe go looking for it, to scroll it over the placeNear element.
		this.renderOffset = this.getSelectedIndex() - Math.floor(this.kRenderLimit/2);
		this.addAsScrollListener = this.addAsScrollListener.bindAsEventListener(this);
		
		this.updateFromModel();
		
		
		// Expose 'close' method for our client:
		this.controller.exposeMethods(["close"]);
		
		// Add us to the scene's container stack:
		this.controller.scene.pushContainer(this.controller.element, this.controller.scene.submenuContainerLayer, 
							{cancelFunc:this.close.bind(this)});
		
		this.isDialogChild = this.controller.model.isDialogChild;
		
		selectedItem = this.controller.element.querySelector('div['+this.kValueAttribute+"='"+this.controller.model.value+"']");
		if(selectedItem) {
			this.scrollToCenterItem(selectedItem, false);
		}
		
		this.resizeDebouncer = Mojo.Function.debounce(undefined, this.updateFromModel.bind(this), 0.1, this.controller.window);
		this.controller.listen(this.controller.window, 'resize', this.resizeDebouncer);
	},
	
	cleanup: function() {
		this.controller.stopListening(this.controller.element, Mojo.Event.tap, this.tapHandler);
		if(this.scroller) {
			this.controller.stopListening(this.scroller, Mojo.Event.scrollStarting, this.addAsScrollListener);
		}
		this.controller.stopListening(this.controller.window, 'resize', this.resizeDebouncer);
	},
	
	updateScrollerHeight: function() {
		var scroller = this.scroller;
		if(scroller) {
			scroller.style.maxHeight = (this.controller.window.innerHeight - Mojo.View.getBorderWidth(this.pickerContainer, 'top') - Mojo.View.getBorderWidth(this.pickerContainer, 'bottom')) + 'px';
		}
	},
	
	getMinNumScrollItems: function() {
		// We do not scroll (or wrap) unless we have at least this many items.
		return (this.controller.window.innerHeight / Mojo.Environment.TOUCHABLE_ROW_HEIGHT);
	},
	
	/** @private */
	updateFromModel: function() {
		var itemsHTML;
		var placeOver;
		var viewDims, ourHeight;
		var placeOverOffset;
		var ourOffsetX, ourOffsetY;
		var scrollPos;
		var template;
		var i;

		//resize event occurred when something was already tapped, and was waiting to close.
		//in this case, we're about to destroy everything and not get a scrollEnding.
		//should close now.
		if(this.tappedValue) {
			this.close();
			return;
		}
		
		if(this.items.length < this.getMinNumScrollItems()) {
			// Just render all items if there's no scrolling.
			template = Mojo.Widget.getSystemTemplatePath("picker/popup-noscroll");
			itemsHTML = Mojo.View.render({collection: this.items, 
											template:  this.itemTemplate});
		} else {
			// Render kRenderLimit items, wrapping around if we have a scroller.
			template = Mojo.Widget.getSystemTemplatePath("picker/popup");
			
			// Can't just render with a collection, since we need to "wrap around".
			itemsHTML = '';
			for(i=0; i<this.kRenderLimit; i++) {
				itemsHTML += this.renderItemHTML(i + this.renderOffset);
			}
		}
		
		
		// Render items & container
		
		this.controller.element.innerHTML = Mojo.View.render({object: {itemsHTML:itemsHTML}, 
											template:  template});

		
		// Add scrim:
		this.controller.element.appendChild(Mojo.View.createScrim(this.controller.document, {onMouseDown:this.close.bind(this), scrimClass:'picker-popup'}));

		
		// Find important elements:
		this.pickerContainer = this.controller.element.querySelector('div[x-mojo-picker-popup]');
		this.itemNodes = this.pickerContainer.querySelectorAll(this.kValueSelector);
		
		if(this.scroller) {
			this.controller.stopListening(this.scroller, Mojo.Event.scrollStarting, this.addAsScrollListener);
		}
		
		this.scroller = this.pickerContainer.querySelector("div[x-mojo-element='Scroller']");
		this.itemsParent = this.pickerContainer.querySelector('div[x-mojo-items-parent]');

		this.updateScrollerHeight();
		
		// Create scroller & wraparound cleverness
		this.controller.instantiateChildWidgets();
		
		
		// Apply 'selected' to the current item:
		this.chosenValue = this.controller.model.value;
		this.selectItemsWithValue(this.chosenValue);
		
		// Position container so it's centered on the placeOver element:
		placeOver = this.controller.model.placeOver;
		placeOverOffset = Mojo.View.viewportOffset(placeOver);
		
		viewDims = Mojo.View.getViewportDimensions(this.controller.document);
		ourHeight = this.pickerContainer.offsetHeight;
		
		ourOffsetX = placeOverOffset.left + placeOver.offsetWidth/2 - this.pickerContainer.offsetWidth/2;
		ourOffsetY = placeOverOffset.top + placeOver.offsetHeight/2 - ourHeight/2;
		
		ourOffsetY = Math.max(this.kMinTop, ourOffsetY);
		ourOffsetY = Math.min(ourOffsetY+ourHeight, viewDims.height) - ourHeight;
		
		this.pickerContainer.style.top = ourOffsetY+'px';
		this.pickerContainer.style.left = ourOffsetX+'px';
		
		
		if(this.scroller) {
			this.rowHeight = this.firstItem().getHeight();
			this.scrollerTop = Mojo.View.viewportOffset(this.scroller).top;
			
			
			// Shift items down if the first one is > 5 items above the top of the viewable area,
			// Shift them up if its < 3 items  above the top.
			// We're basically assuming here that we'll never scroll more than 3 items in a single frame... 
			// if this happens, then the scroll would stop & bounce back since we'd run out of content.
			this.shiftDownThreshold = this.rowHeight * -5;
			this.shiftUpThreshold = this.rowHeight * -3;
			
//			this.anchorOffset = placeOverOffset.top - this.scroller.viewportOffset().top-20; // this.controller.model.items.length
//			this.scroller.mojo.scrollTo(0, this.anchorOffset - this.rowHeight * (this.items.length + this.getSelectedIndex()), false);
			
			
			/*
			// Calculate offset so we can scroll our chosen item to be over the item we're aligning with.		
			this.anchorOffset = placeOverOffset.top - this.scroller.viewportOffset().top; // this.controller.model.items.length
		
			// Set initial scroll position so current valued item is properly placed.
			scrollPos = this.scroller.mojo.getScrollPosition();
			scrollPos.top = this.anchorOffset - this.selectedItems[1].offsetTop;
			this.scroller.mojo.scrollTo(scrollPos.left, scrollPos.top, false);
			*/
			//this.scrollToCenterItem(this.selectedItems[1], false);
			
			
			this.controller.listen(this.scroller, Mojo.Event.scrollStarting, this.addAsScrollListener);

			this.moved = Mojo.Widget.Scroller.createThreshholder(this.movedEnough.bind(this), this.itemsParent, this.rowHeight);			

		}
		
	},
	
	/** @private
	 	Find the index in our items array of the item with the currently chosen value.
	*/
	getSelectedIndex: function() {
		var i, items, len, val, interval;
		
		if(this.range) {
			interval = this.range.interval || 1;
			return Math.floor((parseInt(this.controller.model.value, 10) - this.range.min) / interval);
		} else {
			items = this.items;
			len = items.length;
			val = this.controller.model.value;
			for(i=0; i<len; i++) {
				if(items[i].value === val) {
					return i;
				}
			}
		}
		
	},	
	
	/** @private 
		Watch for the end of the scroll, after we've chosen a value.
		The scroll end triggers the call of the onChoose function & dismissal of the popup.
		
		Also, as the scroll continues, we switch items around to provide the illusion of infinite wrapping.
	*/
	movedEnough: function(scrollEnding, position) {
		var node;
		var nodeTop;
		var delta, shift;
		var doc;
		// Close picker if this was the end of our tap-scroll:
		if(this.tappedValue && scrollEnding) {
			this.close();
			return;
		}
		
		// Otherwise, check if we need to rotate the rendered items:
		
		// Calculate top of 1st item
		node = this.firstItem();
		nodeTop = Mojo.View.viewportOffset(node).top - this.scrollerTop;
		doc = this.controller.document;
		
		
		// See how far it is from our shift thresholds:
		delta = nodeTop - this.shiftDownThreshold;
		if(delta >= 0) {
			delta = nodeTop - this.shiftUpThreshold;
			if(delta < 0) {
				delta = 0;
			}
		}
		
		// How many items to shift?
		shift = -Math.ceil(delta / this.rowHeight);
		
		
		// Shift the items:
		while(shift < 0) {
			this.lastItem().remove();
			this.renderOffset--;
			shift++;
			this.itemsParent.insertBefore(Mojo.View.convertToNode(this.renderItemHTML(this.renderOffset), doc), this.itemsParent.firstChild);
			this.scroller.mojo.adjustBy(0, -this.rowHeight);
		}
		
		while(shift > 0) {
			this.firstItem().remove();
			this.itemsParent.appendChild(Mojo.View.convertToNode(this.renderItemHTML(this.renderOffset + this.kRenderLimit), doc));
			this.renderOffset++;
			shift--;
			this.scroller.mojo.adjustBy(0, this.rowHeight);
		}
				
	},
	
	/** @private
		Obtain the first currently rendered item.
	*/
	firstItem: function() {
		var item = this.itemsParent.firstChild;
		while(item && (!item.hasAttribute || !item.hasAttribute(this.kValueAttribute))) {
			item = item.nextSibling;
		}
		
		return item || undefined; // return undefined in place of null
	},
	
	/** @private
		Obtain the last currently rendered item.
	*/
	lastItem: function() {
		var item = this.itemsParent.lastChild;		
		while(item && (!item.hasAttribute || !item.hasAttribute(this.kValueAttribute))) {
			item = item.previousSibling;
		}
		
		return item || undefined; // return undefined in place of null
	},
	
	/** @private
		Returns rendered HTML text for the given item index, 
		wrapping around the items array if index is out of range.
	*/
	renderItemHTML: function(which) {
		var len = this.items.length;
		
		while(which < 0) {
			which += len;
		}
		which = which % len;
		
		return Mojo.View.render({object: this.items[which], 
										template:  this.itemTemplate});	
	},
	
	/** @private
		Scrolls to place the given item exactly over the underlying data display.
	*/
	scrollToCenterItem: function(item, animate) {
		var placeover, placeoverCenter, itemCenter, scrollPos;
		
		if(item && this.scroller) {
			placeover = this.controller.model.placeOver;
			
			placeoverCenter = Mojo.View.viewportOffset(placeover).top + (placeover.offsetHeight/2);
			itemCenter = Mojo.View.viewportOffset(item).top + (item.offsetHeight/2);
			scrollPos = this.scroller.mojo.getScrollPosition();
		
			scrollPos.top += placeoverCenter - itemCenter;
			if (this.isDialogChild) {
				scrollPos.top = scrollPos.top - this.kDialogDiffHack;
			}
			this.scroller.mojo.scrollTo(scrollPos.left, scrollPos.top, animate);
		}
	},
	
	/** @private 
		Generates an items array of all integers between min & max inclusive.
	*/
	makeItems: function(min,max,interval){
		var i, items, label;
		var maxLength = max.toString().length;
		
		interval = interval || 1; // defaults to 1, 0 not allowed.
		
		items = [];
		for(i=min; i<= max; i+=interval) {
			
			label = i.toString();
			if(this.zeroPadding && label.length < maxLength) {
				label = (this.zeroPadding[maxLength - label.length] || '') + label;
			}
			
			items.push({label:label, value:i});
		}
		
		return items;
	},
	
	zeroPadding: ['', '0', '00', '000'],
	
	/** @private */
	addAsScrollListener: function addAsScrollListener(event) {
		event.scroller.addListener(this);
	},
	
	/** @private */
	tapHandler: function(event) {
		var scrollPos;
		var pickerItem;
		event.stop();
		
		// Did we already choose a value? 
		// If so, we're just waiting for the animation to stop.
		if(this.tappedValue) {
			return;
		}
		
		// If tap was on an item, choose it
		pickerItem = Mojo.View.getParentWithAttribute(event.target, this.kValueAttribute);
		
		if(pickerItem) {
			this.chosenValue = pickerItem.getAttribute(this.kValueAttribute);
			this.tappedValue = true;
			
			this.selectItemsWithValue(this.chosenValue);
			
			if(this.scroller) {
//				scrollPos = this.scroller.mojo.getScrollPosition();
//				scrollPos.top = this.anchorOffset - event.target.offsetTop;
//				this.wraparound.mojo.scrollTo(scrollPos.left, scrollPos.top, true);
				this.scrollToCenterItem(event.target, true);
			} else {
				// If there's no scroller, then we just delay a call to the scroll-listener directly.
				// This will trigger cleanup of the widget, and the onChoose callback to be called, etc.
				this.movedEnough.bind(this, true).delay(0.3);
			}
		}
		
	},
	
	/** @private */
	selectItemsWithValue: function(value) {
		
		if(this.selectedItems) {
			this.selectedItems.each(function(el) {el.removeClassName('current-value');});
		}
		
		// Apply 'selected' to the current item:
		this.selectedItems = $A(this.controller.element.querySelectorAll('div['+this.kValueAttribute+"='"+value+"']"));
		this.selectedItems.each(function(el) {el.addClassName('current-value');});		
	},
	
	
	close: function() {
		if(!this.closed) {
			this.closed = true;
			this.controller.scene.removeContainer(this.controller.element);
			this.controller.remove();
			this.controller.model.onChoose(this.chosenValue);
		}
	}

	
});

