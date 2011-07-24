function PeoplePickerAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

PeoplePickerAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	this.controller.setupWidget("buttonid",
        this.attributes = {
            },
        this.model = {
            buttonLabel : "Call PeoplePicker",
            disabled: false
        });
	this.handleUpdate = this.handleUpdate.bind(this)
	Mojo.Event.listen(this.controller.get('buttonid'),Mojo.Event.tap, this.handleUpdate)	
	
}
PeoplePickerAssistant.prototype.handleUpdate = function(event) {
	this.controller.stageController.pushScene({appId: "com.palm.app.contacts", name: "list"}, {mode:"picker"});
						
	
}
PeoplePickerAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	  if (event == undefined) {
	  	this.controller.get('area-to-update').update("Calling People picker");
	  }else 
	  	this.controller.get('area-to-update').update(Object.toJSON(event));
}


PeoplePickerAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

PeoplePickerAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  Mojo.Event.stopListening(this.controller.get('buttonid'),Mojo.Event.tap, this.handleUpdate)
}
