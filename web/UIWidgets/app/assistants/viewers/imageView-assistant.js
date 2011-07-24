function ImageViewAssistant() {
}
	
ImageViewAssistant.prototype.setup = function() {
	var attributes = {
		//noExtractFS : true	//optional, turn off using extractfs to speed up renders.
	    };
	this.model = {
		//backgroundImage : 'images/glacier.png',
		//background: 'black',		//You can set an image or a color
		onLeftFunction : this.wentLeft.bind(this),
		onRightFunction : this.wentRight.bind(this)


	}
	this.controller.setupWidget('myPhotoDiv', attributes, this.model);
	this.myPhotoDivElement = this.controller.get('myPhotoDiv');
	
	this.imageViewChanged = this.imageViewChanged.bind(this);
	this.handleButtonPress = this.handleButtonPress.bind(this);
	this.handleButtonPress = this.handleButtonPress.bind(this);
	this.handleButton2Press = this.handleButton2Press.bind(this);
	Mojo.Event.listen(this.controller.get('myPhotoDiv'),Mojo.Event.imageViewChanged,this.imageViewChanged);
    Mojo.Event.listen(this.controller.get('push_button'),Mojo.Event.tap, this.handleButtonPress);
    Mojo.Event.listen(this.controller.get('push_button2'),Mojo.Event.tap, this.handleButton2Press);

}

ImageViewAssistant.prototype.handleButtonPress = function(event){
	this.myPhotoDivElement.mojo.leftUrlProvided('images/centro_01.png','images/centro_01_thumb.png');
	this.myPhotoDivElement.mojo.centerUrlProvided('images/pre_01.png','images/pre_01_thumb.png');
	this.myPhotoDivElement.mojo.rightUrlProvided('images/treo800w_03.png','images/treo800w_03_thumb.png');
	/* 
	 * You can manually set the width and height of the image
	 * space as below or you can let the widget pick the size
	 * itself.
	 * Uncomment the below to see what it does.
	 */
	//this.myPhotoDivElement.mojo.manualSize('300','100');
}

ImageViewAssistant.prototype.handleButton2Press = function(event){
	result = this.myPhotoDivElement.mojo.getCurrentParams();
	this.showDialogBox("Current Params", "SourceImage="+result.sourceImage+
	"  (See code for this button for other available parameters.)");
	/*
	 * Besides sourceImage, other result attributes are:
	 * focusX
	 * focusY
	 * scale
	 * sourceWidth
	 * sourceHeight
	 */
}

ImageViewAssistant.prototype.imageViewChanged = function(event){
	/* Do something when the image view changes */
	this.showDialogBox("Image View Changed", "Flick image left and/or right to see other images.");
}

ImageViewAssistant.prototype.wentLeft = function(event){
	/* Do something when the user flicks to the right 
	 * like picking a different image for the left image.
	 */
	this.showDialogBox("Image View Changed", "Flick left to see right picture.");
}

ImageViewAssistant.prototype.wentRight = function(event){
	/* Do something when the user flicks to the left 
	 * like picking a different image for the right image.
	 */
	this.showDialogBox("Image View Changed", "Flick right to see left picture.");
}

ImageViewAssistant.prototype.activate = function(){
	/* You can show an image on startup from here if you want */
	//this.myPhotoDivElement.mojo.centerUrlProvided('images/pre_01.png','images/edit.png');
}
	
/*
* Cleanup anything we did in the activate function
*/
ImageViewAssistant.prototype.deactivate = function(){
	
}
	
/*
 * Cleanup anything we did in setup function
 */
ImageViewAssistant.prototype.cleanup = function(){
	Mojo.Event.stopListening(this.controller.get('myPhotoDiv'),Mojo.Event.imageViewChanged,this.imageViewChanged);
    Mojo.Event.stopListening(this.controller.get('push_button'),Mojo.Event.tap, this.handleButtonPress);
    Mojo.Event.stopListening(this.controller.get('push_button2'),Mojo.Event.tap, this.handleButton2Press);
}

// This function will popup a dialog, displaying the message passed in.
 ImageViewAssistant.prototype.showDialogBox = function(title,message){
		this.controller.showAlertDialog({
		onChoose: function(value) {},
		title:title,
		message:message,
		choices:[ {label:'OK', value:'OK', type:'color'} ]
	});
} 