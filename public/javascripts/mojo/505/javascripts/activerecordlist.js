/* A simple layer between the List widget and an AR Mojo Service that supports:
 * - separate list and count service calls
 * - list reset on service call single param change (e.g. filter)
 * - list reset on "updated: true" message from backend
 * - subscribe reset on list reset
 * - optional list item munger callback
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/
Mojo.ActiveRecordListBridge = Class.create({

	// listFn should be pre-scoped and accept the following params in order: (serviceParam, callback, subscriberId, offset, limit)
	// countFn should be pre-scoped and accept the following params in order: (serviceParam, callback)
	// mungeFn should be pre-scoped and accept the following param: {list:(list item window), offset, limit}
	// initialServiceParam (optional) sets the initial value passed to listFn and countFn
	initialize: function(listFn, countFn, mungeFn, initialServiceParam) {
		this.baseListFn = listFn;
		this.baseCountFn = countFn;
		this.mungeFn = mungeFn;
		
		this.setParam(initialServiceParam);
		this.setDoCount(true);
		
		this._handleResponseBound = this._handleResponse.bind(this);
		
		this._handleCount = this._handleCountResponse.bind(this, false);
		this._handleUpdateCount = this._handleCountResponse.bind(this, true);
		
		this.timings = [];
	},
	
	// Use this as the list items callback
	fetchItems: function(listWidget, offset, limit) {
		Mojo.Log.info("list requesting items w/ offset/limit:", offset, "/", limit);
		
		this.listWidget = listWidget;
		
		var responseHandler;
		
		if (!this.request) {
			// this is the first request and the one we should listen for responses to
			responseHandler = this._handleResponseBound.curry(listWidget);
		}
		
		var newRequest = this.listFn(responseHandler, this.subscriberId, offset, limit);
		if (!this.request) {
			// this is the first request, keep the request around to receive responses
			this.request = newRequest;
		}
		this.timings.push(Date.now());
	},
	
	// set up a new service param to use (if any)
	setParam: function(serviceParam) {
		Mojo.Log.info("THIS IS THE PARAM TO PASS TO SERVICE + \"", serviceParam, "\"");
		this.listFn = this.baseListFn.curry(serviceParam);
		this.countFn = this.baseCountFn.curry(serviceParam);
		this._reset();
	},
	
	setDoCount: function(doCount) {
		this.doCount = doCount;
	},
	
	cleanup: function() {
		if (this.request) {
			Mojo.Log.info("CANCELLING LIST QUERY");
			this.request.cancel();
			this.request = undefined;
		}
		if (this.sentCountRequest) {
			Mojo.Log.info("CANCELLING COUNT QUERY");
			this.sentCountRequest.cancel();
			this.sentCountRequest = undefined;
		}
		this.timings = [];
	},
	
	doUpdate: function() {
		this.sentCountRequest = this.countFn(this._handleUpdateCount.curry(this.listWidget));
		this.timings.push(Date.now());
	},
	
	_reset: function() {
		this.cleanup();
		this.subscriberId = undefined;
		this.updateInProgress = false;
		this.setDoCount(true);
		
		// @@ Notify list to reset here or in app code?  Need access to controller to reset scroller and call 'modelChanged()'...
	},
	
	_handleCountResponse: function(asPartOfUpdate, listWidget, response) {
		Mojo.assert(response !== undefined);
		Mojo.assert(response.count !== undefined);
		
		var begin = this.timings.shift();
		Mojo.Log.info("*** count ROUND TRIP TIME = ", (Date.now() - begin), " for count=", response.count);
		
		if (asPartOfUpdate) {
			// @@ This is the only piece of bridge code that is needed by the new 'sortKey'-based AR backend.
			// @@
			// When the list data is updated, the update may have affected the sortKey sentinels kept by the backend to speed up queries.
			//  But we currently don't know if this is the case, so for now, always re-subscribe to re-initialize the backend.
			this._reset();
		}
		
		// check if the count is different-- ignore if count is the same AND it's not an update response
		if (asPartOfUpdate) {
			
			Mojo.Log.info("**** INVALIDATING LIST CACHE AND SETTING LIST COUNT TO: ", response.count);
			listWidget.mojo.setLengthAndInvalidate(response.count);
			
		} else {
			if (listWidget.mojo.getLength() != response.count) {
				Mojo.Log.info("calling list.setLength w/ count=", response.count);
				listWidget.mojo.setLength(response.count);
			} else {
				Mojo.Log.info("got count response but list length is already set to: ", response.count);
			}
			
			if (listWidget.mojo.setCount) {
				listWidget.mojo.setCount(response.count);
			}
			
		}
		
	},
	
	_doUpdate: function(listWidget) {
		Mojo.Log.info("[[[[[[[[[[[[[[[[[ HANDLING DEFERRED UPDATE NOW");
		// this fn is delayed and first needs to re-evaluate whether it should still run
		
		if (!this.updateInProgress) {
			// doesn't need to run any more... maybe someone called this.setParam()?
			return;
		}
		
		// unset the 'in progress' flag so any updates from the db after this exact moment get processed normally.
		// otherwise, the update may be lost if the flag is set later than now.
		this.updateInProgress = false;
		
		this.doUpdate();
	},
	
	_handleResponse: function(listWidget, response) {
		var begin;
		//Mojo.Log.info ("*************************** WHOLE MESSAGE: %j", response);
		
		var setLengthToWindowSize = false;
		
		Mojo.assert(response !== undefined);
		
		if (response.updated) {
			Mojo.Log.info("[[[[[[[[[[[[[[[[[ Update Received");
			if (!this.updateInProgress) { 
				this.updateInProgress = true;
				
			Mojo.Log.info("[[[[[[[[[[[[[[[[[ Update Received: starting deferred update handler");
				this._doUpdate.bind(this).delay(5, listWidget);
			}
			return;
		}
		
		
		Mojo.assert(response.list !== undefined);
		Mojo.assert(response.offset !== undefined);
		Mojo.assert(response.limit !== undefined);
		
		begin = this.timings.shift();
		Mojo.Log.info("*** list ROUND TRIP TIME = ", (Date.now() - begin), " for offset/limit/actual", response.offset, "/", response.limit, "/", response.list.length);
		
		if (!this.subscriberId && response.subscriberId) {
			this.subscriberId = response.subscriberId;
		}
		
		if (!this.sentCountRequest) {
			if (response.list.length < response.limit) {
				Mojo.Log.info("window size < asked for limit, will set initial count = window size");
				setLengthToWindowSize = true;
			}
			else if (this.doCount) {
				// the total list length may be greater than or equal to this window size, need to ask for the full count
				Mojo.Log.info("window size >= asked for limit, issuing service query to find count");
				this.sentCountRequest = this.countFn(this._handleCount.curry(listWidget));
				this.timings.push(Date.now());
			} else {
				// have to make the count badge do something reasonable here
				if (listWidget.mojo.setCount) {
					listWidget.mojo.setCount('...');
				}
			}
		}
		
		if (this.mungeFn) {
			begin = new Date().getTime();
			this.mungeFn(response);
			var end = new Date().getTime();
			//			console.log("MUNGER TOOK " + (end - begin) + "ms");
		}
		
		//Mojo.Log.info("LIST UPDATE at offset=", response.offset, " items=", response.list.pluck('sortKey').toJSON());
		listWidget.mojo.noticeUpdatedItems(response.offset, response.list);
		
		if (setLengthToWindowSize) {
			this.timings.push(Date.now());
			this._handleCount(listWidget, { count: response.list.length });
			this.sentCountRequest = { cancel: function(){} };
		}
		
	}
	
});
