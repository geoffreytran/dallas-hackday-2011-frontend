/**
@name filepicker.js
@fileOverview This file has functions related to selecting a file
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/
/**
@namespace Holds functionality related to the file selection
 */
Mojo.FilePicker = {};

/**
Method to pick a single file from the device's local storage

Params object description:

		Type		Name				Required	Description 
		---------------------------------------------------------------------------------------------------------------------------------
		{Function}	params.onSelect		Required	method to call after selection is made and scene is returned. 
													It will return an object of the following format:
														{ fullPath: '/full/path/of/selected/file' }												
		{Function}	params.onCancel		Optional	method to call after selection is made and scene is returned.
		{Array} 	params.kinds 		Optional	array of pseudo type to allow ('image', 'audio', 'video', 'file')
													default is all kind are supported. If only one pseudo type is needed,
													kind: 'mytype' can be used and override kinds
		{String}	params.defaultKind	Optional	default view to go to. In ('image', 'audio', 'video', 'file')
		{String}	params.actionType	Optional	"attach" and "open" are the only supported option, "open" being the default.
													Only "attach" display an icon for now.
		{String}	params.actionName	Optional	free form string to override the default string defined by actionType
		{Array}		params.extensions	Optional	array of file extensions (Strings) to filter in the files (others) view.


Example params:

		{ kind: 'file', extensions: ['doc', 'docx'] }
		{ kinds: ['audio', 'video'], defaultKind: 'video' } 
		{ actionType: 'attach', kinds: ['image'], crop: { width: 150, height: 150 } }
		{ actionType: 'attach', kinds: ['image'] }
		{ actionType: 'attach', kinds: ['audio', 'video'], defaultKind: 'audio' }
		{ actionName: 'Select', kinds: ['other'] }



@param {Object}	params				Object containing information about the file to select as described above.
@param {Object}	stageController		The calling application's stage assistant.

 */
Mojo.FilePicker.pickFile = function(params, stageController){

	Mojo.assert(params, "Mojo.Widget.pickFile requires params to be defined.");
	Mojo.assert(stageController, "Mojo.Widget.pickFile requires a stage controller to be defined.");
	
	var picker = {
		params: params,
		_onSelect: params.onSelect,
		_onCancel: params.onCancel,
		_onCommand: params.onAppMenuCommand
	};
	
	// remove function parameters that cannot go cross app
	params._hasCancelCallback = params.onCancel ? true: undefined;
	params._hasSelectCallback = params.onSelect ? true: undefined;
	params._hasCommandCallback = params.onAppMenuCommand ? true: undefined;
	
	// Mojo.Log.info('Current app: %s', Mojo.appInfo.id);
	
	//Change the AppId based on platform version
	if(Mojo.Environment.DeviceInfo.platformVersionMajor >= 3) {
		Mojo.FilePicker.appId = "com.palm.mojo-systemui";
	}
	
	// If called from the filepicker itself (from ringtones to audio), keep the callback
	if (Mojo.appInfo.id == Mojo.FilePicker.appId) {
		// Parameters used later to handle the callback differently
		params._noCrossApp = true;
	}
	else {
		// Cross app launch does no support function so remove them
		// to have a JSON only parameter
		params.onSelect = undefined;
		params.onCancel = undefined;
		params.onAppMenuCommand = undefined;
		// Still remove onValidate in case some old (test) app is using it 
		params.onValidate = undefined;
	}
	
	if (params._noCrossApp) {
		// We are in the scenario where we are already in the file picker app
		stageController.pushScene(Mojo.FilePicker.findDefaultView(params), picker);
	}
	else {
		var args = {
			appId: Mojo.FilePicker.appId,
			name: Mojo.FilePicker.findDefaultView(params),
			callbackHandler: function(responseCallback, returnParams){
				// this.handleCallback.bind(this);
				Mojo.Log.info('Mojo.FilePicker handling callback %j', returnParams);
				
				if (returnParams.cancel) {
					if (picker._onCancel) {
						picker._onCancel();
					}
				}
				else 
					if (returnParams.select) {
						if (picker._onSelect) {
							picker._onSelect(returnParams.select);
						}
						else {
							Mojo.Log.error('Missing onSelect callback in FilePicker.pickFile');
						}
					}
					else if(returnParams.command) {
						if(picker._onCommand) {
							picker._onCommand(returnParams.command);
						}
					}
			}
		};
		stageController.pushScene(args, picker);
	}
};

/**
### Overview ####
Method to pick a ringtone file

Params object description

		Type		Name				Required	Description 
		---------------------------------------------------------------------------------------------------------------------------------
		{Function}	params.onSelect		Required	method to call after selection is made and scene is returned. 
													It will return an object of the following format:
														{ fullPath: '/full/path/of/selected/file' }												
		{Function}	params.onCancel		Optional	method to call after selection is made and scene is returned.
		{Array} 	params.kinds 		Optional	array of pseudo type to allow ('image', 'audio', 'video', 'file')
													default is all kind are supported. If only one pseudo type is needed,
													kind: 'mytype' can be used and override kinds
		
		
@param {Object}	params				Object containing information about the file to select as described above.
@param {Object}	stageController		The calling application's stage assistant.

@private
 */
Mojo.FilePicker.pickRingtone = function(params, stageController){

	Mojo.assert(params, "Mojo.Widget.pickRingtone requires params to be defined.");
	Mojo.assert(stageController, "Mojo.Widget.pickRingtone requires a stage controller to be defined.");
	
	params.kind = 'ringtone';
	params.kinds = undefined;
	params.defaultKind = undefined;
	
	Mojo.FilePicker.pickFile(params, stageController);
};

/**
@private
#### Overview ####
find the default view to launch.

Unfortunately we need this information prior pushing the scene
		params
		
@field
 */
Mojo.FilePicker.findDefaultView = function(params) {
	var views = {};
	// Kind to view mapping
	views.image = 'imagealbum';
	views.audio = 'audio';
	views.video = 'videoalbum';
	views.file = 'files';
	views.ringtone = 'ringtone';
	
	var defaultKind = params.defaultKind ? params.defaultKind : (params.kind ? params.kind : ((params.kinds && params.kinds.length > 0) ? params.kinds[0] : 'file'));
	var view = defaultKind ? views[defaultKind] : undefined;
	if (!view) {
		view = views.file;
	}
	return view;
};

/**
@private
Application handling the file picker dialog
 */
Mojo.FilePicker.appId = 'com.palm.systemui';
