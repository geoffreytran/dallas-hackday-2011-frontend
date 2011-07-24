function ToggleButtonAssistant() {
	
}
	
/*
 * Called before scene is visible, before any transitions take place,and before widgets are rendered.
 * The scene assistant may attach event listeners to divs for widgets, as they will remain in place after the widgets are rendered.
 * Transition to bring scene on stage begins after this method returns.
 */
ToggleButtonAssistant.prototype.setup = function(){

		// Setup toggle widget and an observer for when it is changed
		this.tattr = {
  			trueLabel:  'true' ,//if the state is true, what to label the toggleButton; default is 'On'
  			trueValue:  'truevalue' ,//if the state is true, what to set the model[property] to; default if not specified is true
 			falseLabel:  'false', //if the state is false, what to label the toggleButton; default is Off
  			falseValue: 'falsevalue', //if the state is false, , what to set the model[property] to; default if not specific is false],
  			fieldName:  'toggle' //name of the field; optional
  		}
		this.tModel = {
			value : true,   // Current value of widget, from choices array.
 			disabled: false //whether or not the checkbox value can be changed; if true, this cannot be changed; default is false
			
		}
		
		this.controller.setupWidget('att-toggle', this.tattr,this.tModel );
		this.togglePressed = this.togglePressed.bind(this);
		this.buttonPressed = this.buttonPressed.bind(this);
		Mojo.Event.listen(this.controller.get('att-toggle'),Mojo.Event.propertyChange,this.togglePressed);
		Mojo.Event.listen(this.controller.get('Button'),Mojo.Event.tap,this.buttonPressed);
				
	}

ToggleButtonAssistant.prototype.buttonPressed = function(event){
				
		//Create a new model for the toggle that sets the default to true and the widget disabled
		if (this.tModel.disabled) {
			this.tModel.disabled = false;			
			this.controller.get('Button').innerHTML ='Disable toggle';
			this.showDialogBox("Toggle status change","The toggle button is now enabled");
		}
		else {
			this.tModel.disabled = true;
			this.controller.get('Button').innerHTML ='Enable toggle';
			this.showDialogBox("Toggle status change","The toggle button is now disabled");
		}
		this.controller.modelChanged(this.tModel);
    }
	
	
ToggleButtonAssistant.prototype.togglePressed = function(event){
		//Display the value of the toggle
		this.showDialogBox( "The toggle value changed" ,"Toggle value is now: " + event.value);
}

// This function will popup a dialog, displaying the message passed in.
ToggleButtonAssistant.prototype.showDialogBox = function(title,message){
		this.controller.showAlertDialog({
		onChoose: function(value) {},
		title:title,
		message:message,
		choices:[ {label:'OK', value:'OK', type:'color'} ]
	});
	}
ToggleButtonAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


ToggleButtonAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

ToggleButtonAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	Mojo.Event.stopListening(this.controller.get('att-toggle'),Mojo.Event.propertyChange,this.togglePressed);
	Mojo.Event.stopListening(this.controller.get('Button'),Mojo.Event.tap,this.buttonPressed);
		
}	