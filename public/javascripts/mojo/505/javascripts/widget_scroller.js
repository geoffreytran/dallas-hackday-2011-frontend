/**
 * @name widget_scroller.js
 * @fileOverview Provide documentation for the scroller widget which
 * provides all scrolling behavior;
 * See {@link Mojo.Widget.Scroller} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####

The scroller widget provides all scrolling behavior. One is installed automatically in every scene
(you can disable this behavior by having a truthy value in the disableSceneScroller property in
	the scene arguments to pushScene and you can have any number of additional scrollers anywhere
	in the DOM.

You can select one of six scrolling modes currently, specified in the mode property of the widget's attributes:

1. free: allow scrolling along the x and y axis.
2. horizontal: allow scrolling only along the horizontal axis.
3. vertical: allow scrolling only along the vertical axis.
4. dominant: allow scrolling along the horizontal or vertical axis, but not both at once.
   The direction of the intial drag will determine the axis of scrolling.
5. horizontal-snap: In this mode, scrolling is locked to the horizontal axis, but snaps
   to points determined by the position of the block elements found in the model's snapElements property.
   As the scroller scrolls from snap point to snap point it will send a propertyChange event.
6. vertical-snap: similarly, this mode locks scrolling to the vertical axis, but snaps to points
   determined by the elements in the snapElements property array

The Scroller declaration MUST wrap the scrolled contents within it's scope.


#### Declaration ####

		<div x-mojo-element="Scroller" id="scrollerId" class="scrollerClass" name="scrollerName">
				<div> TARGET SCROLL CONTENT </div>
		</div>

		Properties		Required	Value			Description
		---------------------------------------------------------------------------------------------------------------------------------
		x-mojo-element	Required	Scroller		Declares the widget as type 'Scroller'
		id				Required	Any String		Identifies the widget element for use when instantiating or rendering
		class			Optional	Any String		Scroller uses the .palm-scroller-container by default but you override this setting
		name			Optional	Any String		Add a unique name to the scroller widget; generally used in templates when used

#### Events ####

		this.controller.listen("scrollerId", 'Mojo.Event.propertyChange', this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		Mojo.Event.propertyChange			None			Respond to Scroller value change
		Mojo.Event.scrollStarting		None			When contained in a scroller, down action followed by movement generates a scroll-starting event

#### Instantiation ####

		this.controller.setupWidget("scrollerId",
		     this.attributes = {
		         mode: 'vertical
		     },
		     this.model = {
		         snapElements: {x: [DOMElement, DOMElement, DOMElement, ...]}
		     });

#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		mode				String			Required	value		Scrolling mode; either: free, vertical, horizontal, dominant, vertical-snap, horizontal-snap


#### Model Properties ####

		Model Property		Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		snapElements		Object			Optional	none		Object containing array of DOM elements used as snap points for horizontal or vertical scrolling
																	under the appropriate component. i.e {y: [DOMElement, DOMElement, DOMElement, ...]}


#### Methods ####

		Method      Arguments                              Description
		---------------------------------------------------------------------------------------------------------------------------------
		revealTop  Object                                  Jump the scroll to reveal the top of the content being scrolled.
		revealBottom                                       Jump the scroll to reveal the bottom of the content being scrolled
		revealElement HTML Element                         Jump the scroll to reveal a specific element, only scrolls vertically
		scrollTo    Integer {x-coord}, Integer {x-coord},  Jump the scroll to the x,y coordinates specified. If either of the coordinates are undefined, they are ignored
		            Boolean {animate}, Boolean {supress notifications}
		getState                                           Returns the current scroll state for use in a future call to setState.
		setState    Object {scrollState},Boolean {animate} Jumps the scroll to the value specified in scrollState; pass true to animate the scrollJumps the scroll to the
		                                                   value specified in scrollState
		adjustBy   	Integer	{deltaX}, Integer {deltaY}	   Adjust the current scroll position by the given amount. Safe to call from scroll listeners while animating.
														   Does not cause listeners to be notified of any changes.
		scrollerSize                                       Returns the size of the scroller's view port in pixels: {height:nnn, width:nnn}
		setMode     String {newMode}                       Set the mode of the scroller, which controls which drag directions causes scrolling. Choices are 'free',
		                                                   'dominant', 'horizontal', 'horizontal-snap', and 'vertical'.
		getScrollPosition                                  Get the current position of the scroller. Returns {left: nnn px, top: nnn px}
		setSnapIndex  Number{snapIndex}, Boolean {animate} Sets the snap index for a snap scroller and scrolls to the new position; pass true to animate.


*/
Mojo.Widget.Scroller = Class.create(
	/** @lends Mojo.Widget.Scroller	 */
	{
	setupOptional: true,

	/** @private */
	setup: function() {
		var scrollContainer = this.controller.element;
		this.snapIndex = 0;
		this.hasPalmOverflow = (Mojo.Host.current !== Mojo.Host.browser);
		this.bindHandlers();
		this.setupChildElements();
		this.handleModelChanged();

		this.controller.exposeMethods(['revealTop', 'revealBottom', 'revealElement', 'scrollTo',
										'getState', 'setState', 'adjustBy', 'scrollerSize', 'setMode',
										'getScrollPosition', 'setScrollPosition', 'setSnapIndex',
										'handleEdgeVisibility', 'validateScrollPosition',
										'updatePhysicsParameters']);

		this.controller.listen(scrollContainer, Mojo.Event.dragStart, this.dragStartHandler);
		this.controller.listen(scrollContainer, Mojo.Event.flick, this.flickHandler);
		var sceneElement = this.controller.scene.sceneElement;
		Mojo.assert(sceneElement !== undefined, "didn't find a scene element");
		if (sceneElement) {
			this.controller.listen(sceneElement, Mojo.Event.subtreeHidden, this.subtreeHidden);
			if (this.pageUpDown) {
				this.controller.listen(sceneElement, Mojo.Event.keydown, this.keyHandler);
			}
		}

		this.moveLimit = 1;

		this.updateStylesForMode();

		if (Mojo.Host.current === Mojo.Host.browser) {
			this.kFlickRatio = 0.3;
		}
	},

	/** @private */
	cleanup: function() {
		var sceneElement = this.controller.scene.sceneElement;

		this.stopAnimating();
		this.controller.stopListening(sceneElement, Mojo.Event.subtreeHidden, this.subtreeHidden);
		if (this.pageUpDown) {
			this.controller.stopListening(sceneElement, Mojo.Event.keydown, this.keyHandler);
		}
		this.clearCorrectOverscrollTimer();
		this.removeContinueOverscrollHandler();
	},
	
	/** @private */
	fastMakePositioned: function(targetElement) {
		if (!targetElement.style.position) {
			targetElement.style.position = 'relative';
		} else {
			targetElement.makePositioned();
		}
	},

	/** @private */
	setupChildElements: function() {
		var target;
		var scrollContainer = this.controller.element;
		
		
		Mojo.assert(scrollContainer, "Mojo.Widget.Scroller requires an element");
		if (this.hasPalmOverflow) {
			scrollContainer.style.overflow = "-webkit-palm-overflow";
		} else {
			scrollContainer.style.overflow = "hidden";
		}
		this.fastMakePositioned(scrollContainer);
		var children = Element.childElements(scrollContainer);
		if (children.length != 1) {
			var wrapperId = scrollContainer.id + '-scroll-wrapper';
			var div = this.controller.document.createElement('div');
			div.id =  wrapperId;
			children.each(function(element) {div.appendChild(element);});
			scrollContainer.appendChild(div);
			target = this.controller.get(wrapperId);
		} else {
			target = children.first();
		}
		this.target = target;
		target.style.overflow = 'visible';
		this.fastMakePositioned(target);
		if (scrollContainer !== this.controller.scene.getSceneScroller()) {
			this.controller.instantiateChildWidgets(scrollContainer);
		}
	},

	/** @private */
	setupIndicators: function() {
		var indicatorElement, checkerFunction, side, possibleComponents;
		var component, limitName, indicators, indicatorsCount, indicator, lessThan;
		var scrollerParent = this.controller.element.parentNode;
		var indicatorElements = scrollerParent.querySelectorAll(this.FADE_ELEMENT_SELECTOR);
		var indicatorElementsLength = indicatorElements.length;
		if (indicatorElementsLength > 0) {
			possibleComponents = this.calculatePossibleComponents();
			indicatorsCount = 0;
			component = undefined;
			indicators = {};
			for (var i = indicatorElementsLength-1; i >= 0; i--){
				indicatorElement = indicatorElements[i];
				side = indicatorElement.getAttribute(this.FADE_ELEMENT_ATTRIBUTE);
				switch(side) {
					case 'top':
						component = 'y';
						limitName = 'maxLimit';
						lessThan = true;
						break;
					case 'bottom':
						component = 'y';
						limitName = 'minLimit';
						lessThan = false;
						break;
					case 'left':
						component = 'x';
						limitName = 'maxLimit';
						lessThan = true;
						break;
					case 'right':
						component = 'x';
						limitName = 'minLimit';
						lessThan = false;
						break;
				}
				if (component && possibleComponents.include(component)) {
					checkerFunction = this.shouldShowIndicator.bind(this, component, limitName, lessThan);
					indicator = new Mojo.Widget.Scroller.Indicator(indicatorElement, checkerFunction);
					indicators[side] = indicator;
					indicatorsCount += 1;
				}
			}
		}
		if (indicatorsCount > 0) {
			this.indicators = indicators;
			this.calculateSizesAndUpdateScrollIndicators();
		}
	},

	/** @private */
	calculateSizesAndUpdateScrollIndicators: function() {
		if (!this.targetCoordinate) {
			this.setupCoordinates();
		}
		this.calculateSizes();
		if (this.indicators) {
			this.updateScrollIndicators();
		}
	},

	/** @private */
	bindHandlers: function() {
		this.dragStartHandler = this.dragStart.bindAsEventListener(this);
		this.draggedHandler = this.dragged.bindAsEventListener(this);
		this.dragEndHandler = this.dragEnd.bindAsEventListener(this);
		this.flickHandler = this.flick.bindAsEventListener(this);
		this.flickStopHandler = this.flickStop.bindAsEventListener(this);
		this.finishFlickStopHandler = this.finishFlickStop.bind(this);
		this.continueOverscrollHandler = this.continueOverscroll.bindAsEventListener(this);
		this.subtreeHidden = this.subtreeHidden.bindAsEventListener(this);
		this.keyHandler = this.key.bindAsEventListener(this);
		this.correctOverscrollHandler = this.correctOverscroll.bind(this);
	},

	/** @private */
	subtreeShown: function() {
		if (this.savedState !== undefined) {
			this.setState(this.savedState);
			delete this.savedState;
		}
	},

	/** @private */
	subtreeHidden: function(e) {
		if (this.savedState === undefined) {
			this.finishScroll();
			this.savedState = this.getState();
		}
	},

	/** @private */
	key: function(keyPressEvent) {
		switch(keyPressEvent.originalEvent.keyIdentifier) {
		case "PageUp":
			this.scrollPages(-1);
			keyPressEvent.stop();
			break;
		case "PageDown":
			this.scrollPages(1);
			keyPressEvent.stop();
			break;
		}
	},

	/** @private */
	maybeCollectListeners: function(force) {
		var listeners;

		if(force) {
			delete this.listeners;
		}
		listeners = this.listeners;
		if (!listeners) {
			listeners = [];
			var addListeners = function(listener) {
				listeners.push(listener);
			};
			var fakeScroller = {addListener: addListeners};
			Mojo.Event.send(this.controller.element, Mojo.Event.scrollStarting, {scroller: fakeScroller, addListener: addListeners}, false);
			this.listeners = listeners;
		}
		return listeners;
	},

	/** @private */
	notifyListeners: function(scrollEnding, position) {
		var listeners, l;
		this.maybeCollectListeners();
		listeners = this.listeners;

		for (var i = listeners.length - 1; i >= 0; i--){
			l = listeners[i];
			try	{
				l.moved(scrollEnding, position);
			} catch (e) {
				if(!this.whinedAboutException) {
					this.whinedAboutException = true;
					Mojo.Log.logException(e, "Exception occurred while scroller was calling 'moved' callbacks.");
				}
			}

		}

	},

	/** @private */
	getTarget: function() {
		return Element.firstDescendant(this.controller.element);
	},

	/** @private */
	getContentSize: function() {
		var scrollerElement = this.controller.element;
		return {width: scrollerElement.scrollWidth, height: scrollerElement.scrollHeight};
	},

	/** @private */
	updateStylesForMode: function() {
		if (this.establishWidth) {
			var possibleComponents = this.calculatePossibleComponents();
			if(possibleComponents.x) {
				this.target.style.width = '';
			} else {
				this.target.style.width = '100%';
			}
		}
	},
	
	/**
	 * Set the mode of the scroller, which controls which drag directions causes
	 * scrolling. Choices are 'free', 'dominant', 'horizontal', 'horizontal-snap',
	 * and 'vertical'.
	 * @private
	 * @param {String} newMode New mode for the scroller to use.
	 */
	setMode: function(newMode) {
		this.mode = newMode;
		this.updateStylesForMode();
	},

	/**
	 * @private
	 */
	handleModelChanged : function() {
		this.stopAnimating();
		this.mode = this.controller.valueFromModelOrAttributes("mode", "vertical");
		this.snap = false;
		this.establishWidth = this.controller.valueFromModelOrAttributes("establishWidth");
		this.sizeToWindow = this.controller.valueFromModelOrAttributes("sizeToWindow");
		this.pageUpDown = this.controller.valueFromModelOrAttributes("pageUpDown");
		if (this.controller.model && this.controller.model.snapIndex !== 0) {
			var snapIndex = this.controller.model.snapIndex;
			this.snapIndex = snapIndex;
			if (snapIndex !== undefined) {
				this.scrollToSnapIndex();
			}
		}
		this.setupIndicators();

	},

	/**
	 * @private
	 */
	calculatePossibleComponents: function calculatePossibleComponents() {
		var possibleComponents = [];
		switch(this.mode) {
		case "free":
		case "dominant":
			possibleComponents = ["x", "y"];
			possibleComponents.x = true;
			possibleComponents.y = true;
			break;
		case "horizontal":
		case "horizontal-snap":
			possibleComponents = ["x"];
			possibleComponents.x = true;
			break;
		case "vertical":
		case "vertical-snap":
			possibleComponents = ["y"];
			possibleComponents.y = true;
		}
		return possibleComponents;
	},

	/**
	 * @private
	 */
	calculateSnapPoints: function(components) {
		var containerExtent, component, snapElements;
		this.snapElements = {};
		this.snapOffsets = {};
		function makeSnapOffset(element) {
			var extent, value;
			var elementOffset = element.positionedOffset();
			if (component === "x") {
				value = elementOffset.left;
				extent = Element.getWidth(element);
			} else {
				value = elementOffset.top;
				extent = Element.getHeight(element);
			}
			value += Math.round(extent/2);
			return value;
		}
		for (var i = components.length - 1; i >= 0; i--){
			component = components[i];
			snapElements = this.controller.model && this.controller.model.snapElements && this.controller.model.snapElements[component];
			if (snapElements === undefined) {
				continue;
			}
			if (component === "x") {
				containerExtent = Element.getWidth(this.controller.element);
			} else {
				containerExtent = Element.getHeight(this.controller.element);
			}
			this.snapElements[component] = snapElements;
			this.snapOffsets[component] = snapElements.collect(makeSnapOffset);
		}
	},
	
	/**
	 * @private
	 */
	setupAxisTargetAreas: function setupAxisTargetAreas() {
		var pt = this.firstPointer;
		var x = pt.x;
		var y = pt.y;
		var r = this.LOCK_RADIUS;
		var axisTargets = {
			left: x - r,
			right: x + r,
			top: y - r,
			bottom: y + r
		};
		this.axisTargets = axisTargets;
	},

	/** @private */
	calculateAxis: function() {
		var components, originalComponents, component, delta, distance, absDistance, x, y, axisTargets;
		var lockRadius = this.LOCK_RADIUS;
		var lastPointer = this.lastPointer;
		components = originalComponents = this.components;
		if (this.mode !== 'dominant' || components.length == 2) {
			return;
		}
		absDistance = Mojo.Gesture.calculateAbsDistance(this.firstPointer, lastPointer);
		if (absDistance.x < lockRadius && absDistance.y < lockRadius) {
			if (absDistance.x <= absDistance.y) {
				components = ["y"];
			} else {
				components = ["x"];
			}
		} else {
			axisTargets = this.axisTargets;
			x = lastPointer.x;
			y = lastPointer.y;
			if (y < axisTargets.top || y > axisTargets.bottom) {
				if (x < axisTargets.left || x > axisTargets.right) {
					components = ["x", "y"];
				}
			}
		}
		if (components.length == 2) {
			this.components = components;
			if (this.mouseTracker) {
				this.mouseTracker.components = components;
			}
			this.calculateSizes();
			for (var i = components.length - 1; i >= 0; i--) {
				component = components[i];
				if (!this.componentsAtStart[component]) {
					delta = this.lastPointer[component] - this.firstPointer[component];
					this.targetCoordinate[component] = this.originalCoordinate[component] + delta;
				}
			}
			this.setFrameDistanceRatio(this.kOverScrollSpeed, "animating to pointer");
			this.animatingToPointer = true;
			this.startAnimating();
		}
	},

	/**
	 * @private
	 */
	startCorrectOverscrollTimer: function() {
		this.clearCorrectOverscrollTimer();
		this.correctOverscrollTimer = this.controller.window.setTimeout(this.correctOverscrollHandler, this.correctOverscrollTimeMs);
	},

	/**
	 * @private
	 */
	clearCorrectOverscrollTimer: function() {
		if (this.correctOverscrollTimer) {
			this.controller.window.clearTimeout(this.correctOverscrollTimer);
			delete this.correctOverscrollTimer;
		}
	},

	/**
	 * @private
	 */
	calculateScrollInfo: function(distance) {
		var components = ["y"];
		var startScrolling = true;
		this.snap = false;
		switch(this.mode) {
		case "free":
			components = ["x", "y"];
			break;
		case "horizontal":
			components = ["x"];
			startScrolling = (Math.abs(distance.x) > Math.abs(distance.y));
			break;
		case "horizontal-snap":
			components = ["x"];
			this.snap = true;
			startScrolling = (Math.abs(distance.x) > Math.abs(distance.y));
			break;
		case "vertical-snap":
			components = ["y"];
			this.snap = true;
			startScrolling = (Math.abs(distance.x) <= Math.abs(distance.y));
			break;
		case "vertical":
			components = ["y"];
			startScrolling = (Math.abs(distance.x) <= Math.abs(distance.y));
			break;
		case "dominant":
			this.setupAxisTargetAreas();
			if (Math.abs(distance.x) <= Math.abs(distance.y)) {
				components = ["y"];
			} else {
				components = ["x"];
			}
			break;
		}
		if (this.snap) {
			this.calculateSnapPoints(components);
		}
		return {components: components, startScrolling: startScrolling};
	},

	/** @private */
	dragStart: function(dragStartEvent) {
		/* A drag start means that any click that might potentionally stop the current flick scroll
		   should instead be turned into a regular drag scroll, so cancel any delayed stop timer */
		
		this.maybeCancelDelayedStop();
		// If we've started a new drag, we no longer need to worry about continuing an overscroll
		this.removeContinueOverscrollHandler();
		var scrollInfo;
		this.correctOverscrollTimeMs = this.CORRECT_OVERSCROLL_TIME_MS;
		this.flicked = false;
		this.firstPointer = Event.pointer(dragStartEvent.down);
		var eventTarget = dragStartEvent.down.target;
		var scrollerElement = this.controller.element;
		var nonScrollingContainer = Mojo.View.findParentByAttribute(eventTarget, scrollerElement, 'x-mojo-non-scrolling');
		if (!nonScrollingContainer) {
			scrollInfo = this.calculateScrollInfo(dragStartEvent.filteredDistance);
			if (scrollInfo.startScrolling) {
				this.startScrolling(dragStartEvent, scrollInfo.components);
				dragStartEvent.stop();
			}
		}
	},

	/**
	 * @private
	 */
	dragged: function(event) {
		if (this.mouseTracker) {
			this.mouseTracker.dragged(event);
			event.stop();
		}
	},

	/**
	 * @private
	 */
	updateSnapIndex: function(snapIndex) {
		var oldIndex = this.snapIndex;
		if (oldIndex !== snapIndex) {
			this.snapIndex = snapIndex;
			var model = this.controller.model;
			if (model) {
				model.snapIndex = snapIndex;
			}
			Mojo.Event.send(this.controller.element, Mojo.Event.propertyChange,
				{ property: "snapIndex",
					value: this.snapIndex,
					oldValue: oldIndex,
					model: this
				});
		}
	},

	/**
	 * @private
	 */
	adjustTargetForSnapPoints: function() {
		var targetCoord, edge, scrollerExtent, scrollerSize;
		var components, component, snapOffsets;
		var minDist, minIndex, p, dist, i, snapIndex;
		scrollerSize = this.scrollerSize();
		components = this.components;
		component = components.first();
		if (!component) {
			return;
		}
		snapOffsets = this.snapOffsets[component];
		if (component === 'y') {
			edge = 'top';
			scrollerExtent = scrollerSize.height;
		} else {
			edge = 'left';
			scrollerExtent = scrollerSize.width;
		}
		targetCoord = this.targetCoordinate;
		for (i = snapOffsets.length - 1; i >= 0; i--){
			p = snapOffsets[i];
			dist = Math.abs(p + targetCoord[component] - scrollerExtent/2);
			if (minDist === undefined || dist < minDist) {
				minDist = dist;
				minIndex = i;
			}
		}
		this.updateSnapIndex(minIndex);
		snapIndex = this.controller.model.snapIndex;
		this.targetCoordinate[component] = this.scrollPositionForSnapIndex(snapIndex, scrollerExtent, component);
		this.setFrameDistanceRatio(this.kNonFlickSpeed, "snapping to point");
	},

	/**
	 * @private
	 */
	adjustTargetForFlick: function(velocity) {
		var components = this.components;
		var value;
		for (var i = components.length - 1; i >= 0; i--) {
			var component = components[i];
			var delta = 0;
			if (velocity[component] > 0) {
				delta = -1;
			} else if (velocity[component] < 0) {
				delta = 1;
			}
			var index = this.snapIndex + delta;
			if (index >= 0 && index < this.snapElements[component].length) {
				this.setFrameDistanceRatio(this.kNonFlickSpeed, "flicking to point");
				this.updateSnapIndex(index);
				value = this.scrollPositionForSnapIndex(index, undefined, component);
				this.targetCoordinate[component] = value;
			}
		}
	},

	/**
	 * @private
	 */
	dragEndWork: function() {
		var component, currentCoordinate, targetCoordinate, maxLimit, minLimit;
		if (!this.flicked && this.snap) {
			this.adjustTargetForSnapPoints();
		}
		var components = this.components;
		var done = {x: true, y: true};

		if (this.targetCoordinate) {
			for (var i = components.length - 1; i >= 0; i--){
				component = components[i];
				currentCoordinate = this.currentCoordinate[component];
				targetCoordinate = this.targetCoordinate[component];
				minLimit = this.minLimit[component];
				maxLimit = this.maxLimit[component];
				if (targetCoordinate === currentCoordinate) {
					if (currentCoordinate > maxLimit) {
						this.targetCoordinate[component] = maxLimit;
						done[component] = false;
					}
					if (currentCoordinate < minLimit) {
						this.targetCoordinate[component] = minLimit;
						done[component] = false;
					}
				}
			}
		}

		if (!done.x || !done.y) {
			if (!this.correctingOverscroll) {
				if (this.flicked) {
					if (this.snap) {
						this.setFrameDistanceRatio(this.kAnimateSnapSpeed, "snapping at end of drag");
					} else {
						this.setFrameDistanceRatio(this.kFlickSpeed, "animating flick");
					}
				} else {
					this.setFrameDistanceRatio(this.kNonFlickSpeed, "animating non-flick");
				}
			}
			this.startAnimating();
		}
	},

	/**
	 * @private
	 */
	dragEnd: function(event) {
		this.dragEndWork();
		delete this.mouseTracker;
		Mojo.stopListening(this.controller.element, Mojo.Event.dragging, this.draggedHandler);
		Mojo.stopListening(this.controller.element, Mojo.Event.dragEnd, this.dragEndHandler);
		if (event) {
			event.stop();
		}
	},

	/**
	 * @private
	 */
	handleMotion: function(motion, pointer) {
		var moved = false;
		if (this.delayingFlickStop) {
			/* While we're delaying stopping flick scrolling we ignore mouse movements */
			return;
		}
		if (!this.animatingToPointer && !this.correctingOverscroll) {
			this.setFrameDistanceRatio(1, "motion from mouse");
		}
		this.lastPointer = pointer;
		this.calculateAxis();
		var components = this.components;
		var motionForCoordinate, component, targetForComponent;
		for (var i = components.length - 1; i >= 0; i--){
			component = components[i];
			targetForComponent = this.targetCoordinate[component];
			if (targetForComponent > this.maxLimit[component] || targetForComponent < this.minLimit[component]) {
				motionForCoordinate = (0.5 * motion[component]);
			} else {
				motionForCoordinate = motion[component];
			}
			this.targetCoordinate[component] += motionForCoordinate;
			if (motionForCoordinate !== 0) {
				moved = true;
			}
		}
		if (moved && this.inOverscroll) {
			this.startCorrectOverscrollTimer();
		}
	},

	/** @private */
	flick: function(event) {
		var factor;
		var i;
		var component;

		if (!this.mouseTracker) {
			return;
		}
		this.correctOverscrollTimeMs = this.CORRECT_OVERSCROLL_TIME_FLICK_MS;
		if (this.inOverscroll) {
			this.startCorrectOverscrollTimer();
		}
		
		factor = this.kFlickRatio;
		var components = this.components;
		if (event.shiftKey) {
			for (i = components.length - 1; i >= 0; i--){
				component = components[i];
				if (event.velocity[component] > 0) {
					this.targetCoordinate[component] = this.maxLimit[component] + 200;
				} else {
					this.targetCoordinate[component] = this.minLimit[component] - 200;
				}
			}
			this.setFrameDistanceRatio(this.kOverScrollSpeed, "shift-flick scroll");
		} else {
			for (i = components.length - 1; i >= 0; i--){
				component = components[i];
				var v = event.velocity[component] * factor;
				var tc = this.targetCoordinate[component] + v;
				tc = Math.max(this.minOverLimit[component], tc);
				tc = Math.min(this.maxOverLimit[component], tc);
				this.targetCoordinate[component] = tc;
			}
			this.setFrameDistanceRatio(this.kFlickSpeed, "flick scroll");
		}
		if (this.snap) {
			this.adjustTargetForFlick(event.velocity);
		}
		this.flicked = true;
		event.stop();
	},

	/** @private */
	getAnimationQueue: function() {
		return Mojo.Animation.queueForElement(this.controller.element);
	},

	unhandledAnimatingOverscroll: function() {
		var animatingOverscroll = this.inOverscroll;
		var target = this.targetCoordinate;
		var current = this.currentCoordinate;
		var maxLimit, minLimit;
		var axis;
		var axes;
		
		if(this.correctOverscrollTimer) {
			return false;
		}
		
		if(target && current) {
			if(animatingOverscroll) {
				animatingOverscroll = (target.x != current.x) || (target.y != current.y);
			}

			if(!animatingOverscroll) {
				maxLimit = this.maxLimit;
				minLimit = this.minLimit;
				axes = ['x','y'];
			
				for(var i = 0; i < axes.length; i++) {
					axis = axes[i];
					if(current[axis]) {
						if(current[axis] > maxLimit[axis]) {
							target[axis] = maxLimit[axis];
							this.inOverscroll = this.correctingOverscroll = animatingOverscroll = true;
							if(this.mode === 'dominant') {
								this.components = axes;
							}
							this.setFrameDistanceRatio(this.kCorrectOverscrollSpeed);
						} else if(current[axis] < minLimit[axis]) {
							target[axis] = minLimit[axis];
							this.inOverscroll = this.correctingOverscroll = animatingOverscroll = true;
							this.setFrameDistanceRatio(this.kCorrectOverscrollSpeed);
							if(this.mode === 'dominant') {
								this.components = axes;
							}

						}
					} 
				
				}
			}
		}
		
		return animatingOverscroll;
	},
	
	/** @private */
	stopAnimating: function() {
		if (this.animating) {
			this.animating = false;
			this.getAnimationQueue().remove(this);
		}
	},

	/** @private */
	handleError: function() {
		this.stopAnimating();
	},

	/** @private */
	startAnimating: function() {
		var w, elementPos;
		if (!this.animating && this.targetCoordinate) {
			if (!this.currentCoordinate) {
				Mojo.Log.warn("currentCoordinate not set up before call to startAnimating");
				elementPos = this.getScrollPosition();
				this.currentCoordinate = {y: elementPos.top, x: elementPos.left};
			}
			this.getAnimationQueue().add(this);
			this.animating = true;
			this.whinedAboutException = false;
		}
	},

	/** @private */
	finishFlickStop: function() {
		/* If we're here, we've been called by the timer we use to
		   delay stopping flick scrolling, which means it's time to
		   actually stop the scrolling. */
		
		if (this.delayingFlickStop) {
			delete this.delayingFlickStop;

			if(!this.unhandledAnimatingOverscroll()) {
				this.stopAnimating();
				// Set the current and target coordinates to the current scroll position,
				// so that we won't continue animating a flick when the finger lifts unless
				// the user flicks again
				if(!this.flicked) {
					this.setupCoordinates();
				}
			}
		}
	},

	/** @private */
	flickStop: function(mouseDownEvent) {
		if (this.animating) {
			var absDeltaDist;
			var scrollerElement = this.controller.element;
			var eventTarget = mouseDownEvent.target;
			var nonScrollingContainer = Mojo.View.findParentByAttribute(eventTarget, this.controller.document, 'x-mojo-non-scrolling');
			if (eventTarget === scrollerElement || (!nonScrollingContainer && eventTarget.descendantOf(scrollerElement))) {
				/* set up a timer to stop the current flick scrolling animation after a delay. This is so that a series
				   of flicks on a scroller don't cause a stop/start on each flick */
				this.delayingFlickStop = this.controller.window.setTimeout(this.finishFlickStopHandler, this.DELAYED_FLICK_STOP_MS);
				/* taps that stop a scroll shouldn't be treated as taps, unless the scroll is animating very slowly. */
				absDeltaDist = this.absDeltaDist;
				if (absDeltaDist !== undefined && absDeltaDist >= this.DELTA_DISTANCE_TO_PREVENT_TAP) {
					Mojo.Gesture.preventNextTap();
				}
				/* forget about any previous flick, so that it will take a new flick to continue the scroll */
				this.flicked = false;
				this.installContinueOverscrollHandler();
			}
		}
	},

	/** @private */
	maybeCancelDelayedStop: function() {
		if (this.delayingFlickStop) {
			this.controller.window.clearTimeout(this.delayingFlickStop);
			delete this.delayingFlickStop;
		}
	},
	
	/** @private */
	installContinueOverscrollHandler: function() {
		if (!this.continueOverscrollHandlerInstalled) {
			this.controller.listen(this.controller.element, 'mouseup', this.continueOverscrollHandler);
			this.continueOverscrollHandlerInstalled = true;
		}
	},
	
	/** @private */
	removeContinueOverscrollHandler: function() {
		if (this.continueOverscrollHandlerInstalled) {
			this.continueOverscrollHandlerInstalled = false;
			this.controller.stopListening(this.controller.element, 'mouseup', this.continueOverscrollHandler);			
		}
	},

	/** @private */
	continueOverscroll: function() {
		if (this.delayingFlickStop) {
			/* Since the timer hasn't either fired or been canceled by a drag, we need to
			   cancel it here and stop the scrolling */
			this.maybeCancelDelayedStop();

			this.stopAnimating();
		}

		this.removeContinueOverscrollHandler();
		if (this.snap || this.inOverscroll) {
			if (this.snap) {
				this.adjustTargetForSnapPoints();
			}
			this.startAnimating();
		} else {
			this.notifyListeners(true, this.currentCoordinate);
		}
	},

	/**
	 * @private
	 */
	calculateSizes: function() {
		var ratio = 2;
		var dimensions = this.getScrollerSize();
		var yMargin = Math.floor(dimensions.height*ratio);
		var xMargin = Math.floor(dimensions.width*ratio);
		this.minLimit ={x: this.calculateMinLeft(), y: this.calculateMinTop()};
		this.maxLimit = {x: 0, y: 0};
		this.minOverLimit = {x: this.minLimit.x - xMargin, y: this.minLimit.y - yMargin};
		this.maxOverLimit = {x: this.maxLimit.x + xMargin, y: this.maxLimit.y + yMargin};
	},

	/**
	 * @private
	 */
	canScroll: function canScroll (possibleComponents) {
		var target = this.target;
		var elementPos = this.getScrollPosition();
		elementPos.x = elementPos.left;
		elementPos.y = elementPos.top;
		this.calculateSizes();
		var thisCanScroll = false;
		for (var i = possibleComponents.length - 1; i >= 0 && !thisCanScroll; i--){
			var component = possibleComponents[i];
			var minLimit = this.minLimit[component];
			if (minLimit < 0 || elementPos[component] < minLimit) {
				thisCanScroll = true;
			}
		}
		return thisCanScroll;
	},

	/**
	 * @private
	 */
	setupCoordinates: function() {
		var elementPos = this.getScrollPosition();
		if (!this.animatingToPointer) {
			this.setFrameDistanceRatio(1, "setupCoordinates");
		}
		this.targetCoordinate = {y: elementPos.top, x: elementPos.left};
		this.currentCoordinate = {y: elementPos.top, x: elementPos.left};
		this.originalCoordinate = {y: elementPos.top, x: elementPos.left};
	},

	/**
	 * @private
	 */
	startScrolling: function(event, components) {
		var i, component;
		var canScroll = this.canScroll(components);
		if (!canScroll) {
			return;
		}
		var target = this.target;
		this.components = components;
		this.componentsAtStart = {};
		for (i=0; i < components.length; i++) {
			component = components[i];
			this.componentsAtStart[component] = true;
		}
		if (!this.animating) {
			this.maybeCollectListeners(true);
		}
		if (!this.delayingFlickStop) {
			/* we don't want to change the coordinates if we're delaying the stop of scrolling due to a mousedown
			   during flick-scrolling animation */
			this.setupCoordinates(target);
		}
		this.mouseTracker = new Mojo.Widget.Scroller.MouseTracker(this, event, components);
		this.lastCurrent = {};
		this.startAnimating();
		this.controller.listen(this.controller.element, Mojo.Event.dragging, this.draggedHandler);
		this.controller.listen(this.controller.element, Mojo.Event.dragEnd, this.dragEndHandler);
		this.controller.listen(this.controller.element, 'mousedown', this.flickStopHandler);
	},

	/**
	 * @private
	 */
	rampUpDistanceRatioForOverscroll: function() {
		if (this.frameDistanceRatio < this.kNonFlickSpeed) {
			this.frameDistanceRatio += ((this.kNonFlickSpeed-this.frameDistanceRatio)*this.kOverScrollDecay);
		}
	},

	/**
	 * @private
	 */
	adjustTargetWithRatio: function(component, targetLimit, ratio) {
		this.inOverscroll = true;
		var amountToMoveTarget = (targetLimit-this.targetCoordinate[component]) * ratio;
		if (Math.abs(amountToMoveTarget) <= 0.5) {
			this.targetCoordinate[component] = targetLimit;
		} else {
			this.targetCoordinate[component] += amountToMoveTarget;
		}
	},

	/**
	 * @private
	 */
	animate: function(queue) {
		var components = this.components;
		var currentCoordinate, minLimit, maxLimit, targetCoordinate, component, target, scrolled, absDeltaDist, maxAbsDeltaDist;
		var oldCoordinate = {x: this.currentCoordinate.x, y: this.currentCoordinate.y};
		var done = {x:true, y:true};

		this.inOverscroll = false;
		maxAbsDeltaDist = 0;
		for (var i = components.length - 1; i >= 0; i--){
			component = components[i];
			done[component] = false;
			currentCoordinate = this.currentCoordinate[component];
			targetCoordinate = this.targetCoordinate[component];

			minLimit = this.minLimit[component];
			maxLimit = this.maxLimit[component];
			if (this.correctingOverscroll && currentCoordinate > maxLimit && targetCoordinate > maxLimit) {
				this.adjustTargetWithRatio(component, maxLimit, this.kOverScrollSpeed);
				if (currentCoordinate > targetCoordinate) {
					this.rampUpDistanceRatioForOverscroll();
				}
			}
			if (this.correctingOverscroll && currentCoordinate < minLimit && targetCoordinate < minLimit) {
				this.adjustTargetWithRatio(component, minLimit, this.kOverScrollSpeed);
				if (currentCoordinate < targetCoordinate) {
					this.rampUpDistanceRatioForOverscroll();
				}
			}
			var deltaDist = targetCoordinate-currentCoordinate;
			var amountToMove = this.frameDistanceRatio*deltaDist;
			if(!this.inOverscroll && targetCoordinate > maxLimit || targetCoordinate < minLimit) {
				this.inOverscroll = true;
				if (!this.correctOverscrollTimer) {
					this.startCorrectOverscrollTimer();
				}
			}
			// if we're moving far enough, or we're in overscroll, use the amount calculated.
			this.absDeltaDist = absDeltaDist = Math.abs(deltaDist);
			if (absDeltaDist>0.5 || (this.inOverscroll && !this.mouseTracker)) {
				if (absDeltaDist > maxAbsDeltaDist) {
					maxAbsDeltaDist = absDeltaDist;
				}
				if (this.moveLimit) {
					if (amountToMove < 0) {
						amountToMove = Math.min(-this.moveLimit, amountToMove);
					} else {
						amountToMove = Math.max(this.moveLimit, amountToMove);
					}
				}
				this.currentCoordinate[component] += amountToMove;
			} else {
				this.currentCoordinate[component] = targetCoordinate;
				done[component] = true;
				this.absDeltaDist = undefined;
			}
		}

		if (this.absDeltaDist !== undefined) {
			this.absDeltaDist = maxAbsDeltaDist;
		}
		// Move us & notify listeners, if we actually changed anything
		// Doing this carefully to avoid creating 222px strings when they aren't
		// needed.
		currentCoordinate = this.currentCoordinate;
		scrolled = false;
		var scrollPosition = {};
		if(currentCoordinate.x != oldCoordinate.x) {
			scrollPosition.x = currentCoordinate.x;
			scrolled = true;
		}

		if(currentCoordinate.y != oldCoordinate.y) {
			scrollPosition.y = currentCoordinate.y;
			scrolled = true;
		}

		if (scrolled) {
			this.setScrollPosition(scrollPosition);
			this.notifyListeners(false, currentCoordinate);
		}

		if (done.x && done.y && !this.unhandledAnimatingOverscroll()) {
			this.correctingOverscroll = false;
			this.animatingToPointer = false;
			if (!this.mouseTracker) {
				this.stopAnimating();
				this.controller.stopListening(this.controller.element, 'mousedown', this.flickStopHandler);
				this.lastCurrent = {};
				this.flicked = false;
				this.notifyListeners(true, currentCoordinate);
				this.setFrameDistanceRatio(1, "all done");
				delete this.listeners;
				delete this.targetCoordinate;
			}
		}
	},

	/**
	 * @private
	 */
	finishScroll: function() {
		if (this.animating) {
			this.currentCoordinate = this.targetCoordinate;
			this.animate();
		}
	},

	/**
	 * @private
	 */
	correctOverscroll: function() {
		delete this.correctOverscrollTimer;
		if (this.inOverscroll) {
			this.correctingOverscroll = true;
			this.setFrameDistanceRatio(this.kCorrectOverscrollSpeed, "correcting overscroll", true);
			this.dragEndWork();
		}
	},

	/**
	 * @private
	 */
	setFrameDistanceRatio: function(frameDistanceRatio, label, ramp) {
		if (this.frameDistanceAnimator) {
			this.frameDistanceAnimator.cancel();
			this.frameDistanceAnimator = undefined;
		}
		if (frameDistanceRatio !== this.frameDistanceRatio) {
			if (frameDistanceRatio === 1 || this.frameDistanceRatio === 1 || !ramp) {
				this.frameDistanceRatio = frameDistanceRatio;
			} else {
				var details = {
					from: this.frameDistanceRatio,
					to: frameDistanceRatio,
					duration: 0.5
				};
				this.frameDistanceAnimator = Mojo.Animation.animateValue(this.getAnimationQueue(), 'linear', this.updateFrameDistanceRatio, details);
			}
		}
	},

	/**
	 * @private
	 */
	updateFrameDistanceRatio: function(currentValue) {
		this.frameDistanceRatio = currentValue;
	},


	/** @private */
	scrollPages: function(pageCount) {
		var currentTop = -this.getScrollPosition().top;
		currentTop += (pageCount * this.scrollerSize().height + (pageCount > 0 ? -50 : 50));
		this.targetCoordinate = undefined;
		this.overscrollTo(undefined, -currentTop, true);
	},


	kFlickSpeed: 0.06,
	kOverScrollSpeed: 0.3,
	kCorrectOverscrollSpeed: 0.3,
	kAnimateSnapSpeed: 0.3,
	kOverScrollDecay: 0.1,
	kNonFlickSpeed: 0.6,

	/*
		=======================================
		= Public APIs, exposed via widget div =
		=======================================
	*/
	

	/**
	 * Returns the size of the scroller's view port in pixels: {height:nnn, width:nnn}
	 */
	scrollerSize: function() {
		var scrollContainer = this.controller.element;
		var targetDocument = scrollContainer.ownerDocument;
		if (scrollContainer.parentNode === targetDocument.body) {
			return Mojo.View.getViewportDimensions(targetDocument);
		}
		return Element.getDimensions(scrollContainer);
	},
	
	/**
	 * Scroll to the x,y coordinates specified. If either of
	 * the coordinates are undefined, they are ignored.
	 * @param {Object} x
	 * @param {Object} y
	 * @param {Boolean} animated optional, pass true to animate the scroll, otherwise it's instantaneous.
	 * @param {Boolean} suppressNotification optional, pass true to prevent a non-animated scroll from notifying listeners
	 */
	scrollTo: function(x, y, animated, suppressNotification) {
		this._scrollTo(x, y, animated, suppressNotification, false);
	},
	
	/**
	 * @private
	 */
	overscrollTo: function(x, y, animated, suppressNotification) {
		this._scrollTo(x, y, animated, suppressNotification, true);
	},
	

	_scrollTo: function(x, y, animated, suppressNotification, overScroll) {
		var size, targetSize;
		var target = this.target;
		var currentPosition;
		
		//only allow overscroll if animated.
		if(!animated) {
			overScroll = false;
		}

		if (target) {
			if (!animated) {
				this.stopAnimating();
			}
			this.maybeCollectListeners(true);

			if (!this.targetCoordinate || !this.components) {
				this.components = [];
				if (x !== undefined) {
					this.components.push("x");
				}
				if (y !== undefined) {
					this.components.push("y");
				}
				this.setupCoordinates(target);
				this.calculateSizes();
			}

			size = this.scrollerSize();
			targetSize = this.getContentSize();

			if (x !== undefined) {
				if(overScroll) {
					x = this.looseClipHorizontal(x, size, targetSize);
				} else {
					x = this.clipHorizontal(x, size, targetSize);
				}
				if (!animated) {
					this.setScrollPosition({x: x});
				}
			}
			if (y !== undefined) {
				if(overScroll) {
					y = this.looseClipVertical(y, size, targetSize);
				} else {
					y = this.clipVertical(y, size, targetSize);
				}
				if (!animated) {
					this.setScrollPosition({y: y});
				}
			}
			if (animated) {
				this.setupCoordinates(target);
				if (x !== undefined) {
					this.targetCoordinate.x = x;
				}
				if (y !== undefined) {
					this.targetCoordinate.y = y;
				}
				this.setFrameDistanceRatio(this.kAnimateSnapSpeed, "animating scroll to");
				this.startAnimating();
				
				
			} else {
				currentPosition = this.getScrollPosition();
				currentPosition = {x: currentPosition.left, y: currentPosition.top};
				if (!suppressNotification) {
					this.notifyListeners(true, currentPosition);
					delete this.listeners;
				}
			}
		}
	},

	
	
	/**
	 * Instantaneously adjust the current scroll position by the given amount.
	 * Safe to call from scroll listeners while animating.
	 * Does not cause listeners to be notified of any changes.
	 *
	 * @param {Object} dx
	 * @param {Object} dy
	 */
	adjustBy: function(dx, dy) {
		var size, targetSize, currentCoordinate;

		if(!dx && !dy) {
			return;
		}

		dx = dx ? dx : undefined;
		dy = dy ? dy : undefined;

		if(this.animating) {
			currentCoordinate = {};
			if(dx !== undefined) {
				this.currentCoordinate.x += dx;
				this.targetCoordinate.x += dx;
				currentCoordinate.x = Math.round(this.currentCoordinate.x);
			}

			if(dy !== undefined) {
				this.currentCoordinate.y += dy;
				this.targetCoordinate.y += dy;
				currentCoordinate.y = Math.round(this.currentCoordinate.y);
			}

		} else {
			currentCoordinate = this.getState();
			size = this.scrollerSize();
			targetSize = this.getContentSize();

			if(dx !== undefined) {
				currentCoordinate.x = this.clipHorizontal(currentCoordinate.left + dx, size, targetSize);
			}

			if(dy !== undefined) {
				currentCoordinate.y = this.clipVertical(currentCoordinate.top + dy, size, targetSize);
			}

		}

		this.setScrollPosition(currentCoordinate);
	},

	/**
	 * Jump the scroll to reveal the top of the content being scrolled.
	 * @param {Object} newTop
	 */
	revealTop: function(newTop) {
		var target = this.target;
		if (target) {
			newTop = newTop || 0;
			var currentTop = -this.getScrollPosition().top;
			var currentBottom = currentTop + this.scrollerSize().height;
			var topOffset = -newTop;
			
			if (topOffset > currentTop && topOffset < currentBottom) {
				return;
			}
			this.scrollTo(undefined, newTop);
		}
	},

	/**
	 * Jump the scroll to reveal the bottom of the content being scrolled
	 */
	revealBottom: function() {
		var newTop;
		var target = this.target;
		newTop = this.calculateMinTop();
		this.scrollTo(undefined, newTop);
	},

	/**
	 * Jump the scroll to reveal a particular element.
	 * @param {Object} element
	 */
	revealElement: function(element) {
		var elementToReveal = this.controller.get(element);
		if (elementToReveal) {
			var currentTop = -this.getScrollPosition().top;
			var currentBottom = currentTop + this.scrollerSize().height;
			var elementHeight = elementToReveal.getHeight();
			var elementOffset = Element.positionedOffset(elementToReveal);

			var currentlyShowing = currentBottom - elementOffset.top;
			var remainingToShow = elementHeight - currentlyShowing;
			if (Math.abs(remainingToShow) > 0) {
				this.adjustBy(0, -remainingToShow);
			}
		}
	},

	/**
	 * Returns the current scroll state for use in a future call to setState.
	 */
	getState: function() {
		var target = this.target;
		return this.getScrollPosition();
	},


	/**
	 * Jumps the scroll to the value specified in scrollState
	 * @param {Object} scrollState
	 * @param {Boolean} optional, pass true to animate the scroll
	 */
	setState: function(scrollState, animated) {
		// restore the state.
		// We never supress notification, since listeners will need to know about the new state.
		this.scrollTo(scrollState.left, scrollState.top, animated);
	},

	/**
		@private
	 */
	clipHorizontal: function(x, size, targetSize) {
		if (x !== undefined) {
			x = Math.max(-(targetSize.width - size.width),x);
			x = Math.min(x, 0);
		}
		return x;
	},

	/**
		@private
	 */
	clipVertical: function(y, size, targetSize) {
		if (y !== undefined) {
			y = Math.max(-(targetSize.height - size.height),y);
			y = Math.min(y, 0);
		}
		return y;
	},
	
	kLooseClipAllowance: 50,
	
	/**
		@private
	 */
	looseClipHorizontal: function(x, size, targetSize) {
		if (x !== undefined) {
			x = Math.max(size.width - targetSize.width - this.kLooseClipAllowance, x);
			x = Math.min(x, this.kLooseClipAllowance);
		}
		return x;
	},

	/**
		@private
	 */
	looseClipVertical: function(y, size, targetSize) {
		if (y !== undefined) {
			y = Math.max(size.height - targetSize.height - this.kLooseClipAllowance, y);
			y = Math.min(y, this.kLooseClipAllowance);
		}
		return y;
	},
	

	/**
		Returns an object with "left" and "top" properties indicating the current scroll position.
	*/
	getScrollPosition: function() {
		var scrollElement = this.controller.element;
		return {left: -scrollElement.scrollLeft, top: -scrollElement.scrollTop};
	},

	/**
		@private
		Internal function for setting scroll position.  Should not be used externally, since it does not notify scroll listeners.
	*/
	setScrollPosition: function(scrollPosition) {
		var scrollElement = this.controller.element;

		if(!this.currentCoordinate) {
			this.currentCoordinate = {};
		}

		var x = scrollPosition.x;
		if (x !== undefined) {
			var scrollX = -x;
			scrollElement.scrollLeft = scrollX;
			this.currentCoordinate.x = x;
		}

		var y = scrollPosition.y;
		if (y !== undefined) {
			var scrollY = -y;
			scrollElement.scrollTop = scrollY;
			this.currentCoordinate.y = y;
		}
		if (this.indicators) {
			// potentialy show or hide the gradient background elements
			this.updateScrollIndicators();
		}
	},

	/**
	 * Sets the snap index for a snap scroller and scrolls to the new position,
	 * optionally animated.
	 * @param {Number} snapIndex Index of the desired snap point
	 * @param {Boolean} animate True to animate the scroll to the snap point
	 */
	setSnapIndex: function(snapIndex, animate) {
		var model = this.controller.model;
		if (model && this.mode.match(/snap/)) {
			if (snapIndex !== model.snapIndex) {
				this.updateSnapIndex(snapIndex);
				this.scrollToSnapIndex(animate);
			}
		}
	},

	/** @private */
	validateScrollPosition: function() {
		var scrollContainer;
		var hasPalmOverflow = this.hasPalmOverflow;
		if (hasPalmOverflow) {
			scrollContainer = this.controller.element;
			scrollContainer.style.overflow = 'hidden';
		}
		this.calculateSizesAndUpdateScrollIndicators();
		if (hasPalmOverflow) {
			scrollContainer.style.overflow = '-webkit-palm-overflow';
		}
	},

	/** @private */
	updatePhysicsParameters: function(parameters) {
		var value;

		value = parameters.flickSpeed;
		if (value !== undefined) {
			this.kFlickSpeed = Number(value);
		}

		value = parameters.flickRatio;
		if (value !== undefined) {
			this.kFlickRatio = Number(value);
		}
	},

	/** @private */
	handleEdgeVisibility: function(edge, visible, marginAmount) {
		var scrollElement = this.controller.element;
		var styleName = '-webkit-palm-scroll-margin-' + edge;
		var amount;
		if (visible) {
			amount = marginAmount;
		} else {
			amount = 0;
		}
		scrollElement.style[styleName] = amount + 'px';
	},

	/** @private */
	scrollPositionForSnapIndex: function(snapIndex, scrollerExtent, component) {
		var scrollerSize;
		var snapOffsets = this.snapOffsets[component];
		var elementOffset = snapOffsets[snapIndex];
		if (scrollerExtent === undefined) {
			scrollerSize = this.scrollerSize();
			if (component === 'y') {
				scrollerExtent = scrollerSize.height;
			} else {
				scrollerExtent = scrollerSize.width;
			}
		}
		return Math.round(-elementOffset + scrollerExtent/2);
	},

	/** @private */
	scrollToSnapIndex: function(animate) {
		var left, top;
		var components = this.calculatePossibleComponents();
		var component = components.first();
		if (component) {
			this.calculateSnapPoints(components);
			var p = this.scrollPositionForSnapIndex(this.snapIndex, undefined, component);
			if (components.x) {
				left = p;
			}
			if (components.y) {
				top = p;
			}
			this.scrollTo(left, top, animate);
		}
	},

	/** @private */
	shouldShowIndicator: function(component, limitName, checkLess) {
		var currentCoordinate, limitValue;
		currentCoordinate = this.currentCoordinate[component];
		limitValue = this[limitName][component];
		if (checkLess) {
			return currentCoordinate < limitValue-this.kMinimumSizeDifferenceForScrolling;
		}
		return currentCoordinate > limitValue+this.kMinimumSizeDifferenceForScrolling;
	},

	/** @private */
	updateIndicator: function(indicator) {
		if (indicator) {
			indicator.update();
		}
	},

	/** @private */
	updateScrollIndicators: function() {
		var currentCoordinate = this.currentCoordinate;
		var updateIndicator, indicator;
		var indicators = this.indicators;
		if (indicators) {
			updateIndicator = this.updateIndicator;
			if (currentCoordinate.x !== undefined) {
				updateIndicator(indicators.left);
				updateIndicator(indicators.right);
			}
			if (currentCoordinate.y !== undefined) {
				updateIndicator(indicators.top);
				updateIndicator(indicators.bottom);
			}
		}
	},

	DELAYED_FLICK_STOP_MS: 150,
	CORRECT_OVERSCROLL_TIME_MS: 250,
	CORRECT_OVERSCROLL_TIME_FLICK_MS: 50,
	LOCK_RADIUS: 50,
	FADE_ELEMENT_ATTRIBUTE: 'x-mojo-scroll-fade',
	/* used to prevent scrolling when the content isn't significantly larger than the scroller. Work around
	 * for the effects of negative margin in some cases. */
	kMinimumSizeDifferenceForScrolling: 3,
	DELTA_DISTANCE_TO_PREVENT_TAP: 25,
	kFlickRatio: 0.5

});

/**
 * Creates a function suitable for use as a moved method that
 * calls the passed in function only after the given element's
 * containing scroller has moved more than the threshhold in pixels.
*/
Mojo.Widget.Scroller.createThreshholder = function(functionToCall, element, inThreshhold) {
	var lastPosition;
	var threshhold = inThreshhold || 100;
	var scroller = Mojo.View.getScrollerForElement(element);
	var target = Element.firstDescendant(scroller);

	return function(scrollEnding, position) {
		if (target) {
			var scrollStarting = false;
			var delta;
			if (lastPosition) {
				delta = {x: Math.abs(position.x - lastPosition.x), y: Math.abs(position.y - lastPosition.y)};
			} else {
				scrollStarting = true;
				lastPosition = {};
			}
			if (scrollStarting || scrollEnding || lastPosition === undefined || (delta.x > threshhold) || (delta.y > threshhold)) {
				lastPosition.x = position.x;
				lastPosition.y = position.y;
				functionToCall(scrollEnding, position);
			}
		}
	};
};

/** @private */
Mojo.Widget.Scroller.prototype.getScrollerSize = function getScrollerSize () {
	var dimensions, parent;
	if (this.sizeToWindow) {
		dimensions = Mojo.View.getViewportDimensions(this.controller.document);
	} else {
		parent = this.target.parentNode;
		dimensions = Mojo.View.getUsableDimensions(parent, true);
	}
	return dimensions;
};

/** @private */
Mojo.Widget.Scroller.prototype.calculateMinTop = function calculateMinTop () {
	var target = this.target;
	var minTop, maxHeight;
	var dimensions = this.getScrollerSize();
	maxHeight = this.getContentSize().height;
	minTop = dimensions.height - maxHeight;
	if (minTop > -this.kMinimumSizeDifferenceForScrolling) {
		minTop = 0;
	}
	return minTop;
};

/** @private */
Mojo.Widget.Scroller.prototype.calculateMinLeft = function calculateMinLeft () {
	var target = this.target;
	var minLeft, maxWidth;
	var dimensions = this.getScrollerSize();
	maxWidth = this.getContentSize().width;
	minLeft = dimensions.width - maxWidth;
	if (minLeft > -this.kMinimumSizeDifferenceForScrolling) {
		minLeft = 0;
	}
	return minLeft;
};

Mojo.Widget.Scroller.validateScrollPositionForElement = function validateScrollPositionForElement(targetElement) {
	var scroller = Mojo.View.getScrollerForElement(targetElement);
	while (scroller) {
		scroller.mojo.validateScrollPosition();
		scroller = Mojo.View.getScrollerForElement(scroller.parentNode);
	}
};


(function() {
	var axisLimitDegrees = 25;
	Mojo.Widget.Scroller.prototype.kAxisLimitDegrees = axisLimitDegrees;
	var pi180 = Math.PI / 180;
	Mojo.Widget.Scroller.prototype.lowerAngle = (axisLimitDegrees * pi180);
	Mojo.Widget.Scroller.prototype.upperAngle = ((90 - axisLimitDegrees) * pi180);
	Mojo.Widget.Scroller.prototype.FADE_ELEMENT_SELECTOR = '*[' + Mojo.Widget.Scroller.prototype.FADE_ELEMENT_ATTRIBUTE + ']';
})();

/** @private */
Mojo.Widget.Scroller.MouseTracker = Class.create({
	/** @private */
	initialize: function(widget, dragStartEvent, components) {
		this.widget = widget;
		var downEvent = dragStartEvent.down;
		this.components = components;
		this.lastPointer = Event.pointer(downEvent);
	},

	/** @private */
	dragged: function(draggedEvent) {
		var moveEvent = draggedEvent.move;
		var component;
		var pointer = moveEvent.filteredPointer;
		var motion = {x: 0, y: 0};
		var componentIndex;
		for (componentIndex = 0; componentIndex < this.components.length; componentIndex++){
			component = this.components[componentIndex];
			if (this.lastPointer[component] != pointer[component]) {
				motion[component] = pointer[component] - this.lastPointer[component];
			}
		}
		this.lastPointer = pointer;
		this.widget.handleMotion(motion, pointer);
	}
});

/*
 * Helper object to manage one of the gradient background elements that we use to cause
 * the content to fade out at the top or bottom when there is content scrolled off.
 * @private
 * @constructor
 * @param {Object} indicatorElement Element with the gradient background
 * @param {Function} checkShouldShow Function that returns true if the element should be
 *					 be shown.
 */
Mojo.Widget.Scroller.Indicator = function Indicator(indicatorElement, checkShouldShow) {
	this.indicatorElement = indicatorElement;
	this.isVisible = indicatorElement.visible();
	this.checkShouldShow = checkShouldShow;
};

/** @private */
Mojo.Widget.Scroller.Indicator.prototype.update = function update() {
	var shouldShow = this.checkShouldShow();
	if (shouldShow != this.isVisible) {
		if (shouldShow) {
			this.indicatorElement.show();
		} else {
			this.indicatorElement.hide();
		}
		this.isVisible = shouldShow;
	}
};

