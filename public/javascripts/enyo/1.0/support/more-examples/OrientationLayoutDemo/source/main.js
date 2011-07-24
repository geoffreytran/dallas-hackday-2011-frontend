/* Copyright 2009-2011 Hewlett-Packard Development Company, L.P. All rights reserved. */
enyo.kind({ 
	name: "Main", 
	kind: "enyo.Pane",
	components: [ 
		{kind: "ApplicationEvents", onWindowRotated: "setView"},
		
		{kind: "LandscapeView", name: "landscape", showing: false},
		{kind: "PortraitView", name: "portrait", showing: false},
	],

	create: function(launchParams) {
		this.inherited(arguments);
		this.setView();
		this.getLocTime();
	},
	
	getLocTime: function() {
		var fmt = new enyo.g11n.DateFmt({
            date: "long",
            time: "long",
        });
		this.$.landscape.$.header.setContent(fmt.format(new Date()));
		
        var shortfmt = new enyo.g11n.DateFmt({
            date: "short",
            time: "short",
			twelveHourFormat: false
        });
        this.$.portrait.$.header.setContent(shortfmt.format(new Date()));
	},
	
	setView: function(inSender) {
		if (enyo.getWindowOrientation() == "right" || enyo.getWindowOrientation() == "left") {
			this.$.portrait.show();
			this.$.landscape.hide();
		} else {
			this.$.portrait.hide();
			this.$.landscape.show();
		}
	}
});


/* *** Landscape View Layout *** */

enyo.kind({ 
	name: "LandscapeView", 
	kind: "enyo.VFlexBox",
	components: [
		{kind: "PageHeader", name: "header"},
		{kind: "enyo.FadeScroller", horizontal: true, vertical: false, autoHorizontal: false, style: "margin-top: 20px", height: "200px",
		components: [
			{kind: "Content1", layoutKind: "HFlexLayout"}
		]},
		
		
		{kind: "enyo.HFlexBox", flex: 1, components: [
		
			{kind: "enyo.VFlexBox", flex: 2, style: "margin-right: 16px", components: [
				{kind: "enyo.FadeScroller", horizontal: true, vertical: false, autoHorizontal: false, style: "margin-top: 20px", height: "200px",
				components: [
					{kind: "Content2", layoutKind: "HFlexLayout"}
				]},
			
				{kind: "enyo.FadeScroller", horizontal: true, vertical: false, autoHorizontal: false, style: "margin-top: 20px", height: "200px", 
				components: [
					{kind: "Content3", layoutKind: "HFlexLayout"}
				]},
			]},
			
			{kind: "enyo.FadeScroller", flex: 1, horizontal: false, vertical: true , autoHorizontal: false, style: "margin-top: 20px", flex: 1,
			components: [
				{kind: "Content4", layoutKind: "VFlexLayout"}
			]},
		]}
	]
});


/* *** Portrait View Layout *** */

enyo.kind({ 
	name: "PortraitView", 
	kind: "enyo.VFlexBox",
	components: [
	{kind: "PageHeader", name: "header", style: "background-color: PowderBlue"},
	{kind: "enyo.FadeScroller", horizontal: true, vertical: false, autoHorizontal: false, style: "margin-top: 20px", height: "200px",
	components: [
		{kind: "Content1", layoutKind: "HFlexLayout"}
	]},
	
	{kind: "enyo.FadeScroller", horizontal: true, vertical: false, autoHorizontal: false, style: "margin-top: 20px", height: "200px",
	components: [
		{kind: "Content2", layoutKind: "HFlexLayout"}
	]},
	
	{kind: "enyo.FadeScroller", horizontal: true, vertical: false, autoHorizontal: false, style: "margin-top: 20px", height: "200px",
	components: [
		{kind: "Content3", layoutKind: "HFlexLayout"}
	]},
	
	{kind: "enyo.FadeScroller", horizontal: false, vertical: true, autoHorizontal: false, style: "margin-left: 10px; margin-top: 20px", flex: 1,
	components: [
		{kind: "Content4", layoutKind: "HFlexLayout"}
	]},
	]
});


/* *** Contents *** */

enyo.kind({ 
	name: "Content1", 
	kind: "enyo.Control",
	components: [
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/city/9"}]},
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/city/6"}]},
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/city/4"}]},
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/city/1"}]},
	],
});

enyo.kind({ 
	name: "Content2", 
	kind: "enyo.Control",
	components: [
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/nature/6"}]},
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/nature/10"}]},
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/nature/7"}]},
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/nature/8"}]},
	],
});

enyo.kind({ 
	name: "Content3", 
	kind: "enyo.Control",
	components: [
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/animals/7"}]},
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/animals/6"}]},
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/animals/9"}]},
		{className: "content-box", components:[{kind:"enyo.Image", src: "http://lorempixum.com/300/200/animals/2"}]},
	],
});

enyo.kind({ 
	name: "Content4", 
	kind: "enyo.Control",
	components: [
		{className: "text-box", style: "margin-bottom: 20px", allowHtml: true, components:[{content: "<strong style='color:green'>Install this app to a device, and rotate the device to change its screen orientation. Notice how the layout changes!</strong>"}]},
		{className: "text-box", style: "margin-bottom: 20px", components:[{content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean quis turpis eu orci varius sollicitudin aliquam id metus. Vestibulum malesuada tellus nisi. Morbi ac mattis ipsum. Praesent dapibus diam id felis bibendum viverra nec eu libero. Aliquam nec nisi euismod quam hendrerit faucibus vitae at tellus. Mauris feugiat magna molestie nisi tristique vestibulum. "}]},
		{className: "text-box", style: "margin-bottom: 20px", components:[{content: "Praesent mi augue, ultrices non semper in, luctus vitae nisi. Sed condimentum dignissim elit, volutpat tincidunt tortor rutrum nec. Nulla vehicula euismod sagittis. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean quis turpis eu orci varius sollicitudin aliquam id metus. Vestibulum malesuada tellus nisi. Morbi ac mattis ipsum. Praesent dapibus diam id felis bibendum viverra nec eu libero. Vivamus in leo vel."}]},
	],
});