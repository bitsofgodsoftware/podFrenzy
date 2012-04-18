ImportDialogAssistant = Class.create ({
	initialize: function(controller, callback, title, hint, defaultDataValue,
			showPassword) {
		Mojo.Log.info("ImportExportDialog.initialize()");
		this.controller = controller;
	    this.callbackOnSuccess = callback;
	    this.title = title;
	    this.hint = hint;
	    this.defaultDataValue = defaultDataValue;
	    this.showPassword = showPassword;
		Mojo.Log.info("ImportExportDialog title = ", this.title);
		//Mojo.Log.info("ImportExportDialog controller = ", Object.toJSON(this.controller));
	},

	setup: function(widget) {
		Mojo.Log.info("ImportExportDialog.setup()");
	    this.widget = widget;
	    
	    this.controller.get("dialog-title").update(this.title);
	        
	    // Multi-purpose input (pasted data, filename, url)
	    this.controller.setupWidget("data",
	        {
	             hintText: this.hint,
	             autoFocus: true,
	             limitResize: true,
	             autoReplace: false,
	             multiline: true,
	             textCase: Mojo.Widget.steModeLowerCase,
	             enterSubmits: true
	        },
	        this.dataModel = {value: this.defaultDataValue});
    
	//    this.passwordModel = {value: ''};
	//    if (this.showPassword) {
	//	    // Optional password
	//	    this.controller.setupWidget(
	//	        "password",
	//	        {
	//	          hintText: $L("Password for imported data"),
	//	          autoFocus: false
	//	        },
	//	        this.passwordModel
	//	        );
	//    } else {
	//		this.controller.get("password-group").hide();
	//		this.controller.hideWidgetContainer("password-group");
	//    }
	    
	    this.controller.setupWidget("okButton", {type: Mojo.Widget.activityButton},
	        {label: $L("OK"), disabled: false});
	    this.okHandler = this.ok.bindAsEventListener(this);
	    this.controller.listen("okButton", Mojo.Event.tap, this.okHandler);
	      
	    this.controller.setupWidget("cancelButton", {type: Mojo.Widget.defaultButton},
	        {label: $L("Cancel"), disabled: false});
	    this.controller.listen("cancelButton", Mojo.Event.tap,
	    	this.widget.mojo.close);
	},
	
	keyPressHandler: function(event) {
		if (Mojo.Char.isEnterKey(event.originalEvent.keyCode)) {
		    this.ok();
		}
	},

	ok: function() {
		Mojo.Log.info("ok");
		this.controller.stopListening("okButton", Mojo.Event.tap,
		    this.okHandler);
		this.callbackOnSuccess(this.dataModel.value, "");//this.passwordModel.value);
	},

	//cleanup  - remove listeners
	cleanup: function() {
		this.controller.stopListening("okButton", Mojo.Event.tap,
		    this.okHandler);
		this.controller.stopListening("cancelButton", Mojo.Event.tap,
		    this.widget.mojo.close);
		if (this.inputToListen) {
			this.controller.stopListening(this.inputToListen,
				Mojo.Event.propertyChange,
				this.keyPressHandler.bind(this));
		}
	}
});
