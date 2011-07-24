Mojo.Scene.AccountLogin = function AccountLogin(args) {
	this.globalAttributes = args.attributes || {};
	this.model = args.model || {};

	this.attributes = (this.globalAttributes.accountTypes && this.globalAttributes.accountTypes[this.model.type]) || {};

	this.assistant = this.attributes.customLoginAssistant || {};
	this.assistant.model = this.model;

	this.customLoginTemplate = this.attributes.customLoginTemplate;
};

Mojo.Scene.AccountLogin.prototype.setup = function() {
	var loginNode;

	// Render the header
	this.renderHeader({object: this.attributes});

	// Render app-specific content
	if (this.customLoginTemplate) {
		loginNode = this.insertContent(this.customLoginTemplate, this.attributes, 'account-login-placeholder');
	}

	this.setupAssistant(loginNode);
};

Mojo.Scene.AccountLogin.prototype.cleanup = function() {
	this.cleanupListeners();
	this.cleanupAssistant();
};

Mojo.Scene.AccountLogin.prototype.activate = function(args) {
	this.activateAssistant(args);
};

Mojo.Scene.AccountLogin.prototype.deactivate = function() {
	this.deactivateAssistant();
};

Mojo.Scene.addUtilityMethodsToPrototype(Mojo.Scene.AccountLogin);
Mojo.AccountManager.addUtilityMethodsToPrototype(Mojo.Scene.AccountLogin);
