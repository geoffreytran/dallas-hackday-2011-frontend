/**
 * @name bigarray.js
 * @fileOverview Provides an abstract interface to a really large array.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/*
 	Provides an abstract interface to a really large array, and then dynamically loads portions of it as needed.
	At any given time, there's a "window" of items we've requested to be loaded.  This window is moved around 
	automatically (and more items are requested to be loaded) depending on item access patterns.<p>
	
	
	TODO:<br/>
	Optimize null addition to arrays...<br/> 
		possibly keep a pre-built window array of all nulls to return when it jumps too far.<br/>
		possibly keep a pre-built null array of size [lookahead - lookaheadTrigger], and use it with unshift.apply or push.apply.  Or concat.<br/>
		possibly build a separate array of only nulls, and then use concat. Saves updating indices over push() or unshift().<br/>
	<br/>
	Truncate & move window when length/size is reduced.<br/>
	
*/
/** @private */
Mojo.Model.BigArray = Class.create({
	
	loggingEnabled: false,
	
	/*
	 * describe
	 * @param {Object} itemsCallback function to call for items.  Arguments are (offset, limit, completionFunction).<br/>
						When the data is available, completionFunction() hsould be called with arguments (dataArray[, totalListSize]).<br/>
						The idea is that totalListSize is specified once, and then may be ommitted if desired (except when the list size changes).
	
	 * @param {Object} options Optional. A hash including some or all of the following options:<br/>
			{<br/>
				pageSize: Integer, number of items needed at any given time.  This is a range of loaded (or pending) items in the large overall array.<br/>
				lookahead: Integer, number of items to speculatively fetch before they are actually requested.<br/>
							This is basically how far the "item window" extends in each direction beyond the pageSize.<br/>
			}<br/>
	 */
	/** @private */
	initialize: function(itemsCallback, options) {
		
		this._itemsCallback = itemsCallback;
		
		this._options = options || {};
		this._pageSize = this._options.pageSize || 20;
		this._lookahead = this._options.lookahead || 15;
		this._lookaheadTrigger = this._lookahead * (this._options.lookaheadTrigger || 0.5); // item access past this number of elements into lookahead area will cause a window shift.
		
		this._windowSize = this._pageSize + (2*this._lookahead);
		
		// start window at beginning of array.
		this._windowOffset = 0;
		this._preferredWindowOffset = this._windowOffset;
		
		// start with no items loaded.
		// In order to easily handle the case where the list size < _windowSize, and grow the array
		// when necessary, we just define any items not in the array to be null.  Therefore, an
		// empty array should be the same as an array full of nulls. 
		this._items = [];
		
		this.length = 0;// Array size begins at 0.
	},
	
	/*
		This should generally be called immediately after the bigarray is created, unless the size is set instead.
		This is used when we do not know the size to prefetch the initial window of elements.  It's broken out into a separate 
		routine instead of simply doing this in initialize since the items may be provided 
		synchronously, and that might otherwise call back into the creator of the bigarray... 
		whose state might be inconsistent since the bigarray isn't even finished being 
		created at that point (and couldn't have been assigned to an instance var, etc.).
	*/
	/** @private */
	requestFullWindow: function() {
		
		// In order to request a full initial window of items before our size might have been set > 0,
		// we 'force' the request to be sent even if the limit's invalid.		
		this._requestItems(this._windowOffset, this._windowSize, true);
		
	},
	
	/*
	  Cleanup a big array so that it will no longer call its items callback.
	*/
	/** @private */
	cleanup: function cleanup() {
		delete this._itemsCallback;
	},
	
	
	/*
		**********
		Array APIs
		**********
	*/
	
	
	/*
		Returns a section of the array, giving 'null' for elements which are not currently loaded.
		If movewindow is true, the 'item window' may change move, triggering load requests for nearby items.
	 * @param {Object} start describe
	 * @param {Object} end describe
	 * @param {Object} movewindow describe
	 */
	/** @private */
	slice: function(start, end, movewindow) {
		var result;
		var pinnedStart, pinnedEnd;
		
		// Maybe move the window.
		if(movewindow) {
			this._updateWindow(start, end);
		}
		
		// Pin to list size, and return empty array if the inverval size <= 0.
		start = Math.max(start, 0);
		end = Math.min(end, this.length);
		if(start >= end) {
			return [];
		}
		
		// Special case if range is entirely outside our window. 
		if(end < this._windowOffset || start > this._windowOffset+this._items.length) {
			result = [];
			while(start < end){
				result.push(null);
				start++;
			}
		}
		else {
			// Determine range of elements we can provide directly:
			pinnedStart = Math.max(start, this._windowOffset);
			pinnedEnd = Math.min(end, this._windowOffset+this._items.length);
			
			result = this._items.slice(pinnedStart-this._windowOffset, pinnedEnd-this._windowOffset);
			
			// Add nulls where the request range is outside our _items array:
			while(pinnedStart > start) {
				result.unshift(null);
				pinnedStart--;
			}
			
			while(pinnedEnd < end) {
				result.push(null);
				pinnedEnd++;
			}
		}
		
		return result;
	},
	
	/*
		Inserts the given items into the array at the given offset.
		Total size is increased by items.length.
		Assumes the backing store behind the load function has been similarly updated.
	 * @param {Object} offset describe
	 * @param {Object} items describe
	 */
	/** @private */
	noticeAddedItems: function(offset, items) {
		var spliceItems;
		
		// increase list size:
		this.length += items.length;
		
		// We can mostly ignore the insert, unless the insertion point is in our currently loaded window.
		if(offset < this._windowOffset) {
			this._windowOffset += items.length;
			this._preferredWindowOffset += items.length;
			return;
		} else if(offset > this._windowOffset + this._windowSize) {
			return;
		}
		
		
		// copy array & prepend arguments needed for splice.
		spliceItems = items.slice(0);
		spliceItems.unshift(offset - this._windowOffset, 0);
		
		// Apply splice method to insert items at proper location.
		this._items.splice.apply(this._items, spliceItems);
		
		this._updateWindow();
	},
	
	/*
		removes the items from the array starting at the given offset, and contuing for 'limit' items.
		Assumes the backing store behind the load function has been similarly updated.
	 * 
	 * @param {Object} offset describe
	 * @param {Object} limit describe
	 */
	/** @private */
	noticeRemovedItems: function(offset, limit) {
		var count;
		var pinnedRange;
		
		// pin limit to total list size, and then decrease the list size:
		if(offset + limit > this.length) {
			limit = this.length - offset;
		}
		this.length -= limit;
		
		// Shift window back if needed:
		if(offset < this._windowOffset) {
			count = Math.min(this._windowOffset - offset, limit);
			this._windowOffset -= count;
			this._preferredWindowOffset -= count;
			offset += count;
			limit -= count;
		}
		
		// Now, pin the range to what we've actually loaded, and see if there's anything left to remove:
		pinnedRange = this._pinOffsetLimit(offset,limit);
		offset = pinnedRange.offset;
		limit = pinnedRange.limit;
				
		if(limit > 0) {
			// Remove the actual items:
			this._items.splice(offset - this._windowOffset, limit);
		
			// adjust window location, in case we need to move back.
			this._updateWindow();
		}
	},
	
	/*
		Replaces the indicated range of array elements with given items.
		Items not currently loaded are ignored, with the exception that items provided past 
		the end of the list will cause the list length to grow appropriately.
		Assumes the backing store behind the load function has been similarly updated.

	 * @param {Object} offset describe
	 * @param {Object} items describe
	 */
	/** @private */
	noticeUpdatedItems: function(itemsOffset, itemsArray) {
		var startIndex=0;
		var endIndex=itemsArray.length;
		var newItems;
		
		this.log('got noticeUpdatedItems:'+itemsOffset+", +"+itemsArray.length);
		
		// Auto-grow array, if necessary:
		if(itemsOffset + itemsArray.length > this.length) {
			// We don't use the standard length-setting call since we need to suppress the request for 
			// items that might be caused by the length change.  This is safe to do, since we only ever 
			// grow the list, and only when we already have the items in itemsArray.
			this.length = itemsOffset + itemsArray.length;
			this._updateWindow(undefined, undefined, true);			
		}
		
		// Calculate which part of the itemsArray we want, in case we don't want it all:
		if(itemsOffset < this._windowOffset) {
			startIndex = this._windowOffset - itemsOffset;
		}
		
		if(itemsOffset + itemsArray.length > this._windowOffset + this._windowSize) {
			endIndex = this._windowOffset + this._windowSize - itemsOffset;
		}
		
		// Copy the items over the appropriate part of the items array, 
		// but only if they overlap our window.
		if(endIndex > startIndex) {
			// Copy the items over the appropriate part of _items.
			// First extract the range we need into a new array, then prepend the necessary arguments to splice, 
			// and finally apply splice to the array to remove the old elements and insert the new ones.
			newItems = itemsArray.slice(startIndex, endIndex);
			Mojo.assert(endIndex-startIndex == newItems.length, "newItems length is incorrect.");
			newItems.unshift(itemsOffset - this._windowOffset + startIndex, endIndex-startIndex); // (insertAt, removeCount)
			this._items.splice.apply(this._items, newItems);
		}
		
	},
	
	
	
	
	/*
		Invalidates the given items, causing them to be re-requested from the data source if needed.
		If limit is undefined, all items after 'offset' will be invalidated.
		If the invalid items are read using slice() before the new items are received, null will be returned.
		Returns true if any of the indicated items were loaded (and thus are now invalid).
	*/
	/** @private */
	invalidateItems: function(offset, limit) {
		var pinnedRange;
		var i;
		
		if(limit === undefined) {
			limit = this.length - offset;
		}
		
		pinnedRange = this._pinOffsetLimit(offset, limit);
		offset = pinnedRange.offset;
		limit = pinnedRange.limit;
		
		if(limit > 0) {
			
			// If we have items loaded that are now invalid, replace them with nulls and request them again.
			//for(i=0; i<limit; i++) {
			//	this._items[offset + i - this._windowOffset] = null;
			//}
			
			// Re-request the invalid items.
			// We actually hold on to the old item models as well, since they're at least better than null.
			
			this._requestItems(offset, limit);
			return true;
		}
		
		return false;
	},
	
	// Moves the given element in such a way as to minimize unnecessary queries
	// when the move is entirely within the loaded items window.
	// Returns 'true' if an immediate refresh of the list is needed.
	/** @private */
	reorderItem: function(oldIndex, newIndex) {
		var oldInWindow = this.indexInWindow(oldIndex);
		var newInWindow = this.indexInWindow(newIndex);
		var localOld = oldIndex - this._windowOffset;
		var localNew = newIndex - this._windowOffset;
		var item;
		
		// If the move is entirely within our window, we can just move it and not tell anyone.
		// This is usually the case when reordering items in lists.
		if(oldInWindow && newInWindow) {
			item = this._items[localOld];
			this._items.splice(localOld, 1);
			this._items.splice(localNew, 0, item);
			
			// return true to request an immediate refresh.
			// This is actually the "fast path" since it means we avoided requerying.
			return true;
		}
		else {
			// Otherwise, we go through a more elaborate process, and simply invalidate the current items window.
			// The item should have been properly moved now, and the length is not affected.
			// The regular remove/add APIs will usually result in at least one more request for items anyways... 
			// while leaving lots of room for things getting out of sync with the service side.
			// So, we just reload everything, and it should be all good.
			this.invalidateItems(0);
		}
	},
	
	indexInWindow: function(index) {
		return (index >= this._windowOffset && index < this._windowOffset + this._windowSize);
	},
	
	// Returns a hash with offset & limit properties indicating the range of currently loaded item models
	// (or items which have been requested).  This is sometimes used on the service side to optimize subscription data.
	/** @private */
	getLoadedItemRange: function(){
		return {offset:this._windowOffset, limit:this._items.length};
	},

	/** @private
	 * Returns the maximum number of loaded items the list will maintain in its local cache.
	 */
	maxLoadedItems: function() {
		return this._windowSize;
	},
	
	// Sets the size of the entire virtual array.  If this causes the loaded items window to be out of range,
	// or if it allows it to move closer to the "preferred offset", then it will be moved and any newly required 
	// items will be requested from the client.
	/** @private */
	setLength: function(length){
		this.length = length;
		this._updateWindow();
	},
	
	// Works like setLength, except the entire (possibly shifted) items window is invalidated.
	/** @private */
	setLengthAndInvalidate: function(length){
		this.length = length;
		this._updateWindow(undefined, undefined, true);
		this.invalidateItems(0);
	},
	
	
	/*
		**********************
		Private implementation
		**********************
	*/
	
	// Adjusts the offset & limit such that they are within the range of our loaded item window (or else limit is 0).
	// Returns a hash of the update values.
	/** @private */
	_pinOffsetLimit: function(offset, limit) {
		var delta;
		
		// Pin offset:
		if(offset < this._windowOffset) {
			limit -= this._windowOffset - offset;
			offset = this._windowOffset;
		}
		
		// Pin limit:
		limit = Math.min(limit, (this._windowOffset + this._windowSize - offset));
		limit = Math.min(limit, (this.length - offset));
		limit = Math.max(limit, 0);
		
		return {offset:offset, limit:limit};
	},
	
	/*
		Called internally when array elements are accessed.
		This function decides whether or not the item window should be moved, and moves it if so.
		Moving the window involves shifting our item array and requesting new items.
		
		Currently, requesting any elements past the "trigger point" of the "lookahead" areas will cause the 
		window to shift to 1 lookahead range beyond the accessed element.
		
		If called with no arguments, it may readjust the window (due to a change in the length of the list).
		When items are removed, it makes sure the window remains within a valid range.
		When items are added, it may shift the window to more closely cover what's been requested by the client. 
	 * @param {Object} start describe
	 * @param {Object} end describe
	 * @param {Object} suppressRequests describe
	 */
	/** @private */
	_updateWindow: function(start, end, suppressRequests) {
		var newOffset = this._preferredWindowOffset;
		var oldOffset = this._windowOffset;
		var i;
		var itemCount;
		var requestOffset;
		var extraItems;
		
		// If start/end range is specified, then calulate a new preferred offset.
		// Otherwise, we just adjust the window position based on the old preferred offset.
		if(start !== undefined) {
			// Calculate new window position, if it's far enough off...
			if(start < this._windowOffset + this._lookaheadTrigger) {
				newOffset = start - this._lookahead;
			}else if(end > this._windowOffset + this._lookahead + this._pageSize + this._lookaheadTrigger) {
				newOffset = end - this._pageSize - this._lookahead;
			}
		
			// Pin offset value:
			if(newOffset < 0) {
				newOffset = 0;
			}
			this._preferredWindowOffset = newOffset;	// save un-pinned offset, for later adjustment if items are added to the end.
		}
		
		// Don't allow window outside of list bounds:
		newOffset = Math.min(newOffset, this.length - this._windowSize);
		newOffset = Math.max(newOffset, 0);
		
		this._windowOffset = newOffset;
		
		itemCount = Math.abs(newOffset - oldOffset);
		
		
		// If we're shifting >= a whole window, then we just 'reset'.
		if(itemCount >= this._windowSize) {
			this._items = [];
			requestOffset = this._windowOffset;
			itemCount = this._windowSize;
		}
		// If offset is within the window, then we shift:
		else if(newOffset < oldOffset) {
			
			// Prepend proper number of null items
			for(i=0; i<itemCount; i++) {
				this._items.unshift(null);
			}
			
			// Request items at newOffset.
			requestOffset = newOffset;
		}
		else if(newOffset > oldOffset) {
			
			// Append proper number of null items
			// 'extraItems' is to handle the case where we're inserting items, 
			// so _items can temporarily be larger than allowed, and we can 
			// simply keep the elements we need instead of requesting them again.
			// This is legal since it only happens *during* noticeAddedItems(): _items is trimmed below.
			extraItems = this._items.length - this._windowSize;
			for(i=0; i<itemCount - extraItems; i++) {
				this._items.push(null);
			}
			
			// Remove items from the beginning.  List is trimmed to max size before requesting items.
			this._items.splice(0, itemCount);
			
			requestOffset = newOffset + this._items.length - itemCount + extraItems;
			itemCount = itemCount - extraItems;
		}
			// Offset is not shifting, but can we expand our window?
		else if(this._items.length < this._windowSize && this._windowOffset + this._items.length < this.length) {
			itemCount = Math.min(this.length - (this._windowOffset + this._items.length), 
								this._windowSize - this._items.length);
			for(i=0; i<itemCount; i++) {
				this._items.push(null);
			}
			requestOffset = this._items.length-itemCount;
		}
		
		// Trim window to maximum size, and request any new items that need to be loaded.
		// We allow this request to be suppressed, since there are cases where we are 
		// going to invalidate all the existing items anyways.  This helps us avoid a redundant query.
		this._trimWindow();
		
		if(!suppressRequests && requestOffset !== undefined) {
			this._requestItems(requestOffset, itemCount);
		}
		
	},
	
	/** @private */
	_trimWindow: function() {
		var maxSize = Math.min(this._windowSize, this.length);
		if(this._items.length > maxSize) {
			this._items.splice(maxSize, this._items.length - maxSize);
		}
	},
	
	
	
	/*
		Used internally to request items from the provider.
	*/
	/** @private */
	_requestItems: function(offset, limit, force) {
		var extraItems;
		
		this.log("_requestItems: @"+offset+", +"+limit);
		if(limit < 1 && !force) {
			return;
		}
		
		// Reduce limit if offset < 0
		if(offset < 0) {
			limit += offset;
			offset = 0;
		}
		
		// Not allowed to request more than one window-full of items.
		limit = Math.min(limit, this._windowSize);
		
		if (this._itemsCallback) {
			this._itemsCallback(offset, limit);			
		}
	}
	
});

Mojo.Log.addLoggingMethodsToClass(Mojo.Model.BigArray);
