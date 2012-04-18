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

function FeedListAssistant() {
	this.appController = Mojo.Controller.getAppController();
	this.stageController = this.appController.getStageController(DrPodder.MainStageName);
}

FeedListAssistant.prototype.cmdMenuModel = {
	items: [
		{icon: "new", submenu: "add-menu"},
		{icon: "refresh", command: "refresh-cmd", disabled: true}
	]
};

FeedListAssistant.prototype.appMenuAttr = {omitDefaultItems: true};
FeedListAssistant.prototype.appMenuModel = {
	visible: true,
	items: [
		Mojo.Menu.editItem,
		{label: 'OPML',
		 items: [{label: $L({value:"Import from clipboard", key:"importClipDrpodder"}), command: "import-clipboard-cmd"},
			 {label: $L({value:"Import from drpodder.xml", key:"importDrpodder"}), command: "import-cmd"},
			 {label: $L({value:"Export to clipboard", key:"exportClipDrpodder"}), command: "export-clipboard-cmd"},
			 {label: $L({value:"Export via email", key:"exportDrpodder"}), command: "export-cmd"}]
		},
		{label: $L("Preferences"), command: "prefs-cmd"},
		{label: $L({value:"Add Default Feeds", key:"addDefaultFeeds"}), command: "addDefault-cmd"},
		{label: $L({value:"Report a Problem", key:"reportProblem"}), command: "report-cmd"},
		{label: $L("Help"), command: "help-cmd"},
		{label: $L("About") + '...', command: "about-cmd"}
	]
};

FeedListAssistant.prototype.addMenuModel = {
	items: [{label: $L({value:"Enter feed URL...", key:"enterFeedURL"}), command: "add-feed"},
			{label: $L({value:"Search Directory...", key:"searchDirectory"}), command: "feed-search"},
	        {label: $L({value:"Search PodTrapper...", key:"searchPodTrapper"}), command: "pt-search"},
	        //{label: "Search the Web...", command: "web-search"},
	        {label: $L({value:"Dynamic Playlist...", key:"dynamicPlaylist"}), command: "add-playlist"}
	        ]
};


FeedListAssistant.prototype.viewMenuModel = {
	visible: true,
	items: []
};


FeedListAssistant.prototype.setup = function() {
	this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);
	this.controller.setupWidget("add-menu", this.handleCommand, this.addMenuModel);

	this.feedAttr = {
		itemTemplate: "feedList/feedRowTemplate",
		listTemplate: "feedList/feedListTemplate",
		swipeToDelete: true,
		reorderable: true,
		renderLimit: 40,
		formatters: {"albumArt": this.albumArtFormatter.bind(this), "details": this.detailsFormatter.bind(this)}
	};


	if (Prefs.albumArt) {
		if (Prefs.simple) {
			this.feedAttr.itemTemplate = "feedList/feedRowTemplate-simple";
		} else {
			this.feedAttr.itemTemplate = "feedList/feedRowTemplate";
		}
	} else {
		if (Prefs.simple) {
			this.feedAttr.itemTemplate = "feedList/feedRowTemplate-simpleNoAlbumArt";
		} else {
			this.feedAttr.itemTemplate = "feedList/feedRowTemplate-noAlbumArt";
		}
	}

	this.controller.setupWidget("feedListWgt", this.feedAttr, feedModel);

	this.feedList = this.controller.get("feedListWgt");

	this.handleSelectionHandler = this.handleSelection.bindAsEventListener(this);
	this.handleDeleteHandler = this.handleDelete.bindAsEventListener(this);
	this.handleReorderHandler = this.handleReorder.bindAsEventListener(this);

	this.controller.setupWidget("refreshSpinner", {property: "updating"});
	this.controller.setupWidget("downloadSpinner", {property: "downloading"});

	this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttr, this.appMenuModel);

	this.refresh = Mojo.Function.debounce(this._refreshDebounced.bind(this), this._refreshDelayed.bind(this), 1);
	this.needRefresh = false;
	this.refreshedOnce = false;

	this.onBlurHandler = this.onBlur.bind(this);
	this.onFocusHandler = this.onFocus.bind(this);
	Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageActivate, this.onFocusHandler);
	Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.onBlurHandler);

	try {
		this.sceneScroller = this.controller.getSceneScroller();
		this.topScrollerElement = this.controller.get('topFadeIndicator');
	} catch (e) {
		Mojo.Log.error("Error getting scroller fade: %j", e);
	}
};

FeedListAssistant.prototype.activate = function(result) {
	this.active = true;
	if (result) {
		if (result.feedToAdd) {
			var feed = new Feed();
			feed.title = result.feedToAdd.title;
			feed.url = result.feedToAdd.url;
			feed.update(function() {});
			feedModel.add(feed);
			result.feedAdded = true;
		}
		if (result.feedChanged) {
			this.feedList.mojo.noticeUpdatedItems(result.feedIndex, [feedModel.items[result.feedIndex]]);
			this.feedList.mojo.revealItem(result.feedIndex, true);
		}
		if (result.feedAdded) {
			this.feedList.mojo.noticeAddedItems(feedModel.items.length-1, [feedModel.items[feedModel.items.length-1]]);
			this.feedList.mojo.revealItem(feedModel.items.length-1, true);
			DB.saveFeeds();
		}
	}

	if (this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker.cancel();
		this.foregroundVolumeMarker = null;
	}
	//this.foregroundVolumeMarker = AppAssistant.mediaEventsService.markAppForeground();
	Mojo.Event.listen(this.feedList, Mojo.Event.listTap, this.handleSelectionHandler);
	Mojo.Event.listen(this.feedList, Mojo.Event.listDelete, this.handleDeleteHandler);
	Mojo.Event.listen(this.feedList, Mojo.Event.listReorder, this.handleReorderHandler);

	if (Prefs.freeRotation) {
		if (this.controller.stageController.setWindowOrientation) {
			this.controller.stageController.setWindowOrientation("free");
		}
	} else {
		this.controller.stageController.setWindowOrientation("up");
	}

	// without this hack, the top scroller is activated when at the top of the list if you scrolled down
	// in the episode list any
	try {
		this.topPosition = this.sceneScroller.mojo.getScrollPosition().top;
		var topIndicator = new Mojo.Widget.Scroller.Indicator(this.topScrollerElement, function(){return this.topPosition!==0;}.bind(this));
		topIndicator.update();
	} catch (e) {
		Mojo.Log.error("Error updating scroller fade: %j", e);
	}

	if (Prefs.reload) {
		delete Prefs.reload;
		DB.writePrefs();
		this.stageController.swapScene({name: "feedList", transition: Prefs.transition});
	} else {
		if (Prefs.firstRun) {
			Prefs.firstRun = false;
			DB.writePrefs();
			var dialog = new drnull.Dialog.Confirm(this, $L({value:"Add Default Feeds", key:"addDefaultFeeds"}),
				$L({value:"Welcome to podFrenzy!<br><br>Would you like to add some technology podcasts to get you started?", key:"drpodderWelcome"}),
				function() {
					var dialog = new drnull.Dialog.Info(this, $L({value:"Thanks for using podFrenzy!", key:"drpodderThanks"}),
						$L({value:"You can add podcasts by url or search for podcasts using the '+' icon in the bottom left.", key:"drpodderInstructions"}) +
						"<br><br>" + $L({value:"Feel free to delete any of the default podcasts.", key:"drpodderDeleteDefaults"}),
						this.promptMetrix.bind(this));
					dialog.show();
					this._loadDefaultFeeds();
				}.bind(this),
				function() {
					var dialog = new drnull.Dialog.Info(this, $L({value:"Thanks for using podFrenzy!", key:"drpodderThanks"}),
						$L({value:"You can add podcasts by url or search for podcasts using the '+' icon in the bottom left.", key:"drpodderInstructions"}),
						this.promptMetrix.bind(this));
					dialog.show();
				}.bind(this));
			dialog.show();
		} else {
			this.promptMetrix();
		}
	}
	this.onFocus();
};

FeedListAssistant.prototype.hitMetrix = function() {
	if (Prefs.useMetrix && !this.dontUseMetrixYet) {
		var boardVersion = Mojo.Controller.appInfo.version.replace(/\./g, "").replace(/^0/g, "");
		DrPodder.Metrix.postDeviceData();
		DrPodder.Metrix.checkBulletinBoard(this.controller, boardVersion);
	}
};

FeedListAssistant.prototype.promptMetrix = function() {
	if (Prefs.useMetrix === undefined) {
		var dialog = new drnull.Dialog.Info(this, $L({value:"Enable Anonymous Statistics", key:"enableAnonymousStatistics"}),
			$L({value:"podFrenzy uses <a href='http://metrix.webosroundup.com'>metrix</a> to deliver update notifications and keep track of OS versions being used.<br><br>No personally identifying information is tracked using metrix.<br><br>To disable metrix, go to Preferences and turn off 'Statistics'.", key:"metrixInfo"}),
			function() {
				Prefs.useMetrix = true;
				this.dontUseMetrixYet = true;
				DB.writePrefs();
			}.bind(this));
		dialog.show();
	} else {
		this.hitMetrix();
	}
};

FeedListAssistant.prototype.loadDefaultFeeds = function() {
	var dialog = new drnull.Dialog.Confirm(this, $L({value:"Add Default Feeds", key:"addDefaultFeeds"}),
		$L({value:"Would you like to add the following feeds?", key:"drpodderDefaults"}) +
		"<ul><li>This Week in Tech</li>" +
		"<li>PalmCast</li>" +
		"<li>webOSRadio</li>" +
		"<li>Engadget Podcast</li>" +
		"<li>gdgt weekly</li>" +
		"<li>Buzz Out Loud</li></ul>",
		function() {
			this._loadDefaultFeeds();
		}.bind(this),
		function() {});
	dialog.show();
};

FeedListAssistant.prototype._loadDefaultFeeds = function() {
	DB.defaultFeeds();
	this.controller.modelChanged(feedModel);
	this.updateFeeds();
};

FeedListAssistant.prototype.deactivate = function() {
	this.active = false;
	Mojo.Event.stopListening(this.feedList, Mojo.Event.listTap, this.handleSelectionHandler);
	Mojo.Event.stopListening(this.feedList, Mojo.Event.listDelete, this.handleDeleteHandler);
	Mojo.Event.stopListening(this.feedList, Mojo.Event.listReorder, this.handleReorderHandler);
};

FeedListAssistant.prototype.onBlur = function() {
	if (this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker.cancel();
		this.foregroundVolumeMarker = null;
	}
	// well this is just retarded.  There's no way for somebody to be notified of the blur,
	// since we are deactivated.  Boooooo
	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "onBlur"});
};

FeedListAssistant.prototype.onFocus = function() {
	if (this.active) {
		this.refreshNow();
	}

	if (!this.foregroundVolumeMarker) {
		//this.foregroundVolumeMarker = AppAssistant.mediaEventsService.markAppForeground();
	}

	Util.closeDashboard(DrPodder.DashboardStageName);
	Util.closeDashboard(DrPodder.DownloadingStageName);
	Util.closeDashboard(DrPodder.DownloadedStageName);

	this.cmdMenuModel.items[1].disabled = feedModel.updatingFeeds;
	this.controller.modelChanged(this.cmdMenuModel);

	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "onFocus"});
};

FeedListAssistant.prototype.updateFeeds = function(feedIndex) {
	feedModel.updateFeeds();
};

FeedListAssistant.prototype.cleanup = function() {
	Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageActivate, this.onFocusHandler);
	Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.onBlurHandler);
	// this doesn't seem to actually save the feeds.  db has gone away maybe?
	//DB.saveFeeds();
	if (this.foregroundVolumeMarker) {
		this.foregroundVolumeMarker.cancel();
		this.foregroundVolumeMarker = null;
	}
};

FeedListAssistant.prototype._refreshDebounced = function() {
	this.needRefresh = true;
	if (!this.refreshedOnce) {
		this._doRefresh();
		this.refreshedOnce = true;
	}
};

FeedListAssistant.prototype._refreshDelayed = function() {
	this.refreshedOnce = false;
	this._doRefresh();
};

FeedListAssistant.prototype._doRefresh = function() {
	if (this.needRefresh) {
		//Mojo.Log.error("fla refresh");
		this.controller.modelChanged(feedModel);
		this.needRefresh = false;
	}
};

FeedListAssistant.prototype.refreshNow = function() {
	this.needRefresh = true;
	this._doRefresh();
};

FeedListAssistant.prototype.albumArtFormatter = function(albumArt, model) {
	var formatted = albumArt;

	if (formatted && formatted.indexOf("/") === 0) {
		formatted = "/media/internal" + formatted;
		if (!formatted.toUpperCase().match(/.GIF$/)) {
			formatted = "/var/luna/data/extractfs" +
							encodeURIComponent(formatted) +
							":0:0:56:56:3";
		}
	}

	return formatted;
};

FeedListAssistant.prototype.detailsFormatter = function(details, model) {
	var formatted = details;
	if (formatted) {
		formatted = model.replace(formatted);
	}
	return formatted;
};


FeedListAssistant.prototype.handleSelection = function(event) {
	var targetClass = event.originalEvent.target.className;
	//var feed = event.item;
	var feedIndex = event.index;
	var feed = feedModel.items[feedIndex];
	if (targetClass.indexOf("feedStats") === 0) {
		var editCmd = {label: $L({value:"Edit Feed", key:"editFeed"}), command: "edit-cmd"};
		if (feed.playlist) {
			editCmd = {label: $L({value:"Edit Playlist", key:"editPlaylist"}), command: "editplaylist-cmd"};
		}
		// popup menu:
		// last update date/time
		// next update date/time
		// ## downloaded
		// ## new
		// ## started
		// edit feed
		this.controller.popupSubmenu({
			onChoose: this.popupHandler.bind(this, feed, feedIndex),
			placeNear: event.originalEvent.target,
			items: [
			        //{label: "Last: "+feed.lastUpdate, command: 'dontwant-cmd', enabled: false},
			        //{label: "Next: "+feed.lastUpdate+feed.interval, command: 'dontwant-cmd'},
			        //{label: feed.numDownloaded+" downloaded", command: 'viewDownloaded-cmd'},
			        //{label: feed.numNew+" new", command: 'viewNew-cmd'},
			        //{label: feed.numStarted+" started", command: 'viewStarted-cmd'},
			        {label: $L({value:"Clear New", key:"clearNew"}), command: 'listened-cmd'},
			        editCmd
			]});
	} else if (targetClass.indexOf("download") === 0) {
		this.controller.popupSubmenu({
			onChoose: this.popupHandler.bind(this, feed, feedIndex),
			placeNear: event.originalEvent.target,
			items: [
			        {label: $L({value:"Cancel Downloads", key:"cancelDownloads"}), command: 'cancelDownloads-cmd'}
			]});
	} else {
		this.stageController.pushScene({name: "episodeList", transition: Prefs.transition}, feed);
	}
};

FeedListAssistant.prototype.popupHandler = function(feed, feedIndex, command) {
	switch(command) {
		case "edit-cmd":
			this.stageController.pushScene({name: "addFeed", transition: Prefs.transition}, feed);
			break;
		case "editplaylist-cmd":
			this.stageController.pushScene({name: "addPlaylist", transition: Prefs.transition}, feed);
			break;
		case "listened-cmd":
			feed.listened();
			break;
		case "cancelDownloads-cmd":
			for (var i=0; i<feed.episodes.length; i++) {
				var episode = feed.episodes[i];
				episode.cancelDownload();
			}
			break;
	}

};

FeedListAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
			case "add-playlist":
				this.stageController.pushScene({name: "addPlaylist", transition: Prefs.transition}, null);
				break;
			case "add-feed":
				this.stageController.pushScene({name: "addFeed", transition: Prefs.transition}, null);
				break;
			case "feed-search":
				this.stageController.pushScene({name: "feedSearch", transition: Prefs.transition}, this, null);
				break;
			case "web-search":
				this.stageController.pushScene({name: "webSearch", transition: Prefs.transition}, {startPage: "http://m.google.com/search"});
				break;
			case "pt-search":
				this.stageController.pushScene({name: "webSearch", transition: Prefs.transition}, {startPage: "http://ota.versatilemonkey.com/ptbrowse/browse.pl",
											                 limitSite: "http://ota.versatilemonkey.com"});
				break;
			case "refresh-cmd":
				this.updateFeeds();
				break;
			case "addDefault-cmd":
				this.loadDefaultFeeds();
				break;
			case "report-cmd":
				event.assistant = this;
				event.data = "Feeds: <br/>";
				feedModel.items.forEach(function(f) {
					event.data += f.id + " URL: " + f.url + "<br/>";
				});
				break;
			case 'cmd-backButton' :
				this.controller.stageController.popScene();
				break;
			case "import-clipboard-cmd":
				var callback, title, hint, defaultDataValue="";
				callback = this.importOpml.bind(this);
				title = $L("Import from clipboard");
				hint = $L("Paste import here");
				
				this.controller.showDialog({
					template: "preferences/import-dialog",
					assistant: new ImportDialogAssistant(this.controller, callback, title, hint, defaultDataValue, false)
				});

//				(message);
				break;
			case "import-cmd":
				var req = new Ajax.Request("/media/internal/drpodder.xml", {
					method: 'get',
					onFailure: function() {
						Util.showError($L({value:"Error reading OPML File", key:"errorReadingOPML"}), $L({value:"I don't know what happened, but we couldn't read the drpodder.xml file.", key:"couldntReadDrpodder"}));
					},
					on404: function() {
						Util.showError($L({value:"OPML File not found", key:"opmlNotFound"}), $L({value:"Please place the drpodder.xml file in the root of the Pre's USB directory and retry.", key:"pleasePlaceDrpodder"}));
					},
					onSuccess: function(transport) {
						this.importOpml(transport.responseText);
					}.bind(this)
				});
				break;
			case "export-cmd":
				var message = $L({value:"Copy the following out to a file named drpodder.xml (Make sure the filename is all lowercase and Windows doesn't rename the file as drpodder.xml.txt).<br>" +
				              "To restore this set of feeds to drPodder, simply copy drpodder.xml to the root of the Pre's USB directory.", key:"opmlInstructions"}) +
							  "<br><br>&lt;opml version='1.1'>&lt;body><br>";
				for (var i=0; i<feedModel.items.length; i++) {
					var feed = feedModel.items[i];
					if (!feed.playlist) {
						message += "&lt;outline text='" + feed.title.replace(/&/g, "&amp;amp;").replace(/'/g, "&amp;apos;") + "'";
						message += " type='rss' xmlUrl='" + feed.url.replace(/&/g, "&amp;amp;") + "'";
						message += " autoDownload='" + feed.autoDownload + "'";
						message += " autoDelete='" + feed.autoDelete + "'";
						message += " maxDownloads='" + feed.maxDownloads + "'";
						message += " replacements='" + feed.replacements.replace(/&/g,"&amp;amp;").replace(/'/g, "&amp;apos;") + "'";
						message += " hideFromOS='" + feed.hideFromOS + "'";
						if (feed.username) {
							message += " username='" + feed.username + "'";
							message += " password='" + feed.password + "'";
						}
						message += "/><br>";
					}
				}
				message += "&lt;/body>&lt;/opml>";
				AppAssistant.applicationManagerService.email($L({value:"podFrenzy OPML Export", key:"opmlSubject"}), message);
				break;
			case "export-clipboard-cmd":
				var message = "<opml version='1.1'><body><br>";
				for (var i=0; i<feedModel.items.length; i++) {
					var feed = feedModel.items[i];
					if (!feed.playlist) {
						message += "<outline text='" + feed.title.replace(/&/g, "&amp;amp").replace(/'/g, "&amp;apos;") + "'";
						message += " type='rss' xmlUrl='" + feed.url.replace(/&/g, "&amp;amp;") + "'";
						message += " autoDownload='" + feed.autoDownload + "'";
						message += " autoDelete='" + feed.autoDelete + "'";
						message += " maxDownloads='" + feed.maxDownloads + "'";
						message += " replacements='" + feed.replacements.replace(/&/g,"&amp;amp;").replace(/'/g, "&amp;apos;") + "'";
						message += " hideFromOS='" + feed.hideFromOS + "'";
						if (feed.username) {
							message += " username='" + feed.username + "'";
							message += " password='" + feed.password + "'";
						}
						message += "/><br>";
					}
				}
				message += "</body></opml>";
				this.stageController.setClipboard(message);
				break;
		}

	}
};

FeedListAssistant.prototype.handleDelete = function(event) {
	DB.removeFeed(event.model.items[event.index]);
	event.model.items.splice(event.index, 1);
	DB.saveFeedsOnly();
};

FeedListAssistant.prototype.handleReorder = function(event) {
	event.model.items.splice(event.fromIndex, 1);
	var toIndex = event.toIndex;
	if (toIndex > event.fromIndex) {
		toIndex--;
	}
	event.model.items.splice(event.toIndex, 0, event.item);
	DB.saveFeeds();
};

FeedListAssistant.prototype.considerForNotification = function(params) {
	if (params) {
		switch (params.type) {
			case "feedUpdated":
				var feedIndex = params.feedIndex;
				var reveal = params.reveal;
				if (feedIndex === undefined) {
					feedIndex = feedModel.items.indexOf(params.feed);
				}
				if (feedIndex !== -1) {
					this.feedList.mojo.noticeUpdatedItems(feedIndex, [params.feed]);
				}
				if (reveal) {
					this.feedList.mojo.revealItem(feedIndex, true);
				}
				break;
			case "feedsUpdating":
				this.cmdMenuModel.items[1].disabled = params.value;
				this.controller.modelChanged(this.cmdMenuModel);
				if (!params.value) {
					this.refreshNow();
				}
				break;
		}
	}
};

FeedListAssistant.prototype.importOpml = function(opml) {
	try {
		var doc = (new DOMParser()).parseFromString(opml, "text/xml");
		var nodes = document.evaluate("//outline", doc, null, XPathResult.ANY_TYPE, null);
		var node = nodes.iterateNext();
		var imported = 0;
		while (node) {
			var title = Util.xmlGetAttributeValue(node, "title") || Util.xmlGetAttributeValue(node, "text");
			var url   = Util.xmlGetAttributeValue(node, "xmlUrl") || Util.xmlGetAttributeValue(node, "url");
			var autoDownload = Util.xmlGetAttributeValue(node, "autoDownload");
			var autoDelete = Util.xmlGetAttributeValue(node, "autoDelete");
			var maxDownloads = Util.xmlGetAttributeValue(node, "maxDownloads");
			var replacements = Util.xmlGetAttributeValue(node, "replacements");
			var hideFromOS = Util.xmlGetAttributeValue(node, "hideFromOS");
			var username = Util.xmlGetAttributeValue(node, "username");
			var password = Util.xmlGetAttributeValue(node, "password");
			if (title !== undefined && url !== undefined) {
				Mojo.Log.warn("Importing feed: (%s)-[%s]", title, url);
				feed = new Feed();
				feed.url = url;
				feed.title = title;
				if (autoDownload !== undefined) {feed.autoDownload = (autoDownload==='1');}
				if (autoDelete !== undefined) {feed.autoDelete = (autoDelete==='1');}
				if (maxDownloads !== undefined) {feed.maxDownloads = maxDownloads;}
				if (replacements !== undefined) {feed.replacements = replacements;}
				if (hideFromOS !== undefined) {feed.hideFromOS = hideFromOS;}
				if (username !== undefined) {feed.username = username;}
				if (password !== undefined) {feed.password = password;}
				feedModel.items.push(feed);
				feed.update(null, null, true);
				imported++;
			} else {
				Mojo.Log.warn("Skipping import: (%s)-[%s]", title, url);
			}
			node = nodes.iterateNext();
		}
		if (imported > 0) {
			DB.saveFeeds();
			Util.showError($L({value:"OPML Import Finished", key:"opmlImportFinished"}), $L({value:"The #{num} imported feed" + ((imported !== 1)?"s":"") + " can be found at the END of your feed list.", key:"opmlImportStatus"}).interpolate({num:imported}));
							} else {
			Util.showError($L({value:"OPML Import Finished", key:"opmlImportFinished"}), $L({value:"No valid feeds found in drpodder.xml", key:"noValidFeeds"}));
		}
	} catch (e){
		Mojo.Log.error("error with OPML: (%s)", e);
		Util.showError($L({value:"Error parsing OPML File", key:"errorParsingOPML"}), $L({value:"There was an error parsing the OPML file.  Please send the file to podFrenzy@bitsofgodsoftware.com.", key:"errorParsingOPMLBody"}));
	}
};

/*
AppAssistant.VideoLibrary = MojoLoader.require({
	name: "metascene.videos",
	version: "1.0"
})["metascene.videos"];
*/


