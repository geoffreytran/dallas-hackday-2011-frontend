/**
 * @name widget_richtextedit.js
 * @fileOverview Provide documentation for the rich text edit widget;
 * See {@link Mojo.Widget.RichTextEdit} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####
There is a simple Rich Text Edit widget that behaves exactly like a multiline text field, but in 
addition supports applying Bold, Italic and Underline styles to arbitrary runs of text within 
the field. You declare a x-mojo-element="RichTextEdit" DIV in your scene and set it up in your 
assistant without attributes or a model.

To enable the styling, set the richTextEditMenu property to true in the AppMenu attributes (see Menus for more information on the App Menu).


#### Declaration ####

		<div x-mojo-element="RichTextEdit" id="richTextEditId" class="message-rte" name="richTextEdit"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element	Required	RichTextEdit	Declares the widget as type 'RichTextEdit' 
	    id				Required	Any String		Identifies the widget element for use when instantiating or rendering
	    class			Optional	Any String		Provide your own unique class and override the frameworks styles
	    name			Optional	Any String		Add a unique name to the richtextedit widget; generally used in templates when used 


#### Events ####

		this.controller.listen("richtexteditId", 'blur', this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------


#### Instantiation ####

		this.controller.setupWidget("richtexteditId",
		     this.attributes = {

		     },
		     this.model = {
		         value: ""
		});

### Get Content ###
To obtain the content of the RichTextEdit field, call:

 this.controller.get('richtexteditId').innerHTML

#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------


#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------



*/

Mojo.Widget.RichTextEdit = Class.create({
		initialize: function() {},




		/**
		 * Apply styles and attributes to the widget element to make it a rich text editor
		 * and be included in automatic focus advancement.
		 * @private
		 */
		setup: function() {
			var editor = this.controller.element;
			editor.setStyle(this.RICH_TEXT_STYLES);
			Mojo.View.makeFocusable(editor);
			
			this.onFocus = this.onFocus.bindAsEventListener(this);
			this.controller.listen(this.controller.element, "focus", this.onFocus);
			this.onBlur = this.onBlur.bindAsEventListener(this);
			this.controller.listen(this.controller.element, "blur", this.onBlur);
			this.onTap = this.onTap.bindAsEventListener(this);
			this.controller.listen(this.controller.element, Mojo.Event.tap, this.onTap);
		},

		onTap: function(e) {
			e.stopPropagation();
		},
		
		/**
		 * @private
		 */
		cleanup: function() {
			this.controller.stopListening(this.controller.element, "focus", this.onFocus);
			this.controller.stopListening(this.controller.element, "blur", this.onBlur);
			this.controller.stopListening(this.controller.element, Mojo.Event.tap, this.onTap);
		},

		/**
		 * @private
		 */
		toggleBold: function() {
			this.controller.document.execCommand("bold", false, null);
		},

		/**
		 * @private
		 */
		toggleItalics: function() {
			this.controller.document.execCommand("italic", false, null);
		},

		/**
		 * @private
		 */
		toggleUnderline: function() {
			this.controller.document.execCommand("underline", false, null);
		},

		/**
		 * @private
		 */
		onFocus: function() {
			var unselect = function() {
				var sel = this.controller.window.getSelection();
				sel.collapseToStart();
			}.bind(this);

			unselect.defer();
			this.controller.scene.pushCommander(this);
			this.applyFocusClass(this.controller.element);
		},

		/**
		 * @private
		 */
		onBlur: function() {
			this.controller.scene.removeCommander(this);
			this.removeFocusClass(this.controller.element);
		},

		/**
		 * @private
		 */
		handleCommand: function(event) {
			//only called when focused/
			var cmd;

			if(event.type == Mojo.Event.command) {

				switch(event.command) {
				case Mojo.Menu.boldCmd:
					this.toggleBold();
					break;
				case Mojo.Menu.italicCmd:
					this.toggleItalics();
					break;
				case Mojo.Menu.underlineCmd:
					this.toggleUnderline();
					break;
				}

			}
		},

		/**
		 * @private
		 */
		applyFocusClass: function(target) {
			var parentTarget = Mojo.View.findParentByAttribute(target, this.controller.document, Mojo.Widget.focusAttribute);
			if (parentTarget) {
				this.focusedParentElement = parentTarget;
				Element.addClassName(parentTarget, 'focused');
			}
		},

		/**
		 * @private
		 */
		removeFocusClass: function(target) {
			if (this.focusedParentElement) {
				Element.removeClassName(this.focusedParentElement, 'focused');
				this.focusedParentElement = undefined;
			}
		},

		/**
		 * styles needed to make it a rich text editor
		 * @private
		 */
		RICH_TEXT_STYLES : {
			"-webkit-user-select": "text",
			"-webkit-user-modify": "read-write",
			"word-wrap" :" break-word",
			"cursor" : "text",
			"-webkit-line-break": "after-white-space"
		}



});

