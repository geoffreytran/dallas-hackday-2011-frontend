/* Copyright 2009-2011 Hewlett-Packard Development Company, L.P. All rights reserved. */
enyo.kind({
	name: "ItemInfoPane",
	kind: enyo.VFlexBox,
	published: {
		itemId: null,
	},
	components: [
		{kind: "PageHeader", components: [
			{content: "Item Info"}
		]},
		{flex: 1, kind: "Pane", components: [
			{flex: 1, kind: "Scroller", components: [
				{flex: 1, name: "statusInfo", kind: "HtmlContent", content:"Choose an item on the left."},
				{name: "itemInfo", kind: "RowGroup", defaultKind: "HFlexBox", components: [
					{align: "center", tapHighlight: false, components: [
						{content: "Title", flex: 1},
						{name: "title"}
					]},
					{align: "center", tapHighlight: false, components: [
						{content: "ID", flex: 1},
						{name: "itemId"}
					]},
					{align: "center", tapHighlight: false, components: [
						{content: "Type", flex: 1},
						{name: "type"}
					]},
					{align: "center", tapHighlight: false, components: [
						{content: "Summary", flex: 1},
						{name: "summary"}
					]},
					{align: "center", tapHighlight: false, components: [
						{content: "Currency", flex: 1},
						{name: "currency"}
					]},
					{align: "center", tapHighlight: false, components: [
						{content: "Price", flex: 1},
						{name: "price"}
					]},
					{align: "center", tapHighlight: false, components: [
						{content: "Times Purchased", flex: 1},
						{name: "timesPurchased"}
					]},
					{align: "center", tapHighlight: false, components: [
						{content: "Note: The receiptInfo and signedReceipt objects are not displayed here for brevity.", flex: 1}
					]},
				]},
				{name: "purchaseInfo", kind: "RowGroup", defaultKind: "HFlexBox", components: [
					{align: "center", tapHighlight: false, components: [
						{content: "Order Number", flex: 1},
						{name: "orderNo", content: ""}
					]},
					{align: "center", tapHighlight: false, components: [
						{content: "Receipt Status", flex: 1},
						{name: "receiptStatus", content: ""}
					]},
					{align: "center", tapHighlight: false, components: [
						{content: "SKU", flex: 1},
						{name: "sku", content: ""}
					]},			
					{align: "center", tapHighlight: false, components: [
						{content: "Note: The receipt object is not displayed here for brevity.", flex: 1}
					]},																						
				]},	
			]}
		]},				
		{kind: "Toolbar", components: [
			{name: "buyButton", content: "", onclick: "purchaseItem"}
		]},
		{name: "errorDialog", kind: "Dialog", lazy:false, components: [
			{name:"errorMessage", style: "padding: 12px", content: ""},
			{kind: "Button", caption: "Close", onclick: "closeDialog"}
		]},
		{
			name: "getInfo", 
			kind: enyo.PalmService,
		    service: "palm://com.palm.service.payment/",
		    method: "getItemInfo",
		    onSuccess: "itemInfoSuccess",
		    onFailure: "itemInfoFailure",
		},
		{
			name: "makePurchase", 
			kind: enyo.PalmService,
		    service: "palm://com.palm.service.payment/",
		    method: "purchaseItem",
		    onSuccess: "purchaseItemSuccess",
		    onFailure: "purchaseItemFailure",
		}
	],
	create: function() {
		this.inherited(arguments);
		this.$.itemInfo.setStyle("display:none;")
		this.$.purchaseInfo.setStyle("display:none;")
	},
	itemIdChanged: function() {
		this.$.getInfo.call({
			"itemId"          : this.itemId,
			"includeReceipts" : false,
			"maxReceipts"     : 5
		});
	},
	closeDialog: function() {
		this.$.errorDialog.close();
	},
	itemInfoSuccess: function(inSender, inResponse) {
		//if they haven't purchased the item before then enable the buy button
		if (inResponse.itemInfo.itemStatus.timesPurchased == 0)
		{
			this.$.buyButton.setCaption("Buy")
			this.$.buyButton.disabled = false;
		} else {
			//perishable items can be bought multiple times, otherwise disable the buy button
			if (inResponse.itemInfo.type == "Perishable") {
				this.$.buyButton.setCaption("Buy More")
				this.$.buyButton.disabled = false;
			} else {
				this.$.buyButton.setCaption("Already Purchased")
				this.$.buyButton.disabled = true;				
			}
		}
		
		this.$.title.setContent(inResponse.itemInfo.title);
		this.$.itemId.setContent(inResponse.itemInfo.itemId);
		this.$.type.setContent(inResponse.itemInfo.type);
		this.$.summary.setContent(inResponse.itemInfo.summary);
		this.$.currency.setContent(inResponse.itemInfo.currency);
		this.$.price.setContent(inResponse.itemInfo.price);
		this.$.timesPurchased.setContent(inResponse.itemInfo.itemStatus.timesPurchased);
		
		this.$.itemInfo.setStyle("display:show;")
		this.$.statusInfo.setStyle("display:none;")
		this.$.purchaseInfo.setStyle("display:none;")
	},
	itemInfoFailure: function(inSender, inResponse){
		this.$.errorMessage.setContent(enyo.json.stringify(inResponse))
		this.$.errorDialog.open();
	},
	purchaseItem: function(){
		this.$.makePurchase.call({
			"itemId"          : this.$.itemId.getContent(),
			"quantity"   : 1,
		   	"vendorData" : "vendorDataTest"
		});
		
		this.$.itemInfo.setStyle("display:none;")
		this.$.statusInfo.setStyle("display:show;")
		this.$.statusInfo.setContent("Attempting to make purchase...")
		this.$.buyButton.setCaption("Purchase in Progress")
		this.$.buyButton.disabled = true;
	},
	purchaseItemSuccess: function(inSender, inResponse) {
		this.$.statusInfo.setStyle("display:none;")
		this.$.purchaseInfo.setStyle("display:show;")
		
		if (inResponse.receiptStatus == "PreviousPurchasePending"){
			this.$.buyButton.setCaption("Previous Purchase Pending")
			this.$.buyButton.disabled = true;
		} else{
			this.$.buyButton.setCaption("Buy More")
			this.$.buyButton.disabled = false;
		}
		
		this.$.receiptStatus.setContent(inResponse.receiptStatus);
		this.$.orderNo.setContent(inResponse.orderNo);
		this.$.sku.setContent(inResponse.sku);
	},
	purchaseItemFailure: function(inSender, inResponse){
		this.$.errorMessage.setContent(enyo.json.stringify(inResponse))
		this.$.errorDialog.open();
	}
});