function MainlistAssistant(argFromPusher) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }
    

MainlistAssistant.prototype.setup = function() {		
		//set up button handlers
		this.handleBasicListButton = this.handleBasicListButton.bind(this);
		this.handleEditableListButton = this.handleEditableListButton.bind(this);
		this.handleLazyListButton = this.handleLazyListButton.bind(this);
		
        Mojo.Event.listen(this.controller.get('basic_list_button'),Mojo.Event.tap, this.handleBasicListButton)
        Mojo.Event.listen(this.controller.get('editable_list_button'),Mojo.Event.tap, this.handleEditableListButton)
        Mojo.Event.listen(this.controller.get('lazy_list_button'),Mojo.Event.tap, this.handleLazyListButton)
        
 }
    
MainlistAssistant.prototype.handleBasicListButton = function(){
		this.controller.stageController.assistant.showScene('lists/list', 'list')        
}

MainlistAssistant.prototype.handleEditableListButton = function(){
        this.controller.stageController.assistant.showScene('lists/editablelist',"editablelist");        
}
    
MainlistAssistant.prototype.handleLazyListButton = function(){
        this.controller.stageController.assistant.showScene('lists/lazy-list',"lazy-list");        
}

MainlistAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


MainlistAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

MainlistAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  Mojo.Event.stopListening(this.controller.get('basic_list_button'),Mojo.Event.tap, this.handleBasicListButton)
      Mojo.Event.stopListening(this.controller.get('editable_list_button'),Mojo.Event.tap, this.handleEditableListButton)
      Mojo.Event.stopListening(this.controller.get('lazy_list_button'),Mojo.Event.tap, this.handleLazyListButton)

}
