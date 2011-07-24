function DatePickerAssistant() {
}
	
DatePickerAssistant.prototype.setup = function() {
	
	this.controller.setupWidget(Mojo.Menu.viewMenu, undefined, {items: [{label: $L("Widgets » Date & Time Pickers")}]});
		
		// The date & time picker widgets can be used to edit a Date object in the widget model.
		this.pickerModel = {time:new Date(), myValue:42};
		this.controller.setupWidget('timepicker', {minuteInterval:15}, this.pickerModel);
		
		// The date picker defaults to using the 'date' model property.
		// We change it to 'time' here, so it will edit the same object as the time picker.
		this.controller.setupWidget('datepicker', {modelProperty:'time', labelPlacement: Mojo.Widget.labelPlacementRight}, this.pickerModel);
		
		// The integer picker edits an integer valued model property.
		this.controller.setupWidget('intpicker', {modelProperty:'myValue', min:30, max:50}, this.pickerModel);
		
		// The date & time picker widgets send propertyChange events when the Date object is modified.
		this.propertyChanged = this.propertyChanged.bind(this);
		this.controller.listen('timepicker', Mojo.Event.propertyChange, this.propertyChanged);
		this.controller.listen('datepicker', Mojo.Event.propertyChange, this.propertyChanged);
		
		//this.intPropChange = this.intPropChange.bind(this);
		this.controller.listen('intpicker', Mojo.Event.propertyChange, this.propertyChanged);
		
		this.outputDiv = this.controller.get('output');
		
		// The date & time picker widgets can be used to edit a Date object in the widget model.
		this.plainpickerModel = {'usState' : 'ny', 
								'bobs' : 'thecat'};
		this.controller.setupWidget('plainpicker', {
			capsules: [{
				modelProperty: 'usState',
				items: [{'label': 'ny', 'value': 'ny'}, {'label': 'ca', 'value': 'ca'}]

			},
			{
				modelProperty: 'bobs',
				items: [{'label': 'thecat', 'value': 'thecat'}, {'label': 'thehair', 'value': 'thehair'}, {'label': 'theman', 'value': 'theman'}]
			}		
			]
		}, this.plainpickerModel);
}

DatePickerAssistant.prototype.propertyChanged = function(event){
	/* log the text field value when the value changes */
		this.showDialogBox("Date changed", "The value of the Date field is now: " + (event.value.getMonth()+1) + "/" + event.value.getDate() + "/" + (event.value.getYear()+1900));
}

DatePickerAssistant.prototype.activate = function(){
	
}
	
/*
 * Cleanup anything we did in the activate function
 */
DatePickerAssistant.prototype.deactivate = function(){
	
}
	
/*
 * Cleanup anything we did in setup function
 */
DatePickerAssistant.prototype.cleanup = function(){
	Mojo.Event.stopListening(this.controller.get('date_field'),Mojo.Event.propertyChange,this.propertyChanged);
}

// This function will popup a dialog, displaying the message passed in.
DatePickerAssistant.prototype.showDialogBox = function(title,message){
		this.controller.showAlertDialog({
		onChoose: function(value) {},
		title:title,
		message:message,
		choices:[ {label:'OK', value:'OK', type:'color'} ]
	});
}