function ScrollingAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
 this.kScrollModeCookieName = "scrollModeCookie";
 }
ScrollingAssistant.prototype.setup = function() {
	this.modesModel = {scrollbars: true, mode: "free"},
	this.sizesModel = {size: "f"},
	this.modes = [{label: $L("Free"), value: "free"}, 
		{label: $L("Horizontal"), value: "horizontal"}, 
		{label: $L("Vertical"), value: "vertical"}, 
		{label: $L("Dominant Axis"), value: "dominant"},
		{label: $L("Horizontal-Snap"), value: 'horizontal-snap'},
		{label: $L("Vertical-Snap"), value: 'vertical-snap'}],
	this.sizes = [{label: $L("Full"), value: "f"}, 
		{label: $L("Medium"), value: "m"}, 
		{label: $L("Small"), value: "s"}],

	this.weights = [{label: $L("Light"), value: 'light'}, 
		{label: $L("Medium"), value: 'medium'}, 
		{label: $L("Heavy"), value: 'heavy'}],
		
	this.weightValues = {light: 0.3, medium: 0.1, heavy: 0.03},

	this.friction = [{label: $L("Low"), value: 'low'}, 
		{label: $L("Medium"), value: 'medium'}, 
		{label: $L("High"), value: 'high'}],

	this.frictionValues = {low: 0.06, medium: 0.2, high: 0.5}
	
		this.renderSingleDogContent();
		
		// Observe mojo-property-change events on our selector widgets:
		this.sizeChanged = this.sizeChanged.bind(this);
		this.modeChanged.bind(this);
		this.weightChanged.bind(this);
		this.frictionChanged.bind(this);
		this.rememberImageSize = this.rememberImageSize.bind(this)
		
		this.modesModel.mode = this.getSavedScrollMode() || 'free';
		
		this.modesModel.weight = 'light';
		this.modesModel.friction = 'low';

		this.controller.setupWidget('two_dogs', {}, this.modesModel);
		this.controller.setupWidget('sizeSelector', {label: $L('Size'), choices: this.sizes, modelProperty:'size'}, this.sizesModel);
		this.controller.setupWidget('modeSelector', {label: $L('Mode'), choices: this.modes, modelProperty:'mode'}, this.modesModel);
		this.controller.setupWidget('weightSelector', {label: $L('Weight'), choices: this.weights, modelProperty:'weight'}, this.modesModel);
		this.controller.setupWidget('frictionSelector', {label: $L('Friction'), choices: this.friction, modelProperty:'friction'}, this.modesModel);
		
	
		this.scroller = this.controller.get('two_dogs');

		this.scrollStarting = this.scrollStarting.bind(this);
		this.moved = this.moved.bind(this);
		this.propertyChangedHandler = this.propertyChanged.bind(this);
		this.snap = this.snap.bind(this);
	}
	
ScrollingAssistant.prototype.activate = function() {
		this.controller.listen(this.controller.document, 'keypress', this.snap);
		Mojo.Event.listen(this.controller.get('sizeSelector'), Mojo.Event.propertyChange, this.sizeChanged);
		Mojo.Event.listen(this.controller.get('modeSelector'), Mojo.Event.propertyChange, this.modeChanged);
		Mojo.Event.listen(this.controller.get('weightSelector'), Mojo.Event.propertyChange, this.weightChanged);
		Mojo.Event.listen(this.controller.get('frictionSelector'), Mojo.Event.propertyChange, this.frictionChanged);		
		this.controller.listen('dog_img', 'load', this.rememberImageSize);
		this.controller.listen(this.scroller, Mojo.Event.propertyChanged, this.propertyChangedHandler);
		this.controller.listen(this.scroller, Mojo.Event.scrollStarting, this.scrollStarting);
}
	
ScrollingAssistant.prototype.deactivate = function() {
		this.controller.stopListening(this.controller.document, 'keypress', this.snap);		
		this.controller.stopListening('sizeSelector', Mojo.Event.propertyChange, this.sizeChanged);
		this.controller.stopListening('modeSelector', Mojo.Event.propertyChange, this.modeChanged);
		this.controller.stopListening('weightSelector', Mojo.Event.propertyChange, this.weightChanged);
		this.controller.stopListening('frictionSelector', Mojo.Event.propertyChange, this.frictionChanged);
		
		this.controller.stopListening(this.controller.document, 'keypress', this.snap);
		this.controller.stopListening(this.scroller, Mojo.Event.propertyChanged, this.propertyChangedHandler);
		this.controller.stopListening(this.scroller, Mojo.Event.scrollStarting, this.scrollStarting);	
		this.controller.stopListening('dog_img', 'load', this.rememberImageSize);	
}
ScrollingAssistant.prototype.cleanup = function() {
}	
ScrollingAssistant.prototype.snap = function(keypressEvent) {
		if (keypressEvent.charCode === this.LOWER_CASE_I) {
			var newSnapIndex = (this.modesModel.snapIndex + 1) % 3;
			this.scroller.mojo.setSnapIndex(newSnapIndex, true);
		}
	}
	
ScrollingAssistant.prototype.scrollStarting = function(event) {
		event.scroller.addListener(this);
		Mojo.Log.info(new Date(), "scroll starting");			
	}
	
ScrollingAssistant.prototype.moved = function(stopping) {
		if (stopping) {
			Mojo.Log.info(new Date(), "scroll stopping");			
		}
	}
	
ScrollingAssistant.prototype.renderSingleDogContent = function() {
		var content = Mojo.View.render({object: {appBase: Mojo.appPath}, template: 'containers/scrolling/single_dog'});
		this.controller.get('scrolling_contents').innerHTML = (content);
	}
	
	// Handle menu commands as needed:
ScrollingAssistant.prototype.handleCommand = function(event) {
		if(event.type == Mojo.Event.command && typeof this[event.command] == "function") {
			this[event.command](event);
		}
}
	
	
ScrollingAssistant.prototype.rememberImageSize = function(event) {
		this.originalSize = Mojo.Dom.getDimensions(this.controller.get('dog_img')) 
		this.sizeChanged();
		this.modeChanged();
	}
	
ScrollingAssistant.prototype.calculateImageSize = function(scaleFactor) {
		return {height: this.originalSize.height * scaleFactor, width: this.originalSize.width * scaleFactor};
		
	}
	
ScrollingAssistant.prototype.saveScroll = function() {
		this.scrollState = this.scroller.mojo.getState();
	}
	
ScrollingAssistant.prototype.restoreScroll = function() {
		this.scroller.mojo.setState(this.scrollState, true);
	}
	
ScrollingAssistant.prototype.modeChanged = function(event) {
		var content;
		if(this.modesModel.mode.match(/snap/)) {
			content = Mojo.View.render({object: {appBase: Mojo.appPath}, template: 'scrolling/number_grid'});
			this.controller.update('scrolling_contents', content);
			var vElements = $$('*.scroll-number-left');
			var hElements = $$('*.scroll-number-top');
			this.modesModel.snapElements = {x: hElements, y: vElements};
			this.modesModel.snapIndex = 1;
			this.controller.modelChanged(this.modesModel);
		} else {
			this.renderSingleDogContent();
			this.sizeChanged();
			this.modesModel.snap = false;
			this.controller.modelChanged(this.modesModel);
		}
		this.setSavedScrollMode(this.modesModel.mode);
	}
	
ScrollingAssistant.prototype.sizeChanged = function(event) {
		var newSize, dogImg;
		switch(this.sizesModel.size) {
		case 'f':
			newSize = this.originalSize;
			break;
		case 'm':
			newSize = this.calculateImageSize(0.25);
			break;
		case 's':
			newSize = this.calculateImageSize(0.1);
			break;
		}
		dogImg = this.controller.get('dog_img');
		dogImg.height = newSize.height;
		dogImg.width = newSize.width;
		this.scroller.mojo.scrollTo(0,0);
	}
	
ScrollingAssistant.prototype.weightChanged = function() {
		this.scroller.mojo.updatePhysicsParameters({flickFactor: this.weightValues[this.modesModel.weight]});		
	}
	
ScrollingAssistant.prototype.frictionChanged = function() {
		this.scroller.mojo.updatePhysicsParameters({flickSpeed: this.frictionValues[this.modesModel.friction]});		
	}
	
ScrollingAssistant.prototype.propertyChanged = function(event) {
		Mojo.Log.info("propertyChanged");
	}

	


ScrollingAssistant.prototype.LOWER_CASE_I = "i".charCodeAt(0);


ScrollingAssistant.prototype.getSavedScrollMode = function() {
	var scrollModeCookie = new Mojo.Model.Cookie(this.kScrollModeCookieName);
	return scrollModeCookie.get();
};

ScrollingAssistant.prototype.setSavedScrollMode = function(scrollMode) {
	var scrollModeCookie = new Mojo.Model.Cookie(this.kScrollModeCookieName);
	scrollModeCookie.put(scrollMode);
}
