/*
	Demonstrates use of the Drawer widget to show/hide content including a mojo widget.
*/

function WidgetInDrawerAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }
    

WidgetInDrawerAssistant.prototype.setup = function() {
		// Set up the attributes & model for the Drawer widget:
		this.drawerModel = {myOpenProperty:false};
		this.controller.setupWidget('listDrawer', {property:'myOpenProperty'}, this.drawerModel);
		this.drawer = this.controller.get('listDrawer');
		
		// Hook up the toggle button:
		this.controller.listen('toggleDrawerButton', Mojo.Event.tap, this.toggleDrawer.bind(this));
		
		/*			
			The rest of this function is just code for filling out & managing the content inside the drawer.			
		*/		
		// Set up the attributes & model for the List widget:
		this.wordsModel = {listTitle:$L('Words'), items:this.listTestWordList}; 
		this.controller.setupWidget('toggleDrawerButton', {
             },
	          {
	             label : "Show/Hide Drawer",
	             disabled: false
	         })
		   
		this.controller.setupWidget('wordsList', 
						      {itemTemplate:'containers/drawer/listitem', listTemplate:'containers/drawer/listcontainer', 
									addItemLabel:$L("Add..."), swipeToDelete:true, reorderable:true},
						      this.wordsModel);
		
		// Watch relevant list events:
		this.wordsList = this.controller.get('wordsList');
		this.listChangeHandler = this.listChangeHandler.bind(this);
		this.listAddHandler = this.listAddHandler.bind(this);
		this.listDeleteHandler = this.listDeleteHandler.bind(this);
		this.listReorderHandler = this.listReorderHandler.bind(this);
		
		
		Mojo.Event.listen(this.wordsList, Mojo.Event.listChange, this.listChangeHandler);
		Mojo.Event.listen(this.wordsList, Mojo.Event.listAdd, this.listAddHandler);
		Mojo.Event.listen(this.wordsList, Mojo.Event.listDelete, this.listDeleteHandler);
		Mojo.Event.listen(this.wordsList, Mojo.Event.listReorder, this.listReorderHandler);
		
		
		// We also set up an alternative model, so we can test setting the widget model:
		this.fruitsModel = {listTitle:$L('Fruits'), items:this.fruitItems};
		this.currentModel = this.wordsModel;
}

	// Button tap event handler that opens/closes the drawer.
WidgetInDrawerAssistant.prototype.toggleDrawer = function(e){		
// You can change the model and call modelChanged(), or set the open state directly:
//		this.drawerModel.myOpenProperty = !this.drawerModel.myOpenProperty;
//		this.controller.modelChanged(this.drawerModel, this);
		
		this.drawer.mojo.setOpenState(!this.drawer.mojo.getOpenState());       
}


	// Called for Mojo.Event.listAdd events.
	// Adds a new item to the list.
WidgetInDrawerAssistant.prototype.listAddHandler = function(event){
		// The 'addItems' API will inserts the item where indicated, 
		// and then the list can potentially update only the added item.
		var newItem = {data:$L("New item")};
		this.currentModel.items.push(newItem);
		this.wordsList.mojo.addItems(this.currentModel.items.length, [newItem]);     
}

	// Called for Mojo.Event.listDelete events.
	// Removes the deleted item from the model (and would persist the changes to disk if appropriate).
	// The list's DOM elements will be updated automatically, unless event.preventDefault() is called.
WidgetInDrawerAssistant.prototype.listDeleteHandler = function(event){
		Mojo.log("EditablelistAssistant deleting '"+event.item.data+"'.");
		this.currentModel.items.splice(this.currentModel.items.indexOf(event.item), 1);    
}

	// Called for Mojo.Event.listReorder events.
	// Modifies the list item model to reflect the changes.
WidgetInDrawerAssistant.prototype.listReorderHandler = function(event){
		this.currentModel.items.splice(this.currentModel.items.indexOf(event.item), 1);
		this.currentModel.items.splice(event.toIndex, 0, event.item); 
}
	
	// Called for Mojo.Event.listChange events, which are sent when a 'change' event comes from a list item.
	// Saves the new value into the model.
WidgetInDrawerAssistant.prototype.listChangeHandler = function(event){
		if(event.originalEvent.target.tagName == "INPUT") {
			event.item.data = event.originalEvent.target.value;
			console.log("Change called.  Word is now: "+event.item.data);
		}
}

WidgetInDrawerAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


WidgetInDrawerAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

WidgetInDrawerAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	Mojo.Event.stopListening(this.wordsList, Mojo.Event.listChange, this.listChangeHandler);
	Mojo.Event.stopListening(this.wordsList, Mojo.Event.listAdd, this.listAddHandler);
	Mojo.Event.stopListening(this.wordsList, Mojo.Event.listDelete, this.listDeleteHandler);
	Mojo.Event.stopListening(this.wordsList, Mojo.Event.listReorder, this.listReorderHandler);
}

/*
	Sample items.
*/
	
WidgetInDrawerAssistant.prototype.listTestWordList = [
			{data:$L("Scintillating"), definition:$L("Marked by high spirits or excitement.")},
			{data:$L("Serendipity"), definition: $L("The faculty of making fortunate discoveries by accident.")},
			{data:$L("Hullabaloo"), definition:$L("A great noise or commotion; a hubbub.")},
			{data:$L("Chortle"), definition:$L("A snorting, joyful laugh or chuckle.")},
			{data:$L("Euphonious"), definition:$L("Pleasant sounding.")}
		];