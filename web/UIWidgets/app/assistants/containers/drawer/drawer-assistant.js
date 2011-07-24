function DrawerAssistant(argFromPusher) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }
    

DrawerAssistant.prototype.setup = function() {		
		//set up button handlers
		this.handleBasicDrawerButton = this.handleBasicDrawerButton.bind(this);
		this.handleListDrawerButton = this.handleListDrawerButton.bind(this);
        Mojo.Event.listen(this.controller.get('basic_drawer_button'),Mojo.Event.tap, this.handleBasicDrawerButton)
        Mojo.Event.listen(this.controller.get('list_drawer_button'),Mojo.Event.tap, this.handleListDrawerButton)
}
    
    
DrawerAssistant.prototype.handleBasicDrawerButton = function(){
		this.controller.stageController.assistant.showScene('containers/drawer/', 'basicDrawer')
}

DrawerAssistant.prototype.handleListDrawerButton = function(event){
		this.controller.stageController.assistant.showScene('containers/drawer/', 'widgetInDrawer')
}

DrawerAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


DrawerAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

DrawerAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	 Mojo.Event.stopListening(this.controller.get('basic_drawer_button'),Mojo.Event.tap, this.handleBasicDrawerButton)
     Mojo.Event.stopListening(this.controller.get('list_drawer_button'),Mojo.Event.tap, this.handleListDrawerButton) 
}
