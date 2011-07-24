/**
 * @private
 */

Mojo.NodeRefGenerator = {};

/**
 * @private
 */
Mojo.NodeRefGenerator._createNodeRefAccessors = function(proto, prop) {
	Mojo.NodeRefGenerator._createNodeRefGetter(proto, prop);
	Mojo.NodeRefGenerator._createNodeRefSetter(proto, prop);
};


/**
 * @private
 */
Mojo.NodeRefGenerator._createNodeRefGetter = function(proto, prop) {
	//should check for this._ref?
	//defined falsy values?
	proto.__defineGetter__(prop,
		function() {
			return this._ref[prop];
		});	
};

/**
 * @private
 */
Mojo.NodeRefGenerator._createNodeRefSetter = function(proto, prop) {
	//should check for this._ref?
	proto.__defineSetter__(prop, 
		function(newVal) { 
			this._ref[prop] = newVal; 
		});
};

/**
 * @private
 */
Mojo.NodeRefGenerator._createNodeRefWrapper = function(proto, prop) {
	//should check for this._ref?
	var wrapperFunc = function() {
		//error handling not necessary?
		return this._ref[prop].apply(this._ref, arguments);
	};
	
	proto[prop] = wrapperFunc;	
};
	
/**
 * @private
 */
Mojo.NodeRefGenerator._generateNodeRefProto = function() {
	var prop;
	var sampleElement = new Element('div');
	var proto = {};
	
	for(prop in sampleElement) {
		if(!proto[prop]) {
			if(Object.isFunction(sampleElement[prop])) {
				Mojo.NodeRefGenerator._createNodeRefWrapper(proto, prop);
			} else {
				Mojo.NodeRefGenerator._createNodeRefAccessors(proto, prop);
			}
		}
	}
	
	proto.removalHandler = function(event) {
		if(this._ref === undefined) {
			Mojo.Log.warn("Removing non-existant node ref instance due to dom node removal event!!");
		}
		delete this._ref;
	};
	
	proto.insertionHandler = function(event) {
		if(this._ref !== undefined) {
			Mojo.Log.warn("REPLACING node ref instance due to dom node insertion event!!");
		}
		this._ref = event.target;
	};
	
	proto.addHandlers = function() {
		this._ref.addEventListener('DOMNodeRemovedFromDocument', this.removalHandler, false);
		this._ref.addEventListener('DOMNodeInsertedIntoDocument', this.insertionHandler, false);		
	};
	
	proto.removeHandlers = function() {
		this._ref.removeEventListener('DOMNodeRemovedFromDocument', this.removalHandler, false);
		this._ref.removeEventListener('DOMNodeInsertedIntoDocument', this.insertionHandler, false);
	};
	
	proto.getActualNode = function() {
		return this._ref;
	};

	return proto;
};


/** @private */
Mojo.NodeRef = function(element) {
	Mojo.require(element, "NodeRef: must create noderef around element");
	this._ref = element;
	this.removalHandler = this.removalHandler.bind(this);
	this.insertionHandler = this.insertionHandler.bind(this);
	this.removeHandlers = this.removeHandlers.bind(this);
	this.addHandlers = this.addHandlers.bind(this);
	this.addHandlers();
}; 
Mojo.NodeRef.prototype = Mojo.NodeRefGenerator._generateNodeRefProto();

