Mojo.Scene.AccountSettings = function AccountSettings(args) {
	this.signInName = 'account-settings-sign-in-button';
	this.removeAccountName = 'account-settings-remove-account-button';
	this.changeLoginName = 'account-settings-change-login-button';

	this._onSignInTapped = this._onSignInTapped.bind(this);
	this._onRemoveAccountTapped = this._onRemoveAccountTapped.bind(this);
	this._onChangeLoginTapped = this._onChangeLoginTapped.bind(this);
	this._handleRemoveAccount = this._handleRemoveAccount.bind(this);

	this.globalAttributes = args.attributes || {};
	Mojo.AccountManager.initAccountTypeAttributes(this.globalAttributes);
	this.model = args.model || {};
	this.accountIndex = args.accountIndex;
	this.account = Object.extend({domainDisabled: false, usernameDisabled: false}, this.model.accounts[this.accountIndex]);
	this.attributes = (this.globalAttributes.accountTypes && this.globalAttributes.accountTypes[this.account.type]) || Mojo.AccountManager.genericAccount;

	// By default, these are both editable
	if (this.attributes.domainEditable !== undefined) {
		this.account.domainDisabled = !this.attributes.domainEditable;
	}
	if (this.attributes.usernameEditable !== undefined) {
		this.account.usernameDisabled = !this.attributes.usernameEditable;
	}

	// Fill in any missing bits
	this.title = this.attributes.title || Mojo.Controller.appInfo.title;
	this.icon = this.attributes.icon || Mojo.Controller.appInfo.icon;
	this.domainLabel = this.attributes.domainLabel || $L('Domain');
	this.usernameLabel = this.attributes.usernameLabel || $L('Username');
	this.passwordLabel = this.attributes.passwordLabel || $L('Password');
	this.enableSignIn = !!(this.attributes.assistant && this.attributes.assistant.signIn);
	this.enableRemoveAccount = !!(this.attributes.assistant && this.attributes.assistant.removeAccount);
	this.enableChangeLogin = !!(this.attributes.customLoginAssistant);

	this.buttonTemplate = Mojo.Widget.getSystemTemplatePath('accounts/button');
	this.domainTemplate = Mojo.Widget.getSystemTemplatePath('accounts/settings-login-domain');
	this.loginTemplate = Mojo.Widget.getSystemTemplatePath('accounts/settings-simple-login');
	this.settingsTemplate = this.attributes.settingsTemplate;

	// Create the assistant
	this.assistant = this.attributes.assistant || {};
	this.assistant.model = this.model;

	this.signInCallback = this.bindAssistantCallback('signIn');
	this.removeAccountCallback = this.bindAssistantCallback('removeAccount');
};

Mojo.Scene.AccountSettings.prototype.setup = function() {
	var simpleLoginDomain;
	var appSettingsNode;
	var headerNode;
	var iconDiv;

	// Set up the header
	this.renderHeader({object: this.attributes});

	if (this.enableChangeLogin) {
		this.setupButtonFromTemplate(this.buttonTemplate, {}, 'account-settings-change-login-button-placeholder', $L('Change Login Settings'), this._onChangeLoginTapped);
	} else {
		this.insertContent(this.loginTemplate, {usernameLabel: this.usernameLabel, passwordLabel: this.passwordLabel}, 'account-settings-simple-login-placeholder');
		this.controller.setupWidget(this.anonymizeElementId('account-settings-username'), {modelProperty: this.attributes.accountsUsernameProperty, hintText: $L('Enter username'), disabledProperty: 'usernameDisabled'}, this.account);
		this.controller.setupWidget(this.anonymizeElementId('account-settings-password'), {modelProperty: this.attributes.accountsPasswordProperty, hintText: $L('Enter password')}, this.account);
		if (this.account[this.attributes.accountsDomainProperty]) {
			this.insertContent(this.domainTemplate, {domainLabel: this.domainLabel}, 'account-settings-domain-name-placeholder');
			this.controller.setupWidget(this.anonymizeElementId('account-settings-domain'), {modelProperty: this.attributes.accountsDomainProperty, hintText: $L('Enter domain'), disabledProperty: 'domainDisabled'}, this.account);
		}
	}

	// Render application specific content
	if (this.settingsTemplate) {
		appSettingsNode = this.insertContent(this.settingsTemplate, this.account, this.enableChangeLogin ? 'account-settings-full-placeholder' : 'account-settings-simple-placeholder');
	}

	if (this.enableSignIn) {
		this.setupButtonFromTemplate(this.buttonTemplate, {}, 'account-settings-sign-in-button-placeholder', $L('Sign In'), this._onSignInTapped);
	}

	if (this.removeAccountCallback) {
		this.setupButtonFromTemplate(this.buttonTemplate, {}, 'account-settings-remove-account-button-placeholder', $L('Remove Account'), this._onRemoveAccountTapped, 'negative');
	}

	// Set up the assistant
	this.setupAssistant(appSettingsNode);

	this.controller.watchModel(this.model, this, this._onModelChanged);
};

Mojo.Scene.AccountSettings.prototype.cleanup = function() {
	this.cleanupListeners();
	this.cleanupAssistant();
};

Mojo.Scene.AccountSettings.prototype.activate = function(args) {
	this.activateAssistant(args);
};

Mojo.Scene.AccountSettings.prototype.deactivate = function() {
	this.deactivateAssistant();
};

Mojo.Scene.AccountSettings.prototype._onModelChanged = function(model, what) {
	this.modelChangeInfo = {model: model, what: what};
	this.controller.modelChanged(this.model.accounts[this.accountIndex]);
};

Mojo.Scene.AccountSettings.prototype._handleRemoveAccount = function() {
	this.removeAccountCallback(this.account, this.accountIndex);
	this.controller.stageController.popScene(this.modelChangeInfo);
	this.modelChangeInfo = undefined;
};

Mojo.Scene.AccountSettings.prototype._onSignInTapped = function(event) {
	this.signInCallback(event);
};

Mojo.Scene.AccountSettings.prototype._onRemoveAccountTapped = function(event) {
	this.controller.showAlertDialog({
		onChoose: function(value) { value.callback(value.account, value.accountIndex); },
		title: $L('Remove Account'),
		message: $L('Are you sure you want to remove this account and all associated data from your device?'),
		choices: [
			{label: $L('Remove Account'), value: {callback: this._handleRemoveAccount}, type: 'negative'},
			{label: $L('Keep Account'), value: {callback: Mojo.doNothing}}
		]
	}
	);
};

Mojo.Scene.AccountSettings.prototype._onChangeLoginTapped = function(event) {
	Mojo.AccountManager._showLoginScene(this.controller.stageController, this.globalAttributes, this.account);
};

Mojo.Scene.addUtilityMethodsToPrototype(Mojo.Scene.AccountSettings);
Mojo.AccountManager.addUtilityMethodsToPrototype(Mojo.Scene.AccountSettings);
