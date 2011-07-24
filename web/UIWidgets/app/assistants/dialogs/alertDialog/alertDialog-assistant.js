function AlertDialogAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

AlertDialogAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created 		
	 * use Mojo.View.render to render view templates and add them to the scene, if needed	
	 * setup widgets here
	 * add event handlers to listen to events from widgets */
	this.buttonPressed = this.buttonPressed.bind(this)
	Mojo.Event.listen(this.controller.get('PressMe'),Mojo.Event.tap,this.buttonPressed);
}	
AlertDialogAssistant.prototype.buttonPressed = function() {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	  this.controller.showAlertDialog({
	    onChoose: function(value) {this.controller.get("area-to-update").innerText = "Alert result = " + value;},
	    title: $L("Filet Mignon"),
	    message: $L("How would you like your steak done?"),
	    choices:[
	         {label:$L('Rare'), value:"refresh", type:'affirmative'},  
	         {label:$L("Medium"), value:"don't refresh"},
	         {label:$L("Overcooked"), value:"don't refresh", type:'negative'},    
	         {label:$L("Nevermind"), value:"maybe refresh", type:'dismiss'}    
	    ]
	    });
}
AlertDialogAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


AlertDialogAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

AlertDialogAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  Mojo.Event.stopListening(this.controller.get('PressMe'),Mojo.Event.tap,this.buttonPressed);
}