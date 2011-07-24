/**
 * @name depot.js
 * @fileOverview This file has functions related to documenting the Mojo Depot (Depot); a framework wrapper around HTML5 active record access.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/*jslint forin: true */

/**
Depot is an API that allows you to store JavaScript objects in a database.
Today it is implemented as a framework wrapper around HTML5 active record access; but this could change in the future.

You can create a new Depot like this:

		var db = new Mojo.Depot(options, onSuccess, onFailure);


Where `options` is an object whose properties contain a number of options for opening or creating a Depot.

		Attribute 		Type							Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
		name			String							Required				Name used for the HTML5 database name.
		version			Number							Optional	1			Version number used for the HTML5 database.
		displayName		String							Optional	name		Name that would be used in user interface that the user sees 
																				regarding this database. Not currently used.
		estimatedSize	Number							Optional				Estimated size for this database.
		replace			Boolean							?			?			A truthy value for replace will cause any existing data for this 
																				depot to be discarded and a new, empty depot to be created.
		filters			Array							Optional				List of strings that objects in the depot can use as filters.
		identifiers		{String:(Function|Object), ...}	Optional				Hash containing key-value pairs of identifiers with either 
																				constructor functions or objects whose constructor function to use.
																				Identifier string must be non-falsy

Callback functions:

		{Function} onSuccess  Callback function that is called if the depot is successfully opened or created.
		{Function} onFailure  Callback function that is called with an error string if an error occurs.

		The following error codes may be returned to onFailure:
		Code 	Situation
		0 	The transaction failed for reasons unrelated to the database itself and not covered by any other error code.
		1 	The statement failed for database reasons not covered by any other error code.
		2 	The statement failed because the expected version of the database didn't match the actual database version.
		3 	The statement failed because the data returned from the database was too large. The SQL "LIMIT" modifier might be useful to reduce the size of the result set.
		4 	The statement failed because there was not enough remaining storage space, or the storage quota was reached and the user declined to give more space to the database.
		5 	The statement failed because the transaction's first statement was a read-only statement, and a subsequent statement in the same transaction tried to modify the database, but the transaction failed to obtain a write lock before another transaction obtained a write lock and changed a part of the database that the former transaction was depending upon.
		6 	An INSERT, UPDATE, or REPLACE statement failed due to a constraint failure. For example, because a row was being inserted and the value given for the primary key column duplicated the value of an existing row.

@constructor
 */

Mojo.Depot = Class.create(
	/** @lends Mojo.Depot */
	{

		/**
		 * @private
		 * Constructor function to create a new depot.
		 * 
		 *		{Object} options	Object whose properties contain a number of options for opening or creating a Depot.
		 *							name: {String} Name used for the HTML5 database name. (required).
		 *							version: {Number} Version number used for the HTML5 database. (optional, defaults to 1).
		 *							displayName: {String} Name that would be used in user interface that the user sees 
		 *								regarding this database. Not currently used. (optional, defaults to name).
		 *							estimatedSize: {Number} Estimated size for this database. (optional, no default).
		 *							replace: {Boolean} A truthy value for replace will cause any existing data for this 
		 *								depot to be discarded and a new, empty depot to be created.
		 *							filters: {Array} list of strings that objects in the depot can use as filters.
		 *							identifiers: {String : (Function | Object), ...}
		 *								hash containing key-value pairs of identifiers with either constructor
		 *								functions or objects whose constructor function to use.
		 *								Identifier string must be non-falsy
		 *		{Function} onSuccess  Callback function that is called if the depot is successfully opened or created.
		 * 		{Function} onFailure  Callback function that is called with an error string if an error occurs.
		 */
		initialize: function(options, onSuccess, onFailure) {
			try {
				this.sqlBuilder = new Mojo.Depot.SqlBuilder(options, onSuccess, onFailure);
			} catch(e) {
				this.handleFailure(onFailure, e);
			}
		},


		
		/**
		 * Function to delete the data from the current depot database.
		 * @param {Function} onSuccess  Callback function that is called if the data is successfully deleted
		 * @param {Function} onFailure  Callback function that is called if the data could not be deleted
		 */
		removeAll: function(onSuccess, onFailure) {
			try	{
				var sqlStrings = this.sqlBuilder._resetAllSql();
				this.sqlBuilder.execSqlList(sqlStrings, onSuccess, onFailure);
			} catch (e) {
				this.handleFailure(onFailure, e);
				return;
			}
		},


		/**
		 * Function to add an object, identified by a key, to the depot. The default bucket is used.
		 * @param {String} key          Key to identify an object to be stored in the depot.If an object with this
		 *                              key already exists in the default bucket, it will be replaced.
		 * @param {Object} value        Object to store in the depot.
		 * @param {Function} onSuccess  Callback function that is called if the object is successfully stored in the depot.
		 * @param {Function} onFailure  Callback function that is called with an error string if an error occurs and
		 *                              the object is not successfully stored in the depot.
		 */
		add: function(key, value, onSuccess, onFailure) {
			this.addSingle(null, key, value, null, onSuccess, onFailure);
		},

		/**
		 * Function to add an object, identified by a bucket and key, to the depot.
		 * @param {String} bucket       Bucket to identify the namespace of the key.
		 * @param {String} key          Key to identify an object to be stored in the depot.If an object with this
		 *                              key already exists in the bucket, it will be replaced.
		 * @param {Object} value        Object to store in the depot.
		 * @param {Array} filters       List of filter strings to tag the object with
		 * @param {Function} onSuccess  Callback function that is called if the object is successfully stored in the depot.
		 * @param {Function} onFailure  Callback function that is called with an error string if an error occurs and
		 *                              the object is not successfully stored in the depot.
		 *@private
		 */
		addSingle: function(bucket, key, value, filters, onSuccess, onFailure) {
			try	{
				var sqlStrings = this.sqlBuilder._addSingleSql(bucket, key, value, filters);
				this.sqlBuilder.execSqlList(sqlStrings, onSuccess, onFailure);
			} catch (e) {
				this.handleFailure(onFailure, e);
			}
		},

		/**
		 * Function to associate identifiers with constructor functions.
		 * @param {Object} identifiers       hash containing key-value pairs of identifiers with either constructor
		 *                                   functions or objects whose constructor function to use.
		 *                                   {String : (Function | Object), ...}
		 *                                   Identifier string must be non-falsy
		 *
		 *
		 *@private
		 */
		addIdentifiers: function(identifiers) {
			this.sqlBuilder.addIdentifiers(identifiers);
		},

		/**
		 * Function to unassociate identifiers from constructor functions.
		 * @param {Array | String} identifiers       Array of identifier strings or a single identifier string to delete
		 *
		 *@private
		 */
		removeIdentifiers: function(identifiers) {
			this.sqlBuilder.removeIdentifiers(identifiers);
		},

		/**
		 * Function to add a list of objects to the depot.
		 * @param {Array} assorted      List of hashes specifying object arguments
		 *                              {String} bucket       Bucket to identify the namespace of the key.
		 *                              {String} key          Key to identify an object to be stored in the depot.
		 *                                                    If an object with this key already exists in the bucket,
		 *                                                    it will be replaced.
		 *                              {Object} value        Object to store in the depot.
		 *                              {Array} filters       (Optional) List of filter strings to tag the object with
		 * @param {Function} onSuccess  Callback function that is called if the objects are successfully stored in the depot.
		 * @param {Function} onFailure  Callback function that is called with an error string if an error occurs and
		 *                              the objects are not successfully stored in the depot.
		 *@private
		 */
		addMultiple: function(assorted, onSuccess, onFailure) {
			if(!assorted || !assorted.length) {
				if (onSuccess) {
					onSuccess.defer();					
				}
				return;
			}
			try {
				var sqlStrings = this.sqlBuilder._addMultipleSql(assorted);
				this.sqlBuilder.execSqlList(sqlStrings, onSuccess, onFailure);
			} catch(e) {
				this.handleFailure(onFailure, e);
			}

		},


		/**
		 * Function to remove all objects in a particular bucket
		 * @param {String} bucket       Bucket to be removed.
		 * @param {Function} onSuccess  Callback function that is called if the bucket is successfully removed.
		 * @param {Function} onFailure  Callback function that is called with an error string if an error occurs
		 *@private
		 */
		removeBucket: function(bucket, onSuccess, onFailure) {
			try {
				var sqlStrings = this.sqlBuilder._removeBucketSql(bucket);
				this.sqlBuilder.execSqlList(sqlStrings, onSuccess, onFailure);
			} catch(e) {
				this.handleFailure(onFailure, e);
			}
		},

		/**
		 * Function to remove an object, identified by a bucket and key, from the depot.
		 * @param {String} bucket       Bucket to identify the namespace of the key; if not specified or null, _defaultBucketName is used.
		 * @param {String} key          Key to identify an object to be removed from the depot.
		 * @param {Function} onSuccess  Callback function that is called if the object is successfully removed from the depot.
		 * @param {Function} onFailure  Callback function that is called with an error string if an error occurs and
		 *                              the object is not successfully removed from the depot.
		 */
		remove: function(bucket, key, onSuccess, onFailure) {
			try {
				var sqlStrings = this.sqlBuilder._removeObjectSql(bucket, key);
				this.sqlBuilder.execSqlList(sqlStrings, onSuccess, onFailure);
			} catch(e) {
				this.handleFailure(onFailure, e);
			}
		},
		
		/**
		 * Function to remove an object, identified by a key, from the depot. The default bucket is used.
		 * @param {String} key          Key to identify an object to be removed from the depot. 
		 * @param {Function} onSuccess  Callback function that is called if the object is successfully removed from the depot.
		 * @param {Function} onFailure  Callback function that is called with an error string if an error occurs and
		 *                              the object is not successfully removed from the depot.
		 * @since 1.2
		 * 
		 */
		discard: function(key, onSuccess, onFailure) {
			this.remove(undefined, key, onSuccess, onFailure);
		},


		/**
		 * Function to get an object, identified by a key, from the depot. The default bucket specified by
		 * _defaultBucketName is used.
		 * @param {String} key          Key to identify an object that was stored in the depot.
		 * @param {Function} onSuccess  Callback function that is called if the object is successfully retrieved from
		 *                              the depot.This function is passed the retrieved object as its first parameter.
		 *                              If there is no object for this key, null will be passed to the onSuccess
		 *                              callback.
		 * @param {Function} onFailure  Callback function that is called if an error occurs, other than there being no
		 *                              object for the specified key. It is called with an error string as the only
		 *                              argument.
		 */
		get: function(key, onSuccess, onFailure) {
			this.getSingle(null, key, onSuccess, onFailure);
		},


		/**
		 * Function to get an object, identified by the bucket and key, from the depot.
		 * @param {String} bucket       Bucket to identify the namespace of the key.
		 * @param {String} key          Key to identify an object that was stored in the depot.
		 * @param {Function} onSuccess  Callback function that is called if the object is successfully retrieved from
		 *                              the depot.This function is passed the retrieved object as its first parameter.
		 *                              If there is no object for this key, null will be passed to the onSuccess
		 *                              callback.
		 * @param {Function} onFailure  Callback function that is called if an error occurs, other than there being no
		 *                              object for the specified key. It is called with an error string as the only
		 *                              argument.
		 *@private
		 */
		getSingle: function(bucket, key, onSuccess, onFailure) {
			try {
				var sqlStrings = this.sqlBuilder._getSingleSql(bucket, key, onSuccess, onFailure);
				this.sqlBuilder.execSqlList(sqlStrings, this._rsIgnoreSuccessCb, this._rsIgnoreFailureCb);
			} catch(e) {
				this.handleFailure(onFailure, e);
			}
		},

		/**
		 * Function to get multiple objects. Only requires bucket or filters. Can take both.
		 * @param {String} bucket       Bucket to fetch objects from.
		 * @param {Array} filters       Filters that will be applied with the first filters being given higher priority
		 *                              over subsequent filters in ordering. A filter's order value depends on an object's
		 *                              first level value of the filter name.
		 *                              [["filterName", (optional) "descending" or "ascending"], ...]
		 * @param {Integer} limit       Maximum number of objects to return. Limit / Offset are ignored on a falsy value.
		 * @param {Integer} offset      Offset on index of the entire return set to start at
		 * @param {Function} onSuccess  Callback function that is called if the objects are successfully retrieved from
		 *                              the depot.This function is passed the retrieved objects in an array as its first
		 *                              parameter. If there is no object for this key, null will be passed to the onSuccess
		 *                              callback.
		 * @param {Function} onFailure  Callback function that is called with an error string if an error occurs
		 *@private
		 */
		getMultiple: function(bucket, filters, limit, offset, onSuccess, onFailure) {
			try {

				var sqlStrings = this.sqlBuilder._getMultipleSql(bucket, filters, limit, offset, onSuccess, onFailure);
				this.sqlBuilder.execSqlList(sqlStrings, this._ignoreSuccessCb, this._ignoreFailureCb);
			} catch(e) {
				this.handleFailure(onFailure, e);
			}
		},

		/**
		 * Function to get bucket size with.
		 * @param {String} bucket       Bucket to fetch size of.
		 * @param {Function} onSuccess  Callback function that is called with bucket size.
		 * @param {Function} onFailure  Callback function that is called with an error string if an error occurs
		 *@private
		 */
		getBucketSize: function(bucket, onSuccess, onFailure) {
			try {
				var sqlStrings = this.sqlBuilder._getBucketSizeSql(bucket, onSuccess, onFailure);
				this.sqlBuilder.execSqlList(sqlStrings, this._ignoreSuccessCb, this._ignoreFailureCb);
			} catch(e) {
				this.handleFailure(onFailure, e);
			}
		},
		
		/**
		 * Function to handle exceptions.
		 * @param {Function} onFailure  Callback function that is called with an error string if an error occurs
		 * @param {object} e  			Exception
		 *@private
		 */
		handleFailure: function(onFailure, e) {
			if (onFailure) {
				onFailure.defer(e.message);
			}
		}


		/** @private */
		/*
		  //for debugging purposes if table contents can't be accessed directly
		_dumpTables: function() {
			this.sqlBuilder._dumpTables();
		}
		*/


    });

/** @private*/
Mojo.Depot.prototype.simpleAdd = Mojo.Depot.prototype.add;
/** @private*/
Mojo.Depot.prototype.removeSingle = Mojo.Depot.prototype.remove;
/** @private*/
Mojo.Depot.prototype.simpleGet = Mojo.Depot.prototype.get;
/**
 * @private
 * Describe SqlBuilder
 *
 * Helper for Depot in constructing the sql strings that it sends for Html5 databases.
 *
 */
/** This will make this class private to jsDoc **/
/**#@+   @private */
Mojo.Depot.SqlBuilder = Class.create({
		initialize: function(options, onSuccess, onFailure) {
			var sqlStrings;

			this.name = options.name;
			this.displayName = options.displayName || this.name;
			this.version = (options.version === undefined) ? 1 : options.version;
			this.estimatedSize = options.estimatedSize;
			this.replace = options.replace;
			this.filters = options.filters || [];

			//this serves as the hash of constructor functions for reconstructed objects.
			//if a proper constructor function isn't stored, Object/Array is used
			this.identifiers = {};
			this.identifiers.object = Object;
			this.identifiers.array = Array;

			//depot users may specify custom constructor functions
			this.addIdentifiers(options.identifiers);

			//keys in this hash are valid filters for objects added/removed from the depot.
			this._filters = {};
			for(var i=0; i<this.filters.length; i++)  {
				this._filters[this.filters[i].toLowerCase()] = true;
			}

			this.badSqlError = {code:-1, message:"error: bad arg passed in. accepts [a-zA-Z0-9_]"};
			this.badFilterError = {code:-1, message:"error: bad filter."};
			this.noKeyError = {code:-1, message:"error: no key specified."};


			this.db = openDatabase(this.name, this.version, this.displayName, this.estimatedSize);
			if (this.replace) {
				sqlStrings = this._resetAllSql();
			} else {
				sqlStrings = this._createTablesSql();
			}

			this.execSqlList(sqlStrings, onSuccess, onFailure);
		},

		_isValidFilter: function(filter) {
			return !!this._filters[filter.toLowerCase()];
		},

		execSql: function(sqlString, valuesList, onSuccess, onFailure) {
			var sqlStrings = [[sqlString, valuesList]];
			var transCb = this._genTransSteps(sqlStrings);
			this._execTrans(transCb, onSuccess, onFailure);
		},

		/**
		 * This is of course private like everything else in the class, but for info purposes...
		 *
		 * This method executes a list of sql strings that you'd like to execute and calls the appropriate
		 * results set and transactional callbacks.
		 *
		 * @param {Array} sqlStrings
		 *                   [
		 *                     [
		 *                      {String} sqlString,
		 *                      {Array} valuesList (Optional),
		 *                      {Function} rsSuccess (Optional),
		 *                      {Function} rsFailure (Optional)
		 *                     ],
		 *                     ...
		 *                   ]
		 *
		 *                   -sqlStrings is an array of arrays of up to size 4.
		 *                   -sqlString is a valid sql string with ?'s for value substitution
		 *                   -valuesList are the values to substitute for the ?'s in the previous statement.
		 *                    The length of valuesList must equal the number of ?'s.
		 *                   -rsSuccess is called with the results of sqlString's execution if successful
		 *                   -rsFailure is called with an error if sqlString's execution is unsuccessful
		 * @param {Function} onSuccess transactional callback that is called on success
		 * @param {Function} onFailure transcational callback that is called on failure
		 *
		 *
		 */
		execSqlList: function(sqlStrings, onSuccess, onFailure) {
			var transCb = this._genTransSteps(sqlStrings, true);
			this._execTrans(transCb, onSuccess, onFailure);
		},

		//this is prepended to user-provided identifier keys so they don't conflict with depot's identifiers.
		_idPrepend: "USER_TYPE_",

		/*
		 * This is of course private like everything else in the class, but for info purposes...
		 *
		 *
		 * @param {Object} identifiers
		 *                {{String} idString : {Object | Function} constructor, ... }
		 *
		 *                 A constructor may either be a constructor function or an object whose constructor
		 *                 function you would like to use
		 *
		 */
		addIdentifiers: function(identifiers) {
			var i;
			var internalId;

			if(!identifiers) {
				return;
			}

			for(i in identifiers) {
				internalId = this._idPrepend + i;
				if(typeof identifiers[i] == 'function') {

					this.identifiers[internalId] = identifiers[i];
				} else {

					this.identifiers[internalId] = identifiers[i].constructor;
				}
			}
		},

		removeIdentifiers: function(identifiers) {
			if(!identifiers) {
				return;
			}

			if(Object.isArray(identifiers)) {
				for(var i=0; i<identifiers.length; i++) {
					delete this.identifiers[this._idPrepend + identifiers[i]];
				}
			} else {
				delete this.identifiers[this._idPrepend + identifiers];
			}
		},


		constructNewObj: function(identifier, value) {
			switch(identifier) {
			case "undefined":
				return undefined;
			case "null":
				return null;
			case "boolean":
				return (value === "true" ? true : false);
			case "string":
				return value;
			case "number":
				return Number(value).valueOf();
			}

			if(this.identifiers[identifier]) {
				return new this.identifiers[identifier]();
			}

			return {};

		},

		//returns a string stating the 'type' of object. this is the key associated with
		//the obj's constructor function if it exists, or object by default.

		//this will return 'undefined', 'null', 'boolean', 'string', and 'number' if
		//appropriate
		typeIdentifier: function(obj) {
			var i;

			if(obj === null) {
				return "null";
			}

			for(i in this.identifiers) {
				if(this.identifiers[i] === obj.constructor) {
					return i;
				}
			}
			return "object";
		},

		//wrapper to pass onFailure the failure message.
		//supports original failures of the form (e), (trans, e)
		_failureWrap: function(onFailure, e1, e2) {
			if(onFailure) {
				if(e2 && e2.message && e2.code) {
					onFailure("Result Set Failure (code " + e2.code + "): " + e2.message);
				} else if(e1 && e1.message && e1.code) {
					onFailure("Transaction Failure (code " + e1.code + "): " + e1.message);
				} else {
					onFailure("Unknown Failure");
				}
			}
		},


		_genTransSteps: function(argList, rsMode) {
			if(rsMode) {
				//any of the statements can have rs callbacks associated with them.
				return this._execRsSqlStmts.bind(this, argList);
			} else {
				//statements may only have a rs success callback on the last statement and no failure cb's.
				return this._execSqlStmts.bind(this, argList);
			}
		},

		_execTrans: function(transactionCb, successCb, errorCb) {
			if(errorCb || successCb) {
				successCb = successCb || this._ignoreSuccessCb.bind(this, "exec trans");
				errorCb = this._failureWrap.bind(this, (errorCb ? errorCb : Mojo.Log.error));
				this.db.transaction(transactionCb, errorCb, successCb);
			} else {
				this.db.transaction(transactionCb);
			}

		},


		_execSqlStmts: function(sqlValuePairs, transaction) {
			//(rsFailure would be handled by overall transaction failure)
			if(!sqlValuePairs || !sqlValuePairs.length) {
				return;
			}

			//0 - sql string.
			//1 - valuesList
			//2 - rs callback
			//3 - error callback
			for(var i = 0; i < sqlValuePairs.length - 1; i++) {
			    //console.log("execing " + sqlValuePairs[i][0] + " " + sqlValuePairs[i][1]);
				transaction.executeSql(sqlValuePairs[i][0], sqlValuePairs[i][1] || []);
			}
			//console.log("execing " + sqlValuePairs[sqlValuePairs.length-1][0] + " " + sqlValuePairs[sqlValuePairs.length-1][1]);

			transaction.executeSql(sqlValuePairs[sqlValuePairs.length-1][0],
								   sqlValuePairs[sqlValuePairs.length-1][1] || [],
								   sqlValuePairs[sqlValuePairs.length-1][2]);



		},

		_execRsSqlStmts: function(sqlExecArgs, transaction) {
			if(!sqlExecArgs) {
				return;
			}

			for(var i = 0; i < sqlExecArgs.length; i++) {
				var sqlString = sqlExecArgs[i][0];
				var valuesList = sqlExecArgs[i][1] || [];
				var rsSuccess = sqlExecArgs[i][2];
				var rsFailure = sqlExecArgs[i][3];

				//console.log("rs execing " + sqlString + " " + valuesList);
				if(rsFailure) {
					rsFailure = this._failureWrap.bind(this, rsFailure);
					transaction.executeSql(sqlString, valuesList, rsSuccess, rsFailure);
				} else if(rsSuccess) {
					transaction.executeSql(sqlString, valuesList, rsSuccess);
				} else {
					transaction.executeSql(sqlString, valuesList);
				}
			}
		},

		//returns the sql fragment in a statement corresponding to a list of filters.
		_filterString: function(filters) {

			var len;
			if(filters && filters.length) {
				len = filters.length;
			} else {
				return "";
			}

			var acc = "";

			for(var i=0; i < len; i++) {
				this._validateSql(filters[i]);
				acc += "'"+filters[i].toLowerCase() +"' text UNIQUE ON CONFLICT REPLACE, ";
			}
			return acc;
		},

		//returns the sql fragment corresponding to an object added to the depot.
		//nodeList corresponds to the results of GraphWalker
		_nodeInsertionSql: function(nodeList, bucket, key, value, filters) {
			if(!nodeList || !nodeList.length || !key) {
				return [];
			}

			if(!bucket) {
				bucket = this._defaultBucketName;
			}
			var i;
			var acc = [];
			var filterVals = [];
			var filterUnknowns = "";
			var filterCols = "";
			var subVals = [bucket, key];

			if(filters && filters.length) {
				for(i=0; i < filters.length; i++) {
					var filter = filters[i].toLowerCase();
					if(this._isValidFilter(filter)) {
						var filterVal = value[filter];
						var filterValType = typeof filterVal;
						switch(filterValType) {
						case "boolean":
							filterVals.push("" + filterVal );
							break;
						case "number":
						case "string":
							filterVals.push(filterVal);
							break;
						default:
							filterVals.push("");
						}

						filterUnknowns += ", ?";
						filterCols += ", " + filter;
					} else {
						throw this.badFilterError;
					}

				}
				subVals = [bucket, key].concat(filterVals);
			}


			//remove potential old nodes in properties table.
			acc.push(["DELETE FROM 'properties' WHERE frowid IN (SELECT id FROM 'toc' WHERE bucket=? AND key=?)",
			  [bucket, key]]);

			//add entry into toc with appropriate filters, bucket, key
			acc.push(["INSERT OR REPLACE INTO 'toc' (bucket, key"+
					  filterCols + ") VALUES(?, ?" + filterUnknowns + ")", subVals]);
			acc.push(["INSERT OR REPLACE INTO 'insinfo' (name, value) VALUES('tocidx', last_insert_rowid())"]);


			//add nodes into properties table with foreign key, node value, left, right, name, type
			for(i=0; i < nodeList.length; i++) {
				var node = nodeList[i];

				acc.push(["INSERT OR REPLACE INTO 'properties' (frowid, left, right, type, name, value) VALUES((SELECT value FROM 'insinfo' WHERE name='tocidx'), ?, ?, ?, ?, ?)",
						  [node.left, node.right, node.type, node.name, "" + node.value]]);

			}

			return acc;

		},


		_removeBucketSql: function(bucket) {
			if(!bucket) {
				return [];
			}

			var acc = [];


			acc.push(["DELETE FROM 'properties' WHERE frowid IN (SELECT id FROM 'toc' WHERE bucket=?)", [bucket]]);
			acc.push(["DELETE FROM 'toc' WHERE bucket=?", [bucket]]);

			return acc;

		},


		_removeObjectSql: function(bucket, key) {
			if(!key) {
				return [];
			}
			if (!bucket) {
				bucket = this._defaultBucketName;
			}
			


			var acc = [];
			acc.push(["DELETE FROM 'properties' WHERE frowid = (SELECT id FROM 'toc' WHERE bucket=? AND key=?)", [bucket, key]]);
			acc.push(["DELETE FROM 'toc' WHERE bucket=? AND key=?", [bucket, key]]);

			return acc;

		},

		_resetAllSql: function() {
			var sqlStrings = [["DROP TABLE IF EXISTS 'toc';"],
							  ["DROP TABLE IF EXISTS 'insinfo';"],
							  ["DROP TABLE IF EXISTS 'properties';"]];
			return sqlStrings.concat(this._createTablesSql());
		},

		_createTablesSql: function() {
			return [["CREATE TABLE IF NOT EXISTS 'toc' " +
							   "('id' INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, " +
							   this._filterString(this.filters) +
							   "'bucket' text NOT NULL DEFAULT '', 'key' text NOT NULL ON CONFLICT REPLACE DEFAULT '', UNIQUE ('bucket', 'key'))"],
							  ["CREATE TABLE IF NOT EXISTS 'properties' " +
							   "('frowid' integer, " +
							   "'value' text DEFAULT '', 'left' integer default 0, 'right' integer default 0,"+
							   " 'name' text DEFAULT '', 'type' text DEFAULT '', " +
							   "Foreign Key(frowid) references toc(id), Primary key(frowid, left, right));"],
							  ["CREATE TABLE IF NOT EXISTS 'insinfo' " +
							   "('name' text UNIQUE NOT NULL ON CONFLICT REPLACE, " +
							   "'value' integer)"]];
		},

		_filtersSqlClause: function(filters) {
			if(!filters) {
				return "";
			}

			switch(typeof filters)
				{
				case "string":
				case "number":
				case "boolean":
					filters = [filters];
					break;
				case "object":
					//'checks' if array, 'checks' if empty.
					if(!filters.length) {
						return "";
					}
					break;
				default:
					return "";
				}


			var notNullAcc = "";
			var orderByAcc = " ORDER BY ";

			for(var i=0; i < filters.length; i++) {

				var filter;
				var orderby;

				if(typeof filters[i] == "object") {
					//should be array with asc/desc specified
					filter = filters[i][0].toLowerCase();
					orderby = filters[i][1];
				} else {
					filter = filters[i];
				}

				this._validateSql(filter);

				notNullAcc += " AND " + filter + " IS NOT NULL";

				orderByAcc += " " + filter + ((orderby == "descending") ? " DESC," : " ASC,");
			}

			//remove extraneous ,
			orderByAcc = orderByAcc.substring(0, orderByAcc.length-1);

			return notNullAcc + orderByAcc;
		},


		_filtersNotNullSqlClause: function(filters) {
			if(!filters) {
				return "";
			}

			switch(typeof filters)
				{
				case "string":
				case "number":
				case "boolean":
					filters = [filters];
					break;
				case "object":
					//'checks' if array, 'checks' if empty.
					if(!filters.length) {
						return "";
					}
					break;
				default:
					return "";
				}


			var notNullAcc = "";

			for(var i=0; i < filters.length; i++) {

				var filter;

				if(typeof filters[i] == "object") {
					//should be array with asc/desc specified
					filter = filters[i][0].toLowerCase();
				} else {
					filter = filters[i].toLowerCase();
				}
				this._validateSql(filter);
				notNullAcc += " AND " + filter + " IS NOT NULL";
			}

			return notNullAcc;
		},

		_addSingleSql: function(bucket, key, value, filters) {
			var walker = new Mojo.Depot.GraphWalker(value, this.typeIdentifier.bind(this));
			var nodes = walker.walk();

			var sqlStrings = this._nodeInsertionSql(nodes, bucket, key, value, filters);

			return sqlStrings;
		},

		_addMultipleSql: function(assorted) {
			var sqlStrings = [];

			for(var i = 0; i < assorted.length; i++) {
				var bucket = assorted[i].bucket;
				var key = assorted[i].key;
				var value = assorted[i].value;
				var filters = assorted[i].filters;


				var walker = new Mojo.Depot.GraphWalker(value, this.typeIdentifier.bind(this));
				var nodes = walker.walk();

				sqlStrings = sqlStrings.concat(this._nodeInsertionSql(nodes, bucket, key, value, filters));

			}

			return sqlStrings;
		},

		_getSingleSql: function(bucket, key, onSuccess, onFailure) {
			if(!bucket) {
				bucket = this._defaultBucketName;
			}

			if(!key) {
				throw this.noKeyError;
			}

			return [["SELECT * from 'properties' where frowid = (SELECT id FROM 'toc' WHERE bucket=? AND key=?)", [bucket, key], this._getSingleRs.bind(this, onSuccess, onFailure)]];
		},

		_getMultipleSql: function(bucket, filters, limit, offset, onSuccess, onFailure) {
			var sqlStrings;
			if(filters) {
				//TODO: functions for total / each part of string.
				//FIXME:
				var bucketClause = (bucket ? "bucket=? " : "");
				var filterClause = this._filtersSqlClause(filters);
				if(!bucketClause && filterClause) {
					filterClause = filterClause.substring(4, filterClause.length);
				}

				this._validateSql(limit);
				this._validateSql(offset);


				sqlStrings = [["SELECT id FROM 'toc' WHERE " + bucketClause +
							   filterClause +
							   ((limit) ? " LIMIT " + limit + (offset ? " OFFSET " + offset : ""): ""),
							   (bucket ? [bucket] : []), this._sortedSetIds.bind(this, onSuccess, onFailure, filters, bucket), onFailure]];

			} else {
				sqlStrings = [["SELECT * from 'properties' where frowid IN (SELECT id FROM 'toc' WHERE bucket=? )", [bucket], this._getSetRsCb.bind(this, onSuccess, onFailure, null)]];
			}

			return sqlStrings;

		},



		_getBucketSizeSql: function(bucket, onSuccess, onFailure) {
			var sqlStrings = [["SELECT COUNT(id) FROM 'toc' WHERE bucket=? ",
							   [bucket],
							   this._getRsWrapper.bind(this, onSuccess, function(x){return x[0]["COUNT(id)"];}),
							   onFailure]];
			return sqlStrings;

		},


		/*******private helpers for construction.***********/

		_sortedSetIds: function(onSuccess, onFailure, filters, bucket, transaction, resultSet) {
			var order = [];
			var rows = resultSet.rows;

			for(var i = 0; i < rows.length; i++) {
				order[i] = rows.item(i).id;
			}
			//FIXME:
			var bucketClause = (bucket ? "bucket=? " : "" );
			var filterClause = this._filtersNotNullSqlClause(filters);
			if(!bucketClause && filterClause) {
				filterClause = filterClause.substring(4, filterClause.length);
			}
			var sqlStrings = [["SELECT * from 'properties' where frowid IN (SELECT id FROM 'toc' WHERE " +
							   bucketClause +
							   filterClause +")", (bucket ? [bucket] : []),
							   this._getSetRsCb.bind(this, onSuccess, onFailure, order)]];

			this.execSqlList(sqlStrings, this._ignoreSuccessCb.bind(this, "sorted bucket ids"), this._ignoreFailureCb);

		},



		/*******private cb wrappers / methods.***********/

		_validSqlRegex: /^\w*$/ ,

		_validateSql: function(sqlString) {
			if(!this._validSqlRegex.match(sqlString)) {
				throw this.badSqlError;
			}
		},


		_getSingleRs: function(onSuccess, onFailure, transaction, resultSet) {
			var rows = resultSet.rows;
			var objParts = [];


			for(var i = 0; i < rows.length; i++) {
				objParts[i] = rows.item(i);
			}

			var builder = new Mojo.Depot.ObjectBuilder(objParts, this.constructNewObj.bind(this));

			var result = builder.rebuild();


			//this is really strange if getSingle is called w/o an onSuccess
			if(onSuccess) {
				onSuccess(result);
			}
		},



		_rsIgnoreFailureCb: function(result, result2) {
			/*
			if(result2 && result2.message) {
				Mojo.Log.error("database failure: " + result2.message);
			} else {
				Mojo.Log.error("database failure: " + result.message);
			}
			Mojo.Log.error("returning rs false");
			*/
			return false;
		},

		_getRsWrapper: function(onSuccess, preprocessor, transaction, resultSet) {
			var rows = resultSet.rows;
			var ret = [];

			preprocessor = preprocessor || this._identity;

			for(var i = 0; i < rows.length; i++) {
				ret[i] = rows.item(i);
			}

			onSuccess(preprocessor(ret));
		},

		_rsIgnoreSuccessCb: function() {
			//Mojo.Log.error("***IGNORING RS Success***");
		},

		_ignoreSuccessCb: function(message) {
			/*
			if(message) {
				Mojo.Log.error("ignore success cb : " + message);
			} else {
				console.log("ignore success cb");
			}
			*/

		},

		_ignoreFailureCb: function(result, result2) {
			/*
			console.log("ignore failure cb (not returning false)");
			if(result2 && result2.message) {
				console.log("RS database failure: " + result2.message);
			} else {
				console.log("Transaction database failure: " + result.message);
			}
			*/
		},


		_getSetRsCb: function(onSuccess, onFailure, order, transaction, resultSet) {
			try {
				var rows = resultSet.rows;
				var objParts = [];


				for(var i = 0; i < rows.length; i++) {
					objParts[i] = rows.item(i);
				}

				//Mojo.Log.info("order to setb : ", order);
				var builder = new Mojo.Depot.SetBuilder(objParts, order, this.constructNewObj.bind(this));
				var result = builder.rebuild();

				//this is really strange if there is no onSuccess.....
				if (onSuccess) {
					onSuccess(result);
				}
			} catch(e) {
				if (onFailure) {
					onFailure(e);
				}
				//console.log("Failure, set rs cb : " + e.message);
			}
		},

		_identity: function(x) {
			return x;
		},

		//used as bucket name if simpleAdd/simpleRemove is used
		_defaultBucketName: "defaultbucket",

		//for debugging purposes if there is no way to debugger to directly view db contents
		_dumpTables: function() {
			this.execSqlList([["SELECT * FROM 'toc'", null, this._dumpTablesSuccess.bind(this, "TOC"), Mojo.Log.error]]);
			this.execSqlList([["SELECT * FROM 'properties'", null, this._dumpTablesSuccess.bind(this, "PROPS"), Mojo.Log.error]], this._dumpTablesSuccess.bind(this, "PROPERTIES"), Mojo.Log.error);
		},

		//for debugging purposes if there is no way to debugger to directly view db contents
		_dumpTablesSuccess: function(name, transaction, resultSet) {
			var output = ("\n\n\n" + name + "\n");

			if(resultSet) {
				var rows = resultSet.rows;
				for(var i = 0; i < rows.length; i++) {
					output += (Object.toJSON(rows.item(i)) + "\n");
				}
			}
			Mojo.Log.info(output);

		}



    });

/** Mojo.Depot.SqlBuilder is private */
/**#@-*/



/**
 * @private
 * Describe SetBuilder
 *
 * Rebuilds a set of javascript objects that have been deconstructed with GraphWalker
 *
 */
/** This will make this class private to jsDoc **/
/**#@+   @private */

Mojo.Depot.SetBuilder = Class.create({
		initialize: function(nodes, order, objectConstructor) {
			this.nodes = nodes;
			this.order = order;
			this.objBuilder = new Mojo.Depot.ObjectBuilder([], objectConstructor);
		},

		setNodes: function(nodes, order) {
			this.nodes = nodes;
			this.order = order;
		},


		rebuild: function() {
			var i;
			var nodeIdHash = {};
			var resultArr = [];
			var nodes = this.nodes;
			var rowidList = [];
			var orderByArray;

			if(!nodes || !nodes.length) {
				return [];
			}

			//the nodes are grouped by the objects that they belong to.
			//nodeIdHash's keys each correspond to a different object.
			for(i=0; i<nodes.length; i++) {
				if(!nodeIdHash[nodes[i].frowid]) {
					nodeIdHash[nodes[i].frowid] = [];
					rowidList.push(nodes[i].frowid);
				}

				nodeIdHash[nodes[i].frowid].push(nodes[i]);
			}

			//if depot had an 'order by' specified by a filter, the objects should
			//be reconstructed in that order.

			//this.order may not be the same length as rowidList
			if(this.order) {
				orderByArray = this.order;
			} else {
				//otherwise, order things in a constant fashion if the same objects are in the fetched
				//set. ordered lexically, but doesn't matter since desired behavior is still achieved.
				rowidList.sort();
				orderByArray = rowidList;
			}

			for(i=0; i< orderByArray.length; i++) {
				this.objBuilder.setNodes(nodeIdHash[orderByArray[i]]);
				resultArr.push(this.objBuilder.rebuild());
			}

			return resultArr;
		}
    });

/** Mojo.Depot.SetBuilder is private */
/**#@-*/



/**
 * @private
 * Describe ObjectBuilder
 *
 * Rebuilds objects that have been deconstructed with GraphWalker
 *
 * This implements an inverse of the traversal in Graphwalker
 * in an iterative fashion instead of recursive.
 *
 * this.reconstructed maintains the reference to the object being reconstructed.
 * node.reconstructed maintains the reference to the property in that object that corresponds to that node
 *
 * The reconstruction works by sorting the nodes by left value, and then maintaining
 * a stack of the parents that are still incomplete. Parents are popped when
 * they no longer have any children that still need to be reconstructed.
 *
 */
/** This will make this class private to jsDoc **/
/**#@+   @private */
Mojo.Depot.ObjectBuilder = Class.create({
		initialize: function(nodes, objectConstructor) {
			this.nodes = nodes && nodes.sort(this._sortFunction);
			this.parentStack = [];
			this.constructNewObj = objectConstructor;
		},

		/**
		 * Allows object builder to start building a new object without
		 * having to instantiate a new ObjectBuilder.
		 */
		setNodes: function(nodes) {
			this.nodes = nodes && nodes.sort(this._sortFunction);
			this.parentStack = [];
		},


		/**
		 * sorts nodes from lowest left value to highest.
		 */
		_sortFunction: function(x, y) {
			return (x.left - y.left);
		},

		/**
		 * triggers a rebuild of the object and returns it.
		 */
		rebuild: function() {
			if(this.nodes.length === 0) {
				return null;
			}

			//TODO: merge into addToObj?
			switch(this.nodes[0].type) {
			case "reference":
			//throw error?
			//first elem cant be reference
			break;
			case "number":
			case "boolean":
			case "string":
			case "undefined":
			case "null":
				return this.constructNewObj(this.nodes[0].type, this.nodes[0].value);
			default:
				this._reduceAndPushParent(this.nodes[0]);

			}

			for(var i=1; i< this.nodes.length; i++) {
				var node = this.nodes[i];
				this._addToObject(node);
			}

			return this.reconstructed;
		},

		/**
		 * sets a property on a particular node's corresponding reconstruction
		 */
		_setObjProperty: function(key, val) {
			this.parentStack.last().reconstructed[key] = val;
			return this.parentStack.last().reconstructed[key];
		},

		/**
		 * returns the reconstructed property that a reference node refers to.
		 */
		_getRef: function(ref) {
			var upper = this.nodes.length - 1;
			var lower = 0;
			var middle;

			while(upper >= lower) {
				middle = Math.floor((upper + lower) / 2);
				if(this.nodes[middle].left > ref.value) {
					upper = middle - 1;
				} else if(this.nodes[middle].left < ref.value){
					lower = middle + 1;
				} else {
					return this.nodes[middle].reconstructed;
				}
			}

			return null;


		},

		/**
		 * adds the appropriate node's property to the object.
		 */
		_addToObject: function(node) {
			var newObj;
			switch(node.type) {

			case "reference":
				this._reduceParentCount(1);
				node.reconstructed = this._setObjProperty(node.name, this._getRef(node));
				break;

			case "number":
			case "boolean":
			case "string":
			case "null":
			case "undefined":
				newObj = this.constructNewObj(node.type, node.value);
				node.reconstructed = this._setObjProperty(node.name, newObj);
				this._reduceParentCount(1);
				break;
			default:
				newObj = this.constructNewObj(node.type, node.value);
				node.reconstructed = this._setObjProperty(node.name, newObj);
				this._reduceAndPushParent(node);
			}

			this._popParentPotentially();

		},

		/**
		 * reduces the count of children that still need to be constructed for this parent.
		 */
		_reduceParentCount: function(delta) {
			var curParent = this.parentStack.last();
			if(curParent && curParent.childrenLeft) {
				curParent.childrenLeft -= delta;
			}
		},

		/**
		 * reduces the number of children that still need to be constructed for the node's parent
		 * since the children are now associated with the new node
		 */
		_reduceAndPushParent: function(node) {
			var numChildren = this._getNumChildren(node);
			var sizeSubtree = numChildren + 1;

			if(this.parentStack.last()) {
				this._reduceParentCount(sizeSubtree);
			} else {
				this._startNewObject(node);
				node.reconstructed = this.reconstructed;
			}

			node.childrenLeft = numChildren;
			this.parentStack.push(node);

		},

		_startNewObject: function(node) {
			this.reconstructed = this.constructNewObj(node.type, node.value);
		},

		/**
		 * pops the trailing parents with 0 children left.
		 */
		_popParentPotentially: function(node) {
			while(this.parentStack.last() && this.parentStack.last().childrenLeft === 0) {
				this.parentStack.pop();
			}
		},

		_getNumChildren: function(node) {
			return (node.right - node.left - 1) / 2;
		}


    });

/** Mojo.Depot.ObjectBuilder is private */
/**#@-*/


/**
 * @private
 * Describe Graphwalker
 *
 * Treats an object as a 'graph' and breaks down its properties into nodes.
 *
 * Implemented using a bastardized Euler-tour-style tree traversal. Every node is 'entered'
 * and 'exited' once with the left value corresponding to entering, and right value to exiting.
 * A node is entered before and exited after its children have entered/exited. This allows
 * the graph structure to be stored in a flattened form.
 *
 * Supports self-loops/backpointers, and cycles by replacing them with a dud reference node
 * using the original's left reference number.
 *
 * Yay for seemingly useless academic algorithms.
 *
 */
/** This will make this class private to jsDoc **/
/**#@+   @private */
Mojo.Depot.GraphWalker = Class.create({

		initialize: function(graph, typeIdentifier) {
			this.graph = graph;
			this.records = [];
			this.index = 1;
			this.typeIdentifier = typeIdentifier;
		},

		/**
		 * describe walk
		 */
		walk: function() {
			if(this.graph === null) {
				//null sux. it's an object. but it can't be walked.
				return [{"left": 1, "right": 2, "name": "", "type": "null", "value": "null"}];
			}

			this._walk("", this.graph);

			this._removeMarkers(this.graph);

			return this.records;
		},

		_walk: function(propName, node) {


			if(this._isMarked(node)) {
				//node was already marked and added to records.
				//generate appropriate reference to this node and insert.

				this._addRecord(this._wrapReference(propName, node));

			} else {
				if(this.canHoldProperties(node)) {
					//node needs to be added to records...
					//and can hold properties...

					this._enterNode(node);

					for(var i in node) {
						if(i != this._markKey && node.hasOwnProperty(i)) {
							this._walk(i, node[i]);
						}
					}

					this._exitNode(node);
					this._addRecord(this._wrapContainer(propName, node));

				} else {
					//needs to be added.
					//can't hold properties.
					this._addRecord(this._wrapValue(propName, node));
				}


			}

		},


		canHoldProperties: function(node) {
			switch (typeof node) {
				case "object":
					return node !== null && node !== undefined;
				case "function":
					return true;
				default:
					return false;
			}

		},

		_isMarked: function(node) {
			return (node && node[this._markKey]);
		},

		//marking is needed for things that can hold properties to determine if they've been reached.
		//mark must be stored in the node due to comparison/equality issues.
		_markNode: function(node) {
			node[this._markKey] = {};
		},

		_removeMarkers: function(root) {
			if(!root) {
				return;
			}

			if(root[this._markKey]) {
				delete root[this._markKey];
				for(var i in root) {
					this._removeMarkers(root[i]);
				}
			} else {
				return;
			}
		},

		_enterNode: function(node) {
			this._markNode(node);
			node[this._markKey].left = this.index++;
		},

		_exitNode: function(node) {

			node[this._markKey].right = this.index++;

		},

		_wrap: function(propName, toWrap) {
			if(this.canHoldProperties(toWrap)) {
				if(this._isMarked(toWrap)) {
					return this._wrapReference(propName, toWrap);
				} else {
					return this._wrapContainer(propName, toWrap);
				}
			} else {
				return this._wrapValue(propName, toWrap);
			}
		},

		_wrapReference: function(propName, orig) {
			//backpointers, selfloops, cycles, all the trixy stuff.
			var wrap = {left: this.index++,
						right: this.index++,
						name: propName,
						type: "reference",
						value: orig[this._markKey].left};

			return wrap;

		},

		_wrapValue: function(propName, val) {
			//strings, ints, all the unfun stuff.
			var wrap = {left: this.index++,
						right: this.index++,
						name: propName,
						type: (val !== null ? (typeof val) : 'null'),
						value: val};
			return wrap;
		},

		_wrapContainer: function(propName, container) {
			//arrays, hashes, objects, functions, all the fun stuff.
			var wrap = {left: container[this._markKey].left,
						right: container[this._markKey].right,
						name: propName,
						type: this.typeIdentifier(container),
						value: "(container)"};


			return wrap;
		},



		_addRecord: function(wrapped) {
			//assumes that _addRecord isn't called on things that can't hold properties.
			//all objects passed in are already properly wrapped

			//assumes that all properties in object's value were already removed so the object can be the value.

			this.records.push(wrapped);
		},

		_addUnwrappedRecord: function(propName, unwrapped) {
			this._addRecord(this._wrap(propName, unwrapped));
		},



		_markKey: "_depotMarkerString"




    });
/** Mojo.Depot.GraphWalker is private */
/**#@-*/