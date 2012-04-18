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

function PreferencesAssistant() {
}

PreferencesAssistant.prototype.setup = function() {
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

	this.controller.setupWidget("freeRotationToggle",
		{},
		{ value : Prefs.freeRotation });

	this.controller.setupWidget("autoUpdateToggle",
		{},
		{ value : Prefs.autoUpdate });

	this.controller.setupWidget("updateTypeList",
		{label: $L({value:"Update Type", key:"updateType"}),
		 labelPlacement: Mojo.Widget.labelPlacementLeft,
		 choices: [
				  {label: $L("Hourly"), value: "H"},
				  {label: $L("Daily"), value: "D"},
				  {label: $L("Weekly"), value: "W"}]},
		{ value : Prefs.updateType });

	this.controller.setupWidget("updateIntervalList",
		{label: $L({value:"Update Every", key:"updateEvery"}),
		 labelPlacement: Mojo.Widget.labelPlacementLeft,
		 choices: [
				  //{label: "5 Minutes", value: "00:05:00"},
				  {label: $L({value:"1 Hour", key:"1hour"}), value: "01:00:00"},
				  {label: $L({value:"2 Hours", key:"2hour"}), value: "02:00:00"},
				  {label: $L({value:"4 Hours", key:"4hour"}), value: "04:00:00"},
				  {label: $L({value:"6 Hours", key:"6hour"}), value: "06:00:00"},
				  {label: $L({value:"12 Hours", key:"12hour"}), value: "12:00:00"},
				  {label: $L({value:"24 Hours", key:"24hour"}), value: "23:59:59"}]},
		{ value : Prefs.updateInterval });

	this.showIntervalSelector();

	var dayChoices = [];
	var d_names = Mojo.Locale.getDayNames('long');
	if (!d_names) {
		Mojo.Locale.set(Prefs.systemTranslation);
		d_names = Mojo.Locale.getDayNames('long');
		Mojo.Locale.set(Prefs.translation);
	}

	for (var i=0; i<7; i++) {
		dayChoices.push({label: d_names[i], value: i});
	}

	this.controller.setupWidget("updateDayList",
		{label: $L({value:"Update Day", key:"updateDay"}),
		 labelPlacement: Mojo.Widget.labelPlacementLeft,
		 choices: dayChoices},
		{ value: Prefs.updateDay });

    this.controller.setupWidget("timePicker",
        { label: ' ',
		  minuteInterval: 15},
        { time: Prefs.updateTime }
    );

	this.controller.setupWidget("wifiToggle",
		{},
		{ value : Prefs.enableWifi});

	this.controller.get("wifiToggleDiv").hide();

	this.controller.setupWidget("playbackDashboardToggle",
		{},
		this.playbackDashboardModel = { value : Prefs.playbackDashboard });

	this.controller.setupWidget("useMetrixToggle",
		{},
		this.useMetrixModel = { value : Prefs.useMetrix });

	this.controller.setupWidget("limitToWifiToggle",
		{},
		this.limitToWifiModel = { value : Prefs.limitToWifi });

	this.controller.setupWidget("transitionList",
		{label: $L("Transitions"),
		 labelPlacement: Mojo.Widget.labelPlacementLeft,
		 choices: [
				  {label: $L("None"), value: Mojo.Transition.none},
				  {label: $L({value:"Zoom Fade", key:"zoomFade"}), value: Mojo.Transition.zoomFade},
				  {label: $L({value:"Cross Fade", key:"crossFade"}), value: Mojo.Transition.crossFade}]},
		{ value : Prefs.transition });

	var translations = [
				  {label: $L("English"), value: "en_us"},
				  {label: $L("German"), value: "de_de"},
				  {label: $L({value:"Latino Spanish", key:"latinoSpanish"}), value: "es_mx"},
				  {label: $L({value:"Spain Spanish", key:"spainSpanish"}), value: "es_es"},
				  {label: $L("French"), value: "fr"},
				  {label: $L("Klingon"), value: "tlh"}
				  ];

	switch (Prefs.systemTranslation) {
		case "en_us":
		case "de_de":
		case "es_mx":
		case "es_es":
		case "fr":
		case "tlh":
			// we are in one of the countries I used below
			break;
		default:
			translations.unshift({label: $L("OS") + " (" + Prefs.systemTranslation + ")", value: Prefs.systemTranslation});
			break;
	}

	this.controller.setupWidget("translationList",
		{label: $L("Language"),
		 labelPlacement: Mojo.Widget.labelPlacementLeft,
		 choices: translations},
		{ value : Prefs.translation });

	this.controller.setupWidget("albumArtToggle",
		{},
		{ value : Prefs.albumArt });

	this.controller.setupWidget("simpleToggle",
		{},
		{ value : !Prefs.simple });

	this.controller.setupWidget("singleTapToggle",
		{},
		{ value : Prefs.singleTap });
	
	
	this.backButton = {label:$L('Back'), command:'cmd-backButton'};
	if(!_device_.thisDevice.kb){
		Mojo.Log.info("book setup NO KEYBOARD");
		this.cmdMenuModel = {items:[]};
		this.cmdMenuModel.items.push(this.backButton);
		this.controller.setupWidget(Mojo.Menu.commandMenu, {}, this.cmdMenuModel);
	}
	
	this.freeRotationHandler = this.freeRotation.bind(this);
	this.autoUpdateHandler = this.autoUpdate.bind(this);
	this.updateIntervalHandler = this.updateInterval.bind(this);
	this.updateTypeHandler = this.updateType.bind(this);
	this.updateDayHandler = this.updateDay.bind(this);
	this.updateTimeHandler = this.updateTime.bind(this);
	this.wifiHandler = this.wifi.bind(this);
	this.playbackDashboardHandler = this.playbackDashboard.bind(this);
	this.useMetrixHandler = this.useMetrix.bind(this);
	this.limitToWifiHandler = this.limitToWifi.bind(this);
	this.transitionHandler = this.transition.bind(this);
	this.translationHandler = this.translation.bind(this);
	this.albumArtHandler = this.albumArt.bind(this);
	this.simpleHandler = this.simple.bind(this);
	this.singleTapHandler = this.singleTap.bind(this);

	if (Prefs.autoUpdate) {
		this.controller.get("updateIntervalDiv").show();
	} else {
		this.controller.get("updateIntervalDiv").hide();
	}

	this.localize.bind(this).defer();
};

PreferencesAssistant.prototype.localize = function() {
	Util.localize(this, "dialogTitle", "Preferences");
	Util.localize(this, "applicationSettings", "Application Settings", "applicationSettings");
	Util.localize(this, "allowLandscape", "Allow Landscape", "allowLandscape");
	Util.localize(this, "autoUpdate", "Auto Update", "autoUpdate");
	Util.localize(this, "enableWifi", "Enable WiFi", "enableWifi");
	Util.localize(this, "playbackDashboard", "Dashboard Ctrls", "playbackDashboard");
	Util.localize(this, "useMetrix", "Statistics", "useMetrix");
	Util.localize(this, "limitToWifi", "DL only over WiFi", "limitToWifi");
	Util.localize(this, "feedListSettings", "Feed List Settings", "feedListSettings");
	Util.localize(this, "albumArt", "Show Album Art", "albumArt");
	Util.localize(this, "simple", "Show Feed Details", "simple");
	Util.localize(this, "episodeListSettings", "Episode List Settings", "episodeListSettings");
	Util.localize(this, "singleTap", "Enable Single Tap", "singleTap");
	Util.localize(this, "advancedSettings", "Advanced Settings", "advancedSettings");
};

PreferencesAssistant.prototype.activate = function() {
	Mojo.Event.listen(this.controller.get('freeRotationToggle'),Mojo.Event.propertyChange,this.freeRotationHandler);
	Mojo.Event.listen(this.controller.get('autoUpdateToggle'),Mojo.Event.propertyChange,this.autoUpdateHandler);
	Mojo.Event.listen(this.controller.get('updateIntervalList'),Mojo.Event.propertyChange,this.updateIntervalHandler);
	Mojo.Event.listen(this.controller.get('updateTypeList'),Mojo.Event.propertyChange,this.updateTypeHandler);
	Mojo.Event.listen(this.controller.get('updateDayList'),Mojo.Event.propertyChange,this.updateDayHandler);
	Mojo.Event.listen(this.controller.get('timePicker'),Mojo.Event.propertyChange,this.updateTimeHandler);
	Mojo.Event.listen(this.controller.get('wifiToggle'),Mojo.Event.propertyChange,this.wifiHandler);
	Mojo.Event.listen(this.controller.get('playbackDashboardToggle'),Mojo.Event.propertyChange,this.playbackDashboardHandler);
	Mojo.Event.listen(this.controller.get('useMetrixToggle'),Mojo.Event.propertyChange,this.useMetrixHandler);
	Mojo.Event.listen(this.controller.get('limitToWifiToggle'),Mojo.Event.propertyChange,this.limitToWifiHandler);
	Mojo.Event.listen(this.controller.get('transitionList'),Mojo.Event.propertyChange,this.transitionHandler);
	Mojo.Event.listen(this.controller.get('translationList'),Mojo.Event.propertyChange,this.translationHandler);
	Mojo.Event.listen(this.controller.get('albumArtToggle'),Mojo.Event.propertyChange,this.albumArtHandler);
	Mojo.Event.listen(this.controller.get('simpleToggle'),Mojo.Event.propertyChange,this.simpleHandler);
	Mojo.Event.listen(this.controller.get('singleTapToggle'),Mojo.Event.propertyChange,this.singleTapHandler);
};

PreferencesAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.controller.get('freeRotationToggle'),Mojo.Event.propertyChange,this.freeRotationHandler);
	Mojo.Event.stopListening(this.controller.get('autoUpdateToggle'),Mojo.Event.propertyChange,this.autoUpdateHandler);
	Mojo.Event.stopListening(this.controller.get('updateIntervalList'),Mojo.Event.propertyChange,this.updateIntervalHandler);
	Mojo.Event.stopListening(this.controller.get('updateTypeList'),Mojo.Event.propertyChange,this.updateTypeHandler);
	Mojo.Event.stopListening(this.controller.get('updateDayList'),Mojo.Event.propertyChange,this.updateDayHandler);
	Mojo.Event.stopListening(this.controller.get('timePicker'),Mojo.Event.propertyChange,this.updateTimeHandler);
	Mojo.Event.stopListening(this.controller.get('wifiToggle'),Mojo.Event.propertyChange,this.wifiHandler);
	Mojo.Event.stopListening(this.controller.get('playbackDashboardToggle'),Mojo.Event.propertyChange,this.playbackDashboard);
	Mojo.Event.stopListening(this.controller.get('useMetrixToggle'),Mojo.Event.propertyChange,this.useMetrixHandler);
	Mojo.Event.stopListening(this.controller.get('limitToWifiToggle'),Mojo.Event.propertyChange,this.limitToWifiHandler);
	Mojo.Event.stopListening(this.controller.get('transitionList'),Mojo.Event.propertyChange,this.transitionHandler);
	Mojo.Event.stopListening(this.controller.get('translationList'),Mojo.Event.propertyChange,this.translationHandler);
	Mojo.Event.stopListening(this.controller.get('albumArtToggle'),Mojo.Event.propertyChange,this.albumArtHandler);
	Mojo.Event.stopListening(this.controller.get('simpleToggle'),Mojo.Event.propertyChange,this.simpleHandler);
	Mojo.Event.stopListening(this.controller.get('singleTapToggle'),Mojo.Event.propertyChange,this.singleTapHandler);
	DB.writePrefs();
};

PreferencesAssistant.prototype.freeRotation = function(event) {
	Prefs.freeRotation = event.value;
	/*
	var dialog = new drnull.Dialog.Info(this, $L({value:"Restart Required", key:"restartRequired"}),
		$L({value:"Changing Free Rotation requires a restart of drPodder.", key:"changingFreeRotation"}));
	dialog.show();
	*/
};

PreferencesAssistant.prototype.autoUpdate = function(event) {
	Prefs.autoUpdate = event.value;
	if (Prefs.autoUpdate) {
		Mojo.Controller.getAppController().assistant.setWakeup();
		this.controller.get("updateIntervalDiv").show();
	} else {
		this.controller.get("updateIntervalDiv").hide();
	}
};

PreferencesAssistant.prototype.updateInterval = function(event) {
	Prefs.updateInterval = event.value;
	Mojo.Controller.getAppController().assistant.setWakeup();
};

PreferencesAssistant.prototype.updateType = function(event) {
	Prefs.updateType = event.value;
	this.showIntervalSelector();
	Mojo.Controller.getAppController().assistant.setWakeup();
};

PreferencesAssistant.prototype.updateDay = function(event) {
	Prefs.updateDay = event.value;
	Mojo.Controller.getAppController().assistant.setWakeup();
};

PreferencesAssistant.prototype.updateTime = function(event) {
	Prefs.updateTime = event.value;
	Prefs.updateHour = Prefs.updateTime.getHours();
	Prefs.updateMinute = Prefs.updateTime.getMinutes();
	Mojo.Controller.getAppController().assistant.setWakeup();
};

PreferencesAssistant.prototype.showIntervalSelector = function() {
	switch (Prefs.updateType) {
		case 'H':
			this.controller.get("intervalH").show();
			this.controller.get("intervalW").hide();
			this.controller.get("intervalD").hide();
			break;
		case 'D':
			this.controller.get("intervalH").hide();
			this.controller.get("intervalW").hide();
			this.controller.get("intervalD").show();
			break;
		case 'W':
			this.controller.get("intervalH").hide();
			this.controller.get("intervalW").show();
			this.controller.get("intervalD").show();
			break;
	}
};

PreferencesAssistant.prototype.wifi = function(event) {
	Prefs.enableWifi = event.value;
};

PreferencesAssistant.prototype.playbackDashboard = function(event) {
	Prefs.playbackDashboard = event.value;
};

PreferencesAssistant.prototype.useMetrix = function(event) {
	Prefs.useMetrix = event.value;
};

PreferencesAssistant.prototype.limitToWifi = function(event) {
	/*
	if (!event.value) {
		this.controller.showAlertDialog({
			onChoose: function(value) {
				if (value === "evdo") {
					this.limitToWifiModel.value = false;
					Prefs.limitToWifi = false;
				} else {
					this.limitToWifiModel.value = true;
					Prefs.limitToWifi = true;
				}
				this.controller.modelChanged(this.limitToWifiModel);
			}.bind(this),
			title: "Warning",
			message: "Allowing downloads over EVDO may cause you to " +
					"exceed your 5GB/month download cap.<br><br>Are you sure you wish " +
					"to allow EVDO Downloads?",
			allowHTMLMessage: true,
			choices:[
				{label: "Allow EVDO Downloads", value: "evdo", type: "negative"},
				{label: "WiFi-only Downloads", value: "wifi", type: "affirmative"}
			]
		});
	} else {
		Prefs.limitToWifi = true;
	}
	*/
	Prefs.limitToWifi = event.value;
};

PreferencesAssistant.prototype.transition = function(event) {
	Prefs.transition = event.value;
	this.controller.stageController.swapScene({name: "preferences", transition: Prefs.transition});
};

PreferencesAssistant.prototype.translation = function(event) {
	Prefs.translation = event.value;
	Mojo.Locale.set(Prefs.translation);

	var dialog = new drnull.Dialog.Info(this, $L({value:"Restart Required", key:"restartRequired"}),
		$L({value:"Changing Language requires a restart of drPodder.", key:"changingTranslation"}));
	dialog.show();
};

PreferencesAssistant.prototype.albumArt = function(event) {
	Prefs.albumArt = event.value;
	Prefs.reload = true;
};

PreferencesAssistant.prototype.simple = function(event) {
	Prefs.simple = !event.value;
	Prefs.reload = true;
};

PreferencesAssistant.prototype.singleTap = function(event) {
	Prefs.singleTap = event.value;
};

PreferencesAssistant.prototype.handleCommand = function(event) {
	if(event.type === Mojo.Event.command){
		this.cmd= event.command;
		switch(this.cmd){
			case 'cmd-backButton' :
				this.controller.stageController.popScene();
				break;
		}
	}
}

