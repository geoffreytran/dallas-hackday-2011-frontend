/**
 * @name view.js
 * @fileOverview This file has functions related to documenting the Mojo View functionality.
 * Copyright 2009 Palm, Inc.  All rights reserved.
 */

/*globals Mojo $A palmGetResource console Form */

/**
@namespace Holds View related functionality to the Mojo Framework.
@description
All User Interface (UI) layout files are located in the views folder of your application. 
Much of the user interface in Mojo is assembled out of text files containing fragments of 
HTML and special tags indicating locations to insert dynamic data.

A scene assistant has one main HTML view file, which provides the static structure and content 
of its presentation page. It also includes  zero or more HTML template view files that may be 
used to display dynamic data, such as JavaScript object properties from a scene assistant. 

Developers can use templates directly by calling Mojo.View.render, but more often they will pass names of
templates as part of widget setup or use them implicitly in scene creation.

 */
Mojo.View = {};

// By default, escape HTML in templates.
Mojo.View.escapeHTMLInTemplates = true;


Mojo.View.templates = {};

/**
Use a partial and **one** or more objects to create HTML markup.

The first example shows how we would bind a single object to a template:

		var content = Mojo.View.render({object: contact, template: 'detail/header'})
		headerElement.innerHTML = content;
	
This shows how we render a list of objects with a template and a separator:

		var content = Mojo.View.render({collection: songs, template: 'list/song', separator: 'list/separator''})
		listElement.innerHTML = content;

@param renderParams is a hash which may contain the following values property names and values:<p>
			[object]		the object to use to resolve property references in the template.<p>
			[collection]	a list of objects to bind individually to a template in order to create a list.<p>
			[attributes]	an extra object which is additionally used to resolve property references in templates, 
							when the property does not exist in 'object' or the appropriate 'collection' element.<p>
			[formatters]	A hash of property names to formatter functions which should be applied prior to rendering.  See Mojo.Model.format().<p>
	 		[template]		the partial  or full path to the template.<p>
	 		[separator] 	when rendering a collection, a template to use as a separator between individual list elements.<p>
		
 
*/
Mojo.View.render = function render(renderParams)
{
	Mojo.Timing.resume("scene#render");
	var allText = "";
	var collection = renderParams.collection;
	var attributes = renderParams.attributes;
	var formatters = renderParams.formatters;
	var object;
	if (collection) {
		var separator = renderParams.separator;
		for (var i=0, l = collection.length, lastIndex = l - 1; i < l; i++) {
			
			if(collection[i] !== null)
			{
				// Combine attributes with the collection object for this item,
				// And then apply formatters if we have any.
				object = Mojo.Model.format(collection[i], formatters, attributes);
			
				if (l == 1) {
					object.currentElementClass = 'single';
				} else {
					if (i === 0) {
						object.currentElementClass = 'first';
					} else if (i == lastIndex) {
						object.currentElementClass = 'last';
					}
				}
				var s = Mojo.View._doRender(object, renderParams);
				allText += s;
				if (separator && i != lastIndex) {
					allText += Mojo.View._renderNamedTemplate(Mojo.View._calculateTemplateFileName(renderParams.separator, object), object);
				}
			}
		}
	} else {
		object = renderParams.object || {};
		if(attributes || formatters) {
			object = Mojo.Model.format(object, formatters, attributes);
		}
		allText = Mojo.View._doRender(object, renderParams);
	}
	Mojo.Timing.pause("scene#render");
	return allText;
};

/**
 * @deprecated Observe the Mojo.Event family of events, or use 
 * Mojo.View.applySelectionAttribute for highlighting
 */
/**
 * @private
 */
Mojo.View.applyGesture = function(viewOrViews, gesture) {
	Mojo.log("WARNING: Mojo.Gesture.Select has been deprecated. Observe the Mojo.Event family of events, or use Mojo.View.applySelectionAttribute for highlighting.");
};

/**
 * @private
 * Use this for highlighting
 * @param {Object} viewOrViews describe
 * @param {Object} selectionMode describe
 */
Mojo.View.applySelectionAttribute = function applySelectionAttribute(viewOrViews, selectionMode, optionalWindow) {
	var targetWindow;
	if (Object.isArray(viewOrViews)) {
		viewOrViews.each(function(view) { Mojo.View.applySelectionAttribute(view, selectionMode); });
		return;
	}
	targetWindow = optionalWindow || window;
	var targetDocument = targetWindow.document;
	targetDocument.getElementById(viewOrViews).setAttribute(Mojo.Gesture.selectionHighlightAttribute, selectionMode);
};


/** @private */
Mojo.View.toString = function() { return "[Object Mojo.View]"; };


/**
 * Given a DOM element and a target object, hide the element if the value of any
 * of the named properties are undefined or have a false value in the target.
 * @param {Object} element DOM element to hide
 * @param {Object} target object to check for property definitions
 * @param {Object} one or more property names
 */
Mojo.View.requiresProperties = function() {
	var element = arguments[0];
	var target = arguments[1];
	if (element && target) {
		for(var i = 2; i < arguments.length; ++i) {
			var prop = arguments[i];
			if (!target[prop]) {
				element.hide();
				return;
			}
		}
	} 
};

/** @private */
Mojo.View.applyListStylesToChildren = function applyListStylesToChildren(parentElement, firstChildIndex, totalElements, callback) {
	var index = 0;
	var offset = firstChildIndex;
	var lastIndex = totalElements - 1;
	parentElement.childElements().each(function(element) {
		element.addClassName('row');
		if (offset === 0) {
			element.addClassName('first');
		}
		if (offset == lastIndex) {
			element.addClassName('last');
		}
		if (callback) {
			callback(element, index);
		}
		index+=1;
		offset+=1;
	});
};


/**
 * Converts the given HTML content into nodes, and returns the first element node at the top level of the content. 
 * @param {Object} htmlContent
 */
Mojo.View.convertToNode = function convertToNode(htmlContent, targetDocument) {
	Mojo.requireDefined(targetDocument, "Mojo.View.convertToNode now requires a target document");
	var renderingDiv = targetDocument._renderingDiv;
	renderingDiv.innerHTML = htmlContent;
	var node = renderingDiv.firstChild;
	while(node.nodeType != node.ELEMENT_NODE) {
		node = node.nextSibling;
	}
	renderingDiv.removeChild(node);
	return node;
};

/**
	Returns a nodelist resulting from converting the given html content into nodes.
	A shared rendering div is used for t his conversion, so the caller should not 
	keep a reference to the nodelist, and needs to remove the nodes from their parent (the shared div). 
 * @param {Object} htmlContent the html content to convert
 */
Mojo.View.convertToNodeList = function(htmlContent, targetDocument) {
	Mojo.requireDefined(targetDocument, "Mojo.View.convertToNodeList now requires a target document");
	targetDocument._renderingDiv.innerHTML = htmlContent;
	return targetDocument._renderingDiv.childNodes;
};

/** @private */
Mojo.View.convertToDocFragment = function(htmlContent, targetDocument) {
	Mojo.requireDefined(targetDocument, "Mojo.View.convertToDocFragment now requires a target document");
	targetDocument._renderingDocFrag.innerHTML = htmlContent;
	return targetDocument._renderingDocFrag;
};

/** @private */
Mojo.View.wrapMultipleNodes = function wrapMultipleNodes(nodeList, targetDocument, forceWrap) {
	var node, i, nodeCount, nodeType, lastNode, wrapperNode;
	var nodesLength = nodeList.length;
	nodeList = $A(nodeList);
	
	if(!forceWrap) {
		nodeCount = 0;
		for (i=0; i < nodesLength; i++) {
			node = nodeList[i];
			nodeType = node.nodeType;
			if(nodeType === node.ELEMENT_NODE || nodeType === node.TEXT_NODE) {
				lastNode = node;
				nodeCount += 1;
			}
		}
		if (nodeCount === 1) {
			return lastNode;
		}
	}
	
	wrapperNode = targetDocument.createElement('div');
	for (i=0; i < nodesLength; i++) {
		node = nodeList[i];
		wrapperNode.appendChild(node);
	}
	return wrapperNode;
};

/**
 * @private
 */
Mojo.View.setup = function() {
	Mojo.View.addTemplateLocation(Mojo.Widget.sysTemplatePath, Mojo.Locale.frameworkResourcePath, "views");
};

/**
 * @private
 */
Mojo.View.childSetup = function(targetDocument) {
	targetDocument._renderingDiv = targetDocument.createElement('div');
	targetDocument._renderingDocFrag = targetDocument.createDocumentFragment();	
};

/**
 * Returns a list of DOM elements that are considered focusable.
 * @param {Element} containingElement Defines the subtree of the DOM to search for focusable elements. The element itself is not included in the search.
 * @returns Describe what it returns
 * @type String|Object|Array|Boolean|Number
 */
Mojo.View.getFocusableList = function(containingElement) {
	Mojo.requireElement(containingElement, "Mojo.View.getFocusableList requires a containing element.");
	var focusableElements = [];
	var potentials = containingElement.querySelectorAll('input[type=text],input[type=password],textarea,*[tabindex]');
	var potentialsLength = potentials.length;
	for (var i = 0; i < potentialsLength; i++){
		var potentialElement = potentials[i];
		if (Mojo.View.visible(potentialElement)) {
			focusableElements.push(potentialElement);
		}
	}
    return focusableElements;
};

/**
 * Returns the currently focused element inside the passed in container, or 
 * null if there is no such element.
 * @param {Element} containingElement Element to search
 */
Mojo.View.getFocusedElement = function(containingElement) {
	Mojo.requireElement(containingElement, "Mojo.View.getFocusedElement requires a containing element.");
    return containingElement.querySelector('*:focus');	    
};

/**
 * Advances the current text focus to the next focusable element in the containing
 * element, or sets it to the first focusable element in the container if nothing in
 * the container is currently focused.
 * @param {Element} containingElement Element in which to advance focus
 */
Mojo.View.advanceFocus = function advanceFocus(containingElement, optionalSelection) {
	Mojo.requireElement(containingElement, "Mojo.View.advanceFocus requires a containing element.");
	var selection = optionalSelection || Mojo.View.getFocusedElement(containingElement);
	var selectable = Mojo.View.getFocusableList(containingElement);
	if (selectable.length === 0) {
		return;
	}
	var selectableCount = selectable.length;
	if (selection) {
		for (var i=0; selection && i < selectableCount; i++) {
			var oneSelectable = selectable[i];
			if (oneSelectable === selection) {
				break;
			}
		}
		i += 1;			
	} else {
		i = 0;
	}
	if (i >= selectableCount) {
		i = 0;
	}
	var newSelection = selectable[i];
	if (newSelection.mojo && newSelection.mojo.focus) {
		newSelection.mojo.focus();
	} else if (newSelection.parentNode.mojo && newSelection.parentNode.mojo.focus) {
		newSelection.parentNode.mojo.focus();
	} else {
		newSelection.focus();					
	}
};

/**@private**/
Mojo.View.clearTouchFeedback = function(root) {
	if (root) {
		Mojo.View.removeTouchFeedback(root.querySelector('.'+Mojo.Gesture.kSelectedClassName));
	}
};

/**
 * Adds touch feedback to a new element and always removes touch feedback from the existing highlighted element
 * @param {Element} targetElement Element to which to add feedback
 */
Mojo.View.addTouchFeedback = function(target) {
	if (target) {
		Mojo.View.clearTouchFeedback(target.ownerDocument.body);
		target.addClassName(Mojo.Gesture.kSelectedClassName);
	}
};

/**
 * Removes touch feedback from an element
 * @param {Element} targetElement Element from which to remove touch feedback
 */
Mojo.View.removeTouchFeedback = function(target) {
	if (target) {
		target.removeClassName(Mojo.Gesture.kSelectedClassName);
	}
};

/**
 * Marks an element as being one that can be focused. Currently implemented by
 * adding a tabindex attribute of value "0".
 * @param {Element} targetElement Element to make focusable
 */
Mojo.View.makeFocusable = function(targetElement) {
	Mojo.requireElement(targetElement, "Mojo.View.makeFocusable requires an element.");
	targetElement.setAttribute("tabindex", "0");
};

/**
 * Marks an element as being one that can not be focused. Currently implemented by
 * removing the tab index value
 * @param {Element} targetElement Element to make not focusable
 */
Mojo.View.makeNotFocusable = function(targetElement) {
	Mojo.requireElement(targetElement, "Mojo.View.makeNotFocusable requires an element.");
	targetElement.removeAttribute("tabindex");
};

Mojo.View._templateLocations = [];

/**
 * Adds a pair of locations to be used for loading localized templates. If a template is
 * specified by full path and the base path is a prefix of the full path, the localized
 * path for the correct locale will be searched first for the template.
 * @param {String} basePath Path containing templates
 * @param {String} localizedPath Path containing a localized resources
 * @param {String} viewFolderName Name of the folder inside the resources folder that contains the views.
 */
Mojo.View.addTemplateLocation = function addTemplateLocation(basePath, localizedPath, viewFolderName) {
	function assureEndsWithSlash (path) {
		if (path.endsWith("/")) {
			return path;
		}
		return path + "/";
	}
	var currentLocale = Mojo.Locale.current;
	localizedPath = assureEndsWithSlash(localizedPath);
	var newLocation = {
		basePath: assureEndsWithSlash(basePath),
		localizedPath: localizedPath,
		viewFolderName: viewFolderName,
		currentLocalePath: localizedPath + currentLocale + "/" + viewFolderName + "/",
		currentLanguagePath: localizedPath + Mojo.Locale.language + "/" + viewFolderName + "/",
		currentRegionPath: localizedPath + Mojo.Locale.language + "/" + Mojo.Locale.region + "/" + viewFolderName + "/"
	};
	Mojo.View._templateLocations.push(newLocation);
};

// Private methods 

// Currently based on the assumption that template names will be something like
// Might be better to make these anonymous functions inside loadTemplate()?
// Also, don't like this mixing of underscores and dashes...

/** @private */
Mojo.View._loadTemplateFromBase = function _loadTemplateFromBase(baseOfTemplates, templateBaseName, suppressWarning) {
	var templatePath = templateBaseName;
	if (!templateBaseName.startsWith("/")) {
		templatePath = baseOfTemplates + templateBaseName;
	}
	return palmGetResource(templatePath, suppressWarning);
};

/** @private */
Mojo.View._loadTemplate = function _loadTemplate(templateFullName) {
	var foundTemplate = false, templateLocation;
	if (!Mojo.View._appPath) {
		Mojo.View._appPath = Mojo.appPath + "/app/views/";    
	}
	var templateBaseName, templatePath, templateLocalePath, templateLanguagePath, templateRegionPath;
	var locations = Mojo.View._templateLocations;
	var locationsCount = locations.length;
	for (var i=0; i < locationsCount; i++) {
		templateLocation = locations[i];
		templatePath = templateLocation.basePath;
		if (templateFullName.startsWith(templatePath)) {
			templateBaseName = templateFullName.gsub(templatePath, "");
			templateLocalePath = templateLocation.currentLocalePath;
			templateLanguagePath = templateLocation.currentLanguagePath;
			templateRegionPath = templateLocation.currentRegionPath;
			foundTemplate = true;
			break;
		}
	}
	if (!foundTemplate) {
		templateBaseName = templateFullName;
		templatePath = Mojo.View._appPath;
		templateLocalePath = Mojo.Locale.appTemplatePath;
		templateLanguagePath = Mojo.Locale.appLanguageTemplatePath;
		templateRegionPath = Mojo.Locale.appRegionTemplatePath;
	}
	var templateText =
		(templateLocalePath && Mojo.View._loadTemplateFromBase(templateLocalePath, templateBaseName, true)) ||
		(templateRegionPath && Mojo.View._loadTemplateFromBase(templateRegionPath,  templateBaseName, true)) ||
		(templateLanguagePath && Mojo.View._loadTemplateFromBase(templateLanguagePath, templateBaseName, true)) ||
		Mojo.View._loadTemplateFromBase(templatePath, templateBaseName);

	return templateText;
};

/** @private */
Mojo.View._renderNamedTemplate = function _renderNamedTemplate(templateName, object) {
	var template;
	var loadedTemplateText;
	
	template = Mojo.View.templates[templateName];
	if (!template) {
		loadedTemplateText = Mojo.View._loadTemplate(templateName);
		if (loadedTemplateText === null || loadedTemplateText === undefined) {
			return "template load failed: " + templateName;
		}
		//loadedTemplateText = "<!-- " + templateName + " -->\n" + loadedTemplateText;
		template = new Mojo.View.Template(loadedTemplateText, templateName, Mojo.View.escapeHTMLInTemplates);
		Mojo.View.templates[templateName] = template;
	}
	return template.evaluate(object);
};

/** @private */
function extractTargetObject(template, object) {
	if (object.object) {
		return object.object;
	}
	return object;
}

/** @private */
function maybeWrapInDiv (markupText, renderParams) {
	if (renderParams.wrapInDiv) {
		return "<div>" + markupText + "</div>";
	}
	return markupText;
}

/** @private */
Mojo.View._doRender =function _doRender(object, renderParams) {
	var template = null;
	var loadedTemplateText = renderParams.inline;
	var targetObject;
	if (loadedTemplateText) {
		template = new Mojo.View.Template(loadedTemplateText, "<inline>", Mojo.View.escapeHTMLInTemplates);
		return maybeWrapInDiv(template.evaluate(object), renderParams);
	}
	targetObject = extractTargetObject(renderParams.template, object);
	return maybeWrapInDiv(Mojo.View._renderNamedTemplate(Mojo.View._calculateTemplateFileName(renderParams.template, object), targetObject, renderParams.useNew), renderParams);
};

/** @private */
Mojo.View._generateFilename = function(baseName, fileType) {
	var fileTypeCompare = function(s) { return s == fileType; };
	if (this.FILETYPES.find(fileTypeCompare)) {
		if (this._isMojoComponent(baseName)) {
			return console.info(Mojo.Config[fileType.toUpperCase() + "_PREFIX"] + "-"  + baseName + "_" + Mojo.Version.use + 
				Mojo.Config.HTML_EXT);
		} else {
			return console.info(Mojo.Config[fileType.toUpperCase() + "_PREFIX"] + "-" + baseName + Mojo.Config.HTML_EXT);
		}
	} else { 
		throw new Error("Filetype not recognized. Must be one of: " + this.FILETYPES.join(", ") );
	}
};

/** @private */
Mojo.View._calculateTemplateFullPath = function(templateName, currentControllerName) {
	if (templateName.startsWith("/")) {
		return templateName;
	}
	
	if(Object.isUndefined(currentControllerName) || templateName.include("/")) {
		return templateName;
	}
	
	return currentControllerName + "/" + templateName;
};

/** @private */
Mojo.View._isMojoComponent = function(templateBaseName) {
	return Mojo.MOJO_PREFIX_PATTERN.test(templateBaseName);
};

/** @private */
Mojo.View._calculateTemplateFileName = function(templateName, object) {
	if (Object.isString(templateName)) {
		return Mojo.View._calculateTemplateFullPath(templateName) + ".html";
	}
	
	var propName = templateName.templateSelector;
	var propValue = object[propName];
	var selectedName = templateName.templates[propValue];
	return Mojo.View._calculateTemplateFullPath(selectedName) + ".html";
};

/** @private */
Mojo.View.getBorderWidth = function getBorderWidth(element, border) {
	var width = 0;
	var styleName = "border-" + border + "-width";
	var theStyle = element.getStyle(styleName);
	if (theStyle) {
		width = parseInt(theStyle, 10);
		if (!width) {
			width = 0;
		}
	}
	return width;
};

/** @private */
Mojo.View.getViewportDimensions = function(targetDocument) {
	return {width: targetDocument.defaultView.innerWidth, height: targetDocument.defaultView.innerHeight};
};

/** @private */
Mojo.View.getParentWithAttribute = function getParentWithAttribute(targetElement, attributeName, attributeValue) {
	return Mojo.View.findParentByAttribute(targetElement, document, attributeName, attributeValue);
};


/**
 * @function findParent
 * @description Generic function that searches from 'child' up the DOM looking for a node for which testFunc returns true.
 * Returns the deepest ancestor that matches the test, or undefined if none is found.
 * Additional arguments passed to findParent() are passed on to the testFunc.
 *  
 * @param testFunc is the function to be used to test the nodes.
 * @param child is the node to begin searching.
 * @param searchRoot is the optional node at which to stop searching (and is not included in the test).
 * 
 */
/** @private */
Mojo.View.findParent = function(testFunc, child, searchRoot) {
	var node = child;
	var args = $A(arguments);
	args.splice(0,2); // drop 1st 2 elements from our copy of our arguments.
	
	// Note: This could be modified to stop searching when we encounter an optional container/root node.
	while(node && node !== searchRoot)
	{
		args[0] = node;
		if(testFunc.apply(undefined, args)) {
			return node;
		}
		node = node.parentNode;
	}
	
	return undefined;
};

/** @private 
 * @function findParentByAttribute
 * @description Searches from 'child' up the DOM looking for a node with the given attribute.
 * The search is halted at 'root', and 'root' itself is not included (it won't ever be returned).
 * Returns the deepest ancestor with the given attribute, or undefined if none is found.
 *  
 * @param child is the node to begin searching.
 * @param searchRoot is the (optional) node at which to stop searching (and is not included in the test).
 * @param attr is the name of the attribute to search for.
 * @param value is the (optional) attribute value for which to cease searching.
 * 
 * USAGE: Mojo.View.findParentByAttribute(child, searchRoot, attr, value);
 */
Mojo.View.findParentByAttribute = Mojo.View.findParent.curry(function(node, attr, value) {
	return node.hasAttribute && node.hasAttribute(attr) && 
		(value === undefined || node.getAttribute(attr) === value);
});


/**
 * @function findParentByProperty
 * @description Searches from 'child' up the DOM looking for a node with the given property.
 *  
 * @param child is the node to begin searching.
 * @param searchRoot is the (optional) node at which to stop searching (and is not included in the test).
 * @param propName is the name of the attribute to search for.
 * @param value is the (optional) attribute value for which to cease searching.
 * 
 */
/** @private */
Mojo.View.findParentByProperty = Mojo.View.findParent.curry(function(node, propName) {
	return (node[propName] !== undefined);
});



/**
 * @function getScrollerForElement
 * @description Searches from targetElement up the DOM looking for a Scroller widget that contains the targetElement.
 *  
 * @param targetElement is the element to get the scroller for.
 * 
 */
Mojo.View.getScrollerForElement = function getScrollerForElement (targetElement) {
	return Mojo.View.getParentWithAttribute(targetElement, "x-mojo-element", "Scroller");
};

/** @private */
Mojo.View.getUsableDimensions = function getUsableDimensions(element, avoidPrototype) {
	var getBorderWidth = Mojo.View.getBorderWidth;
	var dimensions;
	if (avoidPrototype) {
		dimensions = Mojo.View.getDimensions(element);
	} else {
		dimensions = element.getDimensions();
	}
	dimensions.width -= getBorderWidth(element, "left");
	dimensions.width -= getBorderWidth(element, "right");
	dimensions.height -= getBorderWidth(element, "top");
	dimensions.height -= getBorderWidth(element, "bottom");
	return dimensions;	
};

/**
 * Returns true of the element and all of its ancestory are visible.
 * @param {Object|} element element to check for visibility
 * @type Boolean
 */
Mojo.View.visible = function visible (element) {
	if (!element.visible()) {
		return false;
	}

	var ancestors = element.ancestors();
	var ancestorsLength = ancestors.length;
	for (var i=0; i < ancestorsLength; i++) {
		var e = ancestors[i];
		if (!e.visible()) {
			return false;
		}
	}
	
	return true;
};


/** @private */
Mojo.View.nyiMessages = [
"It is with a feeling of regret almost reaching remorse that I must tell you that this feature is not yet implemented.",
"Life is full of small disappointments. The fact that this feature isn't implemented yet is among them.",
"Although this feature isn't implemented yet, you have to admit that the button is very pretty.",
"I feel obliged to mention that the piece of hardware in your hand cannot be blamed for the fact that this feature is not yet implemented.",
"I was afraid you'd want to do that. Sadly, it's not working yet."
];


/** @private */
Mojo.View.makeUniqueId = function(optionalWindow) {
	var targetWindow = optionalWindow || window;
	var targetDocument = targetWindow.document;
	var id;
	var func = arguments.callee;
	if (typeof func.counter == 'undefined') { 
		func.counter = 0; 
	}
   
    do { id = 'palm_anon_element_' + func.counter++; } while (targetDocument.getElementById(id) !== null);
    return id;
};

/** @private */
Mojo.View.isTextField = function(element) {
	var tagName = element.tagName.toUpperCase();
	if (tagName === "OBJECT") {
		return false;
	}
	if(element.getStyle("-webkit-user-modify") === "read-write") {
		return true;
	}
	if (tagName === "INPUT") {
		var tagType = element.type.toUpperCase();
		return (tagType == "TEXT" || tagType === "PASSWORD");
	}
	return (tagName === "TEXTAREA");
};

/** @private */
Mojo.View.isRichTextField = function(element) {
	return (element.getAttribute('x-mojo-element') === "RichTextEdit");

};

/**
@private
The checkbox, toggle, textfield, passwordfield and radiobutton widgets have associated 
values that also allow the user to specify a name of a hidden input field to keep 
the value in. 

This is really useful when setting up a form with many widgets where 
the application would want to read all the updated info and forward it 
to a service. The application can get it all by using:

        Mojo.View.serializeMojo (form, options)

This works just like the prototype Form.serialize function, except that if there is an array,
designated by $A in the name of the property, this method will ALWAYS convert the value of 
the property to an array. That is, if it has 1 value, it will be:

        {
        to$A: ['BOB']
        }

if > 1:

        {
        to$A: ['BOB', 'STEVE','RICK]
        }

@param {string} form   ???
@param {??} options	???

*/
Mojo.View.serializeMojo = function(form, options) {
	return Mojo.View.serializeMojoElements(Form.getElements(form), options);
};
	
Mojo.View.serializeMojoElements = function(elements, options) {
	if (typeof options != 'object') {
		options = { hash: !!options };
	} else if (Object.isUndefined(options.hash)) {
		options.hash = true;
	}
	var isArray, key, value, submitted = false, submit = options.submit, mojoFormat = null;

	var data = elements.inject({ }, function(result, element) {
		if (!element.disabled && element.name) {
			key = element.name; value = element.value;mojoFormat = element.getAttribute('x-mojo-format');
			if (key) {
				isArray = (key.substring(key.length-2, key.length) == '$A');
			}
			//set the value to the evalJSON value
			if(mojoFormat == 'json') {
				value = value.evalJSON();
			}

			if (value !== null && (element.type != 'submit' || (!submitted &&
				submit !== false && (!submit || key == submit) && (submitted = true)))) {
					if (isArray) {
						// a key is already present; construct an array of values
						if (!Object.isArray(result[key]) && isArray) {
							result[key] = [];
						}
						result[key].push(value);
					} else if (key in result) {
						console.log("WARNING: There are multiple results for element with name "+ key + " but it is not specified as an array by including $A at the end of the element name. The last value found will replace all previous values.");
						result[key] = value;
					}
					else {
						result[key] = value;
					}
				}
			}
			return result;
		});

		return options.hash ? data : Object.toQueryString(data);
};

Mojo.View.Template = function Template(templateString, templatePath, escape) {
	this.templatePath = templatePath;
	this.escape = escape;
	this.data = this._compileTemplate(templateString);
};

Mojo.View.Template.prototype._escaper = function _escaper(val) {
	var renderingDiv, escapedValue;
	
	// Escape '<' and '&' to prevent raw HTML
	// Escape '\r' and '\n' so newlines are translated to <br> tags
	var escapeRegex = /[<&\r\n]/;

	// toString() is needed to perform deferred translation in case
	// this is a "$LL object" instead of a string
	val = val.toString();

	if (val.match(escapeRegex)) {
		renderingDiv = document._renderingDiv;
		renderingDiv.innerText = val;
		escapedValue = renderingDiv.innerHTML;
		val = escapedValue;
	}

	return val;
};
 
Mojo.View.Template.prototype._compileTemplate = function _compileTemplate(text) {
    // "tokenize" the string using split() with capturing brackets in the
    // expression.
    var tokens = text.split(/(\\*#\{-?[\w.]+\})/g);
    var nTokens = tokens.length;

    var getValue_plaintext = function() {
        var val = this._value;
        if (val === undefined || val === null) {
            val = "";
        }

        return val;
    };

    var getValue_multiLevel = function(data) {
        var nNames = this._nameArray.length;
        var val = data;
        for (var j=0; val !== undefined && j < nNames; ++j) {
            var curName = this._nameArray[j];
            val = val[curName];
        }

        if (val === undefined || val === null) {
            val = "";
        }

        if (this._escape !== undefined) {
            val = this._escape(val);
        }

        return val;
    };

    var getValue_singleLevel = function(data) {
        var val = data[this._propName];

        if (val === undefined || val === null) {
            val = "";
        }

        if (this._escape !== undefined) {
            val = this._escape(val);
        }

        return val;
    };

    // General strategy: turn each token into an object with a method
    // getValue(data) that knows how to return the correct value as a string, given
    // some data source.  Plaintext tokens will simply return the text;
    // replacement tokens look in the data source to find the right value.
    for (var i = 0; i < nTokens; ++i) {
        var token = tokens[i];
        var idx = token.indexOf("#{");
        if (idx == 1 && token.charAt(0) == '\\') {
            tokens[i] = {
                _value: token.slice(1),
                getValue: getValue_plaintext
            };
        }
        else if (idx === 0) {
            var escape = this.escape;
            var propName = token.slice(2, -1);

            if (propName.charAt(0) == '-') {
                escape = false;
                propName = propName.slice(1);
            }

            if (propName.indexOf(".") !== -1) {
                propName = propName.split(".");
                tokens[i] = {
                    _nameArray: propName,
                    _escape: (escape ? this._escaper : undefined),
                    getValue: getValue_multiLevel
                };
            }
            else {
                tokens[i] = {
                    _propName: propName,
                    _escape: (escape ? this._escaper : undefined),
                    getValue: getValue_singleLevel
                };
            }
        }
        else {
            // It didn't have a recognizable replacement cookie in it, so treat
            // it as plain text.
            tokens[i] = {
                _value: token,
                getValue: getValue_plaintext
            };
        }
    }

    return tokens;
};
 
Mojo.View.Template.prototype.evaluate = function evaluate(propertiesSource) {
    var txt = "";

    var template = this.data;
    var len = template.length;
    for (var i=0; i < len; ++i) {
        var t = template[i];
        txt += t.getValue(propertiesSource);
    }

    return txt;
};

/*Safe way to get dimensions of an element. Prototype version appears broken*/
Mojo.View.getDimensions = function(element) {
	return {width: element.offsetWidth, height: element.offsetHeight};
};

/* 
 * Wrapper for getting the position of the cursor. Returns an object of the format:
 * {x, y, width, height}
 */
Mojo.View.getCursorPosition = function(optionalWindow) {
	var targetWindow = optionalWindow || window;
	if (Mojo.Host.current === Mojo.Host.browser) {
		return undefined;
	} else {
		return targetWindow.caretRect();	
	}
};

/** @private 
	Creates a scrim element, which eats mouseup & mousedown events, and optionally calls an onMouseDown handler.
	Options: {
		onMouseDown: function to call on a mousedown on the scrim.
		scrimClass: string.  Adds an additional class to the scrim element.
	}
*/
Mojo.View.createScrim = function(targetDocument, options) {
	var scrim = Mojo.View.convertToNode("<div class='palm-scrim'></div>", targetDocument);
	
	if(options && options.scrimClass) {
		scrim.addClassName(options.scrimClass);
	}
	
	Mojo.listen(scrim, 'mousedown', function(ev) {
			ev.stop();
			if(options && options.onMouseDown) {
				options.onMouseDown(ev);
			}
		});
	
	return scrim;
};

/** @private 
	Returns the position of the given element relative to the viewport.
	This is a replacement for the Prototype method of the same name.
	The Prototype implementation leaves out the border width of positioned ancestors, and 
	improperly includes positions of nodes above a fixed position ancestor.
*/
Mojo.View.viewportOffset = function(element) {
	var curElement = element;
	var top=0, left=0;
	var fixedParent;
	var ownerDocument = element.ownerDocument;
	
	// Add up offsetTop & offsetLeft of positioned ancestors to the root of the DOM.
	while(curElement) {
		top += curElement.offsetTop;
		left += curElement.offsetLeft;
		
		// Don't forget to include border widths, but not on the element itself.
		if(curElement !== element) {
			top += curElement.clientTop;
			left += curElement.clientLeft;
		}
		
		// If we have a fixed position ancestor, then we're done -- fixed position is always relative to the viewport.
		if(curElement.getStyle('position') === 'fixed') {
			fixedParent = curElement;
			break;
		}
		
		curElement = curElement.offsetParent;
	}
	
	// Make a second pass to add up the scrollLeft & scrollTop of our ancestors.
	// Don't forget to stop in the case where we had a fixed position ancestor.
	curElement = element;
	while(curElement && curElement !== ownerDocument) {
		left -= curElement.scrollLeft;
		top -= curElement.scrollTop;
		
		if(curElement === fixedParent) {
			break;
		}
		
		curElement = curElement.parentNode;
	}
	
	return {left:left, top:top};
};

Mojo.View.removeDOMReferences = function removeDOMReferences(targetObject) {
	var propertyName, propertyValue, nodeType;
	for (propertyName in targetObject) {
		if(targetObject.hasOwnProperty(propertyName)) {
			propertyValue = targetObject[propertyName];
			nodeType = propertyValue && propertyValue.nodeType;
			if (nodeType >= 1 && nodeType <= 13) {
				Mojo.Log.info("removing", propertyValue, "from", propertyName);
				targetObject[propertyName] = null;
			}
		}
	}
};
