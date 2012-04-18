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

function EpisodeDetailsAssistant(episode, options) {
	this.episodeObject = episode;
	if (!options) { options = {}; }
	this.resume = options.resume && (this.episodeObject.position !== 0);
	this.autoPlay = options.autoPlay;
	this.playlist = options.playlist;
	this.isForeground = true;
	Mojo.Log.info("isForeground = %s", this.isForeground);
	this.bak60Pos=0;
	this.bak30Pos=1;
	this.playPausePos=2;
	this.fwd30Pos=3;
	this.fwd60Pos=4;	
};

EpisodeDetailsAssistant.prototype.progressAttr = {
	sliderProperty: "value",
	progressStartProperty: "progressStart",
	progressProperty: "progressEnd",
	round: false,
	updateInterval: 0.2
};

EpisodeDetailsAssistant.prototype.progressModel = {
	value: 0,
	minValue: 0,
	maxValue: 1
};

EpisodeDetailsAssistant.prototype.menuAttr = {omitDefaultItems: true};
EpisodeDetailsAssistant.prototype.menuModel = {
	visible: true,
	items: [
		Mojo.Menu.editItem,
		{label: $L({value:"Play using webOS player", key:"playExternal"}), command: "playExternal-cmd"},
		{label: $L({value:"Share Episode", key:"shareEpisode"}),
		 items: [{label: $L({value:"Via Email", key:"viaEmail"}), command: "share-cmd"},
				{label: $L({value:"Copy Episode URL", key:"copyEpisodeURL"}), command: "copyEpisode-cmd"},
				{label: $L({value:"Copy Feed URL", key:"copyFeedURL"}), command: "copyFeed-cmd"}]
		},
		{label: $L({value:"Report a Problem", key:"reportProblem"}), command: "report-cmd"},
		{label: $L("Help"), command: "help-cmd"},
		{label: $L("About") + '...', command: "about-cmd"}
	]
};

EpisodeDetailsAssistant.prototype.menuCommandItems = {
	//streamPlay:  {iconPath: "images/mini-player-icon-streamPlay.png", command: "streamPlay-cmd"},
	//streamPause: {iconPath: "images/mini-player-icon-streamPause.png", command: "streamPause-cmd"},
	download:    {icon: "save", command: "download-cmd"},
	cancel:      {icon: "stop", command: "cancel-cmd"},
	pause:       {iconPath: "images/mini-player-icon-pause.png", command: "pause-cmd"},
	play:        {iconPath: "images/mini-player-icon-play.png", command: "play-cmd"},
	deleteFile:  {icon: "delete", command: "delete-cmd"},
	skipForward: {iconPath: "images/menu-icon-music-forward.png", command: "skipForward-cmd"},
	skipBack:    {iconPath: "images/menu-icon-music-rewind.png", command: "skipBack-cmd"},
	skipForward2:{iconPath: "images/menu-icon-music-forward2.png", command: "skipForward2-cmd"},
	skipBack2:   {iconPath: "images/menu-icon-music-rewind2.png", command: "skipBack2-cmd"},
	nil:         {icon: "", command: "", label: " "},
	back:        {label:$L('Back'), command:'cmd-backButton'}
};

EpisodeDetailsAssistant.prototype.cmdMenuModel = {
	items: [
		{},
		{},
		{},
		{},
		{}
	]
};

EpisodeDetailsAssistant.prototype.viewMenuModel = {
	visible: true,
	items: []
};

EpisodeDetailsAssistant.prototype.setup = function() {
	this.isForeground = this.controller.stageController.isActiveAndHasScenes();
	this.progressInfo = this.controller.get("progress-info");
	this.header = this.controller.get("header");
	this.episodeDetailsTitle = this.controller.get("episodeDetailsTitle");
	this.statusDiv = this.controller.get("statusDiv");
	this.statusDiv.hide();
	this.setStatus('Setup');
	this.controller.getSceneScroller().mojo.setMode("dominant");
	this.controller.update(this.episodeDetailsTitle, this.episodeObject.title);

	DB.getEpisodeDescription(this.episodeObject, function(description) {
		// Mojo.Format.runTextIndexer doesn't alway work right...
		if (description.indexOf("<a") === 0) {
			description = Mojo.Format.runTextIndexer(description);
		}
		this.controller.update(this.controller.get("episodeDetailsDescription"), description);
	}.bind(this));
	/*
	var viewMenuPrev = {icon: "", command: "", label: " "};
	var viewMenuNext = {icon: "", command: "", label: " "};
	if (this.episodeObject.displayOrder > 0) {
		viewMenuPrev = {icon: "back", command: "feedPrev-cmd"};
	}

	if (this.episodeObject.displayOrder < this.episodeObject.feedObject.episodes.length) {
		viewMenuNext = {icon: "forward", command: "feedNext-cmd"};
	}

	this.viewMenuModel.items = [{items: [viewMenuPrev,
										{label: this.episodeObject.title, height: 100, width: 200, command: "edit-cmd"},
										viewMenuNext]}];
	this.controller.setupWidget(Mojo.Menu.viewMenu,
								{}, this.viewMenuModel);
	*/


	this.progressModel.value = 0;
	this.progressModel.progressStart = 0;
	this.progressModel.progressEnd = 0;

	this.controller.setupWidget("progress", this.progressAttr, this.progressModel);
	this.progress = this.controller.get("progress");
	this.titleTapHandler = this.titleTap.bind(this);
	this.audioObject = {};
	this.player = {};

	if(!_device_.thisDevice.kb){
		Mojo.Log.info("book setup NO KEYBOARD");
		this.cmdMenuModel = {items: [{},{},{},{},{},{}]};
		this.cmdMenuModel.items[0]= this.menuCommandItems.back;
		this.bak60Pos=1;
		this.bak30Pos=2;
		this.playPausePos=3;
		this.fwd30Pos=4;
		this.fwd60Pos=5;
	} else {
		this.cmdMenuModel = {items: [{},{},{},{},{}]};
	}

	if (this.episodeObject.enclosure || this.episodeObject.downloaded) {
		this.controller.setupWidget(Mojo.Menu.commandMenu, this.handleCommand, this.cmdMenuModel);
		if (!this.isVideo()) {

			//this.libs = MojoLoader.require({ name: "mediaextension", version: "1.0"});
			this.audioObject = this.controller.get('audioTag');
			this.player = new Player(this.audioObject, this.episodeObject);
			if (!this.isForeground) {
				this.player.showDashboard(this.controller.stageController);
			}
			//this.audioExt = this.libs.mediaextension.MediaExtension.getInstance(this.audioObject);
			//this.audioExt.audioClass = Media.AudioClass.MEDIA;

			//this.audioObject.addEventListener(Media.Event.PROGRESS, this.updateProgress.bind(this));
			//this.audioObject.addEventListener(Media.Event.DURATIONCHANGE, this.updateProgress.bind(this));
			this.setStatus($L("Loading"));
			this.disablePlay(true);
			this.progressChangedHandler = this.progressChange.bind(this);
			this.sliderDragStartHandler = this.sliderDragStart.bind(this);
			this.sliderDragEndHandler = this.sliderDragEnd.bind(this);

			this.handleErrorHandler = this.handleError.bind(this);
			this.handleAudioEventsHandler = this.handleAudioEvents.bind(this);

			this.updateProgressHandler = this.updateProgress.bind(this);

			this.audioObject.addEventListener(Media.Event.ERROR, this.handleErrorHandler);

			this.audioObject.addEventListener(Media.Event.PAUSE, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.PLAY, this.handleAudioEventsHandler);

			this.audioObject.addEventListener(Media.Event.ENDED, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.ABORT, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.CANPLAY, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.CANPLAYTHROUGH, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.CANSHOWFIRSTFRAME, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.DURATIONCHANGE, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.EMPTIED, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.LOAD, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.LOADEDFIRSTFRAME, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.LOADEDMETADATA, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.LOADSTART, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.SEEKED, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.SEEKING, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.STALLED, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.WAITING, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.X_PALM_DISCONNECT, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.X_PALM_RENDER_MODE, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.X_PALM_SUCCESS, this.handleAudioEventsHandler);
			this.audioObject.addEventListener(Media.Event.X_PALM_WATCHDOG, this.handleAudioEventsHandler);

			//this.audioObject.addEventListener(Media.Event.TIMEUPDATE, this.updateProgressHandler);

			this.keyDownEventHandler = this.keyDownHandler.bind(this);

			// as soon as setup finishes, we are ready to play
			this.readyToPlay.bind(this).defer();
		} else {
			this.progressInfo.hide();
			this.progressInfoHidden = true;
			this.adjustHeader();
			this.setStatus();
			if (this.autoPlay) {
				this.disablePlay();
				this.controller.window.setTimeout(this.enablePlay.bind(this), 10000);
				this.play();
			} else {
				this.enablePlay();
			}
		}

		this.updateTimer = null;
	} else {
		this.progressInfo.hide();
		this.progressInfoHidden = true;
		this.adjustHeader();
		this.setStatus();
	}

	this.controller.setupWidget(Mojo.Menu.appMenu, this.menuAttr, this.menuModel);

	this.onBlurHandler = this.onBlur.bind(this);
	Mojo.Event.listen(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.onBlurHandler);

	this.orientationChanged(this.controller.stageController.getWindowOrientation());
};

EpisodeDetailsAssistant.prototype.orientationChanged = function(orientation) {
	var width = Mojo.Environment.DeviceInfo.screenWidth;
	var height = Mojo.Environment.DeviceInfo.screenHeight;
	Mojo.Log.warn("Episode - orientationChanged - height: ", height, " - width: ", width);

	if (Prefs.freeRotation) {
		Mojo.Log.warn("Episode - orientationChanged - in free rotation");
		var item = this.controller.get('progress');
		item.removeClassName('portrait');
		item.removeClassName('landscape480');
		item.removeClassName('landscape400');

		
		if (orientation === 'left' || orientation === 'right') {
			item.addClassName('landscape' + height);
		} else if (orientation === 'up' || orientation === 'down') {
			item.addClassName('portrait' + width);
		}

		this.adjustHeader();
	}
};

EpisodeDetailsAssistant.prototype.adjustHeader = function() {
	var height=this.controller.get("topContent").getHeight();
	this.controller.get("topSpacer").style.height = height + 'px';
	this.controller.get("descriptionFade").style.top = height + 'px';
};

EpisodeDetailsAssistant.prototype.activate = function() {
	this.adjustHeader();
	this.isForeground = true;
	Mojo.Log.info("isForeground = true");
	Mojo.Event.listen(this.header, Mojo.Event.tap, this.titleTapHandler);

	if ((this.episodeObject.enclosure || this.episodeObject.downloaded) && !this.isVideo()) {
		Mojo.Event.listen(this.progress, Mojo.Event.propertyChange, this.progressChangedHandler);
		Mojo.Event.listen(this.progress, Mojo.Event.sliderDragStart, this.sliderDragStartHandler);
		Mojo.Event.listen(this.progress, Mojo.Event.sliderDragEnd, this.sliderDragEndHandler);
		Mojo.Event.listen(this.controller.sceneElement, Mojo.Event.keydown, this.keyDownEventHandler);

		if (Prefs.dashboardControls) {
			// throw away dashboard
		}

		this.mediaEvents = AppAssistant.mediaEventsService.registerForMediaEvents(this.controller, this.mediaKeyPressHandler.bind(this));
	}
};

EpisodeDetailsAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.header, Mojo.Event.tap, this.titleTapHandler);

	if ((this.episodeObject.enclosure || this.episodeObject.downloaded) && !this.isVideo()) {
		Mojo.Event.stopListening(this.progress, Mojo.Event.propertyChange, this.progressChangedHandler);
		Mojo.Event.stopListening(this.progress, Mojo.Event.sliderDragStart, this.sliderDragStartHandler);
		Mojo.Event.stopListening(this.progress, Mojo.Event.sliderDragEnd, this.sliderDragEndHandler);
		Mojo.Event.stopListening(this.controller.sceneElement, Mojo.Event.keydown, this.keyDownEventHandler);
		Mojo.Event.stopListening(this.controller.stageController.document, Mojo.Event.stageDeactivate, this.onBlurHandler);

		if (Prefs.dashboardControls && this.playing) {
			// pop up dashboard
		}

		if (this.mediaEvents) {
			this.mediaEvents.cancel();
			this.mediaEvents = undefined;
		}
	}
};

EpisodeDetailsAssistant.prototype.cleanup = function() {
	this.setTimer(false);
	if (this.episodeObject.enclosure) {
		if (!this.isVideo()) {
			if (!this.finished) {
				var beforeSave = function() {};
				var functionWhenFinished = function() {};
				if (!this.poppingScene) {
					Mojo.Log.warn("Closing app, we need to bookmark though!");
					beforeSave = Util.dashboard.bind(this, DrPodder.DashboardStageName, $L({value: "Saving Bookmark", key: "savingBookmark"}),
							$L({value: "Dashboard should close automatically", key: "savingBookmarkDescription"}), true);
					functionWhenFinished = Util.closeDashboard.bind(this, DrPodder.DashboardStageName);
				}
				this.bookmark(beforeSave, functionWhenFinished);

				// remove this when we want to have continual playback
				if (this.audioObject) {
					this.audioObject.pause();
					this.audioObject.src = undefined;
					this.audioObject.load();
				}
			}

			if (!this.playingNextEpisode) {
				this.player.hideDashboard();
			}

			this.audioObject.removeEventListener(Media.Event.ERROR, this.handleErrorHandler);

			this.audioObject.removeEventListener(Media.Event.PAUSE, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.PLAY, this.handleAudioEventsHandler);

			this.audioObject.removeEventListener(Media.Event.ENDED, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.ABORT, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.CANPLAY, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.CANPLAYTHROUGH, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.CANSHOWFIRSTFRAME, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.DURATIONCHANGE, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.EMPTIED, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.LOAD, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.LOADEDFIRSTFRAME, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.LOADEDMETADATA, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.LOADSTART, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.SEEKED, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.SEEKING, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.STALLED, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.WAITING, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.X_PALM_DISCONNECT, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.X_PALM_RENDER_MODE, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.X_PALM_SUCCESS, this.handleAudioEventsHandler);
			this.audioObject.removeEventListener(Media.Event.X_PALM_WATCHDOG, this.handleAudioEventsHandler);
		}
	}
};

EpisodeDetailsAssistant.prototype.bookmark = function(beforeSave, functionWhenFinished) {
	if (!this.isVideo()) {
		var cur = this.audioObject.currentTime;
		Mojo.Log.warn("BOOKMARK!!! %d", cur);
		if (cur !== undefined && cur !== null && cur > 15) {
			this.episodeObject.length = this.audioObject.duration;
			if (beforeSave) {beforeSave();}
			this.episodeObject.bookmark(cur, functionWhenFinished);
		}
	}
};

EpisodeDetailsAssistant.prototype.backToList = function() {
	var feed = this.episodeObject.feedObject;

	this.finished = true;

	this.episodeObject.setListened();
	this.episodeObject.clearBookmark();

	if (feed.autoDelete && this.episodeObject.downloaded) {
		this.episodeObject.deleteFile();
	}

	if (!this.playlist || this.playlist.length === 0) {
		this.controller.stageController.popScene(true);
	} else {
		this.playingNextEpisode = true;
		var episode = this.playlist.shift();
		this.controller.stageController.swapScene({name: "episodeDetails", transition: Mojo.Transition.none}, episode, {autoPlay: true, resume: true, playlist: this.playlist});
	}
};

EpisodeDetailsAssistant.prototype.setTimer = function(bool) {
	if (this.updateTimer) {
		this.controller.window.clearInterval(this.updateTimer);
		this.updateTimer = null;
	}
	Mojo.Log.info("setTimer: set it=%s, isForeground=%s", bool, this.isForeground);
	if (bool && this.isForeground) {
		this.updateTimer = this.controller.window.setInterval(this.updateProgress.bind(this), 500);
	}
};

EpisodeDetailsAssistant.prototype.readyToPlay = function() {
	if (this.audioObject && this.audioObject.pause) {this.audioObject.pause();}
	//for (var p in this.audioObject) {Mojo.Log.error("ao.%s=%s", p, this.audioObject[p]);}
	//for (var p in this.audioExt) {Mojo.Log.error("ae.%s=%s", p, this.audioExt[p]);}
	if (this.episodeObject.file) {
		Mojo.Log.warn("Setting [%s] file src to:[%s]", this.episodeObject.type, this.episodeObject.file);
		this.setStatus();
		this.audioObject.src = this.episodeObject.file;
		this.progressModel.progressStart = 0;
		this.progressModel.progressEnd = 1;
		this.controller.modelChanged(this.progressModel);
	} else {
		var url = this.episodeObject.getEnclosure();
		Mojo.Log.warn("Setting [%s] stream src to:[%s]", this.episodeObject.type, url);
		this.setStatus($L("Connecting"));
		this.audioObject.src = url;
		this.progressModel.progressStart = 0;
		this.progressModel.progressEnd = 0;
		this.controller.modelChanged(this.progressModel);
	}
	this.audioObject.load();
	this.audioObject.autoplay = this.autoPlay;
	this.setTimer(true);
};

EpisodeDetailsAssistant.prototype.handleError = function(event) {
	// much of this shameless copied from http://ampache-mobile.googlecode.com/svn/trunk/src/javascript/AudioPlayer.js
	try {
		var error = event.currentTarget.error;
		Mojo.Log.error("Error playing audio!!!!!!!!!!!!!!!!!!! code=%s", error.code);
		var message = $L({value: "There was a problem playing the file.", key: "errorPlaying"});
		switch (error.code) {
			case error.MEDIA_ERR_ABORTED:
				message += "<BR>" + $L({value: "The audio stream was aborted by webOS.  Most often this happens when you do not have a fast enough connection to support an audio stream.", key: "errorAborted"});
				break;
			case error.MEDIA_ERR_NETWORK:
				message += "<BR>" + $L({value: "A network error has occurred.  The network cannot support an audio stream at this time.", key: "errorNetwork"});
				break;
			case error.MEDIA_ERR_DECODE:
				message += "<BR>" + $L({value: "An error has occurred while attempting to play the episode.  The episode is either corrupt or an unsupported format (ex: m4p, ogg, flac).", key: "errorDecode"});
				break;
			case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
				message += "<BR>" + $L({value: "This episode is not suitable for streaming.", key: "errorNotSupported"});
				break;
		}
		Util.showError($L("Error"), message);

		/*
		// getErrorCode doesn't seem to be available
		if (!event.currentTarget.getErrorCode) {
			Mojo.Log.error("Error Code: unavailable since event.currentTarget.getErrorCode is null");
		}
		var errorCode = event.currentTarget.getErrorCode();
		Mojo.Log.error("errorCode=%d", errorCode);
		var errorCodeString = "Unknown: (0x" + errorCode.toString(16).toUpperCase() + ")";

		switch (Number(errorCode)) {
			case 1:
				errorCodeString = "DecodeErrorFileNotFound(1)";
				break;
			case 2:
				errorCodeString = "DecodeErrorBadParam(2)";
				break;
			case 3:
				errorCodeString = "DecodeErrorPipeline(3)";
				break;
			case 4:
				errorCodeString = "DecodeErrorUnsupported(4)";
				break;
			case 5:
				errorCodeString = "DecodeErrorNoMemory(5)";
				break;
			case 6:
				errorCodeString = "NetworkErrorHttp(6)";
				break;
			case 7:
				errorCodeString = "NetworkErrorRtsp(7)";
				break;
			case 8:
				errorCodeString = "NetworkErrorMobi(8)";
				break;
			case 9:
				errorCodeString = "NetworkErrorOther(9)";
				break;
			case 12:
				errorCodeString = "NetworkErrorPowerDown(12)";
				break;
		}

		Mojo.Log.error("Error Code: %s", errorCodeString);
		*/
	} catch (f) {
	}

	this.bookmark();
	this.cmdMenuModel.items[this.bak60Pos] = {};
	this.cmdMenuModel.items[this.bak30Pos] = {};
	this.cmdMenuModel.items[this.fwd30Pos] = {};
	this.cmdMenuModel.items[this.fwd60Pos] = {};
	this.enablePlay(true);
	this.setStatus();
	this.resume = true;
	this.setTimer(false);
	//this.readyToPlay();
};

EpisodeDetailsAssistant.prototype.mediaKeyPressHandler = function(event) {
	Mojo.Log.warn("received mediaKeyPress: %s", Mojo.Log.propertiesAsString(event));
	if (event.state === 'down') {
		switch (event.key) {
			case "togglePausePlay":
			case "headset_button":
				if (this.audioObject.paused) {
					this.play();
				} else {
					this.pause();
				}
				break;
			case "stop":
			case "pause":
				this.pause();
				break;
			case "play":
				this.play();
				break;
			case "next":
				this.doSkip(20);
				break;
			case "prev":
				this.doSkip(-20);
				break;
			default:
				Mojo.Log.warn("Ignoring mediaKeyPress: ", event.key);
				break;
		}
	}
};

EpisodeDetailsAssistant.prototype.keyDownHandler = function(event) {
	var key = event.originalEvent.keyCode;
	switch (key) {
		case Mojo.Char.spaceBar:
			//play/pause
			if (this.audioObject.paused) {
				this.play();
			} else {
				this.pause();
			}
			break;
		case Mojo.Char.period: // ff1
			this.doSkip(20);
			//this.audioObject.playbackRate = 1.5;
			break;
		case Mojo.Char.zero: // fr1
			this.doSkip(-20);
			//this.audioObject.playbackRate = .75;
			break;
		case Mojo.Char.sym: // ff2
			this.doSkip(60);
			//this.audioObject.playbackRate = 2;
			break;
		case Mojo.Char.shift: // fr2
			this.doSkip(-60);
			//this.audioObject.playbackRate = .5;
			break;
		default:
			Mojo.Log.warn("Ignoring keyCode: ", key);
			break;
	}
};

EpisodeDetailsAssistant.prototype.setStatus = function(message, maxDisplay) {
	Mojo.Log.info("setStatus: %s", message);
	this.statusMessage = message;
	this.statusIter = 2;
	this.statusDiv.update(message);
	if (message) {
		this.statusDiv.show();
		if (!this.statusTimerID && this.controller) {
			this.statusTimerID = this.controller.window.setInterval(this.statusTimer.bind(this), 400);
		}
	} else {
		this.statusDiv.hide();
		if (this.statusTimerID && this.controller) {
			this.controller.window.clearInterval(this.statusTimerID);
			this.statusTimerID = null;
		}
	}
};

EpisodeDetailsAssistant.prototype.statusTimer = function() {
	var dots = "";
	if (Math.abs(this.statusIter-2) === 1) {
		dots = " . ";
	} else if (Math.abs(this.statusIter-2) === 2) {
		dots = " . . ";
	}
	this.statusIter = (this.statusIter+1)%4;
	this.statusDiv.update(dots + this.statusMessage + dots);
};

EpisodeDetailsAssistant.prototype.handleAudioEvents = function(event) {
	Mojo.Log.warn("W.AudioEvent: %s", event.type);
	switch (event.type) {
		case "load":
			this.setStatus();
			this.updateProgress();
			break;
		case "durationchange":
			if (this.resume) {
				Mojo.Log.info("resuming playback at %d", this.episodeObject.position);
				try {
					this.setStatus($L("Seeking"));
					this.audioObject.currentTime = this.episodeObject.position;
					this.resume = false;
				} catch (e) {
					Mojo.Log.error("Error setting currentTime: %s", e.message);
				}
				this.updateProgress();
			}
			break;
		case "canplay":
			if (!this.resume && this.audioObject.autoplay) {
				this.setStatus($L("Buffering"));
			}
			break;
		case "canplaythrough":
			this.updateProgress();
			this.setStatus();
			this.cmdMenuModel.items[this.playPausePos].disabled = false;
			this.refreshMenu();
			break;
		case "seeked":
			if (this.audioObject.paused && !this.episodeObject.downloaded) {
				this.setStatus($L("Buffering"));
			}
			this.cmdMenuModel.items[this.playPausePos].disabled = false;
			this.refreshMenu();
			break;
		case "waiting":
			this.setStatus($L("Buffering"));
			break;
		case "play":
			this.setStatus();
			this.playGUI();
			break;
		case "pause":
			this.updateProgress();
			this.bookmark();
			this.pauseGUI();
			break;
		case "ended":
			this.backToList();
			break;
	}
};

EpisodeDetailsAssistant.prototype.handleCommand = function(event) {
	if (event.type == Mojo.Event.command) {
        switch(event.command) {
            case "download-cmd":
				this.cmdMenuModel.items[this.playPausePos] = {};
				this.refreshMenu();
				this.download();
				break;
            case "play-cmd":
				this.play();
				break;
            case "pause-cmd":
				this.pause();
				break;
            case "delete-cmd":
				this.enablePlay();
				this.deleteFile();
				break;
            case "skipForward-cmd":
				this.doSkip(20);
				break;
            case "skipBack-cmd":
				this.doSkip(-20);
				break;
            case "skipForward2-cmd":
				this.doSkip(60);
				break;
            case "skipBack2-cmd":
				this.doSkip(-60);
				break;
            case "report-cmd":
				event.assistant = this;
				event.data = "Episode Information: <br/>" +
					"Title: " + this.episodeObject.title + "<br/>" +
					"Enclosure: " + this.episodeObject.enclosure + "<br/>" +
					"Type: " + this.episodeObject.type + "<br/>" +
					"File: " + this.episodeObject.file + "<br/><br/>" +
					"Feed Information:<br/>" +
					"URL: " + this.episodeObject.feedObject.url + "<br/>";
				break;
            case "share-cmd":
				var args = {episodeURL: this.episodeObject.enclosure,
							episodeTitle: this.episodeObject.title,
							podcastURL: this.episodeObject.feedObject.url,
							podcastTitle: this.episodeObject.feedObject.title};
				var subject = $L({value: "Check out this podcast I found with drPodder!", key: "shareEpisodeSubject"});
				var message = $L({value: "Hi,<br/><br/>I thought you'd like to check out this great podcast I'm enjoying in " +
								 "<a href=\"http://developer.palm.com/appredirect/?packageid=com.bitsofgodsoftware.podfrenzy\">podFrenzy</a> " +
								 "on my webOS device!<br/><br/>To download the episode, just click this link: " +
								 "<a href=\"#{episodeURL}\">#{episodeTitle}</a><br/><br/>" +
								 "To subscribe to this podcast yourself, simply copy the following link and " +
								 "paste it into your favorite Podcatcher!<br/><br/>" +
								 "Podcast Title: <a href=\"#{podcastURL}\">#{podcastTitle}</a><br/>" +
								 "Podcast URL:<br/>#{podcastURL}<br/><br/>", key: "shareEpisodeBody"}).interpolate(args);
				AppAssistant.applicationManagerService.email(subject, message);
				break;
            case "copyEpisode-cmd":
				this.controller.stageController.setClipboard(this.episodeObject.enclosure);
				Util.banner($L({value:"Episode URL copied", key:"episodeURLCopied"}));
				break;
            case "copyFeed-cmd":
				this.controller.stageController.setClipboard(this.episodeObject.feedObject.url);
				Util.banner($L({value:"Feed URL copied", key:"feedURLCopied"}));
				break;
            case "playExternal-cmd":
				this.playExternal();
				break;
            case "about-cmd":
				this.controller.showAlertDialog({
						onChoose: function(value) {},
						message: "<div style='width=100%; font-size: 30px;'>drPodder - v" + Mojo.Controller.appInfo.version + "</div><HR>" +
								"Copyright 2011 Bits Of God Software<BR>" +
								"Copyright 2010 Jamie Hatfield<BR>" +
								"Original Logo Design: <a href='http://jamie3d.com/'>Jamie Hamel-Smith</a><BR>" +
								"Original Logo Concept: <a href='http://www.userinterfaceicons.com/preview.php'>UII</a>",
						allowHTMLMessage: true,
						choices: [
							{label: "OK", value:""}
						]
					});
				event.stopPropagation();
				break;
	    case 'cmd-backButton' :
				this.poppingScene= true;
				this.controller.stageController.popScene();
				break;

		}
	} else if (event.type === Mojo.Event.back) {
		this.poppingScene = true;
	}

};

EpisodeDetailsAssistant.prototype.playGUI = function() {
	this.autoPlay = true;
	this.cmdMenuModel.items[this.bak60Pos] = this.menuCommandItems.skipBack2;
	this.cmdMenuModel.items[this.bak30Pos] = this.menuCommandItems.skipBack;
	this.cmdMenuModel.items[this.fwd30Pos] = this.menuCommandItems.skipForward;
	this.cmdMenuModel.items[this.fwd60Pos] = this.menuCommandItems.skipForward2;
	this.enablePause(true);
	this.setTimer(true);
};

EpisodeDetailsAssistant.prototype.pauseGUI = function() {
	this.autoPlay = false;
	this.setTimer(false);
	this.enablePlay();
};

EpisodeDetailsAssistant.prototype.doSkip = function(secs) {
	this.wasPlaying = !this.audioObject.paused;
	this.audioObject.currentTime += secs;
	if (this.wasPlaying) {this.audioObject.play();}
	this.updateProgress();
	this.controller.modelChanged(this.progressModel);
	this.bookmark();
};

EpisodeDetailsAssistant.prototype.sliderDragStart = function() {
	this.wasPlaying = !this.audioObject.paused;
	if (this.wasPlaying) {
		this.audioObject.pause();
	}
};

EpisodeDetailsAssistant.prototype.progressChange = function(event) {
	// need this line
	//this.audioObject.currentTime = event.value * this.audioObject.duration;
	this.updateProgress(null, event.value * this.audioObject.duration);
	this.controller.modelChanged(this.progressModel);
};

EpisodeDetailsAssistant.prototype.sliderDragEnd = function(event) {
	this.audioObject.currentTime = this.progressModel.value * this.audioObject.duration;
	this.setStatus($L("Seeking"));
	this.bookmark();
	if (this.wasPlaying) {
		this.audioObject.play();
	}
};

EpisodeDetailsAssistant.prototype.updateProgressLabels = function(currentTime) {
	this.updateProgressLabelsValues(Util.formatTime(currentTime||this.audioObject.currentTime),
									Util.formatTime(this.audioObject.duration-(currentTime||this.audioObject.currentTime)));
};

EpisodeDetailsAssistant.prototype.updateProgressLabelsValues = function(playbackProgress, playbackRemaining) {
	this.controller.get("playback-progress").update(playbackProgress);
	this.controller.get("playback-remaining").update(playbackRemaining);
};

EpisodeDetailsAssistant.prototype.updateProgress = function(event, currentTime) {
	if (!this.isVideo()) {
		if (isNaN(this.audioObject.currentTime) ||
			!isFinite(this.audioObject.duration) || isNaN(this.audioObject.duration) || this.audioObject.duration === 0) {
			this.updateProgressLabelsValues("00:00", "00:00");
		} else {
			this.updateProgressLabels(currentTime);
			if (!currentTime) {
				this.progressModel.value = this.audioObject.currentTime/this.audioObject.duration;
			}
			if (!this.episodeObject.downloaded) {
				var buffered = this.audioObject.buffered;
				if (buffered !== undefined && buffered !== null) {
					// webOS 1.4 broke this
					//this.progressModel.progressStart = buffered.start(0)/this.audioObject.duration;
					//Mojo.Log.info("buffered.start(0)=%d", buffered.start(0));
					this.progressModel.progressStart = this.audioObject.currentTime/this.audioObject.duration;
					this.progressModel.progressEnd = buffered.end(0)/this.audioObject.duration;
				}
			}
			this.controller.modelChanged(this.progressModel);
		}
	}
};

EpisodeDetailsAssistant.prototype.download = function() {
	this.stop();
};

EpisodeDetailsAssistant.prototype.deleteFile = function() {
	this.stop();
};

EpisodeDetailsAssistant.prototype.pause = function() {
	try {
		this.disablePause();
		this.audioObject.pause();
		//this.controller.window.setTimeout(this.enablePlayPause.bind(this), 10000);
	} catch (e) {
		Mojo.Log.error("Error in pause: %j", e);
	}
};

EpisodeDetailsAssistant.prototype.play = function() {
	try {
		if (this.isVideo()) {
			if (this.isForeground) {
				this.launchVideo(this.episodeObject.file || this.episodeObject.getEnclosure());
				this.controller.window.setTimeout(this.enablePlay.bind(this), 10000);
			}
		} else {
			if (this.audioObject.paused) {
				this.disablePlay();
			}
			this.audioObject.play();
			//this.controller.window.setTimeout(this.enablePlayPause.bind(this), 10000);

		}
	} catch (e) {
		Mojo.Log.error("Error in play: %j", e);
	}
};

EpisodeDetailsAssistant.prototype.stop = function() {
	this.audioObject.pause();
	this.audioObject.src = null;
};

EpisodeDetailsAssistant.prototype.isVideo = function() {
	if (this.episodeObject.type !== undefined && this.episodeObject.type !== null &&
		this.episodeObject.type.indexOf("video") === 0) {
		return true;
	} else {
		return false;
	}
};

EpisodeDetailsAssistant.prototype.launchVideo = function(uri) {
	/*
	var args = {
		appId: "com.palm.app.videoplayer",
		name: "nowplaying"
	};

	var params = {
		target: uri,
		title: this.episodeObject.title,
		thumbUrl: this.episodeObject.feedObject.albumArt
	};

	this.controller.stageController.pushScene(args, params);
	*/
	
	this.controller.serviceRequest("palm://com.palm.applicationManager",
				       {
					method: "launch",
					parameters: {
						id: "com.palm.app.videoplayer",
						params: {
							target: uri,
							title: this.episodeObject.title,
							thumbUrl: this.episodeObject.feedObject.albumArt
						}
					}
				});

/*
	var params = {
		target: uri,
		title: this.episodeObject.title,
		initialPos: 0,
		videoID: undefined,
		thumbUrl: this.episodeObject.feedObject.albumArt,
		isNewCard: true,
		captured: this.launchParams.captured,
		item: {
			videoDuration: this.launchParams.videoDuration
		}
	}

	AppAssistant.VideoLibrary.Push(this.controller.stageController, AppAssistant.VideoLibrary.Nowplaying, params);
*/
 };

EpisodeDetailsAssistant.prototype.playExternal = function() {
	this.controller.serviceRequest("palm://com.palm.applicationManager", {
		method: "open",
		parameters: {
			target: this.episodeObject.file || this.episodeObject.getEnclosure()
		}
	});
};

EpisodeDetailsAssistant.prototype.titleTap = function() {
	if (this.progressInfoHidden) {
		this.header.addClassName("multi-line");
		this.progressInfo.show();
		this.updateProgress();
		this.progressInfoHidden = false;
		this.adjustHeader();
	} else {
		this.header.removeClassName("multi-line");
		this.progressInfo.hide();
		this.progressInfoHidden = true;
		this.adjustHeader();
	}
};

EpisodeDetailsAssistant.prototype.enablePlay = function(needRefresh) {
	this.setPlayPause(true, true, needRefresh);
};

EpisodeDetailsAssistant.prototype.disablePlay = function(needRefresh) {
	this.setPlayPause(true, false, needRefresh);
};

EpisodeDetailsAssistant.prototype.enablePause = function(needRefresh) {
	this.setPlayPause(false, true, needRefresh);
};

EpisodeDetailsAssistant.prototype.disablePause = function(needRefresh) {
	this.setPlayPause(false, false, needRefresh);
};

EpisodeDetailsAssistant.prototype.setPlayPause = function(isPlay, isEnabled, needRefresh) {
	Mojo.Log.info("setPlayPause(%d, %d, %d)", isPlay, isEnabled, needRefresh);
	var item;
	if (isPlay) {item = this.menuCommandItems.play;}
	else        {item = this.menuCommandItems.pause;}

	var c = this.cmdMenuModel.items[this.playPausePos];
	if (c !== item) {
		this.cmdMenuModel.items[this.playPausePos] = c = item;
		needRefresh = true;
	}

	if (c.disabled === undefined || c.disabled === isEnabled) {
		c.disabled = !isEnabled;
		needRefresh = true;
	}

	if (needRefresh) {
		this.refreshMenu();
	}
};

EpisodeDetailsAssistant.prototype.refreshMenu = function() {
	if (this.controller) {
		this.controller.modelChanged(this.cmdMenuModel);
	}
};

EpisodeDetailsAssistant.prototype.onBlur = function() {
	this.bookmark();
	this.isForeground = false;
	Mojo.Log.info("isForeground = %s", this.isForeground);
	this.setTimer(false);

	this.player.showDashboard(this.controller.stageController);

	//this.audioObject.removeEventListener(Media.Event.TIMEUPDATE, this.updateProgressHandler);
};

EpisodeDetailsAssistant.prototype.considerForNotification = function(params) {
	if (params) {
		switch (params.type) {
			case "onFocus":
				this.isForeground = true;
				Mojo.Log.info("isForeground = %s", this.isForeground);
				this.updateProgress();
				this.player.hideDashboard();
				if (this.audioObject && this.audioObject.paused !== true) {
					this.setTimer(true);
				}
				// timeupdate STILL doesn't work 100%
				// get your fraking act together, PALM!!!
				// this.audioObject.addEventListener(Media.Event.TIMEUPDATE, this.updateProgressHandler);

				break;
			case "shutupJSLint":
				break;
		}
	}
};
