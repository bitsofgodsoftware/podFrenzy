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

var Prefs = {};
var DB;

function DBClass() {
	this.count = 0;
	this.ready = false;
}

// db version number, followed by the sql statements required to bring it up to the latest version
DBClass.prototype.dbVersions = [
	{version: "0.6.1", migrationSql: []},
	{version: "0.5.1", migrationSql: ["ALTER TABLE episode ADD COLUMN pubDateTime INTEGER"]},
	{version: "0.2", migrationSql: ["ALTER TABLE episode ADD COLUMN pubDateTime INTEGER",
									"ALTER TABLE feed ADD COLUMN hideFromOS BOOLEAN",
									"ALTER TABLE feed ADD COLUMN maxEpisodes INTEGER",
									"UPDATE feed SET hideFromOS=1, maxEpisodes=0",
									"DROP TABLE version"]}
];

DBClass.prototype.waitForDB = function(callback) {
	this.ready = true;
	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "updateLoadingMessage", message: $L({value:"Opening Database", key:"openingDatabase"})});

	this.callback = callback;

	var currentVerIndex = 0;
	do {
		var ver = this.dbVersions[currentVerIndex];
		try {
			//this.db = openDatabase(this.dbName, ver.version, 'drPodder Feed DB', 5*1024*1024, this.initDB.bind(this));
			this.db = openDatabase(this.dbName, ver.version);
		} catch (e) {
			if (e.code === e.INVALID_STATE_ERR) {
				currentVerIndex++;
			} else {
				Mojo.Log.error("Exception opening db: %s", e.message);
				// setTimeout only works with assistants
				//setTimeout("Util.showError('Exception opening db', '"+e.message+"');", 1000);
				currentVerIndex = 999;
			}
		}
	} while (!this.db && currentVerIndex <= this.dbVersions.length);

	//Mojo.Log.warn = Mojo.Log.error;
	//Mojo.Log.info = Mojo.Log.error;
	Mojo.Log.warn("db:%j", this.db);

	if (!this.db) {
		Mojo.Controller.getAppController().sendToNotificationChain({
			type: "updateLoadingMessage", message: $L({value:"Error Creating DB!", key:"errorCreatingDB"})});
		Mojo.Log.error("Error creating DB");
	} else if (currentVerIndex > 0) {
		ver = this.dbVersions[currentVerIndex];
		var latestVersion = this.dbVersions[0].version;

		Mojo.Controller.getAppController().sendToNotificationChain({
			type: "updateLoadingMessage", message: $L({value:"Upgrading Database from #{version}", key:"upgradingDB"}).interpolate(ver)});

		Mojo.Log.warn("We need to upgrade from v%s using [%s]", ver.version, ver.migrationSql);
		Mojo.Log.warn("version:%s, latestVersion:%s", ver.version, latestVersion);
		Mojo.Log.warn("migrationSql.length: %s", ver.migrationSql.length);
		this.db.changeVersion(ver.version, latestVersion,
			// callback
			function(transaction) {
				Mojo.Log.warn("Upgrading db");
				var migrateSuccess = function() {Mojo.Log.warn("Successfully executed migration statement %d", i);};
				var migrateFail = function(transaction, error) {Mojo.Log.error("Error executing migration statement %d: %j", i, error);};
				for (var i=0; i<ver.migrationSql.length; i++) {
					Mojo.Controller.getAppController().sendToNotificationChain({
						type: "updateLoadingMessage", message: $L({value:"Upgrading Database from #{version}", key:"upgradingDB"}).interpolate({version:ver.version+"_"+i})});
					transaction.executeSql(ver.migrationSql[i], [], migrateSuccess, migrateFail);
				}
				Mojo.Log.warn("Finished upgrading db");
			},
			//errorCallback
			function(transaction, error) {
				Mojo.Log.error("Error upgrading db: %j", error);
			},
			// successCallback
			function() {
				Mojo.Log.warn("Migration complete! calling loadFeeds");
				this.loadFeeds();
			}.bind(this)
		);
		Mojo.Log.warn("changeVersion done");
	} else {
		this.loadFeeds();
	}
};

DBClass.prototype.dbName = "ext:drPodderFeeds";


DBClass.prototype.initDB = function(db) {
	Mojo.Log.warn("entering initDB");
	var createFeedTable = "CREATE TABLE IF NOT EXISTS 'feed' " +
	                      "(id INTEGER PRIMARY KEY, " +
	                      "displayOrder INTEGER, " +
	                      "title TEXT, " +
	                      "url TEXT, " +
	                      "albumArt TEXT, " +
	                      "autoDelete BOOLEAN, " +
	                      "autoDownload BOOLEAN, " +
	                      "maxDownloads INTEGER, " +
	                      "interval INTEGER, " +
	                      "lastModified TEXT, " +
						  "replacements TEXT, " +
						  "maxDisplay INTEGER, " +
						  "viewFilter TEXT, " +
						  "username TEXT, " +
						  "password TEXT, " +
						  "hideFromOS BOOLEAN, " +
						  "maxEpisodes INTEGER)";
	var createEpisodeTable = "CREATE TABLE IF NOT EXISTS 'episode' " +
	                         "(id INTEGER PRIMARY KEY, " +
							 "feedId INTEGER, " +
							 "displayOrder INTEGER, " +
	                         "title TEXT, " +
	                         "description TEXT, " +
	                         "enclosure TEXT, " +
	                         "guid TEXT, " +
	                         "link TEXT, " +
	                         "position REAL, " +
	                         "pubDate TEXT, " +
	                         "pubDateTime INTEGER, " +
	                         "downloadTicket INTEGER, " +
	                         "downloaded BOOLEAN, " +
	                         "listened BOOLEAN, " +
	                         "file TEXT, " +
	                         "length REAL, " +
							 "type TEXT)";
	var allPlaylist = "INSERT INTO feed (id, title, url, albumArt, viewFilter) VALUES " +
	                  "(0, '" + $L("All") + "', 'drPodder://'," +
	                  "'images/playlist-icon.png', 'New')";
	var loadFeeds = this.loadFeeds.bind(this);
	db.transaction(function(transaction) {
		transaction.executeSql(createFeedTable, [],
			function(transaction, results) {
				Mojo.Log.warn("Feed table created");
			},
			function(transaction, error) {Mojo.Log.error("Error creating feed table: %j", error);});
		transaction.executeSql(createEpisodeTable, [],
			function(transaction, results) {
				Mojo.Log.warn("Episode table created");
			},
			function(transaction, error) {Mojo.Log.error("Error creating episode table: %j", error);});
		transaction.executeSql(allPlaylist, [],
			function(transaction, results) {
				Mojo.Log.warn("Created all playlist");
				loadFeeds();
			},
			function(transaction, error) {
				if (error.message === "constraint failed") {
					Mojo.Log.warn("Playlist 0 already exists, assuming we've created it already");
					loadFeeds();
				} else {
					Mojo.Log.error("Error creating all playlist, %j", error);
				}
			});
	});
};

DBClass.prototype.loadFeeds = function() {
	var loadSQL = "SELECT * FROM feed ORDER BY displayOrder";
	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "updateLoadingMessage", message: $L({value:"Loading Feeds", key:"loadingFeeds"})});

	this.db.transaction(function(transaction) {
		transaction.executeSql(loadSQL, [],
			this.loadFeedsSuccess.bind(this),
			function(transaction, error) {
				if (error.message === 'no such table: feed') {
					this.initDB(this.db);
				} else {
					Mojo.Log.error("Error retrieving feeds: %j", error);
				}
			}.bind(this));
	}.bind(this));
};

DBClass.prototype.loadFeedsSuccess = function(transaction, results) {
	if (results.rows.length > 0) {
		// load the rows into the feedModel
		for (var i=0; i<results.rows.length; i++) {
			var f = new Feed(results.rows.item(i));
			if (f.replacements === null || f.replacements === undefined) {
				f.replacements = "";
			}
			f.downloading = false;
			f.downloadCount = 0;
			f.numNew = 0;
			f.numDownloaded = 0;
			f.numStarted = 0;
			f.episodes = [];
			f.guid = [];
			f.displayOrder = feedModel.items.length;
			feedModel.add(f);
		}
	}
	this.loadEpisodes();
};

DBClass.prototype.getEpisodeDescription = function(e, callback) {
	var sql = "SELECT description FROM episode WHERE id=?";
	this.db.transaction(function(transaction) {
		transaction.executeSql(sql, [e.id],
			function(transaction, results) {
				if (results.rows.length > 0) {
					var item = results.rows.item(0);
					callback(item.description);
				}
			},
			function(transaction, error) {
				Mojo.Log.error("Error retrieving episode description for %d: %j", e.id, error);
				callback($L({value:"Error loading description from database.  Please restart drPodder.", key:"errorLoadingDescription"}));
			});
	});
};

DBClass.prototype.loadEpisodes = function() {
	//var loadSQL = "SELECT * FROM episode ORDER BY displayOrder"; //feedId, displayOrder";
	var loadSQL = "SELECT id, feedId, displayOrder, title, enclosure, guid, link, position, pubDate, pubDateTime, downloadTicket, downloaded, listened, file, length, type FROM episode ORDER BY displayOrder"; //feedId, displayOrder";
	Mojo.Controller.getAppController().sendToNotificationChain({
		type: "updateLoadingMessage",
		message: $L({value:"Loading Episodes", key:"loadingEpisodes"})});

	//this.startEpisodeRetrieval = (new Date()).getTime();
	this.db.transaction(function(transaction) {
		transaction.executeSql(loadSQL, [],
			this.loadEpisodesSuccess.bind(this),
			function(transaction, error) {Mojo.Log.error("Error retrieving feeds: %j", error);});
	}.bind(this));
};

DBClass.prototype.loadEpisodesSuccess = function(transaction, results) {
	this.loadEpisodesChunk(results, 0);
};

DBClass.prototype.loadEpisodesChunk = function(results, startAt) {
	//Mojo.Log.error("episodeRetrival time: %d", (new Date()).getTime() - this.startEpisodeRetrieval);
	if (results.rows.length > startAt) {
		Mojo.Controller.getAppController().sendToNotificationChain({
			type: "updateLoadingMessage",
			message: $L({value:"Loading Episodes", key:"loadingEpisodes"}) + " " + Math.round(100*startAt / results.rows.length) + "%"});
		
		try {
		var oldFeedId = -1;
		var f = null;
		for (var i=startAt, len=Math.min(results.rows.length, startAt+100); i<len; ++i) {
			var item = results.rows.item(i);
			var attempts = 0;
			var tryAgain = true;
			while (tryAgain && attempts < 5) {
				try {
					f = feedModel.getFeedById(item.feedId);
					//if (f.episodes.length < f.maxDisplay) {
					if (f) {
						var e = new Episode(item);
						e.feedObject = f;
						e.albumArt = f.albumArt;
						if (e.enclosure === "undefined") {e.enclosure = null;}
						if (e.type === "undefined") {e.type = null;}
						if (e.pubDate === "undefined" || e.pubDate === null) {e.pubDate = new Date();}
						else { e.pubDate = new Date(e.pubDate); }
						if (e.pubDateTime) {e.pubDate = new Date(); e.pubDate.setTime(e.pubDateTime);}

						if (e.description === "undefined") {e.description = null;}
						f.addToPlaylistsTop(e);
						f.insertEpisodeBottom(e);
						//f.episodes.push(e);
						//f.guid[e.guid] = e;
						//if (!e.listened) {++f.numNew;}
						//if (e.downloaded) {++f.numDownloaded;}
						if (e.position !== 0) {
							//++f.numStarted;
							if (e.length) {
								e.bookmarkPercent = 100*e.position/e.length;
							}
						}

						if (e.downloadTicket && !e.downloaded) {
							e.downloading = true;
							e.downloadActivity();
							//f.downloading = true;
							//f.downloadCount++;
							e.downloadRequest = AppAssistant.downloadService.downloadStatus(null, e.downloadTicket,
								e.downloadingCallback.bind(e));
						}

						e.updateUIElements(true);
					}
					tryAgain = false;
				} catch (episodeException) {
					Mojo.Log.error("Error adding episode(%d): %j", item.id, episodeException);
					attempts++;
					tryAgain = true;
				}
			}
		}
	
		} catch (exceptionCaught) {
			Mojo.Log.error("Error loading episodes: %j", exceptionCaught);
		}
		
		this.loadEpisodesChunk.bind(this).defer(results, startAt+100);
	} else {
		try {
			feedModel.items.forEach(function(f) {
				f.sortEpisodes();
			}.bind(this));
		} catch (exceptionCaught2) {
			Mojo.Log.error("Error sorting episodes: %j", exceptionCaught2);
		}
		//Mojo.Log.error("finished episodeRetrival time: %d", (new Date()).getTime() - this.startEpisodeRetrieval);
		this.callback();
	}
};

DBClass.prototype.saveFeedsOnly = function() {
	for (var i=0; i<feedModel.items.length; i++) {
		var feed = feedModel.items[i];
		feed.displayOrder = i;
		this.saveFeed(feed, i, undefined, true);
	}
};

DBClass.prototype.saveFeeds = function() {
	for (var i=0; i<feedModel.items.length; i++) {
		var feed = feedModel.items[i];
		feed.displayOrder = i;
		this.saveFeed(feed, i);
	}
};

DBClass.prototype.saveFeed = function(f, displayOrder, functionWhenFinished, feedOnly) {
	var saveFeedSQL = "INSERT OR REPLACE INTO feed (id, displayOrder, title, url, albumArt, " +
	                  "autoDelete, autoDownload, maxDownloads, interval, lastModified, replacements, maxDisplay, " +
					  "viewFilter, username, password, hideFromOS, maxEpisodes) " +
					  "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

	if (!functionWhenFinished) {
		functionWhenFinished = function() {};
	}
	if (displayOrder !== undefined) {
		f.displayOrder = displayOrder;
	}

	this.db.transaction(function(transaction) {
		Mojo.Log.warn("Feed: %s", f.title);
		if (f.id === undefined) {f.id = null;}
		if (f.playlist) {
			f.url = "drPodder://" + f.feedIds.join(",");
		}
		transaction.executeSql(saveFeedSQL, [f.id, f.displayOrder, f.title, f.url, f.albumArt,
											 (f.autoDelete)?1:0, (f.autoDownload)?1:0, f.maxDownloads, f.interval, f.lastModified, f.replacements, f.maxDisplay,
											 f.viewFilter, f.username, f.password, (f.hideFromOS)?1:0, f.maxEpisodes],
			function(transaction, results) {
				if (f.id === null) {
					f.id = results.insertId;
					feedModel.ids[f.id] = f;
					if (!f.playlist) {
						f.episodes.forEach(function(e) {
							e.feedId = f.id;
						});
					}
				}
				if (!f.playlist && !feedOnly) {
					for (var i=0; i<f.episodes.length; i++) {
						f.episodes[i].displayOrder = i;
						if (i === f.episodes.length - 1) {
							this.saveEpisodeTransaction(f.episodes[i], functionWhenFinished, transaction);
						} else {
							this.saveEpisodeTransaction(f.episodes[i], null, transaction);
						}
					}
					if (!f.episodes.length) {
						functionWhenFinished();
					}
				} else {
					functionWhenFinished();
				}
				Mojo.Log.warn("Feed saved: %s", f.title);
			}.bind(this),
			function(transaction, error) {
				Util.showError("Error Saving Feed", "There was an error saving feed: "+f.title);
				Mojo.Log.error("Feed Save failed: (%s), %j", f.title, error);
			});
	}.bind(this));
};

DBClass.prototype.saveEpisodeSQL = "INSERT OR REPLACE INTO episode (id, feedId, displayOrder, title, description," +
	                     "enclosure, guid, link, pubDate, position, " +
					     "downloadTicket, downloaded, listened, file, length, type) " +
					     "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
DBClass.prototype.saveEpisodeSQLDescription = "INSERT OR REPLACE INTO episode (id, feedId, displayOrder, title, description, " +
	                     "enclosure, guid, link, pubDate, position, " +
					     "downloadTicket, downloaded, listened, file, length, type) " +
					     "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

DBClass.prototype.saveEpisode = function(e, displayOrder, functionWhenFinished) {
	if (displayOrder !== undefined) {
		e.displayOrder = displayOrder;
	}

	if (e.feedId) {
		this.db.transaction(this.saveEpisodeTransaction.bind(this, e, functionWhenFinished));
	}
};

DBClass.prototype.saveEpisodeTransaction = function(e, functionWhenFinished, transaction) {
	var updateSQL            = "UPDATE episode SET feedId=?, displayOrder=?, title=?,                enclosure=?, guid=?, link=?, pubDateTime=?, position=?, downloadTicket=?, downloaded=?, listened=?, file=?, length=?, type=? WHERE id=?";
	var updateSQLDescription = "UPDATE episode SET feedId=?, displayOrder=?, title=?, description=?, enclosure=?, guid=?, link=?, pubDateTime=?, position=?, downloadTicket=?, downloaded=?, listened=?, file=?, length=?, type=? WHERE id=?";
	var insertSQL = "INSERT INTO episode (feedId, displayOrder, title, description, " +
	                     "enclosure, guid, link, pubDateTime, position, " +
					     "downloadTicket, downloaded, listened, file, length, type) " +
					     "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
	if (!functionWhenFinished) {functionWhenFinished = function() {};}
	if (e.id === undefined) {
		transaction.executeSql(insertSQL, [e.feedId, e.displayOrder, e.title, e.description,
				  e.enclosure, e.guid, e.link, e.pubDate.getTime(), e.position,
				  e.downloadTicket, (e.downloaded)?1:0, (e.listened)?1:0, e.file, e.length, e.type],
			function(transaction, results) {
				Mojo.Log.warn("Episode saved: %s", e.title);
				e.id = results.insertId;
				e.description = null;
				functionWhenFinished();
			},
			function(transaction, error) {
				Mojo.Log.error("Episode Save failed: (%s), %j", e.title, error);
				functionWhenFinished();
			});
	} else {
		var sql = updateSQL;
		var params = [e.feedId, e.displayOrder, e.title,
				  e.enclosure, e.guid, e.link, e.pubDate.getTime(), e.position,
				  e.downloadTicket, (e.downloaded)?1:0, (e.listened)?1:0, e.file, e.length, e.type, e.id];
		if (e.description) {
			sql = updateSQLDescription;
			params = [e.feedId, e.displayOrder, e.title, e.description,
				  e.enclosure, e.guid, e.link, e.pubDate.getTime(), e.position,
				  e.downloadTicket, (e.downloaded)?1:0, (e.listened)?1:0, e.file, e.length, e.type, e.id];
		}
		transaction.executeSql(sql, params,
			function(transaction, results) {
				//Mojo.Log.warn("Episode updated: %s", e.title);
				e.description = null;
				functionWhenFinished();
			},
			function(transaction, error) {
				Mojo.Log.error("Episode update failed: (%s), %j", e.title, error);
				functionWhenFinished();
			});
	}
};

DBClass.prototype.removeFeed = function(f) {
	var removeFeedSQL = "DELETE FROM feed WHERE id=?";
	var removeEpisodesSQL = "DELETE FROM episode WHERE feedId=?";

	if (f.playlist) {
		f.feedIds.forEach(function(fid) {
			feedModel.getFeedById(fid).removePlaylist(f);
		});
	} else {
		f.episodes.forEach(function(e) {
			if (e.downloading) {
				e.cancelDownload();
			}
			if (e.downloaded) {
				e.deleteFile(false);
			}
		});

		f.playlists.forEach(function(pf) {
			pf.removeFeedFromPlaylist(f);
		});
	}

	this.db.transaction(function(transaction) {
		transaction.executeSql(removeEpisodesSQL, [f.id],
			function(transaction, results) {Mojo.Log.warn("Episodes removed for feed %s", f.id);},
			function(transaction, error) { Mojo.Log.error("Episodes remove failed: (%s), %j", f.id, error);});
		transaction.executeSql(removeFeedSQL, [f.id],
			function(transaction, results) {Mojo.Log.warn("Feed removed: %s", f.title);},
			function(transaction, error) { Mojo.Log.error("Feed remove failed: (%s), %j", f.title, error);});
	});
};

DBClass.prototype.removeEpisode = function(episode) {
	// this functionality doesn't exist (doesn't need to either)
};

DBClass.prototype.readPrefs = function() {
	var prefsCookie = new Mojo.Model.Cookie("Prefs");
	if (prefsCookie) {
		Prefs = prefsCookie.get();
	}
	if (!Prefs) {
		Prefs = {};
	}
	/*
	delete Prefs.updateInterval;
	delete Prefs.updateType;
	delete Prefs.updateDay;
	delete Prefs.updateHour;
	*/
	/*if (Prefs.enableNotifications === undefined) {*/Prefs.enableNotifications = true;//}
	if (Prefs.autoUpdate === undefined) {Prefs.autoUpdate = false;}
	if (Prefs.updateInterval === undefined) {Prefs.updateInterval = "01:00:00";}
	if (Prefs.updateType === undefined) {Prefs.updateType = "D";}
	if (Prefs.updateDay === undefined) {Prefs.updateDay = "0";}
	if (Prefs.updateHour === undefined) {
		Prefs.updateTime = new Date();
		Prefs.updateTime.setHours(4, 0, 0);
		Prefs.updateHour = 4;
		Prefs.updateMinute = 0;
	} else {
		Prefs.updateTime = new Date();
		Prefs.updateTime.setHours(Prefs.updateHour, Prefs.updateMinute);
	}
	if (Prefs.enableWifi === undefined) {Prefs.enableWifi = false;}
	if (Prefs.playbackDashboard === undefined) {Prefs.playbackDashboard = true;}
	if (Prefs.limitToWifi === undefined) {Prefs.limitToWifi = true;}
	if (Prefs.albumArt === undefined) {Prefs.albumArt = true;}
	if (Prefs.simple === undefined) {Prefs.simple = false;}
	if (Prefs.singleTap === undefined) {Prefs.singleTap = true;}
	if (Prefs.freeRotation === undefined) {Prefs.freeRotation = false; Prefs.firstRun = true;}
	if (Prefs.transition === undefined) {Prefs.transition = Mojo.Transition.none;}
	Prefs.systemTranslation = Mojo.Locale.getCurrentLocale();
	if (Prefs.translation === undefined) {
		Prefs.translation = Prefs.systemTranslation;
	}

	if (Prefs.translation !== Prefs.systemTranslation) {
		Mojo.Locale.set(Prefs.translation);
	}
	this.writePrefs();
};

DBClass.prototype.writePrefs = function() {
	var prefsCookie = new Mojo.Model.Cookie("Prefs");
	prefsCookie.put(Prefs);
};

DBClass.prototype.defaultFeeds = function() {
	var feed = new Feed();
	feed.url = "http://leo.am/podcasts/twit";
	feed.title = "TWiT";
	feed.interval = 30000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://feeds.feedburner.com/TreocentralTreoCast";
	feed.title = "PalmCast";
	feed.interval = 45000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://feeds.feedburner.com/WORPodcasts";
	feed.title = "webOSRadio";
	feed.interval = 45000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://podcasts.engadget.com/rss.xml";
	feed.title = "Engadget";
	feed.interval = 60000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://feeds.gdgt.com/gdgt/podcast-mp3/";
	feed.title = "gdgt weekly";
	feed.interval = 60000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://feeds.feedburner.com/cnet/buzzoutloud";
	feed.title = "Buzz Out Loud";
	feed.interval = 60000;
	feedModel.add(feed);

	/*
	feed = new Feed();
	feed.url = "http://feeds2.feedburner.com/javaposse";
	feed.title = "The Java Posse";
	feed.interval = 60000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://blog.stackoverflow.com/index.php?feed=podcast";
	feed.title = "Stack Overflow";
	feed.interval = 60000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://feeds.feedburner.com/podictionary";
	feed.interval = 60000;
	feedModel.add(feed);

	feed = new Feed();
	feed.url = "http://www.merriam-webster.com/word/index.xml";
	feed.interval = 60000;
	feedModel.add(feed);
	*/

	this.saveFeeds();
};

DBClass.prototype.start = function() {
	DB.count++;
	Mojo.Log.error("+++++++++++++++++++++++++++db.start %d", DB.count);
	if (DB.count === 1) {
		Util.dashboard(DrPodder.DatabaseStageName, "Waiting for DB operations...", "Swipe away");
	}
};

DBClass.prototype.done = function() {
	DB.count--;
	Mojo.Log.error("---------------------------db.done %d", DB.count);
	if (DB.count === 0) {
		Util.closeDashboard(DrPodder.DatabaseStageName);
		Mojo.Log.error("=============================db.closeDashboardStage!!!!");
	}
};

DBClass.prototype.waitingForClose = function() {
};
