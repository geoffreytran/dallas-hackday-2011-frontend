
/**
 * @name gesture.js
 * @fileOverview This file has functions related to gesture...
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * @private 
 * @namespace describe it!
 *
 */
Mojo.Gesture = {};


/** @private */
Mojo.Gesture._isFeedbackDisabled = function(target) {
	return target.getAttribute(Mojo.Gesture.selectionHighlightFeedbackAttribute) === Mojo.Gesture.disableFeedback;
};

Mojo.Gesture.index = 0;
Mojo.Gesture.PASS_EVENT_ATTRIBUTE='x-palm-pass-event';

/** @private */
Mojo.Gesture.gestureAttribute = 'x-mojo-gesture';
/** @private */
Mojo.Gesture.selectionHighlightAttribute = 'x-mojo-tap-highlight';
/** @private */
Mojo.Gesture.selectionHighlightFeedbackAttribute = 'x-mojo-touch-feedback';
/** @private */
Mojo.Gesture.consumesEnterAttribute='x-mojo-consumes-enter';
/** @private */
Mojo.Gesture.momentarySelection = 'momentary';
/** @private */
Mojo.Gesture.immediateSelection = 'immediate';
/** @private */
Mojo.Gesture.persistentSelection = 'persistent';
/** @private */
Mojo.Gesture.immediateFeedback = 'immediate'; //immediate, then delayed up
/** @private */
Mojo.Gesture.spontaneousFeedback = 'spontaneous'; //immediate, then immediate
/** @private */
Mojo.Gesture.disableFeedback = 'none'; //don't add the selected class to this; just add it to other stuff in the chain
/** @private */
Mojo.Gesture.delayedFeedback = 'delayed'; //delayed, then delayed up
/** @private */
Mojo.Gesture.immediatePersistentFeedback = 'immediatePersistent';//immediate, then persistent
/** @private */
Mojo.Gesture.delayedPersistentFeedback = 'delayedPersistent';//delayed, then persistent
/** @private */
Mojo.Gesture.delimiter = / +/;
/** @private */
Mojo.Gesture._newSelectionFeedback = 'new';
/** @private */
Mojo.Gesture._oldSelectionFeedback = 'deprecated';
/** 
 * @private 
 * @deprecated
 */
Mojo.Gesture.delimeter = / +/;
/** @private */
Mojo.Gesture.CONSUMED_EVENT = 'consume';
/** @private */
Mojo.Gesture.ALLOW_EVENT = 'allow';
/** @private */
Mojo.Gesture.IGNORED_EVENT = false;

/** @private */
Mojo.Gesture.gestureTypeFlick = 'flick';
/** @private */
Mojo.Gesture.gestureTypeForward = 'forward';
/** @private */
Mojo.Gesture.gestureTypeUp = 'up';
/** @private */
Mojo.Gesture.gestureTypeDown = 'down';


/** @private */
Mojo.Gesture.setup = function(targetDocument) {
	targetDocument.addEventListener("mousedown", Mojo.Gesture.mouseDownHandler, false);
	targetDocument.addEventListener("mousemove", Mojo.Gesture.mouseMoveHandler, false);
	targetDocument.addEventListener("mouseup", Mojo.Gesture.mouseUpHandler, false);
	if (Mojo.Gesture.translateReturnKey) {
		targetDocument.addEventListener("keydown", Mojo.Gesture.keydownHandler, true);
		targetDocument.addEventListener("keyup", Mojo.Gesture.keyupHandler, true);		
	}
};

/** @private */
Mojo.Gesture.cleanup = function(targetDocument) {
	var currentGesture;
	targetDocument.removeEventListener("mousedown", Mojo.Gesture.mouseDownHandler, false);
	targetDocument.removeEventListener("mousemove", Mojo.Gesture.mouseMoveHandler, false);
	targetDocument.removeEventListener("mouseup", Mojo.Gesture.mouseUpHandler, false);
	if (Mojo.Gesture.translateReturnKey) {
		targetDocument.removeEventListener("keydown", Mojo.Gesture.keydownHandler, true);
		targetDocument.removeEventListener("keyup", Mojo.Gesture.keyupHandler, true);		
	}
	currentGesture = Mojo.Gesture.gestureForWindow(targetDocument.defaultView);
	if (currentGesture) {
		Mojo.Gesture.saveGesture(targetDocument.defaultView, undefined);
		currentGesture.finish();
	}
};

/** @private */
Mojo.Gesture.windowForEvent = function windowForEvent(uiEvent) {
	var targetWindow;
	if (!uiEvent) {
		return;
	}
	targetWindow = uiEvent.view;
	if (!targetWindow.Mojo) {
		targetWindow = undefined;
	}
	return targetWindow;
};

/** @private */
Mojo.Gesture.gestureForWindow = function gestureForWindow(targetWindow) {
	var gesture;
	if (targetWindow) {
		gesture = targetWindow.Mojo._mojoCurrentGesture;
	}
	return gesture;
};

/** @private */
Mojo.Gesture.gestureForEvent = function gestureForEvent(uiEvent) {
	return Mojo.Gesture.gestureForWindow(Mojo.Gesture.windowForEvent(uiEvent));
};

/** @private */
Mojo.Gesture.saveGesture = function saveGesture(targetWindow, gesture) {
	if (targetWindow) {
		targetWindow.Mojo._mojoCurrentGesture = gesture;		
	}
};

/** @private */
Mojo.Gesture.mouseDownHandler = function(event) {
	Mojo.Event._logEvent("got", event, event && event.target);
	var currentGesture = Mojo.Gesture.gestureForEvent(event);
	if (event && !Mojo.Gesture.disableEventHandling && !currentGesture && event.button === 0) {
		currentGesture = new Mojo.Gesture.Recognizer(event);
		Mojo.Gesture.saveGesture(Mojo.Gesture.windowForEvent(event), currentGesture);
	}
};

/** @private */
Mojo.Gesture.mouseMoveHandler = function(event) {
	var currentGesture = Mojo.Gesture.gestureForEvent(event);
	if (event && !Mojo.Gesture.disableEventHandling && currentGesture && event.button === 0) {
		Mojo.Event._logEvent("got", event, event.target);
		currentGesture.mouseMove(event);
	}
};

/** @private */
Mojo.Gesture.mouseUpHandler = function(event) {
	Mojo.Event._logEvent("got", event, event && event.target);
	var currentGesture = Mojo.Gesture.gestureForEvent(event);
	if (event && !Mojo.Gesture.disableEventHandling && currentGesture && event.button === 0) {
		currentGesture.mouseUp(event);
		Mojo.Gesture.saveGesture(event.view, undefined);
	}
};

/** @private */
Mojo.Gesture.keydownHandler = function(event) {
	if (event && (event.keyCode === Mojo.Char.enter)) {
		var selection = document.querySelector(':focus');
		if (!Mojo.Gesture.handlesReturnKey(selection)) {
			Event.stop(event);
		}
	}
};

/** @private */
Mojo.Gesture.keyupHandler = function(event) {
	if (event && (event.keyCode === Mojo.Char.enter)) {
		var selection = document.querySelector(':focus');
		if (!Mojo.Gesture.handlesReturnKey(selection)) {
			Event.stop(event);
			Mojo.Event.sendKeyDownAndUpEvents("U+0009");			
		}
	}
};

/**
 * describe
 * @param {Object} thingToDo describe
 * @private
 */
Mojo.Gesture.restoreEventHandling = function() {
    Mojo.Gesture.disableEventHandling = false;
};

/**
 * describe
 * @param {Object} thingToDo describe
 * @private
 */
Mojo.Gesture.withMouseEventHandlingDisabled = function(thingToDo) {
	var wasDisabled = Mojo.Gesture.disableEventHandling;
    if (wasDisabled) {
        thingToDo();
        return;
    }
	try	{
		Mojo.Gesture.disableEventHandling = true;
		thingToDo();
	} catch (e) {
		Mojo.Gesture.disableEventHandling = wasDisabled;
		throw(e);
	}
    Mojo.Gesture.restoreEventHandling.defer();
};

/**
* @private
 */
Mojo.Gesture.preventNextTap = function() {
	Mojo.Gesture.doPreventNextTap = true;
};

/**
* @private
 */
Mojo.Gesture.recordEvents = function(record) {
	Mojo.Gesture.doRecordEvents = record;
	if (record) {
		Mojo.Gesture.eventList = [];		
	} else {
		delete Mojo.Gesture.eventList;
	}
};

/** @private */
Mojo.Gesture.calculateDistance = function(pt1, pt2) {
	return {x: pt1.x - pt2.x, y: pt1.y - pt2.y};
};

/** @private */
Mojo.Gesture.calculateAbsDistance = function(pt1, pt2) {
	return {x: Math.abs(pt1.x - pt2.x), y: Math.abs(pt1.y - pt2.y)};
};

/** @private */
Mojo.Gesture.dragDirection = function(originalPt, currentPt) {
	var deltaX = Math.abs(currentPt.x - originalPt.x);
	var deltaY = Math.abs(currentPt.y - originalPt.y);
	return {horizontal: (deltaX > 0), vertical: (deltaY > 0)};
};

Mojo.Gesture.shouldStopEventOnElement = function(element) {
	var nativeEvent = element.getAttribute(Mojo.Gesture.PASS_EVENT_ATTRIBUTE);
	return nativeEvent === null;
};

Mojo.Gesture.simulateClick = function simulateClick(element, screenX, screenY) {
	if (!PalmSystem.simulated) {
		var targetWindow = element.ownerDocument.defaultView;
		Mojo.Gesture.withMouseEventHandlingDisabled(function() {
			targetWindow.PalmSystem.simulateMouseClick(screenX, screenY, true);
			targetWindow.PalmSystem.simulateMouseClick(screenX, screenY, false);
		});
	}
};

Mojo.Gesture.handlesReturnKey = function handlesReturnKey(node) {
	if (node === undefined || node === null) {
		return false;
	}
	
	if (node.hasAttribute(Mojo.Gesture.consumesEnterAttribute)) {
		return true;
	}

	if (node.tagName !== "TEXTAREA") {
		return node.getStyle("-webkit-user-modify") === "read-write";
	}

	return true;
};

/** @private */
Mojo.Gesture.Recognizer = Class.create({
	/** @private */
	initialize: function(event) {
		var tagName, downHighlightTarget, downHighlightMode, applySelectHighlightTimerHandler;
		this.downTarget = event.target;
		this.document = event.target && event.target.ownerDocument;
		this.downShift = event.shiftKey;
		this.userModify = PalmSystem.simulated && (this.downTarget.getStyle("-webkit-user-modify") == "read-write");
		if (this.userModify) {
			return;
		}
		if (Mojo.Gesture.doRecordEvents) {
			Mojo.Gesture.eventList = [event];
		}
		this.originalPointer = Event.pointer(event);
		this.lastPointer = this.originalPointer;
		this.filter = {x: true, y: true};
		this.index = Mojo.Gesture.index;
		Mojo.Gesture.index += 1;
		this.holdTimer = this.mouseHeld.bind(this).delay(this.kHoldTime);
		this.downEvent = Object.extend({}, event);
		this.velocityHistory = [];
		this.velocity = {x: 0, y: 0};
		this.simulateFlick = PalmSystem.simulated;
		tagName = this.downTarget.tagName;
		this.preventTap = Mojo.Gesture.doPreventNextTap;
		Mojo.Gesture.doPreventNextTap = false;
		if (!PalmSystem.simulated) {
			this.maybeStopEvent(event);
		} else if (tagName !== "INPUT" && tagName !== "TEXTAREA" && tagName !== "OBJECT") {
			this.maybeStopEvent(event);
		}
		
		downHighlightTarget = Mojo.View.findParentByAttribute(this.downTarget, this.document, Mojo.Gesture.selectionHighlightFeedbackAttribute);
		if (downHighlightTarget) {
			this.downHighlightVersion = Mojo.Gesture._newSelectionFeedback;
			downHighlightMode = downHighlightTarget.getAttribute(Mojo.Gesture.selectionHighlightFeedbackAttribute);
			this.downMode = downHighlightMode;
			if (downHighlightMode === Mojo.Gesture.immediateFeedback || downHighlightMode === Mojo.Gesture.spontaneousFeedback || downHighlightMode === Mojo.Gesture.immediatePersistentFeedback) { //in this case, immediate down, delayed up ALWAYS
				this.applySelectHighlight(downHighlightTarget);
			}
			applySelectHighlightTimerHandler = this.applySelectHighlightFromTimer.bind(this);
			this.selectTimer = applySelectHighlightTimerHandler.delay(this.kSelectTime);
			this.clearSelected = this.clearSelected.bind(this);
		} else {
			downHighlightTarget = Mojo.View.findParentByAttribute(this.downTarget, this.document, Mojo.Gesture.selectionHighlightAttribute);
			if (downHighlightTarget) {
				this.downHighlightVersion = Mojo.Gesture._oldSelectionFeedback;
				downHighlightMode = downHighlightTarget.getAttribute(Mojo.Gesture.selectionHighlightAttribute);
				if (downHighlightMode === Mojo.Gesture.immediateSelection) {
					this.applySelectHighlight(downHighlightTarget);
				}
			}
			applySelectHighlightTimerHandler = this.applySelectHighlightFromTimer.bind(this);
			this.selectTimer = applySelectHighlightTimerHandler.delay(this.kSelectTime);
			this.clearSelected = this.clearSelected.bind(this);
		}

	},
	
	
	/** @private */
	setDownTarget: function(node) {
		this.downTarget = node;
	},
	
	/** @private */
	kFilterDistance: 12,
	/** @private */
	kHoldTime: 0.5,
	/** @private */
	kSelectTime: 0.15, //per Daniel, this is 150ms
	/** @private */
	kFlickThreshold: 300,
	
	/** @private */
	filterMousePosition: function(event, currentPointer) {
		var dist = Mojo.Gesture.calculateAbsDistance(this.originalPointer, currentPointer);
		if (this.simulateFlick) {
			if (!this.filter.x || dist.x >= this.kFilterDistance) {
				event.filteredX = currentPointer.x;
				this.filter.x = false;
			} else {
				event.filteredX = this.originalPointer.x;
			}

			if (!this.filter.y || dist.y >= this.kFilterDistance) {
				this.filter.y = false;
				event.filteredY = currentPointer.y;
			} else {
				event.filteredY = this.originalPointer.y;
			}
			event.filteredPointer = {x: event.filteredX, y: event.filteredY};
		} else {
			event.filteredPointer = currentPointer;
		}
		return dist;
	},
	
	/**
	 * @private
	 */
	calculateVelocity: function(event, currentPointer) {
		var delta, deltaT, currentVelocity, aveX, aveY;
		if (this.lastPointer) {
			this.lastDelta = Mojo.Gesture.calculateDistance(currentPointer, this.lastPointer);
			deltaT = event.timeStamp - this.lastTimeStamp;
			if (deltaT > 0) {
				currentVelocity = {x: Math.round((1000*this.lastDelta.x)/deltaT), y: Math.round((1000*this.lastDelta.y)/deltaT)};
			} else {
				currentVelocity = {x: 0, y: 0};
			}
			if (this.velocityHistory.length >= 2) {
				this.velocityHistory.shift();
			}
			this.velocityHistory.push(currentVelocity);
			if (this.velocityHistory.length >= 2) {
				aveX = Math.round(this.velocityHistory[1].x * 0.7 + this.velocityHistory[0].x * 0.3);
				aveY = Math.round(this.velocityHistory[1].y * 0.7 + this.velocityHistory[0].y * 0.3);
				this.velocity = {x: aveX, y: aveY};
			} else {
				this.velocity = currentVelocity;
			}
			event.distance = this.lastDelta;
		}
		this.lastPointer = currentPointer;
		this.lastTimeStamp = event.timeStamp;
	},
	
	/** @private */
	mouseDown: function(event) {
	},
	
	/**
	 * @private
	 */
	stopSelectTimer: function() {
		if (this.selectTimer) {
			window.clearTimeout(this.selectTimer);
			delete this.selectTimer;			
		}
	},
	
	/** @private */
	applySelectHighlight: function(hitTarget) {
		var currentTarget = Mojo.View.findParentByAttribute(hitTarget, this.document, Mojo.Gesture.selectionHighlightFeedbackAttribute);
		var prevTarget;
		
		if (currentTarget) {
			this.downHighlightVersion = Mojo.Gesture._newSelectionFeedback;
			if (currentTarget && currentTarget !== document && !this.preventTap) {
				this.highlightedElement = currentTarget;
				this.highlightTargetTime = Date.now();
				Mojo.Gesture.highlightTarget = currentTarget;
				Mojo.Gesture.highlightTargetTime = this.highlightTargetTime;
				Mojo.View.clearTouchFeedback(hitTarget.ownerDocument.body);
				
				if (!Mojo.Gesture._isFeedbackDisabled(currentTarget)) {
					currentTarget.addClassName(Mojo.Gesture.kSelectedClassName);
				}
						
				if (currentTarget === this.document || currentTarget === null) {
					return undefined;
				}
			}
		} else {
			currentTarget = Mojo.View.findParentByAttribute(hitTarget, this.document, Mojo.Gesture.selectionHighlightAttribute);
			if (currentTarget && currentTarget !== document && currentTarget !== null && !this.preventTap) {
				this.downHighlightVersion = Mojo.Gesture._oldSelectionFeedback;
				this.highlightedElement = currentTarget;
				this.highlightTargetTime = Date.now();
				Mojo.Gesture.highlightTarget = currentTarget;
				Mojo.Gesture.highlightTargetTime = this.highlightTargetTime;
				currentTarget.addClassName(Mojo.Gesture.kSelectedClassName);
			}
			if (currentTarget === document || currentTarget === null) {
				return undefined;
			}
		}
		return currentTarget;
	},
	
	/** @private */
	applySelectHighlightFromTimer: function(event) {
		if (this.selectTimer) {
			delete this.selectTimer;
			this.applySelectHighlight(this.downTarget);
		}
	},
	
	/** @private */
	mouseHeld: function() {
		var holdEvent;
		delete this.holdTimer;
		if (!this.moved && !this.preventTap) {
			holdEvent = Mojo.Event.send(this.downTarget, Mojo.Event.hold, {down: this.downEvent, count: this.downEvent.detail});
			this.held = !!holdEvent.defaultPrevented;
			this.holdTimerFired = true;
		}
	},
	
	/**
	 * @private
	 */
	handleFirstMove: function() {
		if (this.dragSentButNotHandled) {
			this.applySelectHighlight(this.downTarget);
			if (this.highlightedElement) {
				var nonScrollingHighlight = new Mojo.Gesture.NonScrollingHighlight(this.highlightedElement);				
			}
		} else {
			this.stopSelectTimer();
			this.clearSelected(true);			
		}

		this.moved = true;
		if (this.holdTimer) {
			window.clearTimeout(this.holdTimer);
			delete this.holdTimer;
		}
	},
	
	maybeStopEvent: function(event) {
		if (Mojo.Gesture.shouldStopEventOnElement(this.downTarget)) {
			Event.stop(event);
		}
	},
	
	/** @private */
	mouseMove: function(event) {
		if (Mojo.Gesture.eventList) {
			Mojo.Gesture.eventList.push(event);	
		}
		if (this.userModify) {
			return;
		}
		var filteredDist;
		var mojoEvent;
		var currentPointer = Event.pointer(event);
		if (currentPointer.y < 0) {
			return;
		}
		if (Mojo.Host.current === Mojo.Host.browser && currentPointer.y > document.viewport.getHeight()) {
			currentPointer.y = document.viewport.getHeight();
		}
		var dist = this.filterMousePosition(event, currentPointer);
		if (this.simulateFlick && !this.moved) {
			if (Math.abs(dist.x) < this.kFilterDistance && Math.abs(dist.y) < this.kFilterDistance) {
				this.maybeStopEvent(event);
				return;
			}
		}
		filteredDist = Mojo.Gesture.calculateAbsDistance(this.originalPointer, event.filteredPointer);
		if(this.simulateFlick) {
			this.calculateVelocity(event, currentPointer);			
		}
		if (!this.moved) {
			mojoEvent = Mojo.Event.send(this.downTarget, Mojo.Event.dragStart, {distance: dist, filteredDistance: filteredDist, down: this.downEvent, move: event});
			this.dragSentButNotHandled = !mojoEvent.defaultPrevented;
			this.handleFirstMove();
		}
		
		mojoEvent = Mojo.Event.send(this.downTarget, Mojo.Event.dragging, {distance: dist, down: this.downEvent, move: event});
		this.maybeStopEvent(event);
	},
	
	/**
	 * @private
	 */
	clearSelected: function(force) {
		var downHighlightMode;
		var highlightedElement = this.highlightedElement || Mojo.Gesture.highlightTarget;
		if (highlightedElement) {
			downHighlightMode = highlightedElement.getAttribute(Mojo.Gesture.selectionHighlightFeedbackAttribute);
			if (downHighlightMode) {
				this.downHighlightVersion = Mojo.Gesture._newSelectionFeedback;
				downHighlightMode = highlightedElement.getAttribute(Mojo.Gesture.selectionHighlightFeedbackAttribute);
				if (force || (downHighlightMode !== Mojo.Gesture.immediatePersistentFeedback &&  
						downHighlightMode !== Mojo.Gesture.delayedPersistentFeedback)) {
					highlightedElement.removeClassName(Mojo.Gesture.kSelectedClassName);
				}
				delete this.highlightedElement;
				delete this.highlightTargetTime;
				delete Mojo.Gesture.highlightTarget;
				delete Mojo.Gesture.highlightTargetTime;
			} else {
				downHighlightMode = highlightedElement.getAttribute(Mojo.Gesture.selectionHighlightAttribute);
				this.downHighlightVersion = Mojo.Gesture._oldSelectionFeedback;
				if (force || downHighlightMode !== Mojo.Gesture.persistentSelection) {
					highlightedElement.removeClassName(Mojo.Gesture.kSelectedClassName);
				}
				delete this.highlightedElement;
				delete this.highlightTargetTime;
				delete Mojo.Gesture.highlightTarget;
				delete Mojo.Gesture.highlightTargetTime;
			}
		}
	},
	
	/**
	 * @private
	 */
	clearSelectedDelayed: function() {
		var win;
		if (this.downMode === Mojo.Gesture.spontaneousFeedback) {
			win = Mojo.Gesture.windowForEvent(this.downEvent);
			if (win) {
				win.setTimeout(this.clearSelected, 100); //THIS IS THE NUMBER TO CHANGE
				return;
			}
		}
		//if we couldn't get the window, just fall through to this
		this.clearSelected.delay(0.2);
	},
	
	
	/**
	 * @private
	 */
	makeFocusedWidgetSendChanges: function(focusedElement, triggeringEvent) {
		var widgetController, widgetAssistant, sendChangesFunction;
		var enclosingWidget = Mojo.View.findParentByAttribute(focusedElement, focusedElement.ownerDocument, "x-mojo-element");
		if (enclosingWidget) {
			widgetController = enclosingWidget._mojoController;
			if (widgetController) {
				widgetAssistant = widgetController.assistant;
				if (widgetAssistant && widgetAssistant.sendChanges) {
					widgetAssistant.sendChanges(triggeringEvent);
				}
			}
		}
	},
	
	/**
	 * @private
	 */
	sendTap: function(triggeringEvent) {
		var tapEvent, focusedElement;
		focusedElement = Mojo.View.getFocusedElement(this.downTarget.ownerDocument.body);
		if (focusedElement) {
			this.makeFocusedWidgetSendChanges(focusedElement, triggeringEvent);
		}
		tapEvent = Mojo.Event.send(this.downTarget, Mojo.Event.tap, {down: this.downEvent, count: this.downEvent.detail, up: triggeringEvent});
		if (!tapEvent.defaultPrevented && Mojo.View.isTextField(this.downTarget)) {
			Mojo.Gesture.simulateClick(this.downTarget, this.downEvent.pageX, this.downEvent.pageY);
		}
	},
	
	/**
	 * @private
	 */
	simulateMouseDown: function(screenX, screenY) {
		if (!PalmSystem.simulated) {
			Mojo.Gesture.withMouseEventHandlingDisabled(function() {
				PalmSystem.simulateMouseClick(screenX, screenY, true);
			});
		}
	},
	
	notDraggingAndInSameTarget: function(uiEvent) {
		var downHighlightTarget, upHighlightTarget;
		if (this.dragSentButNotHandled) {
			downHighlightTarget = Mojo.View.findParentByAttribute(this.downTarget, this.document, Mojo.Gesture.selectionHighlightFeedbackAttribute);
			if (downHighlightTarget || this.downHighlightVersion === Mojo.Gesture._newSelectionFeedback) {
				upHighlightTarget = Mojo.View.findParentByAttribute(uiEvent.target, this.document, Mojo.Gesture.selectionHighlightFeedbackAttribute) || uiEvent.target;
			} else {
				downHighlightTarget = Mojo.View.findParentByAttribute(this.downTarget, this.document, Mojo.Gesture.selectionHighlightAttribute) || this.downTarget;
				upHighlightTarget = Mojo.View.findParentByAttribute(uiEvent.target, this.document, Mojo.Gesture.selectionHighlightAttribute) || uiEvent.target;
			}
			if(downHighlightTarget === upHighlightTarget) {
				return true;
			}
		}
		return false;
	},
	
	/**
	 * @private
	 */
	finish: function(event) {
		var mojoEvent, sendFlick, currentPointer;
		this.stopSelectTimer();
		this.clearSelectedDelayed();
		window.clearTimeout(this.holdTimer);
		
		if (!event) {
			return;
		}

		currentPointer = Event.pointer(event);
		sendFlick = this.sendFlick;
		if (!sendFlick && this.simulateFlick) {
			sendFlick = Math.abs(this.velocity.x) > this.kFlickThreshold || Math.abs(this.velocity.y) > this.kFlickThreshold;
		}
		
		if (sendFlick) {
			mojoEvent = Mojo.Event.send(this.downTarget, Mojo.Event.flick, {velocity: this.velocity, shiftKey: event.shiftKey});
			this.dragSentButNotHandled = this.dragSentButNotHandled && !mojoEvent.defaultPrevented;
		}

		if (this.moved) {
			if (this.notDraggingAndInSameTarget(event)) {
				this.sendTap(event);
				return;
			}
			mojoEvent = Mojo.Event.send(this.downTarget, Mojo.Event.dragEnd, {down: this.downEvent, up: event});
		} else {
			if (this.holdTimerFired) {
				mojoEvent = Mojo.Event.send(this.downTarget, Mojo.Event.holdEnd, {down: this.downEvent, up: event});
				if(!mojoEvent.defaultPrevented && !this.held && !this.preventTap && currentPointer.y >= 0) {
					this.sendTap(event);
				}
			} else {
				// negative currentPointer.y is the way that hidd tells us to cancel a touch
				if (!this.preventTap && currentPointer.y >= 0) {
					if (!this.highlightedElement) {
						var highlightTarget = this.applySelectHighlight(this.downTarget);
						if (highlightTarget) {
							// wait 200ms to clear the highlight feedback
							this.clearSelectedDelayed();
						}
					}
					
					// Taps must always be sent immediately, so that we do not leave a "window" 
					// where a scene might receive additional tap events after pushing a new scene.
					// This problem causes apps to unintentinally push child scenes multiple times.
					this.sendTap(event);
				}
			}
		}
	},
	
	/** @private */
	mouseUp: function(event) {
		if (this.userModify) {
			return;
		}

		if (Mojo.Gesture.eventList) {
		 	Mojo.Gesture.eventList.push(event);
		}
		var currentPointer = Event.pointer(event);
		this.filterMousePosition(event, currentPointer);
		this.finish(event);
		this.maybeStopEvent(event);
	},
	
	/**
	 * @private
	 */
	dispatchGesture: function(gestureType, gestureProperties) {
		var mojoEvent;
		if (gestureType == Mojo.Gesture.gestureTypeFlick) {
			if (Mojo.Gesture.eventList) {
				Mojo.Gesture.eventList.push({type: Mojo.Gesture.gestureTypeFlick, timestamp: new Date()});
			}
			this.sendFlick = true;
			this.velocity = {x: gestureProperties.xVel, y: gestureProperties.yVel};
		} 
	}
});

/** @private */
Mojo.Gesture.Select = Class.create({
	/** @private */
	initialize: function(target, event) {
		Mojo.Log.warn("WARNING: Mojo.Gesture.Select has been deprecated. Use Mojo.View.applySelectionAttribute.");
	}
});

/** @private */
Mojo.Gesture.Text = Class.create({
	/** @private */
	initialize: function(target, event) {
		Mojo.Log.warn("WARNING: Mojo.Gesture.Text has been deprecated, not that you had any reason to be using it earlier.");
	}
	
});

Mojo.Log.addLoggingMethodsToClass(Mojo.Gesture.Recognizer);

		

/**
 * @private
 */
Mojo.Gesture._dispatchNonMouseGesture = function(gestureType, gestureProperties) {
	var mojoEvent;
	var stageController;
	var newEv;
	
	switch(gestureType) {
		case Mojo.Gesture.gestureTypeForward:
			newEv = Mojo.Event.make(Mojo.Event.forward, {});
			break;
		case Mojo.Gesture.gestureTypeUp:
			newEv = Mojo.Event.make(Mojo.Event.up, {});
			break;
		case Mojo.Gesture.gestureTypeDown:
			newEv = Mojo.Event.make(Mojo.Event.down, {});
			break;
		default:
			Mojo.Log.warn("No gesture to handle native gesture : " + gestureType);
			return;
	}
	stageController = Mojo.Controller.appController.getActiveStageController();
	if(stageController) {
		stageController.sendEventToCommanders(newEv);
	} else {
		Mojo.Log.warn("No stage controller for dispatching non-mouse gesture.");
	}
};

/**
* @private
 */
Mojo.doHandleGesture = function(targetWindow, gestureType, gestureProperties) {
	var currentGesture = Mojo.Gesture.gestureForWindow(targetWindow);
	
	if (currentGesture) {
		currentGesture.dispatchGesture(gestureType, gestureProperties);
	} else {
		Mojo.Gesture._dispatchNonMouseGesture(gestureType, gestureProperties);
	}
};

/**
* @private
 */
Mojo.handleGesture = function(gestureType, gestureProperties) {
	Mojo.doHandleGesture(window, gestureType, gestureProperties);
};

/**
* @private
 */
Mojo.handleSingleTapForDocument = function(targetDocument, details) {
	Mojo.Event.send(targetDocument, Mojo.Event.singleTap, details);
};

/**
* @private
* This can go away when we remove support for heavyweight stages.
 */
Mojo.handleSingleTap = function(details) {
	Mojo.handleSingleTapForDocument(document, details);
};

Mojo.Gesture.kSelectedClassName = 'selected';

Mojo.Gesture.NonScrollingHighlight = function NonScrollingHighlight (targetElement) {
	this.targetElement = targetElement;
	this.targetDocument = targetElement.ownerDocument;
	
	this.downHighlightMode = targetElement.getAttribute(Mojo.Gesture.selectionHighlightFeedbackAttribute);
	if (Mojo.Gesture.selectionHighlightFeedbackAttribute)  {
		this.downHighlightVersion = Mojo.Gesture._newSelectionFeedback;
		this.downHighlightMode = targetElement.getAttribute(Mojo.Gesture.selectionHighlightFeedbackAttribute);
		this.mouseOver = this.mouseOver.bindAsEventListener(this);
		this.mouseUp = this.mouseUp.bindAsEventListener(this);
		Mojo.Event.listen(this.targetDocument, 'mouseover', this.mouseOver);
		Mojo.Event.listen(this.targetDocument, 'mouseup', this.mouseUp);
	} else {
		this.downHighlightMode = targetElement.getAttribute(Mojo.Gesture.selectionHighlightAttribute);
		this.downHighlightVersion = Mojo.Gesture._oldSelectionFeedback;
		this.mouseOver = this.mouseOver.bindAsEventListener(this);
		this.mouseUp = this.mouseUp.bindAsEventListener(this);
		Mojo.Event.listen(this.targetDocument, 'mouseover', this.mouseOver);
		Mojo.Event.listen(this.targetDocument, 'mouseup', this.mouseUp);
	}
};

Mojo.Gesture.NonScrollingHighlight.prototype.mouseOver = function mouseOver (mouseEvent) {
	var target = mouseEvent.target;
	if (target === this.targetElement || mouseEvent.target.descendantOf(this.targetElement)) {
		if (!Mojo.Gesture._isFeedbackDisabled(this.targetElement)) {
			this.targetElement.addClassName(Mojo.Gesture.kSelectedClassName);
		}
	} else {
		this.targetElement.removeClassName(Mojo.Gesture.kSelectedClassName);
	}
};

Mojo.Gesture.NonScrollingHighlight.prototype.mouseUp = function mouseUp (mouseEvent) {
	var f;
	var targetElement = this.targetElement;
	var targetDocument = this.targetDocument;
	this.targetElement = null;
	this.targetDocument = null;
	
	if (this.downHighlightVersion === Mojo.Gesture._newSelectionFeedback) {
		if (this.downHighlightMode !== Mojo.Gesture.immediatePersistentFeedback && 
			this.downHighlightMode !== Mojo.Gesture.delayedPersistentFeedback) {
			f = function() {
				targetElement.removeClassName(Mojo.Gesture.kSelectedClassName);		
			};
			f.defer();		
		}
		Mojo.Event.stopListening(targetDocument, 'mouseover', this.mouseOver);
		Mojo.Event.stopListening(targetDocument, 'mouseup', this.mouseUp);
	} else {
		if (this.downHighlightMode !== Mojo.Gesture.persistentSelection) {
		f = function() {
			targetElement.removeClassName(Mojo.Gesture.kSelectedClassName);		
			};
			f.defer();		
		}
		Mojo.Event.stopListening(targetDocument, 'mouseover', this.mouseOver);
		Mojo.Event.stopListening(targetDocument, 'mouseup', this.mouseUp);
	}
};
