Mojo.Scene.AppSupportInfo = function() {
	this.appInfo = Mojo.Locale.readStringTable('appinfo.json');
	if (Mojo.Locale._objectIsEmpty(this.appInfo)) {
		this.appInfo = Mojo.appInfo;
	}
};

Mojo.Scene.AppSupportInfo.prototype.setup = function() {
	var support, resources;
	this.controller.setupWidget(Mojo.Menu.appMenu, this.attributes = {
			omitDefaultItems: true
		}, this.model = {
			visible: true,
			items: [ Mojo.Menu.editItem ]
		}
	);
	var iconDiv = this.controller.get(this.anonymizeElementId('app-support-info-app-icon'));
	iconDiv.style['background-image'] = 'url(' + (this.appInfo.smallicon || this.appInfo.icon) + ')';

	this.controller.get(this.anonymizeElementId('app-support-info-app-name')).innerHTML = this.appInfo.title || '';
	this.controller.get(this.anonymizeElementId('app-support-info-app-details')).innerHTML = new Template($LL('#{version} by #{vendor}')).evaluate(this.appInfo);
	this.helpList = this.controller.get(this.anonymizeElementId('app-support-info-help-list'));
	this.supportList = this.controller.get(this.anonymizeElementId('app-support-info-support-list'));

	var supportitems = [];
	if (this.appInfo.vendorurl !== undefined && this.appInfo.vendorurl) {
		supportitems.push({
			text: new Template($LL('#{vendor} Website')).evaluate(this.appInfo),
			detail: $L(this.appInfo.vendorurl),
			type:'web'
		});
	}
	support = this.appInfo.support || {};
	resources = support.resources || [];
	if (support.url) {
		supportitems.push({
			text: $LL('Support Website'),
			detail: $L(support.url),
			type:'web'
		});
	}
	if (support.email) {
		supportitems.push({
			text: $LL('Send Email'),
			address: support.email.address,
			subject:support.email.subject,
			type:'email'
		});
	}
	if (support.phone) {
		supportitems.push({
			text: $L(support.phone),
			detail: $L(support.phone),
			type:'phone'
		});
	}

	try {
		var helpitems = [];
		var j = 0;
		for (j = 0; j < resources.length; j++) {
			if (resources[j].type === 'web') {
				helpitems.push({
					text: resources[j].label,
					detail: resources[j].url,
					type: 'web'
				});
			} else if (resources[j].type === 'scene') {
				helpitems.push({
					text: resources[j].label,
					detail: resources[j].sceneName,
					appIcon: (this.appInfo.smallicon || this.appInfo.icon),
					type: 'scene'
				});
			}
		}
		if (resources.length > 0) {
			this.controller.setupWidget(this.helpList.id, {
				itemTemplate: Mojo.Widget.getSystemTemplatePath('appsupport/listitem'),
				listTemplate: Mojo.Widget.getSystemTemplatePath('appsupport/listcontainer'),
				onItemRendered: this._renderHelpList,
				swipeToDelete: false
			}, {
				listTitle: $LL('Help'),
				items: helpitems
			});
		} else {
			this.helpList.remove();
			this.helpList = undefined;
		}
	} catch(e) {
		Mojo.Log.error(e);
	}
	this.controller.setupWidget(this.supportList.id, {
		itemTemplate: Mojo.Widget.getSystemTemplatePath('appsupport/listitem'),
		listTemplate: Mojo.Widget.getSystemTemplatePath('appsupport/listcontainer'),
		swipeToDelete: false
	}, {
		listTitle: $LL('Support'),
		items : supportitems
	});
	this.handleListTap = this.handleListTap.bind(this);
	if (this.helpList) {
		this.connectListener(this.helpList, Mojo.Event.listTap, this.handleListTap);		
	}
	this.connectListener(this.supportList, Mojo.Event.listTap, this.handleListTap);
	this.controller.get(this.anonymizeElementId('app-support-info-copyright')).innerHTML = this.appInfo.copyright || '';
};

Mojo.Scene.AppSupportInfo.prototype._renderHelpList = function(widget, model, node) {
	if (model.appIcon) {
		node = node.querySelector('div.app-support-info-item.scene');
		if (node) {
			node.style['background-image'] = 'url(' + model.appIcon + ')';
		}
	}
};

Mojo.Scene.AppSupportInfo.prototype.handleListTap = function(event) {
	switch (event.item.type) {
		case 'web':
			this.controller.serviceRequest("palm://com.palm.applicationManager", {
				method: "open",
				parameters: {
					id: 'com.palm.app.browser',
					params: {
						target: event.item.detail
					}
				}
			});
			break;
		case 'email':
			this.controller.serviceRequest('palm://com.palm.applicationManager', {
				method:'open',
				parameters: {
					target: 'mailto:' + event.item.address + "?subject="  + this.appInfo.title + " " + event.item.subject
				}
			});
			break;
		case 'phone':
			this.controller.serviceRequest('palm://com.palm.applicationManager', {
				method:'open',
				parameters: {
					target: "tel://" + event.item.detail
				}
			});
			break;
		case 'scene':
			this.controller.stageController.pushScene(event.item.detail);
			break;
		default:
			Mojo.Log.error('Unknown support item type: "' + event.item.type + '"');
			break;
	}
};

Mojo.Scene.AppSupportInfo.prototype.cleanup = function(event) {
	this.cleanupListeners();
};

Mojo.Scene.addUtilityMethodsToPrototype(Mojo.Scene.AppSupportInfo);
