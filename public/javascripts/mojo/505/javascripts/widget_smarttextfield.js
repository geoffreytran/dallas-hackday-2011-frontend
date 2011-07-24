/**
 * @name widget_smartextfield.js
 * @fileOverview This is a widget that wraps special the functionality of an input type = text with hint text and text correction behavior. 
   The field can auto grow vertically or horizontally.  
 * See {@link Mojo.Widget.TextField} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

emoticons			Boolean			Optional	true		Enable emoticons on this field
autoReplace			Boolean 		Optional	true		Whether to enable the SmartTextEngine services of PalmSysMgr. Enabled by default in the TextField.
textCase			String			Optional	Mojo.Widget.steModeSentenceCase		Use this to change the autocapitzliation on the TextField. Options are:
																						Mojo.Widget.steModeSentenceCase (capitalization like a sentence), 
																						Mojo.Widget.steModeTitleCase (capitalize first letter of each word),
																						Mojo.Widget.steModeLowerCase (no capitalization)
runTextLinker		Boolean			Optional	FALSE		Enable textlinker system feature for parsing phone numbers and url's
modifierState		String			Optional	None		"initial state of modifier keys for this field. Can be: 
														        Mojo.Widget.numLock,
														        Mojo.Widget.capsLock,
														        Mojo.Widget.shiftLock,
																Mojo.Widget.shiftSingle,
																Mojo.Widget.numSingle,
																Mojo.Widget.normal
focusMode			String			Optional				Insert Mode	"Replace or Insert Mode; choices:
																Mojo.Widget.focusAppendMode
															Text will either all be selected (Select), or a cursor will appear where the user tapped (Insert) or cursor goes to end of text (Append)
*/



Mojo.Widget.SmartTextField = Class.create({
	MULTILINE_TEMPLATE: '/smarttextfield/textfield-multi',
	SINGLELINE_TEMPLATE: '/smarttextfield/textfield-single',
	DISABLED_TEXT: 'palm-textfield-disabled',
	EDITABLE_TEXT: 'editable',
	
	initialize: function() {
		
	},
	
	setup: function() {
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		this._setupProperties();
		this._renderWidget();
		this._setupListeners();
		this.controller.exposeMethods(['getValue', 'setValue', 'focus', 'blur', 'setText']);
		this._setupGetters();
	},
	
	setText: function(value) {
		this.setValue(value);
	},
	
	//take care of hold to edit as it has special disabled behavior
	_setupHoldToEdit: function() {
		//set hold to edit information
		if (this.controller.attributes.holdToEdit) {
			this.controller.model[this.disabledProperty] = true;
		}	
	},
	
	_setupProperties: function() {
		this.modelProperty = this.controller.attributes.modelProperty || Mojo.Widget.defaultModelProperty;
		this.hintText = this.controller.valueFromModelOrAttributes('hintText', '');
		this.disabledProperty = this.controller.attributes.disabledProperty || Mojo.Widget.defaultDisabledProperty;
	},
	
	_enableTextfield: function(event) {
		if (event.type === Mojo.Event.holdEnd) {
			if (this.disabled && this.controller.attributes.holdToEdit) {
				this.controller.model[this.disabledProperty] = false;
				this._updateDisabledState();
				this.writeDiv.focus();
			}
		} else if (event.type === Mojo.Event.hold && this.disabled && this.controller.attributes.holdToEdit) {
			event.stop();
		}
	},
	
	_updateDisabledState: function() {
		this.disabled = this.controller.model[this.disabledProperty];
		if (this.disabled) {
			Mojo.View.makeNotFocusable(this.writeDiv);
			this.writeDiv.blur();
			this.writeDiv.addClassName(this.DISABLED_TEXT);
			this.writeDiv.removeClassName(this.EDITABLE_TEXT);
		} else {
			Mojo.View.makeFocusable(this.writeDiv);
			this.writeDiv.removeClassName(this.DISABLED_TEXT);
			this.writeDiv.addClassName(this.EDITABLE_TEXT);
		}
	},
	
	_setupGetters: function() {
		//attaching value to the element's mojo
		if (!this.controller.element.mojo){
			this.controller.element.mojo = {};
		}
		
		this.controller.element.mojo.__defineGetter__("value", this.getValue.bind(this));
		this.controller.element.mojo.__defineSetter__("value", this.setValue.bind(this));
		this.controller.element.mojo.__defineGetter__("innerHTML", this.getInnerHTML.bind(this));
		this.controller.element.mojo.__defineSetter__("innerHTML", this.setInnerHTML.bind(this));
	},
	
	_updateHintText: function(code) {
		var val = this.getValue();
		
		if (code) {
			if (code === Mojo.Char.deleteKey || code === Mojo.Char.backspace) {
				if (val && val.length <= 1) {
					this.hintDiv.show();
				}
			} else if (Mojo.Char.isPrintableChar(code, true)) {
				this.hintDiv.hide();
			}
		} else {
			if (val.blank()) {
				this.hintDiv.show();
			} else {
				this.hintDiv.hide();
			}
		}
	},
	
	/** in framework version 2, make these getters and setters on value **/
	getValue: function() {
		return this.writeDiv.innerText;
	},
	
	
	/** make it possible to get html text; making sure its safe is on the client **/
	getInnerHTML: function() {
		return this.writeDiv.innerHTML;
	},
	
	
	/** make it possible to set html text; making sure its safe is on the client **/
	setInnerHTML: function(html) {
		var emoticons;

		if (!this.textIndexerOptions) {
			emoticons = this.controller.attributes.emoticons;
			this.textIndexerOptions = {};
			if (typeof emoticons !== "undefined") {
				this.textIndexerOptions.emoticon = emoticons;
			}
		}

		if (html && this.controller.attributes.runTextLinker) {	
			html = Mojo.Format.runTextIndexer(html);
		}

		//only bother setting it if its different
		if (this.writeDiv.innerHTML !== html) {
			this.writeDiv.innerHTML = html;
		}

		//update hint text when you do this!
		this._updateHintText(); //no key code; investigate the value
		this._updateModel();
	},
	
	// in multiline, add <br>'s to get a newline, otherwise use an empty char to keep this on 1 line
	//also replace nbsp; with ' ' as this causes issues for the textlinker (char code 160)
	_replaceNewlines: function(txt) {
		var replacement = (this.controller.attributes.multiline) ? '<br>' : ''; 
		txt =  txt && txt.replace(/\n/g, replacement);
		return txt && txt.replace(new RegExp(String.fromCharCode(160), 'g'), ' ');
	},
	
	/** in framework version 2, make these getters and setters on value **/
	setValue: function(text) {
		//replace newlines with br
		text = (text && text.escapeHTML()) || '';
		this.setInnerHTML(this._replaceNewlines(text));
	},
	
	_setupListeners: function() {
		this._handleTap = this._handleTap.bind(this);
		this.controller.listen(this.smartDiv, Mojo.Event.tap, this._handleTap);
		this._handleFocus = this._handleFocus.bind(this);
		this.controller.listen(this.writeDiv, 'focus', this._handleFocus);
		this._handleBlur = this._handleBlur.bind(this);
		this.controller.listen(this.writeDiv, 'blur', this._handleBlur);
		this._handleKeyDown = this._handleKeyDown.bind(this);
		this.controller.listen(this.writeDiv, 'keydown', this._handleKeyDown);
		this._handleKeyUp = this._handleKeyUp.bind(this);
		this.controller.listen(this.writeDiv, 'keyup', this._handleKeyUp);
		this._enableTextfield = this._enableTextfield.bind(this);
		this.controller.listen(this.controller.element, Mojo.Event.holdEnd, this._enableTextfield);
		this.controller.listen(this.controller.element, Mojo.Event.hold, this._enableTextfield);
		
		//used for updating hint text after cut and paste events
		this._clipboardEvent = this._clipboardEvent.bind(this);
		this.controller.listen(this.writeDiv, 'paste', this._clipboardEvent);
		this.controller.listen(this.writeDiv, 'cut', this._clipboardEvent);
		this._updateText = this._updateText.bind(this);
		
		//framework events
		this.deactivate = this.deactivate.bind(this);
		this.controller.listen(this.controller.scene.sceneElement, Mojo.Event.deactivate, this.deactivate);
		this.commitChanges = this.commitChanges.bind(this);
		this.controller.listen(this.controller.scene.sceneElement, Mojo.Event.commitChanges, this.commitChanges);
	},
	
	commitChanges: function(e) {
		//send a property change event if the textarea is focused
		//if it was already blurred the event already went out so no need
		this._maybeSendPropertyChangeEvent(e);
	},
	
	_clipboardEvent: function(e) {
		//don't do anything if disabled
		if (this.disabled) {
			return;
		}
		//otherwise wait an event while this goes into the field
		this._updateText.defer();
	},
	
	_updateText: function() {
		this._updateHintText();
		this._updateModel();
	},
	
	_createSteMode: function(attributes) {
		var steMode = 'x-palm-ste-mode=';
		var modes = '';
		modes += '"';
		if (attributes.length > 0) {
			//look at each attribute
			modes += attributes.toString();
			modes = modes.replace(/,/g, ' ');
			modes = modes.replace(/^\s*|\s*$/g,'');
		}
		modes += '"';
		return (steMode += modes);
	},
	
	_renderWidget: function() {
		var template = this.controller.attributes.multiline? this.MULTILINE_TEMPLATE : this.SINGLELINE_TEMPLATE;
		var hintTextStyle = this.hintText.blank() ? 'display:none;': '';
		var autoReplace = (this.controller.attributes.autoReplace === false) ? Mojo.Widget.steModeReplaceOff : ''; 
		var textCase = this.controller.attributes.textCase || '';
		var textLinkerMode = (this.controller.attributes.runTextLinker)? Mojo.Widget.textLinkerOn : Mojo.Widget.textLinkerOff;
		var steMode = this._createSteMode([autoReplace, textCase, textLinkerMode]);
		var modifierState = this.controller.attributes.modifierState;
		var content;
		
		content = Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath(template), object: this.controller.model, attributes: {'steMode': steMode, 'hintText': this.hintText, 'hintTextStyle': hintTextStyle, 'writeDivId': this.divPrefix+'_writeDiv', 'hintDivId': this.divPrefix+'_hintDiv', 'smartDivId': this.divPrefix+'_smartDiv', modifierState: modifierState}});
		this.controller.element.innerHTML = content;
		this.writeDiv = this.controller.get(this.divPrefix+'_writeDiv');
		this.hintDiv = this.controller.get(this.divPrefix+'_hintDiv');
		this.smartDiv = this.controller.get(this.divPrefix+'_smartDiv');
		
		this.setValue(this.controller.model[this.modelProperty]);
		
		//this is in here because we dont have javascript key events; this is the same
		//workaround as in regular textfield
		this.writeDiv.mojo = {};
		this.writeDiv.mojo.setText = this.setText.bind(this);
		this.writeDiv.mojo.__defineGetter__("value", this.getValue.bind(this));
		this.writeDiv.mojo.__defineSetter__("value", this.setValue.bind(this));
		this._updateHintText();
		this._setupHoldToEdit();
		this._updateDisabledState(); //make sure disabled or hold to edit fields get updated
	},
	
	cleanup: function() {
		this.controller.stopListening(this.smartDiv, Mojo.Event.tap, this._handleTap);
		this.controller.stopListening(this.writeDiv, 'focus', this._handleFocus);
		this.controller.stopListening(this.writeDiv, 'blur', this._handleBlur);
		this.controller.stopListening(this.writeDiv, 'keydown', this._handleKeyDown);
		this.controller.stopListening(this.writeDiv, 'keyup', this._handleKeyUp);
		this.controller.stopListening(this.controller.element, Mojo.Event.holdEnd, this._enableTextfield);
		this.controller.stopListening(this.controller.element, Mojo.Event.hold, this._enableTextfield);
		this.controller.stopListening(this.writeDiv, 'paste', this._clipboardEvent);
		this.controller.stopListening(this.writeDiv, 'cut', this._clipboardEvent);
		this.controller.stopListening(this.controller.scene.sceneElement, Mojo.Event.deactivate, this.deactivate);
		this.controller.stopListening(this.controller.scene.sceneElement, Mojo.Event.commitChanges, this.commitChanges);
	},
	
	_maybeSendPropertyChangeEvent: function(e){
		//if its change on key press, get whatever is currently in there and compare it to what is now in there
		//otherwise look at value when first focused
		var curModelValue, curValue, isKeyEvent;
		
		if (!this.focused) {
			return;
		}
		
		curModelValue = (this.controller.attributes.changeOnKeyPress) ? this.controller.model[this.modelProperty] : this._startValue;
		curValue = this.getValue();
		isKeyEvent = (e.type === 'keyup' || e.type === 'keydown' || e.type === 'keypress');
		
		if (curValue !== curModelValue) {
			this._updateModel();
			if ((isKeyEvent && this.controller.attributes.changeOnKeyPress) || !isKeyEvent) { 
				this._sendPropertyChangeEvent(e, curValue, curModelValue);
			}
		}
	},
	
	_sendPropertyChangeEvent: function(originalEvent, value, originalValue) {
		this.controller.model[this.modelProperty] = value || this.getValue();
		Mojo.Event.sendPropertyChangeEvent(this.controller.element, this.controller.model, this.modelProperty, this.controller.model[this.modelProperty], originalValue, originalEvent);
	},
	
	_handleKeyDown: function(e) {
		this._updateHintText(e.keyCode);
			
		if (this.controller.attributes.multiline) {
			return;
		}
		
		if (e.keyCode === Mojo.Char.enter) {
			e.stop();
			this.writeDiv.blur();
		}
	},
	
	_handleKeyUp: function(keyEvent) {
		if (keyEvent.keyCode === Mojo.Char.escape) { //ignore back gesture
			return;
		}
		this._maybeSendPropertyChangeEvent(keyEvent);
		
		this._updateHintText(); //in case there was a select all and delete!
	},
	
	_updateModel: function() {
		this.controller.model[this.modelProperty] = this.getValue();
	},
	
	handleModelChanged: function() {
		if (!this.controller.attributes.hintText) {
			this.hintText = this.controller.model.hintText || '';
			this.hintDiv.innerText = this.hintText; //update hint text
		}
		this.setValue(this.controller.model[this.modelProperty]);
		this._setupHoldToEdit();
		this._updateDisabledState();
		this._startValue = this.getValue();
		this.textIndexerOptions = undefined;
	},
	
	
	_handleTap: function(e) {
		if (this.disabled) {
			return;
		}
		
		if (e.target === this.hintDiv) {
			e.stop();	
			this.writeDiv.focus();
		} else {
			e.stopPropagation();
		}
	},
	
	deactivate: function(e) {
		this._maybeSendPropertyChangeEvent(e);
	},
	
	focus: function() {
		this.writeDiv.focus();
	},
	
	blur: function() {
		this.writeDiv.blur();
	},
	
	_handleBlur: function(e) {
		this.writeDiv.removeClassName(this.EDITABLE_TEXT);
		this.writeDiv.removeClassName('editable-one-line');
		if (!this.controller.attributes.multiline) {
			this.writeDiv.addClassName("truncating-text");
		}
		if (this.focusedParentElement) {
			Element.removeClassName(this.focusedParentElement, 'focused');
		}
		
		this._maybeSendPropertyChangeEvent(e);
		this._setupHoldToEdit();
		this._updateDisabledState(); //make sure disabled or hold to edit fields get updated
		
		if (this._startValue) {
			delete this._startValue; //clear this on blur after maybe sending property change event
		}
			
		this.focused = false;
	},
	
	_handleFocus: function(e) {
		
		if (this.controller.attributes.focusMode === Mojo.Widget.focusAppendMode) {
			var unselect = function() {
				var sel = this.controller.window.getSelection();
				sel.collapseToEnd();
			}.bind(this);

			unselect.defer();
		}

		
		if (!this.controller.attributes.changeOnKeyPress) {
			this._startValue = this.getValue();
		}
		
		if (this.disabled) {
			return;
		}
		if (!this.focusedParentElement) {
			this.focusedParentElement = Mojo.View.findParentByAttribute(this.writeDiv, this.controller.document, Mojo.Widget.focusAttribute);
		}
		if (this.focusedParentElement) {
			Element.addClassName(this.focusedParentElement, 'focused');
		}
		if (!this.controller.attributes.multiline) {
			this.writeDiv.addClassName('editable-one-line');
		}
		this.writeDiv.removeClassName('truncating-text');
		this.writeDiv.addClassName(this.EDITABLE_TEXT);
		this.focused = true;
	}
	
});