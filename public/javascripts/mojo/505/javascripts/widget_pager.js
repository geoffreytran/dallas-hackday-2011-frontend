/**
 * @name widget_pager.js
 * @fileOverview This file discusses the Pager Widget class which can be used to ...;
 * See {@link Mojo.Widget.Pager} for more info. 

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * Describe the Mojo.Widget.Pager class
 */
Mojo.Widget.Pager = Class.create({

	/** @private */
	setup : function() {
		Mojo.assert(this.controller.element, "Mojo.Widget.Pager requires an element");
		Mojo.assert(this.controller.model, "Mojo.Widget.Pager requires a model");
		this.scroller = Mojo.View.getScrollerForElement(this.controller.element);
		this.addAsScrollListener = this.addAsScrollListener.bind(this);
		this.controller.listen(this.scroller, Mojo.Event.scrollStarting, this.addAsScrollListener);
		this.pageDimensions = this.scroller.getDimensions();
		var pagedItem = this.controller.element.firstDescendant();
		var pagedItemDimensions = this.controller.model.getDimensions();
		pagedItem.remove();
		var enclosingItem = pagedItem.wrap();
		this.controller.element.insert({top: enclosingItem});
		enclosingItem.setStyle({height: pagedItemDimensions.height + 'px', width: pagedItemDimensions.width + 'px'});
		this.pagedItem = enclosingItem.firstDescendant();
		this.pagedItem.makePositioned();
		var img = this.pagedItem.firstDescendant();
		img.makePositioned();
		this.pagedItem.setStyle({height: this.pageDimensions.height + 'px', width: this.pageDimensions.width + 'px', overflow: 'hidden'});
		
		/* set up a 100 pixel threshhold on window updates */
		this.moved = Mojo.Widget.Scroller.createThreshholder(this.movedEnough.bind(this), this.controller.element, 100);			
	},
	
	cleanup: function() {
		this.controller.stopListening(this.scroller, Mojo.Event.scrollStarting, this.addAsScrollListener);
	},
	
	addAsScrollListener: function(event) {
		event.scroller.addListener(this);
	},
	
	movedEnough: function() {
		var offset = this.scroller.mojo.getScrollPosition();
		var dimensions = this.controller.element;
		offset.left = -offset.left;
		offset.top = -offset.top;
		var w2 = this.pageDimensions.width/2;
		var h2 = this.pageDimensions.height/2;
		var pageLocation = {
			left: (offset.left-w2), 
			top: (offset.top-h2), 
			right: (offset.left + this.pageDimensions.width + w2), 
			bottom: (offset.top + this.pageDimensions.height + h2)
		};
		pageLocation.top = Math.max(0, pageLocation.top);
		pageLocation.left = Math.max(0, pageLocation.left);
		var h = pageLocation.bottom - pageLocation.top;
		var w = pageLocation.right - pageLocation.left;
		this.pagedItem.setStyle({left: pageLocation.left + 'px', top: pageLocation.top + 'px', width: w + 'px', height: h + 'px'});
		this.controller.model.scrollTo(pageLocation.left, pageLocation.top);
	}
	
});
