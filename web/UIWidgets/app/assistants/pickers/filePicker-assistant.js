function FilePickerAssistant() {
}
	
FilePickerAssistant.prototype.setup = function() {
	this.controller.setupWidget("push_button",
         {
		 	type : Mojo.Widget.activityButton
          },
         {
         	label : "Pick any File",
            disabled: false
         }
     );
	 this.controller.setupWidget("push_button1",
         {
		 	type : Mojo.Widget.activityButton
         },
         {
         	label : "Pick a PDF or DOC File",
            disabled: false
         }
     );
	 this.controller.setupWidget("push_button2",
        {
			type : Mojo.Widget.activityButton
        },
        {
            label : "Pick a Song",
        	disabled: false
		}
     );
	 this.controller.setupWidget("push_button3",
        {
			type : Mojo.Widget.activityButton
        },
        {
        	label : "Pick a Picture",
            disabled: false
        }
     );
	 this.controller.setupWidget("push_button4",
        {
			type : Mojo.Widget.activityButton
        },
        {
            label : "Pick a Movie",
            disabled: false
         }
     );
	
	this.handleButtonPress = this.handleButtonPress.bind(this)
    Mojo.Event.listen(this.controller.get('push_button'),Mojo.Event.tap, this.handleButtonPress)
    Mojo.Event.listen(this.controller.get('push_button1'),Mojo.Event.tap, this.handleButtonPress)
    Mojo.Event.listen(this.controller.get('push_button2'),Mojo.Event.tap, this.handleButtonPress)
    Mojo.Event.listen(this.controller.get('push_button3'),Mojo.Event.tap, this.handleButtonPress)
    Mojo.Event.listen(this.controller.get('push_button4'),Mojo.Event.tap, this.handleButtonPress)

}

FilePickerAssistant.prototype.handleButtonPress = function(event){
	var button = event.target.id;
	this.button = button.substring(button.indexOf('push_button'),button.indexOf('-'));
	var params = {};
	switch(this.button){
		case 'push_button' :
			params = {
				defaultKind: 'file',
				onSelect: function(file){
					this.controller.get('selection').innerHTML = JSON.stringify(file);
				}.bind(this)
			}
			break;
		case 'push_button1' :
			params = {
				kinds: ['file'],
				extensions: ['pdf', 'doc'],
				onSelect: function(file){
					this.controller.get('selection').innerHTML = JSON.stringify(file);
				}.bind(this)
			}
			break;
		case 'push_button2' :
			params = {
				kinds: ['audio'],
				onSelect: function(file){
					this.controller.get('selection').innerHTML = JSON.stringify(file);
				}.bind(this)
			}
			break;
		case 'push_button3' :
			 params = {
			 	kinds: ['image'],
			 	onSelect: function(file){
			 		this.controller.get('selection').innerHTML = JSON.stringify(file);
				}.bind(this)
			}
			break;
		case 'push_button4' :
			params = {
				kinds: ['image','video'],
				onSelect: function(file){
					this.controller.get('selection').innerHTML = JSON.stringify(file);
				}.bind(this)
			}
			break;			
	}
	;
	Mojo.FilePicker.pickFile(params, this.controller.stageController);
}

FilePickerAssistant.prototype.activate = function(){
	/* You can show an image on startup from here if you want */
		

}
	
/*
* Cleanup anything we did in the activate function
*/
FilePickerAssistant.prototype.deactivate = function(){	
	if(this.button)
		this.controller.get(this.button).mojo.deactivate();
}
	
/*
 * Cleanup anything we did in setup function
 */
FilePickerAssistant.prototype.cleanup = function(){
	Mojo.Event.stopListening(this.controller.get('push_button'),Mojo.Event.tap, this.handleButtonPress)
}