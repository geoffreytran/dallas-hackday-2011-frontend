/**
 * @name event.js
 * @fileOverview This file has functions related to documenting the Ui Toolkit Events; 
 * See {@link Mojo.Event} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * @description Holds functionality related to the UI Toolkit Events.
 * @namespace 
 * @name Mojo.Event
 */
Mojo.Event = {};


/**
 * 
 * Utility routine used to create custom mojo events.
 *
 * In addition to creating an event with the given name, the event is also 
 * extended such that a isDefaultPrevented() method is available.  
 * 
 * @returns {Object} This will return 'true' if any handler calls event.preventDefault().
 *
 * @param name{string} is the name of the event, visible in event.type.
 * @param details {string} is a hash of custom event properties to be copied to the event object.
 * @param optionalDocument {HTML element} is a supplied element to target the event on; if not supplied, defaults to current active document
 * @param optionalBubbles {Boolean} flag determining if the event's propogation behavior is to bubble; default is true 
 * @param optionaCancel {Boolean} flag determining if the event's default action may be prevented via the preventDefault( ) method; default is true
*/

Mojo.Event.make = function(name, details, optionalDocument, optionalBubbles, optionalCancel) {
	/**
	 * @lends Mojo.Event.make
	 */
	/**
	 * newEvent is used to create new custom Palm specific HTML events
	 * @name newEvent
	 * @memberOf Mojo.Event
	 * @private
	 */
	var bubbles = (optionalBubbles !== undefined) ? optionalBubbles : true;
	var cancel = (optionalCancel !== undefined) ? optionalCancel : true;
	
	var targetDocument = optionalDocument || document;
 	var newEvent = targetDocument.createEvent("HTMLEvents");
	newEvent.initEvent(name, bubbles, cancel);
	Object.extend(newEvent, details);
	
	
	var oldPreventDefault = newEvent.preventDefault;

/**
 * @function
 * @description HACK: This implements the DOM level 3 'defaultPrevented' property for mojo events.
 */  
	newEvent.preventDefault = function() {oldPreventDefault.call(this);this.defaultPrevented=true;};
	//newEvent.isDefaultPrevented = function() {return Boolean(this._mojoDefaultPrevented);};


	/**
	 * @private
	 */
 	var oldStopProp = newEvent.stopPropagation;
/**
 * @function
 * @description HACK: This implements something like the DOM level 3 stuff for 'defaultPrevented', 
 * but for stopPropagation() instead.
 * 
 */  
	newEvent.stopPropagation = function() {
		oldStopProp.call(this);
		this._mojoPropagationStopped=true;
	};

	return newEvent;
};

Mojo.Event._logEvent = function _logEvent(prefix, event, targetElement, mojoDetails) {
	if (Mojo.Event.logEvents) {
		var detailsString = "";
		if (mojoDetails) {
			detailsString = "and details " + Mojo.Log.propertiesAsString(mojoDetails);
		}
		Mojo.Log.info("%s event '%s' targeting element '%s#%s' %s", prefix,
			      event.type, targetElement.tagName, targetElement.id || "<no id>", detailsString);
	}
};

/**
 * Like prototype's [element.fire()](http://prototypejs.org/api/element/fire),
 * except that the event type is actually
 * as specified (instead of always `dataavailable`),  and the specified details are
 * placed in the event object directly (instead of a `memo` subobject).
 * If `element` is undefined, the new event will just be returned and not actually dispatched.
 * @param element HTML element to dispatch the event on.
 * @param name{string} is the name of the event, visible in event.type.
 * @param mojoDetails {string} is a hash of custom event properties to be copied to the event object.
 * @param optionalBubbles {Boolean} flag determining if the event's propogation behavior is to bubble; default is true 
 * @param optionaCancel {Boolean} flag determining if the event's default action may be prevented via the preventDefault( ) method; default is true
 *
*/
Mojo.Event.send = function(element, name, mojoDetails, optionalBubbles, optionalCancel) {
	var newEvent = Mojo.Event.make(name, mojoDetails, element.ownerDocument, optionalBubbles, optionalCancel);
	if(element) {
		Mojo.Event._logEvent("sending", newEvent, element, mojoDetails);
		element.dispatchEvent(newEvent);
	}
	return newEvent;
};


Mojo.Event.sendPropertyChangeEvent = function(element, model, property, value, oldValue, originalEvent) {
	Mojo.Event.send(element, Mojo.Event.propertyChange, {model:model, 
														property:property, 
														value:value, 
														oldValue: oldValue, 
														originalEvent: originalEvent});
};

/**
 * Function to create and send a key event.
 * 
 * @param keyDescription {String} key description for key, like "U+0009" for tab.
 * @param optionalEventType {String} event type, defaults to 'keydown'.
 * @param optionalDocument {HTML element} is a supplied element to target the event on; if not supplied, defaults to current active document
 *
*/
Mojo.Event.sendKeyEvent = function sendKeyEvent(keyDescription, optionalEventType, optionalDocument) {
	var targetDocument = optionalDocument || document;
	var eventType = optionalEventType || 'keydown';
	var e = targetDocument.createEvent("KeyboardEvent");
	e.initKeyboardEvent(eventType, true, true, window, keyDescription, 0, false, false, false, false);
	targetDocument.dispatchEvent(e);
};

/**
 * Function to create and send a key down and up event.
 * 
 * @param keyDescription key description for key, like "U+0009" for tab.
 * @param optionalDocument {HTML element} is a supplied element to target the event on; if not supplied, defaults to current active document
*/
Mojo.Event.sendKeyDownAndUpEvents = function sendKeyEvent(keyDescription, optionalDocument) {
	Mojo.Event.sendKeyEvent(keyDescription, 'keydown', optionalDocument);
	Mojo.Event.sendKeyEvent.defer(keyDescription, 'keyup', optionalDocument);
};


/**
 * This function can be used to listen for some kind of 'hold' event on a given node.
 * This works by initiating a 'hold timer' when the appropriate 'down' event is received,
 * and cancelling it if we see the 'up' event before it has expired.  If the timer expires,
 * then we call the given handler function with the initial 'down' event as the first argument.  
 * 
 * A 'listener object' is returned which implements
 * a stopListening() method.  This can be called permanently cancel the listener, removing its
 * event listeners.  Alternatively, if the handler function returns true, then the listener 
 * will be automatically stopped.
 * 
 * The implementation is somewhat tailored for key events:
 * * Successive 'down' events do not reset the hold timer.
 * * After calling the handler once, it will not be called again until after an 'up' event is received.
 * 
 * @param node - the node on which to listen for events.
 * @param downEvent - String, the type of event that should initiate the hold timer.
 * @param upEvent - String, the type of event that should cancel the hold timer.
 * @param handler - Function to be called when the hold timer expires.
 * @param timeout - Length of hold timer in seconds. Optional, defaults to 1.
*/
Mojo.Event.listenForHoldEvent = function(node, downEvent, upEvent, handler, timeout) {
	return new Mojo.Event._HoldEventListener(node, downEvent, upEvent, handler, timeout);
};

/**
 * This function can be used to listen for changes in the focused element inside the 
 * node.  
 * 
 * A 'listener object' is returned which implements
 * a stopListening() method.  This can be called permanently cancel the listener, removing its
 * event listeners.
 * @param node - the node on which to listen for events.
 * @param handler - Function to be called when focus changes, passing the newly focused element or null.
 */

Mojo.Event.listenForFocusChanges = function listenForFocusChanges(node, handler) {
	return new Mojo.Event._FocusListener(node, handler);
};

/**
 * A wrapper around addEventListener that adds some parameter checking.
 * 
 * @param target target to observe
 * @param type{string} type of the event to observe
 * @param handlerFunction {Function} function to call when the event fires
 * @param useCapture {Boolean} optional parameter that when true causes the event to be observed during the capture phase.
*/

Mojo.Event.listen = function listen (target, type, handlerFunction, useCapture) {
	Mojo.requireDefined(target, "Mojo.Event.listen: 'target' parameter must be defined.");
	Mojo.requireString(type, "Mojo.Event.listen: 'type' parameter must be a string.");
	Mojo.requireFunction(handlerFunction, "Mojo.Event.listen: 'handlerFunction' parameter must be a function.");
	target.addEventListener(type, handlerFunction, !!useCapture);
};

Mojo.listen = Mojo.Event.listen;

/**
 * A wrapper around removeEventListener that adds some parameter checking.
 * 
 * @param target target to observe.
 * @param type{string} type of the event that was being observed.
 * @param handlerFunction {Function} function that was previously passed to listen.
 * @param useCapture {Boolean} optional parameter that when true causes a capture phase listener to be removed.
*/
Mojo.Event.stopListening = function stopListening (target, type, handlerFunction, useCapture) {
	Mojo.requireDefined(target, "Mojo.Event.stopListening: 'target' parameter must be defined.");
	Mojo.requireString(type, "Mojo.Event.stopListening: 'type' parameter must be a string.");
	Mojo.requireFunction(handlerFunction, "Mojo.Event.stopListening: 'handlerFunction' parameter must be a function.");
	target.removeEventListener(type, handlerFunction, !!useCapture);
};

Mojo.stopListening = Mojo.Event.stopListening;


/**
 * @constant 
 * @description Sent when the draggable element on the Slider is picked up to be dragged.
 * 
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.Slider}
 * - {@link Mojo.Widget.ProgressSlider}
 */
Mojo.Event.sliderDragStart = 'mojo-slider-dragstart';

/**
 * @constant 
 * @description Sent when the draggable element on the Slider is dropped.
 * 
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.Slider}
 * - {@link Mojo.Widget.ProgressSlider}
 */
Mojo.Event.sliderDragEnd = 'mojo-slider-dragend';


/**
 * @private
 * @constant 
 * @description scrolled means...
 */
Mojo.Event.scrolled = 'mojo-scrolled';

/**
 * @constant 
 * @description When contained in a scroller, down action followed by movement generates a scroll-starting event. 
 * 
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.Scroller}
 */
Mojo.Event.scrollStarting = 'mojo-scroll-starting';

/**
 * @constant 
 * @description A down movement lasting greater than a system-defined time interval and with movement within a limited radius generates a hold event.
 * The hold event is associated with the Mojo.Event.hold event.
 * 
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.hold = 'mojo-hold';

/**
 * @constant 
 * @description An up movement following a hold event generates a Mojo.Event.holdEnd event. 
 * 
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.holdEnd = 'mojo-hold-end';

/**
 * @constant 
 * @description A down-and-up movement within a limited time interval and within a limited radius generates a tap event. 
 * 
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.tap = 'mojo-tap';

/**
 * @constant 
 * @description A native down-and-up movement within a limited time interval and within a limited radius generates a single tap event. 
 * 
 *
 * It's sent when Mojo.handleSingleTap is called and has the following properties:
 * x, y, shiftKey, ctrlKey, altKey, metaKey, timestamp.
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.singleTap = 'mojo-single-tap';



/**
 * @constant 
 * @description Forwarded keyup event. Only supported on the currently active sceneElement or container.
 * 
 *
 * Custom Event Fields
 *
 * - originalEvent: keyboard event that triggered this event.
 * 
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.keyup = 'mojo-keyup';

/**
 * @constant 
 * @description Forwarded keydown event. Only supported on the currently active sceneElement or container. 
 * 
 *
 * Custom Event Fields
 *
 * - originalEvent: keyboard event that triggered this event.
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.keydown = 'mojo-keydown';

/**
 * @constant 
 * @description Forwarded keydown event. Only supported on the currently active sceneElement or container. 
 * 
 * Custom Event Fields
 *
 * - originalEvent: keyboard event that triggered this event.
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.keypress = 'mojo-keypress';

/**
 * @constant 
 * @description This event is sent through the active commander chain when a 
 * back gesture is recognized (or the back key is pressed on the desktop).
 *  
 * It's currently generated by the stage assistant, which also responds to it
 * in `handleCommand()`. If no other clients handle the event, then the stage 
 * assistant will do so by closing the current dialog or popping the current 
 * scene. 
 *
 *
 * Custom Event Fields
 *
 * - originalEvent: The original click Event object which caused this event to be dispatched. Useful for disambiguating changes if the list items contain multiple input fields.
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.back = 'mojo-back';

/**
 * @constant 
 * @description This event is sent through the active commander chain when a 
 * forward gesture is recognized
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.forward = 'mojo-forward';

/**
 * @private
 * @constant 
 * @description This event is sent through the active commander chain when an 
 * up gesture is recognized
 *
 * Supported Widgets
 *
 * - None.
 * @since 1.2
 */
Mojo.Event.up = 'mojo-up';

/**
 * @private
 * @constant 
 * @description This event is sent through the active commander chain when a down
 * gesture is recognized
 *
 * Supported Widgets
 *
 * - None.
 * @since 1.2
 */
Mojo.Event.down = 'mojo-down';

/**
 * @constant 
 * @description A command event is generated when a menu item is selected. 
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.command = 'mojo-command';

/**
 * @constant 
 * @description Menuitems that specify `checkEnabled:true` in the menu model 
 * cause the menu system to check their enable state before displaying them. 
 * This is useful for items in submenus and the appmenu, because they are not
 * constantly displayed (like items in the command & view menus), meaning their
 * enable state always appears correct when the menu is popped up.  
 * The command-enabled event is generated as part of menu updating.  
 * To check the enable state of a menuitem, a command-enable event is sent 
 * through the commander chain.  This event does not go through the DOM.  
 * If nothing in the commander chain calls preventDefault() on the event, 
 * the menuitem will be enabled.
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.commandEnable = 'mojo-command-enable';

/**
 * @constant 
 * @description A down action followed by movement outsided of a system-defined radius generates a `Mojo.Event.dragStart` event.
 * Usually, the `Mojo.Event.dragStart` event is handled by the scroller.  However, any element that chooses to handle this event gets
 * all subsequent drag events.
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.dragStart = 'mojo-drag-start';

/**
 * @constant 
 * @description Movement following the {@link Mojo.Event.dragStart} event generates dragging events. 
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.dragging = 'mojo-dragging';

/**
 * @constant 
 * @description An up action following a {@link Mojo.Event.dragStart} event generates a `dragEnd` event. 
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.dragEnd = 'mojo-drag-end';

/**
 * @constant 
 * @description This event is dispatched to the widget element when a
 * list item is clicked. As with `Mojo.Event.listTap`, the app handler is 
 * responsible for sorting out which part of the list item changed if 
 * there are multiple options, and `event.originalEvent.target` should 
 * be the input element which changed.
 * 
 *
 * Custom Event Fields
 *
 *  - object: The object from the `listItems` array in the model associated with the changed list item.
 *  - model: The model object used to render the List.
 *  - originalEvent: The original change Event object which caused this event to be dispatched. Useful for disambiguating changes if the list items contain multiple input fields.
 * 
 *
 * Supported Widgets
 *
 *  - {@link Mojo.Widget.List}
 */
Mojo.Event.listChange = 'mojo-list-change';

/**
 * @constant 
 * @description This event is dispatched to the widget element when there
 * is a `mojo-tap` event on a list item. The app handler is responsible 
 * for sorting out which part of the list item was clicked if necessary,
 * since that depends entirely on the template provided. It's useful
 * to look at `event.originalEvent.target`. This is the target of the
 * original click or change event that caused the higher level mojo
 * event to be dispatched. It will be an input element containing
 * the new value for a change event, or the item's sub-element 
 * that was actually clicked for a click event.
 * For example:
 *
 *		listClickHandler: function(event) {
 *			  // Only respond to clicks on the label element, not the editable text field.
 *			  if(event.originalEvent.target.tagName == "LABEL")
 *			    Mojo.Log.info(event.item.data +": "+event.item.definition);
 *			}
 * 
 *
 * Custom Event Fields
 *
 * - item: The object from the listItems array in the model associated with the clicked list item.
 * - model: The model object used to render the List.
 * - originalEvent: The original click Event object which caused this event to be dispatched. Useful for disambiguating clicks if the list items contain multiple clickable elements.
 * 
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.List}
 */
Mojo.Event.listTap = 'mojo-list-tap';

/**
 * @constant 
 * @description This event is dispatched to the widget element when there 
 * the special "Add" item at the end of the list is clicked. This item appears
 * when the `addItemLabel` property is defined in the widget's attributes or 
 * model, and a custom event name is used to give applications an easy way to
 * identify the expected behavior. 
 * 
 *
 * Custom Event Fields
 *
 * - model: The model object used to render the List to which an item should be added.
 * - originalEvent: The original click Event object which caused this event to be dispatched. Useful for disambiguating changes if the list items contain multiple input fields.
 * - item: The item model to be added.  Only defined for listAdd events resulting from a drag/drop from a different list.
 * - index: The index at which to add the new item.  Only defined for listAdd events resulting from a drag/drop from a different list.
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.List}
 */
Mojo.Event.listAdd = 'mojo-list-add';

/**
 * @constant 
 * @description This event is dispatched to the widget element when an item is
 * deleted from the list. SceneAssistants will often listen for this event on 
 * List widgets, and should respond by deleting the given item from the model 
 * (and database, if any). If `preventDefault()` is called on the `listDelete` 
 * event, then the default deletion behavior in the list widget will not occur. 
 * 
 *
 * Custom Event Fields
 *
 * - model: The widget's model object.
 * - item: The model object for the list item being deleted.
 * - index: The index of the list item being deleted.
 * 
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.List}
 */
Mojo.Event.listDelete = 'mojo-list-delete';

/**
 * @constant 
 * @description This event is dispatched to the widget element when an item is
 * reordered. SceneAssistants will often listen for this event on List widgets,
 *  and should respond by reordering the given item model as indicated (and 
 *  persist the changes to disk if appropriate).
 *  
 *
 *  Custom Event Fields
 *
 * - model: The widget's model object.
 * - item: The model object for the list item being moved.
 * - fromIndex: The current index of the list item, which it should be moved from.
 * - toIndex: The new index of the list item, which it should be moved to.
 * 
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.List}
 */
Mojo.Event.listReorder = 'mojo-list-reorder';

/**
 * @constant 
 * @description This event is dispatched to the widget element when 
 * property-editing widgets change values.
 * 
 *
 * Custom Event Fields
 *
 * - property: Name of the property that changed.
 * - value: New value of the property.
 * - model: The model object to which the property change applies.
 * Sometimes available:
 * - oldValue: value of the widget before this change.
 * - originalEvent: event that triggered the propertyChange event to be sent.
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.ListSelector}
 * - {@link Mojo.Widget.PasswordField}
 * - {@link Mojo.Widget.RadioButton}
 * - {@link Mojo.Widget.Scroller}
 * - {@link Mojo.Widget.Slider}
 * - {@link Mojo.Widget.TextField}
 * - {@link Mojo.Widget.ToggleButton}
 */
Mojo.Event.propertyChange = 'mojo-property-change';

/**
 * @private
 * @constant 
 * @description revealBottom means... 
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.revealBottom = 'mojo-reveal-bottom';


/**
 * @constant 
 * @description Generated before a scene is displayed.  Allows widgets or scenes to delay the scene transition if needed.
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.aboutToActivate = 'mojo-about-to-activate';


/**
 * @constant 
 * @description An activate event is generated when a scene is loaded.
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.activate = 'mojo-event-activate';

/**
 * @constant 
 * @description A stageDeactivate event is generated when a stage is no longer active and potentially receiving the user's attention.
 * 				For card stages, this is when the stage is minimized.  
 * 				The event is sent to the top scene, and bubbles up to the stage's document.
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.stageDeactivate = 'mojo-window-deactivate';


/**
 * @constant 
 * @description A stageActivate event is generated when a stage becomes active and is potentially receiving the user's attention.
 * 				For card stages, this is when the stage is maximized and fills the screen.
 * 				The event is sent to the top scene, and bubbles up to the stage's document.
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.stageActivate = 'mojo-window-activate';

/**
 * @private
 * @constant 
 * @description A deactivate event is generated when a scene no longer has focus.  This event can be associated with the activate event. 
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.deactivate = 'mojo-event-deactivate';

/**
 * Triggered by the system on the main document when memory conditions change.  'data' has additional event info, including 'state',
 * a string indicating the new memory state ("low", "critical", "normal").
 */
Mojo.Event.lowMemory = 'mojo-lowmemory';


/**
 * @private
 * @constant 
 * @description TODO: add description
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.subtreeHidden = 'mojo-subtree-hidden';

/**@private */
Mojo.Event.subtreeShown = 'mojo-subtree-shown';

/**
 * @private
 * @constant 
 * @description TODO: add description
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.commitChanges = 'mojo-commit-changes';

/**
 * @constant 
 * @description Movement greater than a system-defined rate, between down and up events, generates a flick event.
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.flick = 'mojo-flick';

/**
 * @constant 
 * @description Entering data in the filterbox generates a filter event after a client of default specified delay. 
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.FilterField}
 */
Mojo.Event.filter = 'mojo-filterfield-filter';

/**
 * @constant 
 * @description Entering data in the filterbox generates a filter event as soon as a key is typed.
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.FilterField}
 */
Mojo.Event.filterImmediate = 'mojo-filterfield-filterimmediate';

/**
 * @private
 * @deprecated
 * @constant 
 * @description bigListSelected means... 
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WrappedBigList}
 */
Mojo.Event.bigListSelected = 'mojo-bigfilterlist-selected';

/**
 * @constant 
 * @private
 * @deprecated
 * @description The people-picker widget creates a filterable list of all available contacts on the device.
 * When a user selects one of the contacts, a `peoplePickerSelected` event is generated, including the id of the selected contact.
 * @deprecated This will be replaced by just listening for Mojo.Event.listTap on the people picker widget
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.peoplePickerSelected = 'mojo-peoplepicker-selected';

/**
 * @private
 * @constant 
 * @description comboBoxSearch means... 
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.comboBoxSearch = 'mojo-combobox-search';

/**
 * @private
 * @constant 
 * @description comboBoxSelected means... 
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.comboBoxSelected = 'mojo-combobox-selected';

/**
 * @private
 * @constant 
 * @description comboBoxEntered means... 
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.comboBoxEntered = 'mojo-combobox-entered';

/**
 * @private
 * @constant 
 * @description webViewLoadProgress means... 
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.webViewLoadProgress = 'mojo-webview-load-progress';

/**
 * @private
 * @constant 
 * @description This event is dispatched to any observer when the WebView
 * begins to load a new page. 
 * 
 *
 * Custom Event Fields: <em>none</em>.
 * 
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewLoadStarted = 'mojo-webview-load-started';

/**
 * @private
 * @constant 
 * @description This event is dispatched to any observer when the currently
 * loading page stops loading (successful or not). 
 * 
 *
 * Custom Event Fields: <em>none</em>.
 * 
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewLoadStopped = 'mojo-webview-load-stopped';

/**
 * @private
 * @constant
 * @description This event is dispatched to any observer when an attempt to
 * load a URL into the current page fails.
 * 
 * Custom Event Fields:
 * 
 * - domain: The requested URL's domain.
 * - errorCode: The failure error code.
 * - failingURL: The requested URL that failed to load.
 * - message: A localized message describing the failure.
 * 
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewLoadFailed = 'mojo-webview-load-failed';

/**
 * @private
 * @constant
 * @description Notifies observer that the webview entered the plugin spotlight mode, in which a scrim is drawn around the plugin rectangle.
 * 
 * Custom Event Fields: <em>none</em>
 * 
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewPluginSpotlightStart = 'mojo-webview-plugin-spotlight-start';

/**
 * @private
 * @constant
 * @description Notifies observer that the webview entered a plugin spotlight mode.
 * 
 * Custom Event Fields: <em>none</em>
 * 
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewPluginSpotlightEnd = 'mojo-webview-plugin-spotlight-end';

/**
 * @private
 * @constant
 * @description This event is dispatched to any observer when a URL has been
 *              redirected by this application.
 * 
 * Custom Event Fields:
 * 
 * - url: The URL being redirected.
 * - appId: The application ID to redirect the URL to.
 * 
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewUrlRedirect = 'mojo-webview-url-redirect';

/**
 * @private
 * @constant
 * @description The WebView's plugin has connected to the page render server.
 * 
 * Custom Event Fields: <em>none</em>.
 * 
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewServerConnect = 'mojo-webview-server-connect';

/**
 * @private
 * @constant
 * @description The WebView's plugin has disconnected from the page render server.
 * 
 * Custom Event Fields: <em>none</em>.
 * 
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewServerDisconnect = 'mojo-webview-server-disconnect';

/**
 * @private
 * @constant
 * @description This event is dispatched to any observer a main document error
 * occurs.
 * 
 * Custom Event Fields:
 * 
 * - domain: The requested URL's domain.
 * - errorCode: The failure error code.
 * - failingURL: The requested URL that failed to load.
 * - message: A localized message describing the failure.
 * 
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewSetMainDocumentError = 'mojo-webview-main-doc-error';

/**
 * @private
 * @constant
 * @description This event is dispatched to any observer when the currently loading
 * page completes.
 * 
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewDidFinishDocumentLoad = 'mojo-webview-did-finish-doc-load';

/**
 * @private
 * @constant 
 * @description webViewDownloadFinished means... 
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewDownloadFinished = 'mojo-webview-download-finished';

/**
 * @private
 * @constant
 * @description This event is dispatched to any observer when it is time to
 * update the global history.
 * 
 * Custom Event Fields:
 * 
 * - url: The URL of the web page that was displayed.
 * - reload: A truthy value if this was a page reload vs. initial display.
 * 
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewUpdateHistory = 'mojo-webview-update-history';


/**
 * @private
 * @constant 
 * @description webViewTitleUrlChanged means... 
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewTitleUrlChanged = 'mojo-webview-title-url-changed';

/**
 * @private
 * @constant 
 * @description webViewTitleChanged means... 
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewTitleChanged = 'mojo-webview-title-changed';

/**
 * @private
 * @constant 
 * @description webViewUrlChanged means... 
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewUrlChanged = 'mojo-webview-url-changed';

/**
 * @private
 * @constant 
 * @description webViewLinkClicked means... 
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewLinkClicked = 'mojo-webview-link-clicked';

/**
 * @private
 * @constant 
 * @description webViewActionData means... 
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.webViewActionData = 'mojo-webview-action-data';

/**
 * @private
 * @constant 
 * @description webViewPageSubmission means... 
 *
 *
 * Supported Widgets
 *
 * - None.
 */
Mojo.Event.webViewPageSubmission = 'mojo-webview-page-submission';

/**
 * @private
 * @constant 
 * @description webViewCreatePage means... 
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewCreatePage = 'mojo-webview-create-page';

/**
 * @private
 * @constant
 * @description webViewTapRejected is sent from a WebView widget when the
 * web page has not handled the tap sent to it. 
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewTapRejected = 'mojo-webview-tap-rejected';

/**
 * @private
 * @constant
 * @description webViewScrollAndScaleChanged is sent from a WebView widget when the
 * page scroll X&Y, offset, and/or zoom level changes. This event has the following
 * properties:
 * <ul>
 * <li>scrollX</li>
 * <li>scrollY</li>
 * <li>width</li>
 * <li>height</li>
 * <li>zoom</li>
 * </ul> 
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewScrollAndScaleChanged = 'mojo-webview-scroll-scale-changed';

/**
 * @private
 * @constant
 * @description Sent when something editable in the WebView's page is focused.
 * Typically an INPUT element.
 * properties:
 * <ul>
 * <li>focused</li>
 * </ul> 
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewEditorFocused = 'mojo-webview-editor-focused';

/**
 * @name widget_webview.js
 * @fileOverview TBD documentation;
 * See {@link Mojo.Widget.WebView} for more info.
 */

/**
 * @private
 * @constant 
 * @description This event is dispatched to any observer when the WebView
 * will not handle a resource for the main page. 
 *
 * Custom Event Fields:
 * 
 * - url: The resource URL that will not be loaded by the WebView.
 * - mimeType: The MIME type. May be "unknown" or an empty string.
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewMimeNotSupported = 'mojo-webview-mime-not-supported';

/**
 * @private
 * @constant 
 * @description This event is dispatched to any observer when the WebView
 * will not handle a given resource. 
 *
 * Custom Event Fields:
 * 
 * - url: The resource URL that will not be loaded by the WebView.
 * - mimeType: The MIME type. May be "unknown" or an empty string.
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewMimeHandoff = 'mojo-webview-mime-handoff';

/**
 * @private
 * @constant 
 * @description This event is dispatched to any observer a single tap
 *              occurs in the WebView widget and one of the modifier keys
 *              is down.
 *
 * Custom Event Fields:
 * 
 * - tap: The original tap event.
 * - urlInfo: Information about the URL that was tapped on (if one was tapped on)
 *     - success: true if there is a URL at the tap location, false if not.
 *     - url: The URL that was tapped.
 *     - desc: The URL description (inner text).
 *     - bounds: The bounding rectangle (left, top, right, bottom, width, height)
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewModifierTap = 'mojo-webview-modifier-tap';

/**
 * @constant 
 * @description Sent in response to saving inline images.
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.WebView}
 */
Mojo.Event.webViewImageSaved = 'mojo-webview-image-saved';

/**
 * @constant 
 * @description `imageViewChanged` sent from an ImageView widget when the
 * current center image has been changed via a gesture.
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.ImageView}
 */
Mojo.Event.imageViewChanged = 'mojo-imageview-changed';

/**
 * @description This event is dispatched to the widget element when 
 * property-editing widgets change values.
 *
 *
 * Supported Widgets
 *
 * - None.
 */
/** @deprecated */
/** @private */
Mojo.Event.propertyChanged = 'mojo-property-change'; 

/**
 * @constant 
 * @deprecated
 * @private
 * @description 
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.ProgressPill}
 */
Mojo.Event.cancel = 'mojo-progress-cancelled';

/**
 * @constant 
 * @description Sent when progress reaches 100%.
 *
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.ProgressPill}
 * - {@link Mojo.Widget.ProgressBar}
 */
Mojo.Event.progressComplete = 'mojo-progress-complete';

/**
 * @constant 
 * @description Sent when the icon on the ProgressPill is tapped by the user.
 *
 *
 * Custom Event Fields
 * - model: model associated with this progress pill.
 *
 * Supported Widgets
 *
 * - {@link Mojo.Widget.ProgressPill}
 * - {@link Mojo.Widget.ProgressBar}
 */
Mojo.Event.progressIconTap = "mojo-progress-icontapped";

//for the alt characters picker
/** @private */
Mojo.Event.renderAltCharacters = 'mojo-altchars';

/** @private */
Mojo.Event.renderChordedAltCharacters = 'mojo-altchars-chorded';

/**
	Sent by the scene controller on the scene element when the screen orientation changes.
	Contains an orientation property describing the orientation.
 */
Mojo.Event.orientationChange = 'mojo-orientation';

/** @private */
Mojo.Event.orientation = 'mojo-orientation';



/**
 * Addressing Widget
**/
/** @private */
Mojo.Event.addressingRecipientAdded = 'mojo-addressingwidget-added';
/** @private */
Mojo.Event.addressingRecipientDeleted = 'mojo-addressingwidget-deleted';

/** @private */
Mojo.Event._addressingWidgetBlur = 'mojo-addressingwidget-blur';

/**#nocode+*/

/** @private */
Mojo.Event._HoldEventListener = function(node, downEventName, upEventName, handler, timeout) {
	this._node = node;
	this._downEventName = downEventName;
	this._upEventName = upEventName;
	this._handler = handler;
	
	timeout = timeout || 1;
	this._timeout = Math.round(timeout * 1000); // convert to milliseconds
	
	// bind handlers:
	this._handleDown = this._handleDown.bindAsEventListener(this);
	this._handleUp = this._handleUp.bindAsEventListener(this);
	this._handleTimeout = this._handleTimeout.bind(this);
	
	// Listen for our down & up events:
	Mojo.Event.listen(node, downEventName, this._handleDown);
	Mojo.Event.listen(node, upEventName, this._handleUp);
};

/** @private */
Mojo.Event._HoldEventListener.prototype._handleDown = function(event) {
	// Initiate the hold timer if we don't already hane one running.
	if(this._timeoutID === undefined) {
		this._timeoutID = window.setTimeout(this._handleTimeout, this._timeout);
		this._savedDownEvent = event;
	}
	
};
/** @private */
Mojo.Event._HoldEventListener.prototype._handleUp = function(event) {
	// Cancel the hold timer -- we got an 'up'.
	if(this._timeoutID !== undefined) {
		window.clearTimeout(this._timeoutID);
		delete this._timeoutID;
	}
};
/** @private */
Mojo.Event._HoldEventListener.prototype._handleTimeout = function() {
	// Hold timer expired, call the handler and maybe 'stop' this watcher.
	if(this._handler(this._savedDownEvent) === true) {
		this.stopListening();
	}
};

// Cancels the watch for hold events, removing any event observers.
Mojo.Event._HoldEventListener.prototype.stopListening = function() {
	// clear any pending hold timer & remove event listeners.
	this._handleUp();
	Mojo.Event.stopListening(this._node, this._downEventName, this._handleDown);
	Mojo.Event.stopListening(this._node, this._upEventName, this._handleUp);
};

/** @private */
Mojo.Event._FocusListener = function _FocusListener(node, handler) {
	this._currentlyFocusedElement = null;
	this._node = node;
	this._handler = handler;
	this._focusHandler = this.focusChanged.bindAsEventListener(this);
	Mojo.Event.listen(node, 'DOMFocusIn', this._focusHandler);
	Mojo.Event.listen(node, 'DOMFocusOut', this._focusHandler);
};

/** @private */
Mojo.Event._FocusListener.prototype.stopListening = function stopListening() {
	Mojo.Event.stopListening(this._node, 'DOMFocusIn', this._focusHandler);
	Mojo.Event.stopListening(this._node, 'DOMFocusOut', this._focusHandler);
};

/** @private */
Mojo.Event._FocusListener.prototype.focusChanged = function focusChanged(focusEvent) {
	var targetElement = null;
	if (focusEvent.type === 'DOMFocusIn') {
		targetElement = focusEvent.target;
	}
	this._currentlyFocusedElement = targetElement;
	this._handler(targetElement);
};


/**#nocode-*/

