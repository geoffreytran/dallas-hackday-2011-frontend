/**
Move this code out 

Copyright 2009 Palm, Inc.  All rights reserved.

**/
var contactsListResponse = {"list":[],"count":12};



Mojo.Widget.MockContactsService = Class.create( {
	initialize: function(formatter, exclusionList) {
	  this.formatter = formatter;
	  this.exclusion = exclusionList;
	  this.filterString = "";
	},


	setParam: function(filter) {
		this.filter = filter;
	},
	
	list: function(filterListWidget, offset, count) {
	  var data = {
	    list: contactsListResponse.list.slice(offset, offset+count),
	    count: contactsListResponse.count
	  };
	this.formatter(data);
	filterListWidget.mojo.noticeUpdatedItems(offset, data.list);
	filterListWidget.mojo.setLength(data.count);
	filterListWidget.mojo.setCount(data.count);
	} 
});



//UNCOMMENT THIS LINE FOR MOCK DATA
//Mojo.Widget.ContactsService = Mojo.Widget.MockContactsService;