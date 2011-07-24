/**
 * @name widget_alert.js
 * @fileOverview This file has functions related to documenting the Mojo Alert Dialog; See {@link Mojo.Widget.SceneMethods.showAlertDialog} for more info

Copyright 2009 Palm, Inc.  All rights reserved.

*/

Mojo.Widget._AlertDialog = Class.create({
	
        /** @private */
        setup : function() {
                var cancelFunc;
                var template;
                var that = this;
				var animateDialog;
				
                Mojo.assert(this.controller.scene.assistant, "Mojo.Widget.AlertDialog requires a scene assistant to be defined.");
                
                // Render the dialog into the widget div, remember the buttons array parent:
                
				if (this.controller.model.allowHTMLMessage) {
					template = "alert/dialog-htmlmsg";
				} else {
					template = "alert/dialog";
				}

                this.itemsParent = Mojo.Widget.Util.renderListIntoDiv(this.controller.element, this.controller.model, 
                                                                                Mojo.Widget.getSystemTemplatePath(template), this.controller.model.choices, 
                                                                                Mojo.Widget.getSystemTemplatePath("alert/dialog-button"));
                                
                // The scrim starts with opacity=0.0, and set to be animated with CSS transitions.
                // We change it to 1.0 here, which should cause it to fade in over the appropriate time.
                // this.scrim = document.getElementById('palm-scrim');
                // this.scrim.style.opacity = 1.0;
                
                // Animated opacity is currently disabled since alpha compositing is not supported yet.
                // In order to reenable it:
                // 1: #palm-scrim style in palm.css should get this in order to put it back in: opacity:0.0; -webkit-transition: opacity 0.3s linear; 
                // 2: Opacity set above should be uncommented.
                // 3: The removeChild call in _clickHandler should be replaced with the commented out code above it.
                
                // Configure things:
                this.controller.exposeMethods(["close"]);
                
                this._tapHandler = this._tapHandler.bindAsEventListener(this);
                this.controller.listen(this.itemsParent, Mojo.Event.tap, this._tapHandler);
                
                this._dragHandler = this._dragHandler.bindAsEventListener(this);
                this.controller.listen(this.controller.element, Mojo.Event.dragStart, this._dragHandler);
                
                this.controller.scene.pushCommander(this);
                
                // If there's no title, hide the title and separator divs
                if (!this.controller.model.title) {
                        this.controller.get('palm-dialog-title').hide();
                        this.controller.get('palm-dialog-separator').hide();
                }
                
                // If we're cancellable, then provide a cancelFunc when we add ourselves to the container stack.
                // Otherwise, leave cancelFunc undefined.

				this._delayedClose = this._delayedClose.bind(this);      
                if(!this.controller.model.preventCancel) {
                        cancelFunc = this.close.bind(this, undefined);
                }
                this.controller.scene.pushContainer(this.controller.element, this.controller.scene.dialogContainerLayer, 
                                                        {cancelFunc:cancelFunc});

                this.handleRefocus = Mojo.Widget.Util.dialogRefocusCb.bind(this);
                this.controller.listen(this.controller.scene.sceneElement, 'DOMFocusIn', this.handleRefocus);
                this.controller.scene.sceneElement.addEventListener('DOMFocusIn', this.handleRefocus);
                
                //set the inner html to not show here
                //get the dialog element
                this.box = this.controller.element.querySelector('div[x-mojo-dialog]');
				this.scrim = this.controller.element.querySelector('div[x-mojo-scrim]');
				//Animate the dialog on
				Mojo.Animation.Dialog.animateDialogOpen(this.box, this.scrim);
        },
        
        cleanup : function() {
                this.controller.stopListening(this.controller.scene.sceneElement, 'DOMFocusIn', this.handleRefocus);
                this.controller.stopListening(this.itemsParent, Mojo.Event.tap, this._tapHandler);
                this.controller.stopListening(this.controller.element, Mojo.Event.dragStart, this._dragHandler);
        },
        
        /*
                Programatically dismisses the dialog, 
                passing the given value to the alert callback.
        */
        close: function(value) {
                var onChoose;
                
                if (this.closed) {
					return;
                }
                
				this.closed = true;
				this.controller.scene.removeCommander(this);
				this.controller.scene.removeContainer(this.controller.element);
		
				onChoose = this.controller.model.onChoose;
				if(onChoose) {
					onChoose.call(this.controller.scene.assistant, value);
                }
				this._delayedClose.delay(0.2);
        },

		/** @private */
		_delayedClose: function() {
			Mojo.Animation.Dialog.animateDialogClose(this.box, this.scrim, this.controller.remove.bind(this.controller));
		},
        
        /** @private */
        _dragHandler: function(event) {
                // prevents the scene from scrolling.
                event.stop();
        },
        
        /** @private */
        _tapHandler: function(e) {
                var obj;
                
                if(e) {
                        e.stop();
                        
                        var index = Mojo.Widget.Util.findListItemIndex(e, this.itemsParent);
                        if(index !== undefined) {
                                obj = this.controller.model.choices[index].value;
                        }
                }
                
                this.close(obj);
         
                return;
        },
        
        /** @private */
        handleCommand: function(event) {
                if(event.type == Mojo.Event.back) {
                        if(!this.controller.model.preventCancel) {
                                this._tapHandler();
                                event.preventDefault();
                        }
                        event.stopPropagation();
                }
        }
                
});

