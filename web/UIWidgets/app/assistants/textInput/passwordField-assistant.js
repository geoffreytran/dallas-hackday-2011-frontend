/*
 *    PasswordFieldAssistant - Displays password field widget.  User can input a string of text and press the Get Value
 *    button to display the input text.
 *   
 *    Arguments:
 *        none                           
 *        
 *    Functions:
 *        constructor         No-op
 *        setup               Sets up a password field widget.
 *        activate            No-op
 *        deactivate          No-op
 *        cleanup             No-op
 *        handleClicked		  Retrieves the value of the password field widget.
 *        propertyChanged     Get the value of the text password widget when focus has left it.
*/

function PasswordFieldAssistant(argFromPusher) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }
    

PasswordFieldAssistant.prototype.setup = function() {		
    /* set the widget up here */
		var attributes = {
			hintText: 'enter password',
			textFieldName:	'passwordField',
			modelProperty: 'original',
			label: 'password'
		};
		this.model = {
			'original' : ''
		};

		this.controller.setupWidget('passwordField', attributes, this.model);
		
		//Set up our event listeners.  One for button presses and one for the textfield's propertyChange event.
		this.propertyChanged = this.propertyChanged.bind(this);
		this.handleClicked = this.handleClicked.bind(this);
		Mojo.Event.listen(this.controller.get('passwordField'), Mojo.Event.propertyChange, this.propertyChanged);
		Mojo.Event.listen(this.controller.get('get_value_button'), Mojo.Event.tap, this.handleClicked);
}
    
PasswordFieldAssistant.prototype.propertyChanged = function(event){
	/* log the password field value when the value changes */
		Mojo.Log.info("value " + event.value);       
}
    
PasswordFieldAssistant.prototype.handleClicked = function(event){
	/* write the value of the password field */
	this.controller.get('passwordFieldValue').innerText = this.controller.get('passwordField').mojo.getValue()
}

PasswordFieldAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	  
}


PasswordFieldAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

PasswordFieldAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	Mojo.Event.stopListening(this.controller.get('passwordField'), Mojo.Event.propertyChange, this.propertyChanged);
	Mojo.Event.stopListening(this.controller.get('get_value_button'), Mojo.Event.tap, this.handleClicked);  
}