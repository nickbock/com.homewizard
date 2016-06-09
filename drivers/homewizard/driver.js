var devices = [];
var request = require('request');

module.exports.init = function(devices_data, callback) {
	
	devices_data.forEach(function initdevice(device) {
	    
	    Homey.log('add device: ' + JSON.stringify(device));
	    devices[device.id] = device;
	    
	    module.exports.getSettings(device, function(err, settings){
		    
		    devices[device.id].settings = settings;
		    
		});
		
	});
	
	Homey.log('HomeWizard driver init done');
	callback (null, true);
};

Homey.manager('flow').on('condition.check_preset', function( callback, args ){
    var homewizard_ip = devices[args.device.id].settings.homewizard_ip;
    var homewizard_pass = devices[args.device.id].settings.homewizard_pass;
    var homewizard_ledring = devices[args.device.id].settings.homewizard_ledring;
    if (isNaN(homewizard_ledring)) {
      homewizard_ledring = 0;
    }
    request('http://' + homewizard_ip + '/' + homewizard_pass + '/get-status/', function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var jsonObject = JSON.parse(body);
        if (jsonObject.response.preset == args.preset) {
            Homey.log('Yes, preset is: '+jsonObject.response.preset+'!');
            callback(null, true);
        } else {
            Homey.log('Preset is: '+jsonObject.response.preset+', not '+args.preset);
            callback(null, false);
        }
      } else {
        Homey.log('Error: '+response.statusCode);
        callback(null, false);
      }
    });
});
	
	
Homey.manager('flow').on('action.set_preset', function( callback, args ){
    var homewizard_ip = devices[args.device.id].settings.homewizard_ip;
    var homewizard_pass = devices[args.device.id].settings.homewizard_pass;
    var homewizard_ledring = devices[args.device.id].settings.homewizard_ledring;
    if (isNaN(homewizard_ledring)) {
      homewizard_ledring = 0;
    }
    request('http://' + homewizard_ip + '/' + homewizard_pass + '/preset/' + args.preset, function (error, response, body) {
      if (!error && response.statusCode == 200) {	
        var jsonObject = JSON.parse(body);
        if (jsonObject.status == 'ok') {
            if (homewizard_ledring) {
                ledring_pulse('green');
            }
            callback(null, true);
        } else {
            if (homewizard_ledring) {
                ledring_pulse('red');
            }
            callback(null, false);
        }
      } else {
        Homey.log('Error: '+response.statusCode);
        if (homewizard_ledring) {
            ledring_pulse('red');
        }
        callback(null, false);
      }
    });
});

module.exports.settings = function( device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback ) {
    //Homey.log ('Changed settings: ' + JSON.stringify(device_data) + ' / ' + JSON.stringify(newSettingsObj) + ' / old = ' + JSON.stringify(oldSettingsObj));
    try {
	    changedKeysArr.forEach(function (key) {
		    devices[device_data.id].settings[key] = newSettingsObj[key];
		});
		callback(null, true);
    } catch (error) {
      callback(error); 
    }
};

module.exports.pair = function( socket ) {
    socket.on('manual_add', function (device) {
	//	Homey.log('manual pairing: device added', device);
    	
        var url = 'http://' + device.settings.homewizard_ip + '/' + device.settings.homewizard_pass + '/get-status/';
        //Homey.log('Calling '+ url);
        request(url, function (error, response, body) {
          if (response === null || response === undefined) {
            socket.emit("error", "http error");
            return;
          }
		  if (!error && response.statusCode == 200) {
			var jsonObject = JSON.parse(body);
			if (jsonObject.status == 'ok') {
				//true
                socket.emit("success", device);
			} else {
				//false
                socket.emit("error", "no response");
			}
		  } else {
			// false
            socket.emit("error", "http error: "+response.statusCode);
		  }
		});
    });
    
    socket.on('disconnect', function(){
        console.log("User aborted pairing, or pairing is finished");
    })
}

function ledring_pulse(colorName) {
	Homey.manager('ledring').animate(
		'pulse', // animation name (choose from loading, pulse, progress, solid) 
		{
			color: colorName,
		},
		'INFORMATIVE', // priority
		3000, // duration
		function(err, success) { // callback
			if(err) return Homey.error(err);
			Homey.log("Ledring pulsing "+colorName);
		}
	);
}


//module.exports.setUnavailable( device_data, "Offline" );
//module.exports.setAvailable( device_data );