/**
 * @name function.js
 * @fileOverview This file has functions related to related to functions.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
@namespace Holds functionality related to functions.
*/

Mojo.Function = {};

/**
@description
Instances of this class are used to ensure a set of callback functions are all
called at the same time. After creating, use the `wrap()` method to wrap
any callbacks you wish to synchronize before passing them to an asynchronous
service. The synchronize object will defer calling any of them until all of the 
returned wrappers have been called.

#### Example Use ####
Mojo generally uses the `syncCallback` option to defer some processing until a variety of other tasks have all completed.
For example, the completion function passed to a scene assistant's `aboutToActivate()` method is actually an "empty" wrapper
function from a Synchronize object.  It's used as a trigger to continue the scene transition.  

One could implement this use case like this:

		var synchronizer = new Mojo.Function.Synchronize({
							syncCallback: this.continueSceneTransition()});
		var doNothing = function() {};
		var otherWrapper = synchronizer.wrap(doNothing);

		curScene.aboutToActivate(synchronizer.wrap(doNothing));
		beginOtherOperation(otherWrapper);

When both wrappers have been called, `this.continueSceneTransition()` will be called and the scene transition will continue.

#### Alternate Use ####
An alternative use of `Synchronize` is to make sure that a function is called within a certain amount of time, 
and that it's not called more than once.  This works by specifying a timeout for the `Synchronize` object, and 
again using the `syncCallback`.

		var synchronizer = new Mojo.Function.Synchronize({
							syncCallback: this.thingComplete(),
							timeout: 3});

		beginThing(synchronizer.wrap(function() {})); 

Here we wrap an empty function, which just acts as a trigger for calling this.thingComplete().
If the wrapper is not called within 3 seconds, then thingComplete() will be called anyways... and
any subsequent calls to the wrapper will have no affect.


@param {object} inOptions 
	inOptions may include the following properties:
	<table>
		<tr>
			<td width="30%">syncCallback: Function</td>	
			<td>If provided, it will be called after all the callbacks have been dispatched.
				It receives a boolean argument which is 'true' if the synchronizer timed out.</td>
		</tr>
		<tr><td width="30%">timeout: number</td>
			<td>If provided, the synchronizer will stop waiting after this number of seconds.
				All "received" wrapped functions and the syncCallback function will be called.
				Any wrappers created by this synchronizer which have not yet been called will be ignored,
				however subsequent calls to them will immediately pass through to the wrapped function.</td>
		</tr>
	</table>
@class
*/
Mojo.Function.Synchronize = function Synchronize(inOptions) {
	var options = inOptions || {};
	this.syncCallback = options.syncCallback;
	this.timeout = options.timeout;
	this.pending = [];
	this.received = [];
	
	if(this.timeout !== undefined) {
		this.handleTimeout = this.handleTimeout.bind(this);
		this.timeoutID = window.setTimeout(this.handleTimeout, this.timeout * 1000);
	}
	
};

/**
@description
Wrap and record a function object such that it will not be called until all
similarly wrapped callbacks have been invoked.
@param {Function} callback The callback function that should be synchronized.
@returns A wrapper function suitable for passing in place of the callback.
@type Function
 */
Mojo.Function.Synchronize.prototype.wrap = function wrap (callback) {
	var that = this;
	var f = function() {
	    that.handleWrapped(arguments.callee, callback, $A(arguments));
	};
	this.pending.push(f);
	return f;
};

/** @private */
Mojo.Function.Synchronize.prototype.handleWrapped = function handleWrapped(wrappedCallback, callback, argumentList) {
	var index = this.pending.indexOf(wrappedCallback);
	if (index !== -1) {
		this.received.push({callback: callback, argumentList: argumentList});
		this.pending.splice(index, 1);
		if (this.pending.length === 0 || this.timedOut) {
			this.dispatchCallbacks();
		}		
	}
};

/** @private
	Calls the original (wrapped) functions, and the optional syncCallback.
	Called when all created wrapper functions have been called, 
	or when we time out and repeatedly thereafter as each wrapper is called.
*/
Mojo.Function.Synchronize.prototype.dispatchCallbacks = function dispatchCallbacks() {
	var cbRecord;
	for (var i = this.received.length - 1; i >= 0; i--) {
		cbRecord = this.received[i];
		cbRecord.callback.apply(undefined, cbRecord.argumentList);
	}
	this.received.clear();
	
	if (this.syncCallback) {
		this.syncCallback.call(undefined, !!this.timedOut);
		delete this.syncCallback; // ensure it's only called once
	}
	
	this.cancelTimeout();
};

/** @private */
Mojo.Function.Synchronize.prototype.cancelTimeout = function handleTimeout() {
	if(this.timeoutID) {
		window.clearTimeout(this.timeoutID);
		delete this.timeoutID;
	}
};

/** @private */
Mojo.Function.Synchronize.prototype.handleTimeout = function handleTimeout() {
	this.timedOut = true;
	this.dispatchCallbacks();
};



/**
This utility can be used to "debounce" multiple calls to a function, so that it will only be called once, or
to perform some related function after a delay during which the primary function has not been called.
	
For example, window resize events often come in a series as the window is resized. it's helpful to have UI only update after the last one.
Alternatively, when typing a filter for a filtered list, the widget should only re-query when the user has stopped typing.
	
`debounce()` returns a wrapped `onCall` function which can be called just like the original.
The given `onCall` function will be called immediately, and the `onTimeout` function will be scheduled to be called after the specified delay.
Any additional invocations of the wrapper during this delay period will reset the delay timer in addition to calling `onCall`.
When things "settle down", then the timer will expire, and the `onTimeout` function will be called.
Arguments passed to the `onTimeout` function are a copy of the ones from the most recent invocation of the wrapper.

#### Example Use: ####
We use debounce() to implement a user-driven delay for clearing a search string when the user is typing.
The idea is that if they type 'abc' quickly, then the search string is not cleared, and we'll search for abc... 
But then if there is a delay before they press 'd', then the search string is cleared and we'd only search for 'd'.

// this.clearSearchString() will be called 1 second after the most recent call to this.delayedClear().
this.delayedClear = Mojo.Function.debounce(undefined, this.clearSearchString.bind(this), 1, this.controller.window);


@param {function} onCall
	Function to call each time the wrapper is invoked.  May be undefined.
@param {function} onTimeout
	Function to call when the wrapper is invoked, after the delay expires.
@param {integer} delay
	Time in seconds to wait for function invocations to "settle down".
@param {string} optionalWindow
	Controls which window the delay timer runs in.  Defaults to 'window'.
 */
Mojo.Function.debounce = function debounce(onCall, onTimeout, delay, optionalWindow) {
	var timeoutID;
	var savedArgs;
	var triggerFunc, timeoutFunc;
	optionalWindow = optionalWindow || window;
	
	timeoutFunc = function() {
		timeoutID = undefined;
		onTimeout.apply(undefined, savedArgs);
		savedArgs = undefined;
	};
	
	triggerFunc = function() {
		savedArgs = $A(arguments);
		if(timeoutID !== undefined) {
			optionalWindow.clearTimeout(timeoutID);
		}
		timeoutID = optionalWindow.setTimeout(timeoutFunc, delay*1000);
		return onCall && onCall.apply(this, arguments);
	};
	
	return triggerFunc;
};



/*
type filtering
func = debounce(onKey, doSearch, 0.5);


resizing:
func = debounce(doNothing, doResize, 0.5);


mouseMove:
func = debounce(doNothing, doResize, 0.1);


*/












