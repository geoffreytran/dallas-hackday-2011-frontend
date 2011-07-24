Mojo.Scene.AccountFirstLaunch = function AccountFirstLaunch(args) {
	this.globalAttributes = args.attributes || {};
	Mojo.AccountManager.initAccountTypeAttributes(this.globalAttributes);
	this.model = args.model || {accounts: []};
	this.attributes = this.globalAttributes.firstLaunch || {};
	this.mappedAccounts = Mojo.AccountManager.mapAccountProperties(this.globalAttributes.accountTypes, this.model.accounts);

	this.iconClass = this.attributes.iconClass;
	this.iconPath = !this.iconClass && (this.attributes.iconPath || Mojo.Controller.appInfo.icon);
	this.title = this.attributes.title || (new Template($LL('Your #{title} accounts'))).evaluate({title: Mojo.Controller.appInfo.title});
	this.template = Mojo.Widget.getSystemTemplatePath('accounts/first-launch-label');
	this.itemTemplate = Mojo.Widget.getSystemTemplatePath('accounts/first-launch-item' + (this.attributes.assistant.listTap ? '-tappable' : ''));

	this.addItemTemplate = Mojo.Widget.getSystemTemplatePath('accounts/add-item');

	this.accountListModel = {
		items: Mojo.Scene.AccountFirstLaunch.getAccountTypeList(this.globalAttributes.accountTypes)
	};


	this.assistant = this.attributes.assistant || {};
	this.assistant.model = this.model;
	this.addCallback = this.bindAssistantCallback('addAccount');
	this.doneCallback = this.bindAssistantCallback('done');
	this.listTapCallback = this.bindAssistantCallback('listTap');
	this.dividerTemplate = Mojo.Widget.getSystemTemplatePath('people-picker/multiline-separator');

	if (this.attributes.dividerFunction) {
		this.dividerFunction = function (realFunc, itemModel) {
			return realFunc(itemModel.original);
		}.bind(this, this.attributes.dividerFunction);
	}
	
	this._onAddAccountTapped = this._onAddAccountTapped.bind(this);
	this._onDoneTapped = this._onDoneTapped.bind(this);
	this.renderAccountIcon = this.renderAccountIcon.bind(this);
};

Mojo.Scene.AccountFirstLaunch.getAccountTypeList = function(accountTypes) {
	var arr;
	
	function filter(a) {
		return !a.value.cannotBeAdded;
	}
	
	function map(a) {
		var b = Object.extend({}, a.value);
		b.typeId = a.key;
		return b;
	}
	
	function compare(a, b) {
		var titleA, titleB;
		titleA = a.title || "";
		titleB = b.title || "";
		return titleA.localeCompare(titleB);
	}
	
	arr = $H(accountTypes).findAll(filter).collect(map);
	
	for (var i = 0; i < arr.length; i++){
		arr[i].title = $LL(arr[i].title);
	}
	
	arr.sort(compare);
	return arr;
};

Mojo.Scene.AccountFirstLaunch.prototype.setup = function() {
	var drawerDiv;
	var buttonDiv;

	this.renderHeader({
		headerTemplate: Mojo.Widget.getSystemTemplatePath('accounts/synergy-header')
	});

	this.existingAccountsDiv = this.controller.get(this.anonymizeElementId('account-first-launch-existing-accounts'));
	this.noAccountsDiv = this.controller.get(this.anonymizeElementId('account-first-launch-no-accounts'));

	this.addButton = this.controller.get(this.anonymizeElementId('account-add-button'));
	this.setupButton(this.addButton.id, $LL('Add an account'), this._onAddAccountTapped);
	this.doneButton = this.controller.get(this.anonymizeElementId('account-done-button'));
	this.setupButton(this.doneButton.id, $LL('Done'), this._onDoneTapped, 'affirmative');
	if (this.attributes.hideDoneButton) {
		this.doneButton.hide();
		drawerDiv = this.existingAccountsDiv.querySelector('div.accounts-drawer');
		drawerDiv.addClassName('done-disabled');
		buttonDiv = this.existingAccountsDiv.querySelector('div.palm-drawer-shadow');
		buttonDiv.addClassName('done-disabled');
	}

	this.listId = this.anonymizeElementId('account-first-launch-list');
	this.controller.setupWidget(this.listId, {
			itemTemplate: this.itemTemplate, 
			dividerFunction: this.dividerFunction, 
			dividerTemplate: this.dividerTemplate, 
			onItemRendered: this.renderAccountIcon, 
			itemsProperty: 'mappedAccounts'
		}, this);
		this.connectListener(this.listId, Mojo.Event.listTap, this.listTapCallback);

	this.addListId = this.anonymizeElementId('account-add-list');
	this.controller.setupWidget(this.addListId, {
			itemTemplate: this.addItemTemplate,
			onItemRendered: Mojo.AccountManager.renderAccountIcon
		}, this.accountListModel);
	this.connectListener(this.addListId, Mojo.Event.listTap, this._onAddAccountTapped);

	this._manageLists();

	this.setupAssistant();

	this.controller.watchModel(this.model, this, this._onModelChanged);
};

Mojo.Scene.AccountFirstLaunch.prototype.cleanup = function() {
	this.cleanupListeners();
	this.cleanupAssistant();
};

Mojo.Scene.AccountFirstLaunch.prototype.activate = function(args) {
	this.activateAssistant(args);
};

Mojo.Scene.AccountFirstLaunch.prototype.deactivate = function() {
	this.deactivateAssistant();
};

Mojo.Scene.AccountFirstLaunch.prototype._onModelChanged = function(model, what) {
	this.mappedAccounts = Mojo.AccountManager.mapAccountProperties(this.globalAttributes.accountTypes, this.model.accounts);
	this.controller.modelChanged(this);
	this._manageLists();
};

Mojo.Scene.AccountFirstLaunch.prototype._onAddAccountTapped = function(event) {
	this.addCallback(event);
};

Mojo.Scene.AccountFirstLaunch.prototype._onDoneTapped = function(event) {
	this.doneCallback(event);
};

Mojo.Scene.AccountFirstLaunch.prototype._manageLists = function() {
	if (this.mappedAccounts.length === 0 && !this.attributes.hideAccountTypesList) {
		// Set up and show the 'Add Accounts' part of the scene
		this.doneButton.show();
		this.addButton.hide();
		this.existingAccountsDiv.hide();
		this.noAccountsDiv.show();
	} else {
		// Set up and show the "Your XXX Acounts" part of the scene
		if (this.attributes.hideDoneButton) {
			this.doneButton.hide();
		}
		this.noAccountsDiv.hide();
		this.addButton.show();
		this.existingAccountsDiv.show();
	}
};

Mojo.Scene.addUtilityMethodsToPrototype(Mojo.Scene.AccountFirstLaunch);
Mojo.AccountManager.addUtilityMethodsToPrototype(Mojo.Scene.AccountFirstLaunch);
