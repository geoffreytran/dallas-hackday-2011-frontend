/**
 * @name dragndrop.js
 * @fileOverview This file has functions related to Dragging; See {@link Mojo.Drag} for more info. 

Copyright 2009 Palm, Inc.  All rights reserved.

*/



/**
 * @namespace
 */ 
Mojo.Drag = {};

/** @private */
Mojo.Drag.kDropAttribute = 'x-mojo-drop-container';


/**
 * @constant
 * @description The default CSS class applied to elements being dragged.
 * @private
 */
Mojo.Drag.elementClass = "palm-drag-element";

/**
 * @constant
 * @description This CSS class is applied to containers with a dragged element actively hovering over them.
 * @private
 */
Mojo.Drag.containerClass = "palm-drag-container";




/**
This function can be used to start dragging an element, and returns an active "dragger" object.
This usually happens when the mouse is down, and maybe before the dragStart event actually occurs.
In some cases, it's called when a hold event occurs (for stuff dragged on a push-and-hold),
and in other cases, it's called on mousedown or dragStart.

The dragger sets things up for dragging, and prevents the drag from causing the scene to be scrolled.
Both `dragEnd` and `tap` events will cause the drag operation to end, since `dragStart`/`dragEnd` events may
never occur if there are no mousemove events.  This sort of "aborted" drag operations are treated like 
any other, and will still cause the appropriate enter & drop methods to be called on the container.

@param {string} sceneController		The controller for the scene containing the element to be dragged.
@param {string} element				DOM element to begin dragging.
@param {Event} startEvent				The user event which began the drag... generally a mousedown event on 
									the element being dragged. Used for hit detection with containers.
@param {hash} options				Hash of the following optional values:

<table>
	<tr><td width="30%">draggingClass</td>			<td>CSS class to apply when dragging starts, and remove when it's finished.
														</td></tr>
	<tr><td width="30%">preventVertical</td> 		<td>Boolean, true indicates vertical dragging is disallowed. 
														Defaults to false.
														</td></tr>
	<tr><td width="30%">preventHorizontal</td> 		<td>Boolean, true indicates horizontal dragging is disallowed. 
														Defaults to false.
														</td></tr>
	<tr><td width="30%">allowExit</td>				<td>Boolean, true indicates the item can be dragged out of its 
														current container, into other containers.  
														Defaults to false.
														</td></tr>
	<tr><td width="30%">preventDropReset</td>		<td>Boolean, true indicates element should not be returned to 
														it's original position, etc., when dropped. This can be 
														accomplished after the fact by calling resetElement() on the dragger. 
														</td></tr>
	<tr><td width="30%">datatype</td>				<td>String, this element will only be able to be dropped on 
														containers that specify the same datatype.
														</td></tr>
	<tr><td width="30%">autoscroll</td>				<td>Boolean, true indicates the scene should be scrolled when 
														dragged elements reach the edges of the visible area.
														</td></tr>
	<tr><td width="30%">maxHorizontalPixel</td>		<td>int, max pixel object is allowed to be dragged to 
														horizontally; default is undefined/ free motion.
														</td></tr>
	<tr><td width="30%">minHorizontalPixel</td>		<td>int, min pixel object is allowed to be dragged to horizontally; 
														default is undefined/ free motion.
														</td></tr>
	<tr><td width="30%">maxVerticalPixel</td>		<td>int: max pixel object is allowed to be dragged to vertically; 
														default is undefined/ free motion.
														</td></tr>
	<tr><td width="30%">minVerticalPixel</td>		<td>int: min pixel object is allowed to be dragged to vertically; 
														default is undefined/ free motion.
														</td></tr>
</table>

*/
Mojo.Drag.startDragging = function(sceneController, element, startEvent, options) {
	return new Mojo.Drag._Dragger(sceneController, element, startEvent, options);
};


/**
Configures given element to be available as a valid destination for drag'n'drop items.

@param {string}		element		The DOM element to act as a container for dragged items.
@param {object}		dropClient	An object implementing the interface described below, in order to interact with dragged & dropped elements. 
								dropClient must be an object with the following properties:
							
					<table>
						<tr><td width="30%">dragEnter(element)</td>			<td>function called whenever the item is first dragged over this 
																				container.
																			</td></tr>
						<tr><td width="30%">dragHover(element)</td> 		<td>function called whenever the item moves over this container.
																			</td></tr>
						<tr><td width="30%">dragLeave(element)</td> 		<td>function called whenever the item is dragged outside this 
																				container.
																			</td></tr>
						<tr><td width="30%">dragDrop(element, newItem)</td> <td>function called when the item is dropped over this container. 
																				newItem = true if item came from a different container.
																			</td></tr>
						<tr><td width="30%">dragRemove(element)</td>		<td>function called when a contained item is dropped on a 
																				different container. 
																			</td></tr>
						<tr><td width="30%">dragDatatype</td>				<td>String, optional. Only draggers with a matching datatype 
																				can enter/drop on this container.
																			</td></tr>

					</table>

*/
Mojo.Drag.setupDropContainer = function(element, dropClient) {
	element.setAttribute(Mojo.Drag.kDropAttribute, "");
	element._mojoDropTarget = dropClient;
};


/** @private **/
Mojo.Drag.kElementClass = "palm-drag-element";
/** @private **/
Mojo.Drag.kSpacerClass = "palm-drag-spacer"; 
/** @private **/                                    
Mojo.Drag.kContainerClass = "palm-drag-container";
/** @private **/
Mojo.Drag.kContainerOriginalClass = "original";
/** @private **/
Mojo.Drag.kContainerTargetClass = "target";

Mojo.Drag._Dragger = Class.create({

	/** @private */
	initialize: function(sceneController, element, startEvent, options) {
		var offset, dims, i, initialContainer;
		
		// Save arguments:
		this.element = element;
		this.scene = sceneController;
		this.options = options || {};
		
		this.queue = Mojo.Animation.queueForElement(element);
		
		// Watch for dragStart, dragging, dragEnd, and tap (which tells us to end the drag)
		this.dragStart = this.dragStart.bindAsEventListener(this);
		this.tapEvent = this.tapEvent.bindAsEventListener(this);
		this.dragging = this.dragging.bindAsEventListener(this);
		this.dragEnd = this.dragEnd.bindAsEventListener(this);
		this.clickAfterDrag = this.clickAfterDrag.bindAsEventListener(this);
		
		element.observe(Mojo.Event.dragStart, this.dragStart);
		element.observe(Mojo.Event.tap, this.tapEvent);
		element.observe(Mojo.Event.dragging, this.dragging);
		element.observe(Mojo.Event.dragEnd, this.dragEnd);
		
		// Save old configuration of element:
		this.origPosition = element.style.position;
		this.origStyleCSSText = element.style.cssText;
		
		// pop element out of the page, and apply the draggingClass so it's clear that it can be dragged.
		element.absolutize();
		this.draggingClass = (this.options && this.options.draggingClass) || Mojo.Drag.kElementClass;
		element.addClassName(this.draggingClass);
		
		// Save element's starting absolute position.
		this.startTop = this.element.offsetTop; //parseInt(this.element.style.top, 10);
		this.startLeft = this.element.offsetLeft;//parseInt(this.element.style.left, 10);
		
		
		// Look up possible drag targets in this scene:
		// TODO: This won't work in firefox.  Need to specify value for the attribute. :-/
		this.containers = $A(this.scene.sceneElement.querySelectorAll('div['+Mojo.Drag.kDropAttribute+']'));  
		
		// Warn if there are no containers.
		Mojo.assert(this.containers.length > 0, "Can't drag element "+(this.element.id || this.element.name)+" since there are no drag containers.");
		
		// Convert containers array into array of objects that cache dimensions:
		this.containers = this.containers.map(this.collectContainerInfo);
		
		// Set up initial container, based on the parent of the dragged element:
		initialContainer = Mojo.View.findParentByAttribute(element, undefined, Mojo.Drag.kDropAttribute);
		for(i=0; i<this.containers.length; i++) {
			if(this.containers[i].element === initialContainer) {
				this.initialContainer = this.containers[i];
				this.startHovering(this.initialContainer);
				break;
			}
		}
		
		
		// Save the finger-down point, for hit detection with containers.
		this.hitStartX = startEvent.pageX;
		this.hitStartY = startEvent.pageY;
		
		// Find the scene scroller and cache its position/dimensions.
		this.scroller = Mojo.View.getScrollerForElement(element);
		
		//not all scenes have scrollers, so make sure we take that into account
		if (this.scroller) {
			this.scrollerPos = this.scroller.cumulativeOffset();
			this.scrollerSize = this.scroller.mojo.scrollerSize();			
			this.scrollDeltas = {x:0, y:0};
		}
	},
	
	
	
	/**
		A dragStart event indicates that our element is being dragged.
		So, now we can finish initialization, and prepare for dragging.
	*/
	/** @private */
	dragStart: function(event) {
		// stop the dragStart to prevent the scene from scrolling.
		this.gotDragStart = true;
		event.stop();
		
		if(this.options.autoscroll) {
			this.scrollAnimating = true;
			this.queue.add(this);
		}
	},
	
	/*
		Called repeatedly while an element is dragged.
	*/
	/** @private */
	dragging: function(event){
		
		var topDelta = 0;
		var leftDelta = 0;
		
		event.stop();
		
		// Get the scroll deltas for this drag position.
		// If it's in the middle of the screen, it'll be 0,0.
		// If it's closer to an edge, we'll scroll faster or slower in that direction.
		// We store the deltas in an instance variable, and then do the actual scrolling 
		// using an 'animator'.  This way, we keep scrolling even when we don't get drag 
		// events since the pen input position isn't moving.
		this.scrollDeltas = this.calcScrollDeltas(event);
		
				
		//don't update the style if we are not allowing vertical motion
		if(!this.options.preventVertical) {
			topDelta = event.move.y - event.down.y;
			//add in logic to check that not going over max or minimum area if specified
			if ((this.options.maxVerticalPixel !== undefined) && ((topDelta + this.startTop) > this.options.maxVerticalPixel)) { 
				this.element.style.top = this.options.maxVerticalPixel + 'px';
			} else if ((this.options.minVerticalPixel !== undefined) && ((topDelta + this.startTop) < this.options.minVerticalPixel)) { 
				this.element.style.top = this.options.minVerticalPixel + 'px';
			} else {
				this.element.style.top = this.startTop + topDelta + 'px';
			}			
		}
		
		//don't update the style if we are not allowing horizontal motion
		if(!this.options.preventHorizontal) {
			leftDelta = event.move.x - event.down.x;
			//add in logic to check that not going over max or minimum area if specified
			if ((this.options.maxHorizontalPixel !== undefined) && ((leftDelta + this.startLeft) > this.options.maxHorizontalPixel)) { 
				this.element.style.left = this.options.maxHorizontalPixel + 'px';
			} else if ((this.options.minHorizontalPixel !== undefined) && ((leftDelta + this.startLeft) < this.options.minHorizontalPixel)) { 
				this.element.style.left = this.options.minHorizontalPixel + 'px';
			} else {
				this.element.style.left = this.startLeft + leftDelta + 'px';
			}			
		}
		
		this.topDelta = topDelta;
		this.leftDelta = leftDelta;
		
		this.checkContainer();

		if (this.element && this.element.parent) {
			this.element.parent.observe('click', this.clickAfterDrag, true);
		} else {
			this.scene.document.observe('click', this.clickAfterDrag, true);
		}
	},
	
	/** @private */
	dragEnd: function(event){
		var dt, changedContainers;
		
		if (this.gotDragStart) {
			event.stop();
			this.gotDragStart = false;
		}
		
		// Cleanup returns the element to its original form, 
		// just as the drop container will expect it.
		this.cleanup();
		
		if(this.currentContainer) {
			dt = this.currentContainer.element._mojoDropTarget;
			changedContainers = this.currentContainer !== this.initialContainer;
			
			// If we changed containers, call remove on the old one.
			if(changedContainers && this.initialContainer) {
				this.initialContainer.element._mojoDropTarget.dragRemove(this.element);
			}
			
			
			this.stopHovering(true);
			try {
				dt.dragDrop(this.element, changedContainers);
			} catch(e) {
				Mojo.Log.error("WARNING: Caught exception in dragndrop container.dragDrop(): "+e);
			}
		}
	},

	clickAfterDrag: function clickAfterDrag (clickEvent) {
		/* If we've dragged something, we need prevent clicks on things like links from having an effect */
		if (clickEvent.target && (clickEvent.target === this.element || clickEvent.target.descendantOf(this.element))) {
			clickEvent.stop();
		}
	},
	
	/** @private
		Called when the element is moved (when we autoscroll, or it was dragged).
		Makes ure we're in the right drag container, passes hover messages to it, etc.
	*/
	checkContainer: function() {
		var checkForNewContainer;
		var dt;
		
		// If we have a current container, then continue with it:
		if(this.currentContainer)
		{
			// Are we still overlapping?
			// Note that we don't even bother hit testing when allowExit==false.
			if(!this.options.allowExit || this.hitTestContainer(this.leftDelta, this.topDelta, this.currentContainer))
			{
				// Send a drag update.
				dt = this.currentContainer.element._mojoDropTarget;
				if(dt.dragHover) {
					dt.dragHover(this.element);
				}
			}
			else {
				// No longer overlapping, so we need to check for other possible containers,
				// (and maybe move to them if we overlap them).
				checkForNewContainer = true;
			}
			
		} 
		
		// If there's no current container, then look for one.
		if(checkForNewContainer || !this.currentContainer) {
			this.findNewContainer(this.leftDelta, this.topDelta);
		}		
	},
	
	/** @private 
		This is used to automatically scroll the scene when dragged items are moved near the edge.
	*/
	animate: function() {
		var pos, newPos;
		
		//not all scenes have scrollers; ignore this behavior for scrolling the scene if the scroller does not exist
		if (!this.scroller) {
			return;
		}
		
		if(this.scrollDeltas.x || this.scrollDeltas.y) {

			// Update the scroller position.
			pos = this.scroller.mojo.getState();
			this.scroller.mojo.scrollTo(pos.left+this.scrollDeltas.x, pos.top+this.scrollDeltas.y);
			newPos = this.scroller.mojo.getState();
			
			// Now update the saved "starting state" points, and apply the 
			// actual scrolled delta to the element's current position.
			if(!this.options.preventVertical) {
				this.startTop += (pos.top - newPos.top);
				this.hitStartY += (pos.top - newPos.top);
				this.element.style.top = (parseInt(this.element.style.top,10)+(pos.top - newPos.top)) + 'px';
			}
			
			if(!this.options.preventHorizontal) {
				this.startLeft += (pos.left - newPos.left);
				this.hitStartX += (pos.left - newPos.left);
				this.element.style.left = (parseInt(this.element.style.left,10)+(pos.left - newPos.left)) + 'px';
			}
			
			// We effectively moved the element, so hittest containers and send hover messages:
			this.checkContainer();
		}
		
		
	},
	
	
	/* Given current delta position of dragged element,
	   returns the first container which overlaps the dragged element's midpoint.*/
	/** @private */
	findNewContainer: function(leftDelta, topDelta) {
		var i;
		for(i=0; i<this.containers.length; i++) {
			if(this.containers[i].dragDatatype == this.options.dragDatatype &&
					this.hitTestContainer(leftDelta, topDelta, this.containers[i])) {
				this.startHovering(this.containers[i]);
				break;
			}
		}
	},
	
	/* Called to begin hovering the dragged element over a new container, when it begins to overlap.*/
	/** @private */
	startHovering: function(container) {
		var dt = container.element._mojoDropTarget;
		
		// If there's already a current container, then leave it.
		// This lets us ensure that the item always has a container, 
		// and we won't leave it until we're going to enter another one.
		if(this.currentContainer !== undefined) {
			this.stopHovering();
		}
		
		this.currentContainer = container;
		container.element.addClassName(Mojo.Drag.kContainerClass);
		
		// Call drop target callback
		if(dt.dragEnter) {
			try {
				dt.dragEnter(this.element);
			} catch(e) {
				Mojo.Log.error("WARNING: Caught exception in dragndrop container.dragEnter(): "+e);
			}
		}
		
	},
	
	/* Called to stop hovering the dragged element over an old container, when it no longer overlaps.
	  Also called at the end of a drag, when an item is dropped on a target to reset classes, etc.
	  In this case, we do not call the drag target's 'dragLeave' method. */
	/** @private */
	stopHovering: function(dontLeave) {
		var dt = this.currentContainer.element._mojoDropTarget;
		
		this.currentContainer.element.removeClassName(Mojo.Drag.kContainerClass);
		this.currentContainer = undefined;

		// Call drop target callback
		if(dt.dragLeave && !dontLeave) {
			try {
				dt.dragLeave(this.element);
			} catch(e) {
				Mojo.Log.error("WARNING: Caught exception in dragndrop container.dragLeave(): "+e);
			}
		}
		
	},
	
	/* This basically means there was no drag -- finger was let up.
	   We model it as */
	/** @private */
	tapEvent: function(event){
		this.dragEnd(event);
	},
	
	/* Removes all event observers, and returns the dragged element to its original state.*/
	/** @private */
	cleanup: function() {
		var element = this.element;
		var scene = this.scene;
		var self = this;
		element.stopObserving(Mojo.Event.dragging, this.dragging);
		element.stopObserving(Mojo.Event.dragEnd, this.dragEnd);
		element.stopObserving(Mojo.Event.dragStart, this.dragStart);
		element.stopObserving(Mojo.Event.tap, this.tapEvent);
		
		/* Since the dragEnd happens before click, we need to defer the removal of the click stopper
		   to make sure we stop the click that happens due to the mouse-up that ends the drag */
		var f = function() {
			if (element && element.parent) {
				element.parent.stopObserving('click', this.clickAfterDrag, true);
			} else {
				scene.document.stopObserving('click', this.clickAfterDrag, true);
			}				
		};
		
		f.defer();
		
		// remove our drag-scroller from the animation queue.
		if(this.scrollAnimating) {
			this.queue.remove(this);
			this.scrollAnimating = false;
		}
		
		// Put drag element back, if it hasn't been removed from the DOM.
		if(!this.options.preventDropReset) {
			this.resetElement();
		}
	},
	
	/* Removes dragging appearance (CSS class) of element, and returns it to its original positioning mode & location.*/
	/** @private */
	resetElement: function() {
		this.element.removeClassName(this.draggingClass);
		this.element.style.position = this.origPosition;
		this.element.style.cssText = this.origStyleCSSText;
	},
	
	// Returns a hash containing the container element, as well as top/left/width/height data for it.
	/** @private */
	collectContainerInfo: function(container) {
		
		// Save bounding rect of container in global coordinates for later use.
		var position = container.viewportOffset();
		var containerInfo = container.getDimensions();
		
		containerInfo.element = container;
		containerInfo.top = position.top;
		containerInfo.left = position.left;
		containerInfo.dragDatatype = container._mojoDropTarget.dragDatatype;
		
		return containerInfo;
	},
	
	// Given drag deltas for the dragged element, and a container hash from collectContainerInfo(), 
	// returns 'true' if the dragged element's midpoint is inside the container's bounds.
	/** @private */
	hitTestContainer: function(leftDelta, topDelta, container) {
		var left = this.hitStartX + leftDelta;
		var top = this.hitStartY + topDelta;
		
		if(left < container.left || left > container.left+container.width || 
			top < container.top || top > container.top+container.height) {
			return false;
		}
		
		return true;
	},
	
	/*
		This array defines the scroll speed for positions over the range of the scroller.
		calcScrollDeltas looks at the event position, and does a simple linear interpolation
		in the array to determine proper integer scroll speed.
	*/
	/** @private */
	scrollCurve: [40,20,10,5,0,0,0,0,0,0,0,0,0,0,0,0,-5,-10,-20,-40],
	/** @private */
	calcScrollDeltas: function(event) {
		var yDelta = 0;
		var xDelta = 0;
		
		//not all scenes have scrollers, so make sure we take that into account
		if (this.scroller) { 
			if(!this.options.preventVertical) {
				yDelta = (event.move.y - this.scrollerPos.top) / (this.scrollerSize.height - this.scrollerPos.top);
				yDelta = Math.round(this.interpolate(yDelta, this.scrollCurve));
			}
		
			if(!this.options.preventHorizontal) {
				xDelta = (event.move.x - this.scrollerPos.left) / (this.scrollerSize.width - this.scrollerPos.left);
				xDelta = Math.round(this.interpolate(xDelta, this.scrollCurve));
			}
		}
		
		// Mojo.Log.info("y delta is "+yDelta);
		return {x:xDelta, y:yDelta};
	},
	
	/*
		value: number between 0 & 1
		curve: array of numbers.
		returns linear interpolation of 'value' over the length of the 'curve' 
		array, where 0 maps to curve[0] and 1 maps to curve[curve.length-1].
	*/
	/** @private */
	interpolate: function(value, curve) {
		var curveLen = curve.length;
		var floored, frac;
		
		value *= curveLen;
		if(value < 0) {
			value = 0;
		} else if(value > curveLen-1) {
			value = curveLen-1;
		}
		
		floored = Math.floor(value);
		frac = value - floored;
		value = (curve[floored] * (1-frac)) + (curve[Math.ceil(value)] * frac);
		return value;
	}
});



