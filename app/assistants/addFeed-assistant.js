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

function AddFeedAssistant(feed) {
	this.feed = feed;

	// default empty replacement
	this.replacementModel = {items: []};

	//this.cmdMenuModel = {items: [{label: $L("Cancel"), command: "cancel-cmd"}]};

	if (this.feed !== null) {
		this.newFeed = false;
		this.originalUrl = feed.url;
		this.originalUsername = feed.username;
		this.originalPassword = feed.password;
		this.title = this.feed.title;
		this.url = this.feed.url;
		this.username = this.feed.username;
		this.password = this.feed.password;
		this.albumArt = this.feed.albumArt;
		this.autoDownload = this.feed.autoDownload;
		this.autoDelete = this.feed.autoDelete;
		this.hideFiles = this.feed.hideFromOS;
		this.maxDownloads = this.feed.maxDownloads;
		this.replacementModel.items = this.feed.getReplacementsArray();
	} else {
		this.newFeed = true;
		this.title = null;
		this.url = null;
		this.username = null;
		this.password = null;
		this.albumArt = null;
		this.autoDownload = false;
		this.autoDelete = true;
		this.hideFiles = true;
		this.maxDownloads = 1;
	}
}

AddFeedAssistant.prototype.menuAttr = {omitDefaultItems: true};

AddFeedAssistant.prototype.setup = function() {
	this.menuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
			{label: $L("Authentication"), command: "authentication-cmd"},
			{label: $L("Help"), command: "help-cmd"},
			{label: $L("About") + '...', command: "about-cmd"}
		]
	};

	this.controller.setupWidget(Mojo.Menu.appMenu, this.menuAttr, this.menuModel);

	//this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);

	this.controller.setupWidget("newFeedURL",
		{
			hintText : $L({value:"RSS feed URL", key:"RSSFeedURL"}),
			focus : true,
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
			enterSubmits : false
		},
		this.urlModel = { value : this.url });

	this.controller.setupWidget("username", {
			hintText : $L("Username"),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
			enterSubmits : false
		},
		this.usernameModel = { value : this.username });

	this.controller.setupWidget("password", {
			hintText : $L("Password"),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
			enterSubmits : false
		},
		this.passwordModel = { value : this.password });

	this.controller.setupWidget("newFeedName", {
			hintText : $L({value:"Title (Optional)", key:"titleOptional"}),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeTitleCase,
			enterSubmits : false
		},
		this.nameModel = { value : this.title });

	this.controller.setupWidget("albumArt", {
			hintText : $L({value:"Album Art (space clears)", key:"albumArtSpaceClears"}),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
			enterSubmits : false
		},
		this.albumArtModel = { value : this.albumArt });

	/*
	this.controller.setupWidget("maxDisplaySelector",
		{label: "Only show latest # episodes",
		 choices: [
			{label: "5", value: 5},
			{label: "10", value: 10},
			{label: "15", value: 15},
			{label: "20", value: 20},
			{label: "30", value: 30},
			{label: "40", value: 40},
			{label: "50", value: 50},
			{label: "60", value: 60},
			{label: "70", value: 70},
			{label: "80", value: 80},
			{label: "90", value: 90},
			{label: "100", value: 100}
		]
		},
		this.maxDisplay = { value : this.maxDisplay });
	*/

	this.controller.setupWidget("autoDeleteToggle",
		{},
		this.autoDeleteModel = { value : this.autoDelete });

	this.controller.setupWidget("hideFilesToggle",
		{},
		this.hideFilesModel = { value : this.hideFiles });

	this.controller.setupWidget("autoDownloadToggle",
		{},
		this.autoDownloadModel = { value : this.autoDownload });

	this.controller.setupWidget("maxDownloadsSelector",
		{label: $L({value:"Keep at most", key:"KAM"}),
		 choices: [
			{label: $L("All"), value: 0},
			{label: "1", value: 1},
			{label: "2", value: 2},
			{label: "3", value: 3},
			{label: "4", value: 4},
			{label: "5", value: 5},
			{label: "10", value: 10},
			{label: "15", value: 15},
			{label: "20", value: 20}
		]
		},
		this.maxDownloadsModel = { value : this.maxDownloads });


	this.controller.setupWidget("replacementList", {
		itemTemplate: "addFeed/replacementRowTemplate",
		swipeToDelete: true,
		reorderable: true,
		addItemLabel: $L("Add")+'...'
		},
		this.replacementModel
	);

	this.controller.setupWidget("fromText", {
		hintText: $L({value:"Replace this...", key:"replaceThis"}),
		modelProperty: "from",
		textReplacement: false,
		textCase : Mojo.Widget.steModeLowerCase,
		limitResize: false,
		autoResize: false,
		multiline: false
	});

	this.controller.setupWidget("toText", {
		hintText: $L({value:"With this...", key:"withThis"}),
		modelProperty: "to",
		textCase : Mojo.Widget.steModeLowerCase,
		textReplacement: false,
		limitResize: false,
		autoResize: false,
		multiline: false
	});

	this.addButtonModel = {
		buttonLabel: "Add"
	};
	this.controller.setupWidget('addButton', {}, this.addButtonModel);
	
	this.cancelButtonModel = {
		buttonLabel: "Cancel"
	};
	this.controller.setupWidget('cancelButton', {}, this.cancelButtonModel);

	this.addButtonHandler = this.addButtonTapped.bindAsEventListener(this);
	this.cancelButtonHandler = this.cancelButtonTapped.bindAsEventListener(this);
	this.addButton= this.controller.get("addButton");
	this.cancelButton= this.controller.get("cancelButton");
	this.replacementList = this.controller.get("replacementList");
	this.listAddHandler = this.listAddHandler.bindAsEventListener(this);
	this.listDeleteHandler = this.listDeleteHandler.bindAsEventListener(this);
	this.listReorderHandler = this.listReorderHandler.bindAsEventListener(this);

	if (!this.autoDownloadModel.value) {
		this.controller.get("maxDownloadsRow").hide();
		this.controller.get("autoDownloadRow").addClassName("last");
	}

	if (!this.usernameModel.value) {
		this.controller.get("usernameDiv").hide();
		this.controller.get("passwordDiv").hide();
	}

	if (this.newFeed) {
		this.controller.get("newFeedDiv").addClassName("last");
		this.controller.get("albumArtDiv").hide();
	}

	this.autoDownloadToggle = this.controller.get('autoDownloadToggle');
	this.autoDownloadHandler = this.autoDownloadChanged.bindAsEventListener(this);

	this.localize.bind(this).defer();
};

AddFeedAssistant.prototype.localize = function() {
	if (this.newFeed) {
		Util.localize(this, "dialogTitle", "Add Podcast XML Feed", "addPodcastXML");
	} else {
		Util.localize(this, "dialogTitle", "Edit Podcast XML Feed", "editPodcastXML");
	}
	Util.localize(this, "urlLabel", "URL");
	Util.localize(this, "usernameLabel", "Username");
	Util.localize(this, "passwordLabel", "Password");
	Util.localize(this, "titleLabel", "Title");
	Util.localize(this, "iconLabel", "Icon");
	Util.localize(this, "feedOptions", "Feed Options", "feedOptions");
	Util.localize(this, "deleteWhenFinished", "Delete when finished", "deleteWhenFinished");
	Util.localize(this, "hidePodcastFiles", "Hide Podcast Files", "hidePodcastFiles");
	Util.localize(this, "autoDownload", "Auto-Download", "autoDownload");
	Util.localize(this, "episodeTitleReplacements", "Episode Title Replacements", "episodeTitleReplacements");
};

AddFeedAssistant.prototype.activate = function() {
	Mojo.Event.listen(this.addButton, Mojo.Event.tap, this.addButtonHandler);
	Mojo.Event.listen(this.cancelButton, Mojo.Event.tap, this.cancelButtonHandler);
	Mojo.Event.listen(this.replacementList, Mojo.Event.listDelete, this.listDeleteHandler);
	Mojo.Event.listen(this.replacementList, Mojo.Event.listReorder, this.listReorderHandler);
	Mojo.Event.listen(this.autoDownloadToggle, Mojo.Event.propertyChange,this.autoDownloadHandler);
};

AddFeedAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.addButton, Mojo.Event.tap, this.addButtonHandler);
	Mojo.Event.stopListening(this.cancelButton, Mojo.Event.tap, this.cancelButtonHandler);
	Mojo.Event.stopListening(this.replacementList, Mojo.Event.listAdd, this.listAddHandler);
	Mojo.Event.stopListening(this.replacementList, Mojo.Event.listDelete, this.listDeleteHandler);
	Mojo.Event.stopListening(this.replacementList, Mojo.Event.listReorder, this.listReorderHandler);
	Mojo.Event.stopListening(this.autoDownloadToggle, Mojo.Event.propertyChange,this.autoDownloadHandler);
};

AddFeedAssistant.prototype.listAddHandler = function(event){
	var newItem = {from:"", to: "", fromLabel: $L("from"), toLabel: $L("to")};
	this.replacementModel.items.push(newItem);
	this.replacementList.mojo.noticeAddedItems(this.replacementModel.items.length, [newItem]);
};

AddFeedAssistant.prototype.listDeleteHandler = function(event){
	this.replacementModel.items.splice(this.replacementModel.items.indexOf(event.item), 1);
};

AddFeedAssistant.prototype.listReorderHandler = function(event){
	this.replacementModel.items.splice(this.replacementModel.items.indexOf(event.item), 1);
	this.replacementModel.items.splice(event.toIndex, 0, event.item);
};

AddFeedAssistant.prototype.autoDownloadChanged = function(event) {
	if (event.value) {
		this.controller.get("maxDownloadsRow").show();
		this.controller.get("autoDownloadRow").removeClassName("last");
	} else {
		this.controller.get("maxDownloadsRow").hide();
		this.controller.get("autoDownloadRow").addClassName("last");
	}
};

AddFeedAssistant.prototype.updateFields = function() {
	if (this.nameModel.value) {this.feed.title = this.nameModel.value;}
	if (this.albumArtModel.value) {this.feed.albumArt = this.albumArtModel.value;}
	this.feed.autoDownload = this.autoDownloadModel.value;
	this.feed.autoDelete = this.autoDeleteModel.value;
	this.feed.hideFromOS = this.hideFilesModel.value;
	this.feed.maxDownloads = this.maxDownloadsModel.value;
	this.feed.setReplacements(this.replacementModel.items);
};

AddFeedAssistant.prototype.checkFeed = function() {
	if (!this.urlModel.value) {
		Util.banner($L({value:"No URL Entered", key:"noURL"}));
		this.controller.stageController.popScene();
		return;
	}

	if (this.checkingFeed === true) {
		// Shouldn't happen, but log event if it does and exit
		Mojo.Log.error("Multiple Check Feed requests");
		return;
	}
	this.checkingFeed = true;
	//this.cmdMenuModel.items[0].disabled = true;
	//this.controller.modelChanged(this.cmdMenuModel);

	// Check entered URL and name to confirm that it is a valid feedlist
	Mojo.Log.warn("New Feed URL Request: (%s:%s)%s", this.usernameModel.value, this.passwordModel.value, this.urlModel.value);

	// If the url is the same, then assume that it's just a title change,
	// update the feed title and close the dialog. Otherwise update the feed.

	if (!this.newFeed && this.feed !== null &&
		this.feed.url === this.urlModel.value &&
		this.feed.username === this.usernameModel.value &&
		this.feed.password === this.passwordModel.value) {
		this.updateFields();
		DB.saveFeed(this.feed);
		this.controller.stageController.popScene({feedChanged: true, feedIndex: feedModel.items.indexOf(this.feed)});
	} else {
		Util.banner($L({value:"Checking feed URL", key:"checkFeedURL"}));

		// Check for "http://" on front or other legal prefix; any string of
		// 1 to 5 alpha characters followed by ":" is ok, else prepend "http://"
		var url = this.urlModel.value;
		if (url && /^[A-Za-z]{1,5}:/.test(url) === false) {
			// Strip any leading slashes
			url = url.replace(/^\/{1,2}/, "");
			url = "http://" + url;
			this.urlModel.value = url;
			// Update the entered URL & model
			this.controller.modelChanged(this.urlModel);
		}
		this.check(url);
	}
};

AddFeedAssistant.prototype.check = function(url) {
	if (!url) {
		url = this.urlModel.value;
	}
	//this.ajaxRequestTime = (new Date()).getTime();
	//Mojo.Log.warn("making ajax request [%s]", url);
	if (this.usernameModel.value) {
		url = url.replace("http://", "http://" +
						  encodeURIComponent(this.usernameModel.value) + ":" +
						  encodeURIComponent(this.passwordModel.value) + "@");
	}

	this.updateCheckID = this.controller.window.setTimeout(this.abortURLCheck.bind(this), 20000);
	var request = new Ajax.Request(url, {
		method : "get",
		evalJSON : "false",
		evalJS : "false",
		requestHeaders : {
			"X-Requested-With": undefined
		},
		onSuccess : this.checkSuccess.bind(this),
		onFailure : this.checkFailure.bind(this)
	});
	//Mojo.Log.warn("finished making ajax request");
};

AddFeedAssistant.prototype.abortURLCheck = function() {
	this.fail($L({value:"Invalid URL. Correct URL or Cancel", key:"invalidURL"}));
};

AddFeedAssistant.prototype.checkSuccess = function(transport) {
	//Mojo.Log.warn("check success %d", (new Date()).getTime()-this.ajaxRequestTime);
	this.controller.window.clearTimeout(this.updateCheckID);
	var location = transport.getHeader("Location");
	if (location) {
		Mojo.Log.warn("Redirection location=%s", location);
		this.check(location);
		return;
	}
	var feedStatus = UPDATECHECK_INVALID;
	// Prototype template object generates a string from return status
	var t = new Template($L("#{status}"));
	var m = t.evaluate(transport);
	Mojo.Log.warn("Valid URL (Status ", m, " returned).");

	if (transport.status) {
		// DEBUG - Work around due occasion Ajax XML error in response.
		if (transport.responseXML === null && transport.responseText !== null) {
			Mojo.Log.warn("Request not in XML format - manually converting");
			//var start = (new Date()).getTime();
			transport.responseXML = new DOMParser().parseFromString(
					transport.responseText, "text/xml");
			//Mojo.Log.error("parse time: %d", (new Date()).getTime()-start);
		}

		//  If a new feed, push the entered feed data on to the feedlist and
		//  call processFeed to evaluate it.
		if (this.newFeed) {
			this.feed = new Feed();
			this.feed.url = this.urlModel.value;
			this.feed.username = this.usernameModel.value;
			this.feed.password = this.passwordModel.value;
			this.feed.interval = 60000;
		} else {
			this.feed.url = this.urlModel.value;
			this.feed.username = this.usernameModel.value;
			this.feed.password = this.passwordModel.value;

			// need to clear out this feed (and probably delete downloaded episodes)
			// maybe not clear them out, what if they need to move the feed somewhere else?
			//this.feed.episodes = [];
			//this.feed.numEpisodes = 0;
			//this.feed.numNew = 0;
			//this.feed.numStarted = 0;
			//this.feed.numDownloaded = 0;
			//this.feed.albumArt = null;
		}

		this.feed.gui = true;
		feedStatus = this.feed.updateCheck(transport);
		this.feed.gui = false;
	}

	if (feedStatus < 0 || !transport.status) {
		// Feed can't be processed - remove it but keep the dialog open
		Mojo.Log.error("Invalid URL (Status", m, "returned).");
		Mojo.Log.error("Error updating feed: (%s:%s) %s", this.usernameModel.value, this.passwordModel.value, this.urlModel.value);
		this.fail($L({value:"Invalid URL. Correct URL or Cancel", key:"invalidURL"}));

	} else {
		this.updateFields();
		var results = {};
		if (this.newFeed) {
			feedModel.items.push(this.feed);
			results.feedAdded = true;
		} else {
			results.feedChanged = true;
			results.feedIndex = feedModel.items.indexOf(this.feed);
			DB.saveFeed(this.feed);
		}
		this.controller.stageController.popScene(results);
	}
};

AddFeedAssistant.prototype.fail = function(message, log, reveal) {
	if (message) {
		Util.banner(message);
	}
	if (log) {
		Mojo.Log.error(log);
	}

	if (!reveal) {
		reveal = "newFeedURL";
	}

	this.controller.getSceneScroller().mojo.revealTop(true);
	this.controller.get(reveal).mojo.focus();

	this.cmdMenuModel.items[0].disabled = false;
	this.controller.modelChanged(this.cmdMenuModel);
	this.checkingFeed = false;
};

AddFeedAssistant.prototype.checkFailure = function(transport) {
	// Prototype template object generates a string from return status
	this.controller.window.clearTimeout(this.updateCheckID);
	var t = new Template("#{status}");
	var m = t.evaluate(transport);

	// Log error and put message in status area
	if (transport.status === 401) {
		if (this.usernameModel.value) {
			Util.showError($L({value:"Access Denied", key:"accessDenied"}), $L({value:"Please check your username and password to ensure they are correct.", key:"checkUsernamePassword"}));
		} else {
			Util.showError($L({value:"Authentication Required", key:"authenticationRequired"}), $L({value:"Please enter your username and password for this feed.", key:"enterUsernamePassword"}));
			this.controller.get("usernameDiv").show();
			this.controller.get("passwordDiv").show();
		}
		this.fail(null, "Authentication error", "username");
	} else {
		Mojo.Log.error("Invalid URL (Status %s returned).", m);
		this.fail($L({value:"Invalid URL. Correct URL or Cancel", key:"invalidURL"}));
	}
	Mojo.Log.error("checkFailure done");
};

AddFeedAssistant.prototype.addButtonTapped = function(event) {
	this.checkFeed();
}

AddFeedAssistant.prototype.cancelButtonTapped= function(event) {
	if (!this.newFeed) {
		this.feed.url = this.originalUrl;
		this.feed.username = this.originalUsername;
		this.feed.password = this.originalPassword;
	}
	this.controller.stageController.popScene();
}

AddFeedAssistant.prototype.handleCommand = function(event) {
	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case "authentication-cmd":
				this.controller.get("usernameDiv").toggle();
				this.controller.get("passwordDiv").toggle();
				if (!this.controller.get("usernameDiv").visible()) {
					this.usernameModel.value = null;
					this.passwordModel.value = null;
					this.controller.modelChanged(this.usernameModel);
					this.controller.modelChanged(this.passwordModel);
				}
				break;
			case "cancel-cmd":
				if (!this.newFeed) {
					this.feed.url = this.originalUrl;
					this.feed.username = this.originalUsername;
					this.feed.password = this.originalPassword;
				}
				this.controller.stageController.popScene();
				break;
		}
	} else if (event.type === Mojo.Event.back) {
		event.stop();
		event.stopPropagation();
		this.checkFeed();
	}
};
