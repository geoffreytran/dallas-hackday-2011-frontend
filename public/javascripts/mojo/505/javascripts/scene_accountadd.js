Mojo.Scene.AccountAdd = function AccountAdd(args) {
	this.globalAttributes = args.attributes || {};
	Mojo.AccountManager.initAccountTypeAttributes(this.globalAttributes);
	this.model = args.model || {};

	this.headerAttributes = {
		iconClass: this.globalAttributes.iconClass,
		iconPath: this.globalAttributes.iconPath || (!this.globalAttributes.iconClass && Mojo.Controller.appInfo.icon),
		title: $LL('Add An Account')
	};

	this.accountListModel = {
		items: Mojo.Scene.AccountFirstLaunch.getAccountTypeList(this.globalAttributes.accountTypes)
	};

	this.accountListTemplate = Mojo.Widget.getSystemTemplatePath('list/container');
	this.accountItemTemplate = Mojo.Widget.getSystemTemplatePath('accounts/add-item');

	this._onAccountListTapped = this._onAccountListTapped.bind(this);
	this.renderAccountIcon = this.renderAccountIcon.bind(this);
};

Mojo.Scene.AccountAdd.prototype.setup = function() {
	// Render the scene's header
	this.renderHeader({
		headerTemplate: Mojo.Widget.getSystemTemplatePath('accounts/synergy-header'),
		object: this.headerAttributes
	});

	this.listId = this.anonymizeElementId('account-add-list');
	this.controller.setupWidget(this.listId, {
			itemTemplate: this.accountItemTemplate, 
			onItemRendered: function (widget, object, node) {
				Mojo.AccountManager.renderIconFromClassOrPath(node, object);
			}
		}, this.accountListModel);
	this.connectListener(this.listId, Mojo.Event.listTap, this._onAccountListTapped);
};

Mojo.Scene.AccountAdd.prototype.cleanup = function() {
	this.cleanupListeners();
};

Mojo.Scene.AccountAdd.prototype.activate = function() {
	
};

Mojo.Scene.AccountAdd.prototype.deactivate = function() {
	
};

Mojo.Scene.AccountAdd.prototype._onAccountListTapped = function(event) {
	Mojo.AccountManager._showSettingsScene(this.controller.stageController, this.globalAttributes, this.model, event.item.typeId);
};

Mojo.Scene.addUtilityMethodsToPrototype(Mojo.Scene.AccountAdd);
Mojo.AccountManager.addUtilityMethodsToPrototype(Mojo.Scene.AccountAdd);
