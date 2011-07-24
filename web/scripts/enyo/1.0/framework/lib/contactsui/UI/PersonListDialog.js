/* Copyright 2009-2011 Hewlett-Packard Development Company, L.P. All rights reserved. */
/*jslint white: true, onevar: true, undef: true, eqeqeq: true, plusplus: true, bitwise: true, 
regexp: true, newcap: true, immed: true, nomen: false, maxerr: 500 */
/*global ContactsLib, document, enyo, console, crb */

/* 

SETUP PARAMETERS 
  mode: <string> - one of "noFilter", "favoritesOnly", "noFavoritesOnly". Defaults to "noFilter"
  exclusions: <array of <str>> - array of strings containing mojodb person _id's. Defaults to no exclusions : []
  showSearchBar: <bool> //only works when mode = noFilter
  enableGAL: <bool> - global address lookup enable flag. default: false
  showIMStatuses: <bool> - enable flag for IM status indicator for messaging contacts (not available yet in webOS 3.0)
  resizeOnSearchFocus: <bool> - If you don't want it to resize your window when the search field receives focus then set this to false.  Defaults to true.
	showFavStars: <bool> - show favorites stars

EVENTS
  onContactClick: <fxn> - function to call back when person is tapped
	onListUpdated: the list updates
	onSearchCriteriaUpdated: typing or deleting (non-empty search field)
	onSearchCriteriaCleared: search field cleared
	onCancelClick: when the done or cancel button is tapped

*/



enyo.kind({
	name		: "com.palm.library.contactsui.personListDialog",
	kind		: "ModalDialog",
	layoutKind	: "VFlexLayout",
	caption		: crb.$L("Make A Selection"),
	scrim		: true,
//	height		: "500px",

	events:
	{	
		onContactClick: "",
		onListUpdated: "",
		onSearchCriteriaUpdated: "",
		onSearchCriteriaCleared: "",
		onCancelClick: ""
	},

	published:
	{	
		exclusions : [],
		mode: "noFilter",
		showSearchBar: true,
		showIMStatuses: true,
		showFavStars: true,
		enableGAL: false	
	},

	components: [
		{kind: "Control", height: "300px", layoutKind: "VFlexLayout", className: "group", components: [
			{name: "listWrapper", flex: 1, style: "margin: -6px -10px -10px;", components: [], kind: "VFlexBox"}
		]},
		{kind: "Button", caption: crb.$L("Cancel"), onclick: "doCancelClick"}
	], //VFlexBox container for personListWidget did not work out; add components dynamically to component list in create() only!

	componentsReady: function () {
		this.inherited(arguments);
		this.$.listWrapper.createComponent({kind: "com.palm.library.contactsui.personListWidget", 
			name: "personListWidget", 
			//width: "320px", 
			height: "100%",
			flex: 1,
			mode: this.mode, 
			showSearchBar: this.showSearchBar, 
			showAddButton: false, 
			onContactClick: "doContactClick", 
			onListUpdated: "doListUpdated", 
			onAddClick: enyo.nop, 
			onSearchCriteriaUpdated: "doSearchCriteriaUpdated", 
			onSearchCriteriaCleared: "doSearchCriteriaCleared", 
			showIMStatuses: this.showIMStatuses, 
			showFavStars: this.showFavStars,
			enableGAL: this.enableGAL,
			owner: this
		});
	},
	open: function () {
		this.inherited(arguments);

		this.$.personListWidget.punt();
		if (this.exclusions && typeof(this.exclusions) === "array") {
			this.$.personListWidget.setExclusions = this.exclusions;
		}
//		this.$.personListWidget.setMode(this.mode);
	},	
/*create: function create(){
		this.inherited (arguments);
		
	},
	ready: function (inWide) {
	this.$.contacts.setManager(this.$.left);
	this.$.contacts.setParent(this.$.left);
	this.$.left.show();
	if (this.hasNode()) {
	  this.render();
	}
  },
	ready: function(){
//		this.$.personListWidget.show();
		this.$.personListWidget.refresh();
	},

	closeDialog: function closeDialog(){
		this.close();
	},
*/
	closeDialog: function () {
		this.clearSearchField();
		this.close();
	},
	clearSearchField: function () {
		this.$.personListWidget.clearSearchField();
	},
	setExclusions : function (exclusions) {
		this.$.personListWidget.setExclusions(exclusions);
	}
	
});		
