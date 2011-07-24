function TimePickerAssistant() {
}
	
TimePickerAssistant.prototype.setup = function() {
	
	var todayDate = new Date()
	this.attributes = {
		label:	'Time',
		modelProperty:	'value',
		minuteInterval : 10
	    };
	this.model = {
		value : todayDate
	}
	this.controller.setupWidget('time_field', this.attributes, this.model);
	this.propertyChanged = this.propertyChanged.bind(this)
	Mojo.Event.listen(this.controller.get('time_field'),Mojo.Event.propertyChange,this.propertyChanged);
}

TimePickerAssistant.prototype.propertyChanged = function(event){
	/* log the text field value when the value changes */
	if (event.value.getHours() <= 12){
		var hour = event.value.getHours();
		var ampm = 'AM'
	} else {
		var hour = event.value.getHours() - 12;
		var ampm = 'PM'
	}
		this.showDialogBox("Time changed", "The value of the Date field is now: " + hour + ":"  + (event.value.getMinutes()) + " " + ampm);
}

TimePickerAssistant.prototype.activate = function(){
	
}
	
/*
 * Cleanup anything we did in the activate function
 */
TimePickerAssistant.prototype.deactivate = function(){
	
}
	
/*
 * Cleanup anything we did in setup function
 */
TimePickerAssistant.prototype.cleanup = function(){
	Mojo.Event.stopListening(this.controller.get('time_field'),Mojo.Event.propertyChange,this.propertyChanged);	
}

// This function will popup a dialog, displaying the message passed in.
TimePickerAssistant.prototype.showDialogBox = function(title,message){
		this.controller.showAlertDialog({
		onChoose: function(value) {},
		title:title,
		message:message,
		choices:[ {label:'OK', value:'OK', type:'color'} ]
	});
	}