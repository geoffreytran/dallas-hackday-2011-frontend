/*
 *    MainAssistant - Displays a list of UI widget types.  User taps an item in the
 *        list to see a demonstration of a widget type.
 *   
 *    Arguments:
 *        none                           
 *        
 *    Functions:
 *        constructor         No-op
 *        setup               Sets up a list widget.
 *        activate            No-op
 *        deactivate          No-op
 *        cleanup             No-op
 *        dividerFunc		  Returns a divider label to use in the list dividers.
 *        listTapHandler      Handles user taps on the list items.
 *        setupModel		  Sets up our list model data.
 *        showScene           Pushes a scene. 
*/


function MainAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	 * additional parameters (after the scene name) that were passed to pushScene. The reference
	 * to the scene controller (this.controller) has not be established yet, so any initialization
	 * that needs the scene controller should be done in the setup function below. 
	 */
}    

MainAssistant.prototype.setup = function() {
	/* This function is for setup tasks that have to happen when the scene is first created */
    /* Use Mojo.View.render to render view templates and add them to the scene, if needed. */
	/* Setup widgets here */
	/* Add event handlers to listen to events from widgets */
	
	// Set up our list data model	
	this.setupModel();

	// Set up the list widget with templates for the items, their dividers & the list container.
	// We also set the model to use for the list items & specify a function to format divider content.
	this.controller.setupWidget('widgetList', 
								{itemTemplate:'main/listitem', 
								dividerTemplate:'main/divider', 
								dividerFunction: this.dividerFunc.bind(this)},
								{items:this.widgets});
									
	// Watch for taps on the list items	
	this.listTapHandler = this.listTapHandler.bind(this);
	Mojo.Event.listen(this.controller.get('widgetList'),Mojo.Event.listTap, this.listTapHandler);
}
    
/*
 *	List dividers work by specifying a function for the 'dividerFunction' widget attribute.
 *	This function works kind of like a data formatter function... it's called with the item model
 *	during list rendering, and it returns a label string for the divider.
 *		
 *	The List widget takes care of inserting an actual divider item whenever the label is different
 *	between two consecutive items.
*/	
MainAssistant.prototype.dividerFunc = function(itemModel) {
		return itemModel.category; // We're using the item's category as the divider label.
}
	
/*
 * This function is called when the user taps an item in the list.  It will call the showScene function
 * to display a widget specific scene. 
 */
MainAssistant.prototype.listTapHandler = function(event){
        var index = event.model.items.indexOf(event.item);
		if (index > -1) {
			this.controller.stageController.assistant.showScene(event.item.directory, event.item.scene)
        }      
}

/* 
 * Set up our list's model.  An item includes the category it belongs to (for display in the list dividers), the
 * directory that it's scene files are located, the name of the corresponding widget and the name of it's scene file.
 */
MainAssistant.prototype.setupModel = function(){
	this.widgets = [
			{category:$L("Buttons"), directory:$L("buttons/buttons"), name:$L("Button"), scene:$L("buttons")},
			{category:$L("Buttons"), directory:$L("buttons/radioButtons"), name:$L("Radio Button"), scene:$L("radioButtons")},
			{category:$L("Buttons"), directory:$L("buttons/toggleButton"), name:$L("Toggle Button"), scene:$L("toggleButton")},
			{category:$L("Containers"), directory:$L("containers/drawer"), name:$L("Drawer"), scene:$L("drawer")},
			{category:$L("Containers"), directory:$L("containers/scrolling"), name:$L("Scroller"), scene:$L("scrolling")},
			{category:$L("Dialogs"), directory:$L("dialogs/dialog"), name:$L("Dialog"), scene:$L("dialog")},
			{category:$L("Dialogs"), directory:$L("dialogs/alertDialog"), name:$L("Alert Dialog"), scene:$L("alertDialog")},
			{category:$L("Dialogs"), directory:$L("dialogs/errorDialog"), name:$L("Error Dialog"), scene:$L("errorDialog")},
			{category:$L("Indicators"), directory:$L("indicators/progressBar"), name:$L("Progress Bar"), scene:$L("progressBar")},
			{category:$L("Indicators"), directory:$L("indicators/progressPill"), name:$L("Progress Pill"), scene:$L("progressPill")},
			{category:$L("Indicators"), directory:$L("indicators/progressSlider"), name:$L("Progress Slider"), scene:$L("progressSlider")},
			{category:$L("Indicators"), directory:$L("indicators/spinner"), name:$L("Spinner"), scene:$L("spinner")},
			{category:$L("Lists"), directory:$L("lists/mainlist"), name:$L("List"), scene:$L("mainlist")},
			{category:$L("Lists"), directory:$L("lists/filterList"), name:$L("Filter List"), scene:$L("filterList")},
			{category:$L("Lists"), directory:$L("lists/subwidgets"), name:$L("Widgets in an List"), scene:$L("subwidgets")},
			{category:$L("Menus"), directory:$L("menus/appmenu"), name:$L("Application Menu"), scene:$L("appmenu")},
			{category:$L("Menus"), directory:$L("menus/command-menu"), name:$L("Command Menu"), scene:$L("command-menu")},
			{category:$L("Menus"), directory:$L("menus/view-menu"), name:$L("View Menu"), scene:$L("view-menu")},
			{category:$L("Menus"), directory:$L("menus/sub-menu"), name:$L("Sub Menu"), scene:$L("sub-menu")},
			{category:$L("Pickers"), directory:$L("pickers/datePicker"), name:$L("Date Picker"), scene:$L("datePicker")},
			{category:$L("Pickers"), directory:$L("pickers/integerPicker"), name:$L("Integer Picker"), scene:$L("integerPicker")},
			{category:$L("Pickers"), directory:$L("pickers/timePicker"), name:$L("Time Picker"), scene:$L("timePicker")},
			{category:$L("Pickers"), directory:$L("pickers/filePicker"), name:$L("File Picker"), scene:$L("filePicker")},
			{category:$L("Pickers"), directory:$L("pickers/peoplePicker"), name:$L("People Picker"), scene:$L("peoplePicker")},
			{category:$L("Selectors"), directory:$L("selectors/checkbox"), name:$L("Check Box"), scene:$L("checkbox")},
			{category:$L("Selectors"), directory:$L("selectors/listSelector"), name:$L("List Selector"), scene:$L("listSelector")},
			{category:$L("Selectors"), directory:$L("selectors/slider"), name:$L("Slider"), scene:$L("slider")},
			{category:$L("Text Input"), directory:$L("textInput/textField"), name:$L("Text Field"), scene:$L("textField")},
			{category:$L("Text Input"), directory:$L("textInput/passwordField"), name:$L("Password Field"), scene:$L("passwordField")},
			{category:$L("Text Input"), directory:$L("textInput/filterField"), name:$L("Filter Field"), scene:$L("filterField")},
			{category:$L("Text Input"), directory:$L("textInput/richtext"), name:$L("Rich Text Field"), scene:$L("richtext")},
			{category:$L("Viewers"), directory:$L("viewers/imageView"), name:$L("Image View"), scene:$L("imageView")},
			{category:$L("Viewers"), directory:$L("viewers/webView"), name:$L("Web View"), scene:$L("webView")},
	]
}

/*
 * This function will push a passed in scene.  The reason we are using a special function here is that
 * for file organization purposes we have put the scene files in sub directories & to load them requires that
 * we use the name and sceneTemplate properties when pushing the scenes.
 */ 
MainAssistant.prototype.showScene = function(sceneName, directory) {
		this.controller.stageController.pushScene({name: sceneName,
					       						   sceneTemplate: directory + "/" + sceneName + "/" + sceneName + "-scene"})			
}

MainAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}
	
MainAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

MainAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	Mojo.Event.stopListening(this.controller.get('widgetList'),Mojo.Event.listTap, this.listTapHandler);  
}
