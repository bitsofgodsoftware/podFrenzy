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

function DashboardPlayerAssistant(player, mainStageController) {
	this.player = player;
	this.mainStageController = mainStageController;
	this.appController = Mojo.Controller.getAppController();
	this.interval = 1000;
}

DashboardPlayerAssistant.prototype.setup = function() {
	this.dashboardPlayer = this.controller.get("dashboard-player");
	this.tapHandler = this.tap.bindAsEventListener(this);
	this.dashboardPlayer.addEventListener(Mojo.Event.tap, this.tapHandler);
	this.init();

	this.stageDocument = this.controller.stageController.document;
	this.activateStageHandler = this.activateStage.bindAsEventListener(this);
	this.stageDocument.addEventListener(Mojo.Event.stageActivate, this.activateStageHandler);

	this.deactivateStageHandler = this.deactivateStage.bindAsEventListener(this);
	this.stageDocument.addEventListener(Mojo.Event.stageDeactivate, this.deactivateStageHandler);
};

DashboardPlayerAssistant.prototype.updatePlayer = function(player) {
	this.player = player;
	this.init();
};

DashboardPlayerAssistant.prototype.cleanup = function() {
	this.dashboardPlayer.removeEventListener(Mojo.Event.tap, this.tapHandler);
	this.stageDocument.removeEventListener(Mojo.Event.stageActivate, this.activateStageHandler);
	this.stageDocument.removeEventListener(Mojo.Event.stageDeactivate, this.deactivateStageHandler);
};

DashboardPlayerAssistant.prototype.close = function() {
	this.controller.window.close();
};

DashboardPlayerAssistant.prototype.getPlaybackStatus = function() {
	var playbackStatus = "";
	var progress = this.player.getProgress();
	if (progress && progress.current) {
		playbackStatus = Util.formatTime(progress.current);
		if (progress.duration) {
			playbackStatus += "/" + Util.formatTime(progress.duration);
		}
	}

	return playbackStatus;
};

DashboardPlayerAssistant.prototype.init = function(event) {
	var status = this.player.getStatus();
	data = {};
	data.playbackStatus = this.getPlaybackStatus();
	data.episodeTitle = this.player.episode.title;
	data.albumArtUrl = "";
	data.showPlay = (status.playing)?"none":"block";
	data.showPause = (status.playing)?"block":"none";
	var renderedInfo = Mojo.View.render({object: data, template: 'dashboardPlayer/dashboardPlayer-controls'});
	Element.update(this.dashboardPlayer, renderedInfo);

	this.playbackStatus = this.controller.get("playbackStatus");
	this.playButton = this.controller.get("play");
	this.pauseButton = this.controller.get("pause");
};

DashboardPlayerAssistant.prototype.activateStage = function() {
	this.startTimer();
	// also check to see if pause/play need updating
	// afterwards, any play/pause event that comes in should be exposed to us
};

DashboardPlayerAssistant.prototype.deactivateStage = function() {
	this.stopTimer();
};

DashboardPlayerAssistant.prototype.tap = function(event) {
	var id = event.target.id;
	switch (id) {
		case "play":
			this.player.play();
			this.showPause();
			break;
		case "pause":
			this.player.pause();
			this.showPlay();
			break;
		case "prev":
			this.player.skip(-20);
			break;
		case "next":
			this.player.skip(20);
			break;
		default:
			this.mainStageController.activate();
			break;
	}
	this.updatePlaybackStatus();
};

DashboardPlayerAssistant.prototype.startTimer = function() {
	if (!this.timer) {
		this.timer = this.controller.window.setInterval(this.updatePlaybackStatus.bind(this), this.interval);
	}
	if (this.slowTimer) {
		this.controller.window.clearInterval(this.slowTimer);
		this.slowTimer = undefined;
	}
};

DashboardPlayerAssistant.prototype.showPlay = function() {
	this.playButton.show();
	this.pauseButton.hide();
};

DashboardPlayerAssistant.prototype.showPause = function() {
	this.playButton.hide();
	this.pauseButton.show();
};

DashboardPlayerAssistant.prototype.stopTimer = function() {
	if (this.timer) {
		this.controller.window.clearInterval(this.timer);
		this.timer = undefined;
	}
	if (!this.slowTimer) {
		this.slowTimer = this.controller.window.setInterval(this.updatePlaybackStatus.bind(this), this.interval*5);
	}
};

DashboardPlayerAssistant.prototype.updatePlaybackStatus = function() {
	this.playbackStatus.update(this.getPlaybackStatus());
	var status = this.player.getStatus();
	if (status.playing != this.playing) {
		if (status.playing) {
			this.showPause();
			this.playing = true;
		} else {
			this.showPlay();
			this.playing = false;
		}
	}
};

DashboardPlayerAssistant.prototype.stopMessage = function() {
	if (this.timer) {
		this.controller.window.clearInterval(this.timer);
		this.timer = undefined;
	}
};

DashboardPlayerAssistant.prototype.handleCommand = function(event) {
};

DashboardPlayerAssistant.prototype.activate = function(event) {
};

DashboardPlayerAssistant.prototype.deactivate = function(event) {
};

DashboardPlayerAssistant.prototype.considerForNotification = function(params) {
	if (params) {
		switch (params.type) {
			case "playEvent":
				this.showPause();
				break;
			case "pauseEvent":
				this.showPlay();
				break;
			case "endEvent":
				this.controller.window.close();
				break;
		}
	}
};
