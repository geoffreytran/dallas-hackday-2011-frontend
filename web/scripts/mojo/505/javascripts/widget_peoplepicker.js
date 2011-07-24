/**
 * @name widget_peoplepicker.js
 * @fileOverview This contains the definition of the PeoplePicker control; 
 * See {@link Mojo.Widget.PeoplePicker} for more info. 

Copyright 2009 Palm, Inc.  All rights reserved.

*/


/* -> move this code in -> 
	this.sortOrderRequest = AppAssistant.contactsService.getSortOrder(this.controller, this.handleSortOrder.bind(this));
*/



/***** utilities for PeoplePicker *****/

/**
@private
*/
Mojo.Contact = {};

Mojo.Contact.numberFields = ['imAvailability', 'contactCount', 'isMe'];
Mojo.Contact.DEFAULT_LIST_AVATAR = "images/generic-list-view-avatar.png";
Mojo.Contact.DEFAULT_DETAILS_AVATAR ="images/generic-details-view-avatar.png";
Mojo.Contact.PREFIXES = ["mr", "miss", "mrs", "ms", "dr"];
Mojo.Contact.SUFFIXES = ["jr", "sr", "i", "ii", "iii", "iv", "v", "vi", "phd", "md"];

/** initialize some commonly used formatted properties **/
//ANDY: Do I really need this?
Mojo.Contact.fixup = function(c) {
	// initialize some commonly used formatted properties
	c.firstNameFormatted = c.firstName || "";
	c.middleNameFormatted = c.middleName || "";
	c.lastNameFormatted = c.lastName || "";
	c.companyNameFormatted = c.companyName || "";
	c.displayTextFormatted = c.displayText || "";
	
	// fix up the number->string munging that returnStrings does
	Mojo.Contact.numberFields.each(function(field) {
		if (c[field]) {
			c[field] = parseInt(c[field], 10);
		}
	});
	
	//ANDY: can this be a formatter? Move this code out
	//fixup picture
	//Can put a flag in the model and really update the model and only format again if the flag not set
	if (c.pictureLoc) {
		c.pic = c.pictureLoc;
	} else if (c.imAvatarLoc) {
		c.pic = c.imAvatarLoc;
	} else {
		c.hasPic = "default-pic";
		c.pic = Mojo.Contact.DEFAULT_DETAILS_AVATAR;
		c.listPic = Mojo.Contact.DEFAULT_LIST_AVATAR;
	}
  
	if (c.contactCount > 1) {
		c.isClipped = "clipped";
		c.listIsClipped = "clipped";
		if (c.pic === Mojo.Contact.DEFAULT_DETAILS_AVATAR) {
			c.listPic = "";
		} else {
			c.listPic = c.pic;
		}
	} else {
		if (c.pictureLoc || c.imAvatarLoc) {
			c.listPic = c.pic;
			c.listIsClipped = "unclipped";
		} else {
			c.listPic = "";
			c.listIsClipped = "";
		}	
	}
};

	

//TODO: pulled out just the functions I wanted here
/** Move this code out?**/
/**
@private
*/

Mojo.ContactsPalmService = Class.create( {
  
	//list all contacts matching filter
	list: function(sceneController, filter, callback, subscriberId, offset, limit) {
		var params = {offset: offset, limit: limit, filter: filter };
		if (subscriberId) {
			params.subscriberId = subscriberId;	
		    return new Mojo.Service.Request(Mojo.ContactsPalmService.identifier, {
				method: 'newList',
				parameters: params,
				onSuccess: callback
			});
				
		} else {
			params.subscribe = true;		
			return sceneController.serviceRequest(Mojo.ContactsPalmService.identifier, {
				method: 'newList',
				parameters: params,
				onSuccess: callback
			});
		}
	},
	
	//Count is a separate call because it is slow
	count: function(sceneController, filter, callback) {
		return sceneController.serviceRequest(Mojo.ContactsPalmService.identifier, {
			method: 'newCount',
			parameters: { filter: filter },
			onSuccess: callback
		});
	},
	
	
	getSortOrder: function(sceneController, callback) {
		return sceneController.serviceRequest(Mojo.ContactsPalmService.identifier, {
			method: 'getSortOrder',
			parameters: {},
			onSuccess: callback
		});
	}
});

Mojo.ContactsPalmService.identifier = 'palm://com.palm.contacts';

Mojo.ContactFormatter = Class.create({
	/** @private **/
	_getDividerText: function(text) {
		return text[0];
	},
	
	/** @private **/
	_createContactDisplay: function(c) {
		if (c.firstNameFormatted) {
			c.display = c.firstNameFormatted;
			if (c.lastNameFormatted) {
				c.display += " ";
			}
		}
		if (c.lastNameFormatted) {
			c.display += c.lastNameFormatted;
		}
		if (c.display.blank()) {
			c.display = c.companyNameFormatted || "";
		}
		if (c.display.blank()) {
			c.display = c.displayTextFormatted || "";
		}
	},
	
	/** @private **/
	_formatLastFirstSort: function(c, filter) {
		if (c.lastNameFormatted) {
			c.dividerText = this._getDividerText(c.lastNameFormatted);
		}
		if (!c.display) {
			this._createContactDisplay(c);
		}
		if (!c.dividerText) {
			c.dividerText = this._getDividerText(c.display);
		}	
	},

	/** @private **/	
	_formatFirstLastSort: function(c, filter) {
		if (c.firstNameFormatted) {
			c.dividerText = this._getDividerText(c.firstNameFormatted);
		}	
		if (!c.display) {
			this._createContactDisplay(c);
		}	
		if (!c.dividerText) {
			c.dividerText = this._getDividerText(c.display);
		}
	},

	/** @private **/	
	_getCompanyDividerText: function(c) {
		return c.companyNameFormatted || "NONE";
	},

	/** @private **/	
	//ANDY: is this supposed to be exactly the same as first last sort??
	_formatCompanyLastFirstSort: function(c, filter) {
		if (!c.display) {
			this._createContactDisplay(c);
		}
		c.dividerText = this._getCompanyDividerText(c);
	},

	/** @private **/	
	_formatCompanyFirstLastSort: function(c, filter) {
		this._formatCompanyLastFirstSort(c, filter);
	},
	
	//format a list item correctly with filtering and displayname
	//TODO: consider making this a hash
	formatListItem: function(c, filter, sortOrder) {
		c.dividerText = undefined;
		c.display = c.displayTextFormatted;
		
		switch(sortOrder) {
			case Mojo.Widget.sortLastFirst:
				this._formatLastFirstSort(c, filter);
				break;
			case Mojo.Widget.sortFirstLast:
				this._formatFirstLastSort(c, filter);
				break;
			case Mojo.Widget.sortCompanyLastFirst:
				this._formatCompanyLastFirstSort(c, filter);
				break;
			case Mojo.Widget.sortCompanyFirstLast:
				this._formatCompanyFirstLastSort(c, filter);
				break;
			default:
				Mojo.Log.error("UNKNOWN SORT ORDER: " + sortOrder);
				break;
		}
		// FIXME: perf - should cache filter match patterns btw invocations
		//c.formattedText = c.display;
		c.formattedText = Mojo.PatternMatching.addContactMatchFormatting(c.display, filter);
	}
});


/**
TODO: Move this code out
**/
var IMName = Class.create({
	initialize: function(imStr) {
		this.value = imStr;
	}
});


IMName.NO_PRESENCE = 6; 
IMName.PENDING = 5;
IMName.OFFLINE = 4; 
IMName.INVISIBLE = 3;
IMName.BUSY = 2;
IMName.IDLE = 2;
IMName.STEPPED_OUT = 2;
IMName.BE_RIGHT_BACK = 2;
IMName.NOT_AT_MY_DESK = 2;
IMName.ON_THE_PHONE = 2;
IMName.OUT_TO_LUNCH = 2;
IMName.MOBILE = 1;
IMName.FREE_FOR_CHAT = 0;      
IMName.ONLINE = 0;

/*** END UTILITIES ****/



/**
### Overview ###
A simple picker that presents names from the current contents of the user's Contacts database, 
the People Picker is easy to integrate into your scene using the conventional techniques. 
In action, the People Picker behaves like a Filter List; if you didn't provide a value in the 
initialSearch property then the text field is hidden, activating once something is typed. The 
full contacts list is displayed in the sort order that you specify using the sortOrder model 
property set appropriately with LastName, FirstName being the default order.

### Declaration ###

		<div x-mojo-element="PeoplePicker" id="peoplepickerId" class="peoplepickerClass" name="peoplepickerName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element	Required	PeoplePicker	Declares the widget as type 'PeoplePicker' 
	    id				Required	Any String		Identifies the widget element for use when instantiating or rendering
	    class			Optional	Any String		There isn't a default class for PeoplePicker but you can assign one if you want apply custom styling 
	    name			Optional	Any String		Add a unique name to the peoplepicker widget; generally used in templates when used 


### Events ###

		Mojo.Event.listen("peoplepickerId",'Mojo.Event.listTap', this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
	    Mojo.Event.listTap				event.item.id	Respond to tap from search action


### Instantiation ###

		this.controller.setupWidget("peoplepickerId",
			this.attributes = {
				},
			this.model = {
				sortOrder: Mojo.Widget.sortLastFirst
		});


### Attribute Properties ###

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
	    exclusion			Array			Optional	Null		Array of Contact IDs to exclude from search
	    initialSearch		String			Optional	Null		Initial string for search field


### Model Properties ###

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
	    sortOrder			Integer			Required	null		Sort options: 
																			Mojo.Widget.sortLastFirst,
																			Mojo.Widget.sortFirstLast,
																			Mojo.Widget.sortCompanyLastFirst,
																			Mojo.Widget.sortCompanyFirstLast


### Methods ###

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		None


@field
@private
*/

Mojo.Widget.PeoplePicker = Class.create({
	/** @private */
	DELAY: 1, //miliseconds; 300; 800 or 600?
	LOOKAHEAD: 30,
	RENDER_LIMIT: 30,
	SCROLL_THRESHOLD: 400,
	
	/** @private */
	setup: function() {	
		this.initializeDefaultValues();
		this.renderWidget();
		this.setupEventObservers();
		this.controller.exposeMethods(['reset']);
	},
	
	formatPresence: function(presence) {
		var formatted;
		switch (presence) {
			case IMName.BUSY:
				formatted = $LL('busy');
				break;
			case IMName.IDLE:
				formatted = $LL('idle');
				break;
			case IMName.ONLINE:
				formatted = $LL('available');
  				break;
 			case IMName.OFFLINE:
				formatted = $LL('offline');
				break;
		}
		return formatted;
	},
	
	//wrapped callback for filtering contacts
	getItems: function(filter, listWidget, offset, limit) {
		if (this.initialSearch) {
			this.curOffset = offset;
			this.curLimit = limit;
		}
		if (this.filter === undefined || this.filter !== filter) {
			this.curFilter = filter;
			filter = this.initialSearch || filter; //set this for the first search
			this.filter = filter; //set this to the real filter
			this.dataSource.setParam(filter);
			this.dataSource.setDoCount(!filter || filter.length === 0);
			//version for running with mock data on mojo host
		}
		if (Mojo.Host.current === Mojo.Host.browser) {
			var service = new Mojo.Widget.MockContactsService(this.transformListResults.bind(this));
			service.setParam(filter);
			service.list(listWidget, offset, limit);
		} else {
			this.dataSource.fetchItems(listWidget, offset, limit);
		}
	},
	
	//render the original widget
	renderWidget: function() {
		var model = {
			divPrefix: this.divPrefix
		};
		var content = Mojo.View.render({template: Mojo.Widget.getSystemTemplatePath('people-picker/list-scene'), object: model});
		var formatters = {
			imAvailability:this.formatPresence.bind(this)
		};
		this.listAttrs = this.controller.attributes;
		this.listAttrs.itemTemplate = Mojo.Widget.getSystemTemplatePath('people-picker/contact_entry');
		this.listAttrs.filterFunction = this.getItems.bind(this);
		this.listAttrs.formatters = formatters;
		this.listAttrs.delay = this.DELAY;
		this.listAttrs.optimizedOptIn = true;
		this.listAttrs.lookahead = this.LOOKAHEAD;
		this.listAttrs.renderLimit = this.RENDER_LIMIT;
		this.listAttrs.scrollThreshold = this.SCROLL_THRESHOLD;
		this.listAttrs.dividerTemplate = Mojo.Widget.getSystemTemplatePath('people-picker/group_separator');
		this.listAttrs.dividerFunction = this.getDivider;

		this.controller.element.innerHTML = content;
		//if the list is empty what to show instead
		this.emptyDiv = this.controller.get(this.divPrefix+'-list-empty');
		this.emptyDiv.hide();
		
		this.controller.scene.setupWidget(this.filterList, this.listAttrs, this.filterListModel);
		this.controller.instantiateChildWidgets(this.controller.element);
		this.filterListWidget = this.controller.get(this.filterList);
	},
	
	//callback for sort order preference service call
	handleSortOrder: function(response) {
		var template;
		this.sortOrder = response.order;	
		// TODO: Can a list have its attributes dynamically like this?
		template = (this.sortOrder === Mojo.Widget.sortCompanyFirstLast || this.sortOrder === Mojo.Widget.sortCompanyLastFirst) ? 'people-picker/multiline-separator' : 'people-picker/group_separator';
		this.listAttrs.dividerTemplate = Mojo.Widget.getSystemTemplatePath(template);
	},
	
	
	//set sort order of results list based on passed in preference from client app, default, or service call to preferences
	setSortOrder: function() {
		if (this.controller.model.sortOrder) {
			this.sortOrder = this.controller.model.sortOrder;
		} else if (Mojo.Host.current === Mojo.Host.browser) {
			this.sortOrder = Mojo.Widget.sortLastFirst;
		} else {
			this.contactsService.getSortOrder(this.controller.scene, this.handleSortOrder);
		}
	},
	
	
	//reset the sort order and update
	reset: function() {
		delete this.sortOrder;
		this.setSortOrder();
		this.dataSource.doUpdate();
	},
	
	initializeDefaultValues: function() {
		this.exclusion = this.controller.attributes.exclusion;
		this.handleSortOrder = this.handleSortOrder.bind(this);
		this.initialSearch = this.controller.attributes.initialSearch;
		this.contactsService = new Mojo.ContactsPalmService();
		this.setSortOrder(); //start the req for the sort order preference
		this.divPrefix = Mojo.View.makeUniqueId();
		//TODO: this is default; fetch this from the preferences OR have it passed in; which is faster/ makes more sense?
		//default could be pull from prefs if not specified
		this.filterList = this.divPrefix+'-ppl-filterlist';
		//so we have a handle for updates
		this.filterListModel = {};
		//use the active record list bridge to make the query more performant
		this.dataSource = new Mojo.ActiveRecordListBridge(
								this.contactsService.list.curry(this.controller.scene),
								this.contactsService.count.curry(this.controller.scene),
								this.transformListResults.bind(this)
							);
		//formatter: formats the contact object for display in the list
		this.formatter = new Mojo.ContactFormatter();
	},
	
	//TODO: deprecate this and just make people use listTap!
	setupEventObservers: function() {
		this.handleSelection = this.handleSelection.bindAsEventListener(this);
		this.controller.listen(this.controller.element, Mojo.Event.listTap, this.handleSelection);
	},

	//TODO: deprecate this and just make people use listTap!
	handleSelection: function(event) {
		var targetRow = this.controller.get(event.item);
		var itemId;
		if (targetRow) {
			//cut this off at the end
			itemId = targetRow.id;
			Mojo.Event.send(this.controller.element, Mojo.Event.peoplePickerSelected, {item: itemId});
		}
	},
	
	//Get information to draw the dividers between sets of items
	//make all dividers the same case so that they match and do not repeat
	getDivider: function(item) {
		if (!item.exclude && item.dividerText) {
    		return item.dividerText.toUpperCase();
		}
  	},


	//when results are returned, call this to properly format the contacts for display
	transformListResults: function(data) {
		var list = data.list;
		var that = this;
		var offset = this.curOffset, limit = this.curLimit, filter = this.curFilter;
		
		if (!list) {
			Mojo.Log.error("Transformlistresults did not receive a list of data. Bailing out.");
			return;
		}
		
		if (this.initialSearch) {
			//there was an initial search that we put out, so clear it
			this.initialSearch = undefined;
			this.curOffset = undefined;
			this.curLimit = undefined;
			this.curFilter = undefined;
			
			
			//if the search returned no results, then issue another search without any initial search
			if (list.length === 0) {
				this.getItems(filter, this.filterListWidget, offset, limit);
		    	return;
			}
		}
		

		list.each( function(contact) {
			if (that.exclusion) {
				//check the id and maybe set as hidden here
				if (that.exclusion.indexOf(contact.id) != -1) {
					contact.exclude = 'exclude';
				}
			}
			Mojo.Contact.fixup(contact);
			that.formatter.formatListItem(contact, that.filter, that.sortOrder);
		});	

		if (data.offset === 0 && list.length === 0) {
			this.emptyDiv.show();
		} else {
			this.emptyDiv.hide();
		}
	},
	
	
	cleanup: function() {
		//kill requests
		this.dataSource.cleanup();
		this.controller.stopListening(this.controller.element, Mojo.Event.listTap, this.handleSelection);
	}
});




	
/** This will this file to be considered private from a documentation perspective */
/**#@-*/