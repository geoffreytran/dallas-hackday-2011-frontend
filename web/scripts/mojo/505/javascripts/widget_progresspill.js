/**
 * @name widget_progresspill.js
 * @fileOverview This file has functions related to the Progress Pill; 
 * See {@link Mojo.Widget.ProgressPill} for more info.

Copyright 2009 Palm, Inc.  All rights reserved.

*/
/**
#### Overview ####
When you need to show download progress, loading from a database or just a long operation where you 
have a sense of the duration, then you can use Progress Pill as the indicator. The indicator is 
designed to show a Pill image that corresponds to the model's value property, where a value of 0 
has no Pill exposed and a value of 1 has the Pill in a complete position. To control the indicator 
you need to initialize it's value at 0, then progressively update the model property it until it 
reaches the value of 1. The best way to do this is by using an interval timer to which you can 
respond by increasing the progress indicator's value property incrementally and calling the 
updateModel function.

#### Declaration ####

		<div x-mojo-element="ProgressPill" id="progresspillId" class="progresspillClass" name="progresspillName"></div>
		

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element	Required	ProgressPill	Declares the widget as type 'ProgressPill' 
	    id				Required	Any String		Identifies the widget element for use when instantiating or rendering
	    class			Optional	Any String		There isn't a default class for ProgressPill but you can assign one if you want apply custom styling 
	    name			Optional	Any String		Add a unique name to the progresspill widget; generally used in templates when used 


#### Events ####

		Mojo.Event.listen("progresspillId",Mojo.Event.progressIconTap, this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
	    Mojo.Event.progressIconTap	{model: this.controller.model}		The icon in the bar was tapped, app specific action but usually cancel operation
	    Mojo.Event.progressComplete					Progress is complete

#### Instantiation ####
    
		this.controller.setupWidget("progresspillId",
		    this.attributes = {
		        title: "Progress Pill",
		        image: "images/header-icon.png",
		        modelProperty: "progress"
		    },
		    this.model = {
		        iconPath: "../images/progress-bar-background.png",
		        progress: 0
		    });


#### Attribute Properties ####

		Attribute Property	Type			Required	Default			Description
		---------------------------------------------------------------------------------------------------------------------------------
	    modelProperty       String			Optional    value			Widget's model property name
		modelStartProperty  String			Optional	modelStartProperty 	Name of start value property for this widget instance
	    title               String			Required    Null     	   Dynamic title to show on download bar
		titleRight          String			Optional    Null     	   Dynamic title to show on the right side of the download bar
	    image               String			Optional    Null     	   File path relative to app folder for dynamic image to show on bar
	    icon                String			Optional    Null     	   CSS class for icon to display on the bar
	    iconPath            String			Optional    Null     	   File path relative to app folder for icon


#### Model Properties ####

		Model Property		Type			Required	Default			Description     
		---------------------------------------------------------------------------------------------------------------------------------
	    value               Integer			Required    Null			Current value of widget; if value is undefined or negative, will show 
																			in "button-mode" which gives a selected class
	    title               String			Required    Null    	    Dynamic title to show on download bar
	    titleRight          String			Optional    Null     	   Dynamic title to show on the right side of the download bar
	    image               String			Optional    Null    	    File path relative to app folder for dynamic image to show on bar
	    modelStartProperty			Integer			Optional    Null			Starting position of the progress bar


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		reset						Reset the progress to 0
		cancelProgress				Stop progress and leave the progress pill visually where it was


	
*/
Mojo.Widget.ProgressPill = Class.create({
	MODEL_START_PROPERTY: 'modelStartProperty',
	
	initialize: function() {
		
	},
	
	setup: function() {
	//require a model
	    Mojo.require(this.controller.model, "ProgressPill widget requires a model.");
		this.initializeDefaultValues();
		this.renderWidget();
		this.controller.exposeMethods(['reset', 'cancelProgress']);
		
		this.shouldCheckDisabled = (this.isProgressPill || this.controller.attributes.type === Mojo.Widget.ProgressPill.slider);
	},
	
	cleanup: function() {
		if (this.iconContent) {
			this.controller.stopListening(this.iconContent, Mojo.Event.tap, this.iconTapped);
		}
	},
	
	initializeDefaultValues: function() {
		this.divPrefix = Mojo.View.makeUniqueId() + this.controller.scene.sceneId + this.controller.element.id;
		this.progressBarMaxWidth = 500;
		this.modelProperty = this.controller.attributes.modelProperty || Mojo.Widget.defaultModelProperty;
		this.modelStartProperty = this.controller.attributes.modelStartProperty || this.MODEL_START_PROPERTY;
		if (this.isProgressBar) {
			this.widgetTemplate = Mojo.Widget.getSystemTemplatePath('/progress-bar/progress-pill');
		} else if (this.isProgress) {
			this.titleTemplate = Mojo.Widget.getSystemTemplatePath('/progress-inline/title-content');
			this.imageTemplate = Mojo.Widget.getSystemTemplatePath('/progress-inline/image-content');
			this.widgetTemplate = Mojo.Widget.getSystemTemplatePath('/progress-inline/progress-pill');
			this.iconTemplate = Mojo.Widget.getSystemTemplatePath('/progress-inline/icon-content');
		} else if (this.controller.attributes.type === Mojo.Widget.ProgressPill.slider) {
			this.titleTemplate = Mojo.Widget.getSystemTemplatePath('/progress-slider/title-content');
			this.imageTemplate = Mojo.Widget.getSystemTemplatePath('/progress-slider/image-content');
			this.widgetTemplate = Mojo.Widget.getSystemTemplatePath('/progress-slider/progress-pill');
			this.iconTemplate = Mojo.Widget.getSystemTemplatePath('/progress-slider/icon-content');
			this.disabledProperty = this.controller.attributes.disabledProperty || Mojo.Widget.defaultDisabledProperty;
			this.disabled = this.controller.model[this.disabledProperty];
		} else {
			this.isProgressPill = true;
			this.titleTemplate = Mojo.Widget.getSystemTemplatePath('/progress-pill/title-content');
			this.imageTemplate = Mojo.Widget.getSystemTemplatePath('/progress-pill/image-content');
			this.widgetTemplate = Mojo.Widget.getSystemTemplatePath('/progress-pill/progress-pill');
			this.iconTemplate = Mojo.Widget.getSystemTemplatePath('/progress-pill/icon-content');	
			
			this.disabledProperty = this.controller.attributes.disabledProperty || Mojo.Widget.defaultDisabledProperty;
			this.disabled = this.controller.model[this.disabledProperty];
		}
		
		//for tracking animations
		this.oldWidth = 0;
		this.oldLeft = 0;
	},
	
	
	renderWidget: function() {
		var titleContent, imageContent, content, widthStyle, model;
		this.title = this.controller.valueFromModelOrAttributes("title", '');

		if(this.isProgressPill) {
			if (this.isProgressPill && (!this.title || this.title.blank())) {
				Mojo.Log.warn("A title is required for correct progress pill use and layout.");	
			}		
		}
		
		this.titleRight = this.controller.valueFromModelOrAttributes("titleRight", '');
		this.image = this.controller.valueFromModelOrAttributes("image", '');
		this.icon = this.controller.model.icon || this.controller.model.iconPath;
		model = {
			divPrefix: this.divPrefix,
			title: this.title,
			image: this.image,
			icon: this.icon,
			iconPath: this.controller.model.iconPath,
			titleRight: this.titleRight
		};
		if (this.title && !this.isProgressBar) {
			titleContent = Mojo.View.render({object: model, template: this.titleTemplate});
		}
		if (this.image && !this.isProgressBar) {
			imageContent = Mojo.View.render({object: model, template: this.imageTemplate});
		}


		model.titleContent = titleContent || '';
		model.imageContent = imageContent || '';
		
		content = Mojo.View.render({object: model, template: this.widgetTemplate});
		this.controller.element.innerHTML = content;
		this.progressDiv = this.controller.get(this.divPrefix + '_progress');
		this.iconContent = this.controller.get(this.divPrefix + "_iconContent");
		if (this.iconContent) {
			this.iconTapped = this.iconTapped.bind(this);
			this.controller.listen(this.iconContent, Mojo.Event.tap, this.iconTapped);
			if (!this.icon) {
				this.iconContent.hide();
			}
		}
		this.progressPill = this.controller.get(this.divPrefix+'_downloadPill');
		
		//if the original percent is zero, we need to show an inactive background and hide the progress div
		this._updateInactiveState();
		
		this.remeasure();
		
		if (this.isProgressPill && this.controller.model[this.modelProperty] === undefined) {
			this.progressDiv.hide();
			this.progressPill.addClassName("button-mode");
		}
		
		this.imageContent = this.controller.get(this.divPrefix+'_imageContent');
		if (!this.image && this.imageContent) {
			this.imageContent.hide();
		}
		
		if (this.isProgressPill || this.controller.attributes.type === Mojo.Widget.ProgressPill.slider) {
			this._updateDisabledState();
		}
	},
	
	/** @private **/
	getSanitizedPercent: function() {
		var percent = this.controller.model[this.modelProperty];
		if (percent > 1) {
			percent = 1;
		}
		if (percent < 0) {
			percent = 0;
		}
		return percent;
	},
	
	remeasure: function(e) {
		var percent, width;
		//do important measurements here
		this.progressBarMaxWidth = this.progressPill.getDimensions().width;
		percent = this.getSanitizedPercent();
		width = percent * this.progressBarMaxWidth;
		this.setProgressBarStyles(width);
		
		//this is kind of hacky; fix this later; need a style way to line this up
		if (this.isProgressPill && this.progressDiv.visible()) {
			this.allContent = this.controller.get(this.divPrefix+'_content');
			this.allContent.style.width = this.progressDiv.clientWidth;			
		}
	},
	
	setProgressBarStyles: function(width) {
		var style = '', left, height;
		
		if (this.isProgressBar) {
			height = Mojo.View.getDimensions(this.progressDiv).height;
			style = 'clip: rect(0px, ' + width + 'px, '+height+'px, 0px)';
		} else if (this.isProgress) {
			//get the 'left'
			left = this._getStartPosition();
			width = this._correctWidth(left, width);
			style = 'width: '+width+"px";
		} else if (this.controller.attributes.type === Mojo.Widget.ProgressPill.slider) { 
			//get the 'left'
			left = this._getStartPosition();
			width = this._correctWidth(left, width);
			style = 'margin-right: '+(this.progressBarMaxWidth - width)+"px;margin-left: "+left+"px;width:auto;";
		} else {
			style = 'clip: rect(0px, ' + this.progressBarMaxWidth + 'px, 48px, ' + width + 'px)';
		}
		this.progressDiv.setStyle(style);
	},
	
	reset: function() {
		this.progressDiv.setStyle({'clip':''});
	},
	
	iconTapped: function(event) {
		Mojo.Event.send(this.controller.element, Mojo.Event.progressIconTap, {model: this.controller.model});
	},
	
	cancelProgress: function() {
		if (this.icon) {
			this.icon.hide();
		}
		this.setProgressBarStyles(this.progressBarMaxWidth);
	},
	
	
	maybeUpdateProgress: function(percent) {
		var width, style = '', left, height;
		
		//don't update progress on a disabled progress widget??
		if (this.disabled) {
			return;
		}
		
		try {
			if (percent === 1) {
				if (this.cancelButton) {
					this.cancelButton.hide();
				}
				Mojo.Event.send(this.controller.element, Mojo.Event.progressComplete);
			}
			else if (percent === 0) {
				if (this.cancelButton) {
					this.cancelButton.show();
				}
			} else {
				if (this.cancelButton) {
					this.cancelButton.show();
				}
			}

			//try to do this with an animator instead?
			width = percent * this.progressBarMaxWidth;
			
			if (this.isProgressBar) {
				height = Mojo.View.getDimensions(this.progressDiv).height;
				Mojo.Animation.animateClip(this.progressDiv, 'left', 'bezier', { from: this.oldWidth, to: width, duration: 0.2, corner: 'left', clip: {top: 0, left: this.oldWidth, bottom: height, right: 0},  /*onComplete: this.animationComplete, */ curve: this.overrideCurve || 'ease-in-out'});
				
			} else if (this.isProgress) {
				//if there is now a percent, we need to show an active background and show the progress div
				if (percent > 0) {
					this.progressDiv.show();
					this.progressPill.removeClassName("inactive");
				}
				//setup left for start value
				left = this._getStartPosition();
				
				//make sure the width + margin-left never gets above the max width
				width = this._correctWidth(left, width);

				//move in start of progress
				if (left) {
					Mojo.Animation.animateStyle(this.progressDiv, 'margin-left', 'bezier', {from: this.oldLeft, to: left, duration: 0.2, curve: 'ease-in-out'});
					this.oldLeft = left;
				}
				
				
				//animate width
				Mojo.Animation.animateStyle(this.progressDiv, 'width', 'bezier', {from: this.oldWidth, to: width, duration: 0.2, curve: 'ease-in-out'});
				

			} else if (this.controller.attributes.type === Mojo.Widget.ProgressPill.slider) {
				//setup left for start value
				left = this._getStartPosition() || 0;


				//move in start of progress
				if (left) {
					Mojo.Animation.animateStyle(this.progressDiv, 'margin-left', 'bezier', {from: this.oldLeft, to: left, duration: 0.2, curve: 'ease-in-out'});
					this.oldLeft = left;
				} 
				width = this.progressBarMaxWidth - width;
					
				Mojo.Animation.animateStyle(this.progressDiv, 'margin-right', 'bezier', {from: this.oldWidth, to: width, duration: 0.2, curve: 'ease-in-out'});

			} else { //progress pill
				if (percent >= 0) {
					if (!this.progressDiv.visible()) {
						this.progressDiv.show();
						this.progressPill.removeClassName("button-mode");
					}
					Mojo.Animation.animateClip(this.progressDiv, 'right', 'bezier', {from: this.oldWidth, to: width, duration: 0.2, corner: 'right', clip: {top: 0, left: this.progressBarMaxWidth, bottom: 48, right: this.oldWidth},  /*onComplete: this.animationComplete, */ curve: this.overrideCurve || 'ease-in-out'});
				} else {
					this.progressDiv.hide();
					this.progressPill.addClassName("button-mode");
				}
			}
			
			this.oldWidth = width;
		}
		catch (e) {
			Mojo.Log.logException(e, "_setProgressDiv");
		}
	},

	_getStartPosition: function() {
		var left = this.controller.model[this.modelStartProperty] || 0;
		left = left * this.progressBarMaxWidth;
		return left;
	},
	
	_correctWidth: function(left, width) {
		if ((left + width) > this.progressBarMaxWidth) {
			width = this.progressBarMaxWidth - left;
		}
		if (width > this.progressBarMaxWidth) {
			width = this.progressBarMaxWidth;
		}
		return width;
	},
	
	handleModelChanged: function() {

		var newDisabled = this.disabled;
		if (this.shouldCheckDisabled && this.disabled != !!(this.controller.model[this.disabledProperty])) {
			newDisabled = !!(this.controller.model[this.disabledProperty]);
			this.disabled = false;
		}


		//ADIL SAYS: redraw display on model changed
		//re-read the attributes to update the text over the button
		//re-render the title and possibly the image
		this.maybeReRenderWidget();
		this.maybeUpdateProgress(this.getSanitizedPercent());
		
		
		this.disabled = newDisabled;
		this._updateDisabledState();
	},
	
	maybeReRenderWidget: function() {
		var titleContent = '', imageContent = '', iconContent = "";
		var model;
		var newTitle, newImage, newIcon, newTitleRight;
		
		
		newTitle = this.controller.valueFromModelOrAttributes("title");
		newTitleRight = this.controller.valueFromModelOrAttributes("titleRight", "");
		newImage = this.controller.valueFromModelOrAttributes("image");
		newIcon = this.controller.model.icon || this.controller.model.iconPath;
		
		model = {
			divPrefix: this.divPrefix,
			title: newTitle,
			image: newImage,
			icon: newIcon,
			iconPath: this.controller.model.iconPath,
			titleRight: newTitleRight
		};
		
		if (this.titleTemplate && this.title !== newTitle) {
			if (this.isProgressPill && (!newTitle || newTitle.blank())) {
				Mojo.Log.warn("A title is required for correct progress pill use and layout.");	
			}		
			
			this.title = newTitle;
			titleContent = Mojo.View.render({object: model, template: this.titleTemplate});
			this.controller.get(this.divPrefix+'_titleContent').innerHTML = titleContent;
		}
		if (this.titleRight !== newTitleRight) {
			this.titleRight = newTitleRight;
			this.controller.get(this.divPrefix+'_titleRightContent').innerHTML = this.titleRight;
		}
		if (this.imageTemplate && this.image !== newImage && this.imageContent) {
			this.image = newImage;
			imageContent = Mojo.View.render({object: model, template: this.imageTemplate});
			this.imageContent.innerHTML = imageContent;
			if (!this.image) {
				this.imageContent.hide();
			} else {
				this.imageContent.show();
			}
		}
		if (this.icon !== newIcon) {
			this.iconContent.removeClassName(this.icon);
			this.iconContent.addClassName(newIcon);
			this.icon = newIcon;
			if (this.icon) {
				this.iconContent.show();
			} else {
				this.iconContent.hide();
			}
		}
				
		this._updateInactiveState();

	},
	
	
	_updateInactiveState: function() {
		if (this.isProgress && this.controller.model[this.modelProperty] === 0) {
			this.progressDiv.hide();
			this.progressPill.addClassName("inactive");
		}
	},
	
	_updateDisabledState: function() {
		if(this.disabled) {
			this.progressPill.addClassName("disabled");
		} else {
			this.progressPill.removeClassName("disabled");
		}
	}

});

Mojo.Widget.ProgressPill.slider = "slider";