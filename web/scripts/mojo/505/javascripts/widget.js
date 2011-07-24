/**
 * @name widget.js
 * @fileOverview This file defines the Mojo.Widget namespace, and a bunch general widget-related logic; See {@link Mojo.Widget} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/ 

/**
 * @namespace Holds functionality for all widget related stuff. See {@link Mojo.Widget} for more info.
 *   
 * @description 
 * The actual widget implementations are "widget assistants" in the various `widget_*.js` files, and common widget behavior is mostly
 * encapsulated in `widget_controller.js`.  New widgets are added to the framework simply by defining
 * the new class in the Mojo.Widget namespace.
 * 
 * 
 * Although some widgets are instantiated automatically or on request,
 * most are instantiated by the framework when it finds a `<div>` element in a scene that has the
 * `x-mojo-element` attribute specified.  This attribute names a widget class in the `Mojo.Widget` 
 * namespace.  When a widget is instantiated, the framework creates a `WidgetController` instance for the div.
 * The widget controller takes care of instantiating a widget assistant containing the actual 
 * widget implementation, and other standard widget setup work.
 * Widget assistants must be instantiated via a WidgetController.
 * 
 * The widget assistant class's `initialize` method should be used only for intializing private state.
 * Most widgets will probably choose not to implement it at all, and instead do initialization in
 * the `setup` method, which is called slightly after the widget is instantiated.  This is convenient,
 * because at this time the widget can access the WidgetController via its `controller` property.
 * 
 * The WidgetController sets the following standard properties on itself:
 * 
 * 		element: the widget's div element in the DOM.
 * 		scene: the SceneController for the widget's scene.
 * 		model: the widget's model, if appropriate (see below).  This is the object containing the data the widget will display.
 * 		attributes: the widget's attributes (like model, defines widget configuration, does not change between list items).
 * 
 * This lets all widget code reference the 
 * scene controller, model, and DOM element the same way.
 * 
 * ##Widget Models##
 * The framework will automatically hook up a widget with its attributes and data model object, and provide 
 * routing for notifications when the model changes.
 *
 * When instantiating a widget, the framework checks to see if the scene assistant has set up
 * attributes and/or a model for that widget using `setupWidget()`.  If so, they will be set as the WidgetController's 
 * `attributes` and `model` properties before the widget assistant's `setup()` method is called.  If the widget implements 
 * a `handleModelChanged()` method, then it will automatically be called when the scene 
 * controller is notified of changes to the widget's model (via `SceneController.modelChanged()`).
 * 
 * If a setup cannot be found for the widget, the widget is not instantiated unless the assistant has a property setupOptional:true.
 * 
 */
Mojo.Widget = {};

/**
 * @constant 
 * @description The default name for the disabled property.
 */
Mojo.Widget.defaultDisabledProperty = 'disabled';

/**
 * @constant 
 * @description The default name for the model property.
 */
Mojo.Widget.defaultModelProperty = 'value';

/**
 * Constants for TextField; the following are constants for use with the TextField and PasswordField widgets
 * and other text fields.
 */

/**
 * @constant 
 * @deprecated Use Mojo.Widget.steModeSentenceCase instead.
 * @description The first character of the field is upper case and the rest lower case.
 */
Mojo.Widget.sentenceCase = "sentence-case";

/**
 * @constant 
 * @deprecated	Use Mojo.Widget.steModeTitleCase instead
 * @description The first character of each word is upper case and the rest lower case.
 */
Mojo.Widget.titleCase = "title-case";

/**
 * @constant 
 * @description All input keys are mapped to the corresponding numeric characters.
 */
Mojo.Widget.numLock = "num-lock";

/**
 * @constant 
 * @description All input keys are mapped to the corresponding upper case characters.
 */
Mojo.Widget.capsLock = "caps-lock";

/**
 * @constant 
 * @description All input keys are mapped to the corresponding shift case characters.
 */
Mojo.Widget.shiftLock = "shift-lock";

/**
 * @constant 
 * @description The next input key is mapped to the corresponding shift case character, and following
 * keys are mapped to the default, unshift case characters.
 */
Mojo.Widget.shiftSingle = "shift-single";

/**
 * @constant 
 * @description The next input key is mapped to the corresponding numeric character, and following
 * keys are mapped to the default, unshift case characters.
 */
Mojo.Widget.numSingle = "num-single";

/**
 * @constant 
 * @deprecated Use Mojo.Widget.steModeLowerCase instead.
 * @description All input keys are mapped to the default, unshift case characters.
 */
Mojo.Widget.normal = "normal";

/**
 * @constant 
 * @description When focused, the contents of the text field will be selected and shown as highlighted.
 * Any input will replace the contents of the field.
 */
Mojo.Widget.focusSelectMode = "select";

/**
 * @constant 
 * @description When focused, the cursor will be inserted at the beginning of the text field. Any input will be inserted
 * into the field at the cursor location.
 */
Mojo.Widget.focusInsertMode = "insert";

/**
 * @constant 
 * @description When focused, the cursor will be inserted at the end of the text field. Any input will be inserted
 * into the field at the cursor location.
 */
Mojo.Widget.focusAppendMode = "append";

/**
 * @constant 
 * @description When focused, the cursor will be inserted at the beginning of the text field. Any input will be inserted
 * into the field at the cursor location.
 */
Mojo.Widget.focusAttribute = 'x-mojo-focus-highlight';

/**
 * @constant 
 * @description The first character of the field is upper case and the rest lower case.
 */
Mojo.Widget.steModeSentenceCase = "cap-sentence";

/**
 * @constant 
 * @description The first character of each word is upper case and the rest lower case.
 */
Mojo.Widget.steModeTitleCase = "cap-title";

/**
 * @constant 
 * @description All characters are lower case.
 */
Mojo.Widget.steModeLowerCase = "cap-lowercase";

/**
 * @constant 
 * @description Smart Text Engine replacement is disabled.
 */
Mojo.Widget.steModeReplaceOff = "replace-off";

/**
 * @constant 
 * @description Smart Text Engine replacement is enabled; common mis-spellings and abbreviations are
 * replaced by the correct, full words. This is localized in all supported locales.
 */
Mojo.Widget.steModeReplaceOn = "replace-on";

/**
 * @constant 
 * @description Enables the text linking / indexing features of the Smart Text Engine for URLs and phone numbers. 
 * For example, this turns www.google.com into a link and 777-7777 into a phone number. By default is on, but can be turned of
 */
Mojo.Widget.textLinkerOn = 'textlinker-on';

/**
 * @constant 
 * @description Disables the text linking / indexing features of the Smart Text Engine for URLs and phone numbers.
 */
Mojo.Widget.textLinkerOff = 'textlinker-off';

//Constants for PeoplePicker
//TODO: determine which namespace this really belongs in
/** @private */
Mojo.Widget.sortLastFirst = 'LAST_FIRST';
/** @private */
Mojo.Widget.sortFirstLast = 'FIRST_LAST';
/** @private */
Mojo.Widget.sortCompanyLastFirst = 'COMPANY_LAST_FIRST';
/** @private */
Mojo.Widget.sortCompanyFirstLast = 'COMPANY_FIRST_LAST';


//Constants for Spinner

/**
 * @constant 
 * @description Small spinner, typically used in-line in widgets or in other focused locations.
 */
Mojo.Widget.spinnerSmall = 'small';

/**
 * @constant 
 * @description Large spinner, typically used over a whole scene or window.
 */
Mojo.Widget.spinnerLarge = 'large';


//Constants for Button

/**
 * @constant 
 * @description Standard pushbutton.
 */
Mojo.Widget.defaultButton = 'default';

/**
 * @constant 
 * @description Pushbutton with a built-in small spinner to initiate an action of some duration.
 */
Mojo.Widget.activityButton = 'activity';

//Constants for ListSelector

/**
 * @constant 
 * @description Label to be placed on the right side of the list selector.
 */
Mojo.Widget.labelPlacementRight = 'right';

/**
 * @constant 
 * @description Label to be placed on the left side of the list selector.
 */
Mojo.Widget.labelPlacementLeft = 'left';


/**
 * This function returns true if `key` is one of the keys for a digit (0-9).
 * 
 * @param	{int}	charCode		Key value to check
 * @return	{boolean}				true if key is a "digit" key; false otherwise
 *   
 * @deprecated Use Mojo.Char.isDigit instead.
 */
Mojo.Widget.numericValidation = function(charCode) {
    if (charCode >= Mojo.Char.asciiZero && charCode <= Mojo.Char.asciiNine) {
        return true;
    }
    return false;
};


/* 
 * @constant 
 * Path to framework templates directory, for use by widget implementations.
 */
Mojo.Widget.sysTemplatePath = Mojo.Config.TEMPLATES_HOME + "/";

/** @private */
Mojo.Widget.getSystemTemplatePath = function getSystemTemplatePath(partialPath) {
	var path = Mojo.Config.TEMPLATES_HOME;
	if (!partialPath.startsWith("/")) {
		path += "/";
	}
	return path + partialPath;
};



/** 
 * These are widget-related methods available in the SceneController.
 */



/**
#### Overview #####
To display a short message to the user, use an Alert Dialog with a message and one or more selection options 
presented as HTML buttons. When an option is selected, your specified callback function is called with the 
value assigned to the selection. If there is no selection (e.g. the user gestures back to exit the dialog) 
then the onChoose function is called with an undefined value.


#### Function Call ####

		this.controller.showAlertDialog({
		onChoose: function(value) {this.outputDisplay.innerHTML = $L("Alert result = ") + value;},
		title: $L("Filet Mignon"),
		message: $L("How would you like your steak done?"),
		choices:[
		     {label:$L('Rare'), value:"rare", type:'affirmative'},  
		     {label:$L("Medium"), value:"med"},
		     {label:$L("Overcooked"), value:"well", type:'negative'},    
		     {label:$L("Nevermind"), value:"cancel", type:'dismiss'}    
		]
		});


#### Arguments ####

		Argument        Type        Required    Default     Description     
		------------------------------------------------------------------------------------
	    onChoose        Function    Required    None        Called when user makes a choice and the dialog is dismissed
	    title           String      Optional    None        Title of the dialog
	    message         String      Optional    None        Text message to display in the dialog.
	    preventCancel   Boolean     Optional    FALSE       If true, back gesture or other alerts will not cancel the dialog. Defaults to 'false' if unspecified.
	    choices         Array       Required    None        List of actions the user can choose, currently rendered as buttons in the dialog.
	         label      String      Required    None        Display name of this choice
	         value      Any         Required    None        Value to return if this choice is made
	         type       String      Optional    primary     One of the button classes for styling
		allowHTMLMessage Boolean	Optional	false		If true, the message string will not have HTML escaped.



@field
@name Mojo.Controller.showAlertDialog
*/
// 'static' constructor for alert dialogs, since they are 
// instantiated dynamically instead of through the scene setup process.
Mojo.Controller.SceneController.prototype.showAlertDialog = function(model) {
	return this.showFrameworkDialog('_AlertDialog', "alert", model);
};


/**
#### Overview ####
Dialogs can be used to display custom content to the user in the form of a modal dialog box. 
You can put anything into a Dialog that you'd put into a scene, which is any web content or 
Mojo UI content. To create a dialog, you'll call this.controller.showDialog with an 
object containing at least the dialog template (which will look like any other scene view file), 
any properties referenced in the template, and a dialog assistant object.

The following methods will be called in the dialog assistant if implemented:
setup(widget)	Called with the dialog widget when the dialog is instantiated.
cleanup()		Called when the dialog widget has been cleaned up.
activate()		Called following setup(), after child widgets have been instantiated.
deactivate()	Called when the dialog is closed, before it's been cleaned up.
handleCommand(event)	If implemented, the dialog assistant is pushed onto the scene's commander stack while the dialog is active.


#### Function Call ####

		this.controller.showDialog({
		      template: 'dialogs/sample-dialog',
		      assistant: new SampleDialogAssistant(this),
		      wisdom: randomLorem(),
		      preventCancel:true
		});

#### Arguments ####

		Argument        Type        Required    Default     Description     
		------------------------------------------------------------------------------------
		template        String      Required    None        File Path to HTML template containing content for the dialog.  
															Rendered with properties from this model object.
		assistant       Object      Required    None        The 'dialog assistant' responsible for running the dialog, which may implement 
															certain methods (see above).
		preventCancel   Boolean     Optional    FALSE       If true, back gesture or other alerts will not cancel the dialog. 
															Defaults to 'false' if unspecified.



@field
@name Mojo.Controller.showDialog
*/
Mojo.Controller.SceneController.prototype.showDialog = function(model) {
	return this.showFrameworkDialog('_Dialog', "dialog", model);
};




/** @private 
	Does all the work to create and show a framework dialog, including focusing any existing focusable elements
**/
Mojo.Controller.SceneController.prototype.showFrameworkDialog = function(type, attr, model) {
	var widgetController = this.createDynamicWidget(type, model);
	if(widgetController && widgetController.element) {
		widgetController.element.setAttribute('x-mojo-dialog', attr);
		//if there is a focusable element in the dialog, focus it
		//if there is an item on the dialog that is already focused, don't do this!
		if (!Mojo.View.getFocusedElement(widgetController.element)) {
			Mojo.View.advanceFocus(widgetController.element);
		}
		return widgetController.element;
	}
	return undefined;
};

/* For popupSubmenu, there are a couple _private_ parameters that are provided
 * for Palm apps. These may be supported in a future release, so a rough draft
 * of the docs follow.
 *
 * They include:
 *
 *		itemClass:		Added to the item properties, this adds a class to the item
 *						template, allowing you to add a color or whatever other style
 *
 *		itemTemplate:	Added to the model properties, this allows you to specify
 *						a completely custom item template. For the time being, this
 *						template should accept the below properties in order to degrade
 *						gracefully in the event this parameter is not supported.
 *
 *						{
 *							label: The primary text,
 *							icon: The primary icon,
 *							iconPath: The primary icon path,
 *							secondaryIcon: A secondary icon,
 *							secondaryIconPath: Path to the secondary icon,
 *							secondaryLabel: A secondary label
 *						}
 *
 *						If your item doesn't have all of these attributes,
 *						then there is no need to use those attributes in the
 *						template, but you should use these attributes if they apply.
 */

/**
Popup submenus can be used to offer a transient textual list of choices to the user.
It accepts standard menu models, but a few additional properties are supported.

You can create them dynamically as shown in the example below.

Example:

		sceneController.popupSubmenu({
				onChoose:this.popupChoose,
				placeNear:clickEvent.target,
				items: [{label: $L('Apply'), command: 'apply-cmd'},
						  {label: $L('Applique'), command: 'applique-cmd'},
						  {label: $L('Applaud'), command: 'applaud-cmd'},
						  {label: $L('Approximate'), command: 'approx-cmd'}]
				});

A modal list will appear with the `label` choices presented.
When the user taps one, the `onChoose` function will be called (in the
scope of the scene assistant) with the `command` property of the chosen item.
If the user taps outside the popup menu, it's still dismissed, and the
`onChoose` function is called with `undefined` instead.
 

Additional model properties, beyond standard menus:

	 {
	 	onChoose:		Function, required. 
	 					Called when user makes a choice and the popup is dismissed.
	 	placeNear: 		Element, optional. 
	 					Used to position the popup menu near the triggering element.
	 	toggleCmd: 		Command from items array, optional. 
	 					Causes the appropriate item to appear with a check mark  
	 					Supported in top-level model for popups.
	 	popupClass: 	String, optional.  
	 					CSS class for the popup menu, referenced from the HTML templates.
	 	scrimClass: 	String, optional.  
	 					CSS class for the popup scrim.  Defaults to 'submenu-popup'.
	 	manualPlacement: Boolean, optional. 
	 					If true, popup menu will not be placed automatically 
	 					(centered, or near 'placeNear' element).
	 }
 
Additional menu item properties, beyond standard menus:

		{
		secondaryIcon:	String, optional.  
						CSS class for a seconadry icon to display, generally 
						used for some kind of status, and appearing to the left 
						of the menu item.
		secondaryIconPath: String, optional. 
						Just like iconPath, but for secondaryIcon.
		chosen:			Boolean, optional.
						Causes item to be styled as the selected item in a 
						toggle group (displays a check mark, currently). 
		}

Note that while keyboard shortcuts are rendered, they are for display purposes only.
Since the popupmenu widget is created dynamically, it cannot actually implement 
the shortcut functionality itself, so for true submenus this is handled by the 
menu system.
 
@name Mojo.Controller.SceneController.popupSubmenu
@function
 */
Mojo.Controller.SceneController.prototype.popupSubmenu = function(model) {

//	NOT YET SUPPORTED:
//	Positioning menu so that "currently selected item" is over the placeNear target.

	var widgetController = this.createDynamicWidget('_Submenu', model);
	return widgetController && widgetController.element;
};

/** @private */
Mojo.Controller.SceneController.prototype.showPickerPopup = function(model) {
	var widgetController = this.createDynamicWidget('_PickerPopup', model);
	return widgetController && widgetController.element;
};


/**
 * @function createDynamicWidget
 * @description Used to dynamically add a widget of type'name' to the current scene.
 * For example, for showing popup menus and alert dialogs.
 * If insertBefore is undefined, new widget div will be appended to the scene element's children.
 * @param widgetType
 * @param model
 * @param insertBefore
 * @param sceneController
 * 
 */
/** @private */
Mojo.Controller.SceneController.prototype.createDynamicWidget = function createDynamicWidget(widgetType, model, insertBefore) {
	if(insertBefore === undefined) 
		{insertBefore = null;}
	
	var element = this.document.createElement('div');
	element.setAttribute('x-mojo-element', widgetType);
	this.sceneElement.insertBefore(element, insertBefore);
	
	return new Mojo.Controller.WidgetController(element, this, model);
};


/**
Used to notify widgets that a div containing widgets has changed visibility to be shown. This is important
for getting correct measurements where widgets are dependent upon them for drawing.

@param elementOrId

@function
@name Mojo.Controller.SceneController.showWidgetContainer
*/
Mojo.Controller.SceneController.prototype.showWidgetContainer = function showWidgetContainer(elementOrId) {
	//this is going to send an event out on the active scene that says the visibility has changed to show
	//if anyone cares...
	Mojo.Event.send(this.sceneElement, Mojo.Event.subtreeShown, {container: this.get(elementOrId)}, false, true);
};

/**
Used to notify widgets that a div containing widgets has changed visibility to 'display:none'. This is important
for getting correct measurements where widgets are dependent upon them for drawing.

@param elementOrId

@function
@name Mojo.Controller.SceneController.hideWidgetContainer
*/
Mojo.Controller.SceneController.prototype.hideWidgetContainer = function hideWidgetContainer(elementOrId) {
	//this is going to send an event out on the active scene that says the visibility has changed to hide
	//if anyone cares...
	//bubbles = false cancel = true
	Mojo.Event.send(this.sceneElement, Mojo.Event.subtreeHidden, {container: this.get(elementOrId)}, false, true);
};


/**
 * @function instantiateChildWidgets
 * @description Find all child widgets of the given element, and instantiate the appropriate widget classes for them.
 * @param element
 * @param overrideModel
 * 
 */
/** @private */
Mojo.Controller.SceneController.prototype.instantiateChildWidgets = function instantiateChildWidgets(containingElement, overrideModel) {
	Mojo.Timing.resume('scene#widgetTotal');
	var elements = Mojo.Widget.Util.findChildWidgets(containingElement);
	var widget;
	var element;
	
	for(var i=0; i<elements.length; i++) {
		element = elements[i];
		if(element._mojoController === undefined) {
			widget = new Mojo.Controller.WidgetController(element, this, overrideModel);
		} 
	}
	Mojo.Timing.pause('scene#widgetTotal');
};



/*
 * @namespace widget utility routines.
 */
Mojo.Widget.Util = {};

/*
 * @function applyListClassesToChildren
 * @description Utility function that applies the special "list item" classes to children
 * of the given element.
 * The first element receives "first", the last one "last".
 * If there is only one element, it receives "single" instead of first or last.
 * If custom class names are desired, they can be passed in as arguments. 
 * @param parent
 * @param singleClass
 * @param firstClass
 * @param lastClass
 * 
 */
Mojo.Widget.Util.applyListClassesToChildren = function applyListClassesToChildren(parent, singleClass, firstClass, lastClass)
{
	var children = parent.childElements();
	
	if(!children.length){
		return;
	}
	
	if(children.length == 1) {
		if(!singleClass) {
			singleClass = 'single';
		}
		children[0].addClassName(singleClass);
		return;
	}
	
	if(!firstClass) {
		firstClass = 'first';
	} 
	
	if(!lastClass) {
		lastClass = 'last';
	}
	
	children[0].addClassName(firstClass);
	children[children.length-1].addClassName(lastClass);
};

/**
 * @function renderListIntoDiv
 * @description Renders a list of items and a container using the indicated
 * templates and data objects (for template property resolution).
 * Adds the rendered nodes as a child of parentDiv, and returns the element
 * which is the parent of the list items (this can be parentDiv if the list
 * template does not nest the items in a div, but it is usually some child
 * of parentDiv.)
 * The items will be inserted at the #{listElements} property reference in 
 * the list template.
 * This function also traverses the list item nodes in order to set
 * _mojoListIndex apply the standard single/first/last CSS classes.
 * Not intended for use by applications.
 *  
 * @param listParentDiv
 * @param listData
 * @param listTemplate
 * @param itemsData
 * @param itemsTemplate
 * @param formatters
 * @param extraItems
 * 
 */
/** @private */
Mojo.Widget.Util.renderListIntoDiv = function renderListIntoDiv(listParentDiv, listData, listTemplate, itemsData, itemsTemplate, formatters, extraItems) {
	
	// First render the list container WITHOUT the list items... 
	// instead we use a hard-coded marker item, 
	// so we can accurately identify the parent node of the list items.
	
	// Apply formatters here instead of in render(), so that we can also add the 'listElements' property to the decorator.
	var obj = Mojo.Model.format(listData, formatters);  
	obj.listElements = "<div id='MojoListItemsParentMarker'></div>";
	
	listParentDiv.innerHTML = Mojo.View.render({object: obj, template: listTemplate});
	
	// Find the list items parent, insert the items, and then mark them with their index into the data object array:
	var listItemsParent = listParentDiv.querySelector('#MojoListItemsParentMarker').parentNode;
	
	// Render list items into the list parent.
	if(extraItems === undefined) {
		extraItems = "";
	}
	listItemsParent.innerHTML = Mojo.View.render({collection: itemsData, formatters: formatters, template: itemsTemplate}) + extraItems;
	
	
	// Assign _mojoListIndex to rendered list items, properly handling (skipping) null item model objects.
	var itemElement = listItemsParent.firstChild;  
	for(var i=0; i<itemsData.length; i++) {
		
		while(itemElement && itemElement.nodeType != itemElement.ELEMENT_NODE) {
			itemElement = itemElement.nextSibling;
		}
		
		if(itemsData[i] !== null && itemElement) {
			itemElement._mojoListIndex = i;
			itemElement = itemElement.nextSibling;
		}
	}
	
	// Apply the special list item classes so the first/last items are drawn properly:
	Mojo.Widget.Util.applyListClassesToChildren(listItemsParent);
	
	return listItemsParent;
};

/**
 * @function findListItemNode
 * @description Given an event within a list items rendered by 
 * renderListIntoDiv, returns the top level node associated with the
 * list item containing the event's target node.
 *  
 * @param child		Node at which to begin searching.
 * @param parentDiv If specified, will only return children of this div.  Important when other lists may be nested in the item content.
 * 
 */
/** @private */
Mojo.Widget.Util.findListItemNode = function findListItemNode(child, parentDiv) {
	return Mojo.View.findParent(Mojo.Widget.Util._listItemTester, child, parentDiv, parentDiv);
};

/** @private */
Mojo.Widget.Util._listItemTester = function(node, listItemsParent) {
	return (node._mojoListIndex !== undefined && (node.parentNode === listItemsParent || listItemsParent === undefined));
};

/**
 * @function findListItemIndex
 * @description Given an event within a list items rendered by
 * renderListIntoDiv, returns the index of the item that contains
 * the event's target node.
 *  
 * @param event
 * @param parentDiv
 * 
 */
/** @private */
Mojo.Widget.Util.findListItemIndex = function(event, parentDiv) {
	
	var node = this.findListItemNode(event.target, parentDiv);
	return node && node._mojoListIndex;
};


/**
 * @function findChildWidgets
 * @description ? 
 *   
 * @param element
 */
/** @private */
Mojo.Widget.Util.findChildWidgets = function findChildWidgets(element) {
	var widgets;
	var widgetName;
	
	if(Mojo.Environment.hasQuerySelector) 
	{
		widgets = element.querySelectorAll('div[x-mojo-element]');
	}
	else
	{
		// HACK: Firefox 2 doesn't support querySelectorAll(), and prototype's element.select() is 
		// broken with the "div[x-mojo-element]" syntax, so while we are dependent on firebug, 
		// we have to do THIS instead when running in firefox:
		widgets = [];
		for(widgetName in Mojo.Widget) {
			if(Mojo.Widget.hasOwnProperty(widgetName)) {
				widgets = widgets.concat($A(element.select('div[x-mojo-element='+widgetName+']')));
			}
		}
	}
	
	return $A(widgets);
};

/** @private */

Mojo.Widget.Util.dialogRefocusCb = function(event) {
	var focused = event.target;
	var parentDialog = Mojo.View.findParent(
											function(node) {
												return node.hasAttribute && 
												node.hasAttribute("x-mojo-dialog");
											}, focused);
	if(focused && !parentDialog) {
		var blur = function() {
			focused.blur();
		};
		blur.defer();
	}
};
