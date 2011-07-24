function SubMenuAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */		
}


SubMenuAssistant.prototype.setup = function(){
	
	this.viewMenuModel = { 
		label: $L('View Menu Demo'), 
		items: [
			{label: $L('SubMenu Button'), submenu:'category-menu'}
		]
	};		

	this.controller.setupWidget(Mojo.Menu.viewMenu, undefined, this.viewMenuModel);		
	

	
	this.categoryMenuModel = { 
		label: $L('Category'), 
		items: [
			{ label: $L('All'), command:'cat-all', shortcut:'l' },
			{ label: $L('Business'), command:'cat-business' }, 
			{ label: $L('Personal'), command:'cat-personal', shortcut:'p' }, 
			{ label: $L('Unfiled'), command:'cat-unfiled', shortcut:'u' }
		]};

	this.controller.setupWidget('category-menu', undefined, this.categoryMenuModel);	
			  
	Mojo.Event.listen(this.controller.get('toggle_menu_button'),Mojo.Event.tap, this.toggleMenu.bind(this))
		  
}


SubMenuAssistant.prototype.toggleMenu = function(event){
	// toggle the visible state of the menu
	this.controller.toggleMenuVisible(Mojo.Menu.viewMenu);
}


SubMenuAssistant.prototype.handleCommand = function(event) {
	if(event.type == Mojo.Event.command) {
		switch(event.command) {
			case 'cat-all':
				this.controller.get('message').innerText = ('All selected')
			break;
			case 'cat-business':
				this.controller.get('message').innerText = ('Business selected')
			break;
			case 'cat-personal':
				this.controller.get('message').innerText = ('Personal selected')
			break;
			case 'cat-unfiled':
				this.controller.get('message').innerText = ('Unfiled selected')
			break;
			default:
				//Mojo.Controller.errorDialog("Got command " + event.command);
			break;
		}
	}
}
