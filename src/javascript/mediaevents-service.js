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

function MediaEventsService() {
}

MediaEventsService.prototype.URI = "palm://com.palm.mediaevents/";
MediaEventsService.prototype.MEDIA_KEYS_URI = "palm://com.palm.keys/media";
MediaEventsService.prototype.HEADSET_KEYS_URI = "palm://com.palm.keys/headset";

MediaEventsService.prototype._serviceRequest = function(sceneController, uri, params) {
	if (sceneController) {
		return sceneController.serviceRequest(uri, params);
	} else {
		var obj = new Mojo.Service.Request(uri, params);
		return obj;
	}
};

MediaEventsService.prototype.registerForMediaEvents = function(sceneController, callback) {
	var req = this._serviceRequest(sceneController, this.MEDIA_KEYS_URI, {
		method: "status",
		onSuccess: callback,
		parameters: {"subscribe": true}});

	req = this._serviceRequest(sceneController, this.HEADSET_KEYS_URI, {
		method: "status",
		onSuccess: callback,
		parameters: {"subscribe": true}});

	return this._serviceRequest(sceneController, this.URI, {
		method: "mediaEvents",
		onSuccess: callback,
		parameters: {"appName": Mojo.appName, "subscribe": true}});
};

MediaEventsService.prototype.markAppForeground = function(sceneController, callback) {
	return this._serviceRequest(sceneController, "palm://com.palm.audio/media", {
		method: "lockVolumeKeys",
		onSuccess: callback,
		parameters: {"foregroundApp": true, "subscribe": true}});
};
