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

function EpisodeListAssistant(feedObject) {
	this.feedObject = feedObject;
	this.episodeModel = {items: []};

	this.appController = Mojo.Controller.getAppController();
	this.stageController = this.appController.getStageController(DrPodder.MainStageName);
}

EpisodeListAssistant.prototype.items = [];
//EpisodeListAssistant.prototype.episodeModel = {items: this.feedObject.episodes};
	// why can't we initialize this here?
	// use this to determine if we are wifi connected, if not, then we'll NOT auto-download mp3's
	// this.controller.serviceRequest('palm://com.palm.connectionmanager', {
    //method: 'getStatus',
    //parameters: {subscribe:true},
    //onSuccess: this.onSuccessHandler,
    //onFailure: this.onFailureHandler
	//});

EpisodeListAssistant.prototype.menuAttr = {omitDefaultItems: true};

EpisodeListAssistant.prototype.filterMenuModel = {
	items: [
		{label: $L("ALL"), command: "filter-all-cmd"},
		{label: $L("New"), command: "filter-new-cmd"},
		{label: $L("Old"), command: "filter-old-cmd"},
		{label: $L("Downloaded"), command: "filter-downloaded-cmd"},
		{label: $L("Downloaded & New"), command: "filter-downloadednew-cmd"},
		{label: $L("Downloaded & Old"), command: "filter-downloadedold-cmd"},
		{label: $L("Downloading"), command: "filter-downloading-cmd"},
		{label: $L("Paused"), command: "filter-paused-cmd"}
	]
};

EpisodeListAssistant.prototype.viewMenuModel = {
	visible: true,
	items: []
};

EpisodeListAssistant.prototype.filterEpisodes = function() {
	var newModel = this.feedObject.episodes;
	if (this.feedObject.viewFilter !== "ALL") {
		var filterFunc = function(e) {return !e.listened;};
		switch (this.feedObject.viewFilter) {
			case "Old":
				filterFunc = function(e) {return e.listened;};
				break;
			case "Downloaded":
				filterFunc = function(e) {return e.downloaded;};
				break;
			case "Downloaded & New":
				filterFunc = function(e) {return e.downloaded && !e.listened;};
				break;
			case "Downloaded & Old":
				filterFunc = function(e) {return e.downloaded && e.listened;};
				break;
			case "Downloading":
				filterFunc = function(e) {return e.downloading;};
				break;
			case "Paused":
				filterFunc = function(e) {return e.position;};
				break;
			case "New":
				break;
			default:
				break;
		}
		newModel = this.feedObject.episodes.filter(filterFunc);
	}


	var refreshNeeded = false;
	if (newModel.length !== this.episodeModel.items.length) {
		refreshNeeded = true;
	} else {
		for (var i=0,len=newModel.length; i<len; ++i) {
			if (this.episodeModel.items[i] !== newModel[i]) {
				refreshNeeded = true;
				break;
			}
		}
	}

	if (refreshNeeded) {
		this.episodeModel.items = newModel;
		this.refreshNow();
	}
};

EpisodeListAssistant.prototype.setup = function() {
	this.cmdMenuModel = {items:[]};
	this.backButton = {label:$L('Back'), command:'cmd-backButton'};
	this.viewButton = {label: $L("View") + ": " + $L(this.feedObject.viewFilter), submenu: "filter-menu"};
	this.refreshButton = {icon: "refresh", command: "refresh-cmd"};
	
	this.cmdMenuViewButtonPos= 0;
	this.cmdMenuRefreshButtonPos= 1;
	
	if(!_device_.thisDevice.kb){
		Mojo.Log.info("book setup NO KEYBOARD");
		this.cmdMenuModel.items.push(this.backButton);
		this.cmdMenuViewButtonPos= 1;
		this.cmdMenuRefreshButtonPos= 2;
	}
	this.cmdMenuModel.items.push(this.viewButton);
	this.cmdMenuModel.items.push(this.refreshButton);
	this.controller.setupWidget(Mojo.Menu.commandMenu, {}, this.cmdMenuModel);

	this.menuModel = {
		visible: true,
		items: [
			Mojo.Menu.editItem,
			{label: $L({value:"Edit Feed", key:"editFeed"}), command: "edit-cmd"},
			{label: $L({value:"Mark all as New", key:"markAllNew"}), command: "unlistened-cmd"},
			{label: $L({value:"Mark all as Old", key:"markAllOld"}), command: "listened-cmd"},
			{label: $L({value:"Report a Problem", key:"reportProblem"}), command: "report-cmd"},
			{label: $L("Help"), command: "help-cmd"},
			{label: $L("About") + '...', command: "about-cmd"}
		]
	};

	if (this.feedObject.playlist) {
		this.menuModel.items[1].label = $L({value:"Edit Playlist", key:"editPlaylist"});

	}

	this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);
	this.controller.setupWidget("filter-menu", this.handleCommand, this.filterMenuModel);

	var viewMenuPrev = {icon: "", command: "", label: " "};
	var viewMenuNext = {icon: "", command: "", label: " "};
	if (this.feedObject.displayOrder > 0) {
		viewMenuPrev = {icon: "back", command: "feedPrev-cmd"};
	}

	if (this.feedObject.displayOrder < feedModel.items.length-1) {
		viewMenuNext = {icon: "forward", command: "feedNext-cmd"};
	}

	this.viewMenuModel.items = [{items: [viewMenuPrev,
										{label: this.feedObject.title, width: 200, command: "feed-cmd"},
										viewMenuNext]}];
	this.controller.setupWidget(Mojo.Menu.viewMenu,
								{}, this.viewMenuModel);

	var itemTemplate ="episodeList/episodeRowTemplate";
	if (this.feedObject.playlist) {
		itemTemplate = "episodeList/playlistRowTemplate";
	}

	this.episodeAttr = {
		itemTemplate: itemTemplate,
		listTemplate: "episodeList/episodeListTemplate",
		renderLimit: 40,
		reorderable: false,
		swipeToDelete: true,
		// preventDeleteProperty: "noDelete", // based on !listened || downloaded || position
		// autoconfirmDelete: true,
		formatters: {"title": this.titleFormatter.bind(this), "pubDate": this.pubDateFormatter.bind(this),
		             "albumArt": this.albumArtFormatter.bind(this),
					 "bookmarkPercent": this.bookmarkPercentFormatter.bind(this),
					 "downloadingPercent": this.downloadingPercentFormatter.bind(this)}};

	this.controller.setupWidget("episodeListWgt", this.episodeAttr, this.episodeModel);
	this.episodeList = this.controller.get("episodeListWgt");

	this.handleSelectionHandler = this.handleSelection.bindAsEventListener(this);
	this.handleDeleteHandler = this.handleDelete.bindAsEventListener(this);
	this.handleHoldHandler = this.handleHold.bindAsEventListener(this);
	this.dragStartHandler = this.clearPopupMenuOnSelection.bindAsEventListener(this);

	this.controller.setupWidget("episodeSpinner", {property: "downloading"});

	this.controller.setupWidget(Mojo.Menu.appMenu, this.menuAttr, this.menuModel);

	this.refresh = Mojo.Function.debounce(this._refreshDebounced.bind(this), this._refreshDelayed.bind(this), 1);
	this.needRefresh = false;

	this.d_names = Mojo.Locale.getDayNames('medium');
	this.m_names = Mojo.Locale.getMonthNames('medium');
	if (!this.d_names) {
		Mojo.Locale.set(Prefs.systemTranslation);
		this.d_names = Mojo.Locale.getDayNames('medium');
		this.m_names = Mojo.Locale.getMonthNames('medium');
		Mojo.Locale.set(Prefs.translation);
	}

	this.orientationChanged(this.stageController.getWindowOrientation());
};

EpisodeListAssistant.prototype.orientationChanged = function(orientation) {
	if (Prefs.freeRotation) {
		var item = this.viewMenuModel.items[0].items[1];
		var width = Mojo.Environment.DeviceInfo.screenWidth - 120;
		var height = Mojo.Environment.DeviceInfo.screenHeight - 120;
		if (orientation === 'left' || orientation === 'right') {
			item.width = height;
		} else if (orientation === 'up' || orientation === 'down') {
			item.width = width;
		}
		this.controller.modelChanged(this.viewMenuModel);
	}
};

EpisodeListAssistant.prototype.downloadingPercentFormatter = function(downloadingPercent, model) {
	var formatted = downloadingPercent;
	if (formatted && this.feedObject.playlist) {
		formatted = "" + (formatted * 0.82);
	}
	return formatted;
};

EpisodeListAssistant.prototype.bookmarkPercentFormatter = function(bookmarkPercent, model) {
	var formatted = bookmarkPercent;
	if (formatted && this.feedObject.playlist) {
		formatted = "" + (formatted * 0.82);
	}
	return formatted;
};

EpisodeListAssistant.prototype.albumArtFormatter = function(albumArt, model) {
	var formatted = albumArt;

	if (formatted && formatted.indexOf("/") === 0) {
		formatted = "/media/internal" + formatted;
		if (!formatted.toUpperCase().match(/.GIF$/)) {
			formatted = "/var/luna/data/extractfs" +
							encodeURIComponent(formatted) +
							":0:0:48:48:3";
		}
	}

	return formatted;
};

EpisodeListAssistant.prototype.activate = function(changes) {
	this.refresh();
	this.filterEpisodes();
	Mojo.Event.listen(this.episodeList, Mojo.Event.listTap, this.handleSelectionHandler);
	Mojo.Event.listen(this.episodeList, Mojo.Event.listDelete, this.handleDeleteHandler);
	Mojo.Event.listen(this.episodeList, Mojo.Event.hold, this.handleHoldHandler);
	Mojo.Event.listen(this.episodeList, Mojo.Event.dragStart, this.dragStartHandler);
};

EpisodeListAssistant.prototype.deactivate = function(changes) {
	Mojo.Event.stopListening(this.episodeList, Mojo.Event.listTap, this.handleSelectionHandler);
	Mojo.Event.stopListening(this.episodeList, Mojo.Event.listDelete, this.handleDeleteHandler);
	Mojo.Event.stopListening(this.episodeList, Mojo.Event.hold, this.handleHoldHandler);
	Mojo.Event.stopListening(this.episodeList, Mojo.Event.dragStart, this.dragStartHandler);
};

EpisodeListAssistant.prototype.cleanup = function(changes) {
};

EpisodeListAssistant.prototype.handleCommand = function(event) {
	if (event.type === Mojo.Event.command) {
		switch (event.command) {
			case "unlistened-cmd":
				this.feedObject.unlistened();
				break;
			case "listened-cmd":
				this.feedObject.listened();
				break;
			case "edit-cmd":
				if (this.feedObject.playlist) {
					this.stageController.pushScene({name: "addPlaylist", transition: Prefs.transition}, this.feedObject);
				} else {
					this.stageController.pushScene({name: "addFeed", transition: Prefs.transition}, this.feedObject);
				}
				break;
			case "refresh-cmd":
				this.cmdMenuModel.items[this.cmdMenuRefreshButtonPos].disabled = true;
				this.controller.modelChanged(this.cmdMenuModel);
				this.feedObject.update(function() {
					// we may have navigated away from the scene
						this.cmdMenuModel.items[this.cmdMenuRefreshButtonPos].disabled = false;
					if(this.controller) {
						this.controller.modelChanged(this.cmdMenuModel);
					}
					this.feedObject.download();
					Util.closeDashboard(DrPodder.DashboardStageName);
				}.bind(this));
				break;
			case "playFromNewest-cmd":
				this.playFrom();
				break;
			case "playFromOldest-cmd":
				this.playFrom(true);
				break;
			case "feedPrev-cmd":
				var feed = feedModel.items[this.feedObject.displayOrder-1];
				this.stageController.swapScene({name: "episodeList", transition: Prefs.transition}, feed);
				break;
			case "feedNext-cmd":
				feed = feedModel.items[this.feedObject.displayOrder+1];
				this.stageController.swapScene({name: "episodeList", transition: Prefs.transition}, feed);
				break;
			case "feed-cmd":
				this.controller.popupSubmenu({
					onChoose: this.handleFeedPopup.bind(this),
					manualPlacement: true,
					popupClass: "titlePopup1",
					//placeNear: event.originalEvent.target,
					items: [{label: $L({value: "Play from Top", key: "playFromTop"}), command: "playFromNewest-cmd"},
							{label: $L({value: "Play from Bottom", key: "playFromBottom"}), command: "playFromOldest-cmd"},
							{label: $L({value: "Download New Episodes", key: "downloadNew"}), command: "downloadNew-cmd"}]
				});
				break;
			case "filter-all-cmd":
				this.handleFilterCommand("ALL");
				break;
			case "filter-new-cmd":
				this.handleFilterCommand("New");
				break;
			case "filter-old-cmd":
				this.handleFilterCommand("Old");
				break;
			case "filter-downloaded-cmd":
				this.handleFilterCommand("Downloaded");
				break;
			case "filter-downloadedold-cmd":
				this.handleFilterCommand("Downloaded & Old");
				break;
			case "filter-downloadednew-cmd":
				this.handleFilterCommand("Downloaded & New");
				break;
			case "filter-downloading-cmd":
				this.handleFilterCommand("Downloading");
				break;
			case "filter-paused-cmd":
				this.handleFilterCommand("Paused");
				break;
			case "report-cmd":
				event.assistant = this;
				event.data = "Feed Information:<br/>";
				if (this.feedObject.playlist) {
					event.data += "Playlist:<br/>";
					if (this.feedObject.feedIds.length) {
						this.feedObject.feedIds.forEach(function (fid) {
							Mojo.Log.error('fid: %s', fid);
							event.data += "URL: " + feedModel.getFeedById(fid).url + "<br/>";
						});
					} else {
						feedModel.items.forEach(function (feed) {
							Mojo.Log.error('feed: %s', feed.title);
							event.data += "URL: " + feed.url + "<br/>";
						});
					}
				} else {
					event.data += "URL: " + this.feedObject.url + "<br/>";
				}
				break;
			case 'cmd-backButton' :
				this.controller.stageController.popScene();
				break;
		}
	}
};

EpisodeListAssistant.prototype.handleFilterCommand = function(filter) {
	this.feedObject.viewFilter = filter;
	this.cmdMenuModel.items[this.cmdMenuViewButtonPos].label = $L("View") + ": " + $L(filter);
	this.controller.modelChanged(this.cmdMenuModel);
	this.filterEpisodes();
	DB.saveFeed(this.feedObject);
};

EpisodeListAssistant.prototype.handleFeedPopup = function(value) {
	switch(value) {
		case "playFromNewest-cmd":
			this.playFrom();
			break;
		case "playFromOldest-cmd":
			this.playFrom(true);
			break;
		case "downloadNew-cmd":
			for (var i=0,len=this.episodeModel.items.length; i<len; ++i) {
				var episode = this.episodeModel.items[i];
				if (!episode.downloading && !episode.downloaded && !episode.listened) {
					episode.download(true);
				}
			}
			break;
	}
};

EpisodeListAssistant.prototype.playFrom = function(oldest) {
	var playlist = [];
	for (var i=0,len=this.episodeModel.items.length; i<len; ++i) {
		var episode = this.episodeModel.items[i];
		if (episode.enclosure) {
			playlist.push(episode);
		}
	}
	if (oldest) {playlist.reverse();}
	if (playlist.length > 0) {
		var e = playlist.shift();
		this.stageController.pushScene({name: "episodeDetails", transition: Mojo.Transition.none}, e, {autoPlay: true, resume: true, playlist: playlist});
	} else {
		Util.showError($L({value:"Error playing episodes", key:"errorPlayingEpisodes"}), $L({value:"No New Episodes found", key:"noNewEpisodes"}));
	}
};

EpisodeListAssistant.prototype.titleFormatter = function(title, model) {
	var formatted = title;
	if (formatted) {
		formatted = model.feedObject.replace(formatted);
	}
	return formatted;
};

EpisodeListAssistant.prototype.pubDateFormatter = function(pubDate, model) {
	var formatted = pubDate;
	if (formatted) {
		var d = formatted;
		var y = d.getFullYear();
		var m = d.getMonth();
		var dom=d.getDate();
		var dow=d.getDay();
		var h=d.getHours();
		var min=d.getMinutes();
		var pm = (d.getHours() >= 12)?$L("pm"):$L("am");
		if ($L("pm") === "pm") {
			h = (h%12);
			if (h===0) {h=12;}
		}
		//if (m<10) {m="0"+m;}
		if (dom<10) {dom="0"+dom;}
		if (min<10) {min="0"+min;}
		//formatted = y+"/"+m+"/"+dom+" "+h+":"+min+" "+pm;
		formatted = this.d_names[dow] + " " + this.m_names[m] + " " + dom + ", " + y +
		            " " + h + ":" + min + " " + pm;
	/*
	// I'd use this formatter, but I couldn't make it do what I wanted, i.e.,
	// Mon Mar 29, 2010 03:54:00 PM
	} else if (formatted) {
		formatted = Mojo.Format.formatDate(formatted, 'full');
	*/
	}

	return formatted;
};

EpisodeListAssistant.prototype._refreshDebounced = function() {
	this.needRefresh = true;
	if (!this.refreshedOnce) {
		this._doRefresh();
		this.refreshedOnce = true;
	}
};

EpisodeListAssistant.prototype._refreshDelayed = function() {
	this.refreshedOnce = false;
	this._doRefresh();
};

EpisodeListAssistant.prototype._doRefresh = function() {
	if (this.needRefresh) {
		//Mojo.Log.error("ela refresh");
		//this.controller.modelChanged(this.episodeModel);
		this.episodeList.mojo.noticeUpdatedItems(0, this.episodeModel.items);
		this.episodeList.mojo.setLength(this.episodeModel.items.length);
		// this is causing a blank list.  See: https://developer.palm.com/distribution/viewtopic.php?f=11&t=6242&view=unread#unread
		this.needRefresh = false;
	}
};

EpisodeListAssistant.prototype.refreshNow = function() {
	this.needRefresh = true;
	this._doRefresh();
};

EpisodeListAssistant.prototype.handleDelete = function(event) {
	event.stop();
	if (event.item.downloading) {
		event.item.cancelDownload();
	} else {
		event.item.setListened(true);
		event.item.deleteFile(true);
		event.item.clearBookmark(true);
		event.item.updateUIElements();
		event.item.save();
	}
};

EpisodeListAssistant.prototype.cmdItems = {
	deleteCmd     : {label: $L("Delete"), command: "delete-cmd"},
	downloadCmd   : {label: $L("Download"), command: "download-cmd"},
	cancelCmd     : {label: $L("Cancel"), command: "cancel-cmd"},
	playCmd       : {label: $L("Play"), command: "resume-cmd"},
	resumeCmd     : {label: $L("Resume"), command: "resume-cmd"},
	restartCmd    : {label: $L("Restart"), command: "restart-cmd"},
	listenedCmd   : {label: $L({value:"Mark as Old", key:"markOld"}), command: "listen-cmd"},
	unlistenedCmd : {label: $L({value:"Mark as New", key:"markNew"}), command: "unlisten-cmd"},
	clearCmd      : {label: $L({value:"Clear Bookmark", key:"clearBookmark"}), command: "clear-cmd"},
	detailsCmd    : {label: $L({value:"Episode Details", key:"episodeDetails"}), command: "details-cmd"},
	noEnclosureCmd: {label: $L({value:"No enclosure found", key:"noEnclosureFound"}), command: "noenclosure-cmd", disabled: true}
};

EpisodeListAssistant.prototype.clearPopupMenuOnSelection = function(event) {
	this.popupMenuOnSelection = false;
};

EpisodeListAssistant.prototype.handleHold = function(event) {
	this.popupMenuOnSelection = true;
};

EpisodeListAssistant.prototype.handleSelection = function(event) {
	var targetClass = event.originalEvent.target.className;
	var episode = event.item;
	var items = [];

	if (!Prefs.singleTap || this.popupMenuOnSelection ||
		(targetClass.indexOf("episodeStatus") !== -1 &&
			!episode.downloading &&
			(episode.listened || !episode.enclosure) &&
			!episode.downloaded)) {
		this.popupMenuOnSelection = false;
		if (episode.downloading) {
			items.push(this.cmdItems.cancelCmd);
			items.push(this.cmdItems.playCmd);
			items.push(this.cmdItems.detailsCmd);
		} else {
			if (episode.enclosure) {
				if (!episode.downloaded) {
					items.push(this.cmdItems.downloadCmd);
				}
				if (episode.position) {
					items.push(this.cmdItems.resumeCmd);
					items.push(this.cmdItems.clearCmd);
					items.push(this.cmdItems.restartCmd);
				} else {
					items.push(this.cmdItems.playCmd);
				}
				if (episode.downloaded) {
					items.push(this.cmdItems.deleteCmd);
				}
			} else {
				items.push(this.cmdItems.noEnclosureCmd);
			}
			if (episode.listened) {
				items.push(this.cmdItems.unlistenedCmd);
			} else {
				items.push(this.cmdItems.listenedCmd);
			}
			items.push(this.cmdItems.detailsCmd);
		}
	} else {
		if (targetClass.indexOf("episodeStatus") === -1) {
			// we clicked on the row, just push the scene
			this.play(episode, true, true);
		} else {
			// we clicked on the icon, do something different
			if (episode.downloading) {
				// if we're downloading, just cancel the download
				episode.cancelDownload();
			} else {
				if (episode.enclosure) {
					if (episode.listened) {
						if (episode.downloaded) {
							episode.setListened();
							episode.deleteFile();
						} else {
							this.handleHold(event);
						}
					} else {
						if (episode.downloaded) {
							this.play(episode, true, true);
						} else {
							episode.download(true);
						}
					}
				}
			}
		}
	}
	if (items.length > 0) {
		this.controller.popupSubmenu({
			onChoose: this.menuSelection.bind(this, episode),
			placeNear: event.originalEvent.target,
			items: items
		});
	}
};

EpisodeListAssistant.prototype.menuSelection = function(episode, command) {
	//Mojo.Log.error("we tried to do:", command, "to", episode.title);
	switch (command) {
		case "listen-cmd":
			episode.setListened();
			break;
		case "unlisten-cmd":
			episode.setUnlistened();
			break;
		case "cancel-cmd":
			episode.cancelDownload();
			break;
		case "download-cmd":
			episode.download(true);
			break;
		case "stream-cmd":
			this.play(episode, true, true);
			break;
		case "restart-cmd":
			this.play(episode, true, false);
			break;
		case "resume-cmd":
			this.play(episode, true, true);
			break;
		case "details-cmd":
			this.play(episode, false, true);
			break;
		case "play-cmd":
			this.play(episode, true, true);
			break;
		case "clear-cmd":
			episode.clearBookmark();
			break;
		case "delete-cmd":
			episode.setListened();
			episode.deleteFile();
			break;
	}
};

EpisodeListAssistant.prototype.play = function(episode, autoPlay, resume) {
	this.stageController.pushScene({name: "episodeDetails", transition: Mojo.Transition.none}, episode, {"autoPlay": autoPlay, "resume": resume, playlist: []});
};

EpisodeListAssistant.prototype.updatePercent = function(episode) {
	//Mojo.Log.error("Setting percent to:", episode.downloadingPercent);
	var episodeIndex = this.episodeModel.items.indexOf(episode);
	if (episodeIndex !== -1) {
		var node = this.controller.get("episodeListWgt").mojo.getNodeByIndex(episodeIndex);
		var nodes;
		if (this.feedObject.playlist) {
            nodes = node.getElementsByClassName("progressDonePlaylist");
			nodes[0].style.width = episode.downloadingPercent*0.82 + "%";
		} else {
			nodes = node.getElementsByClassName("progressDone");
			nodes[0].style.width = episode.downloadingPercent + "%";
		}
	}
};

EpisodeListAssistant.prototype.eventApplies = function(ef) {
	return (ef === this.feedObject || (
		this.feedObject.playlist && (this.feedObject.feedIds.length === 0 ||
									 this.feedObject.feedIds.some(function(f) {return ef.id == f;}))
	));
};

EpisodeListAssistant.prototype.considerForNotification = function(params) {
	if (params) {
		switch (params.type) {
			case "feedEpisodesUpdated":
				if (this.eventApplies(params.feed)) {
					this.refresh();
					this.filterEpisodes();
				}
				break;
			case "episodeUpdated":
				if (this.eventApplies(params.episode.feedObject)) {
					var episodeIndex = params.episodeIndex;
					if (episodeIndex === undefined) {
						episodeIndex = this.episodeModel.items.indexOf(params.episode);
					}
					if (episodeIndex !== -1) {
						this.episodeList.mojo.noticeUpdatedItems(episodeIndex, [params.episode]);
						this.filterEpisodes();
					}
				}
				break;
			case "downloadProgress":
				if (this.eventApplies(params.episode.feedObject)) {
					this.updatePercent(params.episode);
				}
				break;
			case "onFocus":
				this.refresh();
				this.filterEpisodes();
				break;
		}
	}
};
