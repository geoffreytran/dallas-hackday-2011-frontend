/**
 * @name controller_commander.js
 * @fileOverview This file has functions related to a class that manages a stack of commanders in the commander chain, and handles dispatching events to them.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
	Class that manages a stack of commanders in the commander chain, and handles dispatching events to them.
	The entire commander chain consists of the stack in the AppController, and the stack in the current scene.
	@private
*/
Mojo.CommanderStack = Class.create({
	initialize: function() {
		this._commanderStack = [];
	},
	
	/**
	 * Remove the given commander from this stack.
	 * Assumes that only one instance of a given commander is allowed in the chain 
	 * (all instances will be removed if there is >1).
	 * @param {Object} commander
	 */
	removeCommander: function(commander) {
		this._commanderStack = this._commanderStack.filter(function(e) {return e !== commander;});
		
		/* If we decide to allow multiple instances of the same commander in the chain, then
			we will probably want to use this instead of filter() so we only remove one instance:
		for(var i=this._commanderStack.length-1; i >= 0; i--) {
			var curCommander = this._commanderStack[i];
			if(curCommander === commander) {
				this._commanderStack.splice(i, 1);
				break;
			}
		}*/
	},
	
	/**
	 * Adds the given commander to the top of the stack.
	 * @param {Object} commander
	 */
	pushCommander: function(commander) {
		// ASSERT: Check to make sure commander is not already in the stack, 
		// since that's an odd case we don't handle very well (remove applies to all instances).
		this._commanderStack.push(commander);
	},
	
	/**
	 * Sends the given event to the commanders in the stack.
	 * The method 'handlerName' is invoked on each commander,
	 * in order, starting from the top of the stack.
	 * Commanders which do not implement 'handlerName' are ignored.
	 * If any handler method calls event.stopPropagation(), propagation
	 * is halted.
	 * @param {Object} event
	 */
	/** @private */
	sendEventToCommanders: function(event) {
		
		for(var i=this._commanderStack.length-1; i >= 0; i--) {
			var cmdr = this._commanderStack[i];
			if(cmdr.handleCommand){
				cmdr.handleCommand(event);
				if(event._mojoPropagationStopped) {
					break;
				}
			}
		}
		
	},
	
	/** @private */
	sendNotificationDataToCommanders: function(notificationData) {
		for(var i=this._commanderStack.length-1; i >= 0; i--) {
			var cmdr = this._commanderStack[i];
			if(cmdr.considerForNotification){
				notificationData = cmdr.considerForNotification(notificationData);
				if(!notificationData) {
					break;
				}
			}
		}
		return notificationData;
	},
	
	/**
	 * describe
	 * @param {Object} scene describe
	 */
	size: function(scene) {
		return this._commanderStack.size();
	}

});


