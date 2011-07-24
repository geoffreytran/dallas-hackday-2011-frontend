function MydialogAssistant(sceneAssistant,callbackFunc) {
	this.callbackFunc = callbackFunc;
	this.sceneAssistant = sceneAssistant;
	this.controller = sceneAssistant.controller;
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

MydialogAssistant.prototype.setup = function(widget) {
	this.widget = widget;
	/* this function is for setup tasks that have to happen when the scene is first created */		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */	
	/* setup widgets here */	
	/* add event handlers to listen to events from widgets */
	d = new Date();
	this.t_attr = {
		label:	'Time',
		modelProperty:	'value',
		minuteInterval : 10
	    };
	this.t_model = {
		value : d
	}
	this.controller.setupWidget('time_field', this.t_attr, this.t_model);
	this.save = this.save.bind(this);
	this.cancel = this.cancel.bind(this);
	
	Mojo.Event.listen(this.controller.get('save'),Mojo.Event.tap,this.save);
	Mojo.Event.listen(this.controller.get('cancel'),Mojo.Event.tap,this.cancel);
	
}
function addZero(temp){
	if(temp == 0)
		return "00";
	else
		return temp;	
}
MydialogAssistant.prototype.save = function(event){
	/* put in event handlers here that should only be in effect when this scene is active. For
	 example, key handlers that are observing the document */
	d = new Date(this.t_model.value);
	if (d.getHours() > 12)
		var t = addZero(d.getHours()) - 12 + ":" + addZero(d.getMinutes()) + " PM";
	else if (d.getHours() == 12)
		var t = addZero(d.getHours()) + ":" + addZero(d.getMinutes()) + " PM";
	else
		var t = addZero(d.getHours()) + ":" + addZero(d.getMinutes()) + " AM";
		
	this.callbackFunc(t);
	this.widget.mojo.close();
}
MydialogAssistant.prototype.cancel = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	  
	  this.widget.mojo.close();
}
MydialogAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


MydialogAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

MydialogAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  Mojo.Event.stopListening(this.controller.get('save'),Mojo.Event.tap,this.save);
	Mojo.Event.stopListening(this.controller.get('cancel'),Mojo.Event.tap,this.cancel);
}