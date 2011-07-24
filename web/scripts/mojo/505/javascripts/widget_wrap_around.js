/**#nocode+
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * This entire widget class is private in the v1 Framework.
  * @private
  * @class
*/
Mojo.Widget.ExperimentalWrapAround = function WrapAround(argument) {
};

/** @private */
Mojo.Widget.ExperimentalWrapAround.prototype.setupOptional = true;

/** @private */
Mojo.Widget.ExperimentalWrapAround.prototype.setup = function setup() {
	this.wrapTarget = this.controller.element.firstDescendant();
	this.wrapTargetHeight = this.wrapTarget.getDimensions().height;
	this.wrapTargetTopClone = this.wrapTarget.cloneNode(true);
	this.wrapTarget.parentNode.insertBefore(this.wrapTargetTopClone, this.wrapTarget);
	this.wrapTargetBottomClone = this.wrapTarget.cloneNode(true);
	this.wrapTarget.parentNode.appendChild(this.wrapTargetBottomClone);
	this.scroller = Mojo.View.getScrollerForElement(this.controller.element);
	this.addAsScrollListener = this.addAsScrollListener.bind(this);
	this.controller.listen(this.scroller, Mojo.Event.scrollStarting, this.addAsScrollListener);	
	this.controller.exposeMethods(["scrollTo"]);
	
};

Mojo.Widget.ExperimentalWrapAround.prototype.cleanup = function cleanup() {
	if (this.scroller) {
		this.controller.stopListening(this.scroller, Mojo.Event.scrollStarting, this.addAsScrollListener);
	}
};

/** @private */
Mojo.Widget.ExperimentalWrapAround.prototype.addAsScrollListener = function addAsScrollListener(event) {
	event.scroller.addListener(this);
	/* set up a 100 pixel threshhold on window updates */
	this.moved = Mojo.Widget.Scroller.createThreshholder(this.movedEnough.bind(this), this.controller.element, 100);
	this.scroller.mojo.scrollTo(undefined, -this.wrapTargetHeight);
};

/** @private */
Mojo.Widget.ExperimentalWrapAround.prototype.movedEnough = function movedEnough() {
	var offset = this.scroller.mojo.getScrollPosition();
	var top = -offset.top;
	if (top > 3*this.wrapTargetHeight/2) {
		this.scroller.mojo.adjustBy(0, this.wrapTargetHeight);		
	} else if (top < this.wrapTargetHeight/2) {
		this.scroller.mojo.adjustBy(0, -this.wrapTargetHeight);		
	}
};

/**
	This is a wraparound-specific scrollTo method, which behaves much like the one in the scroller.
	The call is passed through to the containing scroller... the only difference is that when possible the 
	current scroll position is first adjusted away from the direction in which we will be scrolling,
	in order to "make more room".  This is intended for use with animated scrolls, and helps to ensure
	that we don't try to go past the end of our triplicated content when we get a reqest for a long scroll 
	in a particular direction, and we're already positioned fairly far towards that end of our content.
*/
Mojo.Widget.ExperimentalWrapAround.prototype.scrollTo = function(x,y,animate) {
	var pos = this.scroller.mojo.getScrollPosition();
	var top = -pos.top;
	
	if(top > this.wrapTargetHeight && -y > top){
		this.scroller.mojo.adjustBy(0, this.wrapTargetHeight);		
		y += this.wrapTargetHeight;
	} else if (top < this.wrapTargetHeight && -y < top) {
		this.scroller.mojo.adjustBy(0, -this.wrapTargetHeight);
		y -= this.wrapTargetHeight;
	}
	
	this.scroller.mojo.scrollTo(x, y, animate);
};


/**#nocode-*/
