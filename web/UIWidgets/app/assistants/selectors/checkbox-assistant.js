function CheckboxAssistant() {
}

/*
 * Called before scene is visible, before any transitions take place,and before widgets are rendered.
 * The scene assistant may attach event listeners to divs for widgets, as they will remain in place after the widgets are rendered.
 * Transition to bring scene on stage begins after this method returns.
 */
CheckboxAssistant.prototype.setup = function(){
		this.cbattributes = {
			property: 'value',
			trueValue: 'ON',
			falseValue: 'OFF'
		};

		this.cbmodel = {
			value: 'ON',
			disabled: false
		};
		this.controller.setupWidget('checkboxdiv', this.cbattributes,this.cbmodel );
		this.checkboxCallback = this.checkboxCallback.bind(this);
		Mojo.Event.listen(this.controller.get('checkboxdiv'),Mojo.Event.propertyChange,this.checkboxCallback);
		}
CheckboxAssistant.prototype.checkboxCallback = function(event){
		this.showDialogBox("Checkbox value changed", "The value of the checkbox is now: " + event.value);
    }	

/*
 * Called each time the scene becomes the top scene on the stack. When the scene is pushed, this is after scene is visible,
 * and after the on-stage transition is complete.
 */
CheckboxAssistant.prototype.activate = function(){
	
}
	
/*
 * Cleanup anything we did in the activate function
 */
CheckboxAssistant.prototype.deactivate = function(){
	
}
	
/*
 * Cleanup anything we did in setup function
 */
CheckboxAssistant.prototype.cleanup = function(){
	Mojo.Event.stopListening(this.controller.get('checkboxdiv'),Mojo.Event.propertyChange,this.checkboxCallback);
}
	
	
// This function will popup a dialog, displaying the message passed in.
CheckboxAssistant.prototype.showDialogBox = function(title,message){
		this.controller.showAlertDialog({
		onChoose: function(value) {},
		title:title,
		message:message,
		choices:[ {label:'OK', value:'OK', type:'color'} ]
	});
}