/*
	Demonstrates use of the Drawer widget to show/hide content.
*/

function BasicDrawerAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }
    

BasicDrawerAssistant.prototype.setup = function() {
		// Set up the attributes & model for the Drawer widget:
		this.drawerModel = {myOpenProperty:false};
		this.controller.setupWidget('listDrawer', {property:'myOpenProperty'}, this.drawerModel);
		this.drawer = this.controller.get('listDrawer');
		this.toggleDrawer = this.toggleDrawer.bind(this);
		Mojo.Event.listen(this.controller.get('toggleDrawerButton'), Mojo.Event.tap, this.toggleDrawer);
}

	// Button tap event handler that opens/closes the drawer.
BasicDrawerAssistant.prototype.toggleDrawer = function(e){		
// You can change the model and call modelChanged(), or set the open state directly:
//	this.drawerModel.myOpenProperty = !this.drawerModel.myOpenProperty;
//	this.controller.modelChanged(this.drawerModel, this);
		
		this.drawer.mojo.setOpenState(!this.drawer.mojo.getOpenState());       
}

BasicDrawerAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


BasicDrawerAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

BasicDrawerAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  Mojo.Event.stopListening(this.controller.get('toggleDrawerButton'), Mojo.Event.tap, this.toggleDrawer);
}




