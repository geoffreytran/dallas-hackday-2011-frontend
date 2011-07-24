function ViewMenuAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */		
}


ViewMenuAssistant.prototype.setup = function(){
		
	this.viewMenuModel = { 
		label: $L('View Menu Demo'), 
		items: [
			{label: $L('Demo'), command:'demo'},
			{label: $L('#1#'), command:'button-1'}, 
			{label: $L('Toadstool'), iconPath:'images/deadapp.png', command:'deadapp'}
		]
	};		

	this.controller.setupWidget(Mojo.Menu.viewMenu, undefined, this.viewMenuModel);
	this.toggleMenu = this.toggleMenu.bind(this)		  
	Mojo.Event.listen(this.controller.get('toggle_menu_button'),Mojo.Event.tap, this.toggleMenu)
		  
}


ViewMenuAssistant.prototype.toggleMenu = function(event){
	// toggle the visible state of the menu
	console.log('this isn\'t working')
	this.controller.toggleMenuVisible(Mojo.Menu.viewMenu);
}


ViewMenuAssistant.prototype.handleCommand = function(event) {
	if(event.type == Mojo.Event.command) {
		switch(event.command) {
			case 'button-1':
				this.controller.get('message').innerText = ('menu button 1 pressed')
			break;
			case 'deadapp':
				this.controller.get('message').innerText = ('Dead app pressed')
			break;
			case 'demo':
				this.controller.get('message').innerText = ('Demo button selected')
			break;
			default:
				//Mojo.Controller.errorDialog("Got command " + event.command);
			break;
		}
	}
}


ViewMenuAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


ViewMenuAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}


ViewMenuAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	Mojo.Event.stopListening(this.controller.get('toggle_menu_button'),Mojo.Event.tap, this.toggleMenu)
}