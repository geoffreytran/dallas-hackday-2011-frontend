/**
 * @name widget_filterlist.js
 * @fileOverview This file discusses the FilterList widget which is intended to 
 * display a variable length list of objects, which can be filtered;
 * See {@link Mojo.Widget.FilterList} for more info. 

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####
When your list is best navigated with a search field, particularly one where you would instantly filter the 
list as each character is typed into the field, you would want to use the FilterList widget. 
It is intended to display a variable length list of objects, which can be filtered through a call back function.

The widget has a text field displayed above a list, where the list is the result of applying the 
contents of the text field against some off-screen data source. The text field is hidden when empty, 
it's initial state but it is given focus in the scene so that any typing is captured in the field. 
As soon as the first character is entered, the framework displays the field and calls the specified filterFunction.


#### Declaration ####

		<div x-mojo-element="FilterList" id="listId" class="listClass" name="listName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element	Required	FilterList		Declares the widget as type 'FilterList' 
	    id				Required	Any String		Identifies the widget element for use when instantiating or rendering


#### Events ####

		Mojo.Event.listen("filterlistId", Mojo.Event.listTap, this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
	    Mojo.Event.listChange		{model:this.controller.model, item:dataObj, index: index + this.renderOffset, originalEvent:event}
	    Mojo.Event.listTap			event.value or model.value
	    Mojo.Event.listAdd	
	    Mojo.Event.listDelete		event.item
									event.index
	    Mojo.Event.listReorder		event.item
									event.toIndex
									event.fromIndex
	    Mojo.Event.filter			event.filterString
	 Mojo.Event.filterImmediate		event.filterString

    
#### Instantiation ####
    
		this.controller.setupWidget("filterlistId",
		     this.attributes = {
		         itemTemplate: "filterlistscene/static-list-entry",
		         listTemplate: "filterlistscene/static-list-container",
		         addItemLabel: $L("Add ..."),
		         swipeToDelete: true,
		         reorderable: true,
		         filterFunction: this.filterFunction.bind(this)},
		         delay: 350,
		         emptyTemplate:"filterlist/emptylist"
		     },
		     this.model = {
		         disabled: false
		});


#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		filterFunction		Function		Optional	None		Called to load items when the list is scrolled or filter changes. Function definition:
																		filterFunction (filterString, listWidget, offset, count)
		delay				Integer			Optional	300			Delay after entry before filter function is called (in ms)
		
		Plus all attributes available in the List widget


#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
	    disabled			Boolean			Optional	False		If true, filter field is disabled


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		getList		none			Get the List widget associated with this FilterList
		close		none			Close the FilterField associated with this FilterList
		open		none			Open the FilterField associated with this FilterList
		setCount	count (Integer) Set the count in the bubble in the FilterField associated with this FilterList
		
		
		Plus all methods available in the List widget and FilterField widget


*/
Mojo.Widget.FilterList = Class.create({
	/** @private */
	setup : function() {
		Mojo.assert(this.controller.element, "Mojo.Widget.FilterList requires an element");
		Mojo.assert(this.controller.attributes.filterFunction, "Mojo.Widget.FilterList requires a filter function");
		Mojo.assert(this.controller.attributes.itemTemplate, "Mojo.Widget.FilterList requires a template");

    	//setup an default widget values based on attributes
    	this.initializeDefaultValues();
    
		//render the list area
		this.renderWidget();
		
    	//setup an event observers; we process and forward these events
    	this.setupEventObservers();

	},

	
	setupEventObservers: function() {  
		this.handleFilter = this.handleFilter.bindAsEventListener(this);
  		this.controller.listen(this.controller.element, Mojo.Event.filter, this.handleFilter);
	},
	
	cleanup: function() {
		this.controller.stopListening(this.controller.element, Mojo.Event.filter, this.handleFilter);
	},
	
	close: function() {
		Mojo.Log.info("CLOSING FILTERFIELD");
		this.filterField.mojo.close();  
	},
	
	open: function() {
		this.filterField.mojo.open();  
	},
	
	//API for getting the list, so that apps can operate on the list directly
	getList: function() {
		return this.listElement;
	},

	initializeDefaultValues: function() {
    	this.filterString = "";
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		this.delay = this.controller.attributes.delay;
		this.listId = this.divPrefix + '-filterlist';
		this.filterFieldId = this.divPrefix+'-filterField';
		this.filterFieldName = this.divPrefix + "filterTextArea";	
	},

  
	wrappedFilterFunction: function(listWidget, offset, count) {
		//need to get all the existing apis from list to here
		//this is the soonest we have them
		//important to be available for the client the first time the items callback is called
		if (!this.controller.element.mojo) {
			this.controller.element.mojo = Object.clone(this.listElement.mojo);
			this.controller.exposeMethods(['getList', 'close', 'open', 'setCount', 'noticeUpdatedItems']);
		}
		this.controller.attributes.filterFunction(this.filterString, this.controller.element, offset, count);
  	},

	//missing params
	//ESSENTIAL that noticeUpdatedItems is called BEFORE setLength by client
	noticeUpdatedItems: function(offset, items) {
		//Only reset length to zero if this is a new filtering request AND it is the request for the first window of data
		if (this.isFirstFilter && offset === 0) {
			this.listElement.mojo.setLength(0);
			this.isFirstFilter = false;
			this.controller.scene.sceneScroller.mojo.scrollTo(undefined,0); //Jesse says reset the scroll position here
		}
		this.listElement.mojo.noticeUpdatedItems(offset, items);
	},

	setCount: function(count) {
		this.filterField.mojo.setCount(count);
	},
	
  /** @private **/
	renderWidget: function() {
		//pass through all attributes for list and for the filterfield; for list change the itemsCallback to my wrapped version
		var listAttributes = this.controller.attributes;
		var model = this.controller.model;
		var listTemplate = Mojo.Widget.getSystemTemplatePath('/filterlist/filterlist');
		var attributes = this.controller.attributes;
		var content;
		
		model.divPrefix = this.divPrefix;
		content = Mojo.View.render({object: model, template: listTemplate});
				
		attributes.filterFieldName =  this.filterFieldName;
		attributes.delay = this.controller.attributes.delay;
		
		Element.insert(this.controller.element, content); //draw this area into the div
		this.filterField = this.controller.get(this.filterFieldId);
		this.listElement = this.controller.get(this.listId);

		listAttributes.itemsCallback = this.wrappedFilterFunction.bind(this);
		this.controller.scene.setupWidget(this.filterFieldId, attributes, model);
		this.controller.scene.setupWidget(this.listId, listAttributes, this.controller.model);

		this.controller.instantiateChildWidgets(this.controller.element); //this should instantiate the big list and the filter field
	},
	
	handleFilter: function(e) {
		this.filterString = e.filterString;
		//instead of calling model changed, set this to length = 0 and immediately call the filter function again, but ignore the model changed callback
		this.isFirstFilter = true;
		this.wrappedFilterFunction(this.listElement, 0, this.listElement.mojo.maxLoadedItems()); //what is this really supposed to be?
	}
});

