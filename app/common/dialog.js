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

drnull.Dialog.BaseDialog = Class.create({
	initialize: function(assistant, title, message, choices, options) {
		this.assistant = assistant;
		this.title = title;
		this.message = message;
		this.choices = choices;
		this.options = options||{};
	},
	show: function() {
		var options = {
			allowHTMLMessage: true,
			onChoose: this.onChoose.bind(this),
			title: this.title,
			message: this.message,
			choices: this.choices
		};
		for (var p in this.options) {
			if (this.options.hasOwnProperty(p)) {
				options[p] = this.options[p];
			}
		}

		this.dialog = this.assistant.controller.showAlertDialog(options);
	},
	onChoose: function(value) {
		Mojo.Log.error("abstract onChoose called");
		undefined.fail();
	}
});

drnull.Dialog.Info = Class.create(drnull.Dialog.BaseDialog, {
	initialize: function($super, assistant, title, message, callback) {
		this.callback = callback;
		var choices = [{
			label: $L('OK'),
			value: 'ok',
			type: 'affirmative'
		}];
		$super(assistant, title, message, choices);
	},
	onChoose: function(value) {
		if (this.callback) { this.callback(); }
	}
});

drnull.Dialog.Confirm = Class.create(drnull.Dialog.BaseDialog, {
	initialize: function($super, assistant, title, message, chooseYes, chooseNo, chooseCancel) {
		var choices = [{
			label: $L('Yes'),
			value: 'yes',
			type: 'affirmative'
		},{
			label: $L('No'),
			value: 'no',
			type: 'negative'
		}];

		this.chooseYes = chooseYes || function() {};
		this.chooseNo = chooseNo || function() {};
		this.chooseCancel = chooseCancel || function() {};

		$super(assistant, title, message, choices);
	},
	onChoose: function(value) {
		Mojo.Log.warn("Confirm.onChoose(" + value + ") called");
		switch (value) {
			case "yes":
				this.chooseYes();
				break;
			case "no":
				this.chooseNo();
				break;
			default:
				this.chooseCancel();
				break;
		}
	}
});

drnull.Dialog.Choice = Class.create(drnull.Dialog.BaseDialog, {
	// labels are the buttons, handlers are the handlers for each button (with the +1 being the swipe-back-cancel option)
	initialize: function($super, assistant, title, message, labels, handlers) {
		if (labels.length === 0 ||
			handlers.length != labels.length+1) {
			Mojo.Log.error("drnull.Dialog.Choice: Labels not specified or handlers not 1 greater than labels");
		}
		var choices = [];
		for (var i=0; i<labels.length; i++) {
			var label = labels[i];
			Mojo.Log.warn("label: %s", label);
			choices.push({label: label, value: i});
		}
		this.handlers = handlers;

		$super(assistant, title, message, choices);
	},
	onChoose: function(value) {
		Mojo.Log.warn("Confirm.onChoose(" + value + ") called");
		handler = this.handlers[i];
		if (!handler) {handler = this.handlers[this.handlers.length-1];}
		if (handler) {handler();}
		else {Mojo.Log.error("drnull.Dialog.Choice: could not find handler for " + value);}
	}
});
