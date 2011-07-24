/**
 * @name widget_textfield.js
 * @fileOverview This is a widget that wraps special the functionality of an input type = text with hint text and text correction behavior. 
   The field can auto grow vertically or horizontally.  
 * See {@link Mojo.Widget.TextField} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####
This is a widget that extends the functionality of an input type = text HTML element with hint 
text and text correction behavior. The field defaults to a single line, scrolling text field 
with fixed horizontal and vertical dimensions, that will submit the text, i.e., generate a 
Mojo.Event.propertyChange event, when it loses focus. The contents of the field will be passed to 
your event handler in both event.value and the widget's model.value.

#### Declaration ####

		<div x-mojo-element="TextField" id="textFieldId" class="textFieldClass" name="textFieldName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
		x-mojo-element	Required	TextField		Declares the widget as type 'TextField' 
		id				Required	Any String		Identifies the widget element for use when instantiating or rendering
		class			Optional	Any String		Provide your own unique class and override the frameworks styles
		name			Optional	Any String		Add a unique name to the textfield widget; generally used in templates when used 


#### Events ####

		Mojo.Event.listen(textFieldElement, Mojo.Event.propertyChange, this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		Mojo.Event.propertyChange	{model:model, property:property, value:value, oldValue: oldValue, originalEvent: originalEvent}  


#### Instantiation ####
    
		this.controller.setupWidget("textFieldId",
		     this.attributes = {
		         hintText: $L("  ... and hit Enter"),
		         multiline: false,
		         enterSubmits: false,
		         focus: true
		     },
		     this.model = {
		         value: "",
		         disabled: false
		});


#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		modelProperty		String			Optional	value		Model property name for selector value
		disabledProperty	String			Optional	disabled	Model property name for disabled boolean
		hintText			String			Optional	None		Initially displayed string; supplanted by model value if supplied
		textFieldName		String			Optional	None		DEPRECATED If supplied, the textarea will have this name, so that when it is serialized, 
																	the property can be easily pulled out
		inputName			String			Optional	None		If supplied, the textarea will have this name, so that when it is serialized, the property can be easily pulled out
		multiline			Boolean			Optional	FALSE		Auto line wrapping to field width
		charsAllow			Function		Optional	None		Function must return 'true' to allow input character, or 'false' if not allowed; 
																		note: this event is sent as a result 	
																	of a keyPress event, so you must check against key codes matching ASCII characters.
		focus				Boolean			Optional	FALSE		DEPRECATED If true, field has focus on scene push
		autoFocus			Boolean			Optional	FALSE		If true, field has focus on scene push
		modifierState		String			Optional	None		"initial state of modifier keys for this field. Can be: 
																        Mojo.Widget.numLock,
																        Mojo.Widget.capsLock"
		autoResize			Boolean			Optional	FALSE		DEPRECATED Automatically grow field horizontally
		growWidth			Boolean			Optional	FALSE		Automatically grow field horizontally
		autoResizeMax		Integer			Optional	None		Maximum width of field
		enterSubmits		Boolean			Optional	FALSE		When used in conjunction with multline, if this is set, then enter will submit rather than newline
		limitResize			Boolean			Optional	FALSE		Limit height resize (scrolls text rather than grow field)
		preventResize		Boolean			Optional	FALSE		There will be no resizing in any dimension
		holdToEnable		Boolean			Optional	FALSE		if the textfield is disabled, tapping and holding and releasing will enable it; 
																	if disabled is not set, this is ignored
		focusMode			String			Optional				Insert Mode	"Replace or Insert Mode; choices:
																		Mojo.Widget.focusSelectMode
																		Mojo.Widget.focusInsertMode
																		Mojo.Widget.focusAppendMode
																	Text will either all be selected (Select), or a cursor will 
																	appear where the user tapped (Insert) or cursor goes to end of text (Append)
		changeOnKeyPress	Boolean			Optional	FALSE		If true, sends a propertyChange event on every character change to a field; 
																	otherwise only when focus lost
		textReplacement		Boolean			Optional	TRUE		DEPRECATED Whether to enable the SmartTextEngine services of PalmSysMgr. Enabled by default in the TextField.
		maxLength			Integer			Optional	No Limit	Maximum character length of field; does not apply to multiline fields where an exception will be thrown.
		requiresEnterKey	Boolean			Optional	FALSE		Required Enter key to submit; other navigation will not genterate submit event
		holdToEdit			Boolean			Optional	FALSE		Tap and Hold to focus/edit; Tap only will be ignored
		autoCapitalization	Boolean			Optional	FALSE		DEPRECATED The first letter of each word (determined by whitespace) is capitalized.
		autoReplace			Boolean 		Optional	True		Whether to enable the SmartTextEngine services of PalmSysMgr. Enabled by default in the TextField.
		textCase			String			Optional	Mojo.Widget.steModeSentenceCase		Use this to change the autocapitzliation on the TextField. Options are:
																								Mojo.Widget.steModeSentenceCase (capitalization like a sentence), 
																								Mojo.Widget.steModeTitleCase (capitalize first letter of each word),
																								Mojo.Widget.steModeLowerCase (no capitalization)

#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
	    value				String			Required	Null		Initial and updated value of widget
	    disabled			Boolean			Optional	false		If true, toggle is inactive


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		focus		none			Focus the input part of the text field 
		blur		none			Blur the input part of the text field
		getValue	none			Get the plaintext value of the text field
		setText		String			DEPRECATED Set the plaintext value of the text field; also used by alt char picker to set the value
		setValue		String			Set the plaintext value of the text field
		getCursorPosition	none	Returns on object with {selectionStart: int, selectionEnd: int} that describe the position of the cursor; if start is not 
									equal to end, then there is text selected
		setCursorPosition start, end	Set the cursor position in the input portion of the textfield; if start and end are not the same, then this
										will select the text between START and END; if start and/ or end occur in invalid positions, they will be changed
										to valid positions at the end of the text if they were larger than the size of the value, or at the beginning, if they 
										are smaller than the size of the value; empty text will result in a cursor at the start of the textfield
										


Set `x-mojo-focus-highlight=true` on any parent div to have the focus class applied to it as well when the `TextField` widget becomes focused

	
*/

Mojo.Widget.TextField = Class.create({
	INPUT_WIDTH : 17,
	CHAR_MIN : 3, 
	
	/** @private */	
	initialize: function() {
	},
	
	/** @private */
	setup: function() {
		var timing = Mojo.Timing;
		timing.resume('scene#textField#setup');		
		Mojo.require(this.controller.element, "Mojo.Widget.TextField requires an element");
	  	Mojo.require(!(this.controller.attributes.multiline && this.usePasswordTemplate), "Error: Multiline password fields are not supported.");
		Mojo.require(!(this.controller.attributes.multiline && this.controller.attributes.maxLength), "Error: MaxLength is not supported in multiline text fields.");
		this.initializeDefaultValues();
		
		this.renderWidget(); 
		this.handleKeyDownEvent = this.handleKeyDownEvent.bind(this);
		this.controller.listen(this.controller.element, "keydown", this.handleKeyDownEvent);
		this.handleKeyUpEvent = this.handleKeyUpEvent.bind(this);
		this.controller.listen(this.controller.element, "keyup", this.handleKeyUpEvent);
		this.handleKeyPressEvent = this.handleKeyPressEvent.bind(this);
		this.controller.listen(this.controller.element, "keypress", this.handleKeyPressEvent);
		//need capture mode here so that I can prevent the tap event from triggering a blur on the input area
		//since tapping hint text or the read div should not unfocus the text input field
		this.tapController = this.tapController.bind(this);
		this.controller.listen(this.controller.element, Mojo.Event.tap, this.tapController, true); //make sure focus the inputdiv on all taps in the controller
		
		this.deactivate = this.deactivate.bind(this);
		this.controller.listen(this.controller.scene.sceneElement, Mojo.Event.deactivate, this.deactivate);
		
		if (this.controller.attributes.holdToEnable) {
			this.enableTextfield = this.enableTextfield.bind(this);
			this.controller.listen(this.controller.element, Mojo.Event.holdEnd, this.enableTextfield);
			this.controller.listen(this.controller.element, Mojo.Event.hold, this.enableTextfield);
		}
		
		if (this.controller.attributes.holdToEdit) {
			this.makeTextfieldEditable = this.makeTextfieldEditable.bind(this);
			this.controller.listen(this.controller.element, Mojo.Event.hold, this.makeTextfieldEditable);		
		}
		
		this.commitChanges = this.commitChanges.bind(this);
		this.controller.listen(this.controller.scene.sceneElement, Mojo.Event.commitChanges, this.commitChanges);
		
		this.controller.exposeMethods(['focus', 'blur', 'getValue', 'setText', 'setValue', 'getCursorPosition', 'setCursorPosition', 'setConsumesEnterKey']);
		this.startValue = this.inputArea.value;

		timing.pause('scene#textField#setup');		
		
		
		//used for updating hint text after cut and paste events
		this.clipboardEvent = this.clipboardEvent.bind(this);
		this.controller.listen(this.inputArea, 'paste', this.clipboardEvent);
		this.controller.listen(this.inputArea, 'cut', this.clipboardEvent);
		
		this.updateText = this.updateText.bind(this);
	},
	
	setConsumesEnterKey: function(requires) {
		if (requires) {
			this.inputArea.setAttribute(Mojo.Gesture.consumesEnterAttribute, "true");
		} else {
			this.inputArea.setAttribute(Mojo.Gesture.consumesEnterAttribute, "false");
		}
	},
	
	/**
	 * @deprecated Use Textfield.mojo.setValue() instead.
	 */
	setText: function(text) {
		this.setValue(text);
	},
	
	setValue: function(text) {
		this.inputArea.value = text;
		this.updateText();
	},
	
	updateText: function() {
		var value = this.inputArea.value;
		
		if (this.inputArea.value.length === 0) {
			this.hintTextArea.show();
		} else {
			this.hintTextArea.hide();
		}
		
		this.setInputAreaDivText(value);
		
		this._maybeSendChangeOnKeyPress(); //send this event after we get a copy/ paste event; this is delayed so that the text in the input field is updated as well
		
		//after a cut or paste event, be sure we update the size of the textfield
		this.maybeUpdateTextAreaHeight();
		this.maybeUpdateTextAreaWidth();
	},

	setInputAreaDivText: function(value) {
		if (this.usePasswordTemplate) {
			value = this.buildHiddenInput(value.length);
			this.inputAreaDiv.innerHTML = value;
		} else {
			this.inputAreaDiv.innerText = value;
		}
	},
	
	clipboardEvent: function(e) {
		//don't do anything if disabled
		if (this.disabled) {
			return;
		}
		this.updateText.defer();
	},

	
	deactivate: function() {
		if (this.focused) {
			this.inputArea.blur();
		}
	},
	
	commitChanges: function(e) {
		//send a property change event if the textarea is focused
		//if it was already blurred the event already went out so no need
		if (this.focused) {
			this.maybeSendPropertyChangeEvent(e); //run this now
		}
	},
	
	remeasureCleanup: function(divVisible, inputVisible, hintVisible, originalFloat, timing) {
		//return to actual state
		if (divVisible) {
			this.inputAreaDiv.show();
		} else {
			this.inputAreaDiv.hide();
		}

		if (inputVisible) {
			this.inputArea.show();
		} else {
			this.inputArea.hide();
		}

		if (hintVisible) {
			this.hintTextArea.show();
		} else {
			this.hintTextArea.hide();
		}
		
		if (originalFloat !== 'none') {
			this.controller.element.style["float"]= originalFloat;
		}
		
		//return to actual state
		this.maybeUpdateTextAreaWidth();
		this.maybeUpdateTextAreaHeight();
		timing.pause('scene#textField#remeasure');	
	},

	remeasure: function(e) {
		var timing = Mojo.Timing;
		timing.resume('scene#textField#remeasure');
		
		var forWidth, forHeight;
		var divVisible, inputVisible, hintVisible, divWidth;
		var originalFloat;
		var offsetLeft;
		
		if (!this.focused) {
			return;
		}

		//don't bother measuring if the element is hidden			
		if (!this.controller.element.visible()) {
			timing.pause('scene#textField#remeasure');	
			return;
		}
		
	
		divVisible = this.inputAreaDiv.visible();
		inputVisible = this.inputArea.visible();
		hintVisible = this.hintTextArea.visible();

		//force a width check and update on width
		this.inputAreaOriginalSize = Mojo.View.getDimensions(this.inputArea).width || 0;
		
		if (hintVisible) {
			this.hintTextArea.hide();
		}

		if (!divVisible) {
			this.inputAreaDiv.show();
		}
		
		//setup hint text
		offsetLeft = this.inputAreaDiv.offsetLeft;
		if (this.hintTextArea.style.left !== offsetLeft && offsetLeft !== 0) {
			this.hintTextArea.style.left = offsetLeft+'px';
		}
		
		//get the max div width
		this.inputAreaDiv.style.width = 'auto';
		
		originalFloat = this.controller.element.style['float'];
		if (originalFloat && !originalFloat.blank() && originalFloat !== 'none') {
			this.controller.element.style["float"] = 'none';
		}
		divWidth = Mojo.View.getDimensions(this.inputAreaDiv).width || (this.INPUT_WIDTH * this.CHAR_MIN);
		this.inputAreaDiv.style.width = '';

		
		//if same divwidth, dont remeasure
		if (divWidth === this.inputDivOriginalSize && !this.controller.attributes.multiline) {
			this.remeasureCleanup(divVisible, inputVisible, hintVisible, originalFloat, timing);
			return;
		}
		

		if (this.inputDivOriginalSize !== divWidth) {
			this.inputDivOriginalSize = divWidth;
			//get the real div width now
			divWidth = Mojo.View.getDimensions(this.inputAreaDiv).width;
			if (divWidth === 0) {
				divWidth = this.inputDivOriginalSize;
			}
			this.inputArea.setStyle("width:"+divWidth+"px");
			if (this.growWidth) {
				this.makeWidthGrowable(this.inputArea, this.controller.attributes.limitResize); //reset the shill area measurements
			}
		}
		
		
		if (this.controller.attributes.multiline) {
			this.makeHeightGrowable(this.inputArea, this.controller.attributes.limitResize); //reset the shill area measurements
		}
		
		this.remeasureCleanup(divVisible, inputVisible, hintVisible, originalFloat, timing);
	},
	
	
	focusDiv: function() {
		this.focus();
	},
	
	blur: function() {
		this.inputArea.blur();
	},
	
	getValue: function() {
		return this.inputArea.value;
	},

	
	/**
	 * Focus this text field
	 */	
	focus: function() {
		//this should be focus, but Rob points out that there was some "odd behavior"; run in mojo-framework-lib and hit return
		if (!this.focused && !this.disabled && this.editable) {	
			//first, focus its parent as this may change the styles on the child as well and we would need to have an updated div size
			this.applyFocusClass(this.inputArea);
			this.swap(true);
			this.inputArea.originalFocus();
		}
	},
	
	initializeDefaultValues: function() {
		//DEPRECATED ATTRIBUTES MAPPING; REMOVE IN 2.0
		this.autoFocus = this.controller.attributes.focus || this.controller.attributes.autoFocus;
		this.growWidth = this.controller.attributes.autoResize || this.controller.attributes.growWidth;
		this.modelProperty = this.controller.attributes.modelProperty || Mojo.Widget.defaultModelProperty;
		this.hintText = this.controller.attributes.hintText;
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		this.disabledProperty = this.controller.attributes.disabledProperty || Mojo.Widget.defaultDisabledProperty;
	  	this.disabled = this.controller.model[this.disabledProperty]; //store this so can update later
		this.editable = !this.controller.attributes.holdToEdit;
		this.focusMode = this.controller.attributes.focusMode || Mojo.Widget.focusInsertMode;
		
		if (this.controller.attributes.multiline) {
			this.swap = this.swapMultiline.bind(this);
		} else {
			this.swap = this.swapSingleline.bind(this);
		}
		
		this.textReplacement = true;
		
		if (this.controller.attributes.autoReplace === false) {
			this.textReplacement = false; //have to specifically set it false, sicne default is true
		} else if (this.controller.attributes.textReplacement === false) {
			this.textReplacement = this.controller.attributes.textReplacement;
		} else {
			this.textReplacement = true;
		}
		
		//setup empty functions
		this.maybeUpdateTextAreaHeight = Mojo.doNothing;
		this.maybeUpdateTextAreaWidth = Mojo.doNothing;
	},
	
	enableTextfield: function(event) {
		if (event.type === Mojo.Event.holdEnd) {
			if (this.disabled && this.controller.attributes.holdToEnable) {
				this.disabled = false;
				this.updateEnabledState();
				this.focus();
			}
		} else if (event.type === Mojo.Event.hold && this.disabled && this.controller.attributes.holdToEnable) {
			event.stop();
		}
	},
	
	makeTextfieldEditable: function(event) {
		var highlightTarget;
		if (this.controller.attributes.holdToEdit) {
			this.editable = true;
			highlightTarget = Mojo.Gesture.highlightTarget;
			if (highlightTarget) {
				highlightTarget.removeClassName('selected'); 
			}
			this.updateEditableState(); //how can I get rid of selected before mouse up?
			this.focus();
		}
	},
	
	
	//get the selection start and end, realizing that it may have to be the end of the word itself
	getCursorPosition: function(value) {
		var selectionStart, selectionEnd;
		
		if (!this.inputArea.value || this.inputArea.value.length === 0) {
			//there was no text, so these are not valid selection points; set to word length
			selectionStart = value.length;
			selectionEnd = value.length;
		} else {
			selectionStart = this.inputArea.selectionStart;
			selectionEnd = this.inputArea.selectionEnd;
		}
		return {'selectionStart': selectionStart, 'selectionEnd': selectionEnd};
	},
	
	setCursorPosition: function(start, end) {
		//set to start and end OR to the end of the value
		this.inputArea.selectionStart = start;
		this.inputArea.selectionEnd = end;
	},

	//updates the value of the model and property for the input area
		/** @private */
	handleModelChanged: function() {
		var forWidth = false, forHeight = false;
		var value = this.controller.model[this.modelProperty] || '';
		var originalValue = this.inputArea.value;
		var positions;

		if (value !== this.inputArea.value) {
			positions = this.getCursorPosition(value);
			this.inputArea.value = value;

			//if this is not selected text and focused reset the insertion point
			if (positions.selectionStart === positions.selectionEnd && this.focused) {
				this.setCursorPosition(positions.selectionStart, positions.selectionEnd);
			}
		
			//if this is a password field, properly mask the valye on update
			this.setInputAreaDivText(value);
		}

		
		//if its not focused, put it off until later, the div will correctly resize and on swap
		//we will resize the input field
		if (this.focused && value !== originalValue) {
			this.remeasure();
		}
		
		if (this.controller.model[this.modelProperty] && this.controller.model[this.modelProperty].length > 0) {
			this.hintTextArea.hide();
		} else {
			this.hintTextArea.show();
		}

	  
		if (this.disabled != this.controller.model[this.disabledProperty]) {
			this.disabled = this.controller.model[this.disabledProperty]; //store this so can update later
			this.updateEnabledState();
		}
		
		this.startValue = this.inputArea.value; //if the user intentionally changed the value, don't send a property changed event
				
		//check hint text to see if we have to re-render it
		if (this.hintText !== this.controller.attributes.hintText) {
			//re-render the hinttext
			this.hintTextArea.innerText = (this.controller.attributes.hintText || '');
			this.hintText = this.controller.attributes.hintText;
		}
	},
	
	updateEnabledState: function() {
		if (this.disabled) {
			Mojo.View.makeNotFocusable(this.inputAreaDiv);
			if (this.focused) {
				this.inputArea.blur(); //blur it if its focused
			}
			this.inputAreaDiv.addClassName('palm-textfield-disabled');
		} else {
			Mojo.View.makeFocusable(this.inputAreaDiv);
			this.inputAreaDiv.removeClassName('palm-textfield-disabled');
		}
	},
	
	
	updateEditableState: function() {
		if (!this.editable) {
			Mojo.View.makeNotFocusable(this.inputAreaDiv);
		} else {
			Mojo.View.makeFocusable(this.inputAreaDiv);
		}
	},

	/** @private **/
	_addSteString: function(inString, mode) {
		var txtModesString = inString;
		if (!mode) { //nothing specified, ignore it
			return inString;
		}
		if (txtModesString.length > 0) {
			txtModesString += " ";
		} else {
			txtModesString = "x-palm-ste-mode='";
		}
		txtModesString += mode;
		return txtModesString;
	},
	
	_isNewSteControls: function() {
		//so either one of the new things is defined, or both of the old things are undefined
		if ((this.controller.attributes.textCase !== undefined || this.controller.attributes.autoReplace !== undefined) ||
			(this.controller.attributes.textReplacement === undefined && this.controller.attributes.autoCapitalization === undefined)) {
				return true;
			}
		return false;
	},

	
	/** @private */
	renderWidget: function() {
		var hintText = this.hintText;
		var model;
		var content;
		var textFieldName = this.controller.attributes.inputName || this.controller.attributes.textFieldName || this.divPrefix + '_textField'; //DEPRECATED; remove textFieldName
		var originalValue = this.controller.model[this.modelProperty] || '';
		var newOriginalValue = '', maskedValue = '';
		var template;
		var forWidth = false, forHeight = false;
		var txtReplace = '', autoCaps = '';
		var showHint, showRead, showWrite;
	    var offsetLeft;
		var txtModesString = "";
		var autoReplace = (this.controller.attributes.autoReplace === false) ? Mojo.Widget.steModeReplaceOff : null; 
		//do we really want to cut off length here?
		if (this.controller.attributes.maxLength !== undefined) {
			if (originalValue && originalValue.length > this.controller.attributes.maxLength) {
				originalValue = originalValue.substring(0, this.controller.attributes.maxLength);
			}
		}
		if (this.usePasswordTemplate && originalValue) {
			newOriginalValue = originalValue;
			maskedValue = this.buildHiddenInput(originalValue.length);
		} else {
			newOriginalValue = originalValue;
		}
		
		if (this._isNewSteControls()) {
			if (this.controller.attributes.textCase) {
				txtModesString = this._addSteString(txtModesString, this.controller.attributes.textCase);
			}
			txtModesString = this._addSteString(txtModesString, autoReplace);
			autoCaps = "";
			
			
			if (txtModesString && txtModesString.length > 0) {
				txtModesString += "'";
			}
			
		} else {
			 if (this.textReplacement === false) {
				txtReplace = 'x-palm-disable-ste-all="true"'; //new tag for disabling ste
			}
			if (this.controller.attributes.autoCapitalization) {
				autoCaps = 'x-palm-title-cap="true"'; //new tag for disabling ste
			}
		}
		
		if (this.controller.model[this.modelProperty]) {
			showHint = 'display:none;';
		}
		
		//be smart about initial state of fields
		//to limit the number of relayouts
		if (this.autoFocus && !this.disabled && this.editable) {
			showRead = 'display:none;';
		} else {
			showWrite = 'display:none;';
		}
		
		
		model = {
			'hintTextName': this.divPrefix + '_hintText',
			'textFieldName': textFieldName,
			'divPrefix' : this.divPrefix,
			'mode': this.controller.attributes.modifierState,
			'hiddenTextFieldName': textFieldName || this.divPrefix + '_textField',
			'unmaskedOriginalValue' : originalValue,
			'maskedValue': maskedValue,
			'maxLength': this.controller.attributes.maxLength,
			'txtReplace': txtModesString || txtReplace,
			'showHint': showHint,
			'showWrite': showWrite,
			'showRead': showRead,
			'autoCaps': autoCaps
		};
		
		if (this.usePasswordTemplate) {
			template = '/password/passwordfield';
		} else if (this.controller.attributes.multiline) {
			template = '/textfield/textfield';
		} else {
			template = '/textfield/textfield-single';
		}
		
		content = Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath(template), object: model});
		this.controller.element.innerHTML = content;
		//do all this before we hide textfield!
		this.inputArea = this.controller.get(this.divPrefix+"-write");
		this.inputArea.value = newOriginalValue; //have to do this because of special character issues in lunasysmgr
		
		this.inputAreaDiv = this.controller.get(this.divPrefix+"-read");
		this.setInputAreaDivText(newOriginalValue);

		//this patching is necessary so that any auto focus code will call the widget level focus function
		//that function "swaps" the div and the input field before focus is put on the input field since a hidden element cannot receive focus
		this.inputArea.originalFocus = this.inputArea.focus;
		this.inputArea.focus = this.focus.bind(this);
		this.inputArea.mojo = {};
		this.inputArea.mojo.setText = this.setText.bind(this);
		
		this.blurInputArea = this.blurInputArea.bind(this);
		this.controller.listen(this.inputArea, 'blur', this.blurInputArea);
		this.focusInputArea = this.focusInputArea.bind(this);
		this.controller.listen(this.inputArea, 'focus', this.focusInputArea, true);
		this.focusDiv = this.focusDiv.bind(this);
		this.controller.listen(this.inputAreaDiv, 'focus', this.focusDiv);
		
		this.hintTextArea = this.controller.get(model.hintTextName);
		if (hintText) {
			this.hintTextArea.innerText = hintText;
		}

		offsetLeft = this.inputAreaDiv.offsetLeft;
		if (this.inputAreaDiv.visible() && offsetLeft !== 0) {
			this.hintTextArea.style.left = offsetLeft +'px'; //have to render inputareadiv before; can we wait on this til remeasure?  
		}
		
		
		//if they REALLY want the enter key, set this to true
		if (this.controller.attributes.requiresEnterKey) {
			this.inputArea.setAttribute(Mojo.Gesture.consumesEnterAttribute, "true");
		}
		
		if (this.autoFocus && !this.disabled && this.editable) {
			this.focus();
		} else if (this.disabled) {
			//make the div not focusable if disabled
			this.updateEnabledState();
			this.swap(false);
		} else if (this.controller.attributes.holdToEdit) {
			//make this not focusable
			this.updateEditableState();
			this.swap(false);
		} else {
			this.swap(false);
		}
		return;
	},

	makeVisible: function(element) {
		if (!element.visible()) {
			return element;
		}

		var ancestors = element.ancestors();
		var ancestorsLength = ancestors.length;
		for (var i=0; i < ancestorsLength; i++) {
			var e = ancestors[i];
			if (!e.visible()) {
				return e;
			}
		}
		return undefined;
	},

	
	// this is for blurring and focusing a multi-line textfield, which does not truncate the text when in read-only mode
	swapMultiline: function(isEditMode) {
		var top;
		
		if (isEditMode) {
			//don't update input value here as it is specially formatted for the read view
			if (this.inputAreaDiv.visible()) {
				this.inputAreaDiv.hide();
			}
			
			if (!this.inputArea.visible()) {
				this.inputArea.show();
			}
		} else {
			//don't update input value here as it is specially formatted for the read view
			if (this.inputAreaDiv.visible()) {	
				this.inputAreaDiv.hide();
			}
			if (!this.inputArea.visible()) {
				this.inputArea.show();
			}
			top = this.inputArea.offsetTop;		
			this.inputArea.hide();
			this.inputAreaDiv.show();
			//this.inputAreaDiv.style['padding-top'] = (top-this.inputAreaDiv.offsetTop) + 'px';
		}
	},
	
	
	// this is for blurring and focusing a single line textfield, which truncates the text when in read only mode
	swapSingleline: function(isEditMode) {
		if (isEditMode) {
			//show the textfield
			//hide the div	
			this.inputAreaDiv.hide();
			this.inputArea.show();
		} else {
			//hide the textfield
			//show the div
			this.inputArea.hide();
			this.setInputAreaDivText(this.inputArea.value);
			if (!this.usePasswordTemplate) {
				this.inputAreaDiv.setStyle('width:'+this.inputDivOriginalSize+"px");
			}
			this.inputAreaDiv.show();
		}
	},
	
	/** @private */
	applyFocusClass: function(target) {
		var parentTarget = Mojo.View.findParentByAttribute(target, this.controller.document, Mojo.Widget.focusAttribute);
		if (parentTarget) {
			this.focusedParentElement = parentTarget;
			Element.addClassName(parentTarget, 'focused');
		}
	},
	
		/** @private */
	focusInputArea: function(event) {
		if (!this.disabled && this.editable) {
			this.focused = true;
			this.remeasure();
			this.disabled = this.controller.model[this.disabledProperty];			
			if (this.focusMode === Mojo.Widget.focusSelectMode) {
				this.inputArea.select();
			} else if (this.focusMode === Mojo.Widget.focusAppendMode) {
					//set the insertion point to the end of the word regardless of position
					this.inputArea.selectionStart = this.inputArea.value.length;
					this.inputArea.selectionEnd = this.inputArea.value.length;
			} else {
				//if the user has tapped the input field then we take their tap to be the insertion point
				if (this.inputArea.value && this.inputArea.value.length > 0) {
					if (this.downX !== undefined && this.downY !== undefined) {
						Mojo.Gesture.simulateClick(this.controller.element, this.downX, this.downY);
					} else { //otherwise the textfield has become focused by either autofocus or being focused by an api call so,
						//set the insertion point to the end of the word
						this.inputArea.selectionStart = this.inputArea.value.length;
						this.inputArea.selectionEnd = this.inputArea.value.length;
					}
				}
				this.downX = undefined;
				this.downY = undefined; //we've used these, so reset them
			}
	   		this.startValue = this.inputArea.value; //hook into change event instead of property change and see if cleaner
 		 	return false;
    	} else {
      		return true;
		}
	},

	
	tapController: function(event) {	
		if(!this.disabled && this.editable) {
			
			this.downX = event.down.pageX;
			this.downY = event.down.pageY;
			
			//Stop the event, but not if it's in the input area so that the cursor can move properly
			if (event.target.id !== this.inputArea.id) {
				Event.stop(event); //kill the event, we don't want to lose focus
			}
			this.focus();
		}
	},
	
	removeFocusClass: function() {
		Element.removeClassName(this.focusedParentElement, 'focused');
		this.focusedParentElement = undefined;
	},
	
	/** @private */
	blurInputArea: function(event) {
		if (this.focused) {
			var originalEvent = this.originalEventOverride || event;
			this.originalEventOverride = undefined;
			this.removeFocusClass(); //remove focus from the parent
			this.updateText();
			this.swap(false);
			this.inputArea.wasSelected = false;
			this.maybeSendPropertyChangeEvent(originalEvent);
			this.focused = false;
			
			if (this.controller.attributes.holdToEdit) {
				this.editable = false;
			}
			this.updateEnabledState();
			this.updateEditableState();
		}
		return false;
	},
	
	sendPropertyChangeEvent: function(originalEvent, value, originalValue) {
		this.controller.model[this.modelProperty] = value || this.inputArea.value;
		Mojo.Event.sendPropertyChangeEvent(this.controller.element, this.controller.model, this.modelProperty, this.controller.model[this.modelProperty], originalValue, originalEvent);
	},

	/** @private */
	maybeSendPropertyChangeEvent: function(originalEvent) {
		var value, originalValue;
		
		if (this.controller.attributes.changeOnKeyPress) {
			return;
		}		
		value = this.inputArea.value;

		if (this.inputArea.value === this.startValue) {
			return;
		}

		originalValue = this.startValue;
				
		this.startValue = this.inputArea.value; //always update after before sending the event in case this propertyChange triggers another propertyChange event which is synchronous
		this.sendPropertyChangeEvent(originalEvent, value, originalValue);
    	
    	return false;
	},
	
	sendChanges: function(triggeringEvent) {
		//we don't want this to send out a property change if it tapped the alt char picker
		if (!Mojo.View.getParentWithAttribute(triggeringEvent.target, 'x-mojo-element', 'CharSelector')) {
			this.maybeSendPropertyChangeEvent(triggeringEvent);
		}
	},
	
		/** @private */
	resetHintText: function() {
		this.hintTextArea.show();
	},

	/** @private */	
	handleFirstKeyInputArea: function() {
		this.hintTextArea.hide();
	},
	
	
	
		/** @private */
	handleDeleteKeyPreEvent: function() {				
		if (this.inputArea.value.length === 0) {
			//show the hint text if its hiding
			if (!this.hintTextArea.visible()) {
				this.hintTextArea.show();
			}
			return true;
		}		
		return false;
	},
	
	/** @private */
	handleKeyPressEvent: function(event) {
		var charsAllow = this.controller.attributes.charsAllow;

		if (Object.isFunction(charsAllow) && !charsAllow(event.charCode)) {
			Event.stop(event);
			return false;
		}

		this._handleHintText(event.keyCode);
		this.maybeUpdateTextAreaHeight();
	},
	
	handleSelectionEvent: function(event) {
		this.range = this.controller.window.getSelection();
		this.range = (this.range && this.range.toString().length) || 0;
	},
	
		/** @private */
	handleKeyUpEvent: function(event) {
		var code = event.keyCode;
		//resize width ahead of time, since we may be blurring here
		if (this.controller.attributes.multiline){
			this.maybeUpdateTextAreaHeight();
		}
		this.maybeUpdateTextAreaWidth();
		
		if (code === Mojo.Char.enter && (!this.controller.attributes.multiline || 
				(this.controller.attributes.multiline && this.controller.attributes.enterSubmits)))  {
			this.originalEventOverride = event; //set this up to pass on for the propertyChange event later; we only need this if we are doing propertyChange on commit
			
			//blurring the text field sends the event and empties it
			//make sure we still advance focus
			if (this.controller.attributes.enterSubmits && this.controller.attributes.multiline && !this.controller.attributes.requiresEnterKey) {
				this.advanceFocus(); //on key up, send an event to forward focus
			} else {
				this.inputArea.blur();
			}
		}

		if (Mojo.Char.isDeleteKey(code)) {
			this.handleDeleteKeyPreEvent();
		}
		this._maybeSendChangeOnKeyPress(event);
	},
	
	
	_handleHintText: function(code) {
		if (Mojo.Char.isDeleteKey(code)) {
				this.handleDeleteKeyPreEvent();
		} else if (Mojo.Char.isPrintableChar(code, true)) {
				this.handleFirstKeyInputArea();
		}
	},
	
	_maybeSendChangeOnKeyPress: function(event) {
		var originalValue;
		if (this.controller.attributes.changeOnKeyPress && ((event && event.keyCode === Mojo.Char.enter) || this.startValue !== this.inputArea.value)) {
			originalValue = this.startValue;
			this.startValue = this.inputArea.value;
		    this.sendPropertyChangeEvent(event, this.inputArea.value, originalValue);
		}
	},
	
	advanceFocus: function() {
		Mojo.View.advanceFocus(this.controller.scene.sceneElement, this.inputArea);
	},
	
	/** @private */
	handleKeyDownEvent: function(event) {
		var code = event.keyCode; 
		var target = event.target;
		//backspace or delete
		//this prevents an extra newline from being entered when we are going to submit the text via enter in a multiline field
		if (code === Mojo.Char.enter) {
			if (!this.controller.attributes.multiline || (this.controller.attributes.enterSubmits && this.controller.attributes.multiline)) {
				Event.stop(event);
			}
		}

		if (Mojo.Char.isDeleteKey(code)) {
			this.handleDeleteKeyPreEvent();
		}
		if (this.controller.attributes.multiline) {
			this.maybeUpdateTextAreaHeight();
		}
	},

	buildHiddenInput: function(len) {
	  var hidden = "";
	  for (var i = 0; i < len; i++) {
	    hidden += "&#8226;";
	  }
	  return hidden;
	},
	
	maybeUpdateTextAreaWidthFunc: function(originalWidth, element, shill, limitResize){
		var regX;
		var s = element.value;
		var length = Math.max(s.length, this.CHAR_MIN);
		var shillwidth = length * this.INPUT_WIDTH;
		if (shillwidth === 0 || (limitResize && shillwidth < originalWidth)) {
			return;
		}
		element.setStyle({
			width: shillwidth+"px"
		}); 
	},
	
	cleanup: function() {
		this.controller.stopListening(this.controller.scene.sceneElement, Mojo.Event.deactivate, this.deactivate);
		this.controller.stopListening(this.controller.scene.sceneElement, Mojo.Event.commitChanges, this.commitChanges);
		this.controller.stopListening(this.inputArea, 'paste', this.clipboardEvent);
		this.controller.stopListening(this.inputArea, 'cut', this.clipboardEvent);
		
		this.controller.stopListening(this.controller.element, "keydown", this.handleKeyDownEvent);
		this.controller.stopListening(this.controller.element, "keyup", this.handleKeyUpEvent);
		this.controller.stopListening(this.controller.element, "keypress", this.handleKeyPressEvent);
		this.controller.stopListening(this.controller.element, Mojo.Event.tap, this.tapController, true); //make sure focus the inputdiv on all taps in the controller
		
		if (this.controller.attributes.holdToEnable) {
			this.controller.stopListening(this.controller.element, Mojo.Event.holdEnd, this.enableTextfield);
			this.controller.stopListening(this.controller.element, Mojo.Event.hold, this.enableTextfield);
		}

		if (this.controller.attributes.holdToEdit) {
			this.controller.stopListening(this.controller.element, Mojo.Event.hold, this.makeTextfieldEditable);
		}
		
		this.controller.stopListening(this.inputArea, 'blur', this.blurInputArea);
		this.controller.stopListening(this.inputArea, 'focus', this.focusInputArea, true);
		this.controller.stopListening(this.inputAreaDiv, 'focus', this.focusDiv);
	},
	
	maybeUpdateTextAreaHeightFunc: function(element, limitResize, originalHeight){
		var wasVisible = element.visible();
		var maxedOut = (element.clientHeight === originalHeight && limitResize);
        //allow textarea to grow naturally without any height styles to get the
        //real scroll and offset heights
		element.setStyle({'height':'auto'});
		if (!wasVisible) {
			element.show();
		}
		

		//reduce height
		while (element.rows > 1 && element.scrollHeight <= element.clientHeight) { //don't shrink past 1 row
			element.rows--;
		}
		//increase height
		while ((element.scrollHeight > (element.clientHeight + 1)) && !maxedOut) { //yes, this is a hack to get around some styling and some webkit 3 weirdness
			element.rows++;
			if (element.clientHeight === originalHeight && limitResize) {
				maxedOut = true;
			}
		}
		// adjust width due to webkit strangeness in textarea width
		this.inputAreaDiv.style.width = (Mojo.View.getDimensions(element).width-6)+"px";
		
		// workaround for a 1px jump
		if(element.rows > 1) {			
			element.style.marginTop = "13px"; // usually 12px
			this.inputAreaDiv.style.paddingBottom = "13px"; // usually 16px			
		} else {
			element.style.marginTop = "12px";
			this.inputAreaDiv.style.paddingBottom = "16px";
		}
		
		//update the read div content
		this.inputAreaDiv.innerText = element.value;
		
		if (!wasVisible) {
			element.hide();
		}
	},
	
	makeWidthGrowable: function(element, limitResize){
		var shillElm;
		var styleSetter = {};
		var oldShill;
		var maybeUpdate;
		var visible = element.visible();
		var origWidth;
		var st;
		
		if (!visible) {
			element.show();
		}

		this.originalWidth = element.offsetWidth;
		shillElm = new Element('div');
		shillElm.className = "TextAreaShill";
		oldShill = this.controller.get(element.id + "_shill");
		
		if (oldShill) {
			shillElm.innerText = oldShill.innerText;
			oldShill.remove();
		}
		
		shillElm.id = element.id + "_shill";
		element.parentNode.insert({top: shillElm});
		shillElm.hide();
	    
		['width', 'font-size', 'font'].each(function(style){
			st = element.getStyle(style);
			styleSetter[style] = element.getStyle(style);
		});
		shillElm.setStyle(styleSetter);
		origWidth = this.originalWidth || 0;
		maybeUpdate = this.maybeUpdateTextAreaWidthFunc;
		this.maybeUpdateTextAreaWidth = maybeUpdate.bind(this, origWidth, element, shillElm, limitResize);

		
		if (!visible) {
			element.hide();
		}
	},
	
	
	makeHeightGrowable: function(element, limitResize) {
		var maybeUpdate;
		var visible = element.visible();
		var originalHeight;
		
		if (!visible) {
			element.show();
		}
		
		//check for a max height on the parent div; thats as big as this can get
		if (limitResize) {
			originalHeight = this.controller.element.getStyle('max-height');
			if (originalHeight) {
				originalHeight = parseInt(originalHeight, 10);
			}
			element.setStyle({'max-height':originalHeight+'px'});
			this.inputAreaDiv.setStyle({'max-height':originalHeight+'px'});
		}
		
	    //Maybe this should be on change somehow, though i think change is only triggered
	    //with a blur
		if (!this.controller.attributes.preventResize) {
			element.rows = element.rows || 1;
			element.setStyle({'overflow':'hidden'}); //no scrollbar in textarea
			maybeUpdate = this.maybeUpdateTextAreaHeightFunc;
			this.maybeUpdateTextAreaHeight = maybeUpdate.bind(this, element, limitResize, originalHeight);
		}
		if (!visible) {
			element.hide();
		}
	}
});

