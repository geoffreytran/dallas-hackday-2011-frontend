function ProgressPillAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }
    

ProgressPillAssistant.prototype.setup = function() {	
		this.attr = {
			title: 'Palm ...',
			//image: 'stuff'
		};
		this.model = {
			//iconPath: "action-icon",
			value: 0,
			disabled : false
		};
		this.controller.setupWidget('progressPill', this.attr, this.model);
		//setup a window timeout with an interval
		this.progress = 0;
		this.startProgress(this.progress);
		this.reset = this.reset.bind(this)
		Mojo.Event.listen(this.controller.get('BUTTON'), Mojo.Event.tap, this.reset);
}
    
    
ProgressPillAssistant.prototype.reset = function(){
		this.controller.get('progressPill').mojo.reset();
		this.stopProgress();
		this.startProgress(0);      
}


ProgressPillAssistant.prototype.startProgress = function(inProgress){
		this.stopped = undefined;
		if (!this.updater) {
			this.updater = this.controller.window.setInterval(this.updateProgress.bind(this), 600);
		}
		if (inProgress !== undefined) {
			this.progress = inProgress;
		}		
}

ProgressPillAssistant.prototype.updateProgress = function(){
		if (this.stopped) {
			return;
		}
		if (this.progress > 1) {
			this.stopProgress();
		}
		//this.controller.get('progressPill').maybeUpdateProgress(this.progress);
		this.model.value = this.progress;
		this.controller.modelChanged(this.model);
		this.progress += .1;
}

ProgressPillAssistant.prototype.stopProgress = function(event){
		if (this.updater) {
			this.stopped = true;
			this.controller.window.clearInterval(this.updater);
			delete this.updater;	
		}		
}
ProgressPillAssistant.prototype.cleanup = function(){
		this.stopProgress();
		Mojo.Event.listen(this.controller.get('BUTTON'), Mojo.Event.tap, this.reset);
}

ProgressPillAssistant.prototype.cancelled = function(){
	this.stopProgress();
	Mojo.log("cancelled");
	this.attr.title = "cancelled";
	this.model.icon = "action-icon-red";
	this.controller.modelChanged(this.model);
	$('progressPill').mojo.cancelProgress();
}

ProgressPillAssistant.prototype.complete = function(){
		this.attr.title = "steve";
		this.controller.modelChanged(this.model);     
}

ProgressPillAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


ProgressPillAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
	  this.stopProgress();
}