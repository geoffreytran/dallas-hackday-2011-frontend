function RadioButtonsAssistant() {
}

RadioButtonsAssistant.prototype.setup = function(){
		this.radioAttributes = {
			choices: [
				{label : 'Yes', value : 1},
				{label : 'No', value : 2},
				{label : 'maybe', value : 3}
			]
		}
	
		this.radioModel = {
			value : true,
			disabled:false
		}
		this.controller.setupWidget('radioButton', this.radioAttributes,this.radioModel );
		
		this.radioCallback = this.radioCallback.bind(this);
		this.buttonPressed = this.buttonPressed.bind(this)
		Mojo.Event.listen(this.controller.get('radioButton'),Mojo.Event.propertyChange,this.radioCallback);
		Mojo.Event.listen(this.controller.get('Button'),Mojo.Event.tap,this.buttonPressed);
}
RadioButtonsAssistant.prototype.radioCallback = function(event){
		this.showDialogBox("Radiobutton value changed", "The value of the radiobutton is now: " + event.value);
    }
RadioButtonsAssistant.prototype.buttonPressed = function(event){
		//Create a new model for the radio that sets the default to true and the widget disabled		
		if (this.radioModel.disabled) {
			this.radioModel.disabled = false;
			this.controller.get('Button').innerHTML ='Disable Radio';
			this.showDialogBox("Radio status change","The radio button is now enabled");
		}
		else {
			this.radioModel.disabled = true;
			this.controller.get('Button').innerHTML ='Enable Radio';
			this.showDialogBox("Radio status change","The radio button is now disabled");
		}
		this.controller.modelChanged(this.radioModel);
    }	

	
// This function will popup a dialog, displaying the message passed in.
RadioButtonsAssistant.prototype.showDialogBox = function(title,message){
		this.controller.showAlertDialog({
		onChoose: function(value) {},
		title:title,
		message:message,
		choices:[ {label:'OK', value:'OK', type:'color'} ]
	});
	}
RadioButtonsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


RadioButtonsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

RadioButtonsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	Mojo.Event.stopListening(this.controller.get('radioButton'),Mojo.Event.propertyChange,this.radioCallback);
	Mojo.Event.stopListening(this.controller.get('Button'),Mojo.Event.tap,this.buttonPressed);  
}	