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

function DashboardAssistant(title, message) {
	this.messageIndex = 0;
	this.title = title;
	this.messages = [];
	if (message.constructor == Array) {
		for (var i=0,len=message.length; i<len; ++i) {
			this.messages.push(message[i]);
		}
		this.message = this.messages[0];
	} else {
		this.messages.push(message);
		this.message = message;
	}
	this.count = this.messages.length;
}

DashboardAssistant.prototype.setup = function() {
	this.displayDashboard();
	this.switchHandler = this.launchMain.bindAsEventListener(this);
	this.controller.listen("dashboardinfo", Mojo.Event.tap, this.switchHandler);

	this.stageDocument = this.controller.stageController.document;
	this.activateStageHandler = this.activateStage.bindAsEventListener(this);
	Mojo.Event.listen(this.stageDocument, Mojo.Event.stageActivate, this.activateStageHandler);

	this.deactivateStageHandler = this.deactivateStage.bindAsEventListener(this);
	Mojo.Event.listen(this.stageDocument, Mojo.Event.stageDeactivate, this.deactivateStageHandler);
};

DashboardAssistant.prototype.cleanup = function() {
	this.controller.stopListening("dashboardinfo", Mojo.Event.tap, this.switchHandler);
	Mojo.Event.stopListening(this.stageDocument, Mojo.Event.stageActivate, this.activateStageHandler);
	Mojo.Event.stopListening(this.stageDocument, Mojo.Event.stageDeactivate, this.deactivateStageHandler);
};

DashboardAssistant.prototype.launchMain = function() {
	var appController = Mojo.Controller.getAppController();
	appController.assistant.handleLaunch();
	this.controller.window.close();
};

DashboardAssistant.prototype.displayDashboard = function() {
	var info = {title: this.title, message: this.message, count: this.count};
	var renderedInfo;
	if (this.count === 1) {
		renderedInfo = Mojo.View.render({object: info, template: "dashboard/single-item-info"});
	} else {
		renderedInfo = Mojo.View.render({object: info, template: "dashboard/item-info"});
	}
	var infoElement = this.controller.get("dashboardinfo");
	infoElement.innerHTML = renderedInfo;
};

DashboardAssistant.prototype.activateStage = function() {
	this.messageIndex = 0;
	this.rotateMessage();
};

DashboardAssistant.prototype.deactivateStage = function() {
	this.stopMessage();
};

DashboardAssistant.prototype.removeMessage = function(title, message) {
	if (this.title === title) {
		var ind = this.messages.indexOf(message);
		if (ind !== -1) {
			this.messages.splice(ind, 1);
		}
		this.count = this.messages.length;
		if (this.count === 0) {
			if (this.title === $L("Downloading") && feedModel.enabledWifi) {
				AppAssistant.wifiService.setState(null, "disabled");
			}
			this.controller.window.close();
		}
	}
};

DashboardAssistant.prototype.sendMessage = function(title, message, clearMessages) {
	if (this.title !== title || clearMessages) {
		this.title = title;
		this.messages = [];
		//this.controller.get("dashboard-newitem").hide();
	} else {
		//this.controller.get("dashboard-newitem").show();
	}
	if (message.constructor == Array) {
		for (var i=0,len=message.length; i<len; ++i) {
			this.messages.push(message[i]);
		}
	} else {
		this.messages.push(message);
	}
	this.message = this.messages[0];
	this.count = this.messages.length;
	this.displayDashboard();
};

DashboardAssistant.prototype.rotateMessage = function() {
	this.interval = 3000;
	if (!this.timer) {
		this.timer = this.controller.window.setInterval(this.rotateMessage.bind(this), this.interval);
	} else {
		++this.messageIndex;
		if (this.messageIndex >= this.messages.length) {
			this.messageIndex = 0;
		}
		this.message = this.messages[this.messageIndex];
		this.displayDashboard();
	}
};

DashboardAssistant.prototype.stopMessage = function() {
	if (this.timer) {
		this.controller.window.clearInterval(this.timer);
		this.timer = undefined;
	}
};
