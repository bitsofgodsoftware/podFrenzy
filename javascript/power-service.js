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

function PowerService() {
}
PowerService.prototype.URI = "palm://com.palm.power/";

PowerService.prototype._serviceRequest = function(sceneController, uri, params) {
	if (sceneController) {
		return sceneController.serviceRequest(uri, params);
	} else {
		var obj = new Mojo.Service.Request(uri, params);
		return obj;
	}
};

PowerService.prototype.activityStart = function(sceneController, id, duration) {
	if (duration === undefined) {duration=900000;}
	return this._serviceRequest(sceneController, this.URI + "com/palm/power", {
		method: "activityStart",
		onSuccess: function() {},
		onFailure: function() {},
		parameters: {"id": Mojo.Controller.appInfo.id+"."+id, "duration_ms": duration}});
};

PowerService.prototype.activityEnd = function(sceneController, id) {
	return this._serviceRequest(sceneController, this.URI + "com/palm/power", {
		method: "activityEnd",
		onSuccess: function() {},
		onFailure: function() {},
		parameters: {"id": Mojo.Controller.appInfo.id+"."+id}});
};
