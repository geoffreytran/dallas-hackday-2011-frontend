function IntegerPickerAssistant() {
}
	
IntegerPickerAssistant.prototype.setup = function() {
	
	this.attributes = {
		label:	'Integer',
		min: 1,
		max: 10,
		modelProperty:	'value'
	    };
	this.model = {
		value : 5
	}
	this.controller.setupWidget('integer_field', this.attributes, this.model);
	this.propertyChanged = this.propertyChanged.bind(this)
	Mojo.Event.listen(this.controller.get('integer_field'),Mojo.Event.propertyChange,this.propertyChanged);
}

IntegerPickerAssistant.prototype.propertyChanged = function(event){
	/* log the text field value when the value changes */
		this.showDialogBox("Integer changed", "The value of the Integer field is now: " + event.value);
}

IntegerPickerAssistant.prototype.activate = function(){
	
}
	
/*
 * Cleanup anything we did in the activate function
 */
IntegerPickerAssistant.prototype.deactivate = function(){
	
}
	
/*
 * Cleanup anything we did in setup function
 */
IntegerPickerAssistant.prototype.cleanup = function(){
	Mojo.Event.stopListening(this.controller.get('integer_field'),Mojo.Event.propertyChange,this.propertyChanged);
}

// This function will popup a dialog, displaying the message passed in.
IntegerPickerAssistant.prototype.showDialogBox = function(title,message){
		this.controller.showAlertDialog({
		onChoose: function(value) {},
		title:title,
		message:message,
		choices:[ {label:'OK', value:'OK', type:'color'} ]
	});
}