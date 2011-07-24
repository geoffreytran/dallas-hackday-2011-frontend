

/**
 * @name widget_passwordfield.js
 * @fileOverview This is a widget that wraps the functionality of an input type = text 
 * with hint text and text correction behavior;
 * See {@link Mojo.Widget.PasswordField} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####
If you need a text field that will be used for passwords or some other type of confidential information, 
the Password Field provides many of the Text Field features but masks the display. Any entered text is 
displayed as a bullet, or "•" character. As with the Text Field the framework handles all of the 
editing logic within the field and generates a `Mojo.Event.propertyChange` event when the field has been updated.

#### Declaration ####

		<div x-mojo-element="PasswordField" id="listId" class="listClass" name="listName"></div>
		
		Properties			Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element		Required	PasswordField	Declares the widget as type 'PasswordField' 
	    id					Required	Any String		Identifies the widget element for use when instantiating or rendering
	    class				Optional	Any String		Provide your own unique class and override the frameworks styles
	    name				Optional	Any String		Add a unique name to the passwordfield widget; generally used in templates when used 

    
#### Events ####

		Mojo.Event.listen("passwordfieldId", Mojo.Event.propertyChange, this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
		Mojo.Event.propertyChange	{model:model, property:property, value:value, oldValue: oldValue, originalEvent: originalEvent}   


#### Instantiation ####
    
		this.controller.setupWidget("passwordfieldId",
		     this.attributes = {
		         hintText: $L("Type Password")
		     },
		     this.model = {
		         value: ""
		});


#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
	    modelProperty       String			Optional    "value"       Model property name for selector value
	    hintText            String			Optional    None        Initially displayed string; supplanted by model value if supplied
	    textFieldName       String			Optional    None        DEPRECATED If supplied, the textarea will have this name, so that when it is serialized, 
																		the property can be easily pulled out
		inputName			String			Optional	None		If supplied, the textarea will have this name, so that when it is serialized, the property can be easily pulled out
		charsAllow			Function		Optional	None		Function must return 'true' to allow input character, or 'false' if not allowed; 
																		note: this event is sent as a result of a keyPress event, so you must check 
																		against key codes matching ASCII characters.
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
		textReplacement		Boolean			Optional	FALSE		Whether to enable the SmartTextEngine services of PalmSysMgr. Disabled by default 
																	in the PasswordField. Not recommended for use with PasswordField.
		maxLength			Integer			Optional	No Limit	Maximum character length of field; does not apply to multiline fields where it will be ignored
		requiresEnterKey	Boolean			Optional	FALSE		Required Enter key to submit; other navigation will not genterate submit event
		holdToEdit			Boolean			Optional	FALSE		Tap and Hold to focus/edit; Tap only will be ignored
		autoCapitalization	Boolean			Optional	FALSE		The first letter of each word (determined by whitespace) is capitalized. 
																	Not recommended for use with PasswordField.


#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
	    value				String			Required    Null        Initial and updated value of widget


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		focus		none			Focus the input part of the password field 
		blur		none			Blur the input part of the password field
		getValue	none			Get the plaintext value of the password field
		setText		String			DEPRECATED Set the plaintext value of the text field
		setValue		String			Set the plaintext value of the text field
		getCursorPosition	none	Returns on object with {selectionStart: int, selectionEnd: int} that describe the position of the cursor; if start is not 
									equal to end, then there is text selected
		setCursorPosition start, end	Set the cursor position in the input portion of the textfield; if start and end are not the same, then this
										will select the text between START and END; if start and/ or end occur in invalid positions, they will be changed
										to valid positions at the end of the text if they were larger than the size of the value, or at the beginning, if they 
										are smaller than the size of the value; empty text will result in a cursor at the start of the textfield


Set `x-mojo-focus-highlight=true` on any parent div to have the focus class applied to it as well when the `PasswordField` widget becomes focused

@field
*/

//PasswordField is just another mode of TextField
Mojo.Widget.PasswordField = function () {
  this.usePasswordTemplate = true;
  Mojo.Widget.TextField.apply(this);
};

Mojo.Widget.PasswordField.prototype = Mojo.Widget.TextField.prototype;
