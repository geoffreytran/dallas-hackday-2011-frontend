/*
	Demonstrates placing widgets inside a list.
*/
function SubwidgetsAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
}

SubwidgetsAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	this.laughChoices = [{label:$L('Cackle'), value:$L("cackle")}, 
				{label:$L('Chortle'), value:$L("chortle")}, 
				{label:$L('Giggle'), value:$L("giggle")}, 
				{label:$L('Guffaw'), value:$L("guffaw")}, 
				{label:$L('Snigger'), value:$L("snigger")}
			],
	
	this.laughTypes = [
				{label : $L('Quiet'), value : $L('quietLaugh')},
				{label : $L('Normal'), value : $L('normLaugh')},
				{label : $L('Loud'), value : $L('loudLaugh')},
			],
	
	this.laughFreq = [
				{label : $L('Rarely'), value : $L('rareLaugh')},
				{label : $L('Constantly'), value : $L('alwaysLaugh')},
			],
	
	
	// items for the main list widget.
	this.widgetList = {items:[
						{laugh:$L('cackle'), volume:$L('quietLaugh'), frequency:$L('rareLaugh')},
						{laugh:$L('cackle'), volume:$L('quietLaugh'), frequency:$L('rareLaugh')},
						{laugh:$L('cackle'), volume:$L('quietLaugh'), frequency:$L('rareLaugh')},
						{laugh:$L('cackle'), volume:$L('quietLaugh'), frequency:$L('rareLaugh')}
						]}
						
	this.controller.setupWidget(Mojo.Menu.viewMenu, undefined, {items: [{label:$L("Widgets » Widgets in a List")}, {}]});
		
	// Set up attributes & model for the list widget:
	this.controller.setupWidget('widgetList', {itemTemplate:'lists/subwidgets/subwidgets-item'}, this.widgetList);
	
	
	// Set up attributes for the list widgets by name.
	// These attribuet objects are used for all widgets of the given name (one in each list item).
	// The models for the widgets are all different, and come from the list's item objects,
	// so all widgets in a particular list item share the same model.
	this.controller.setupWidget('listToggle1', {modelProperty : 'volume', choices:this.laughTypes});
	this.controller.setupWidget('listToggle2', {modelProperty : 'frequency', choices:this.laughFreq});    
	this.controller.setupWidget('listSelector1', {label: $L('Laugh'), property: 'laugh', choices: this.laughChoices});

}
SubwidgetsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


SubwidgetsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

SubwidgetsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}


