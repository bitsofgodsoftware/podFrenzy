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

function AddPlaylistAssistant(feed) {
	this.feed = feed;

	this.cmdMenuModel = {items: [{label: $L("Back"), command: "cancel-cmd"},
	                             {label: $L("Save"), command: "cancel-save"}]};

	if (this.feed !== null) {
		this.newFeed = false;
		this.nameModel = { value: this.feed.title };
		this.includeAllModel = { value: (this.feed.feedIds.length === 0) };
	} else {
		this.feed = new Feed();
		this.feed.playlist = true;
		this.feed.albumArt = "images/playlist-icon.png";
		this.feed.feedIds = [];
		this.feed.playlists = [];
		this.feed.viewFilter = "New";
		this.feed.details = undefined;

		this.newFeed = true;
		this.nameModel = { value: null };
		this.includeAllModel = { value: false };
	}

	this.feedModel = {items:[]};
	feedModel.items.forEach(function (f) {
		if (!f.playlist) {
			var listItem = {id:f.id, title:f.title, selected:false};
			if (this.feed.feedIds.some(function(testId) {return testId == f.id;})) {
				listItem.selected = true;
			}
			this.feedModel.items.push(listItem);
		}
	}.bind(this));
}

AddPlaylistAssistant.prototype.setup = function() {
	this.menuAttr = {omitDefaultItems: true};

	this.menuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
			{label: $L("Help"), command: "help-cmd"},
			{label: $L("About") + '...', command: "about-cmd"}
		]
	};

	this.controller.setupWidget(Mojo.Menu.appMenu, this.menuAttr, this.menuModel);

	this.controller.get("dialogTitle").update(this.dialogTitle);

	this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);

	this.controller.setupWidget("newPlaylistName", {
			hintText : $L("Title"),
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeTitleCase,
			enterSubmits : false
		}, this.nameModel);

	this.controller.setupWidget("includeAllToggle",
		{}, this.includeAllModel);

	this.controller.setupWidget("feedList", {
		itemTemplate: "addPlaylist/feedRowTemplate",
		swipeToDelete: false,
		reorderable: false,
		onItemRendered: this.onItemRendered
		},
		this.feedModel
	);

	this.feedList = this.controller.get("feedList");
	this.feedListDiv = this.controller.get("feedListDiv");
	if (this.includeAllModel.value) {
		this.feedListDiv.hide();
	}
	this.listTapHandler = this.listTap.bindAsEventListener(this);

	this.includeAllToggle = this.controller.get('includeAllToggle');
	this.includeAllHandler = this.includeAllChanged.bindAsEventListener(this);
	this.localize.bind(this).defer();
};

AddPlaylistAssistant.prototype.localize = function() {
	if (this.newFeed) {
		Util.localize(this, "dialogTitle", "Add Dynamic Playlist", "addDynamicPlaylist");
	} else {
		Util.localize(this, "dialogTitle", "Edit Dynamic Playlist", "editDynamicPlaylist");
	}
	Util.localize(this, "title", "Title");
	Util.localize(this, "includeAllFeeds", "Include All Feeds", "includeAllFeeds");
	Util.localize(this, "selectFeeds", "Select Feeds To Include In Playlist", "selectFeedsToInclude");
};

AddPlaylistAssistant.prototype.activate = function() {
	Mojo.Event.listen(this.feedList, Mojo.Event.listTap, this.listTapHandler);
	Mojo.Event.listen(this.includeAllToggle, Mojo.Event.propertyChange, this.includeAllHandler);
};

AddPlaylistAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.feedList, Mojo.Event.listTap, this.listTapHandler);
	Mojo.Event.stopListening(this.includeAllToggle, Mojo.Event.propertyChange, this.includeAllHandler);
};

AddPlaylistAssistant.prototype.onItemRendered = function(listWidget, itemModel, itemNode) {
	if (itemModel.selected) {
		itemNode.addClassName("selected");
	} else {
		itemNode.removeClassName("selected");
	}
};

AddPlaylistAssistant.prototype.listTap = function(event){
	var t = event.originalEvent.target;
	var f = event.item;
	if (!t.hasClassName("palm-row")) {
		t = t.up("div.palm-row");
	}
	f.selected = t.toggleClassName("selected").hasClassName("selected");
};

AddPlaylistAssistant.prototype.includeAllChanged = function(event) {
	if (event.value) {
		this.feedListDiv.hide();
	} else {
		this.feedListDiv.show();
	}
};

AddPlaylistAssistant.prototype.checkPlaylist = function() {
	var feedIds = [];
	if (!this.includeAllModel.value) {
		this.feedModel.items.forEach(function(f) {
			if (f.selected) {
				feedIds.push(f.id);
			}
		});
	}
	if (this.nameModel.value) {
		if (feedIds.length || this.includeAllModel.value) {
			this.feed.feedIds = feedIds;
			this.feed.title = this.nameModel.value;
			this.feed.episodes = [];
			this.feed.numNew = 0;
			this.feed.numDownloaded = 0;
			this.feed.numStarted = 0;
			this.feed.downloadCount = 0;
			this.feed.downloading = false;

			if (feedIds.length === 0) {
				feedIds = [];
				feedModel.items.forEach(function(f) {
					if (!f.playlist) { feedIds.push(f.id); }
				});
			}

			feedIds.forEach(function(fid) {
				var f = feedModel.getFeedById(fid);
				f.playlists.push(this.feed);
				f.episodes.forEach(function(e) {
					this.feed.insertEpisodeTop(e);
				}.bind(this));
			}.bind(this));

			this.feed.sortEpisodes();

			var results = {};
			if (this.newFeed) {
				//feedModel.items.push(this.feed);
				feedModel.items.unshift(this.feed);
				results.feedChanged = true;
				results.feedIndex = 0;
				DB.saveFeeds();
			} else {
				results.feedChanged = true;
				results.feedIndex = feedModel.items.indexOf(this.feed);
				DB.saveFeed(this.feed);
			}
			this.controller.stageController.popScene(results);
		} else {
			if (this.newFeed) {
				Util.banner($L({value:"No Feeds Selected - Canceling playlist", key:"noFeedsSelectedCanceling"}));
				this.controller.stageController.popScene();
			} else {
				Util.showError($L({value:"No Feeds Selected", key:"noFeedsSelected"}), $L({value:"Please select at least 1 feed or choose \"Include All Feeds\"", key:"selectFeeds"}));
			}
		}
	} else {
		if (this.newFeed) {
			Util.banner($L({value:"No Playlist Title - Canceling playlist", key:"noTitleCanceling"}));
			this.controller.stageController.popScene();
		} else {
			Util.showError($L({value:"No Playlist Title", key:"noTitle"}), $L({value:"Please enter a Title for the Playlist", key:"enterTitle"}));
		}
	}
};

AddPlaylistAssistant.prototype.handleCommand = function(event) {
	if (event.type === Mojo.Event.back) {
		event.stop();
		event.stopPropagation();
		this.checkPlaylist();
	}
	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case "cancel-cmd":
				this.controller.stageController.popScene();
				break;
			case "cancel-save":
				event.stop();
				event.stopPropagation();
				this.checkPlaylist();
				break;
			case "shutupJSLint":
				break;
		}
	}
};
