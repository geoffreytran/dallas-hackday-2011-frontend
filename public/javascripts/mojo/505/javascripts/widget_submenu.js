/**
 * @name widget_submenu.js
 * @fileOverview This file has functions related to documenting the Submenu Mojo Widget; See {@link Mojo.Widget.SceneMethods.popupSubmenu} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

 */

Mojo.Widget._Submenu = Class.create({
	
	/*
		Programatically close an open popup menu.
		This will cause the 'choice' handler to be called with 'undefined', close the popup menu, and remove the scrim.
	*/
	close: function() {
		this._activateHandler(); // call choice handler with 'undefined' & close popup.
	},
	
	
	kBorderSize: 7, // minimum pixels between popup & edge of screen
	kMaxRowWidth: 280,	// max width in pixels of a row element in the popup list.
	kMaxHeight: 290,	// max width in pixels of a row element in the popup list.
	kContainerMargin:16, // difference in pixels between container size & content size.
	kSelectorBorderWidth:48,
	kpopupId:'palm-app-menu',
	
	// Template paths:
	kLabelTemplate: Mojo.Widget.getSystemTemplatePath("submenu/label"),
	kGroupTemplate: Mojo.Widget.getSystemTemplatePath("submenu/group"),
	
	/** @private */
	setup : function() {
		var model = this.controller.model;
		var itemsText;
		var scroller;
		var scrimClass = model.scrimClass || 'submenu-popup';
		
		this.containerTemplate = Mojo.Widget.getSystemTemplatePath("submenu/list");
		this.itemTemplate = model.itemTemplate || Mojo.Widget.getSystemTemplatePath("submenu/item");
		this.itemRowTemplate = Mojo.Widget.getSystemTemplatePath("submenu/item-row");
		
		itemsText = this.renderItems(model.items, model.toggleCmd);
		this.controller.element.innerHTML = Mojo.View.render({
			object: {
				listElements: itemsText, 
				popupClass: model.popupClass, 
				scrimClass: scrimClass, 
				popupId: (model.popupId || ''), 
				touchableRows: Mojo.Environment.DeviceInfo.touchableRows
			}, 
			template: this.containerTemplate
		});
		
		this.animateQueue = Mojo.Animation.queueForElement(this.controller.element);
		
		
		// This means the scroller and any drawers will all share the same model... but it should be okay since
		// scroller doesn't use the model, and we don't need to maintain a consistent 'open' value for the drawers.
		this.controller.instantiateChildWidgets(this.controller.element, {open:false});
		
		this.popup = this.controller.element.querySelector('div[x-mojo-popup-container]');
		this.scrim = this.controller.element.querySelector('div[x-mojo-popup-scrim]');
		this.popupContent = this.controller.element.querySelector('div[x-mojo-popup-content]');

		scroller = this.controller.element.querySelector('div[x-mojo-element=Scroller]');
		if (scroller) {
			scroller.mojo.validateScrollPosition();
		}

		this.setPopupMaxHeight(this.controller.window.innerHeight);
		
		// Now we can position it properly:
		// Get width & height of popup:
		var dims = Element.getDimensions(this.popup);
		var width = dims.width;
		var height = dims.height;
		var sceneWidth = this.controller.window.innerWidth;
		var sceneHeight = this.controller.window.innerHeight;
		var placeX, placeY;
		var offset;
		var animateToLeft;
		var placeNearW;
		
		if(!model.manualPlacement) {
			
			// Maybe place the popup near another element:
			if(model.placeNear) {
				placeNearW = Element.getWidth(model.placeNear);
				// Find location of placement element:
				offset = Mojo.View.viewportOffset(model.placeNear);
				
				// Special case to handle fixed position 'placenear' elements.
				// In this case, the scroll position of the scene is mistakenly taken into account,
				// so we need to subtract it out again. 
				if(this.isFixedPosition(model.placeNear)) {
					offset.top -= this.controller.scene.sceneElement.offsetTop;
				}

				placeX = offset.left + placeNearW;
				if(placeX + width > sceneWidth - this.kBorderSize) {
					placeX -= (placeX + width - (sceneWidth - this.kBorderSize));
				}
				
				//animate from left if center of placeNear icon is on the left of the screen
				animateToLeft = (offset.left + (placeNearW / 2) > sceneWidth / 2);

				placeY = offset.top;
				if(placeY + height > sceneHeight - this.kBorderSize)  {
					placeY -= (placeY + height - (sceneHeight - this.kBorderSize));
				}

				// Odd placeNear elements (like long lists scrolled to the
				// bottom) can result in our pop-up being placed offscreen.
				// Center the pop-up in that case
				if (placeX < 0) {
					placeX = (sceneWidth - width)/2;
				}

				if (placeY < 0) {
					placeY = (sceneHeight - height)/2;
				}
			}
			else {
				// Simply center in the screen.
				placeX = (sceneWidth - width)/2;
				placeY = (sceneHeight - height)/2;
			}
	
		}
		else {
			// TODO: Apply this to all submenus when we can break default
			// behavior
			var viewoffset = Element.viewportOffset(this.popup).top;

			if (this.controller.model.popupId === this.kpopupId) {
				if (viewoffset < -2) {
					viewoffset = -2;
				}
			}
			this.setPopupMaxHeight(this.controller.window.innerHeight -	(viewoffset || 0));
		}

		// If toggleCmd has been specified, make sure that the selected item
		// is actually visible by scrolling to it
		if (scroller && model.toggleCmd !== undefined) {
			var node = scroller.querySelector('.chosen');
			if (node) {
				scroller.mojo.revealElement(node);
			}
		}

		
		// The scrim starts with opacity=0.0, and set to be animated with CSS transitions.
		// We change it to 1.0 here, which should cause it to fade in over the appropriate time.
		// this.scrim = document.getElementById('palm-scrim');
		// this.scrim.style.opacity = 1.0;
		
		// Animated opacity is currently disabled since the demo is soon, and alpha compositing is not currently supported.
		// In order to reenable it:
		// 1: #palm-scrim style in palm.css should get this in order to put it back in: opacity:0.0; -webkit-transition: opacity 01s linear; 
		// 2: Opacity set above should be uncommented.
		// 3: The removeChild call in _clickHandler should be replaced with the commented out code above it.
		
		this._activateHandler = this._activateHandler.bind(this);
		this.handleResize = this.handleResize.bind(this);
		this.handleResizeCallback = this.setPopupMaxHeight.bind(this);

		
		this.resizeDebouncer = Mojo.Function.debounce(undefined, this.handleResize, 0.1, this.controller.window);
		this.controller.listen(this.controller.window, 'resize', this.resizeDebouncer);
		
		this.controller.listen(this.controller.element, 'mousedown', this._activateHandler);
		this.controller.listen(this.controller.element, Mojo.Event.tap, this._activateHandler);
		
		this.controller.scene.pushCommander(this);
		this.controller.scene.pushContainer(this.controller.element, 
							(model._mojoContainerLayer !== undefined ? model._mojoContainerLayer : this.controller.scene.submenuContainerLayer),
							{cancelFunc:this.close.bind(this)});
		
		// Expose 'close' method for our client:
		this.controller.exposeMethods(["close"]);

		this._animateOff = this._animateOff.bind(this);
		
		this._animateOn(sceneWidth, offset, width, height, placeX, placeY, animateToLeft);
	},
	
	_animateOn: function(sceneWidth, offset, width, height, placeX, placeY, animateToLeft) {
		var that = this;
		var animateSubmenu;
		var cornersTo;
		var cornersFrom;
		var popupContentHeight;
		
		if(this.controller.model.popupId === this.kpopupId){ //animate down	
			if(!placeY){
				placeY = this.popup.offsetTop;
			}
			this.popup.style.top = (-height) +'px';
			this.popup.style.left = placeX+'px';
			this.offsceneY = -height;

			this.onsceneY = placeY;
			
			animateSubmenu = Mojo.Animation.Appmenu.animate.curry(this.popup, this.offsceneY, this.onsceneY, Mojo.doNothing);
			//set the starting scrim opacity
			this.scrim.style.opacity = 0;
			Mojo.Animation.Scrim.animate(this.scrim, 0, 1, animateSubmenu);
		} else if(this.controller.model.placeNear) { //animate out
			popupContentHeight = this.popupContent.offsetHeight;
			
			this.popup.style.top = offset.top +'px';
			
			//if the popup is aligned to the right of the screen, animate out from that side.
			if(animateToLeft || ((animateToLeft === undefined) &&
						(sceneWidth - (placeX + width) - this.kBorderSize) === 0)) {
				//aligned on the right
				this.onsceneXStart = placeX + width - this.kSelectorBorderWidth;
			} else {
				//aligned somewhere else
				this.onsceneXStart = placeX;
			}	
			this.popup.style.left = this.onsceneXStart+'px';
			
			this.onsceneYStart = offset.top - this.kSelectorBorderWidth;
			this.onsceneY = placeY;
			this.onsceneX = placeX;
			this.popup.style['min-width'] = '0px';
			this.popup.style.width = this.kSelectorBorderWidth+'px';
			this.popupContent.style.height = '0px';
			this.popup.hide();
			
			cornersFrom = {
				top:this.onsceneYStart,
				left:this.onsceneXStart,
				width:this.kSelectorBorderWidth,
				height:0
			};
				
			cornersTo = {
				top:this.onsceneY,
				left:this.onsceneX,
				width:width,
				height:popupContentHeight
			};
			
			animateSubmenu = function(){
				that.popup.show();
				Mojo.Animation.Submenu.animate(that.popup, that.popupContent, cornersFrom ,cornersTo, Mojo.doNothing);
			};
			
			//set the starting scrim opacity
			this.scrim.style.opacity = 0;
			Mojo.Animation.Scrim.animate(this.scrim, 0, 1, animateSubmenu);
		} else {
			this.popup.style.top = placeY+'px';
			this.popup.style.left = placeX+'px';
		}

		//Mojo.Log.info("Title width4: "+this.controller.element.querySelector('div.title').getWidth());
	},
	
	_animateOff: function() {
		var that = this;
		var cornersTo;
		var cornersFrom;
		var animateScrim;
		//animate the scrim off the scene and then remove
		if(this.controller.model.placeNear){
			this.popup.style['min-width'] = '0px';
			
			cornersFrom = {
				top:this.popup.offsetTop,
				left:this.popup.offsetLeft,
				width:this.popup.offsetWidth,
				height:this.popupContent.offsetHeight
			};
				
			cornersTo = {
				top:this.onsceneYStart + this.kSelectorBorderWidth,
				left:this.onsceneXStart,
				width:this.kSelectorBorderWidth,
				height:0
			};
			
			animateScrim = function(){
				that.popup.hide();
				Mojo.Animation.Scrim.animate(that.scrim, 1, 0, that.controller.remove.bind(that.controller));
			};
			
			Mojo.Animation.Submenu.animate(this.popup, this.popupContent ,cornersFrom ,cornersTo, 
				animateScrim);
		} else if(this.controller.model.popupId === this.kpopupId) {
			Mojo.Animation.Appmenu.animate(this.popup, this.onsceneY, -this.popup.offsetHeight, 
			Mojo.Animation.Scrim.animate.curry(this.scrim, 1, 0, this.controller.remove.bind(this.controller)));
		} else {
			this.controller.remove();
		}
	},
	
	cleanup: function() {
		this.controller.stopListening(this.controller.element, 'mousedown', this._activateHandler);
		this.controller.stopListening(this.controller.element, Mojo.Event.tap, this._activateHandler);
		this.controller.stopListening(this.controller.window, 'resize', this.resizeDebouncer);
	},
	
	renderItems: function(items, toggleCmd, prevParentItem, nextParentItem) {
		var groupText;
		var item;
		var renderParams;
		var itemsText = '';
		var i;
		var cmdItemCount = 0;
		var startOfMenu;
		var endOfMenu;
		var endOfSection;
		
		for(i=0; i<items.length; i++) {
			item = items[i];

			renderParams = {
				formatters: {
					shortcut: this.itemFormatter,
					value: this.dividerFormatter.bind(this),
					disabled: this.disabledFormatter
				},
				attributes: {
					itemClass: item.itemClass
				}
			};

			// group template, or regular item template?
			if(item.items) {
				groupText = this.renderItems(item.items, item.toggleCmd, item, items[i+1] || nextParentItem);	// Include nextParentItem in case we're at the end of a sub-submenu
				renderParams.attributes.groupItems = groupText;
				renderParams.template = this.kGroupTemplate;
			} else if(item.command !== undefined) {
				
				// Apply correct 'chosen' class variant, if the chosen property is specified or if this is the currently chosen item in a toggle group
				if(item.chosen || (item.command !== undefined && item.command == toggleCmd)) {
					renderParams.attributes.chosenClass = 'chosen';
					renderParams.attributes.checkmarkFormattedHTML = "<div class='popup-item-checkmark'></div>";
				} 
				
				renderParams.template = this.itemTemplate;
				
			} else if(item.label !== undefined) {
				// It's a text label, use special template:
				renderParams.template = this.kLabelTemplate;
				cmdItemCount = -1;
			} else {
				// it's a divider, or icon-label.  Use the item template.
				renderParams.template = this.itemTemplate;
				cmdItemCount = -1;
			}
			
			// The menu item should be rendered with the appropriate item model.
			renderParams.object = item;
			
			// Determine if this is the end of a section by peeking at the next item
			item = items[i+1];
			endOfSection = !item || ((item.command === undefined || item.command === null) && !item.items);
			startOfMenu = !prevParentItem && i === 0;
			endOfMenu = !item && !nextParentItem;
			
			// Apply appropriate class to this item, if any.
			if(cmdItemCount === 0 && endOfSection) {
				renderParams.attributes.listClass = 'single';
			} else if (startOfMenu) {
				renderParams.attributes.listClass = 'first menu-start';
			} else if (cmdItemCount === 0){
				renderParams.attributes.listClass = 'first';
			} else if (endOfMenu) {
				renderParams.attributes.listClass = 'last menu-end';
			} else if (endOfSection){
				renderParams.attributes.listClass = 'last';
			} else {
				delete renderParams.attributes.listClass;
			}

			// For normal items, we have a 2 stage rendering process to support
			// the user giving us an arbitrary item template.
			if (renderParams.template == this.itemTemplate) {
				renderParams.object.renderedItem = Mojo.View.render(renderParams);
				renderParams.template = this.itemRowTemplate;
			}

			itemsText += Mojo.View.render(renderParams);
			cmdItemCount++;
		}
		
		return itemsText;
	},
	
	
	itemFormatter: function(shortcut, itemModel) {
		var formatterProps = {};
		if(this.theOldWaysAreBest) {
			return shortcut && ($LL("alt-")+shortcut);
		}
		
		if(itemModel.shortcut) {
			formatterProps.shortcutFormattedHTML = ("<div class='label'>"+$LL("+ ")+itemModel.shortcut+"</div>");
		}
		
		if(itemModel.icon) {
			formatterProps.iconFormattedHTML = "<div class='palm-popup-icon right "+itemModel.icon+"'></div>";
		} else if(itemModel.iconPath) {
			formatterProps.iconFormattedHTML = "<div class='palm-popup-icon right' style='background-image: url("+itemModel.iconPath+");'></div>";
		}
		
		if(itemModel.secondaryIcon) {
			formatterProps.secondaryIconFormattedHTML = "<div class='palm-popup-icon left "+itemModel.secondaryIcon+"'></div>";
		} else if(itemModel.secondaryIconPath) {
			formatterProps.secondaryIconFormattedHTML = "<div class='palm-popup-icon left' style='background-image: url("+itemModel.secondaryIconPath+");'></div>";
		}
		
		
		if(!itemModel.disabled && !itemModel.items) {
			formatterProps.tapHighlightHTML = 'x-mojo-tap-highlight="persistent"';
		}
		
		return formatterProps;
	},
	
	// Adds a divider class to popup menu items with no value.
	// We also check label, & the icons to avoid the item "disappearing" if the value is accidentally left out.
	dividerFormatter: function(value, model) {
		if(value === undefined && model.label === undefined && 
			model.lefticon === undefined && model.righticon === undefined) {
			return {dividerClass: "palm-section-divider"};	
		}
		return undefined;
	},
	
	// Adds a disabled class to popup menu items with model.disabled === true.
	disabledFormatter: function(disabled) {
		if(disabled) {
			return {disabledClass: "disabled"};	
		}
		return undefined;
	},
	
	/** @private */
	_activateHandler: function(e) {
		var cmd, node, toggleNode, open;
		var activateTarget;
		
		if (this.activated) {
			return;
		}
		
		// We only do something if e is undefined, or a tap event (anywhere), or any event on the scrim.
		if(e && e.type != Mojo.Event.tap && e.target.id != 'palm-scrim') {
			return;
		}
		
		if(e) {
			Event.stop(e);
			
			activateTarget = e.target;
			
			// Handle taps to choose items or toggle drawers.
			if(!cmd && e.type == Mojo.Event.tap) {
			
				// find command item node, if any:
				node = Mojo.View.findParentByAttribute(activateTarget, this.controller.element, 'x-mojo-menu-cmd');
				
				// We ignore taps on disabled items (and don't even dismiss the menu)
				if(!node || Element.hasClassName(node, 'disabled')) {
					return;
				}
				
				cmd = node.getAttribute('x-mojo-menu-cmd');
				
				// No command? Maybe toggle a drawer and return.
				// For tap events, we don't dismiss the popup unless it was on a valid choice
				if(!cmd) {
					
					// Was the tap in a drawer toggle handle?
					// If so, go up to the top of the group, and search for the drawer.
					toggleNode = Mojo.View.findParentByAttribute(activateTarget, this.controller.element, 'x-mojo-submenu-toggle');
					node = toggleNode && Mojo.View.findParentByAttribute(toggleNode, this.controller.element, 'x-mojo-submenu-group');
					node = node && node.querySelector('div[x-mojo-element=Drawer]');
					
					if(node) {
						open = node.mojo.getOpenState();
						
						if(open) {
							Element.removeClassName(toggleNode, 'palm-submenu-group-opened');
						} else {
							Element.addClassName(toggleNode, 'palm-submenu-group-opened');
						}
												
						node.mojo.setOpenState(!open);
						return;
					}
										
				}
			}
		}
		
		this.activated = true;
		this.controller.model.onChoose.call(this.controller.scene.assistant, cmd, activateTarget);
		
		this.controller.scene.removeCommander(this);
		this.controller.scene.removeContainer(this.controller.element);
		
		
		if (e && e.type === Mojo.Event.tap && (activateTarget && activateTarget.id) !== 'palm-scrim') {
			this._animateOff.delay(0.2);
		} else {
			this._animateOff();
		}
		
		return;
	},
	
	/** @private */
	_removeSubmenu: function() {
		this.controller.remove();	
	},
	
	/** @private */
	handleCommand: function(event) {
		if(event.type == Mojo.Event.back) {
			this.close();
			Event.stop(event); // 'back' is now handled.
		}
	},
	
	setPopupMaxHeight: function(height) {
		this.popupContent.style.maxHeight = (height - Mojo.View.getBorderWidth(this.popup, 'top') - Mojo.View.getBorderWidth(this.popup, 'bottom')) + 'px';
		this.popup.style.maxHeight = height + 'px';		
	},
	
	handleResizeComplete: function(height) {
		delete this.menuResizeAnimator;
		Mojo.Widget.Scroller.validateScrollPositionForElement(this.popupContent);
	},
	
	/* On orientation change, close the menu. This is easier than trying to figure out where it should
	 * be in the new layout and what the size should be. Matches past behavior as well.
	 */
	orientationChange: function(e) {
		this.close();
	},
	
	/** @private */
	handleResize: function(event) {
		var viewoffset = Element.viewportOffset(this.popup).top;
		var height;
		var details;
		
		if (this.controller.model.popupId === this.kpopupId) {
			if (viewoffset < -2) {
				viewoffset = -2;
			}
		}
		height = this.controller.window.innerHeight -
				(viewoffset || 0);
		
		details = {
			from: parseInt(this.popup.style.maxHeight, 10),
			to: height,
			onComplete: this.handleResizeComplete.bind(this, this.controller.window.innerHeight),
			duration: 0.1
		};
		if(this.menuResizeAnimator) {
			this.menuResizeAnimator.cancel();
		}
		
		if(details.from !== details.to) {
			this.menuResizeAnimator = Mojo.Animation.animateValue(this.animateQueue, 'ease-in-out', this.handleResizeCallback, details);
		}
	},
	
	isFixedPosition: function(el) {
		var targetBody = el.ownerDocument.body;
		while(el && el !== targetBody) {      
			if(Element.getStyle(el, 'position') == 'fixed') {
				return true;
			}
			el=el.parentNode;
		}
		
		return false;
	}
		
});

