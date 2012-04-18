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

function ApplicationManagerService() {
}

ApplicationManagerService.prototype.URI = "palm://com.palm.applicationManager/";

ApplicationManagerService.prototype.open = function(sceneController, id, params) {
    return sceneController.serviceRequest(this.URI, {
        method: "open",
        onSuccess: function() {},
        onFailure: function() {},
        parameters: {id: id, params: params}
    });
};

ApplicationManagerService.prototype.email = function(summary, text, toSupport) {
    var recipients = [];
    if (toSupport) {
        recipients.push({type: 'email',
                         role: 1,
                         value: 'podfrenzy@bitsofgodsoftware.com',
                         contactDisplay: 'podFrenzy Support'});
    }
    var obj = new Mojo.Service.Request(this.URI, {
        method: "open",
        parameters: {
            id: "com.palm.app.email",
            params: {
                "summary": summary,
                "text": text,
                "recipients": recipients
            }
        }
    });
};
