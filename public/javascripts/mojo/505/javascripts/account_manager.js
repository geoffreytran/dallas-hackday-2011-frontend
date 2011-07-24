/** @private */
Mojo.AccountManager = {};

Mojo.AccountManager.NAME_PROPERTY_DEFAULT = 'name';
Mojo.AccountManager.USERNAME_PROPERTY_DEFAULT = 'username';
Mojo.AccountManager.PASSWORD_PROPERTY_DEFAULT = 'password';
Mojo.AccountManager.DOMAIN_PROPERTY_DEFAULT = 'domain';
Mojo.AccountManager.DEFAULTDISABLED_PROPERTY_DEFAULT = 'defaultDisabled';

Mojo.AccountManager.genericAccount = {
	iconClass: 'generic',
	title: Mojo.appInfo.title,
	accountsNameProperty: Mojo.AccountManager.NAME_PROPERTY_DEFAULT,
	accountsUsernameProperty: Mojo.AccountManager.USERNAME_PROPERTY_DEFAULT,
	accountsPasswordProperty: Mojo.AccountManager.PASSWORD_PROPERTY_DEFAULT,
	accountsDomainProperty: Mojo.AccountManager.DOMAIN_PROPERTY_DEFAULT,
	accountsDefaultDisabledProperty: Mojo.AccountManager.DEFAULTDISABLED_PROPERTY_DEFAULT
};

Mojo.AccountManager.initAccountTypeAttributes = function(attributes) {
	var accountTypes = attributes.accountTypes;
	if (!attributes.mojoAccountTypesInitialized) {
		Object.values(accountTypes).each(function(type) {
			type.accountsNameProperty = type.accountsNameProperty || Mojo.AccountManager.NAME_PROPERTY_DEFAULT;
			type.accountsUsernameProperty = type.accountsUsernameProperty || Mojo.AccountManager.USERNAME_PROPERTY_DEFAULT;
			type.accountsPasswordProperty = type.accountsPasswordProperty || Mojo.AccountManager.PASSWORD_PROPERTY_DEFAULT;
			type.accountsDomainProperty = type.accountsDomainProperty || Mojo.AccountManager.DOMAIN_PROPERTY_DEFAULT;
			type.accountsDefaultDisabledProperty = type.accountsDefaultDisabledProperty || Mojo.AccountManager.DEFAULTDISABLED_PROPERTY_DEFAULT;
			type.title = type.title || Mojo.Controller.appInfo.title;
		});
		attributes.mojoAccountTypesInitialized = true;
	}
};

Mojo.AccountManager.mapAccountProperties = function(accountTypes, accounts) {
	var accountType;
	var mappedAccount;
	var mappedAccounts;
	
	if (!accounts) {
		return [];
	}

	mappedAccounts = accounts.collect(function(account) {
		accountType = accountTypes[account.type] || Mojo.AccountManager.genericAccount;
		mappedAccount = {
			name: account[accountType.accountsNameProperty || Mojo.AccountManager.NAME_PROPERTY_DEFAULT],
			username: account[accountType.accountsUsernameProperty || Mojo.AccountManager.USERNAME_PROPERTY_DEFAULT],
			password: account[accountType.accountsPasswordProperty || Mojo.AccountManager.PASSWORD_PROPERTY_DEFAULT],
			domain: account[accountType.accountsDomainProperty || Mojo.AccountManager.DOMAIN_PROPERTY_DEFAULT],
			defaultDisabled: account[accountType.accountsDefaultDisabledProperty || Mojo.AccountManager.DEFAULTDISABLED_PROPERTY_DEFAULT],
			type: account.type,
			iconClass: account.iconClass,
			iconPath: account.iconPath,
			original: account
		};
		return mappedAccount;
	});
	return mappedAccounts;
};

Mojo.AccountManager.renderHeader = function(params) {
	params = params || {};

	// Default our params as necessary
	params.headerTemplate = params.headerTemplate || Mojo.Widget.getSystemTemplatePath('accounts/header');
	params.object = params.object || this;
	params.parent = params.parent || 'account-header-placeholder';

	var headerNode = this.insertContent(params.headerTemplate, params.object, params.parent);
	Mojo.AccountManager.renderIconFromClassOrPath(headerNode, params.object);
};

Mojo.AccountManager.renderAccountIcon = function(widget, account, itemNode) {
	var accountType;
	if (!account.type) {
		if (account.iconClass || account.iconPath) {
			accountType = {
				iconClass: account.iconClass,
				iconPath: account.iconPath
			};
		} else {
			accountType = Mojo.AccountManager.genericAccount;
		}
	} else {
		accountType = this.globalAttributes.accountTypes[account.type] || { iconClass: account.type };
	}

	Mojo.AccountManager.renderIconFromClassOrPath(itemNode, accountType);
};

/** @private */
Mojo.AccountManager.renderIconFromClassOrPath = function(node, object) {
	var iconDiv = node.querySelector('div.palm-account-icon');
	if (!iconDiv) {
		iconDiv = node.querySelector('div.synergy-accounts-icon');
	}

	if (object.iconClass) {
		iconDiv.addClassName(object.iconClass);
	} else if (object.iconPath) {
		iconDiv.style['background-image'] = 'url(' + object.iconPath + ')';
	}
};

/** @private */
Mojo.AccountManager._showFirstLaunchScene = function(controller, attributes, model) {
	controller.showFrameworkScene(attributes.firstLaunch.sceneName, 
								  'accounts/first-launch', 
								  Mojo.Scene.AccountFirstLaunch, 
								  {attributes: attributes, model: model});
};

/** @private */
Mojo.AccountManager._showPreferencesScene = function(controller, attributes, model) {
	controller.showFrameworkScene('', 'accounts/preferences', Mojo.Scene.AccountPreferences, {attributes: attributes, model: model});
};

/** @private */
Mojo.AccountManager._showSettingsScene = function(controller, attributes, model, accountIndex) {
	controller.showFrameworkScene('', 'accounts/settings', Mojo.Scene.AccountSettings, {attributes: attributes, model: model, accountIndex: accountIndex});
};

/** @private */
Mojo.AccountManager._showLoginScene = function(controller, attributes, model) {
	controller.showFrameworkScene('', 'accounts/login', Mojo.Scene.AccountLogin, {attributes: attributes, model: model});
};

/** @private */
Mojo.AccountManager._showAddScene = function(controller, attributes, model) {
	controller.showFrameworkScene('', 'accounts/add', Mojo.Scene.AccountAdd, {attributes: attributes, model: model});
};

/**
 * Call to add Mojo.AccountManager utility methods to an object's prototype.
 * @param {Object} targetObject Object whose prototype should be extended with Mojo.AccountManager methods.
 */
Mojo.AccountManager.addUtilityMethodsToPrototype = function(targetObject) {
	var methods = ['renderHeader', 'renderAccountIcon'];
	var addToPrototype = function(functionName) {
		if(targetObject.prototype[functionName] !== undefined) {
			Mojo.Log.warn("Overwriting existing method with Mojo.AccountManager method ", functionName);
		}
		targetObject.prototype[functionName] = Mojo.AccountManager[functionName];
	};
	methods.each(addToPrototype);
};
