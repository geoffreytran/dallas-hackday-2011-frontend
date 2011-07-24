/**
 * @name widget_drawer.js
 * @fileOverview This file describes Drawers are container widgets that can be "open", allowing child content to be displayed normally,
	or "closed", keeping it out of view; See {@link Mojo.Widget.Drawer} for more info

Copyright 2009 Palm, Inc.  All rights reserved.

*/


/**
#### Overview ####
Drawers are container widgets that can be "open", allowing child content to be displayed normally, 
or "closed", keeping it out of view. The open state of the drawer depends on a single model property, 
although there are also widget APIs available for manually opening & closing a drawer. 
It should be noted that although these APIs modify the 'open' model property, they do 
not send Mojo.Event.propertyChange events, but use the standard DOM click event instead.


#### Declaration ####

		<div x-mojo-element="Drawer" id="drawerId" class="drawerClass" name="drawerName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
		x-mojo-element	Required	Drawer			Declares the widget as type 'Drawer' 
		id				Required	Any String		Identifies the widget element for use when instantiating or rendering


#### Events ####
None


#### Instantiation ####
    
		this.controller.setupWidget("drawerId",
		     this.attributes = {
		         modelProperty: 'open',
		         unstyled: false
		     },
		     this.model = {
		         open: true
		     });


#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		modelProperty		String			Optional	open		Name of model property to hold the drawer's open state.
		unstyled			Boolean			Optional	false		Prevents styles from being added, allowing the Drawer to be used just 
																	for open/close functionality; drawer contents will always be moved into a Drawer 
																	structure and positioned relatively
		drawerBottomOffset	Number			Optional	0			Defines the min bottom offset for the drawer widget when opening if the size is less than the screen size
		drawerOpenerOffset	Number			Optional	row-height	Defines the size of the opener of the drawer widget so that the opener may be displayed when auto-scrolling when opening
		


#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		open				Boolean			Required	true		Initial Drawer state and toggled with each click


#### Methods ####

		Method			Arguments	Description
		---------------------------------------------------------------------------------------------------------------------------------
	    setOpenState	open		Sets the open state to open or closed
	    getOpenState	none		Returns current value of open state
		toggleState		none		Change the drawer's open state to the opposite of what it is now

	
*/

Mojo.Widget.Drawer = Class.create({
	
	DRAWER_ROW_OFFSET: 48,
	
	/*************
	  Public APIs
	 *************/
	
	/**
	 * Changes the current open state of the drawer, animating to the new state. 
	 * @param {Object} open
	 */
	setOpenState: function(open) {
		this.controller.model[this.propName] = !!open;
		this.updateFromModel();
	},
	
	/**
	 *  Returns 'true' if drawer is currently open, 'false' otherwise.
	 */
	getOpenState: function() {
		return this.wasOpen;
	},

	
	/**
	 * Changes the open state of the drawer to the opposite of what it currently is, animating to the new state. 
	 */
	toggleState: function() {
		this.controller.model[this.propName] = !this.wasOpen;
		this.updateFromModel();
	},
	
	/************************
	  Private Implementation
	 ************************/
	
	/** @private */
	setup: function() {
		var content, elementContent, i;
		var drawerOpenerOffset;
		var attributes = this.controller.attributes;
		Mojo.assert(this.controller.model, "Mojo.Widget.Drawer requires a model. Did you call controller.setupWidgetModel() with the name of this widget?");
		
		drawerOpenerOffset = attributes.drawerOpenerOffset;
		// Which model property to use for our open state?
		this.propName = attributes.property || 'open';
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		this.unstyled = attributes.unstyled;
		this.drawerOpenerOffset = (drawerOpenerOffset === undefined) ? this.DRAWER_ROW_OFFSET : drawerOpenerOffset;
		this.drawerBottomOffset = attributes.drawerBottomOffset || 0;
		elementContent = this.controller.element.childElements(); //pick up content of outer element before overwriting it
		
		content = Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath("drawer/drawer-template"), attributes: {divPrefix: this.divPrefix}});
		this.controller.element.innerHTML = content;
		
		
		// reparent children:
		this.outerDiv = this.controller.get(this.divPrefix+"-outer");
		this.contentDiv = this.controller.get(this.divPrefix+"-content");
		this.wrapper = this.controller.get(this.divPrefix+"-wrapper");
		
		//set initial state
		this.wasOpen = this.controller.model[this.propName];
		if (!this.wasOpen) {
			this.wrapper.setStyle({'height': '0px'});
		}
		
		for (i = 0 ; i < elementContent.length; i++) {
			this.contentDiv.appendChild(elementContent[i]);
		}

		
		// Apply palm-drawer-container and palm-drawer-content classes automatically.
		if(!this.unstyled) {
			this.outerDiv.addClassName('palm-drawer-container');
			this.contentDiv.addClassName('palm-drawer-contents');
    	} else {
			this.contentDiv.setStyle({'position':'relative'}); //make sure the content always gets positioned relatively so we
																//don't have random floating content; palm-drawer-contents already has that style
		}
		
		if(Mojo.Config.animateWithCSS) {
			this.doAnimate = this.animateWithCSS;
		} else {
			this.doAnimate = this.animateWithTimer;
		}

		// Expose public widget API:
		this.controller.exposeMethods(['setOpenState', 'getOpenState', 'updateHeight', 'toggleState']);
	},

	
	/** @private */
	updateHeight: function() {
		Mojo.Log.warn("drawer.mojo.updateHeight is deprecated.");
	},
	
	_updateScrollPosition: function(scroller, origScrollerHeight, pos) {
		if(scroller.mojo.scrollerSize().height === origScrollerHeight) {
			scroller.mojo.setScrollPosition({y: -pos});
		}  else {
			this.scrollPosAnimator.cancel();
		}
			
	},
	
	/** @private */
	scrollIntoView: function(elementHeight) {	
		var scrollToPos;
		
		var scroller = Mojo.View.getScrollerForElement(this.controller.element);
		var element = this.controller.element;
		
		var currentTop = -scroller.mojo.getScrollPosition().top;
		var scrollerHeight = scroller.mojo.scrollerSize().height;
		var contentHeight = scroller.scrollHeight;
		var maxScrollPos = contentHeight - scrollerHeight;
		
		var currentBottom = currentTop + scrollerHeight;

		var elementOffset = Element.positionedOffset(element);

		var currentlyShowing = currentBottom - elementOffset.top;
		var remainingToShow = elementHeight - currentlyShowing;
		
		var newTop = currentTop + remainingToShow;

		var newContentBottom = newTop + scroller.mojo.scrollerSize().height;
		var newContentTop = newContentBottom - elementHeight;
		
		var openerAdjust = this.drawerOpenerOffset;
		
		//Case 1: drawerHeight + adjust > screenHeight, bring opener top to the top of the screen
		//Case 2: drawerHeight + adjust <= screenHeight 
		//			if bottom is off the screen, bring bottom to bottom of screen.
		//			if top is off the screen, bring top to top of the screen
		
		newContentTop -= openerAdjust;

		if(openerAdjust + elementHeight > scrollerHeight) {
			scrollToPos = newContentTop;
		} else if((newContentBottom + this.drawerBottomOffset) > currentBottom) {
			scrollToPos = newTop + this.drawerBottomOffset;
		} else if(newContentTop < currentTop) {
			scrollToPos = newContentTop;
		}
		
		if(scrollToPos) {
			if(scrollToPos > maxScrollPos) {
				var details = {
					from: currentTop,
					to: scrollToPos
				};
				this.scrollPosAnimator = Mojo.Animation.animateValue(Mojo.Animation.queueForElement(this.controller.element), 'zeno', this._updateScrollPosition.bind(this, scroller, scrollerHeight), details);
			} else {
				scroller.mojo.scrollTo(undefined, -scrollToPos, true);
			}
		}
		
	},
		
	/** @private */
	updateFromModel: function() {
		var newHeight;	
		var currentValue = 0;
		var scroller;
		var drawerHeight;
		if (this.wasOpen !== this.controller.model[this.propName]) {
			this.wasOpen = this.controller.model[this.propName];
			newHeight = this.contentDiv.offsetHeight;
			scroller = Mojo.View.getScrollerForElement(this.controller.element);
			
			if (!this.wasOpen) {
				currentValue = newHeight;
			}
			drawerHeight = (this.wasOpen && newHeight) || 0;
			this.scrollIntoView(drawerHeight);
			this.doAnimate(newHeight, currentValue, scroller, drawerHeight);
		}
	},
	
	/** @private */
	animateWithTimer: function(newHeight, currentValue, scroller, drawerHeight) {
		Mojo.Log.error("animateWithTimer:", drawerHeight); // leave this in while comparing approaches
		Mojo.Animation.animateStyle(this.wrapper, 'height', 'bezier', 
			{from: 0, to: newHeight, duration: 0.33, currentValue: currentValue, reverse:!this.wasOpen, onComplete: this.animationComplete.bind(this, scroller, scroller.mojo.scrollerSize().height, drawerHeight), curve: 'ease-in-out'});
	},
	
	/** @private */
	animateWithCSS: function(newHeight, currentValue, scroller, drawerHeight) {
		var that = this;
		var wrapper = that.wrapper;
		var curriedCompletionFunction;
		function completionFunction(scrollerHeight, webkitTransitionEndEvent) {
		 	that.animationComplete(scroller, scrollerHeight, drawerHeight);
		}
		curriedCompletionFunction = completionFunction.curry(scroller.mojo.scrollerSize().height);
		Mojo.Animation.animateStyleWithCSS(wrapper, {property: 'height', duration: 0.33, to: drawerHeight + 'px', setToComputed: true}, curriedCompletionFunction);
	},
	
	/** @private */
	animationComplete: function(scroller, origHeight, drawerHeight, el, cancelled) {
		if(!cancelled) {
			Mojo.Widget.Scroller.validateScrollPositionForElement(this.controller.element);
			if(origHeight !== scroller.mojo.scrollerSize().height) {
				this.scrollIntoView(drawerHeight);
			}
			if (this.wasOpen) {
				this.wrapper.style.height = 'auto'; //so as new elements are written in asynchronously, this will grow
			}
		}
	},
	
	/** @private */
	handleModelChanged: function() {
		this.updateFromModel();
	}
	
});

