/**
 * @name widget_datetimepicker.js
 * @fileOverview The TimePicker & DatePicker widgets can be used to view and modify 
 * Date objects in a model;
 * See {@link Mojo.Widget.TimePicker} and {@link Mojo.Widget.DatePicker} for more info.

Copyright 2009 Palm, Inc.  All rights reserved.

*/


/*	
	TODO:
	* Support for 24h time? (disable AM/PM support, & use 0-23 range for hour items)
	* Picker popups snap & select as they scroll.  Likely requires additional snap support.
	* focusCapsule() should accept an element instead of a type, so we can avoid the extra querySelector in some cases.
	
	* Once we're sure HI isn't going to change the spec back so that pickers are opened automatically when the capsules are focused,
		we should move away from having things driven by DOMFocusIn & DOMFocusOut events.  Pickers can always be opened explicitly,
		and we can eliminate the hacky "suppress popup" state variable.  This should make things much clearer & tidier.
	
	Done but in need of cleanup:
	* Fix picker-popup auto-scrolling -- remove 20px hack.
	
	
	Styling TODO:
	* Should labels be outside widget? Or optional? (so we maybe have to remove the element or eliminate any margin/padding)
	
*/

/**#nocode+*/
/** @private */
Mojo.Widget._GenericPicker = function(strategy) {	
	// _GenericPicker can't be instantiated as a widget directly.  
	// Instead, it's subclassed in one way or another. 
	// A strategy object must be pased to this constructor.
	// All purpose-specific logic resides in the strategy object, 
	// so this class can be used for both time & date pickers.
	this.strategy = strategy;
};


Mojo.Widget._GenericPicker.prototype.kCapsuleTypeAttr = 'x-mojo-capsule-type';
Mojo.Widget._GenericPicker.prototype.kFocusTargetAttr = 'x-mojo-focus-me';



Mojo.Widget._GenericPicker.prototype.setup = function() {
	Mojo.assert(this.controller.model, "Mojo.Widget._GenericPicker requires a model. Did you call controller.setupWidgetModel() with the name of this widget?");
	
	// The strategy object has access to both the widget controller & assistant.
	this.strategy.controller = this.controller;
	this.strategy.assistant = this;
	if(this.strategy.setup) {
		this.strategy.setup();
	}
	
	// We only open popups on a tap, for now.
	this.suppressPopUp = true;
	
	this.label = this.controller.attributes.label || this.strategy.kDefaultLabel;
	
	this.modelProperty = this.controller.attributes.modelProperty || this.strategy.kDefaultModelProperty;
	this.keymatchers =  {};
	
	this.updateFromModel();
	
	// Attach event handling stuff:
	this.tapHandler = this.tapHandler.bindAsEventListener(this);
	this.controller.listen(this.controller.element, Mojo.Event.tap, this.tapHandler);
	
	this.focusInHandler = this.focusInHandler.bindAsEventListener(this);
	this.controller.listen(this.controller.element, 'DOMFocusIn', this.focusInHandler);
	this.focusOutHandler = this.focusOutHandler.bindAsEventListener(this);
	this.controller.listen(this.controller.element, 'DOMFocusOut', this.focusOutHandler);
	
	this.keypressHandler = this.keypressHandler.bindAsEventListener(this);
	this.controller.listen(this.controller.element, 'keypress', this.keypressHandler);
	
	//see if parent is dialog because we need to hack the location
	if (Mojo.View.getParentWithAttribute(this.controller.element, 'x-mojo-element', '_Dialog')) {
		this.isDialogChild = true;
	}

	if(this.controller.attributes.labelPlacement === Mojo.Widget.labelPlacementRight) {
		this.controller.element.querySelector('div[x-mojo-picker-label]').removeClassName('left');
	}

};

Mojo.Widget._GenericPicker.prototype.cleanup = function() {
	// Detach event handling stuff:
	this.controller.stopListening(this.controller.element, Mojo.Event.tap, this.tapHandler);
	this.controller.stopListening(this.controller.element, 'DOMFocusIn', this.focusInHandler);
	this.controller.stopListening(this.controller.element, 'DOMFocusOut', this.focusOutHandler);
	this.controller.stopListening(this.controller.element, 'keypress', this.keypressHandler);
};

/* 
	Render the widget using data from the model, and help from the strategy object.
*/
Mojo.Widget._GenericPicker.prototype.updateFromModel = function() {
	var content, i;
	var capsuleTemplate = Mojo.Widget.getSystemTemplatePath("picker/capsule");
	var capsuleList = this.strategy.kCapsuleList;
	var type;
	
	// iterate through the strategy object's capsule types, and render each one in order.
	content = '';
	for(i=0; i<capsuleList.length; i++) {
		type = capsuleList[i];
		content += Mojo.View.render({object: {value:this.strategy.getValueForType(type), type:type}, template: capsuleTemplate});
	}
	
	// render capsules into our container template.
	content = Mojo.View.render({object: {label:this.label, capsules:content},
						template:  Mojo.Widget.getSystemTemplatePath("picker/picker")});
	
	this.controller.element.innerHTML = content;
	
	if(this.controller.attributes.labelPlacement === Mojo.Widget.labelPlacementRight) {
		this.controller.element.querySelector('div[x-mojo-picker-label]').removeClassName('left');
	}
	
	this.closeOpenedPicker();
};

/*
	Utility function for use by strategy objects.
*/
Mojo.Widget._GenericPicker.prototype.getModelProperty = function() {
	return this.controller.model[this.modelProperty];
};

/*
	On a model change, we re-render, and preserve the focused row/capsule if any.
*/
Mojo.Widget._GenericPicker.prototype.handleModelChanged = function() {
	var focusedCapsule = this.focusedCapsule;
	
	this.updateFromModel();
	
	// Preserve the capsule that was focused, if any.
	if(focusedCapsule !== undefined) {
		this.focusCapsule(focusedCapsule, true);
	}
};

/*
	Called when our row or one of our capsules is focused.
*/
Mojo.Widget._GenericPicker.prototype.focusInHandler = function(event) {
	var highlightElement = Mojo.View.findParentByAttribute(event.target, this.controller.document, Mojo.Widget.focusAttribute);
	var capsule;
	
	// Apply 'focus' class to our row.
	if(highlightElement) {
		highlightElement.addClassName('focused');
	}
	
	// If a capsule was focused, find it and  get its type.
	capsule = Mojo.View.findParentByAttribute(event.target, this.controller.element, this.kCapsuleTypeAttr);
	
	this.setupCapsule(capsule);
};


/*
	Called when our row or a capsule is blurred.
*/
Mojo.Widget._GenericPicker.prototype.focusOutHandler = function(event) {
	var highlightElement = Mojo.View.findParentByAttribute(event.target, this.controller.document, Mojo.Widget.focusAttribute);
		
	// Remove focus class.  
	// This will be re-applied if the focus is moving to another element in this widget.
	if(highlightElement) {
		highlightElement.removeClassName('focused');
	}
	
	this.closeOpenedPicker();
	delete this.currentKeyMatcher;
	delete this.focusedCapsule;
	
};

/** @private */
Mojo.Widget._GenericPicker.prototype.setupCapsule = function(capsule) {
	var type, popupModel;
	
	if(!capsule) {
		return;
	}
	
	type = capsule.getAttribute(this.kCapsuleTypeAttr);

	// Set up the appropriate keymatcher for whatever got focused.
	// This ensures keypresses will modify the correct field.
	if(type) {
		this.focusedCapsule=type;
		this.currentKeyMatcher = this.keymatchers[type] || this.strategy.createKeyMatcherForType(type);
	} else {
		// TODO: This else case can be removed if we decide to stick with the capsules being the only focusable elements in the widget.
		// row is focused, but no capsule, so we use the default keymatcher.
		this.focusedCapsule = false;
		this.currentKeyMatcher = this.keymatchers[this.strategy.kDefaultCapsuleType] || this.strategy.createKeyMatcherForType(this.strategy.kDefaultCapsuleType);
	}
	this.keymatchers[type] = this.currentKeyMatcher;

	// Don't open the popup if it's suppressed.
	// This allows us to focus the capsule without having the popup opened (used for key input).
	if(this.suppressPopUp) {
		return;
	}

	this.controller.element.addClassName('active-popup');

	// Open the popup for the focused capsule.
	if(type) {
		popupModel = this.strategy.createPopupModelForType(type);
		if(popupModel) {
			popupModel.placeOver = capsule;
			popupModel.onChoose = this._pickerChoose.bind(this, popupModel.onChoose); // use our own onChoose function which calls through to the strategy one.
			popupModel.isDialogChild = this.isDialogChild;
			this.openPicker = this.controller.scene.showPickerPopup(popupModel);
			
			Mojo.listen(this.controller.element, Mojo.Event.dragStart, this.dragStopper);
		}
	}
};


Mojo.Widget._GenericPicker.prototype.closeOpenedPicker = function() {
	if(this.openPicker) {
		this.openPicker.mojo.close();
		delete this.openPicker;
		
		Mojo.stopListening(this.controller.element, Mojo.Event.dragStart, this.dragStopper);		
	}
};

Mojo.Widget._GenericPicker.prototype.dragStopper = function(event) {
	event.stop();
};

/** @private
	Called whenever a picker value is chosen, or with undefined when the picker is closed.
	We use this to clear the actiove popup class on the picker widget, and then call through to the original 
	onChoose function so that the correct strategy-specific stuff all happens.
*/
Mojo.Widget._GenericPicker.prototype._pickerChoose = function(originalChooseFunc, value) {
	
	this.controller.element.removeClassName('active-popup');
	
	if(originalChooseFunc) {
		originalChooseFunc(value);
	}
	
	// Make sure we clear our open picker state.
	this.closeOpenedPicker();
};


Mojo.Widget._GenericPicker.prototype.tapHandler = function(event) {
	var capsule, capsuleType;
	
	event.stop();
	
	this.propChangeEvent = event;
	
	// We unfortunately need to explicitly focus the right element, since tabindex=0
	// doesn't cause clicks on child elements to focus their parent.
	// If a capsule is being focused, then a popup will open in response to the focus operation.
	// The elementToFocus node may no longer be in the DOM at this point, so we save the type 
	// and use focusCapsule() to make sure the new replacement node gets focused.
	
	capsule = Mojo.View.findParentByAttribute(event.target, this.controller.element, this.kCapsuleTypeAttr);
	capsuleType = capsule && capsule.getAttribute(this.kCapsuleTypeAttr);
		
	// Allow strategy object to perform some custom tap behavior.
	// If its unimplemented, or doesn't return a truthy value, then we focus the element by default.
	if(!this.strategy.handleTap || 
				!this.strategy.handleTap(capsuleType)) {
		
		if(!capsuleType) {
			// tap was not on a capsule, so focus default capsule, but suppress the popup.
			this.focusCapsule(this.strategy.kDefaultCapsuleType, true);
		} else {
			this.focusCapsule(capsuleType, false);
		}
	}
};

/*
	Passes key events to the matcher, so user can type to set values.
*/
Mojo.Widget._GenericPicker.prototype.keypressHandler = function(event) {
	this.propChangeEvent = event;
	
	if(this.currentKeyMatcher) {
		this.closeOpenedPicker();
		this.currentKeyMatcher.keyPress(event.charCode);
	}
};

/*
	Utility function for use by strategy objects.
	Re-renders, optionally maintaining focus, and sends a propertyChange event.
*/
Mojo.Widget._GenericPicker.prototype.modifiedModelProperty = function(changedType, suppressPopup) {
	var capsules, idx;
	
	// If there's an open picker popup when our model property is modified, then we assume 
	// it was modified due to a tap in the picker popup, and we automatically open the next 
	// one instead of maintaining focus on the current one.  
	// This code advances to the next capsule (except when we're at the last one).
	/*
	The auto-advance functionality is temporarily disabled, 'cause it's really annoying when 
	you try to tap the next capsule while the current popup is scrolling to its chosen item, 
	and then the other capsule opens just before your finger hits the screen, and you 
	accidentally choose an item.
	
	if(this.openPicker && changedType) {
		capsules = this.strategy.kCapsuleList;
		idx = capsules.indexOf(changedType);
		
		if(idx >= 0 && idx !== capsules.length-1) {
			changedType = capsules[idx+1];
			suppressPopup = false;
		}	
	}
	*/
	
	this.updateFromModel();
	
	if(changedType) {
		this.focusCapsule(changedType, suppressPopup);
	}
	
	Mojo.Event.send(this.controller.element, Mojo.Event.propertyChange,
		{ property: this.modelProperty,
			value: this.controller.model[this.modelProperty],
			model: this.controller.model,
			originalEvent: this.propChangeEvent
		});
};


/*
Explicitly focuses the capsule of the given type, or the widget's row if the type is falsy.
 */
Mojo.Widget._GenericPicker.prototype.focusCapsule = function(type, suppressPopup) {
	var el;
	
	type = type || this.strategy.kDefaultCapsuleType;
	el = this.controller.element.querySelector("div["+this.kCapsuleTypeAttr+"="+type+"]");

	this.suppressPopUp = suppressPopup;
	
	if(this.focusedCapsule === type) {
		this.setupCapsule(el);
	} else {
		if(el) {
			el.focus();
		}
	}
	
	this.suppressPopUp = true;
};


/*
	Utility function for use by strategy objects.
	Turns given value into a string with a leading 0 in order to ensure a two-digit display.
*/
Mojo.Widget._GenericPicker.prototype.zeroPad = function(val) {
	if(val < 10) {
		val = '0'+val;
	}
	return val;
};


/*
	Utility function for use by strategy objects.
	This is bound and used as a callback for pickerpopups and keymatchers to handle simple 
	setting of integer properties on our model property object.
	Usually bound to getter/setter function names, and capsule type before use.
*/
Mojo.Widget._GenericPicker.prototype._chooseIntegerProperty = function(getter, setter, type, value) {
	var propObj;

	if(value === undefined) {
		return;
	}

	value = parseInt(value, 10);
	propObj = this.getModelProperty();
	if(propObj[getter]() !== value) {
		propObj[setter](value);
		this.modifiedModelProperty(type, true);
	}
};

Mojo.Widget._GenericPicker.prototype.clearCachedKeyMatcher = function(type) {
	delete this.keymatchers[type];
};



/** @private
	Strategy object which encapsulates logic for a time-specific version of the _GenericPicker.
*/
Mojo.Widget._TimePickerStrategy = function() {
	this.using12HourTime = Mojo.Format.using12HrTime();
};

/** @private */
Mojo.Widget._TimePickerStrategy.prototype.setup = function() {
	// bind choose callbacks:
	this._chooseHours = this._chooseHours.bind(this);	
	this._chooseMinutes = this.assistant._chooseIntegerProperty.bind(this.assistant, 
										'getMinutes', 'setMinutes', this.kMinutesCapsuleType);
	
	// Configure us properly for 12h/24h time
	if(this.using12HourTime) {
		this._chooseAMPM = this._chooseAMPM.bind(this);
	} else {
		// Override the capsule list to remove the AMPM item.
		this.kCapsuleList = this.kCapsuleList.slice(0,2);
	}
	
	this.minuteInterval = this.controller.attributes.minuteInterval || 5;
};

// Items arrays for the popup pickers.
Mojo.Widget._TimePickerStrategy.prototype.ampmItems = [{label:$LL('AM'), value:'am'}, {label:$LL('PM'), value:'pm'}];
Mojo.Widget._TimePickerStrategy.prototype.hoursItems = [{label:'1', value:1}, 
												{label:'2', value:2}, 
												{label:'3', value:3}, 
												{label:'4', value:4}, 
												{label:'5', value:5}, 
												{label:'6', value:6}, 
												{label:'7', value:7}, 
												{label:'8', value:8}, 
												{label:'9', value:9}, 
												{label:'10', value:10}, 
												{label:'11', value:11},
												{label:'12', value:0}
												];

// Constants for our capsule types:
Mojo.Widget._TimePickerStrategy.prototype.kHoursCapsuleType = 'hours';
Mojo.Widget._TimePickerStrategy.prototype.kMinutesCapsuleType = 'minutes';
Mojo.Widget._TimePickerStrategy.prototype.kAMPMCapsuleType = 'ampm';

// Interface constants for use by _GenericPicker.
Mojo.Widget._TimePickerStrategy.prototype.kDefaultLabel = $LL('Time');
Mojo.Widget._TimePickerStrategy.prototype.kDefaultModelProperty = 'time';
Mojo.Widget._TimePickerStrategy.prototype.kDefaultCapsuleType = Mojo.Widget._TimePickerStrategy.prototype.kHoursCapsuleType;
Mojo.Widget._TimePickerStrategy.prototype.kCapsuleList = ['hours', 'minutes', 'ampm'];


/** @private
	Returns the label string for the current value of the given capsule type.
	Interface function for use by _GenericPicker.
*/
Mojo.Widget._TimePickerStrategy.prototype.getValueForType = function(type) {
	var time = this.assistant.getModelProperty();
	var label;
	
	switch(type) {
		case this.kHoursCapsuleType:
			label = time.getHours();
			if(this.using12HourTime) {
				label = label % 12;
				label = label || 12; // display 12 for hour 0.
			}
			break;
			
		case this.kMinutesCapsuleType:
			label = this.assistant.zeroPad(time.getMinutes());
			break;
		
		case this.kAMPMCapsuleType:
			label = this.ampmItems[this._getAMPMIndex(time)].label;
			break;		
	}
	
	return label;
};

/* @private
	Returns a keymatcher object for the given capsule type.
	Interface function for use by _GenericPicker.
*/
Mojo.Widget._TimePickerStrategy.prototype.createKeyMatcherForType = function(type) {
	var matcher;
	var options;
	
	switch(type) {
		case this.kHoursCapsuleType:
			options = {window:this.controller.window, numeric:true};
			
			if(this.using12HourTime) {
				options.items = this.hoursItems;
			} else {
				options.itemsRange= {min:0, max:23};
			}
			
			matcher = new Mojo.Event.KeyMatcher(this._chooseHours, options);
			break;
			
		case this.kMinutesCapsuleType:
			matcher = new Mojo.Event.KeyMatcher(this._chooseMinutes, 
							{itemsRange: {min:0, max:59, interval: this.minuteInterval}, 
								window:this.controller.window, numeric:true});
			break;
		
		case this.kAMPMCapsuleType:
			matcher = new Mojo.Event.KeyMatcher(this._chooseAMPM, 
							{items: this.ampmItems, window:this.controller.window});
			break;		
	}
	
	return matcher;
};

/* @private
	Returns a PickerPopup model for the given capsule type.
	Interface function for use by _GenericPicker.
*/
Mojo.Widget._TimePickerStrategy.prototype.createPopupModelForType = function(type) {
	var popupModel;
	var time = this.assistant.getModelProperty();
	
	switch(type) {
		case this.kHoursCapsuleType:
			
			popupModel = {
				onChoose: this._chooseHours,
				value: time.getHours()
			};
			
			if(this.using12HourTime) {
				popupModel.value = popupModel.value % 12;
				popupModel.items = this.hoursItems;
			} else {
				popupModel.itemsRange = {min:0, max:23};
			}
			
			break;
		
		case this.kMinutesCapsuleType:
			popupModel = {
				onChoose: this._chooseMinutes,
				value:time.getMinutes(),
				itemsRange: {min:0, max:59, interval: this.minuteInterval},
				padNumbers: true
			};
			break;
	
		case this.kAMPMCapsuleType:
			popupModel = {
				onChoose: this._chooseAMPM,
				value: this._getAMPMIndex(time),
				items: this.ampmItems
			};
			
			// TODO: This code can be removed, and popupModel.value can just be set properly above, 
			// if we decide to stick with a tap on the AMPM capsule not toggling the value.
			if(this.tappedAMPM) {
				popupModel.value = popupModel.value ? 0 : 1;
				delete this.tappedAMPM;
			}
			popupModel.value = this.ampmItems[popupModel.value].value;
			break;
	}	
	
	return popupModel;
};

/** @private */
Mojo.Widget._TimePickerStrategy.prototype._getAMPMIndex = function(time) {
	return Math.floor(time.getHours()/12);
};

/*
Disabled by request of the interaction design guys.
TODO: Once we know we really don't want this, we can pull all the 'tappedAMPM' related code, or possibly even the support for handleTap in a strategy object.
Mojo.Widget._TimePickerStrategy.prototype.handleTap = function(type) {
	var time, hours;
	
	// EXPERIMENTAL: This is inconsistent with the other capsules, since they never change value on tap,
	// and this implementation is ugly since re-rendering causes the tap highlight to be removed early.
	// But it's enough to let folks test out this interation feature.
	// Taps on the AM/PM capsule cause us to toggle the value, since there's only two to choose from.
	if(type === this.kAMPMCapsuleType) {		
		this.tappedAMPM = true;
	}
	
	return false; // so widget performs default focus behavior
};
*/

/* @private
	Called by pickerpopup & keymatcher to set the hours.
*/
Mojo.Widget._TimePickerStrategy.prototype._chooseHours = function(value) {
	var time;
	
	if(value === undefined) {
		return;
	}
	
	time = this.assistant.getModelProperty();
	
	value = parseInt(value, 10);
	
	// preserve AM/PM of hour value, since the Date property is always in 24h form.
	if(this.using12HourTime && time.getHours() >= 12) {
		value += 12;
	}
	
	if(time.getHours() !== value) {
		time.setHours(value);
		this.assistant.modifiedModelProperty(this.kHoursCapsuleType, true);
	}
};


/* @private
	Called by pickerpopup & keymatcher to set the AM/PM value.
*/
Mojo.Widget._TimePickerStrategy.prototype._chooseAMPM = function(value) {
	var time, hours;
	
	if(value === undefined) {
		return;
	}
	
	time = this.assistant.getModelProperty();
	hours = time.getHours();
	
	if(hours >= 12 && value === 'am') {
		hours -= 12;
	} else if(hours < 12 && value === 'pm') {
		hours += 12;
	}
	
	if(time.getHours() !== hours) {
		time.setHours(hours);
		this.assistant.modifiedModelProperty(this.kAMPMCapsuleType, true);
	}
	
};
/**#nocode-*/

/**
#### Overview ####

The TimePicker offers selection of the hour and minutes with an AM/PM selector when appropriate. 
It is one of the simple picker widgets which present their choices as a linear 
sequence of values that wraps around; when you scroll to the end of the sequence, 
it simply continues back at the beginning. The Date and Time pickers use the 
JavaScript Date object to represent the chosen time in their data model.

#### Declaration ####

		<div x-mojo-element="TimePicker" id="timepickerId" class="timepickerClass" name="timepickerName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
		x-mojo-element	Required	TimePicker		Declares the widget as type 'TimePicker' 
		id				Required	Any String		Identifies the widget element for use when instantiating or rendering
		class			Optional	Any String		There isn't a default class for TimePicker but you can assign one if you want apply custom styling 
		name			Optional	Any String		Add a unique name to the timepicker widget; generally used in templates when used 

#### Events ####

		this.controller.listen("timepickerId",'mojo-propetyChange', this.handleUpdate)

		Event Type				Value						Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		mojo-propertyChange		event.value or model.time	Respond to TimePicker value change

#### Instantiation ####
    
		var currentTIme = new Date();
		this.controller.setupWidget("timepickerId",
		    this.attributes = {
		        label: 'Time',
		        modelProperty: 'time'

		    },
		    this.model = {
		        time: currentTime
		    });

#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		label				String			Optional	'Time'		Label displayed for the widget controls
		labelPlacement		String			Optional	Mojo.Widget.labelPlacementLeft		Mojo.Widget.labelPlacementRight : places label on right, value on left.
																	Mojo.Widget.labelPlacementLeft : places label on left, value on right
		modelProperty		String			Optional	time		Model property name for date object
		minuteInterval		Integer			Optional	5			Interval between minute selection options

#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		time				Date Object		Required	null		Date object to set initial widget value and updated value after user selection


####  Methods ####

		Method      Arguments   Description
		---------------------------------------------------------------------------------------------------------------------------------
		None


@field
*/
Mojo.Widget.TimePicker = function() {
	// Call through to _GenericPicker's constructor, passing our strategy object.
	Mojo.Widget._GenericPicker.call(this, new Mojo.Widget._TimePickerStrategy());
};
Mojo.Widget.TimePicker.prototype = Mojo.Widget._GenericPicker.prototype;



/**#nocode+*/
/** @private
	Strategy object which encapsulates logic for a date-specific version of the _GenericPicker.
*/
Mojo.Widget._DatePickerStrategy = function() {
	var formatHash, format;
	var monthItems, dateTimeHash, i;
	var newCapsuleList;
	
	// When the first date picker is instantiated, we sort the capsule array in the prototype 
	// according to the data in the current locale.
	if(!this._checkedDateFormat) {
		Mojo.Widget._DatePickerStrategy.prototype._checkedDateFormat = true;
		
		formatHash = Mojo.Format.getFormatHash();
		format = formatHash && formatHash.dateFieldOrder;

		if(format) {
			newCapsuleList = [];
			for(i=0; i<format.length; i++) {
				switch(format[i]) {
					case 'm':
					newCapsuleList.push('month');
					break;
					case 'd':
					newCapsuleList.push('day');
					break;
					case 'y':
					newCapsuleList.push('year');
					break;
				}
			}
			//WARNING: assumes that LSM never supports live format switching w/o restarting app
			Mojo.Widget._DatePickerStrategy.prototype.kCapsuleList = newCapsuleList;
		}
		
		// And set up the labels for the months:
		monthItems = this.monthItems;
		dateTimeHash = Mojo.Format.getDateTimeHash();
		dateTimeHash = dateTimeHash.medium.month;
		for(i=0; i<monthItems.length; i++) {
			monthItems[i].label = dateTimeHash[i];
		}
		
	}
	
};


Mojo.Widget._DatePickerStrategy.prototype.setup = function() {
	this.kCapsuleList = this.kCapsuleList.slice(0);
	
	// bind choose callbacks, and remove any capsules that aren't supposed to be there:
	if (this.controller.attributes.month !== false) {
		this._chooseMonth = this._chooseMonth.bind(this);
	} else {
		this.kCapsuleList.splice(this.kCapsuleList.indexOf('month'), 1);
	}
	
	if (this.controller.attributes.day !== false) {
		this._chooseDay = this.assistant._chooseIntegerProperty.bind(this.assistant, 'getDate', 'setDate', this.kDayCapsuleType);
	} else {
		this.kCapsuleList.splice(this.kCapsuleList.indexOf('day'), 1);
	}
	
	if (this.controller.attributes.year !== false) {
		this._chooseYear = this._chooseYear.bind(this);
	} else {
		this.kCapsuleList.splice(this.kCapsuleList.indexOf('year'), 1);
	}
	
	if(this.controller.attributes.maxYear !== undefined) {
		this.maxYear = this.controller.attributes.maxYear;
	} else {
		this.maxYear = this.kMaxYear;
	}
	
	if(this.controller.attributes.minYear !== undefined) {
		this.minYear = this.controller.attributes.minYear;
	} else {
		this.minYear = this.kMinYear;
	}
	
	
};

// Items arrays for the popup pickers.
Mojo.Widget._DatePickerStrategy.prototype.monthItems = [ // labels are copied at runtime from the DateTimeHash.
												{value:0, days: 31}, 
												{value:1, days: 28}, 
												{value:2, days: 31}, 
												{value:3, days: 30}, 
												{value:4, days: 31}, 
												{value:5, days: 30}, 
												{value:6, days: 31}, 
												{value:7, days: 31}, 
												{value:8, days: 30}, 
												{value:9, days: 31},
												{value:10, days: 30},
												{value:11, days: 31}
												];

// Constants for our capsule types:
Mojo.Widget._DatePickerStrategy.prototype.kDayCapsuleType = 'day';
Mojo.Widget._DatePickerStrategy.prototype.kMonthCapsuleType = 'month';
Mojo.Widget._DatePickerStrategy.prototype.kYearCapsuleType = 'year';

// Interface constants for use by _GenericPicker.
Mojo.Widget._DatePickerStrategy.prototype.kDefaultLabel = $LL('Date');
Mojo.Widget._DatePickerStrategy.prototype.kDefaultModelProperty = 'date';
Mojo.Widget._DatePickerStrategy.prototype.kDefaultCapsuleType = 'month';
Mojo.Widget._DatePickerStrategy.prototype.kCapsuleList = ['month', 'day', 'year']; //note: this is overridden at runtime by client attributes

Mojo.Widget._DatePickerStrategy.prototype.kMinYear = 1900;
Mojo.Widget._DatePickerStrategy.prototype.kMaxYear = 2099;


/** @private
	Returns the label string for the current value of the given capsule type.
	Interface function for use by _GenericPicker.
*/
Mojo.Widget._DatePickerStrategy.prototype.getValueForType = function(type) {
	var date = this.assistant.getModelProperty();
	var label;
	
	switch(type) {
		case this.kDayCapsuleType:
			label = this.assistant.zeroPad(date.getDate());
			break;
			
		case this.kMonthCapsuleType:
			label = this.monthItems[date.getMonth()].label;
			break;
		
		case this.kYearCapsuleType:
			label = date.getFullYear();
			break;		
	}
	
	return label;
};


/** @private
	Returns a keymatcher object for the given capsule type.
	Interface function for use by _GenericPicker.
*/
Mojo.Widget._DatePickerStrategy.prototype.createKeyMatcherForType = function(type) {
	var matcher, date, days, dayCount;
	
	switch(type) {
		case this.kDayCapsuleType:
			date = this.assistant.getModelProperty();
			dayCount = this._countDaysForMonth(date.getMonth(), date.getFullYear());
			matcher = new Mojo.Event.KeyMatcher(this._chooseDay, 
							{itemsRange: {min:1,max:dayCount}, window:this.controller.window, numeric:true});
			break;
			
		case this.kMonthCapsuleType:
			matcher = new Mojo.Event.KeyMatcher(this._chooseMonth, 
							{items: this.monthItems, window:this.controller.window});
			break;
		
		case this.kYearCapsuleType:
			matcher = new Mojo.Event.YearKeyMatcher(this._chooseYear, 
							{itemsRange: {min:this.minYear, max:this.maxYear}, window:this.controller.window, numeric:true});
			break;		
	}
	
	return matcher;
};


/** @private
	Returns a PickerPopup model for the given capsule type.
	Interface function for use by _GenericPicker.
*/
Mojo.Widget._DatePickerStrategy.prototype.createPopupModelForType = function(type) {
	var popupModel;
	var date = this.assistant.getModelProperty();
	var days;
	
	switch(type) {
		case this.kDayCapsuleType:
			days = this._countDaysForMonth(date.getMonth(), date.getFullYear());
			popupModel = {
				onChoose: this._chooseDay,
				value:date.getDate(),
				itemsRange: {min:1,max:days}				
			};
			break;
		
		case this.kMonthCapsuleType:
			popupModel = {
				onChoose: this._chooseMonth,
				value:date.getMonth(),
				items: this.monthItems
			};
			break;
	
		case this.kYearCapsuleType:
			popupModel = {
				onChoose: this._chooseYear,
				value: date.getFullYear(),
				itemsRange: {min:this.minYear,max:this.maxYear}
			};
			break;
	}
	
	return popupModel;
};


/** @private */
Mojo.Widget._DatePickerStrategy.prototype._chooseMonth = function(value) {
	var days, date, year;
	
	if(value === undefined) {
		return;
	}
	
	// if month changes, the old day key matcher can't be used, since it might have the wrong number of days.
	this.assistant.clearCachedKeyMatcher(this.kDayCapsuleType);
	
	value = parseInt(value, 10);
	date = this.assistant.getModelProperty();
	
	// Is it actually changing?
	if(date.getMonth() === value) {
		return;
	}
	
	// Get max days in new month, and make sure that we won't exceed it when we set the month.
	// The default behavior is to automatically advance the date to the early days of the
	// NEXT month, but this is really inconvenient for this widget because the month is 
	// typically set before the day, and so would almost certainly need to be set AGAIN 
	// when this occurred.  We work around it by reducing the day before changing the month.
	days = this._countDaysForMonth(value, date.getFullYear());
	
	if(date.getDate() > days) {
		date.setDate(days);
	}
	
	date.setMonth(value);
	this.assistant.modifiedModelProperty(this.kMonthCapsuleType, true);
	
};

/** @private */
Mojo.Widget._DatePickerStrategy.prototype._chooseYear = function(value) {
	this.assistant._chooseIntegerProperty('getFullYear', 'setFullYear', this.kYearCapsuleType, value);
	
	// if month changes, the old day key matcher can't be used, since it might have the wrong number of days.
	this.assistant.clearCachedKeyMatcher(this.kDayCapsuleType);
};




/** @private */
Mojo.Widget._DatePickerStrategy.prototype._countDaysForMonth = function(which, year) {
	var days = this.monthItems[which].days;
	
	// If it's February, we might need to allow for the 29th.  Check for leap years.
	if(which === 1) {
		if(((year % 4) === 0 && (year % 100) !== 0) || (year % 400) === 0) {
			days++;
		}
	}
	
	return days;
};
/**#nocode-*/

/**
#### Overview ####
The DatePicker offers selection of the month, day and year. 
It is one of the simple picker widgets which present their choices as a linear sequence
 of values that wraps around; when you scroll to the end of the sequence, 
it simply continues back at the beginning. The Date and Time pickers use the 
JavaScript Date object to represent the chosen date in their data model.

#### Declaration ####

		<div x-mojo-element="DatePicker" id="datepickerId" class="datepickerClass" name="datepickerName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
		x-mojo-element	Required	DatePicker		Declares the widget as type 'DatePicker' 
		id				Required	Any String		Identifies the widget element for use when instantiating or rendering
		class			Optional	Any String		There isn't a default class for DatePicker but you can assign one if you want apply custom styling 
		name			Optional	Any String		Add a unique name to the datepicker widget; generally used in templates when used 

#### Events ####

		this.controller.listen("datepickerId",'mojo-propetyChange', this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		Mojo.Event.propertyChange			event.value 	Respond to DatePicker value change
									or model.time        


#### Instantiation ####
    
		var todayDate = new Date();
		this.controller.setupWidget("datepickerId",
		    this.attributes = {
		        label: 'Date',
		        modelProperty: 'time' // one may override the default modelProperty so as to share a Date object with a time picker

		    },
		    this.model = {
		        time: todayDate
		    });


#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		label				String			Optional	'Date'		Label displayed for the widget controls
		labelPlacement		String			Optional	Mojo.Widget.labelPlacementLeft		Mojo.Widget.labelPlacementRight : places label on right, value on left.
																	Mojo.Widget.labelPlacementLeft : places label on left, value on right
		modelProperty		String			Optional	date		Model property name for date object
		month				Boolean			Optional	true		Specify whether or not to include the month in your date picker; default is true
		day					Boolean			Optional	true		Specify whether or not to include the day in your date picker; default is true
		year				Boolean			Optional	true		Specify whether or not to include the year in your date picker; default is true
		maxYear				Integer			Optional	2099		Specify max year in year capsule if enabled
		minYear				Integer			Optional	1900		Specify min year in year capsule if enabled

#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		date				Date Object		Required	null		Date object to set initial widget value and updated value after user selection


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		None



@field
*/
Mojo.Widget.DatePicker = function() {
	// Call through to _GenericPicker's constructor, passing our strategy object.
	Mojo.Widget._GenericPicker.call(this, new Mojo.Widget._DatePickerStrategy());
};
Mojo.Widget.DatePicker.prototype = Mojo.Widget._GenericPicker.prototype;




/** 
@private
Strategy object which encapsulates logic for an integer-specific version of the _GenericPicker.
*/
Mojo.Widget._IntegerPickerStrategy = function() {
};

/**
private setup
@private 
@constructor
*/
Mojo.Widget._IntegerPickerStrategy.prototype.setup = function() {
	this._choose = this._choose.bind(this);
};


// Constants for our capsule types:
Mojo.Widget._IntegerPickerStrategy.prototype.kIntegerCapsuleType = 'value';

// Interface constants for use by _GenericPicker.
Mojo.Widget._IntegerPickerStrategy.prototype.kDefaultLabel = $LL('Value');
Mojo.Widget._IntegerPickerStrategy.prototype.kDefaultModelProperty = Mojo.Widget.defaultModelProperty;
Mojo.Widget._IntegerPickerStrategy.prototype.kDefaultCapsuleType = 'value';
Mojo.Widget._IntegerPickerStrategy.prototype.kCapsuleList = ['value'];

/* @private
	Returns the label string for the current value of the given capsule type.
	Interface function for use by _GenericPicker.
*/
Mojo.Widget._IntegerPickerStrategy.prototype.getValueForType = function(type) {
	var label = this.assistant.getModelProperty();
	if (this.controller.attributes.padNumbers) {
		label = this.assistant.zeroPad(label);
	}
	return label;
};


/* @private
	Returns a keymatcher object for the given capsule type.
	Interface function for use by _GenericPicker.
*/
Mojo.Widget._IntegerPickerStrategy.prototype.createKeyMatcherForType = function(type) {
	var attrs = this.controller.attributes;
	return new Mojo.Event.KeyMatcher(this._choose, 
					{itemsRange: {min:attrs.min, max:attrs.max}, 
					window:this.controller.window, numeric:true});
};


/* @private
	Returns a PickerPopup model for the given capsule type.
	Interface function for use by _GenericPicker.
*/
Mojo.Widget._IntegerPickerStrategy.prototype.createPopupModelForType = function(type) {
	var popupModel;
	var attrs = this.controller.attributes;
	
	popupModel = {
		onChoose: this._choose,
		value:this.assistant.getModelProperty(),
		itemsRange: {min:attrs.min, max:attrs.max},
		padNumbers: this.controller.attributes.padNumbers				
	};
	
	return popupModel;
};

/* @private 
	Choose method called by keymatcher & pickerpopup.
*/
Mojo.Widget._IntegerPickerStrategy.prototype._choose = function(value) {
	var propObj;
	
	if(value === undefined) {
		return;
	}
	
	value = parseInt(value, 10);
	if(value !== this.assistant.getModelProperty()) {
		this.controller.model[this.assistant.modelProperty] = value;
		this.assistant.modifiedModelProperty('value', true);
	}	
};


/**
#### Overview ####
The IntegerPicker offers selection of a single integer field. It is one of the simple picker 
widgets which present their choices as a linear sequence of values that wraps around; when 
you scroll to the end of the sequence, it simply continues back at the beginning.


#### Declaration ####

		<div x-mojo-element="IntegerPicker" id="integerpickerId" class="integerpickerClass" name="integerpickerName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
		x-mojo-element	Required	IntegerPicker	Declares the widget as type 'IntegerPicker' 
		id				Required	Any String		Identifies the widget element for use when instantiating or rendering
		class			Optional	Any String		There isn't a default class for IntegerPicker but you can assign one if you want apply custom styling 
		name			Optional	Any String		Add a unique name to the integerpicker widget; generally used in templates when used 


#### Events ####

		this.controller.listen("integerpickerId",'mojo-propetyChange', this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		Mojo.Event.propertyChange			event.value		Respond to IntegerPicker value change
									or model.time        


#### Instantiation ####
    
		this.controller.setupWidget("integerpickerId",
		     this.attributes = {
		         label: 'Number',
		         modelProperty: 'value',
		         min: 0,
		         max: 20

		     },
		     this.model = {
		         value: 5
		     });


#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		label				String			Optional	'Value'		Label displayed for the the widget controls
		labelPlacement		String			Optional	Mojo.Widget.labelPlacementLeft		Mojo.Widget.labelPlacementRight : places label on right, value on left.
																	Mojo.Widget.labelPlacementLeft : places label on left, value on right
		modelProperty		String			Optional	value		Model property name for date object
		min					Integer			Required	required	Minimum selection option
		max					Integer			Required	required	Maximum selection option
		padNumbers			boolean			Optional	false		Add padding to single digit numbers or not


#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		value				Integer			Required	required	Initial widget value and updated value after user selection


#### Methods ####

		Method      Arguments   Description
		---------------------------------------------------------------------------------------------------------------------------------
		None



@field
*/
Mojo.Widget.IntegerPicker = function() {
	// Call through to _GenericPicker's constructor, passing our strategy object.
	Mojo.Widget._GenericPicker.call(this, new Mojo.Widget._IntegerPickerStrategy());
};
Mojo.Widget.IntegerPicker.prototype = Mojo.Widget._GenericPicker.prototype;


