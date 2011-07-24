function ButtonsAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

ButtonsAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */	
	/* setup widgets here */	
	/* add event handlers to listen to events from widgets */	
	this.controller.setupWidget('button-1', 
				this.atts = {
					type: Mojo.Widget.activityButton
					}, 
				this.model = {
					buttonLabel: 'Press me',
					buttonClass: 'affirmative',
					disabled: false
				});
	this.controller.setupWidget('button-2', {}, {buttonLabel: 'Custom by class'});
	this.controller.setupWidget('button-3', {}, {buttonLabel: 'Custom by ID'});
	this.callDeactivateSpinner = this.callDeactivateSpinner.bind(this)
	this.removeSelectedClass =  this.removeSelectedClass.bind(this)
	
	this.buttonSelected = false;
}
ButtonsAssistant.prototype.removeSelectedClass = function() {
	if (this.buttonSelected) {
		this.controller.get("update_button2").className = "palm-button secondary";
		this.controller.get("update_button2text").innerText = "palm-button secondary";
		this.buttonSelected = false;
	}
	else {
		this.buttonSelected = true
	this.controller.get("update_button2text").innerText = "Press again!";
	}
		
}
ButtonsAssistant.prototype.callDeactivateSpinner = function() {
	console.log("*** ")
	if (!this.spinning) {
		window.setTimeout(this.deactivateSpinner.bind(this), 3000);
		this.spinning = true;		
	}
}
ButtonsAssistant.prototype.deactivateSpinner = function() {
	this.buttonWidget = this.controller.get('button-1');
	this.buttonWidget.mojo.deactivate();
	this.spinning = false;
}
ButtonsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	Mojo.Event.listen(this.controller.get('button-1'),Mojo.Event.tap, this.callDeactivateSpinner)
	Mojo.Event.listen(this.controller.get('update_button2'),Mojo.Event.tap, this.removeSelectedClass)
}


ButtonsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	 Mojo.Event.stopListening(this.controller.get('button-1'),Mojo.Event.tap, this.callDeactivateSpinner)
	 Mojo.Event.stopListening(this.controller.get('update_button2'),Mojo.Event.tap, this.removeSelectedClass)
}

ButtonsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}