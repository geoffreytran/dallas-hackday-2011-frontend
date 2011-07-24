/* Copyright 2009-2011 Hewlett-Packard Development Company, L.P. All rights reserved. */
enyo.kind({
	name: "InAppPayment",
	kind: enyo.HFlexBox,
	components: [
		{kind:enyo.VFlexBox, width:'320px', style:"border-right: 2px solid;", components: [
			{kind: "PageHeader", components: [
				{content: "Items For Sale"}
			]},
			{flex: 1, kind: "Pane", components: [
					{name: "itemList", kind: "VirtualList", flex: 1, onSetupRow: "listSetupRow", components: [
							{kind: "Item", layoutKind: "VFlexLayout", onclick: "getItemInfo", components: [
								{name: "itemTitle"}
							]}
					]},
				]}
		]},
		{kind: "ItemInfoPane", name:"itemInfoPane", flex:1},
		{
			name: "getItems", 
			kind: enyo.PalmService,
		    service: "palm://com.palm.service.payment/",
		    method: "getAvailableItems",
		    onSuccess: "availableItemsSuccess",
		    onFailure: "availableItemsFailure",
		},	
		{name: "errorDialog", kind: "Dialog", lazy:false, components: [
			{name:"errorMessage", style: "padding: 12px", content: ""},
			{kind: "Button", caption: "Close", onclick: "closeDialog"}
		]},
	],
	create: function() {
		this.inherited(arguments);
		this.results = [];
		this.getItemList();
	},
	listSetupRow: function(inSender, inRow) {
		var r = this.results[inRow];
		if (r) {
			this.$.itemTitle.setContent(r.title);
			return true;
		}
	},
	getItemList: function() {
		this.$.getItems.call({
			"includePerishable"    : true, 
		    "includeNonPerishable" : true, 
		    "includePurchased"     : true, 
		    "includeNotPurchased"  : true
		});	
	},
	availableItemsSuccess: function(inSender, inResponse) {
		this.results = inResponse.itemInfos;
		this.$.itemList.refresh();
	},
	availableItemsFailure: function(inSender, inResponse){
		this.$.errorMessage.setContent(enyo.json.stringify(inResponse))
		this.$.errorDialog.open();
	},
	closeDialog: function() {
		this.$.errorDialog.close();
	},
	getItemInfo: function(inSender, inEvent, inRowIndex) {
		this.$.itemInfoPane.setItemId(this.results[inRowIndex].itemId);
	}
});