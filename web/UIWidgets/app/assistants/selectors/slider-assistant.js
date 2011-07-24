function SliderAssistant() {
}
	
SliderAssistant.prototype.setup = function() {
	//alert(Luna.Widget.getSystemTemplatePath('/button/button-content'))
	this.attributes = {
		modelProperty:	'value'
		,minValue:		0
		,maxValue:		9
		,round:			true
	    };
	this.model = {
		value : 1
		,width: 15
	}
	this.controller.setupWidget('slider', this.attributes, this.model);
	this.propertyChanged = this.propertyChanged.bind(this);
	Mojo.Event.listen(this.controller.get('slider'),Mojo.Event.propertyChange,this.propertyChanged);
    	
}

SliderAssistant.prototype.propertyChanged = function(event){
	/* log the text field value when the value changes */
		this.showDialogBox("Slider Value Changed", "The value of the Slider field is now: " + event.value);
}


SliderAssistant.prototype.activate = function(){
	
}
	
/*
 * Cleanup anything we did in the activate function
 */
SliderAssistant.prototype.deactivate = function(){
	
}
	
/*
 * Cleanup anything we did in setup function
 */
SliderAssistant.prototype.cleanup = function(){
	Mojo.Event.stopListening(this.controller.get('slider'),Mojo.Event.propertyChange,this.propertyChanged);	
}

// This function will popup a dialog, displaying the message passed in.
SliderAssistant.prototype.showDialogBox = function(title,message){
		this.controller.showAlertDialog({
		onChoose: function(value) {},
		title:title,
		message:message,
		choices:[ {label:'OK', value:'OK', type:'color'} ]
	});
}