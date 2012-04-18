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

var LastSearchService = "digitalPodcast";
if ($L("ALL") === "ALLE") {
	LastSearchService = "podcastDe";
}
var LastSearchFilter = "nofilter";
var LastSearchKeyword = "";

function DigitalPodcastSearch() {
}

DigitalPodcastSearch.prototype.url = "http://www.digitalpodcast.com/podcastsearchservice/v2b/search/?appid=PrePodID&results=50&keywords=#{keyword}&contentfilter=#{filter}";
DigitalPodcastSearch.prototype.providerLabel = "powered by <a href='http://www.digitalpodcast.com'>Digital Podcast</a>";

DigitalPodcastSearch.prototype.getProviderLabel = function() {
	return this.providerLabel;
};

DigitalPodcastSearch.prototype.search = function(keyword, filter, callback) {
	//Mojo.Log.error("DigitalPodcastSearch.search(%s, %s)", keyword, filter);
	var t = new Template(this.url);
	var url = t.evaluate({keyword:encodeURI(keyword), filter: filter});

	//Mojo.Log.error("url: %s", url);
	
	var request = new Ajax.Request(url, {
		method : "get",
		evalJSON : "false",
		evalJS : "false",
		onFailure : function(transport) {
			Mojo.Log.error("Error contacting search service: %d", transport.status);
			Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), "HTTP Status:"+transport.status);
		},
		onSuccess : this.searchResults.bind(this, callback)
	});

};

DigitalPodcastSearch.prototype.searchResults = function(callback, transport) {
	//Mojo.Log.error("transport.status = %d", transport.status);
	var results = [];

	if (!transport || transport.status === 0 || transport.status < 200 || transport.status > 299) {
		Mojo.Log.error("Error contacting search service: %d", transport.status);
		Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), "HTTP Status:"+transport.status);
		return;
	}

	var doc = transport.responseXML;
	if (!doc) {
		doc = (new DOMParser()).parseFromString(transport.responseText, "text/xml");
	}

	var totalResults = Util.xmlTagValue(doc, "totalResults");

	if (totalResults === undefined) {
		Mojo.Log.error("Error contacting search service: result count not found");
		Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), $L({value:"No Results Found", key:"noResults"}));
		return;
	}

	var nodes = document.evaluate("//outline", doc, null, XPathResult.ANY_TYPE, null);
	var node = nodes.iterateNext();
	while (node) {
		var title = Util.xmlGetAttributeValue(node, "title") || Util.xmlGetAttributeValue(node, "text");
		var url   = Util.xmlGetAttributeValue(node, "xmlUrl") || Util.xmlGetAttributeValue(node, "url");
		if (title !== undefined && url !== undefined) {
			//Mojo.Log.error("found: (%s)-[%s]", title, url);
			results.push({title:title, url:url});
		} else {
			//Mojo.Log.error("skipping: (%s)-[%s]", title, url);
		}
		node = nodes.iterateNext();
	}

	callback(results);
};

function PodcastDeSearch() {
}

PodcastDeSearch.prototype.url = "http://api.podcast.de/suche/drpodder/?q=#{keyword}";
PodcastDeSearch.prototype.providerLabel = "powered by <a href='http://www.podcast.de'>podcast.de</a>";

PodcastDeSearch.prototype.getProviderLabel = function() {
	return this.providerLabel;
};

PodcastDeSearch.prototype.search = function(keyword, filter, callback) {
	Mojo.Log.error("PodcastDeSearch.search(%s, %s)", keyword, filter);
	var t = new Template(this.url);
	var url = t.evaluate({keyword:encodeURI(keyword), filter: filter});

	Mojo.Log.info("url: %s", url);

	var request = new Ajax.Request(url, {
		method : "get",
		evalJSON : "false",
		evalJS : "false",
		requestHeaders : {
			"X-Requested-With": undefined
		},
		onFailure : function(transport) {
			Mojo.Log.error("Error contacting search service: %d", transport.status);
			Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), "HTTP Status:"+transport.status);
		},
		onSuccess : this.searchResults.bind(this, callback)
	});

};

PodcastDeSearch.prototype.searchResults = function(callback, transport) {
	var results = [];

	if (!transport || transport.status === 0 || transport.status < 200 || transport.status > 299) {
		Mojo.Log.error("Error contacting search service: %d", transport.status);
		Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), "HTTP Status:"+transport.status);
		return;
	}

	var doc = transport.responseXML;
	if (!doc) {
		doc = (new DOMParser()).parseFromString(transport.responseText, "text/xml");
	}

	var nodes = document.evaluate("//outline", doc, null, XPathResult.ANY_TYPE, null);
	var node = nodes.iterateNext();
	if (!node) {
		Mojo.Log.error("Error contacting search service: outline node not found");
		Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), $L({value:"No results found", key:"noResults"}));
		return;
	}

	while (node) {
		var title = Util.xmlGetAttributeValue(node, "title") || Util.xmlGetAttributeValue(node, "text");
		var url   = Util.xmlGetAttributeValue(node, "xmlUrl") || Util.xmlGetAttributeValue(node, "url");
		if (title !== undefined && url !== undefined) {
			results.push({title:title, url:url});
		} else {
			Mojo.Log.warn("skipping: (%s)-[%s]", title, url);
		}
		node = nodes.iterateNext();
	}

	callback(results);
};

function SpokenWordSearch() {
}

SpokenWordSearch.prototype.url = "http://#{username}:#{key}@api.spokenword.org/search/feeds.json?count=20&all=#{keyword}";
SpokenWordSearch.prototype.providerLabel = "powered by <a href='http://www.spokenword.com'>Spoken Word</a>";

SpokenWordSearch.prototype.getProviderLabel = function() {
	return this.providerLabel;
};

SpokenWordSearch.prototype.search = function(keyword, filter, callback) {
	//Mojo.Log.error("SpokenWordSearch.search(%s, %s)", keyword, filter);
	var t = new Template(this.url);
	var url = t.evaluate({keyword:encodeURI(keyword),
						 username: "drnull",
						 key: "b754f71f3732ca720ce6ee249440b40e"});

	//Mojo.Log.error("url: %s", url);

	var request = new Ajax.Request(url, {
		method : "get",
		evalJSON : "true",
		evalJS : "false",
		onFailure : function(transport) {
			Mojo.Log.error("Error contacting search service: %d", transport.status);
			Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), "HTTP Status:"+transport.status);
		},
		onSuccess : this.searchResults.bind(this, callback)
	});

};

SpokenWordSearch.prototype.searchResults = function(callback, transport) {
	//Mojo.Log.error("transport.status = %d", transport.status);
	var results = [];

	if (!transport || transport.status === 0 || transport.status < 200 || transport.status > 299) {
		Mojo.Log.error("Error contacting search service: %d", transport.status);
		Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), "HTTP Status:"+transport.status);
		return;
	}

	var json = transport.responseText.evalJSON(true);

	var totalResults = json.count;

	if (totalResults === undefined) {
		Mojo.Log.error("Error contacting search service: result count not found");
		Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), $L({value:"No Results Found", key:"noResults"}));
		return;
	}

	json.feeds.forEach(function(f) {
		var title = f.title;
		var url = f.feedUrl;
		results.push({title: title, url: url});
	});

	callback(results);
};


function GoogleListenSearch() {
}

GoogleListenSearch.prototype.url = "http://lfe-alpo-gm.appspot.com/search?q=#{keyword}";
GoogleListenSearch.prototype.providerLabel = "powered by <a href='http://listen.googlelabs.com/'>Google Listen</a>";

GoogleListenSearch.prototype.getProviderLabel = function() {
	return this.providerLabel;
};

GoogleListenSearch.prototype.search = function(keyword, filter, callback) {
	Mojo.Log.warn("GoogleListenSearch.search(%s, %s)", keyword, filter);
	var t = new Template(this.url);
	var url = t.evaluate({keyword:encodeURI(keyword), filter: filter});

	//Mojo.Log.error("url: %s", url);

	var request = new Ajax.Request(url, {
		method : "get",
		evalJSON : "true",
		evalJS : "false",
		onFailure : function(transport) {
			Mojo.Log.error("Error contacting search service: %d", transport.status);
			Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), "HTTP Status:"+transport.status);
		},
		onSuccess : this.searchResults.bind(this, callback)
	});
};


GoogleListenSearch.prototype.searchResults = function(callback, transport) {
	//Mojo.Log.error("transport.status = %d", transport.status);
	var results = [];
	var uniq = {};

	if (!transport || transport.status === 0 || transport.status < 200 || transport.status > 299) {
		Mojo.Log.error("Error contacting search service: %d", transport.status);
		Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), "HTTP Status:"+transport.status);
		return;
	}

	var json = transport.responseText.evalJSON(true);

	var totalResults = json.items.length;

	if (totalResults === undefined) {
		Mojo.Log.error("Error contacting search service: result count not found");
		Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), $L({value:"No Results Found", key:"noResults"}));
		return;
	}

	json.items.forEach(function(f) {
		var title = f.feed_title;
		var url = f.feed_url;
		if (!uniq[url]) {
			uniq[url] = true;
			results.push({title: title, url: url});
		}
	});

	callback(results);
};

function ITSearch() {
}

ITSearch.prototype.url = "http://ax.itunes.apple.com/WebObjects/MZStoreServices.woa/wa/wsSearch?term=#{keyword}&country=US&media=podcast&entity=podcast";
ITSearch.prototype.providerLabel = "powered by <a href='http://http://www.apple.com/itunes//'>iTunes</a>";

ITSearch.prototype.getProviderLabel = function() {
	return this.providerLabel;
};

ITSearch.prototype.search = function(keyword, filter, callback) {
	Mojo.Log.warn("ITSearch.search(%s, %s)", keyword, filter);
	var t = new Template(this.url);
	var url = t.evaluate({keyword:encodeURI(keyword), filter: filter});

	//Mojo.Log.error("url: %s", url);

	var request = new Ajax.Request(url, {
		method : "get",
		evalJSON : "true",
		evalJS : "false",
		onFailure : function(transport) {
			Mojo.Log.error("Error contacting search service: %d", transport.status);
			Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), "HTTP Status:"+transport.status);
		},
		onSuccess : this.searchResults.bind(this, callback)
	});
};


ITSearch.prototype.searchResults = function(callback, transport) {
	//Mojo.Log.error("transport.status = %d", transport.status);
	var results = [];
	var uniq = {};

	if (!transport || transport.status === 0 || transport.status < 200 || transport.status > 299) {
		Mojo.Log.error("Error contacting search service: %d", transport.status);
		Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), "HTTP Status:"+transport.status);
		return;
	}

	var json = transport.responseText.evalJSON(true);

	var totalResults = json.resultCount;

	if (totalResults === undefined) {
		Mojo.Log.error("Error contacting search service: result count not found");
		Util.showError($L({value:"Error contacting search service", key:"errorContactingSearch"}), $L({value:"No Results Found", key:"noResults"}));
		return;
	}

	json.results.forEach(function(f) {
		var title = f.collectionName;
		var url = f.trackViewUrl;
		if (!uniq[url]) {
			uniq[url] = true;
			results.push({title: title, url: url});
		}
	});

	callback(results);
};

function FeedSearchAssistant() {
	this.searchService = "digitalPodcast";
	this.searchServices = {"digitalPodcast": new DigitalPodcastSearch(),
						   "podcastDe": new PodcastDeSearch(),
						   "spokenWord": new SpokenWordSearch(),
						   "googleListen": new GoogleListenSearch(),
						   "itSearch": new ITSearch()};
}

FeedSearchAssistant.prototype.setup = function() {
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

	this.controller.setupWidget("searchProviderList",
		{label: $L("Directory"),
		 choices: [{label: "Digital Podcast", value: "digitalPodcast"},
		           {label: "Podcast.de (German)", value: "podcastDe"},
		           //{label: "Spoken Word", value: "spokenWord"},
		           //{label: "iTunes Search", value: "itSearch"},
		           {label: "Google Listen", value: "googleListen"}
		]},
		this.searchProviderModel = { value : LastSearchService });

	this.searchProvider = this.controller.get("searchProviderList");
	this.searchProviderChangeHandler = this.searchProviderChange.bind(this);
	this.providerDiv = this.controller.get("providerDiv");

	this.controller.setupWidget("filterList",
		{label: $L("Filter"),
		 choices: [{label: $L({value:"No Filter", key:"noFilter"}), value: "nofilter"},
				   {label: $L({value:"No Adult", key:"noAdult"}), value: "noadult"},
				   {label: $L({value:"No Explicit", key:"noExplicit"}), value: "noexplicit"},
				   {label: $L("Clean"), value: "clean"},
				   {label: $L("Explicit"), value: "explicit"},
				   {label: $L("Adult"), value: "adult"}]},
		this.filterModel = { value : LastSearchFilter });

	this.filter = this.controller.get("filterList");
	this.filterDiv = this.controller.get("filterDiv");
	this.filterChangeHandler = this.filterChange.bind(this);

	this.controller.setupWidget("keywordField",
		{
			hintText : $L({value:"Search Keyword", key:"searchKeyword"}),
			autoFocus : true,
			limitResize : true,
			autoReplace : false,
			textCase : Mojo.Widget.steModeLowerCase,
			focusMode : Mojo.Widget.focusSelectMode,
			requiresEnterKey: true,
			enterSubmits : true,
			changeOnKeyPress : true
		},
		this.keywordModel = { value : LastSearchKeyword});

	this.keywordField = this.controller.get("keywordField");
	this.keywordChangeHandler = this.keywordChange.bind(this);

	this.listAttr = {
		itemTemplate: "feedSearch/searchRowTemplate",
		listTemplate: "feedSearch/searchListTemplate",
		swipeToDelete: false,
		reorderable: false,
		renderLimit: 50
	};

	this.listModel = {items: []};

	this.providerLabel = this.controller.get("providerLabel");
	this.providerLabel.update(this.searchServices[this.searchService].getProviderLabel());

	this.searchBox = this.controller.get("searchBox");
	this.searchBoxTitle = this.controller.get("searchBoxTitle");

	this.controller.setupWidget("feedSearchList", this.listAttr, this.listModel);
	this.feedSearchList = this.controller.get("feedSearchList");
	this.selectionHandler = this.selection.bindAsEventListener(this);
	this.focusChangeHandler = this.focusChange.bindAsEventListener(this);

	this.localize.bind(this).defer();
	
	this.backButton = {label:$L('Back'), command:'cmd-backButton'};
	if(!_device_.thisDevice.kb){
		Mojo.Log.info("book setup NO KEYBOARD");
		this.cmdMenuModel = {items:[]};
		this.cmdMenuModel.items.push(this.backButton);
		this.controller.setupWidget(Mojo.Menu.commandMenu, {}, this.cmdMenuModel);
	}

};

FeedSearchAssistant.prototype.localize = function() {
	Util.localize(this, "searchPodcastDirectory", "Search Podcast Directory", "searchPodcastDirectory");
	Util.localize(this, "keyword", "Keyword");
	this.searchProviderChange();
};

FeedSearchAssistant.prototype.activate = function() {
	Mojo.Event.listen(this.keywordField, Mojo.Event.propertyChange, this.keywordChangeHandler);
	Mojo.Event.listen(this.searchProvider, Mojo.Event.propertyChange, this.searchProviderChangeHandler);
	Mojo.Event.listen(this.feedSearchList, Mojo.Event.listTap, this.selectionHandler);
	this.focusChanges = Mojo.Event.listenForFocusChanges(this.keywordField, this.focusChangeHandler);
	/*
	if (LastSearchKeyword) {
		this.keywordChange({value: LastSearchKeyword, originalEvent: {keyCode: Mojo.Char.enter}});
	}
	*/

};

FeedSearchAssistant.prototype.deactivate = function() {
	Mojo.Event.stopListening(this.keywordField, Mojo.Event.propertyChange, this.keywordChangeHandler);
	Mojo.Event.stopListening(this.searchProvider, Mojo.Event.propertyChange, this.searchProviderChangeHandler);
	Mojo.Event.stopListening(this.feedSearchList, Mojo.Event.listTap, this.selectionHandler);
	this.focusChanges.stopListening();
};

FeedSearchAssistant.prototype.cleanup = function() {
};

FeedSearchAssistant.prototype.focusChange = function(event) {
	if (event && event.localName==="input") {
		this.searchBoxTitle.show();
		this.searchBox.removeClassName("unlabeled");
		this.providerDiv.show();
		this.searchProviderChange();
	} else {
		this.providerDiv.hide();
		this.filterDiv.hide();
		this.searchBoxTitle.hide();
		this.searchBox.addClassName("unlabeled");
		this.adjustTops();
	}
};

FeedSearchAssistant.prototype.adjustTops = function() {
	var height=this.controller.get("searchBox").getHeight();
	this.controller.get("searchBoxSpacer").style.height = height + 'px';
	this.controller.get("sceneFadeTop").style.top = (height+6) + 'px';
};

FeedSearchAssistant.prototype.searchProviderChange = function(event) {
	this.searchService = this.searchProviderModel.value;
	this.providerLabel.update(this.searchServices[this.searchService].getProviderLabel());
	if (this.searchService === "digitalPodcast") {
		this.filterDiv.show();
	} else {
		this.filterDiv.hide();
	}
	this.adjustTops();
};

FeedSearchAssistant.prototype.filterChange = function(event) {
};

FeedSearchAssistant.prototype.keywordChange = function(event) {
	this.searchService = this.searchProviderModel.value;
	LastSearchService = this.searchService;
	LastSearchFilter = this.filterModel.value;
	LastSearchKeyword = event.value;

	if (event.originalEvent && event.originalEvent.keyCode === Mojo.Char.enter) {
		this.keywordField.mojo.blur();
		var ss = this.searchServices[this.searchService];

		this.listModel.items = [];
		this.controller.modelChanged(this.listModel);

		ss.search(event.value, this.filterModel.value, function(results) {
			var numFeeds = results.length;
			this.listModel.items = results;

			if (numFeeds > 0) {
				this.controller.modelChanged(this.listModel);
				this.keywordField.mojo.blur();
			} else {
				Util.showError($L({value:"No Results Found", key:"noResults"}), $L({value:"Please try a different keyword, or ask the service provider to add your feed.", key:"tryDifferentKeyword"}));
			}
		}.bind(this));
	}
};

FeedSearchAssistant.prototype.selection = function(event) {
	//Mojo.Log.error("You clicked on: [%s], [%s]", event.item.title, event.item.url);
	this.controller.stageController.popScene({feedToAdd: event.item});
};

FeedSearchAssistant.prototype.handleCommand = function(event) {
	if(event.type === Mojo.Event.command){
		this.cmd= event.command;
		switch(this.cmd){
			case 'cmd-backButton' :
				this.controller.stageController.popScene();
				break;
		}
	}
}
