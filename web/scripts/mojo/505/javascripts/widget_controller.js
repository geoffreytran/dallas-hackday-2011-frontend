/**
 * @name widget_controller.js
 * @fileOverview This file defines the Widget Controller; See {@link Mojo.Controller.WidgetController} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/
/**
 * 	@private
	A WidgetController provides basic generic widget behavior for most widgets.
	They are created automatically when div elements are found in the DOM that specify the
	<code>'x-mojo-element'</code> attribute.  This attribute names the widget class that should 
	be used as the widget controller's assistant.<p>
	
	Widget controllers are generally not directly instantiated by apps.<p>
	
	The widget controller instantiates the widget assistant by class name, and sets 
	<code>assistant.controller</code> to be the widget controller.  This allows the assistant 
	to have access to various properties & methods of the widget controller.<p>
	
	The widget controller maintains the following properties in itself:<br/>
	attributes  - The attributes hash for the widget, shared with all widgets with this name.<br/>
	model       - The model hash for the widget, taken from the widget setup, or list items (if the widget is in a list).<br/>
	element     - The DOM element for this widget.<p> 
	
	Once the controller is properly initialized, and the assistant has been instantiated,
	the controller calls <code>assistant.setup()</code>.  This is where the assistant should use the 
	attributes & model data to build the actual widget content, and attach any needed 
	event listeners.<p>
	
	The controller also ensures that the assistant's handleModelChanged() method will be called 
	when a scene assistant calls sceneController.handleModelChanged() on the widget's model.<p>
	
	System event handling:
	The widget controller listens for subtreeShown and orientation events in the event that the widget assistant provides either a remeasure or event specific
	function.
	For subtreeShown, the widget assistant needs to provide a remeasure and/or subtreeShown method that accepts an event. This is called as a result of a widget 
	container being shown. If it exists, the widget's subtreeShown function will be called first, followed by remeasure, if it exists.
	For orientation, the widget assistant needs to provide a remeasure and/or orientationUpdate event that accepts an event. This is called as a result of the orientation
	of the screen changing. If it exists, the widget's orientationUpdate function will be called first, followed by remeasure, if it exists.
	
*/

Mojo.Controller.WidgetController = Class.create({

	/**********************************************************************
	 APIs intended for use by widget implementations.
	 **********************************************************************/
	
/**
 * @description Sets the model for this widget.
 * When setting a model, we first try to call the assistant's 'setModel' method.
 * If this is undefined, then we set the assistant's model property and call assistant.handleModelChanged(). 
 * The default model watch is removed before calling anything, and added again afterwards.
 * 
 */		
	/** @private */
	setModel: function setModel(newModel) {
		
		if(!this.assistant) 
			{return;}
		
		this.scene.removeWatcher(this.assistant, this.model);
		if(this.assistant.setModel) {
			this.assistant.setModel(newModel);
		} else {
			this.model = newModel;
			
			if(this.assistant.handleModelChanged) {
				this.assistant.handleModelChanged();
			}
		}
		
		this.scene.watchModel(this.model, this.assistant, this.assistant.handleModelChanged);
	},

/**
 * @description Utility function available for use by widget assistants.
	They should call this when they modify a model object, so anyone watching it will be notified.
	It simply calls modelChanged() on the scene controller with the appropriate arguments.
	'inModel' is optional, and should be the model object which was changed.  
	If unspecified, the model from the widget's setup will be used.
 */		
	modelChanged: function(inModel) {
	  var model = inModel || this.model;
		this.scene.modelChanged(model, this.assistant);
	},
	
/**
 * @description Removes this widget from the DOM.
 */		
	remove: function() {
		if(this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
	},
	
	
	reparent: function(newParent, beforeNode) {
		this.reparenting = true;
		this.remove();
		newParent.insertBefore(this.element, beforeNode || null);
		delete this.reparenting;
	},
	
	
/**
 * @description Convenience alias for the scene controller implementation.
 */
	instantiateChildWidgets: function instantiateChildWidgets(element, model) {
		element = element || this.element;
		this.scene.instantiateChildWidgets(element, model);
	},
	
/**
 * @description Convenience alias for the scene controller implementation.
 */
	cleanupChildWidgets : function(element) {
		Mojo.Log.warn("WARNING: WidgetController.cleanupChildWidgets() is no longer needed. Please stop calling it.");
	},
	
	/**
	 * Returns a named property from the model or attributes, checking the model first.
	 * @param {String} propertyName Name of the property to fetch
	 * @returns Value from the attributes or model, 
	 */
	
	valueFromModelOrAttributes: function(propertyName, defaultValue) {
		var value;
		if (this.model) {
			value = this.model[propertyName];
		}
		
		if (value === undefined && this.attributes) {
			value = this.attributes[propertyName];
			
		}
		if (value === undefined) {
			value = defaultValue;
		}
		return value;
	},
	
	/**
	* @description Convenience alias for the scene controller implementation.
	 */	
	get: function(elementId) {
		return this.scene.get(elementId);
	},
	
	/**
 	 * @description Convenience alias for the scene controller implementation.
	 */	
	select: function(selector) {
		return this.scene.select(selector);
	},
	
	/**
 	 * @description Convenience alias for the scene controller implementation.
	 */	
	listen: function(elementOrId, eventType, handlerFunction, onCapture) {
		return this.scene.listen(elementOrId, eventType, handlerFunction, onCapture);
	},
	
	
	/**
 	 * @description Convenience alias for the scene controller implementation.
	 */	
	stopListening: function(elementOrId, eventType, callback, onCapture) {
		return this.scene.stopListening(elementOrId, eventType, callback, onCapture);
	},
	
/**
 * @description Called by widget assistants to expose certain APIs to app developers via the DOM element.
 * The named functions are bound to the widget assistant, and installed in the 'palm' property of
 * the widget's DOM element (controller.element.mojo.*).
 * functionNames: Array of Strings that name the assistant functions to expose.
 */
	exposeMethods: function(functionNames) {

		// TODO: We could eliminate all this by simply setting this.element.mojo = this.assistant.
		// No binding or iteration per method, etc.  Less reliable encapsulation, though.
		
		// Add 'palm' namespace on DOM element if it's not present already.
		if(!this.element.mojo) {
			this.element.mojo = {};
		}
		
		// Bind functions to widget assistant, and set them in the element's 'palm' namespace/property.
		var that=this;
		functionNames.each(function(name) {
			var func = that.assistant[name];
			Mojo.assert(func, "WARNING: Could not find widget api '"+name+"'.");
			that.element.mojo[name] = func && func.bind(that.assistant);
		});
		
	},
	
	
	
	/**********************************************************************
	 These APIs are not intended for use by widget implementations.
	 **********************************************************************/
	
	// Called to initialize new WidgetControllers.
	// This is where we allocate the widget assistant, and set everything up.
	/** @private */
	initialize: function initialize(element, sceneController, model) {
		var timing = Mojo.Timing;
		var widgetTimingName;
		timing.resume('scene#widgetInitialize');
		var widgetClass;
		var Ctor;
		
		Mojo.assert(element.hasAttribute('x-mojo-element'), "WidgetController: Can't instantiate element without 'x-mojo-element' attribute.");
		Mojo.assert(element._mojoController === undefined, "WidgetController: element '"+element.id+"' already has a widget instantiated.");
		
		// Mojo.Log.info("Instantiating "+element.id+"/"+element.name+", model="+model);
		
		widgetClass = element.getAttribute('x-mojo-element');
		
		// Look up widget assistant constructor:
		Ctor = Mojo.Widget[widgetClass];
		
		// If widget constructor does not exist, try to load widget dynamically:
		if(Ctor === undefined) {
			timing.resume('scene#widgetLoad');
			Mojo.loadWidget(widgetClass);
			timing.pause('scene#widgetLoad');
			Ctor = Mojo.Widget[widgetClass];
		}
		
		Mojo.assert(Ctor !== undefined, "WidgetController: Cannot instantiate widget '"+widgetClass+"'." );
		if(Ctor === undefined) {
			return;    
		}
		
		// Find the widget setup.
		var setup = undefined;
		if(element.hasAttribute('id')) {
			this.widgetName = element.getAttribute('id');
			setup = sceneController.getWidgetSetup(this.widgetName);
		}
		if(setup === undefined && element.hasAttribute('name')) {
			this.widgetName = element.getAttribute('name');
			setup = sceneController.getWidgetSetup(this.widgetName);
		}
		
		// use model from widget setup if one was not provided by our caller.
		// This scheme allows lists to override the default model for a widget name,
		// so it can differ for widgets rendered in list items.
		if(model === undefined && setup !== undefined) { 
			model = setup.model;
			
			// If setWidgetModel() was called before the widget was instantiated, 
			// then we pick up the model from this property instead of the widget setup:
			if (element._mojoModel) {
				model = element._mojoModel;
				element._mojoModel = undefined;
			}
		}
		
		if (timing.enabled) {
			widgetTimingName = 'scene#' + widgetClass + '#widgetAssistantSetup';
		}
		
		// Set up standard widget controller properties:
		this.scene = sceneController;
		this.stageController = sceneController.stageController;
		this.window = this.stageController.window;
		this.document = this.window.document;
		this.model = model || {};
		this.element = element;
		this.attributes = (setup && setup.attributes) || {};
		
		timing.resume('scene#widgetAssistantConstructor');
		var widget = new Ctor();
		timing.pause('scene#widgetAssistantConstructor');
		this.assistant = widget;
		
		// Return harmlessly if we have no setup for the widget.
		if (this.assistant.setupOptional === undefined) {
			if(!(setup || model)) {
				Mojo.Log.warn("WidgetController: Could not instantiate widget '", this.widgetName, "', since it has not been set up.");
				timing.pause('scene#widgetInitialize');
				return;
			}
		}		
		
		
		element._mojoController = this;
		
		// Set controller before we call setup().
		widget.controller = this;
		
		// Watch for the widget node to be removed from the document, and then clean it up:
		this.cleanupHandler = this.cleanup.bindAsEventListener(this);
		this.element.addEventListener('DOMNodeRemovedFromDocument', this.cleanupHandler, false);
				
		// If the widget implements 'handleModelChanged', and we passed it a model, sign it up for model changes.
		// Note that for widgets rendered in a list context, this causes the widget to only be notified of 
		// changes to the list item's model object.
		// TODO: Remove legacy code... only subscribe if 'model', not 'this.model' since we set that to an empty hash (and don't need to subscribe in that case)
		if(this.model && widget.handleModelChanged) {
			sceneController.watchModel(this.model, widget, widget.handleModelChanged);
		}
		
		//always call remeasure
		//optionally call the other two handlers
		if (this.assistant.remeasure || this.assistant.subtreeShown) {
			this._maybeSubtreeShown = this._maybeSubtreeShown.bindAsEventListener(this);
			this.scene.listen(this.scene.sceneElement, Mojo.Event.subtreeShown, this._maybeSubtreeShown);
		}
		if (this.assistant.remeasure || this.assistant.orientationChange) {
			this._maybeOrientationChange = this._maybeOrientationChange.bindAsEventListener(this);
			this.scene.listen(this.scene.sceneElement, Mojo.Event.orientationChange, this._maybeOrientationChange);
		}
		
		// Listen for subtreeHidden if the assistant implements the handler:
		if(this.assistant.subtreeHidden) {
			this._maybeSubtreeHidden = this._maybeSubtreeHidden.bindAsEventListener(this);
			this.scene.listen(this.scene.sceneElement, Mojo.Event.subtreeHidden, this._maybeSubtreeHidden);
		}
		
		
		// Call setup if implemented.
		// This lets widget initialization code take advantage
		// of the widget properties already being set, so 
		// the values can always be referenced the same way.
		if(widget.setup) {
			timing.resume(widgetTimingName);
			if (Mojo.Host.current === Mojo.Host.browser) {
				widget.setup();
			} else {
				try {
					widget.setup();
				} catch(e) {
					Mojo.Log.error("Error: Caught exception in "+widgetClass+" widget '"+this.widgetName+"' setup(): "+e);
				}
			}
			timing.pause(widgetTimingName);
		}
		timing.pause('scene#widgetInitialize');
	},
	
	/** @private 
		Checks if this widget is included in the container for the given subtreeShown/Hidden event.
	**/
	_subtreeEventMatters: function(subtreeEvent) {
		var container = subtreeEvent.container;
		var widgetElement = this.element;
		return container === widgetElement || widgetElement.descendantOf(container);
	},
	
	//in the case of a subtreeShown event, just call remeasure
	//in the case of an orientationChange event, if there is a remeasure, call it
	//and ALSO try to call the updateOrientation event
	//if we are listening on subtreeShown, there MUST be a remeasure event
	/** @private **/
	_maybeSubtreeShown: function(subtreeShownEvent) {
		if (this._subtreeEventMatters(subtreeShownEvent)) {
			if (this.assistant.subtreeShown) {
				this.assistant.subtreeShown(subtreeShownEvent);
			}
			if (this.assistant.remeasure) {
				this.assistant.remeasure(subtreeShownEvent);
			}
		}
	},
	
	/** @private **/
	_maybeSubtreeHidden: function(subtreeEvent) {
		if (this._subtreeEventMatters(subtreeEvent)) {
			this.assistant.subtreeHidden(subtreeEvent);
		}
	},
	
	/** @private **/
	_maybeOrientationChange: function(e) {
		if (this.assistant.orientationChange) {
			this.assistant.orientationChange(e);
		}
		if (this.assistant.remeasure) {
			this.assistant.remeasure(e);
		}
	},
	
	/** @private */
	activate: function activate() {
		if(this.assistant.activate) {
			this.assistant.activate();
		}
	},
	
	
	/*
		Called by the scene controller when the widget is no longer needed.
		This happens when the widget's scene is popped, or when the widget is "thrown away" 
		due to a parent widget re-rendering its DOM subtree (for example, when a list 
		model changes, and the list items have widgets in them).
		
		This function calls through to the assistant's cleanup method, if implemented.
		Widget implementations that add event observers outside their element's subtree
		need to remove those observers in cleanup(), or else they could be left active 
		after the widget has been removed from the DOM.
		
		Not intended for use by widget assistants.
	*/
	/** @private */
	cleanup: function cleanup() {
		var disposal;
		
		if(this.reparenting) {
			return;
		}
		
		this.scene.removeWatcher(this.assistant);
		if (this.assistant.remeasure || this.assistant.subtreeShown) {
			this.stopListening(this.scene.sceneElement, Mojo.Event.subtreeShown, this._maybeSubtreeShown);
		}
		if (this.assistant.remeasure || this.assistant.orientationChange) {
			this.stopListening(this.scene.sceneElement, Mojo.Event.orientationChange, this._maybeOrientationChange);
		}
		
		if(this.assistant.subtreeHidden) {
			this.stopListening(this.scene.sceneElement, Mojo.Event.subtreeHidden, this._maybeSubtreeHidden);
		}
		
		if(this.assistant.cleanup) {
			this.assistant.cleanup();
		}
		
		this.element.removeEventListener('DOMNodeRemovedFromDocument', this.cleanupHandler, false);
		
		disposal = this.scene.stageController._mojoWidgetDisposal;
		if(!disposal) {
			disposal = new Mojo.Controller.WidgetController.WidgetDisposal();
			this.scene.stageController._mojoWidgetDisposal = disposal;
		}
		
		disposal.add(this);
	}  
	
});


Mojo.Log.addLoggingMethodsToPrototype(Mojo.Controller.WidgetController);



/** @private 
	Manages delayed widget disposal -- clearing the 'element' property in the widget controller. 
	This allows the element property to remain set after cleanup, but ensures that it is cleared eventually.
*/
Mojo.Controller.WidgetController.WidgetDisposal = function() {
	this.dispose = this.dispose.bind(this);
};

/** @private */
Mojo.Controller.WidgetController.WidgetDisposal.prototype.DELAY = 5;

/** @private
	Adds the given widget controller to the disposal, where it will be disposed of in 5-10 seconds.
*/
Mojo.Controller.WidgetController.WidgetDisposal.prototype.add = function(widget) {
	// Create a waiting queue if needed, and add the widget controller to it.
	this.waitingQueue = this.waitingQueue || [];
	this.waitingQueue.push(widget);
	
	// If we don't already have a dispose call delayed, then make one.
	if(!this.disposing) {
		this.disposing = true;
		this.dispose.delay(this.DELAY);
	}
};

/** @private
	Disposes of widgets in the current disposal queue, and moves "waiting" widgets to the disposal queue.
*/
Mojo.Controller.WidgetController.WidgetDisposal.prototype.dispose = function() {
	var i, widget;
	var disposalQueue = this.disposalQueue;
	
	// If the current disposal queue has anything in it, then dispose of all the widgets.
	// This boils down to clearing their element reference, which seems to prevent a
	// difficult-to-track-down memory leak.
	if(disposalQueue) {
		for(i=0; i<disposalQueue.length; i++) {
			widget = disposalQueue[i];
			Mojo.removeAllEventListenersRecursive(widget.element);
			widget.element = undefined;
		}
	}
	
	// Move the waiting queue to the "disposal area", and clear the "waiting area".
	this.disposalQueue = this.waitingQueue;
	this.waitingQueue = undefined;
	
	// If the new disposal queue is not empty, then delay another call to dispose.
	// This guarantees that widgetControllers will get at least 5 seconds before their element is erased.
	if(this.disposalQueue) {
		this.dispose.delay(this.DELAY);
	} else {
		// Otherwise, reset our state so we'll delay another dispose() call the next time a widget is added.
		this.disposing = false;
	}
	
};




