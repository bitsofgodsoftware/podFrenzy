function gDeviceVars(){
    this.thisDevice = {	
	"widthLand" :480,
	"widthPort" :320,
	"kb"        :true,
	"gesture"   :true,
	"mojo"	    :true,
	"buttonSize":60
    };
    
    this.thisDevice.widthLand = Mojo.Environment.DeviceInfo.screenHeight;
    this.thisDevice.widthPort = Mojo.Environment.DeviceInfo.screenWidth;
    this.thisDevice.kb = Mojo.Environment.DeviceInfo.keyboardAvailable;
    
    //need to set for TouchPad Stuff
    if (Mojo.Environment.DeviceInfo.platformVersionMajor>=3){
	this.thisDevice.gesture = false;
	this.thisDevice.mojo = false;
	//width and height are reversed for the TouchPad
	this.thisDevice.widthLand = Mojo.Environment.DeviceInfo.screenWidth;
	this.thisDevice.widthPort = Mojo.Environment.DeviceInfo.screenHeight;
    }
    //set threshold for button size
    if (this.thisDevice.widthLand >= 700 && this.thisDevice.widthPort >= 700){
	this.thisDevice.buttonSize = 168;
    }
}

var _device_= new gDeviceVars();
