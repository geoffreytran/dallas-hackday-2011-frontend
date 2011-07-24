/**
 * @name widget_grid.js
 * @fileOverview This file discusses The GridList widget is intended to display a variable length list of objects in a grid;
 * See {@link Mojo.Widget.ExperimentalGridList} for more info. 

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
@private
### Overview ###
This widget will enable you to present items in a grid layout, with most of the optional attributes 
that you have in the base List widget. The GridList is declared, setup and managed just as with 
the List widget and has most of the same attributes and behavior. In fact, the developer interface 
is so close to the List widget that you should use the last section as the basic description for 
GridList, and we'll point out only the differences in this section.

There isn't an option to define an items property in the widget model, you must use the 
itemsCallback attribute property to set a handler to fill out the list contents. It is called 
during setup of the widget and when the widget needs additional items to display.


### Declaration ###

		<div x-mojo-element="ExperimentalGridList" id="listId" class="listClass" name="listName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element	Required	GridList		Declares the widget as type 'GridList' 
	    id				Required	Any String		Identifies the widget element for use when instantiating or rendering
	    class			Optional	Any String		Provide your own unique class and override the frameworks styles
	    name			Optional	Any String		Add a unique name to the gridlist widget; generally used in templates when used 


### Events ###

		Mojo.Event.listen("gridlistId", 'mojo-listTap', this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
	    Mojo.Event.listChange            event.value or model.value
	    Mojo.Event.listTap               event.value or model.value
	    Mojo.Event.listAdd	
	    Mojo.Event.listDelete            event.item
	                               event.index
	    Mojo.Event.listReorder           event.item
	                               event.toIndex
	                               event.fromIndex


### Instantiation ###
    
		this.controller.setupWidget("gridlistId",
		     this.attributes = {
		         itemTemplate: 'gridlistscene/static-list-entry',
		         listTemplate: 'gridlistscene/static-list-container',
		         addItemLabel: $L('Add ...'),
		         swipeToDelete: true,
		         reorderable: true,
		         itemsCallback: this.gridListCallback.bind(this)},
		         emptyTemplate:'gridlist/emptylist'
		     },
		     this.model = {
		         columns: 3
		     });


### Attribute Properties ###

		Attribute Property		Type		Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		listTemplate			String		Optional				File path relative to app folder for container template
		itemTemplate			String		Required				File path relative to app folder for item template
		itemsCallback			Function	Required				Items will be loaded as needed by calling this function
		addItemLabel			String		Optional	None		If defined, a special "add" item will be appended to the list and taps 
																	on this item will generate a 'mojo-list-add' event. The string is used 
																	to label the entry; if null, then it will default to "+Add".
		formatters				Function			
		itemsProperty			String		Optional	items		Model property for items list
		swipeToDelete			Boolean		Optional	FALSE		If true, list entries can be deleted with a swipe
		reorderable				Boolean		Optional	FALSE		If true, list entries can be reordered by drag & drop
		dividerFunction			Function	Optional				Function to create divider elements
		dividerTemplate			Function	Optional				Function to format divider
		initialAverageRowHeight	Integer		Optional	?			Initial value used for average height estimation
		renderLimit				Integer		Optional	20			Max number of items to render at once; increase this if the UI overruns the list boundaries
		lookahead				Integer		Optional	15			Number of items to fetch ahead when loading new items
		dragDatatype			String		Optional	None		Used for drag&drop reordering. If specified will allow items to be dragged 
																	from one list to another of the same datatype
		deletedProperty			String		Optional				deleted	Name of the item object property in which to store the deleted status of an item
		nullItemTemplate		String		Optional	default template	File path relative to app folder for template for items that are rendered before loading


### Model Properties ###

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
	    columns         Integer     Optional    1           The number of columns in the grid


### Methods ###

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		setLength	length			Sets new grid length
		updateItems	Offset, Items	Sets new items into the grid

*/

Mojo.Widget.ExperimentalGridList = Class.create({
	/** @private */
	setup : function() {
		Mojo.assert(this.controller.element, "Mojo.Widget.GridList requires an element");
		Mojo.assert(this.controller.attributes.itemTemplate, "Mojo.Widget.FilterList requires a template");
		Mojo.assert(this.controller.model.columns, "Mojo.Widget.FilterList requires number of columns");
		
		this.controller.exposeMethods(['setLength','updateItems']);
    	//setup an default widget values based on attributes
    	this.initializeDefaultValues();
    
		//render the list area
		this.renderWidget();
		

	},

	initializeDefaultValues: function() {
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		this.listId = this.divPrefix + '-gridlist';	
		this.controller.model.columns = this.controller.model.columns || 1;
	},

  /** @private **/
	renderWidget: function() {
		Mojo.Log.info("rendering it!");
		var model = {
			'divPrefix' : this.divPrefix
		};
		this.realContent = Mojo.View._loadTemplate(Mojo.View._calculateTemplateFileName(this.controller.attributes.itemTemplate));
		var listTemplate = Mojo.Widget.getSystemTemplatePath('/gridlist/gridlist');
		var itemTemplate = Mojo.Widget.getSystemTemplatePath('/gridlist/itemwrapper');
		var content = Mojo.View.render({object: model, template: listTemplate});
		this.itemWidth = Math.floor(this.controller.element.offsetWidth / this.controller.model.columns);
		this.controller.element.insert(content); //draw this area into the div
		this.formatters = this.controller.attributes.formatters;
		this.controller.scene.setupWidget(this.listId, 
									{itemTemplate: this.controller.attributes.itemTemplate, secondaryItemTemplate: itemTemplate,
									itemsCallback:this.wrappedItemsCallback.bind(this), formatters: this.controller.attributes.formatters, swipeToDelete:this.controller.attributes.swipeToDelete, reorderable:this.controller.attributes.reorderable, listTemplate: this.controller.attributes.listTemplate, 	addItemLabel: this.controller.attributes.addItemLabel, itemsProperty: this.controller.attributes.itemsProperty, dividerFunction: this.controller.attributes.dividerFunction, dividerTemplate: this.controller.attributes.dividerTemplate, renderLimit: 20*this.controller.attributes.columns, lookahead: 20*this.controller.attributes.columns}, this.controller.model);

		this.controller.instantiateChildWidgets(this.controller.element); //this should instantiate the big list and the filter field
	},
	
	setLength: function(l) {
		this.listElement.mojo.setLength(l);
	},
	
	updateItems: function(offset, items) {
		var that = this;
		items.each(function (i) {
			i.width = that.itemWidth;
		});
		this.listElement.mojo.noticeUpdatedItems(offset, items);
	},
	
	wrappedItemsCallback : function(widget, offset, limit) {
		var real_offset = offset;
		var real_limit  = limit *  this.controller.model.columns;
		this.listElement = widget;
		this.activeRequest = this.controller.attributes.itemsCallback(this.controller.element, real_offset, real_limit); //have this widgets callbacks called
	},
	
	handleModelChanged: function() {
		//on model changed, update the list
		this.itemWidth = Math.floor(this.controller.element.offsetWidth / this.controller.model.columns);
		this.controller.scene.modelChanged(this.controller.model);
	}
});

