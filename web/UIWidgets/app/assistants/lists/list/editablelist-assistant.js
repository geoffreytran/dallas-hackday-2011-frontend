/*
	Demonstrates use of the List widget to display an editable list of words.
*/
function EditablelistAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */		
}

EditablelistAssistant.prototype.setup = function(){
		
		// Set up view menu with scene header
		this.controller.setupWidget(Mojo.viewMenu, undefined, {items: [{label: $L("Widgets &raquo; Editable List")}, {}]});
		this.controller.setupWidget("addCheckbox",
         this.attributes = {
             trueValue: true,
             falseValue: false 
         },
         this.model = {
             value: true,
             disabled: false
         }
     );
	 this.controller.setupWidget("visibleCheckbox",
         this.attributes = {
             trueValue: true,
             falseValue: false 
         },
         this.model = {
             value: true,
             disabled: false
         }
     );
	 
		// Set up a few models so we can test setting the widget model:
		this.wordsModel = {listTitle:$L('Words'), items:this.listTestWordList};
		this.fruitsModel = {listTitle:$L('Fruits'), items:this.fruitItems};
		this.noItemsModel = {listTitle:$L('Initially Empty'), items:this.noItems};
		this.currentModel = this.wordsModel;
		
		// Set up the attributes & model for the List widget:
		this.controller.setupWidget('wordsList', 
						      {	itemTemplate:'lists/editablelist/listitem', 
							  	listTemplate:'lists/editablelist/listcontainer', 
							 	swipeToDelete:true, 
							 	reorderable:true, 
							 	emptyTemplate:'lists/editablelist/emptylist',
								addItemLabel: $L('Add ...')},
						      this.wordsModel);
		
		
		// Watch relevant list events:
		this.wordsList = this.controller.get('wordsList');
		this.listAddHandler = this.listAddHandler.bind(this);
		this.listDeleteHandler = this.listDeleteHandler.bind(this)
		this.listChangeHandler = this.listChangeHandler.bind(this)
		this.listReorderHandler = this.listReorderHandler.bind(this)
		Mojo.Event.listen(this.wordsList, Mojo.Event.listChange, this.listChangeHandler);
		Mojo.Event.listen(this.wordsList, Mojo.Event.listAdd, this.listAddHandler);
		Mojo.Event.listen(this.wordsList, Mojo.Event.listDelete, this.listDeleteHandler);
		Mojo.Event.listen(this.wordsList, Mojo.Event.listReorder, this.listReorderHandler);
		
		this.switchModels = this.switchModels.bind(this);;
		this.focusRandom = this.focusRandom.bind(this);
		this.changeAddItem = this.changeAddItem.bind(this);
		this.changeListVisible = this.changeListVisible.bind(this);
		
		// These buttons are used to show some of the other APIs available.
		Mojo.Event.listen(this.controller.get('switchModelsButton'), Mojo.Event.tap, this.switchModels);
		Mojo.Event.listen(this.controller.get('focusButton'), Mojo.Event.tap, this.focusRandom);
		Mojo.Event.listen(this.controller.get('addCheckbox'), Mojo.Event.propertyChange, this.changeAddItem);
		Mojo.Event.listen(this.controller.get('visibleCheckbox'), Mojo.Event.propertyChange, this.changeListVisible);
		
}
	
// Called for Mojo.Event.listAdd events.
// Adds a new item to the list.
EditablelistAssistant.prototype.listAddHandler = function(event){
		
		/*
		// This works, but refreshes the whole list:
		this.currentModel.items.push({data:"New item"});
		this.controller.modelChanged(this.currentModel, this);
		*/
		
		// The 'addItems' API will inserts the item where indicated, 
		// and then the list can potentially update only the added item.
		var newItem = {data:$L("New item")};
		this.currentModel.items.push(newItem);
		this.wordsList.mojo.noticeAddedItems(this.currentModel.items.length, [newItem]);
		this.controller.get('wordsList').mojo.focusItem(this.currentModel.items[this.currentModel.items.length-1])
		
}
	
	// Called for Mojo.Event.listDelete events.
	// Removes the deleted item from the model (and would persist the changes to disk if appropriate).
	// The list's DOM elements will be updated automatically, unless event.preventDefault() is called.

EditablelistAssistant.prototype.listDeleteHandler = function(event){
		Mojo.log("EditablelistAssistant deleting '"+event.item.data+"'.");
		this.currentModel.items.splice(this.currentModel.items.indexOf(event.item), 1);
}
	
	// Called for Mojo.Event.listReorder events.
	// Modifies the list item model to reflect the changes.
EditablelistAssistant.prototype.listReorderHandler = function(event){
		this.currentModel.items.splice(this.currentModel.items.indexOf(event.item), 1);
		this.currentModel.items.splice(event.toIndex, 0, event.item);
}
	
	
	// Called for Mojo.Event.listChange events, which are sent when a 'change' event comes from a list item.
	// Saves the new value into the model.
EditablelistAssistant.prototype.listChangeHandler = function(event){
		if(event.originalEvent.target.tagName == "INPUT") {
			event.item.data = event.originalEvent.target.value;
			console.log("Change called.  Word is now: "+event.item.data);
		}
}
	
	// Focus the text field in a random list item:
EditablelistAssistant.prototype.focusRandom = function(event){
		var index = Math.floor(Math.random() * this.currentModel.items.length);
		this.controller.get('wordsList').mojo.focusItem(this.currentModel.items[index]);
}
	
// Show/hide the special "Add..." item.
EditablelistAssistant.prototype.changeAddItem = function(event){
		
		console.log('ENDA ' + event.target.value)
		this.controller.get('wordsList').mojo.showAddItem(event.value);
}

EditablelistAssistant.prototype.changeListVisible = function(event){
		var visible = !!event.target.value;
		
		if(visible) {
			Element.show(this.wordsList);
		} else {
			Element.hide(this.wordsList);
		}
		
}	
	
// Switch the list model to the other one.
// Demonstrates use of setWidgetModel().
EditablelistAssistant.prototype.switchModels = function(e){
		var newModel = this.wordsModel;
		if(this.currentModel === this.wordsModel) {
			Mojo.log("switching to no items model");
			newModel = this.noItemsModel;
		} else if (this.currentModel === this.noItemsModel) {
			Mojo.log("switching to fruits model");
			newModel = this.fruitsModel;			
		}
		
		this.currentModel = newModel;
		this.controller.setWidgetModel(this.wordsList, newModel);
}
EditablelistAssistant.prototype.cleanup = function(event){
	Mojo.Event.stopListening(this.wordsList, Mojo.Event.listChange, this.listChangeHandler);
	Mojo.Event.stopListening(this.wordsList, Mojo.Event.listAdd, this.listAddHandler);
	Mojo.Event.stopListening(this.wordsList, Mojo.Event.listDelete, this.listDeleteHandler);
	Mojo.Event.stopListening(this.wordsList, Mojo.Event.listReorder, this.listReorderHandler);
	
	Mojo.Event.stopListening(this.controller.get('switchModelsButton'), Mojo.Event.tap, this.switchModels);
	Mojo.Event.stopListening(this.controller.get('focusButton'), Mojo.Event.tap, this.focusRandom);
	Mojo.Event.stopListening(this.controller.get('addCheckbox'), Mojo.Event.propertyChange, this.changeAddItem);
	Mojo.Event.stopListening(this.controller.get('visibleCheckbox'), Mojo.Event.propertyChange, this.changeListVisible);
		
}	
/*
	Two lists of sample items.
	They can be switched between using the "toggle models" button.
*/
EditablelistAssistant.prototype.listTestWordList = [
			{data:$L("Scintillating"), definition:$L("Marked by high spirits or excitement.")},
			{data:$L("Serendipity"), definition: $L("The faculty of making fortunate discoveries by accident.")},
			{data:$L("Hullabaloo"), definition:$L("A great noise or commotion; a hubbub.")},
			{data:$L("Chortle"), definition:$L("A snorting, joyful laugh or chuckle.")},
			{data:$L("Euphonious"), definition:$L("Pleasant sounding.")}
		];
	

EditablelistAssistant.prototype.fruitItems = [
					{data:$L("Apple"), definition:$L("yum")},
					{data:$L("Apricot"), definition:$L("yum")},
					{data:$L("Bananna"), definition: $L("yum")},
					{data:$L("Blueberry"), definition: $L("yum")},
					{data:$L("Cherry"), definition: $L("yum")},
					{data:$L("Guava"), definition: $L("yum")},
					{data:$L("Goji Berries"), definition: $L("yum")},
					{data:$L("Kiwi"), definition:$L("yum")},
					{data:$L("Peach"), definition:$L("yum")},
					{data:$L("Pinapple"), definition:$L("yum")},
					{data:$L("Strawberry"), definition:$L("yum")},
					{data:$L("Tomato"), definition:$L("yum")},
					{data:$L("Watermelon"), definition:$L("yum")}
				];

EditablelistAssistant.prototype.noItems = [];


