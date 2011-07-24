Mojo.Scene = {};

/** @private */
Mojo.Scene.insertContent = function(template, object, parentDiv) {
	var contentParent = this.controller.get(parentDiv);
	if (contentParent) {
		var content = Mojo.View.render({template: template, object: object});
		var node = Mojo.View.convertToNode(content, this.controller.document);
		if (parentDiv.endsWith('-placeholder')) {
			// Replace the -placeholder node here
			Element.replace(contentParent, node);
		} else {
			contentParent.appendChild(node);
		}
		return node;
	}
};

/** @private */
Mojo.Scene.setupButton = function(name, label, callback, buttonClass) {
	this.controller.setupWidget(name, {}, {label: label, buttonClass: buttonClass});
	this.connectListener(name, Mojo.Event.tap, callback);
};

/** @private */
Mojo.Scene.setupButtonFromTemplate = function(template, object, parentDiv, label, callback, buttonClass) {
	object.id = object.id || Mojo.View.makeUniqueId(window);
	this.insertContent(template, object, parentDiv);
	this.setupButton(object.id, label, callback, buttonClass);
};

/** @private */
Mojo.Scene.makeUniqueElementId = function(element) {
	return Mojo.View.makeUniqueId() + this.controller.sceneId + (Object.isString(element) ? element : element.id);
};

/** @private */
Mojo.Scene.anonymizeElementId = function(element) {
	var id = this.makeUniqueElementId(element);
	this.controller.get(element).id = id;
	return id;
};

/** @private */
Mojo.Scene.connectListener = function(element, event, callback) {
	this.controller.listen(element, event, callback);
	if (!this._listenerStack) {
		this._listenerStack = [];
	}
	this._listenerStack.push({element:element, event:event, callback:callback});
};

/** @private */
Mojo.Scene.cleanupListeners = function() {
	if (this._listenerStack) 	{
		var that = this;
		this._listenerStack.each(function(listener) {
			that.controller.stopListening(listener.element, listener.event, listener.callback);
		});
		delete this._listenerStack;
	}
};

/** @private */
Mojo.Scene.setupAssistant = function(element) {
	this.assistant.controller = this.controller;

	if (this.assistant.handleCommand) {
		this.controller.pushCommander(this.assistant);
	}
	if (this.assistant.setup) {
		this.assistant.setup(element);
	}	
};

/** @private */
Mojo.Scene.cleanupAssistant = function() {
	if (this.assistant.handleCommand) {
		this.controller.removeCommander(this.assistant);
	}
	if (this.assistant.cleanup) {
		this.assistant.cleanup();
	}
};

/** @private */
Mojo.Scene.activateAssistant = function(args) {
	if (this.assistant.activate) {
		try {
			this.assistant.activate(args);
		} catch (e) {
			Mojo.Log.warn("Activate called on the accounts assistant failed. Continuing other setup. %s ", e);
		}
	}
};

/** @private */
Mojo.Scene.deactivateAssistant = function() {
	if (this.assistant.deactivate) {
		try {
			this.assistant.deactivate();
		} catch (e) {
			Mojo.Log.warn("Deactivate called on the accounts assistant failed. Continuing other cleanup. %s ", e);
		}
	}
};

/** @private */
Mojo.Scene.bindAssistantCallback = function(callbackName) {
	return (this.assistant[callbackName] && this.assistant[callbackName].bind(this.assistant)) || Mojo.doNothing;
};

/**
 * Call to add Mojo.Scene utility methods to an object's prototype.
 * @param {Object} targetObject Object whose prototype should be extended with logging methods.
 */
Mojo.Scene.addUtilityMethodsToPrototype = function(targetObject) {
	var methods = ["insertContent", "setupButton", "setupButtonFromTemplate", "makeUniqueElementId", "anonymizeElementId", "connectListener", "cleanupListeners", "setupAssistant", "cleanupAssistant", "activateAssistant", "deactivateAssistant", "bindAssistantCallback"];
	var addToPrototype = function(functionName) {
		if(targetObject.prototype[functionName] !== undefined) {
			Mojo.Log.warn("Overwriting existing method with Mojo.Scene method ", functionName);
		}
		targetObject.prototype[functionName] = Mojo.Scene[functionName];
	};
	methods.each(addToPrototype);
};



/** @private
#### Overview ####
	This method provides a standard First Launch scene for applications that
	handle accounts.  It displays an icon and title, and a list of accounts.
	Both "Add Account" and "Done" buttons are included, and will invoke methods
	on an application-defined assistant when pressed -- no actual account
	management logic is implemented by the First Launch scene.

	In addition to the "addAccount" and "done" methods, the First Launch scene
	will also invoke "activate", "deactivate", "setup", and "cleanup" methods on
	the assistant at the appropriate times, if they are provided.

	When the First Launch scene is set up, it will set assistant.model to its
	model (i.e., the model passed to this API) and assistant.controller to its
	scene controller.

	The First Launch scene runs in two modes.  If the model's 'accounts'
	property is empty, a list of the specified account types will be displayed
	along with the "Done" button; the "Add Account" button is hidden.  When an
	account type is tapped in the list, the assistant's "addAccount" method is
	invoked with the account type as an argument (see documentation for the
	'accountTypes' attribute property below).  It is up to the calling
	application to manage setting up the new account.  Account types can be
	excluded from this list by setting 'cannotBeAdded' to true on the account
	type object.

	If the model's 'accounts' property is not empty, than a list of the existing
	accounts is shown, delimited by the divider function, if any is provided.
	Both the "Add Account" and "Done" button are displayed in this mode.  If the
	"Add Account" button is tapped, the assistant's "addAccount" method is 
	invoked with no argument.  It is up to the calling application to manage an
	"Add Account" scene in response.

	If the user adds an account, the model should be updated and the assistant 
	should call this.controller.modelChanged(this.model); the First Launch scene
	watches the model so that can update itself, switching modes as necessary.

#### Function Call ####

	this.controller.showFirstLaunchScene({
		iconPath: 'images/my-first-launch-scene-icon.png',
		assistant: new MyFirstLaunchAssistant(),
		accountTypes: {
			'eas': {
				iconClass: 'eas',
				title: 'Exchange'
			},
			'myaccounttype': {
				iconPath: 'images/myaccounticon-32x32.png',
				title: 'My Account Type'
			}
		}
	}, {
		accounts: [
			{ type: 'google', name: 'Foo' },
			{ type: 'myaccounttype', name: 'Bar' }
		]
	});

#### Arguments ####
	Attribute Properties
		Attribute Property		Type		Required	Default		Description
		------------------------------------------------------------------------
		sceneName				String		Optional	None		A name for the First Launch scene so that it can be referred to in API calls, e.g., popScenesTo().
		iconClass		   		String		Optional	None		Name of the CSS class that provides an icon for the First Launch scene's header.
		iconPath		   		String		Optional	App icon	File path for an icon for the First Launch scene's header.  Takes precedence over 'iconClass'.
		title			   		String		Optional	"Your <app title> Accounts"	Title text for First Launch scene.
		hideAccountTypesList	Boolean		Optional	False		If model.accounts is empty and hideAccountTypesList is 'true', the account types list mode will not be run.
		hideDoneButton			Boolean		Optional	False		If set to 'true', the scene's "Done" button will not be shown.
		dividerFunction	   		Function	Optional	None		A function to create divider elements in the accounts list.
		assistant				Object		Optional	None		An object that the scene calls on to trigger application-specific functionality.
			activate			Function	Optional	None		Called when the scene is activated.
			deactivate			Function	Optional	None		Called when the scene is activated.
			setup				Function	Optional	None		Called when the scene is set up.
			cleanup				Function	Optional	None		Called when the scene is cleaned up.
			addAccount			Function	Optional	None		Called when the scene's "Add Account" button is pressed.
			done				Function	Optional	None		Called when the scene's "Done" button is pressed.
			listTap				Function	Optional	None		If present, items in the existing accounts list become tappable and this function is called when an item in that list is tapped.
		accountTypes			Object		Optional	None		Attributes describing different types of accounts, used as a hash.  Each account type is represented 
																	by its name as a property of the accountTypes object.  For example, the account type information for
																	'google' would be referenced as accountTypes['google'], for 'aim' would be accountTypes['aim'], etc.
																	Account type names must be unique, but otherwise can be composed of any valid property name characters.
			iconClass			String		Optional	Generic		Name of the CSS class that provides an icon to represent the account type.
			iconPath			String		Optional	None		File path for an icon to represent the account type.  Takes precedence over 'iconClass'.
			title				String		Required	None		Title of the account type, e.g., 'Google', 'Exchange'
			cannotBeAdded		Boolean		Optional	False		Specifies whether accounts of this type can be added (and so appear in the Add Account scene).

	Model Properties
		Model Property			Type		Required	Default		Description
		------------------------------------------------------------------------
		accounts				Array		Optional	None		Account information.
			type				String		Optional	Generic		The type of the account, which is used to determine the icon to display in the list
			name				String		Required	None		Name of the account.
			iconClass			String		Optional	None		Name of a CSS class to override that provided by the account type.
			iconPath			String		Optional	None		File path for an icon to override that provided by the account type.  Takes precedence over 'iconClass'.

  @methodOf Mojo.Controller.StageController
 */
Mojo.Controller.StageController.prototype.showFirstLaunchScene = function(attributes, model) {
	// Map the attributes into the full structures expected by Account Management scenes
	var mappedAttributes = {
		firstLaunch: attributes,
		accountTypes: attributes.accountTypes || {}
	};

	Mojo.AccountManager._showFirstLaunchScene(this, mappedAttributes, model);
};

/** @private
#### Overview ####
#### Function Call ####

		this.controller.showAccountsScene({
			iconPath: 'images/my-account-scene-icon.png',
			firstLaunch: {
				name: 'My Application',
				assistant: new MyFirstLaunchAssistant()
			},
			preferences: {
				prefsTemplate: 'my-account-preferences-content-template',
				assistant: new MyPreferencesAssistant()
			},
			accountTypes: {
				'google': {
					iconClass: 'google',
					title: 'Google',
					settingsTemplate: 'my-google-account-settings-content-template',
					assistant: new MyGoogleSettingsAssistant()
				},
				'email': {
					iconClass: 'mail',
					title: 'EMail'
				}
			}
		}, {
			prefs: MyPreferencesModel,
			defaultAccount: 0,
			accounts: [
				{
					name: 'Foo',
					username: 'foo@fu.com',
					password: 'binky',
					type: 'google'
				},
				{
					name: 'Bar',
					username: 'bar@bie.com',
					password: 'iluvken'
				}
			]
		});

#### Arguments ####
	Attribute Properties
		Attribute Property		Type		Required	Default		Description
		------------------------------------------------------------------------
		iconClass				String		Optional	None		Name of the CSS class that provides an icon for the Accounts scenes' headers.
		iconPath				String		Optional	App icon	File path for an icon for the Accounts scenes' headers.  Takes precedence over 'iconClass'.

		firstLaunch				Object		Optional	None		Attributes for the First Launch account scene.
			sceneName			String		Optional	None		A name for the First Launch scene so that it can be referred to in API calls, e.g., popScenesTo().
			iconClass			String		Optional	None		Name of the CSS class that provides an icon for the First Launch scene's header.
			iconPath			String		Optional	App icon	File path for an icon for the First Launch scene's header.  Takes precedence over 'iconClass'.
			title				String		Optional	"Your <app title> Accounts"	Title text for First Launch scene.
			assistant			Object		Optional	None		An object that the scene calls on to trigger application-specific functionality.
				activate		Function	Optional	None		Called when the scene is activated.
				deactivate		Function	Optional	None		Called when the scene is activated.
				setup			Function	Optional	None		Called when the scene is set up.
				cleanup			Function	Optional	None		Called when the scene is cleaned up.
				addAccount		Function	Optional	None		Called when the scene's "Add Account" button is pressed.
				done			Function	Optional	None		Called when the scene's "Done" button is pressed.
			dividerFunction		Function	Optional	None		A function to create divider elements.

		preferences				Object		Optional	None		Attributes for the Preferences & Accounts scene.
			title				String		Optional	"Preferences & Accounts"	Text for the Preferences scene's header.
			prefsTemplate		String		Optional	None		Path to a template file for application-specific content in the Accounts & Preferences scene.
			defaultAccountLabel	String		Optional	"New <app title> will default to this account."	A string stating that new items/events will be placed in the default account.
			assistant			Object		Optional	None		An object that the scene calls on to trigger application-specific functionality.
				activate		Function	Optional	None		Called when the scene is activated.
				deactivate		Function	Optional	None		Called when the scene is activated.
				setup			Function	Optional	None		Called when the scene is set up.
				cleanup			Function	Optional	None		Called when the scene is cleaned up.
				addAccount		Function	Optional	None		Called when an account is added.
				syncAccounts	Function	Optional	None		Called when the scene's "Sync Now" button is pressed.  If not present, the "Sync Now" button will not be shown.

		accountTypes			Object		Optional	None		Attributes describing different types of accounts, used as a hash.  Each account type is represented 
																	by its name as a property of the accountTypes object.  For example, the account type information for
																	'google' would be referenced as accountTypes['google'], for 'aim' would be accountTypes['aim'], etc.
																	Account type names must be unique, but otherwise can be composed of any valid property name characters.
			iconClass			String		Optional	Generic		Name of the CSS class that provides an icon to represent the account type.
			iconPath			String		Optional	None		File path for an icon to represent the account type.  Takes precedence over 'iconClass'.

			accountsNameProperty	String		Optional	name		Name of the accounts object property containing the account's name.
			accountsUsernameProperty	String	Optional	username	Name of the accounts object property containing the account's username.
			accountsPasswordProperty	String	Optional	password	Name of the accounts object property containing the account's password.
			accountsDomainProperty	String		Optional	domain		Name of the accounts object property containing the account's domain.
			accountsDefaultDisabledProperty	String	Optional	defaultDisabled	Name of the accounts object property specifying whether the account can be used as the default account.

			title				String		Optional	App title	Text for the Settings scene's header.
			domainLabel			String		Optional	"Domain"	Title text for the Settings scene's domain edit field.
			usernameLabel		String		Optional	"Username"	Title text for the Settings scene's username edit field.
			passwordLabel		String		Optional	"Password"	Title text for the Settings scene's password edit field.
			domainEditable		Boolean		Optional	True		Specifies whether the Settings scene's domain can be editted.
			usernameEditable	Boolean		Optional	True		Specifies whether the Settings scene's username can be editted.
			cannotBeAdded		Boolean		Optional	False		Specifies whether accounts of this type can be added (and so appear in the Add Account scene).
			settingsTemplate	String		Optional	None		Path to a template file for account type-specific content in the Settings scene.
			assistant			Object		Optional	None		An object that the Settings scene calls on to trigger account type-specific functionality.
				activate		Function	Optional	None		Called when the Settings scene is activated.
				deactivate		Function	Optional	None		Called when the Settings scene is activated.
				setup			Function	Optional	None		Called when the Settings scene is set up.
				cleanup			Function	Optional	None		Called when the Settings scene is cleaned up.
				signIn			Function	Optional	None		Called when the Settings scene's "Sign In" button is pressed.  If not present, the "Sign In" button will not be shown.
				removeAccount	Function	Optional	None		Called when the Settings scene's "Remove Account" button is pressed.  If not present, the "Remove Account" button will not be shown.
			customLoginAssistant	Object		Optional	None		An object that the Login Settings scene calls on to trigger account type-specific functionality when the Settings scene's "Change Login Settings" button is pushed.  If not present, the "Change Login Settings" button is not shown.
			customLoginTemplate		String		Optional	None		Path to a template file for account type-specific content in the Login Settings scene.

	Model Properties
		Model Property			Type		Required	Default		Description
		------------------------------------------------------------------------
		prefs					Object		Optional	None		Model used when rendering attributes.preferences.prefsTemplate.
		defaultAccount			Number		Optional	None		Offset into the accounts array of the default account.
		accounts				Array		Optional	None		Account information.
			name				String		Required	None		Name of the account.
			username			String		Optional	None		Username for the account.
			password			String		Optional	None		Password for the account.
			domain				String		Optional	None		Domain or server name for the account.
			type				String		Optional	Generic		The type of the account, which is used to determine the icon to display in lists and the settings attributes to use for the Settings account scene.
			defaultDisabled		Boolean		Optional	False		Whether or not the account can be selected as a default account.
			iconClass			String		Optional	None		Name of a CSS class to override that provided by the account type.
			iconPath			String		Optional	None		File path for an icon to override that provided by the account type.  Takes precedence over 'iconClass'.

	@methodOf Mojo.Controller.StageController
 */
Mojo.Controller.StageController.prototype.showAccountsScene = function(attributes, model, firstLaunch) {
	if (firstLaunch) {
		Mojo.AccountManager._showFirstLaunchScene(this, attributes, model);
	} else {
		Mojo.AccountManager._showPreferencesScene(this, attributes, model);
	}
};

/**
#### Overview ####
This method pushes a scene containing application support information,
populated with data gathered from the application's appinfo.json file.  It
uses the following basic properties from Mojo.appInfo:

		"version": version number of the application
		"vendor": the author of the application
		"vendorurl": the URL of the application author
		"title": the name of the application as it appears in the Launcher
		"smallicon": a 32-pixel-square version of the application's icon
		"copyright": the application's copyright statement

Additionally, this method uses a "support" property, which is an object
containing at least one of the three following properties:

		"url": the URL specifically meant for obtaining support for the application
		"email": an object containing information for obtaining email-based support
			for the application.  It must have an "address" property, and optionally
			a "subject" property:

			"address": address for obtaining email-based support
			"subject": an optional subject line for support emails

		"phone": a phone number for obtaining support

The "support" object can, optionally, contain a "resources" property; an 
array of objects with the following properties:

		"type": "web" or "scene", specifying a support resource that is web-based or an application scene, respectively
		"label": the text to display in the support scene for this resource
		"url": for "web" type resources only; the URL of the resource web page
		"sceneName": for "scene" type resources only; the name of the scene to launch for the resource

Here is an example appinfo.json:

		{
		    "id": "com.mycompany.myapp",
		    "version": "1.0.0",
		    "vendor": "My Company",
		    "vendorurl": "http://www.mycompany.com",
		    "type": "web",
		    "main": "index.html",
		    "title": "My App",
		    "icon": "icon.png",
		    "smallicon": "icon32x32.png",

		    "copyright": "&copy; Copyright 2009 My Company, Inc.",
		    "support": {
		        "url": "http://support.mycompany.com",
		        "email": {
		            "address": "support@mycompany.com",
		            "subject": "Support"
		        },
		        "phone": "555-555-5555",
		        "resources": [
		            {
		                "type": "scene",
		                "label": "Help Topics",
		                "sceneName": "topics"
		            },
		            {
		                "type": "web",
		                "label": "Discussion Forums",
		                "url": "http://forums.mycompany.com/"
		            }
		        ]
		    }
		}
	
#### Function Call ####
		this.controller.stageController.pushAppSupportInfoScene();

@methodOf Mojo.Controller.StageController
 */
Mojo.Controller.StageController.prototype.pushAppSupportInfoScene = function() {
	this.showFrameworkScene('', 'appsupport/support', Mojo.Scene.AppSupportInfo);
};

/** @private
	Does all the work to create and show a framework scene
	@methodOf Mojo.Controller.StageController
 */
Mojo.Controller.StageController.prototype.showFrameworkScene = function(name, template, constructor, sceneArgs) {
	this.pushScene({
		name: (name && name !== '') ? name : Mojo.View.makeUniqueId(this.window), 
		sceneTemplate: Mojo.Widget.getSystemTemplatePath(template), 
		assistantConstructor: constructor
	}, sceneArgs);
};
