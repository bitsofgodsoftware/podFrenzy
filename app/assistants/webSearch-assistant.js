/*
This file is part of drPodder.

drPodder is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

drPodder is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with drPodder.  If not, see <http://www.gnu.org/licenses/>.

Copyright 2010 Jamie Hatfield <support@drpodder.com>
*/

function WebSearchAssistant(params) {
	if (params) {
		this.startPage = params.startPage;
		this.limitSite = params.limitSite;
	}
}

WebSearchAssistant.prototype.cmdMenuModel = {
	items: [
		{},
		{},
		{},
		{},
		{label: $L("Back"), command: "home-cmd"}
	]
};

WebSearchAssistant.prototype.setup = function() {
	this.controller.setupWidget("searchWebView",
	        this.attributes = {
	            url:    this.startPage,
	            /*virtualpagewidth: 280,*/
				interrogateClicks: true,
				minFontSize:8
	        },
	        this.model = {}
	);

	this.controller.setupWidget("webViewScroller",
		this.scrollerAttributes = {
			mode: 'free'
		},
		this.scrollerModel = {}
	); 

	this.searchWebView = this.controller.get("searchWebView");
	this.searchWebViewScroller = this.controller.get("webViewScroller");

	this.handleLinkClicked = this.linkClicked.bind(this);
	this.cmdMenuModel.items[0] = {};
	this.cmdMenuModel.items[1] = {};
	this.level = 0;
	this.maxLevel = 0;

	this.kbdButton = {label:$L('Kbd'), command:'kbd-cmd'};
	if(!_device_.thisDevice.kb){
		Mojo.Log.info("setup NO KEYBOARD");
		this.cmdMenuModel.items[3]= this.kbdButton;
	}

	this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);
};

WebSearchAssistant.prototype.activate = function(event) {
	Mojo.Event.listen(this.searchWebView, Mojo.Event.webViewLinkClicked, this.handleLinkClicked);
};

WebSearchAssistant.prototype.deactivate = function(event) {
	Mojo.Event.stopListening(this.searchWebView, Mojo.Event.webViewLinkClicked, this.handleLinkClicked);
};

WebSearchAssistant.prototype.cleanup = function(event) {
};

WebSearchAssistant.prototype.linkClicked = function(event) {
	Mojo.Log.info("this.limitSite: "+ this.limitSite);
	Mojo.Log.info("event.url: "+ event.url);
	
	if (this.limitSite && !event.url.startsWith(this.limitSite)) {
		this.controller.stageController.popScene({feedToAdd: {url:event.url}});
	} else {
		try{
		event.stop();
		event.stopPropagation();
		this.addBack();
		this.level++;
		this.maxLevel = this.level;
		this.searchWebView.mojo.openURL(event.url);
//		Mojo.Log.info("linkClicked done");
		} catch (e){
			Mojo.Log.error("linkClicked error: " + e);
		}
	}
};

WebSearchAssistant.prototype.handleCommand = function(event) {
	if (event.type == Mojo.Event.command) {
        switch(event.command) {
            case "back-cmd":
				this.backCmd();
				break;
            case "forward-cmd":
				this.forwardCmd();
				break;
            case "home-cmd":
				this.homeCmd();
				break;
            case "kbd-cmd":
				this.kbdCmd();
				break;
		}
	} else if (event.type === Mojo.Event.back) {
		event.stop();
		event.stopPropagation();
		this.backCmd();
	}
};

WebSearchAssistant.prototype.backCmd = function() {
	if (this.level === 0) {
		this.controller.stageController.popScene();
	} else {
		this.level--;
		if (this.level === 0) {
			this.disableBack();
		}
		this.addForward();
		this.searchWebView.mojo.goBack();
	}
};

WebSearchAssistant.prototype.kbdCmd = function() {
	var w= this.controller.window;
	
	w.PalmSystem.setManualKeyboardEnabled(true);
	w.PalmSystem.allowResizeOnPositiveSpaceChange(true);
	w.PalmSystem.keyboardShow(0);
	w.PalmSystem.editorFocused(true, 0, 0);
};

WebSearchAssistant.prototype.forwardCmd = function() {
	this.level++;
	if (this.level === this.maxLevel) {
		this.removeForward();
	}
	this.addBack();
	this.searchWebView.mojo.goForward();
};

WebSearchAssistant.prototype.homeCmd = function() {
	this.controller.stageController.popScene();
};

WebSearchAssistant.prototype.addForward = function() {
	this.cmdMenuModel.items[1] = {icon: "forward", command: "forward-cmd"};
	this.controller.modelChanged(this.cmdMenuModel);
};

WebSearchAssistant.prototype.removeForward = function() {
	this.cmdMenuModel.items[1] = {};
	this.controller.modelChanged(this.cmdMenuModel);
};


WebSearchAssistant.prototype.addBack = function() {
	this.cmdMenuModel.items[0] = {icon: "back", command: "back-cmd"};
	this.controller.modelChanged(this.cmdMenuModel);
};

WebSearchAssistant.prototype.disableBack = function() {
	this.cmdMenuModel.items[0].disabled = true;
	this.controller.modelChanged(this.cmdMenuModel);
};
