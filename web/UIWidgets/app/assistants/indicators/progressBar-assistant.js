function ProgressBarAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }
    

ProgressBarAssistant.prototype.setup = function() {		
		this.attr = {
			title: 'bob',
			image: 'stuff'
		};
		this.model = {
			value: 0,
			disabled : false
		};
		this.controller.setupWidget('progressBar', this.attr, this.model);
		this.cancelled = this.cancelled.bind(this);
		this.complete = this.complete.bind(this);
		//setup a window timeout with an interval
		this.progress = 0;
		this.updater = window.setInterval(this.updateProgress.bind(this), 1000);
		
		this.reset = this.reset.bind(this);
	    Mojo.Event.listen(this.controller.get('progressBar'),Mojo.Event.cancel, this.cancelled);
	    Mojo.Event.listen(this.controller.get('progressBar'),Mojo.Event.progressComplete, this.complete);		
	    Mojo.Event.listen(this.controller.get('BUTTON'),Mojo.Event.tap, this.reset);
}
    
    
ProgressBarAssistant.prototype.reset = function(){
		this.progress = 0;
		this.updater = window.setInterval(this.updateProgress.bind(this), 1000);
		//$('progressBar').mojo.reset();       
}

ProgressBarAssistant.prototype.updateProgress = function(){
		if (this.progress > 1) {
			window.clearInterval(this.updater);
		}
		this.model.value = this.progress;
		this.controller.modelChanged(this.model);
		this.progress += .1;
}

ProgressBarAssistant.prototype.cleanup = function(){
		window.clearInterval(this.updater);   
		Mojo.Event.stopListening(this.controller.get('progressBar'),Mojo.Event.cancel, this.cancelled);
	    Mojo.Event.stopListening(this.controller.get('progressBar'),Mojo.Event.progressComplete, this.complete);		
	    Mojo.Event.stopListening(this.controller.get('BUTTON'),Mojo.Event.tap, this.reset);
}

ProgressBarAssistant.prototype.cancelled = function(){
		window.clearInterval(this.updater);
		alert("cancelled");
		this.attr.title = "cancelled";
		this.controller.modelChanged(this.model);       
}

ProgressBarAssistant.prototype.complete = function(){
	//	this.attr.title = "steve";
	//	this.controller.modelChanged(this.model);        
}

ProgressBarAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


ProgressBarAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}