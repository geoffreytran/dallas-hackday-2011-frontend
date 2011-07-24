/*
 *    FilterFieldAssistant - Displays filter field widget.  User can just start typing text and it will appear in the
 *    scene after a specified delay for checking the filter fields value is reached.
 *   
 *    Arguments:
 *        none                           
 *        
 *    Functions:
 *        constructor         No-op
 *        setup               Sets up a filter field widget.
 *        activate            No-op
 *        deactivate          No-op
 *        cleanup             No-op
 *        filter  			  Writes the filter field's current value to the scene.
*/

function FilterFieldAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }
    

FilterFieldAssistant.prototype.setup = function() {		
		//Set up the filter field widget
		var attr = {
			filterFieldName: "name",
			delay: 1000,             //time in ms that the field is checked for updates repeatedly 
			filterFieldHeight: 100
		};
		this.model = {
			disabled: false
		};

		this.controller.setupWidget('filterField', attr, this.model);
		
		//Listen for filter events
		this.filter = this.filter.bind(this)
		Mojo.Event.listen(this.controller.get('filterField'), Mojo.Event.filter, this.filter);
}
    
/*
 * This function will be called repeatedly on the delay interval specified in the widget's setup attributes
 */
FilterFieldAssistant.prototype.filter = function(event){    
		this.controller.get('filterString').innerText = (event.filterString)  //Display the value of the filter field
	this.controller.get('filterField').mojo.setCount(Math.floor(Math.random()*11));
}


FilterFieldAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


FilterFieldAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

FilterFieldAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  Mojo.Event.stopListening(this.controller.get('filterField'), Mojo.Event.filter, this.filter);
}