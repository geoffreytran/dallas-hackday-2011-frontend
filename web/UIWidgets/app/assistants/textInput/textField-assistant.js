/*
 *    TextFieldAssistant - Displays text field widget.  User can input a string of text and press the Get Value
 *    button to display the input text.
 *   
 *    Arguments:
 *        none                           
 *        
 *    Functions:
 *        constructor         No-op
 *        setup               Sets up a text field widget.
 *        activate            No-op
 *        deactivate          No-op
 *        cleanup             No-op
 *        handleClicked		  Retrieves the value of the text field widget.
 *        propertyChanged     Get the value of the text field widget when focus has left it.
*/

function TextFieldAssistant(argFromPusher) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}
    
TextFieldAssistant.prototype.setup = function() {		
    /* set the widget up here */
		var attributes = {
				hintText: 'hint',
				textFieldName:	'name', 
				modelProperty:		'original', 
				multiline:		false,
				disabledProperty: 'disabled',
				focus: 			true, 
				modifierState: 	Mojo.Widget.capsLock,
				//autoResize: 	automatically grow or shrink the textbox horizontally,
				//autoResizeMax:	how large horizontally it can get
				//enterSubmits:	when used in conjunction with multline, if this is set, then enter will submit rather than newline
				limitResize: 	false, 
				holdToEnable:  false, 
				focusMode:		Mojo.Widget.focusSelectMode,
				changeOnKeyPress: true,
				textReplacement: false,
				maxLength: 30,
				requiresEnterKey: false
		};
		this.model = {
			'original' : 'initial value',
			disabled: false
		};

		this.controller.setupWidget('textField', attributes, this.model);

		//Set up our event listeners.  One for button presses and one for the textfield's propertyChange event.
		this.handleClicked = this.handleClicked.bind(this);
		this.propertyChanged = this.propertyChanged.bind(this)
		Mojo.Event.listen(this.controller.get('get_value_button'), Mojo.Event.tap, this.handleClicked);
		Mojo.Event.listen(this.controller.get('textField'), Mojo.Event.propertyChange, this.propertyChanged);
}

TextFieldAssistant.prototype.handleClicked = function(event){
	/* write the value of the text field */
	this.controller.get('textFieldValue').innerText = this.model['original']
}

TextFieldAssistant.prototype.propertyChanged = function(event){
	/* log the text field value when the value changes */
		Mojo.Log.info("********* property Change *************");       
}
    
TextFieldAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


TextFieldAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

TextFieldAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	Mojo.Event.stopListening(this.controller.get('get_value_button'), Mojo.Event.tap, this.handleClicked);
	Mojo.Event.stopListening(this.controller.get('textField'), Mojo.Event.propertyChange, this.propertyChanged);  
}