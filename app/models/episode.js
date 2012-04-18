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

function Episode(init) {
	if (init !== undefined) {
		this.id = init.id;
		this.displayOrder = init.displayOrder;
		this.feedId = init.feedId;
		this.title = init.title;
		this.link = init.link;
		this.description = init.description;
		this.enclosure = init.enclosure;
		this.pubDate = init.pubDate;
		this.pubDateTime = init.pubDateTime;
		this.guid = init.guid;
		this.file = init.file;
		this.downloadTicket = init.downloadTicket;
		this.downloaded = init.downloaded;
		this.listened = init.listened;
		this.length = init.length;
		this.position = init.position;
		this.type = init.type;
	} else {
		this.title = null;
		this.link = null;
		this.description = null;
		this.enclosure = null;
		this.pubDate = null;
		this.guid = null;
		this.file = null;
		this.downloadTicket = null;
		this.downloaded = false;
		this.listened = false;
		this.length = 0;
		this.position = 0;
		this.type = null;
	}
	this.downloading = false;
}

Episode.prototype.findLinks = /(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%?=~_|])/ig;
Episode.prototype.getExtension = /\.(....?)$/g;

Episode.prototype.loadFromXML = function(xmlObject) {
	this.title = Util.xmlTagValue(xmlObject, "title", "NO TITLE FOUND");
	this.link = Util.xmlTagValue(xmlObject, "link");
	this.description = Util.xmlTagValue(xmlObject, "encoded") || Util.xmlTagValue(xmlObject, "description") || "";
	var itunesSummary = Util.xmlTagValue(xmlObject, "summary");
	if (itunesSummary && itunesSummary.length > this.description.length) {
		this.description = itunesSummary;
	}
	this.enclosure = Util.xmlTagAttributeValue(xmlObject, "enclosure", "url") ||
					 Util.xmlTagAttributeValue(xmlObject, "content", "url");
	this.pubDate = Util.xmlTagValue(xmlObject, "pubDate");
	if (this.pubDate) {
		this.pubDate = new Date(this.pubDate);
	} else {
		this.pubDate = Feed.newDate;
	}
	if (this.pubDate) {this.pubDateTime = this.pubDate.getTime();}
	this.guid = Util.xmlTagValue(xmlObject, "guid");
	if (this.guid === undefined) {
		this.guid = this.link + this.title + this.getDateString();
	}
	//Mojo.Log.info("episode %s, pubdate:%s, guid:%s", this.title, this.pubDate, this.guid);
	this.type = Util.xmlTagAttributeValue(xmlObject, "enclosure", "type");

	// override the type with what we parse from the filename, if it's obvious...
	var inferredType;
	try {
		var matches = this.getExtension.exec(this.enclosure);
		if (matches && matches.length > 1) {
			var extension = matches[1].toLowerCase();
			switch (extension) {
				case "mp3":
					inferredType = "audio/mpeg";
					break;
				case "m4a":
					inferredType = "audio/mp4";
					break;
				case "avi":
					inferredType = "video/x-msvideo";
					break;
				case "asf":
					inferredType = "video/x-ms-asf";
					break;
				case "mov":
					inferredType = "video/quicktime";
					break;
				case "mpg":
					inferredType = "video/mpeg";
					break;
				case "mp4":
					inferredType = "video/mp4";
					break;
				case "m4v":
					inferredType = "video/m4v";
					break;
				case "wmv":
					inferredType = "video/wmv";
					break;
				case "flv":
					inferredType = "application/x-shockwave-flash";
					break;
			}
		}
	} catch (e) {
		Mojo.Log.error("error with regex: (%j)", e);
	}

	if (inferredType && this.type != inferredType) {
		Mojo.Log.warn("type for %s was %s, changed to %s", this.title, this.type, inferredType);
		this.type = inferredType;
	}

	//Mojo.Log.info("Episode %s: enclosure=%s, type=%s", this.title, this.enclosure, this.type);
};

Episode.prototype.updateUIElements = function(ignore) {
	if (this.downloading) {
		if (this.listened) {
			this.indicatorColor = "gray";
		} else {
			this.indicatorColor = "black";
		}
		this.statusIcon = "Knob Cancel.png";
	} else {
		if (this.listened) {
			this.indicatorColor = "gray";
			if (this.downloaded) {
				this.statusIcon = "Knob Remove Red.png";
			} else {
				this.statusIcon = "Knob Grey.png";
			}
		} else {
			this.indicatorColor = "black";
			if (this.downloaded) {
				this.statusIcon = "Knob Play.png";
			} else {
				this.statusIcon = "Knob Download.png";
			}
		}
		if (!this.enclosure && !this.downloaded) {
			this.statusIcon = "Knob Help.png";
		}
	}
	if (!ignore) {
		Mojo.Controller.getAppController().sendToNotificationChain({
			type: "episodeUpdated", episode: this});
	}
};

Episode.prototype.save = function(ignore, functionWhenFinished) {
	if (!ignore) {DB.saveEpisode(this, undefined, functionWhenFinished);}
};

Episode.prototype.setListened = function(ignore) {
	if (!this.listened) {
		this.listened = true;
		this.updateUIElements(ignore);
		this.save(ignore);
		this.feedObject.episodeListened(ignore);
	}
};

Episode.prototype.setUnlistened = function(ignore) {
	if (this.listened) {
		this.listened = false;
		this.updateUIElements(ignore);
		this.save(ignore);
		this.feedObject.episodeUnlistened(ignore);
	}
};

Episode.prototype.setDownloaded = function(ignore) {
	if (!this.downloaded) {
		this.downloaded = true;
		this.updateUIElements(ignore);
		this.save(ignore);
		this.feedObject.episodeDownloaded(ignore);
	}
};

Episode.prototype.bookmark = function(pos, functionWhenFinished) {
	var newBookmark = (this.position === 0);

	this.position = pos;
	if (this.length) {
		this.bookmarkPercent = 100*this.position/this.length;
	} else {
		this.bookmarkPercent = 0;
	}
	this.save(false, functionWhenFinished);

	if (newBookmark) {
		this.feedObject.episodeBookmarked();
	}
};

Episode.prototype.clearBookmark = function(ignore) {
	if (this.position) {
		this.position = 0;
		this.bookmarkPercent = 0;
		this.feedObject.episodeBookmarkCleared();
		this.updateUIElements(ignore);
		this.save(ignore);
	}
};

Episode.prototype.download = function(silent) {
	if (!silent) {
		Util.banner($L("Downloading") + ": " + this.title);
		Util.dashboard(DrPodder.DownloadingStageName, $L("Downloading"), this.title);
	}
	this.deleteFile();
	var url = this.getEnclosure();
	if (url) {
		Mojo.Log.warn("Downloading %s as %s", url, this.getDownloadFilename());
		//if (Prefs.allow1xDownloads) {
		this.downloadRequest = AppAssistant.downloadService.allow1x(null, this.doTheDownload.bind(this, url));
		//} else {
		//	this.doTheDownload(url);
		//}
	}
};

Episode.prototype.doTheDownload = function(url) {
	this.downloadRequest = AppAssistant.downloadService.download(null, url,
																this.feedObject.getDownloadPath(),
																this.getDownloadFilename(),
																this.downloadingCallback.bind(this));
};

Episode.prototype.getEnclosure = function() {
	var url = this.enclosure;
	if (url) {
		if (this.feedObject.username) {
			url = url.replace(/http(s?):\/\//, "http$1://" +
							encodeURIComponent(this.feedObject.username) + ":" +
							encodeURIComponent(this.feedObject.password) + "@");
		}
	}
	return url;
};

Episode.prototype.resumeDownload = function() {
	if (this.downloadTicket) {
		Mojo.Log.warn("Resuming downloadTicket(%s) for %s", this.downloadTicket, this.title);
		if (this.downloadRequest) {this.downloadRequest.cancel();}
		this.downloadRequest = AppAssistant.downloadService.resumeDownload(null, this.downloadTicket, this.downloadingCallback.bind(this));
	}
};

Episode.prototype.getDateString = function() {
	var date = this.pubDate;
	if (date === undefined || date === null || isNaN(date)) {
		date = new Date();
	}
	var y = date.getFullYear();
	var m = (date.getMonth()+1);
	var d=date.getDate();
	if (m<10) {m="0"+m;}
	if (d<10) {d="0"+d;}
	return ""+y+""+m+""+d;
};

Episode.prototype.getDownloadFilename = function() {
	var ext="mp3";
	switch (this.type) {
		case "audio/mpeg":
			ext = "mp3";
			break;
		case "audio/x-m4a":
			ext = "m4a";
			break;
		case "audio/mp4":
			ext = "m4a";
			break;
		case "video/x-msvideo":
			ext = "avi";
			break;
		case "video/x-ms-asf":
			ext = "asf";
			break;
		case "video/quicktime":
			ext = "mov";
			break;
		case "video/mpeg":
			ext = "mpg";
			break;
		case "video/mp4":
			ext = "mp4";
			break;
		case "video/mpeg4":
			ext = "mp4";
			break;
		case "video/x-mp4":
			ext = "mp4";
			break;
		case "video/x-m4v":
			ext = "m4v";
			break;
		case "video/m4v":
			ext = "m4v";
			break;
		case "video/flv":
			ext = "flv";
			break;
		case "video/wmv":
			ext = "wmv";
			break;
		case "application/x-shockwave-flash":
			ext = "flv";
			break;
		default:
			Mojo.Log.error("Unknown enclosure type[%s] for episode[%s]", this.type, this.title);
	}

	return Util.escapeSpecial(this.title) + "-" + this.getDateString() + "." + ext;
};

Episode.prototype.downloadingCallback = function(event) {
	Mojo.Log.info("downloadingCallback: %j", event);
	if (event.returnValue === false &&
		event.errorCode === -1 &&
		event.serviceName === "com.palm.downloadmanager") {
		Mojo.Log.error("Error contacting downloadmanager");
		Util.showError($L({value:"Error Downloading Episode", key:"errorDownloadingEpisode"}), $L({value:"There was an error connecting to the download manager service.  Please ensure you are running webOS 1.2 or later", key:"errorDownloadManagerService"}));
	} else if (this.downloading && event.completed && (event.completionStatusCode === 302 || event.completionStatusCode === 301)) {
		Mojo.Log.warn("Redirecting...", event.target);
		this.downloading = false;
		this.downloadingPercent = 0;
		this.downloadActivity();

		this.feedObject.downloadFinished();

		var req = new Ajax.Request(event.target, {
			method: 'get',
			onFailure: function() {
				Mojo.Log.error("Couldn't find %s... strange", event.target);
			}.bind(this),
			onComplete: function(transport) {
				var redirect;
				try {
					var matches = this.findLinks.exec(transport.responseText);
					if (matches) {
						redirect = matches[0];
					}
				} catch (e){
					Mojo.Log.error("error with regex: (%j)", e);
				}
				AppAssistant.downloadService.deleteFile(null, this.downloadTicket, function(event) {});
				this.downloadTicket = null;
				if (redirect !== undefined) {
					Mojo.Log.warn("Attempting to download redirected link: [%s]", redirect);
					this.doTheDownload(redirect);
				} else {
					Mojo.Log.error("No download link found! [%s]", transport.responseText);
					this.updateUIElements();
					this.save();
				}
			}.bind(this)
		});
	} else if (this.downloading && (event.state === "completed" || event.completed === true)) {
		Mojo.Log.warn("Download complete!", this.title);
		this.downloading = false;
		this.downloadingPercent = 0;
		this.downloadActivity();

		if (event.completionStatusCode === 200) {
			//success!
			// this.downloadTicket = 0; // we need to save the downloadTicket
			this.file = event.target;

			this.setDownloaded(true);
			this.setUnlistened(true);

			Util.dashboard(DrPodder.DownloadedStageName, $L("Downloaded"), this.title);
		} else if (event.completionStatusCode === -5) {
			this.downloadTicket = 0;
			Mojo.Log.error("CompletionStatusCode=%d, file=%s", event.completionStatusCode, event.destPath + event.destFile);
			Util.showError($L({value: "Download Failed", key:"downloadFailed"}),
						   $L({value: "Failure downloading #{title}.  If this was a podshifter download, please try again in an hour.", key:"downloadFailedDetail"}).interpolate({title:this.title}));
		} else {
			this.downloadTicket = 0;
			Mojo.Log.error("CompletionStatusCode=%d, file=%s", event.completionStatusCode, event.destPath + event.destFile);
		}

		this.updateUIElements();
		this.feedObject.downloadFinished();
		this.save();
		Util.removeMessage(DrPodder.DownloadingStageName, $L("Downloading"), this.title);

	} else if (event.returnValue && event.ticket) {
		this.downloadCanceled = false;
		this.downloadTicket = event.ticket;
		this.downloadingPercent = 0;
		if (!this.downloading) {
			this.downloading = true;
			this.updateUIElements();
			this.save();
			this.feedObject.downloadingEpisode();
			this.downloadActivity();
		}
	} else if (this.downloading && event.completed === false) {
		if (event.interrupted) {
			this.resumeDownload();
		} else {
			this.downloading = false;
			this.downloadTicket = null;
			this.downloadingPercent = 0;
			this.downloadActivity();
			this.updateUIElements();
			this.save();
			Util.removeMessage(DrPodder.DownloadingStageName, $L("Downloading"), this.title);
			// if the user didn't do this, let them know what happened
			this.feedObject.downloadFinished();
			if (!event.aborted) {
				if (event.completionStatusCode === 401) {
					Mojo.Log.error("Authentication error during download. %j", event);
					Util.showError($L({value:"Authentication Error", key:"authenticationError"}), $L({value:"The username and/or password for this feed is incorrect. Please correct and try your download again.", key:"authenticationErrorDetail"}));
				} else {
					Mojo.Log.error("Download error=%j", event);
					Util.showError($L({value:"Download aborted", key:"downloadAborted"}), $L({value:"There was an error downloading url:", key:"downloadAbortedDetail"})+this.enclosure);
				}
			}
		}
	} else if (event.returnValue === false) {
		this.downloadTicket = null;
		this.downloading = false;
		this.downloadingPercent = 0;
		this.downloadActivity();
		this.updateUIElements();
		this.save();
		Util.removeMessage(DrPodder.DownloadingStageName, $L("Downloading"), this.title);
		this.feedObject.downloadFinished();
	} else if (this.downloading) {
		var per = 0;
		// if amountTotal is < 2048 or so, we'll assume it's a redirect
		if (event.amountTotal > 0 && event.amountReceived > 0 && event.amountTotal > 2048) {
			per = Math.floor(1000*event.amountReceived/event.amountTotal)/10;
		}
		if (this.downloadingPercent !== per) {
			// start downloading activity when the download actually starts rolling
			if (this.downloadingPercent === 0) {
				this.downloadActivity();
			}
			this.downloadingPercent = per;
			Mojo.Controller.getAppController().sendToNotificationChain({
				type: "downloadProgress", episode: this});
		}
	} else if (event.aborted || this.downloadCanceled) {
		this.downloadCanceled = false;
		Mojo.Log.warn("Got the cancel event, but it has already been handled");
		Util.removeMessage(DrPodder.DownloadingStageName, $L("Downloading"), this.title);
	} else {
		Mojo.Log.error("Unknown error message while downloading %s (%j)", this.title, event);
		//Util.showError("Error downloading "+this.title, "There was an error downloading url:"+this.enclosure);
		this.downloadTicket = null;
		// this.downloading = false; // must already be false
		this.downloadingPercent = 0;
		this.updateUIElements();
		this.save();
		// this.notify("DOWNLOADABORT"); // can't notify, or count would be messed up
	}
};

Episode.prototype.downloadActivity = function() {
	// every 5 minutes, if we are still downloading we start an activity
	if (this.downloading) {
		AppAssistant.powerService.activityStart(null, this.id);
		//this.setTimeout(this.downloadActivity.bind(this), 900000);
	} else {
		AppAssistant.powerService.activityEnd(null, this.id);
	}
};

Episode.prototype.deleteFile = function(ignore) {
	if (this.downloaded) {
		AppAssistant.downloadService.deleteFile(null, this.downloadTicket, function() {});
		this.downloaded = false;
		this.file = null;
		this.downloadTicket = null;
		this.updateUIElements(ignore);
		this.save(ignore);
		this.feedObject.episodeDeleted();
	}
};

Episode.prototype.cancelDownload = function(ignore) {
	if (this.downloading) {
		AppAssistant.downloadService.cancelDownload(null, this.downloadTicket, function() {});
		this.downloadTicket = null;
		this.downloading = false;
		this.downloadingPercent = 0;
		this.downloadActivity();
		this.updateUIElements(ignore);
		this.save(ignore);
		this.downloadCanceled = true;
		this.feedObject.downloadFinished();
		Mojo.Log.warn("Canceling download");
	}
};

Episode.prototype.setTimeout = function(func, interval) {
	// TODO: Fix setTimeout
	//this.controller.window.setTimeout(func, interval);
};


var EpisodeUtil = new Episode();
