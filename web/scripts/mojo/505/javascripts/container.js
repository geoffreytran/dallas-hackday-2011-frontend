/**
 * @name container.js
 * @fileOverview This file contains the ContainerStack implementation used by SceneController.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/*
	Define layer constants: scene, dialog, submenu
	
	New container always goes on top of stack.
	Tries to cancel any same-or-higher layer containers below it.  Cancels if it cannot.
	So, only one container of a given level may be on at once.
	Unless they're all uncancellable.
	
	
	pushContainer(container, layer, {onCancel:, ...?});
	removeContainer(container);
	
	topContainer();
	cancelAll();
	getLength();
	
*/

/** @private */
Mojo.Controller.ContainerStack = function(sceneController){
	this._containers = [];
	this.scene = sceneController;
};


/** @private */
Mojo.Controller.ContainerStack.prototype.cleanup = function() {
	
	// Cancel all containers on cleanup, so they have a chance to clean up too.
	this.cancelAll();
	
	// Remove our event listener if we have one.
	if(this.listenedToDeactivate) {
		this.scene.document.removeEventListener(Mojo.Event.deactivate, this.handleDeactivate);
	}
};

/** @private

*/
Mojo.Controller.ContainerStack.prototype.pushContainer = function(newContainer, layer, options) {
	var i, container;
    var cancelThisOne;
	
	Mojo.require(newContainer.dispatchEvent, "pushContainer: newContainer is not an element which can dispatch events.");

	// First, run down the stack and try to cancel any containers with layer >= this one.
	for(i=this._containers.length-1; i>=0; i--) {
		container = this._containers[i];
		
		// Only cancel the container if the layer is high enough AND it has a cancelFunc (otherwise, it's not cancellable).
		if(container.layer >= layer && container.cancelFunc) {
			container.cancelFunc();
			this._containers.splice(i,1);
		}
	}
	
	// If the top container is still >= our layer, then it must not have been cancelable.
	// We will try to cancel this one instead of pushing it on the stack.
	container = this._containers[this._containers.length-1];
	
	// We may choose to cancel the new container push, under certain circumstances:
	// If there's a container on the stack at the same or higher layer.
	cancelThisOne = (container && container.layer >= layer);

	// AND: either we can't check if it's closed, or it isn't closed
	cancelThisOne = (cancelThisOne && (container.isClosedFunc === undefined || !container.isClosedFunc()));
	
	// AND: this new dialog is cancellable
	cancelThisOne = (cancelThisOne && options && options.cancelFunc);
	
	if (cancelThisOne) {
		options.cancelFunc();
		return;
	}
	
	// The first time we push a cancellable container, we listen to document deactivate.
	// This allows us to automatically cancel stuff when the window is minimized.
	if(!this.listenedToDeactivate && options && options.cancelFunc) {
		this.listenedToDeactivate = true;
		this.handleDeactivate = this.cancelAll.bindAsEventListener(this);
		this.scene.document.addEventListener(Mojo.Event.deactivate, this.handleDeactivate);
	}
	
	// Finally, push the new container.
	this._containers.push({container:newContainer, layer:layer, cancelFunc:(options && options.cancelFunc), isClosedFunc:(options && options.isClosedFunc)});
	
};

/** @private 
	Removes the given container from the container stack.  This is called by container implementations
	when they are finished and need to be removed from the stack.  The cancelFunc is not called, because
	we assume the container will be performing its own cleanup (if it hasn't already).
*/
Mojo.Controller.ContainerStack.prototype.removeContainer = function(container) {
	var index = this._findContainer(container);
	
	if(index !== undefined) {
		this._containers.splice(index,1);
		return true;
	}
	
	return false;
};

/** @private 
	Attempts to remove the given container from the container stack, by calling the cancelFunc if specified.
	Returns true if the container was removed.
*/
/*
Mojo.Controller.ContainerStack.prototype.cancelContainer = function(targetContainer) {
	var index = this._findContainer(targetContainer);
	var container = this._containers[index];	
	
	if(container && container.cancelFunc) {
		container.cancelFunc();
		this._containers.splice(index,1);
		return true;
	}
	
	return false;
};
*/


/** @private */
Mojo.Controller.ContainerStack.prototype.topContainer = function() {
	var container = this._containers[this._containers.length-1];
	return container && container.container;
};

/** @private */
Mojo.Controller.ContainerStack.prototype.cancelAll = function() {
	var i, container;
	
	// Cancel each cancellable container
	for(i=this._containers.length-1; i>=0; i--) {
		container = this._containers[i];
		if(container.cancelFunc) {
			container.cancelFunc();
			this._containers.splice(i,1);
		}
	}
};

/** @private */
Mojo.Controller.ContainerStack.prototype.getLength = function() {
	return this._containers.length;
};

/*
Mojo.Controller.SceneController.ContainerStack.prototype.getContainers = function() {
	return this._containers.slice(0);
};
*/

/** @private */
Mojo.Controller.ContainerStack.prototype._findContainer = function(targetContainer) {
	var i, container;
	
	// Search for given container
	for(i=this._containers.length-1; i>=0; i--) {
		container = this._containers[i];
		if(container.container === targetContainer) {
			return i;
		}
	}
};

