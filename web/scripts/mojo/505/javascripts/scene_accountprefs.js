Mojo.Scene.AccountPreferences = function AccountPreferences(args) {
	// Bind the handlers
	this._onAccountListTapped = this._onAccountListTapped.bind(this);
	this._onAddAccountTapped = this._onAddAccountTapped.bind(this);
	this._onDefaultAccountChosen = this._onDefaultAccountChosen.bind(this);
	this._onDefaultAccountTapped = this._onDefaultAccountTapped.bind(this);
	this.renderAccountIcon = this.renderAccountIcon.bind(this);
	this._onModelChanged = this._onModelChanged.bind(this);
	this._onSyncNowTapped = this._onSyncNowTapped.bind(this);

	// Preserve attributes and model for subsequent detail scenes 
	this.globalAttributes = args.attributes || {};
	Mojo.AccountManager.initAccountTypeAttributes(this.globalAttributes);
	this.attributes = this.globalAttributes.preferences || {};
	this.model = args.model || {accounts:[]};
	this.mappedAccounts = Mojo.AccountManager.mapAccountProperties(this.globalAttributes.accountTypes, this.model.accounts);
	this.defaultAccount = this.model.accounts[this.model.defaultAccount];

	this._buildDefaultMenuModel();

	this.prefsTemplate = this.attributes.prefsTemplate;
	this.itemTemplate = this.attributes.itemTemplate || Mojo.Widget.getSystemTemplatePath('accounts/preferences-list-item');
	this.buttonTemplate = Mojo.Widget.getSystemTemplatePath('accounts/button');

	this.listTitle = $L('Accounts');
	this.defaultAccountTitle = $L('Default Account');
	this.defaultAccountLabel = this.attributes.defaultAccountLabel || $L('New items will default to this account.');
	this.title = this.attributes.title || $L('Preferences & Accounts');
	this.iconClass = this.globalAttributes.iconClass;
	this.iconPath = this.globalAttributes.iconPath || (!this.iconClass && Mojo.Controller.appInfo.icon);
	this.enableSyncButton = !!(this.attributes.assistant && this.attributes.assistant.syncNow);

	this.accountsListTitle = $L('Accounts');
	this.listTemplate = Mojo.Widget.getSystemTemplatePath('list/container');
	this.defaultAccountTemplate = Mojo.Widget.getSystemTemplatePath('accounts/preferences-default-account');
	this.defaultItemTemplate = Mojo.Widget.getSystemTemplatePath('accounts/preferences-default-item');

	// Create the assistant
	this.assistant = this.attributes.assistant || {};
	this.assistant.model = this.model;

	// Set up the various callbacks
	this.syncCallback = this.bindAssistantCallback('syncNow');
	this.addAccountCallback = this.bindAssistantCallback('addAccount');
	this.defaultAccountChosenCallback = this.bindAssistantCallback('defaultAccountChosen');
};

Mojo.Scene.AccountPreferences.prototype.setup = function() {
	var appPrefsNode;

	// Render the scene's header
	this.renderHeader();

	// Render any app-specific content
	if (this.prefsTemplate) {
		appPrefsNode = this.insertContent(this.prefsTemplate, this.model.prefs, 'account-preferences-prefs-placeholder');
	}

	this.listId = this.anonymizeElementId('account-preferences-list');
	this.controller.setupWidget(this.listId, {
			itemTemplate: this.itemTemplate, 
			listTemplate: this.listTemplate, 
			onItemRendered: this.renderAccountIcon, 
			itemsProperty: 'mappedAccounts'
		}, this);
	this.connectListener(this.listId, Mojo.Event.listTap, this._onAccountListTapped);

	// TODO: Should this be something like "Select Default" if none has been specified?
	if (this.model.defaultAccount !== undefined) {
		this.insertContent(this.defaultAccountTemplate, this, 'account-preferences-default-account-group-placeholder');
		this.defaultAccountDiv = this.insertContent(this.defaultItemTemplate, this.defaultAccount, 'account-manager-default-account-placeholder');
		this.renderAccountIcon(null, this.defaultAccount, this.defaultAccountDiv);
		this.connectListener(this.defaultAccountDiv, Mojo.Event.tap, this._onDefaultAccountTapped);
	}

	if (this.enableSyncButton) {
		this.setupButtonFromTemplate(this.buttonTemplate, {}, 'account-preferences-sync-button-placeholder', $L('Sync Now'), this._onSyncNowTapped);
	} else {
		this.controller.get('account-preferences-sync-button-placeholder').remove();
	}

	this.setupButton(this.anonymizeElementId('account-preferences-add-account-button'), $L('Add Account'), this._onAddAccountTapped);

	// Set up the assistant
	this.setupAssistant(appPrefsNode);

	this.controller.watchModel(this.model, this, this._onModelChanged);
};

Mojo.Scene.AccountPreferences.prototype.cleanup = function() {
	this.cleanupListeners();
	this.cleanupAssistant();
};

Mojo.Scene.AccountPreferences.prototype.activate = function(modelChangeInfo) {
	this.activateAssistant();

	if (modelChangeInfo) {
		this.controller.modelChanged(modelChangeInfo.model, undefined, modelChangeInfo.what);
	}
};

Mojo.Scene.AccountPreferences.prototype.deactivate = function() {
	this.deactivateAssistant();
};

Mojo.Scene.AccountPreferences.prototype._buildDefaultMenuModel = function() {
	var id = 0;
	var accountType;
	this.defaultAccountModel = this.mappedAccounts.collect(function(account) {
		if (!account.type) {
			accountType = Mojo.AccountManager.genericAccount;
		} else {
			accountType = this.globalAttributes.accountTypes[account.type] || { iconClass: account.type };
		}
		
		var menuItem = {
			label: account.name,
			secondaryIcon: accountType.iconClass && ('palm-account-icon ' + accountType.iconClass),
			secondaryIconPath: accountType.iconPath,
			disabled: account.defaultDisabled,
			command: id++
		};
		return menuItem;
	}, this);
};

Mojo.Scene.AccountPreferences.prototype._onAccountListTapped = function(event) {
	Mojo.AccountManager._showSettingsScene(this.controller.stageController, this.globalAttributes, this.model, event.index);
};

Mojo.Scene.AccountPreferences.prototype._onAddAccountTapped = function(event) {
	Mojo.AccountManager._showAddScene(this.controller.stageController, this.globalAttributes, this.model);
};

Mojo.Scene.AccountPreferences.prototype._onDefaultAccountChosen = function(accountId) {
	// TODO: If you double click on the default account quickly enough, the popup's
	// choose callback (this function) gets fired, but nothing actually gets chosen,
	// so the 'command' (which here is accountId) is undefined.  This is probably
	// a bug, but this works around it.
	if (accountId !== undefined) {
		this.defaultAccountChosenCallback(accountId, this.model.accounts[accountId]);
		this.model.defaultAccount = accountId;
		this.controller.modelChanged(this.model, null, 'defaultAccount');
	}
};

Mojo.Scene.AccountPreferences.prototype._onDefaultAccountTapped = function(event) {
	this.controller.popupSubmenu({
	    onChoose: this._onDefaultAccountChosen,
	    toggleCmd: this.model.defaultAccount,
	    placeNear: event.target,
	    items: this.defaultAccountModel
	});
};

Mojo.Scene.AccountPreferences.prototype._onModelChanged = function(model, what) {
	if (what === undefined || what === 'defaultAccount') {
		this.defaultAccount = this.model.accounts[this.model.defaultAccount];
		var content = Mojo.View.render({template: this.defaultItemTemplate, object: this.defaultAccount});
		this.defaultAccountDiv.innerHTML = content;
		this.renderAccountIcon(null, this.defaultAccount, this.defaultAccountDiv);
		this._buildDefaultMenuModel();
	}
};

Mojo.Scene.AccountPreferences.prototype._onSyncNowTapped = function(event) {
	this.syncCallback(event);
};


Mojo.Scene.addUtilityMethodsToPrototype(Mojo.Scene.AccountPreferences);
Mojo.AccountManager.addUtilityMethodsToPrototype(Mojo.Scene.AccountPreferences);
