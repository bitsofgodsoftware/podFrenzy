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

var Util;

function Utilities(){
}

Utilities.dump = function(obj){
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            Mojo.Log.warn("obj." + key + "=" + obj[key]);
        }
    }
};

Utilities.prototype.showError = function(title, message){
	var stageController = Mojo.Controller.getAppController().getActiveStageController();
	if (stageController) {
		var currentScene = stageController.activeScene();
		currentScene.showAlertDialog({
			onChoose: function(value){
			},
			title: title,
			allowHTMLMessage: true,
			message: message,
			choices: [{
				label: $L('OK'),
				value: 'ok',
				type: 'color'
			}]
		});
	}
};

Utilities.prototype.localize = function(assistant, element, value, key) {
	if (key) {
		value = $L({value: value, key: key});
	} else {
		value = $L(value);
	}
	Mojo.Log.info("localizing: %s:%s", element, value);
	el = assistant.controller.get(element);
	if (el) {el.update(value);}
	else {Mojo.Log.error("Attempted to localize %s, but element wasn't found", element);}
};

Utilities.prototype.xpath = function(path, node, getData, numeric) {
    var type = XPathResult.FIRST_UNORDERED_NODE_TYPE;
    var result = node.evaluate(path, node, null, type, null);
    var resultNode = (result !== undefined)?result.singleNodeValue:result;
    if (!getData) {
       return resultNode;
    } else if (numeric) {
       return (resultNode !== undefined)?resultNode.data:0;
    } else {
       return (resultNode !== undefined)?resultNode.data:"";
    }
};

Utilities.prototype.dumpXml = function(n) {
	var c = n.childNodes;
	Mojo.Log.info("node: <%s>,name=%s, %d children", n.nodeName, n.nodeValue, c.length);
	for (var i=0; i<c.length; i++) {
		var child=c[i];
		Util.dumpXml(child);
	}
	Mojo.Log.info("node: <%s> done", n.nodeName);
};

Utilities.prototype.xmlTagValue = function(node, element, def) {
	var arr = node.getElementsByTagName(element);
	var val = def;
	if (arr && arr.length > 0 && arr[0].firstChild) { val = arr[0].firstChild.nodeValue; }
	return val;
};

Utilities.prototype.xmlTagAttributeValue = function(node, element, attr, def) {
	var arr = node.getElementsByTagName(element);
	var val = def;
	if (arr && arr.length > 0) {
		// we found the element
		node = arr[0];
		val = this.xmlGetAttributeValue(node, attr);
	}
	return val;
};

Utilities.prototype.xmlGetAttributeValue = function(node, attr) {
	var val;
	if (node.attributes !== null) {
		// just stepping through the attributes till we find the one asked for
		for (var i=0; i<node.attributes.length; i++) {
			var attrNode = node.attributes[i];
			if (attrNode.nodeName.toLowerCase() == attr.toLowerCase()) {
				val = attrNode.nodeValue;
				break;
			}
		}
	}
	return val;
};


Utilities.prototype.escapeSpecial = function(file) {
    file = file.toString().replace(/\//g,'_').replace(/\\/g,'_').replace(/\:/g,'_').
							replace(/\*/g,'_').replace(/\?/g,'_').replace(/\"/g,'_').
							replace(/</g, '_').replace(/\>/g, '_').replace(/\|/g, '_').
							replace(/'/g,'_').replace(/\#/g, '_').replace(/\n/g, '_').
							replace(/\t/g,'_').replace(/\!/g, '_').replace(/\./g, '_');

	// don't allow filenames longer than 200 chars
	if (file.length > 200) {
		file = file.slice(200);
	}

	// if file ends in a space character, get rid of it, that's bad
	file = file.replace(/\s*$/,"");

	if (file.length === 0) {
		file = "Unknown";
	}

	return file;
};

Utilities.prototype.banner = function(message) {
	var appController = Mojo.Controller.appController;
	var cardVisible = appController.getStageProxy(DrPodder.MainStageName) &&
	                  appController.getStageProxy(DrPodder.MainStageName).isActiveAndHasScenes();
	if (Prefs.enableNotifications || cardVisible) {
		var bannerParams = {
			//icon: "miniicon.png",
            messageText: message
		};
		appController.showBanner(bannerParams, {});
	}
};

Utilities.prototype.dashboard = function(stageName, title, message, clearMessages) {
	var appController = Mojo.Controller.appController;
	var cardVisible = appController.getStageProxy(DrPodder.MainStageName) &&
	                  appController.getStageProxy(DrPodder.MainStageName).isActiveAndHasScenes();
	if (!cardVisible && Prefs.enableNotifications) {
		var cont = appController.getStageProxy(stageName);
		if (!cont) {
			var pushDashboard = function(stageController) {
				stageController.pushScene("dashboard", title, message);
			};
			appController.createStageWithCallback(
				{name: stageName,lightweight: true},
				pushDashboard, "dashboard");
		} else {
			cont.delegateToSceneAssistant("sendMessage", title, message, clearMessages);
		}
	}
};

Utilities.prototype.removeMessage = function(stageName, title, message) {
	var appController = Mojo.Controller.appController;
	var cont = appController.getStageProxy(stageName);
	if (cont) {
		cont.delegateToSceneAssistant("removeMessage", title, message);
	}
};

Utilities.prototype.closeDashboard = function(stageName) {
	var appController = Mojo.Controller.appController;
	var cont = appController.getStageProxy(stageName);
	if (cont) {cont.window.close();}
};

Utilities.prototype.formatTime = function(secs) {
	if (secs < 0) {
		return "00:00";
	}
	var mins = Math.floor(secs / 60);
	secs = Math.floor(secs % 60);
	if (mins<10) {mins = "0"+mins;}
	if (secs<10) {secs = "0"+secs;}
	return mins+":"+secs;
};


Util = new Utilities();
