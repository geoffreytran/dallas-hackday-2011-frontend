/**
 * @name widget_progressscreen.js
 * @fileOverview T; See {@link Mojo.Widget.ProgressScreen} for more info.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
#### Overview ####
The Progress Bar is exactly the same as the Progress Pill except that you use "x-mojo-element="ProgressBar" 
in your scene file. Otherwise, you would code it and manage just as you do the Progress Pill. 
In the default style, there isn't room for a title, or any type of images on the bar, but the properties 
are supported nonetheless.

As with the Progress Pill, this is useful to show download progress, loading from a database or just a 
long operation where you have a sense of the duration, then you can use Progress Pill as the indicator. 
The indicator is designed to show a Bar image that corresponds to the model's value property, where a 
value of 0 has no Pill exposed and a value of 1 has the Pill in a complete position. To control the 
indicator you need to initialize it's value at 0, then progressively update the model property it until 
it reaches the value of 1. The best way to do this is by using an interval timer to which you can 
respond by increasing the progress indicator's value property incrementally and calling the 
updateModel function.


#### Declaration ####

		<div x-mojo-element="ProgressBar" id="progressbarId" class="progressbarClass" name="progressbarName"></div>

		Properties		Required	Value			Description 
		---------------------------------------------------------------------------------------------------------------------------------
	    x-mojo-element	Required	ProgressBar		Declares the widget as type 'ProgressBar' 
	    id				Required	Any String		Identifies the widget element for use when instantiating or rendering
	    class			Optional	Any String		There isn't a default class for ProgressBar but you can assign one if you want apply custom styling 
	    name			Optional	Any String		Add a unique name to the progressbar widget; generally used in templates when used 


#### Events ####

		Mojo.Event.listen("progressbarId", Mojo.Event.progressIconTap, this.handleUpdate)

		Event Type					Value			Event Handling
		---------------------------------------------------------------------------------------------------------------------------------
	    Mojo.Event.progressIconTap	{model: this.controller.model}		The icon in the bar was tapped, app specific action but usually cancel operation
	    Mojo.Event.progressComplete					Progress is complete

    
#### Instantiation ####

		this.controller.setupWidget("progressbarId",
		    this.attributes = {
		        title: "Progress Bar",
		        image: "images/header-icon.png",
		        modelProperty: "progress"
		    },
		    this.model = {
		        iconPath: "../images/progress-bar-background.png",
		        progress: 0
		    });


#### Attribute Properties ####

		Attribute Property	Type			Required	Default		Description
		---------------------------------------------------------------------------------------------------------------------------------
	   	modelProperty		String			Optional	value		Widget's model property name
	    title				String			Optional	Null		Dynamic title to show on download bar
	    image				String			Optional	Null		File path relative to app folder for dynamic image to show on bar
	    icon				String			Optional	Null		CSS class for icon to display on the bar
	

 
#### Model Properties ####

		Model Property		Type			Required	Default		Description     
		---------------------------------------------------------------------------------------------------------------------------------
	    value				Integer			Required	Null		Current value of widget
	    title				String			Optional	Null		Dynamic title to show on download bar
	    image				String			Optional	Null		File path relative to app folder for dynamic image to show on bar


#### Methods ####

		Method		Arguments		Description
		---------------------------------------------------------------------------------------------------------------------------------
		reset						Reset the progress to 0
		cancelProgress				Stop progress and leave the progress pill visually where it was



@field
*/

Mojo.Widget.ProgressBar = function () {
  this.isProgressBar = true;
  Mojo.Widget.ProgressPill.apply(this);
};

Mojo.Widget.ProgressBar.prototype = Mojo.Widget.ProgressPill.prototype;


Mojo.Widget.Progress = function () {
  this.isProgress = true;
  Mojo.Widget.ProgressPill.apply(this);
};

Mojo.Widget.Progress.prototype = Mojo.Widget.ProgressPill.prototype;