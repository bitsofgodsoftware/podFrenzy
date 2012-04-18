function AboutAssistant() {

}

AboutAssistant.prototype.setup = function(){
	Mojo.Log.info("TOP OF Setup!");
	this.controller.setupWidget(Mojo.Menu.appMenu, this.attributes = {
		omitDefaultItems: true
		}, this.model = {
		visible: false	
		}
	)
	
	this.backButton = {label:$L('Back'), command:'cmd-backButton'};
	if(!_device_.thisDevice.kb){
		Mojo.Log.info("setup NO KEYBOARD");
		this.cmdMenuModel = {items:[]};
		this.cmdMenuModel.items.push(this.backButton);
		this.controller.setupWidget(Mojo.Menu.commandMenu, {}, this.cmdMenuModel);
	}

	this.controller.get( 'title' ).innerHTML = _APP_Name;
	this.controller.get( 'version-number' ).innerHTML = _APP_VersionNumber;
	this.controller.get( 'vendorname' ).innerHTML = _APP_PublisherName;
	
	var supportitems = [];
	var i = 0;
	
        if(typeof _APP_Publisher_URL !== "undefined" && _APP_Publisher_URL)
		supportitems[i++] = {text: _APP_Name + $L(' Website'), detail:$L(_APP_Publisher_URL), Class:$L('img_web'),type:'web'}
	if(typeof _APP_Support_URL !== "undefined" && _APP_Support_URL)
		supportitems[i++] = {text: $L('Support Website'),detail:$L(_APP_Support_URL), Class:$L("img_web"),type:'web'}
	if(typeof _APP_Support_Email !== "undefined" && _APP_Support_Email)
		supportitems[i++] = {text: $L('Send Email'),address:_APP_Support_Email.address,subject:_APP_Support_Email.subject, Class:$L("img_email"),type:'email'}
	if(typeof _APP_Support_Phone !== "undefined" && _APP_Support_Phone)		            
		supportitems[i++] = {text: $L(_APP_Support_Phone),detail:$L(_APP_Support_Phone), Class:$L("img_phone"),type:'phone'}
	
	try {
		var helpitems = [];
		i = 0;
		for (j = 0; j < _APP_Help_Resource.length; j++) {
			switch(_APP_Help_Resource[j].type){
				case 'web':
					helpitems[i++] = {
						text: _APP_Help_Resource[j].label,
						detail: _APP_Help_Resource[j].url,
						Class: $L("img_web"),
						type: 'web'
					}
					break;
				case 'scene':
					helpitems[i++] = {
						text: _APP_Help_Resource[j].label,
						detail: _APP_Help_Resource[j].sceneName,
						Class: $L("list_scene"),
						type: 'scene'
					}
					break;
				case 'faq':
					helpitems[i++] = {
						text: _APP_Help_Resource[j].label,
						detail: _APP_Help_Resource[j].sceneName,
						Class: $L("list_faq"),
						type: 'scene'
					}
					break;
				case 'credits':
					helpitems[i++] = {
						text: _APP_Help_Resource[j].label,
						detail: _APP_Help_Resource[j].sceneName,
						Class: $L("list_credits"),
						type: 'scene'
					}
					break;
			};
					
		}
		if (_APP_Help_Resource.length > 0) {
			this.controller.setupWidget('AppHelp_list', {
				itemTemplate: 'about/listitem',
				listTemplate: 'about/listcontainer',
				emptyTemplate:'about/emptylist',
				swipeToDelete: false			
			}, {
				listTitle: $L('Help and Information'),
				items: helpitems
			});
		}
	}catch(e){Mojo.Log.error(e)}
	
        this.controller.setupWidget('AppSupport_list', 
				    {
						itemTemplate:'about/listitem', 
						listTemplate:'about/listcontainer',
						emptyTemplate:'about/emptylist',
						swipeToDelete: false						
					},
				    {
						listTitle: $L('Support'),
			            items : supportitems
			         }
	  );
	
        this.handleListTap = this.handleListTap.bind(this);  
	Mojo.Event.listen(this.controller.get('AppHelp_list'),Mojo.Event.listTap,this.handleListTap)
	Mojo.Event.listen(this.controller.get('AppSupport_list'),Mojo.Event.listTap,this.handleListTap)
	//this.controller.get( 'copywrite' ).innerHTML = _APP_Copyright;
	this.controller.get( 'copywritedetail' ).innerHTML = _APP_Copyright_Detail;
	
	//this.gplText = $('linkToGpl');
	//this.gplTapHandler = this.onGplTap.bind(this);
	//Mojo.Event.listen(this.gplText,Mojo.Event.tap,this.gplTapHandler);
	//
	Mojo.Log.info("about - setup out");
	
}
AboutAssistant.prototype.handleListTap = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	  if(event.item.type == 'web'){
	  	this.controller.serviceRequest("palm://com.palm.applicationManager", {
		  method: "open",
		  parameters:  {
		      id: 'com.palm.app.browser',
		      params: {
		          target: event.item.detail
		      }
		  }
		});
	  }	  
	  else if(event.item.type == 'email'){
	  	this.controller.serviceRequest('palm://com.palm.applicationManager', {
		    method:'open',
		    parameters:{ target: 'mailto:' + event.item.address + "?subject="  + Mojo.appInfo.title + " " + event.item.subject}
		});	
	  }
	  else if(event.item.type == 'phone'){
	  	this.controller.serviceRequest('palm://com.palm.applicationManager', {
		    method:'open',
		    parameters: {
		       target: "tel://" + event.item.detail
		       }
		    });	
	  }
	  else if(event.item.type == 'scene'){
	  	this.controller.stageController.pushScene(event.item.detail);	
	  }
}
AboutAssistant.prototype.onGplTap = function(event) {
   Mojo.Controller.stageController.pushScene ("gpl");
}
AboutAssistant.prototype.donateButtonHandler = function(event) {
	this.controller.showAlertDialog( {
		onChoose : function(value) {
			if (value === undefined || value == "CANCEL") {
				return;
			} else {
				this.getDonation();
			}
		},
		title : $L("Make a Donation via PayPal?"),
		message : $L('Donations are appreciated.  However, please note that we plan to release Simple Bible Pro soon.  It will be a paid application with more features and translations available.  Donations cannot be applied towards your purchase of Simple Bible Pro in the future.'),
		choices : [ {
			label : $L("I want to Donate Now"),
			value : "OK",
			type : "affirmative"
		}, {
			label : $L("I'll wait for Simple Bible Pro"),
			value : 'CANCEL',
			type : 'negative'
		} ]
	});
	
}

AboutAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	
}
AboutAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}
AboutAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
	Mojo.Event.stopListening(this.controller.get('AppHelp_list'),Mojo.Event.listTap,this.handleListTap)
	Mojo.Event.stopListening(this.controller.get('AppSupport_list'),Mojo.Event.listTap,this.handleListTap)
	//Mojo.Event.stopListening(this.gplText,Mojo.Event.tap,this.gplTapHandler);
	
}

AboutAssistant.prototype.handleCommand = function(event) {
	if(event.type === Mojo.Event.command){
		this.cmd= event.command;
		switch(this.cmd){
			case 'cmd-backButton' :
				this.controller.stageController.popScene();
				break;
		}
	}
}
