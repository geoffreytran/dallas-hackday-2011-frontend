
/*
	Demonstrates use of the List widget to display an editable list of words.
*/
function ListAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */		
}

ListAssistant.prototype.setup = function(){
	
				
	// Set up a few models so we can test setting the widget model:
	this.listModel = {listTitle:$L('My List'), items:this.wordList};
		
	// Set up the attributes & model for the List widget:
	this.controller.setupWidget('my_list', 
				    {itemTemplate:'lists/list/listitem', listTemplate:'lists/list/listcontainer'},
				     this.listModel);
	
	
	this.wordsList = this.controller.get('my_list');
	this.button = this.button.bind(this)
	this.listClickHandler = this.listClickHandler.bind(this);
	Mojo.Event.listen(this.controller.get('button'),Mojo.Event.tap, this.button)	
	Mojo.Event.listen(this.wordsList,Mojo.Event.listTap, this.listClickHandler)
}
ListAssistant.prototype.button = function(event){
	this.listModel.items = this.wordList2;
	this.controller.modelChanged(this.listModel);
}    
ListAssistant.prototype.listClickHandler = function(event){

        if (event.originalEvent.target.hasClassName('title')) {
            Mojo.Log.info("Clicked on " + event.item.data);
            
            var index = event.model.items.indexOf(event.item);
			Mojo.Log.info("Index is " + index);
            if (index > -1) {
			Mojo.Log.info("definition = " + event.item.definition);
            }            
        }        
}
ListAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


ListAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

ListAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	Mojo.Event.stopListening(this.controller.get('button'),Mojo.Event.tap, this.button)	
	Mojo.Event.stopListening(this.wordsList,Mojo.Event.listTap, this.listClickHandler)
	  
}

	/*
		List of sample items.
	*/

ListAssistant.prototype.wordList = [
			{data:$L("Scintillating"), definition:$L("Marked by high spirits or excitement.")},
			{data:$L("Serendipity"), definition: $L("The faculty of making fortunate discoveries by accident.")},
			{data:$L("Hullabaloo"), definition:$L("A great noise or commotion; a hubbub.")},
			{data:$L("Chortle"), definition:$L("A snorting, joyful laugh or chuckle.")},
			{data:$L("Euphonious"), definition:$L("Pleasant sounding.")}
		];

ListAssistant.prototype.wordList2 = [
			{data:$L("enda"), definition:$L("Marked by high spirits or excitement.")},
			{data:$L("mcgrath"), definition: $L("The faculty of making fortunate discoveries by accident.")},
			{data:$L("was"), definition:$L("A great noise or commotion; a hubbub.")},
			{data:$L("here"), definition:$L("A snorting, joyful laugh or chuckle.")},
			{data:$L("today"), definition:$L("Pleasant sounding.")}
		];