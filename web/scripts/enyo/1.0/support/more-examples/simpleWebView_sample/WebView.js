/* Copyright 2009-2011 Hewlett-Packard Development Company, L.P. All rights reserved. */
enyo.kind({
	name: "enyo.Canon.WebViewSample",
	kind: "Control",
	components: [
      {kind: "RowGroup",  caption: "URL", components: [
         {kind: "HFlexBox", components: [
            {kind: "Input", name: "txtURL", value: "http://www.hpwebos.com", flex: 4}, 
            {kind: "Button", className: "enyo-button-affirmative", caption: "GO!", onclick: "gotoURL", flex: 1}
            ]}
         ]}, 
      {kind: "WebView", style:"height:100%",  name: "myWebView", url: "http://www.palm.com"}
   ],
	gotoURL: function() {
		this.$.myWebView.setUrl(this.$.txtURL.value);
	}
});
