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

function LoadingAssistant() {
	this.appController = Mojo.Controller.getAppController();
	this.stageController = this.appController.getStageController(DrPodder.MainStageName);
}

LoadingAssistant.prototype.setup = function() {
	//this.spinnerModel = {spinning: true};
	//this.controller.setupWidget("loadingSpinner", {spinnerSize: "small"}, this.spinnerModel);
	//this.spinnerModel.spinning = true;
	//this.loadingSpinner = this.controller.get("loadingSpinner");
	this.spinnerScrim = this.controller.get("spinnerScrim");
	this.controller.get("versionDiv").update("v"+Mojo.Controller.appInfo.version);
	this.titleDiv = this.controller.get("titleDiv");
	this.versionDiv = this.controller.get("versionDiv");
	this.loadingDiv = this.controller.get("loadingDiv");
	
	if(!_device_.thisDevice.kb){
		this.spinnerScrim.removeClassName("drpodder-large-logo");
		this.spinnerScrim.addClassName("drpodder-large-logo-tp");
		
		this.titleDiv.removeClassName("titleMessage");
		this.titleDiv.addClassName("titleMessage-tp");
		
		this.versionDiv.removeClassName("versionMessage");
		this.versionDiv.addClassName("versionMessage-tp");
		
		this.loadingDiv.removeClassName("loadingMessage");
		this.loadingDiv.addClassName("loadingMessage-tp");
	}

	//this.controller.enableFullScreenMode(true);
};

LoadingAssistant.prototype.activate = function() {
	if (!DB.ready) {
		DB.waitForDB(this.waitForFeedsReady.bind(this));
	} else {
		this.waitForFeedsReady();
	}
};

LoadingAssistant.prototype.waitForFeedsReady = function() {
	//this.spinnerModel.spinning = false;
	//this.controller.modelChanged(this.spinnerModel);
	this.loadingDiv.update($L({value:"Loading Feed List", key:"loadingFeedList"}));
	this.stageController.swapScene({name: "feedList", transition: Prefs.transition});
};

LoadingAssistant.prototype.considerForNotification = function(params) {
	if (params) {
		switch (params.type) {
			case "updateLoadingMessage":
				this.loadingDiv.update(params.message);
				break;
			case "shutupJSLint":
				break;
		}
	}
};
