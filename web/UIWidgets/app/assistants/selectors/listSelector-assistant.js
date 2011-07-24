function ListSelectorAssistant(argFromPusher) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 }
    

ListSelectorAssistant.prototype.setup = function() {				
		// Observe mojo-property-change events on our selector widgets:
		this.selectorChanged = this.selectorChanged.bind(this);
		Mojo.Event.listen(this.controller.get('laughSelector'), Mojo.Event.propertyChange, this.selectorChanged);
		Mojo.Event.listen(this.controller.get('commotionSelector'), Mojo.Event.propertyChange, this.selectorChanged);
		Mojo.Event.listen(this.controller.get('workSelector'), Mojo.Event.propertyChange, this.selectorChanged);

		//setup the choice arrays
		this.setupChoices();
		
		// Find our status display div:
		this.currentStuff = this.controller.select('div#currentStuff')[0];

		// Setup models for the selector widgets:
		this.controller.setupWidget('laughSelector', {label: $L('Status'), choices: this.statuses, modelProperty:'currentStatus'}, this.selectorsModel);
		this.controller.setupWidget('commotionSelector', {label: $L('Transport'), choices: this.transports, modelProperty:'currentTransport'}, this.selectorsModel);
		this.controller.setupWidget('workSelector', {label: $L('Work'), choices: this.work, modelProperty:'currentWork'}, this.selectorsModel);
		this.controller.setupWidget('testSelector', {label: $L('Test'), choices: this.testChoices, modelProperty:'currentTest'}, this.selectorsModel);
}

//displays the current state of various selectors
ListSelectorAssistant.prototype.selectorChanged = function(event) {
		this.currentStuff.innerText = $L("Status = ") +this.selectorsModel.currentStatus+ $L(", Transport = ") +this.selectorsModel.currentTransport+", work = "+this.selectorsModel.currentWork;
}

//function declares & initializes our choice arrays
ListSelectorAssistant.prototype.setupChoices = function(){
	
	this.selectorsModel = {currentStatus: 'away', currentTransport: "gtalk", currentWork: "assiduous", currentTest:'sun-cmd'}
	
	// Options for list selector choices:
	this.statuses = [                  
			{label:$L('Away'), value:"away", secondaryIcon:'status-away'}, 
			{label:$L('Available'), value:"available" , secondaryIcon:'status-available', disabled:true}, 
			{label:$L('Offline'), value:"offline", secondaryIcon:'status-offline'} ]
	
	this.transports=  [{label:'m1ghtyat0m', value:"gtalk", secondaryIcon:'status-offline', icon:'gtalk'},
				{label:'matiasd74', value:"aim", secondaryIcon:'status-available', icon:'aim'}
	]
	
	this.work = [
		{label:$L('Assiduous'), value:"assiduous", secondaryIcon:'status-unavailable'}, 
		{label:$L('Diligent'), value:"diligent"}, 
		{label:$L('Earnest'), value:"earnest"},
		{label:$L('Easy'), value:"easy"},
		{label:$L('Hard'), value:"hd"},
		{label:$L('Hardly'), value:"hdly"},
		{label:$L('Hard boiled wonderland and the end of the world'), value:"hb"},
		{label:$L('Whatever'), value:"whatever"}
		]
	
	this.testChoices =	[           
	        
			{label:$L('Send Message to...'), value:"Send Message to...", disabled:true },                                                                                        
			{label:$L('PHONE')},  
			{label:$L('510-321-3123 (m)'), value:"510-321-3123 (m)'), value" },
			{label:$L('AIM')},  
			{label:$L('Angie.Sparks'), value:"AIM - Angie.Sparks", secondaryIcon:'status-available' },   
			{label:$L('GTALK - jkodama')},  
			{label:$L('Angie.Sparks'), value:"GTALK - Angie.Sparks", secondaryIcon:'status-available' },
			{label:$L('GTALK - justing')},  
			{label:$L('Sparks McGee'), value:"GTALK - Sparks McGee", secondaryIcon:'status-available' },
			
		{label:$L('GOOGLE')},  
		{label:$L('jack@gmail.com'), value:"jack@gmail.com", icon:'gtalk' },   
		{label:$L('PERSONAL')},  
		{label:$L('john@test.com'), value:"john@test.com", icon:'exchange' },
		{label:$L('EXAMPLE')},  
		{label:$L('sue.parks@example.com'), value:"sue.parks@example.com", icon:'palm' },
		{label:$L('joe@example.com'), value:"joe@example.com", secondaryIcon:'color-chip-green' }
   
		]
	}

	
ListSelectorAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


ListSelectorAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

ListSelectorAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	  Mojo.Event.stopListening(this.controller.get('laughSelector'), Mojo.Event.propertyChange, this.selectorChanged);
		Mojo.Event.stopListening(this.controller.get('commotionSelector'), Mojo.Event.propertyChange, this.selectorChanged);
		Mojo.Event.stopListening(this.controller.get('workSelector'), Mojo.Event.propertyChange, this.selectorChanged);

}
