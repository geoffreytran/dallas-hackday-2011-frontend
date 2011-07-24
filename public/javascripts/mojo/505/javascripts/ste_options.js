/**
 * @name ste_options.js
 * @fileOverview this file contains the functionality that drives the different
 * options that are avaible when a user brings up a contextual menu after
 * clicking on a smart link.
 *
 * Copyright 2009 Palm, inc.  all rights reserved.
 *
 */

/*globals Mojo $LL */

/** @private */
Mojo.SteOptions = (function() {

	var appManagerUri = "palm://com.palm.applicationManager";
	/* This was taken from the internets, but the basics are that it gives you the URL,
	 * the scheme, and the hostname (which is all we're interested in). The rest strips
	 * out everything that might come after the host (stores it too, but we don't care)
	 */
	var parser = /^((\w+):\/?\/?\/?)?(\/?[^\?#;\|]+)?([;\|])?([^\?#]+)?\??([^#]+)?#?(\w*)/i;

	function doDefaultAction(uri) {
		var req = new Mojo.Service.Request(appManagerUri, {
			method: 'open',
			parameters: {
				target: uri
			}
		});
	}

	function extractValue(uri) {
		var parsed = parser.exec(uri);
		if (parsed && parsed.length && parsed.length > 3) {
			return parsed[3]; // 3 is the hostname
		}
	}

	function copy(text) {
		var stage = Mojo.Controller.getAppController().getActiveStageController();
		stage.setClipboard(text, false);
	}

	function addContact(contactData) {
		var scene = Mojo.Controller.getAppController().getActiveStageController().topScene();
		scene.showAlertDialog({
			onChoose: function(choice) {
				if (!choice || choice === 'cancel') {
					return;
				}
				var request = new Mojo.Service.Request(appManagerUri, {
					method: 'open',
					parameters: {
						id: "com.palm.app.contacts",
						params: {
							contact: contactData,
							launchType: choice
						}
					}
				});
			},
			choices: [
				{
					label: $LL('Save as new'),
					value: 'newContact'
				}, {
					label: $LL('Add to existing'),
					value: 'addToExisting'
				}, {
					label: $LL('Cancel'),
					type: 'dismiss',
					value: 'cancel'
				}
			]
		});
	}

	var options = {
		phone: {
			matcher: new RegExp('^tel:', 'i'),
			items: [
				{ label: $LL('Call'), command: 'call' },
				{ label: $LL('Text'), command: 'text' },
				{ label: $LL("Add to Contacts"), command: 'add' }
			],
			onChoose: function(uri, command) {
				var req;
				var num = extractValue(uri);
				switch(command) {
				case 'call':
					doDefaultAction(uri);
					break;
				case 'text':
					req = new Mojo.Service.Request(appManagerUri, {
						method: 'launch',
						parameters: {
							id: "com.palm.app.messaging",
							params: {
								composeAddress: num
							}
						}
					});
					break;
				case 'add':
					addContact({
						phoneNumbers: [{
							value: num
						}]
					});
					break;
				case 'copy':
					copy(num);
					break;
				}
			}
		},
		email: {
			matcher: new RegExp('^mailto:', 'i'),
			items: [
				{ label: $LL('Send Email'), command: 'email' },
				{ label: $LL("Add to Contacts"), command: 'add' }
			],
			onChoose: function(uri, command) {
				var email = extractValue(uri);
				switch(command) {
				case 'email':
					doDefaultAction(uri);
					break;
				case 'add':
					addContact({
						emailAddresses: [{
							value: email
						}]
					});
					break;
				case 'copy':
					copy(email);
					break;
				}
			}
		}
	};

	function figureOutHrefType(uri) {
		var type;
		for (type in options) {
			if (options.hasOwnProperty(type)) {
				if (uri.search(options[type].matcher) !== -1) {
					return type;
				}
			}
		}
	}

	function showSubMenu(type, uri, el) {
		var sceneController;
		var items = options[type].items.slice(0);

		sceneController = Mojo.Controller.getAppController().getActiveStageController("card").topScene();
		sceneController.popupSubmenu({
			onChoose: options[type].onChoose.curry(uri),
			placeNear: el,
			items: items
		});
	}

	function elementIsWebViewAnchor(event) {
		var el = event.target;
		var webView = el.parentNode;

		if (!webView) {
			return false;
		}

		function urlResponse(response) {
			var type;
			if (!response.url) {
				return; // No url? Don't do anything
			}

			type = figureOutHrefType(response.url);
			if (!type) {
				return;
			}

			showSubMenu(type, response.url);
		}

		if (el.tagName.toLowerCase() === 'object' &&
				webView.getAttribute("x-mojo-element") === "WebView") {

			webView.mojo.inspectUrlAtPoint(
					event.down.offsetX,
					event.down.offsetY,
					urlResponse);

			/* XXX: This is questionable. We're not actually sure that we tapped on a
			 * link yet, but the user's orange tapping on something, and we're on the
			 * document. If we're wrong, nothing happens. Oh well.
			 */
			event.stopPropagation();
			event.preventDefault();
			return true;
		}
		return false;
	}

	function displayContext(event) {
		var clickedType;
		var anchor = event.target;
		if (event.type === Mojo.Event.tap && !event.down.altKey) {
			return; // Not holding orange while tapping? Don't do anything.
		}

		if (elementIsWebViewAnchor(event)) {
			return; // All handled
		}

		if (anchor.tagName.toLowerCase() !== 'a') {
			return; // Not an anchor? Don't do anything.
		}

		clickedType = figureOutHrefType(anchor.href);
		if (!clickedType) {
			return; // Not a URL we care about? Don't do anything
		}

		showSubMenu(clickedType, anchor.href, anchor);
		event.stopPropagation();
		event.preventDefault();
	}

	function c () { }
	c.prototype = {
		setup: function(targetWindow) {
			var targetDoc = targetWindow.document;

			Mojo.Event.listen(targetDoc, Mojo.Event.hold, displayContext);
			Mojo.Event.listen(targetDoc, Mojo.Event.tap, displayContext);

			function cleanup() {
				Mojo.Event.stopListening(targetDoc, Mojo.Event.hold, displayContext);
				Mojo.Event.stopListening(targetDoc, Mojo.Event.tap, displayContext);
				Mojo.Event.stopListening(targetWindow, 'unload', cleanup);
			}
			Mojo.Event.listen(targetWindow, 'unload', cleanup);
		}
	};
	return new c();
})();
