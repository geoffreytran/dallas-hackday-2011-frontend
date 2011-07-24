function WebViewAssistant(link){
    this.link = 'www.palm.com';
}

WebViewAssistant.prototype.setup = function(){
    //Setup the webview to load a url
    this.controller.setupWidget('web-view', {
        url: this.link
    });
    
    //Other webview related default icons that can be used in a command menu include 'back' & 'forward'
    this.reloadModel = {
        label: $L('Reload'),
        icon: 'refresh',
        command: 'refresh'
    };
    
        /* This icon is now non-standard - ie you must include an image & styling for it (see the
         * .palm-menu-icon class definition in main.css)
         */
    this.stopModel = {
        label: $L('Stop'),
        icon: 'load-progress',
        command: 'stop'
    };
    
    this.cmdMenuModel = {
        visible: true,
        items: [{}]
    };
    
    /*  Other webview events not demo'd here
     * 
     * Mojo.Event.webViewDownloadFinished
     * Mojo.Event.webViewDownloadFinished
     * Mojo.Event.webViewTitleUrlChanged
     * Mojo.Event.webViewTitleChanged
     * Mojo.Event.webViewUrlChanged
     * Mojo.Event.webViewCreatePage
     * Mojo.Event.webViewTapRejected
     * Mojo.Event.webViewScrollAndScaleChanged
     * Mojo.Event.webViewEditorFocused
     * Mojo.Event.webViewSetMainDocumentError
     * Mojo.Event.webViewServerConnect
     * Mojo.Event.webViewServerDisconnect
     * Mojo.Event.webViewResourceHandoff
     * Mojo.Event.webViewFirstPaintComplete
     * Mojo.Event.webViewUrlRedirect
     * Mojo.Event.webViewModifierTap
     * Mojo.Event.webViewMimeNotSupported
     * Mojo.Event.webViewMimeHandoff
     * Mojo.Event.webViewPluginSpotlightStart
     * Mojo.Event.webViewPluginSpotlightEnd
     */
 
    //prepare the event callbacks
    this.progress = this.progress.bind(this);
    this.started = this.started.bind(this);
    this.stopped = this.stopped.bind(this);
    
    //setup the listeners/callbacks for loading related events
    Mojo.Event.listen(this.controller.get('web-view'), Mojo.Event.webViewLoadProgress, this.progress);
    Mojo.Event.listen(this.controller.get('web-view'), Mojo.Event.webViewLoadStarted, this.started);
    Mojo.Event.listen(this.controller.get('web-view'), Mojo.Event.webViewLoadStopped, this.stopped);
    Mojo.Event.listen(this.controller.get('web-view'), Mojo.Event.webViewLoadFailed, this.stopped);
    Mojo.Event.listen(this.controller.get('web-view'), Mojo.Event.webViewDidFinishDocumentLoad, this.stopped);  
        Mojo.Event.listen(this.controller.get('web-view'), Mojo.Event.webViewUpdateHistory, this.webViewUpdateHistory.bind(this));
        
    this.controller.setupWidget(Mojo.Menu.commandMenu, {
        menuClass: 'no-fade'
    }, this.cmdMenuModel);
}

//Called on the webViewLoadStarted event
WebViewAssistant.prototype.started = function(event){
    this.cmdMenuModel.items.pop(this.reloadModel);
    this.cmdMenuModel.items.push(this.stopModel);
    
    this.controller.modelChanged(this.cmdMenuModel);
    
    this.currLoadProgressImage = 0;
}

//Called on the webViewLoadStopped, webViewLoadFailed or webViewDidFinishDocumentLoad event
WebViewAssistant.prototype.stopped = function(event){
    this.cmdMenuModel.items.pop(this.stopModel);
    this.cmdMenuModel.items.push(this.reloadModel);
    this.controller.modelChanged(this.cmdMenuModel);
}

//Called on the webViewLoadProgress event
WebViewAssistant.prototype.progress = function(event){
    var percent = event.progress;
    
    try {
        if (percent > 100) {
            percent = 100;
        }
        else 
            if (percent < 0) {
                percent = 0;
            }
        
        // Update the percentage complete
        this.currLoadProgressPercentage = percent;
        
        // Convert the percentage complete to an image number
        // Image must be from 0 to 25 (26 images available)
        var image = Math.round(percent / 3.85);
        if (image > 25) {
            image = 25;
        }
        
        
        // Ignore this update if the percentage is lower than where we're showing
        if (image < this.currLoadProgressImage) {
            return;
        }
        
        // Has the progress changed?
        if (this.currLoadProgressImage != image) {
            var icon = this.controller.select('div.load-progress')[0];
            if (icon) {
                this.loadProgressAnimator = Mojo.Animation.animateValue(Mojo.Animation.queueForElement(icon), "linear", this._updateLoadProgress.bind(this), {
                    from: this.currLoadProgressImage,
                    to: image,
                    duration: 0.5
                });
            }
        }
    } 
    catch (e) {
        Mojo.Log.logException(e, e.description);
    }
};

//The animator function that will update our progress indicator
WebViewAssistant.prototype._updateLoadProgress = function(image){
    // Find the progress image
    image = Math.round(image);
    
    // Don't do anything if the progress is already displayed
    if (this.currLoadProgressImage == image) {
        return;
    }
    var icon = this.controller.select('div.load-progress');
    if (icon && icon[0]) {
        icon[0].setStyle({
            'background-position': "0px -" + (image * 48) + "px"
        });
    }
    this.currLoadProgressImage = image;
};

//Called on webViewUpdateHistory event
WebViewAssistant.prototype.webViewUpdateHistory  = function(requestedLink){
        Mojo.Log.info("THE NEW URL IS: " + requestedLink.url);
}       
        
//Handles the command menu commands as well as the back gesture
WebViewAssistant.prototype.handleCommand = function(event){
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'refresh':
                this.controller.get('web-view').mojo.reloadPage();
                break;
            case 'stop':
                this.controller.get('web-view').mojo.stopLoad();
                break;
        }
    }
    
    //catch the back gesture
    if (event.type == Mojo.Event.back) {
        this.controller.get('web-view').mojo.getHistoryState(this.backForward.bind(this));
        event.stop(); //use this to stop the back gesture from minimizing your app's card 
    }
};

/* If we're on the bottom of the stack of page history then the back gesture should take the user
 * back to the main page, otherwise go back through the history of pages.
 */
WebViewAssistant.prototype.backForward = function(back, forward){
    if (!back) {
        Mojo.Controller.stageController.popScene();
    }
    else {
        this.controller.get('web-view').mojo.goBack();
    }
}

WebViewAssistant.prototype.activate = function(event){
}

WebViewAssistant.prototype.deactivate = function(event){
}

WebViewAssistant.prototype.cleanup = function(event){
    Mojo.Event.stopListening(this.controller.get('web-view'), Mojo.Event.webViewLoadProgress, this.progress);
    Mojo.Event.stopListening(this.controller.get('web-view'), Mojo.Event.webViewLoadStarted, this.started);
    Mojo.Event.stopListening(this.controller.get('web-view'), Mojo.Event.webViewLoadStopped, this.stopped);
    Mojo.Event.stopListening(this.controller.get('web-view'), Mojo.Event.webViewLoadFailed, this.stopped);
    Mojo.Event.stopListening(this.controller.get('web-view'), Mojo.Event.webViewDidFinishDocumentLoad, this.stopped);
}