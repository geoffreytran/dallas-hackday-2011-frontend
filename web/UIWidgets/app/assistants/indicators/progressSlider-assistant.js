function ProgressSliderAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }
    

ProgressSliderAssistant.prototype.setup = function() {		
		this.attributes = {
			round: false,
			sliderProperty: 'sliderVal',
			progressProperty: 'progressVal',
			updateInterval: .1,
			progressStartProperty: .5,
			cancellable: true
		};
		this.model = {
			progressVal: 0,	// position of the background animation as a percent of the whole 
							// This is chosen by attributes.progressProperty
		
			sliderVal: .8,		// position of the slider, chosen by attributes.sliderProperty
			minValue: 0,		// Applies only to slider
			maxValue: 1
		};
		this.progress = 0;
     	this.controller.setupWidget('sliderdiv', this.attributes, this.model);
		this.propertyChanged = this.propertyChanged.bind(this)
		Mojo.Event.listen(this.controller.get('sliderdiv'),Mojo.Event.propertyChange, this.propertyChanged);
    	this.updater = window.setInterval(this.updateProgress.bind(this), 600);

}
    
    
ProgressSliderAssistant.prototype.reset = function(){
		this.controller.get('sliderdiv').mojo.reset();
}

ProgressSliderAssistant.prototype.updateProgress = function(){
	if (this.progress > 1) {
		window.clearInterval(this.updater);
	}else{
		this.model.progressVal = this.progress;
		this.controller.modelChanged(this.model);
		this.progress += .1;
	}

}

ProgressSliderAssistant.prototype.propertyChanged = function(event){
	Mojo.Log.info("***********new value " + this.model.value + " from event " + event.value);
}


ProgressSliderAssistant.prototype.buttonClicked = function(){
	if (this.model.value == 20 || this.model.value == 50) {
		this.model.value = 50;
		this.controller.modelChanged(this.model);
	}
}

ProgressSliderAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


ProgressSliderAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

ProgressSliderAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  window.clearInterval(this.updater);
	  Mojo.Event.stopListening(this.controller.get('sliderdiv'),Mojo.Event.propertyChange, this.propertyChanged);
}
