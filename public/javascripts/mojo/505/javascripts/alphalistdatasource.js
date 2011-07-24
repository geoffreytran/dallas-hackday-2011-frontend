/**#nocode+
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * @name alphalistdatasource.js
 * @fileOverview A simple layer between BigList and Mojo Service that gives clients a whack at data
 * before it goes to the BigList.
 */

/**
 * A simple layer between BigList and Mojo Service that gives clients a whack 
 * at data before it goes to the BigList. 
 */
Mojo.Widget.AlphaListDataSource = Class.create({
	
	/**
	 * listFn should be pre-scoped and accept the following params in order:
	 *  callback, filter, offset, limit 
	 */
	initialize: function(listFn, mungeFn) {
		this.listFn = listFn;
		this.mungeFn = mungeFn;
	},
	
	/**
	 * begin BigList data source contract
	 * @param {Object} offset describe
	 * @param {Object} limit describe
	 */
	updateOffsetAndLimit: function(offset, limit) {   
		this.doRequest(offset, limit);
	},
	/* end BigList data source contract */
 
	/**
	 * set up the filter to use (if any) and any other configuration (subscriptions?) 
	 * @param {Object} filter
	 */
	setup: function(filter) {
		this.filteredFn = this.listFn.curry(filter, this.handleResponse.bind(this, filter));
		if (this.controller) {
			this.controller.reset();			
		}
	},
	
	/**
	 * describe
	 */
	cleanup: function() {
		if (this.request) {
			this.request.cancel();
		}
	},
	/**
	 * describe
	 * @param {Object} offset describe
	 * @param {Object} limit describe 
	 */
	doRequest: function(offset, limit) {
		this.cleanup();
		
		this.request = this.filteredFn(offset, limit);
	},
	
	/**
	 * describe
	 * @param {Object} filterString describe
	 * @param {Object} response describe
	 */
	handleResponse: function(filterString, response) {
		if (!filterString) {
			filterString = '';
		}
		// handle change lists
		// first attempt at this: always save off the latest munged data set, weave this change into that set and
		// re-apply the munger (over the whole set?... seems wasteful) then notify just with the changed records
		if (response.changeList) {
			if (this.bigListData) {
				
				var that = this;
				response.changeList.each(function(changed) {
					
					// find the index of the changed record
					var found = null;
					that.bigListData.list.each(function(c, index) {
						if (c.id == changed.id) {
							found = index;
							throw $break;
						}
					});
					
					if (found !== null) {
						that.bigListData.list.splice(found, 1, changed);
					}
					
				});
				
				if (this.mungeFn) {
					this.mungeFn(this.bigListData);
				}
				
				response.changeList.each(this.controller.itemChanged.bind(this.controller));
			}
			return;
		}
		
		this.bigListData = {};
		this.bigListData = response;
		
		if (this.mungeFn) {
			this.bigListData = this.mungeFn(filterString, this.bigListData);			
		}
		
		
		if (this.controller) {
			this.controller.handleNewData(this.bigListData);
		}
	}
	
});
/**#nocode-*/
