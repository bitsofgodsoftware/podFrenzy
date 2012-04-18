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


function WifiService() {
}
WifiService.prototype.URI = "palm://com.palm.wifi/";
WifiService.prototype.connectionmanagerURI = "palm://com.palm.connectionmanager/";

WifiService.prototype._serviceRequest = function(sceneController, uri, params) {
	if (sceneController) {
		return sceneController.serviceRequest(uri, params);
	} else {
		var obj = new Mojo.Service.Request(uri, params);
		return obj;
	}
};

WifiService.prototype.getStatus = function(sceneController, callback) {
	return this._serviceRequest(sceneController, this.URI, {
		method: "getstatus",
		onSuccess: callback,
		onFailure: function() {},
		parameters: {}});
};

WifiService.prototype.setState = function(sceneController, state) {
	return this._serviceRequest(sceneController, this.URI, {
		method: "setstate",
		onSuccess: function() {},
		onFailure: function() {},
		parameters: {"state": state}});
};

WifiService.prototype.isWifiConnected = function(sceneController, callback) {
	return this._serviceRequest(sceneController, this.connectionmanagerURI, {
		method: "getstatus",
		onSuccess: function(result) {
			var state = false;
			if (result.returnValue && result.wifi && result.wifi.state === "connected") {
				state = true;
			}
			callback(state);
		},
		onFailure: function() {
			callback(false);
		},
		parameters: {}});
};
