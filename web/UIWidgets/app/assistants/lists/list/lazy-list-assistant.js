function LazyListAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */		
}

LazyListAssistant.prototype.setup = function() {
        this.ListAttrs = {
			listTemplate: 'lists/lazy-list/listcontainer',
			itemTemplate: 'lists/lazy-list/listItem',
			itemsCallback:this.itemsCallback.bind(this)
        };
		
		this.list = []
		this.maxListLength = 500; 
		/* You may see list drawing artifacts when creating a list much larger 
		   than this.  To overcome this take a look at the mojomatters lazy list
		   example for other options, such as replacing list items rather than 
		   continously adding new ones.
		 */
		
        this.controller.setupWidget('lazy_list', this.ListAttrs);		
		
		//populate the list with some initial items - a real apps items might be coming from a server
		if (this.list.length == 0) {
			this.list.push.apply(this.list, this.makeItems(100, 0));
		}
		
		//We're binding for our use with the Prototype delay() function below.
		this.updateListWithNewItems = this.updateListWithNewItems.bind(this);
}

LazyListAssistant.prototype.itemsCallback = function(listWidget, offset, count) {	
		//Showing the values for educational value
		Mojo.Log.info($L("offset = ") + offset)
		Mojo.Log.info($L("count = ") + count)		
		Mojo.Log.info($L("list length = ") + this.list.length)		

		//If they've scrolled past the point where they only have 50 items left to scroll &
		//haven't created so many items that the max has been reached then add more items
		//to the list!
		//***This could be substituted with a remote call to a server to get more items...		
		if ((offset > this.list.length-50) && (this.list.length < this.maxListLength)) {
			this.list.push.apply(this.list, this.makeItems(count, this.list.length));
		}
			
		// We delay returning the items by .1 seconds in order to more accurately simulate 
		// data being returned from an async service request.
		this.updateListWithNewItems.delay(.1, listWidget, offset, this.list.slice(offset, offset+count));
}
	
LazyListAssistant.prototype.updateListWithNewItems = function(listWidget, offset, items) {
		//This function causes the given items to be replaced and re-rendered. 
		//Items provided past the current end of the list will cause the length to grow.
		listWidget.mojo.noticeUpdatedItems(offset, items);
		
		// This will do nothing when the list size hasn't actually changed, 
		// but is necessary when initially setting up the list.
		listWidget.mojo.setLength(this.list.length);
		
}
	
	// Generates an array of simple items.
LazyListAssistant.prototype.makeItems = function(howMany, offset) {
		var i;
		var items = [];
		
		for(i=0; i < howMany; i++) {
			items.push({id:i+offset});
		}		
		return items;
}

LazyListAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */	
}

LazyListAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

LazyListAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}