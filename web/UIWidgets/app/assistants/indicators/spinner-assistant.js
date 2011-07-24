function SpinnerAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }
    

SpinnerAssistant.prototype.setup = function() {	
	this.spinnerLAttrs = {
		spinnerSize: Mojo.Widget.spinnerLarge,
		modelProperty: 'spinning0'
	}

	this.spinnerSAttrs = {
		spinnerSize: Mojo.Widget.spinnerSmall,
		property: 'spinning1'
	}

	this.spinnerCAttrs = {
		superClass: 'bare-sync-activity-animation',
		mainFrameCount: 11,
		finalFrameCount: 7,
		fps: 10,
		property: 'spinning0'
	}

	this.spinnerModel = {
		spinning0: false
	}
	this.spinnerModel2 = {
			spinning1: false
		}
		//set up the spinner widget
	this.controller.setupWidget('large-activity-spinner', this.spinnerLAttrs, this.spinnerModel);
	this.controller.setupWidget('small-activity-spinner', this.spinnerSAttrs, this.spinnerModel2);
	this.controller.setupWidget('small-activity-spinner2', this.spinnerSAttrs, this.spinnerModel2);
	this.controller.setupWidget('small-activity-spinner3', this.spinnerSAttrs, this.spinnerModel2);
	this.controller.setupWidget('small-activity-spinner4', this.spinnerSAttrs, this.spinnerModel2);
	this.controller.setupWidget('small-activity-spinner5', this.spinnerSAttrs, this.spinnerModel2);
	this.controller.setupWidget('custom-activity-spinner', this.spinnerCAttrs, this.spinnerModel);
	this.spinOn = this.spinOn.bind(this);
	this.spinOff = this.spinOff.bind(this);
	Mojo.Event.listen(this.controller.get('spinner-on'),Mojo.Event.tap, this.spinOn)
	Mojo.Event.listen(this.controller.get('spinner-off'),Mojo.Event.tap, this.spinOff)
					
}    
    
SpinnerAssistant.prototype.spinOn = function(){
			this.controller.get('groups-main').style.display = 'block';
			this.controller.showWidgetContainer('groups-main');
			this.spinnerModel.spinning0 = true;
			this.spinnerModel2.spinning1 = true;
			this.controller.modelChanged(this.spinnerModel);
			this.controller.modelChanged(this.spinnerModel2);     
}

SpinnerAssistant.prototype.spinOff = function(){
			this.controller.hideWidgetContainer('groups-main');
			this.controller.get('groups-main').style.display = 'none';
			this.spinnerModel.spinning0 = false;
			this.spinnerModel2.spinning1 = false;
			this.controller.modelChanged(this.spinnerModel);
			this.controller.modelChanged(this.spinnerModel2);	  
			Mojo.Widget.Scroller.scrollTo(0,0,false,false)    
}

SpinnerAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


SpinnerAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

SpinnerAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  Mojo.Event.stopListening(this.controller.get('spinner-on'),Mojo.Event.tap, this.spinOn)
      Mojo.Event.stopListening(this.controller.get('spinner-off'),Mojo.Event.tap, this.spinOff)
}
