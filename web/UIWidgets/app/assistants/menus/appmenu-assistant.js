function AppmenuAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}


AppmenuAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */	
	/* setup widgets here */	
	/* add event handlers to listen to events from widgets */
	this.appMenuModel = {
		visible: true,
		items: [
			{ label: $L('Custom 1'), command: 'cmd-Cust1' },
			Mojo.Menu.editItem,
			{ label: $L('Custom 2'), command: 'cmd-Cust2' },
			{ label: "Preferences...", command: 'do-myPrefs' },
    		{ label: "Help...", command: 'do-myHelp' }
		]
	};

	this.controller.setupWidget(Mojo.Menu.appMenu, {omitDefaultItems: true}, this.appMenuModel);
	
}


AppmenuAssistant.prototype.handleCommand = function (event) {
	this.controller=Mojo.Controller.stageController.activeScene();
    if(event.type == Mojo.Event.command) {	
		switch (event.command) {
			
			// these are built-in commands. we haven't enabled any of them, but
			// they are listed here as part of the boilerplate, to be enabled later if needed
			case 'do-myPrefs':
				this.controller.showAlertDialog({
				    title: $L("Prefs Menu"),
				    message: $L("You have selected the prefs menu"),
					choices:[
         				{label:$L('Thanks'), value:"refresh", type:'affirmative'}
						]				    
				    });			
				break;	

			// another built-in menu item, but we've enabled it (see below in this method)
			// so now we have to handle it:
			case 'do-myHelp':
				this.showHelp();					
				break;
						
			// our app custom commands
			case 'cmd-Cust1':
				this.controller.get('instructions').innerText = ("Selected Custom 1")
				break;
				
			case 'cmd-Cust2':
				this.controller.get('instructions').innerText = ("Selected Custom 2")
								
				break;
		}
	}
}
AppmenuAssistant.prototype.showHelp = function() {
	// set only one of the following if statements to true
	
	// if #1
	if (true) {/* one way to skin the cat: */
		this.controller.stageController.assistant.showScene('menus/helpScene','helpScene');
	}
	
	// if #2
	if (false) {/* here's another way launching the browser to a web page: */
		var url = "http://www.englishpage.com/vocabulary/interactivelesson4.html"; // your live web page
		var params = {
			scene: 'page'
		};
		if (url !== undefined) {
			params.target = url;
		}
		this.controller.serviceRequest('palm://com.palm.applicationManager', {
			method: 'open',
			parameters: {
				'id': 'com.palm.app.browser',
				'params': params
			}
		});
	}
	
	// if #3
	if (false) {/* and a third way using the built-in help app: */
			new Mojo.Service.Request('palm://com.palm.applicationManager', {
				method: 'open',
				parameters: {
					id: 'com.palm.app.help',
					params: {
						appName: 'application_menu' /* the name of our application: see appinfo.json */
					}
				},
			});
			
		}
};


AppmenuAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


AppmenuAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}


AppmenuAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}