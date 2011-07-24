/**
 * @name widget_dialog.js
 * @fileOverview This file has functions related to documenting the Mojo Dialog; See {@link Mojo.Widget.SceneMethods.showDialog} for more info

Copyright 2009 Palm, Inc.  All rights reserved.

*/

Mojo.Widget._Dialog = Class.create({
		/** @private */
        kAnimationDuration:0.15,  //the duration of both the opacity animation and the dialog movement
       
       /** @private */
        setup : function() {    
                var content, cancelFunc, closedFunc;
                var activate;
                
                // Verify required model properties:
                Mojo.assert(this.controller.model.assistant, "Mojo.Widget._Dialog requires an assistant to be defined in the model.");
                Mojo.assert(this.controller.model.template, "Mojo.Widget._Dialog requires a template to be defined in the model.");
                this.assistant = this.controller.model.assistant;
                
                // Render content:
                content = Mojo.View.render({object:this.controller.model, template: this.controller.model.template});
                content = Mojo.View.render({object:{content:content}, template: Mojo.Widget.getSystemTemplatePath("modal-dialog")});            
                this.controller.element.innerHTML = content;
                
                // Configure things:
                this.controller.exposeMethods(["close"]);
                
                // If we're cancellable, then provide a cancelFunc when we add ourselves to the container stack.

				// set this up now in case the container stack ends up canceling this dialog.
				this._delayedClose = this._delayedClose.bind(this);
                if(!this.controller.model.preventCancel) {
                        cancelFunc = this.close.bind(this, undefined);
                }
				closedFunc = this.isClosed.bind(this);
                this.controller.scene.pushContainer(this.controller.element, this.controller.scene.dialogContainerLayer, 
                                                        {cancelFunc:cancelFunc, isClosedFunc:closedFunc});

                // our handleCommand exists only to cancel on a back event.
                this.controller.scene.pushCommander(this);
                
                if(this.assistant.handleCommand) {
                        this.controller.scene.pushCommander(this.assistant);
                }
                
                // Mimic the scene assistant semantics, and call assistant's setup before widgets are instantiated,
                // then call activate() afterwards when the dialog is truly active.
                if(this.assistant.setup) {
                        this.assistant.setup(this.controller.element);
                }
                
                this.controller.instantiateChildWidgets(this.controller.element);

                //get the dialog element
                this.box = this.controller.element.querySelector('div[x-mojo-dialog]');
				this.scrim = this.controller.element.querySelector('div[x-mojo-scrim]');
                
                activate = this._activateWrapper.bind(this);
				//Animate the dialog on
				Mojo.Animation.Dialog.animateDialogOpen(this.box, this.scrim, activate);
                
                this.handleRefocus = Mojo.Widget.Util.dialogRefocusCb.bind(this);
                this.controller.listen(this.controller.scene.sceneElement, 'DOMFocusIn', this.handleRefocus);

                this._dragHandler = this._dragHandler.bindAsEventListener(this);
                this.controller.listen(this.controller.element, Mojo.Event.dragStart, this._dragHandler);
        },

		_activateWrapper: function() {
			if (this.assistant.activate) {
				try {
					this.assistant.activate();
				} catch (e) {
					Mojo.Log.warn("Activate called on the dialog controller failed. Continuing other setup. %s ", e);
				}
			}
		},
        
        handleCommand: function(event) {
			if(event.type == Mojo.Event.back) {
                        
				if(!this.controller.model.preventCancel) {
					Event.stop(event);
     				this.close();
				} else {
					event.stopPropagation();
				}
			}
        },
        
        cleanup: function() {
			this.controller.stopListening(this.controller.scene.sceneElement, 'DOMFocusIn', this.handleRefocus);
			this.controller.stopListening(this.controller.element, Mojo.Event.dragStart, this._dragHandler);                
			if(this.assistant.handleCommand) {
				this.controller.scene.removeCommander(this.assistant);
			}

			this.controller.scene.removeCommander(this);
			this.controller.scene.removeContainer(this.controller.element);

			if(this.assistant.cleanup) {
        		this.assistant.cleanup();
			}
        },
        
        /*
                Public APIs explosed through widget div:
        */

		/** @private */
		_delayedClose: function() {
			Mojo.Animation.Dialog.animateDialogClose(this.box, this.scrim, this.controller.remove.bind(this.controller));
		},

        close: function() {
			if (this.isClosed()) {
				return;
            }
            
			this.closed = true;
			
			if(this.assistant.deactivate) {
				try {
					this.assistant.deactivate();	
				} catch (e) {
					Mojo.Log.warn("Deactivate called on the dialog controller failed. Continuing other cleanup. %s ", e);
				}
			}
			this._delayedClose.delay(0.2);
		},
		
		isClosed: function() {
			return !!this.closed;
		},
        
        /** @private */
        _dragHandler: function(event) {
                // prevents the scene from scrolling.
                event.stop();
        }
        

});

