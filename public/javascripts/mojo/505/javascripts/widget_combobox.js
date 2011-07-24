/**
 * @name widget_combobox.js
 * @fileOverview This file has functions related to ComboBox widgets; 
 * See {@link Mojo.Widget.ExperimentalComboBox} for more info. 

Copyright 2009 Palm, Inc.  All rights reserved.

*/



/**
@private
#### Overview ####
The Combo Box is a combination of a textfield and list selector. The textfield allows the user to enter in a free form entry that 
filters through a list of possibilities while tapping the icon on the right opens the full list of possible choices.

The `hint text` in the field is optional. Once the user taps the field and starts typing, the hint text disappears. If the user 
does not have focus in that field and the field is empty, it shows the hint text.


#### Declaration ####

		<div x-mojo-element="ExperimentalComboBox" id="comboboxId" class="comboboxClass" name="comboboxName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element	Required	ComboBox		Declares the widget as type 'ComboBox' 
	    id				Required	Any String		Identifies the widget element for use when instantiating or rendering
	    class			Optional	Any String		Provide your own unique class and override the frameworks styles
	    name			Optional	Any String		Add a unique name to the ComboBox widget; generally used in templates when used 


#### Events ####

		this.controller.listen("comboboxId", 'mojo-listTap', this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
	    Mojo.Event.listTap
	    Mojo.Event.comboboxSearch
	    Mojo.Event.comboboxSelected
	    Mojo.Event.comboboxEntered


#### Instantiation ####
    
		this.controller.setupWidget("comboboxId",
			this.attributes = {
			   	hintText : $L('Hint...'),
				filterFunction : this.search.bind(this),
				template: 'combobox/combobox-listitem',
				formatters: {}
				},
			this.model = {
				}
		});
		

#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
	    hintText			String			Optional	Null		Initially displayed string; supplanted by model value if supplied
	    filterFunction		Function		Required				Called to load items when the list is scrolled or filter changes. Function definition:
																	filterFunction (filter, offset, count, callback(offset, data, total length))
	    template			String			Required                File path relative to app folder for container template
	    formatters			Function		Optional                Function to format list entry


#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
		None

#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		None


@field
*/
Mojo.Widget.ExperimentalComboBox = Class.create({
	
	/** @private */
	setup: function() {
		this.initializeDefaultValues();
    	//setup the combobox with passed in model parameters
	    this._renderWidget();
	    //setup any default model properties
	    this._setupTextField();
   
	    this._setupButtons();
		this.handleMouseEvent = this.handleMouseEvent.bind(this);
	    this.controller.listen(this.controller.document, Mojo.Event.tap, this.handleMouseEvent);
	    this.handleKeyEvent = this.handleKeyEvent.bind(this);
	    this.controller.listen(this.inputDiv, "keydown", this.handleKeyEvent);
	    this.handlePropertyChangedEvent = this.handlePropertyChangedEvent.bind(this);
	    this.controller.listen(this.inputDiv, Mojo.Event.propertyChange, this.handlePropertyChangedEvent);
	    this.controller.scene.pushCommander(this);
     	if (this.controller.attributes.focus) {
	        this.enterFocusedState();
		}
      
		this.controller.exposeMethods(['setValue']);
	},

	cleanup: function() {
		this.controller.stopListening(this.controller.document, Mojo.Event.tap, this.handleMouseEvent);
		this.controller.stopListening(this.inputDiv, "keydown", this.handleKeyEvent);
	    this.controller.stopListening(this.inputDiv, Mojo.Event.propertyChange, this.handlePropertyChangedEvent);
	  	this.controller.stopListening(this.showAllButton, Mojo.Event.tap, this.handleButtonPress);
	  	this.controller.stopListening(this.commitButton, Mojo.Event.tap, this.selectDefaultEntry);
		this.controller.stopListening(this.list, Mojo.Event.listTap, this.handleSelection);
	},
  
	setValue: function(value) {
		this.textFieldModel.value = value;
		this.controller.modelChanged(this.textFieldModel);
		this.enterUnfocusedState();
	},
  
	_setupButtons: function() {
  		this.commitButton = this.controller.get(this.divPrefix+'-'+'commit_button');
	  	this.showAllButton = this.controller.get(this.divPrefix+'-'+'show_all_button');
		this.handleButtonPress = this.handleButtonPress.bind(this);
	  	this.controller.listen(this.showAllButton, Mojo.Event.tap, this.handleButtonPress);
	  	this.commitButton.hide();
		this.selectDefaultEntry = this.selectDefaultEntry.bind(this);
	  	this.controller.listen(this.commitButton, Mojo.Event.tap, this.selectDefaultEntry);
	},
  
	enterShowAllState: function() {
    	Mojo.Log.info("STATE = COMBOBOX_WIDGET_SHOWALLSTATE");
	    this._cancelSearch();
	    this.STATE = this.COMBOBOX_WIDGET_SHOWALLSTATE;
	    this.showAllButton.show();
		this.showAllButton.removeClassName('showall');
		this.showAllButton.addClassName('showall-open');
		this.inputDiv.mojo.focus();
		this.hide();
		this.show(); //show the popup
		this.search('', true); //search for ALL
	},

	hideHintText: function() {
		this.textFieldAttributes.hintText = '';
		this.textFieldModel.value = this.inputArea.value;
		this.controller.modelChanged(this.textFieldModel);
	},
	
	showHintText: function() {
		this.textFieldAttributes.hintText = this.controller.model.hintText;
		this.textFieldModel.value = this.inputArea.value;
		this.controller.modelChanged(this.textFieldModel);
	},
  
	enterFilterState: function() {
    	Mojo.Log.info("STATE = COMBOBOX_WIDGET_FILTERSTATE");
	    this._cancelSearch();
	    this.STATE = this.COMBOBOX_WIDGET_FILTERSTATE;
	    this.showAllButton.hide();
	    this.showAllButton.removeClassName('showall-open');
	  	this.showAllButton.addClassName('showall');
		this.hideHintText();
		this.hide();
		this.show(); //show the popup
		this.commitButton.show();
		this.filteredSearch();
	},
  
	updateFilterState: function() {
		Mojo.Log.info("STATE = UPDATING FILTERED STATE" + this.inputArea.value);
		this._cancelSearch();
		this.filteredSearch();
	},
  
	enterUnfocusedState: function() {
    	Mojo.Log.info("STATE = COMBOBOX_WIDGET_UNFOCUSED");
	   	this._cancelSearch();
	   	this.STATE = this.COMBOBOX_WIDGET_UNFOCUSED;
	   	this.showAllButton.show();
	   	this.hide();
	   	this.commitButton.hide();
		this.inputDiv.mojo.focus();
	},
  
	enterFocusedState: function() {
	    if (this.inputArea.value.length > 0) {
	      this.enterFilterState();
	      return;
	    }
	    Mojo.Log.info("STATE = COMBOBOX_WIDGET_FOCUSED");
		this._cancelSearch();
	    this.STATE = this.COMBOBOX_WIDGET_FOCUSED;
	    this.showAllButton.show();
		this.commitButton.hide();
	    this.inputArea.mojo.focus();
	    this.hide();
	},
  
	search: function(text, force) {
		Mojo.Log.info("SUBMITTING SEARCH");
		if (!force && (!text || text.length === 0)) {
			return;
		}
		this.filterString = text;
		this.controller.scene.modelChanged(this.listModel);
	},
  
	/** @private */
	submitFilteredSearch: function() {
		//issue search event and pass in text; always use most recent value
		this.search(this.inputArea.value); //after search, have this call back with results
		this.filterTimer = null; //null this out; it was used
	},
  
	handleButtonPress: function(event) {
		Mojo.Log.info("GOT CLICK ON SHOW ALL");
	  	if (this.STATE !== this.COMBOBOX_WIDGET_SHOWALLSTATE) {
		    this.enterShowAllState();
		} else {
		    this.enterUnfocusedState();
		}
		event.stop();
	},
  
	/** @private */
	filteredSearch: function() {	
		//issue a request to contacts with the filtered string after "waiting" in between key strokes;
		//if there is not already a timer running, create the timer; otherwise, just wait for it to fire
		if (!this.filterTimer) {
			this.filterTimer = window.setTimeout(this.submitFilteredSearch.bind(this), 300); //let's try 300ms to start
		}
	},
  
	handlePropertyChangedEvent: function(event) {
		this.enterUnfocusedState();
		Mojo.Event.send(this.controller.element, Mojo.Event.propertyChange, {value: event.value});
	},

	isEventInInputArea: function(e) {
		if (e.target.up("div#"+this.inputDiv.id)) {
			return true;
		}
		return false;
	},
  
	handleMouseEvent: function(event) {
		switch (this.STATE) {
			case this.COMBOBOX_WIDGET_UNFOCUSED:
				if (this.isEventInInputArea(event)){
					this.enterFocusedState();
					event.stop();
				}
				break;
			case this.COMBOBOX_WIDGET_FOCUSED:
				if (this.isEventInShowAll(event)) {
				    break;
				} else if (!this.isEventInInputArea(event) && !this.isEventInPopup(event)) {
					this.enterUnfocusedState();
					event.stop();
					break;
				}
				break;
			case this.COMBOBOX_WIDGET_FILTERSTATE:
				if (this.isEventInShowAll(event)) {
					break;
				} else if (!this.isEventInInputArea(event) && !this.isEventInPopup(event)) {
				  	this.selectDefaultEntry();
				  	this.enterUnfocusedState();
					event.stop();
				  	break; 
				} 
				break;
			case this.COMBOBOX_WIDGET_SHOWALLSTATE:
				if (this.isEventInShowAll(event)) {
					break;
				} else if (!this.isEventInInputArea(event) && !this.isEventInPopup(event)) {
					this.selectDefaultEntry();
					this.enterUnfocusedState();
					event.stop();
					break; 
				}
				break;
			default:
				break;
		}
	},
  
	selectDefaultEntry: function() {
		var value = 'default';
		this.textFieldModel.value = value;
		this.controller.modelChanged(this.textFieldModel);
		this.enterFocusedState();
	},
  
	_cancelSearch: function() {
		if (this.filterTimer) {
 			window.clearTimeout(this.filterTimer); //cancel all search events, this is an ENTER
			this.filterTimer = null;
		}
	},
  
	handleKeyEvent: function(event) {
		var chr = event.keyCode;
		switch (this.STATE) {
			case this.COMBOBOX_WIDGET_UNFOCUSED:
				break;
			case this.COMBOBOX_WIDGET_FOCUSED:
				if (Mojo.Char.isDeleteKey(chr)) {
  					break;
				} else if (Mojo.Char.isCommitKey(chr)) {
  					//not an allowed char so ignore it
  					break;
				} else if (Mojo.Char.isPrintableChar(chr, true)){
  					Mojo.Log.info("got key event for filtering");
  					this.enterFilterState();
  					break;
				}
				break;
			case this.COMBOBOX_WIDGET_FILTERSTATE:
			if (Mojo.Char.isEnterKey(chr)) {
  				this.selectDefaultEntry();
  				this.enterUnfocusedState();
  				break;
			} else if (Mojo.Char.isDeleteKey(chr)) {
  				if (this.inputArea.value.length === 0 || this.selectedItems === 0) {
    				this.enterFocusedState();
    				break;
  					} else { //deletes are clearing state and doing a hide
    					this.updateFilterState();
    					break;
  					}
  					break;
				} else if (Mojo.Char.isCommitKey(chr)) {
  					this.selectDefaultEntry();
  					this.enterUnfocusedState();
  					break;
				} else {
  					this.updateFilterState();
  					break;
				}
				break;
			case this.COMBOBOX_WIDGET_SHOWALLSTATE:
				if (Mojo.Char.isEnterKey(chr)) {
  					this.selectDefaultEntry();
  					this.enterUnfocusedState();
  					break;
				} else if (Mojo.Char.isDeleteKey(chr)) {
  					this.enterUnfocusedState();
  					break;
				} else if (Mojo.Char.isCommitKey(chr)) {
  					//not an allowed char so ignore it
  					break;
				} else {
  					this.enterFilterState();
  					break;
				}
				break;
			default:
				break;
			}
	},
  
  initializeDefaultValues: function() {
    this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
    this.textFieldName = this.controller.attributes.inputName || this.controller.attributes.textFieldName || this.divPrefix+'-'+'input_area';
    
    this.COMBOBOX_WIDGET_UNFOCUSED = 0;
    this.COMBOBOX_WIDGET_FILTERSTATE = 1;
    this.COMBOBOX_WIDGET_SHOWALLSTATE = 2;
    this.COMBOBOX_WIDGET_FOCUSED = 3;
	  
	  this.STATE = this.COMBOBOX_WIDGET_UNFOCUSED;
	  
	  
  },
  

	filterFunction: function(listWidget, offset, limit) {
		var callback = this.updateItems.bind(this);
		this.controller.attributes.filterFunction(this.filterString, listWidget, offset, limit, callback);
	},

	updateItems: function(listWidget, offset, data, limit) {
		listWidget.mojo.setLength(limit);
		listWidget.mojo.noticeUpdatedItems(offset, data);
	},

  
	charsAllow: function() {
		return true;
	},
  
	_renderWidget: function() {
		var content;
		var model = {
		  divPrefix: this.divPrefix
		};
		if (this.controller.attributes.labelText) {
  		    this.controller.attributes.inputLabel = Mojo.View.render({object: model, template: 
					Mojo.Widget.getSystemTemplatePath('/combobox/combobox_input_label')});
  		}

  		content = Mojo.View.render({object: model,  
				template: Mojo.Widget.getSystemTemplatePath('/combobox/combobox_widget')
  		});
		this.controller.element.insert(content);
	},
  
	_setupTextField: function() {
		var model;
		Mojo.Log.info("div prefix" + this.divPrefix);
		this.textFieldAttributes = {
			textFieldName: this.textFieldName,
			focus: this.controller.attributes.focus,
			hintText: this.controller.attributes.hintText,
			label: this.controller.attributes.labelText,
			className: ' ',
			charsAllow: this.charsAllow.bind(this),
			acceptBack: true,
			requiresEnterKey: true
		};

		this.textFieldModel = {
		value: ''
		};
		this.controller.scene.setupWidget(this.divPrefix+'-'+'input_area_div', this.textFieldAttributes, this.textFieldModel);


		model = {
			divPrefix: this.divPrefix
		};
		this.popupContainer = this.controller.get(this.divPrefix+'-popup');
		this.popupScroller = this.controller.get(this.divPrefix+'-scroller');
		this._setupPopupScroller();
		this._setPopupHeight();

		this.list = this.controller.get(this.divPrefix+'-'+'results-container'); 
		this.listModel = {
		};
		this.listAttrs =
		{
			itemTemplate: this.controller.attributes.template,
			itemsCallback: this.filterFunction.bind(this),
			formatters:this.controller.attributes.formatters
		};  
		this.controller.scene.setupWidget(this.list.id, this.listAttrs, this.listModel);
		this.controller.instantiateChildWidgets(this.controller.element); //this should instantiate the big list and the filter field
		this.inputArea = this.controller.element.querySelector("[name="+this.textFieldName+"]");
		this.inputDiv = this.controller.get(this.divPrefix+'-'+'input_area_div');
		this.inputAreaOriginalSize = this.inputArea.getWidth();
		this.handleSelection = this.handleSelection.bindAsEventListener(this);
		this.controller.listen(this.list, Mojo.Event.listTap, this.handleSelection);
	},
  
  
	handleSelection: function(event) {
		var item = event.item;
	},
    
	show: function() {
		Mojo.Log.info("SHOWING POPUP");
		this.popupContainer.show();
		this._setPopupHeight(); //this might need to be reset
	},
    
	/** @private */
	_setPopupHeight: function() {
		var offset = this.controller.element.offsetTop;
		var inputHeight = this.controller.element.offsetHeight;
		var maxHeight = Mojo.View.getViewportDimensions(this.controller.document).height;
		var style = 'max-height: '+ (maxHeight - (offset + inputHeight) - 24) + 'px;'; //24 is Brandon's magic value
		//draw the popup right under where the input area ends    
		//draw the popup right under where the input area ends
		if (!this.inputArea) {
			return;
		}

  		//height is full - area taken up about the input area and bounds 
		this.popupScroller.setStyle(style); //auto set this
		this.popupContainer.setStyle({'position': 'absolute'});
	},
  
	_setupPopupScroller: function() {
		var popupscroller;
		this.controller.scene.setupWidget(this.popupScroller); // this is the scroller for the list
		popupscroller = new Mojo.Controller.WidgetController(this.popupScroller, this.controller.scene, {mode: 'vertical'});
	},

	hide: function() {
		Mojo.Log.info("HIDING POPUP");
		if(this.popupContainer) {
			this.popupContainer.hide();
		}
	},
  
	handleCommand: function(event) {
		if(event.type == Mojo.Event.back) {
			if (this.STATE != this.COMBOBOX_WIDGET_UNFOCUSED) {
				this.textFieldModel.value = "";
				this.controller.scene.modelChanged(this.textFieldModel);
				this.enterUnfocusedState();
  	    		event.preventDefault();
  	    		event.stopPropagation();
			}		
		}
	},
	
	/*** functions for determining state ***/
	isEventInPopup: function(event) {
		var target = event.target;
		if (this.popupContainer && (target.id == this.popupContainer.id || target.up('div#'+this.popupContainer.id))) {
			return true;
		}
		return false;
	},
  
	isEventInShowAll: function(event) {
		var target = event.target;
		if (target.id == this.showAllButton.id) {
			return true;
		}
		return false;
	}
  
});