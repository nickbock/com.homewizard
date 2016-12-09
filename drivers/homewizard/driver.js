var devices = [];
var scenes = [];
var homewizard = require('./../../includes/homewizard.js');
var request = require('request');

// SETTINGS
module.exports.settings = function( device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback ) {
    Homey.log ('Changed settings: ' + JSON.stringify(device_data) + ' / ' + JSON.stringify(newSettingsObj) + ' / old = ' + JSON.stringify(oldSettingsObj));
    try {
	    changedKeysArr.forEach(function (key) {
		    devices[device_data.id].settings[key] = newSettingsObj[key];
		});
        homewizard.setDevices(devices);
		callback(null, true);
    } catch (error) {
      callback(error); 
    }
};

module.exports.pair = function( socket ) {
    socket.on('manual_add', function (device, callback) {
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
                Homey.log('HW added');
                devices[device.data.id] = {
                  id: device.data.id,
                  name: device.name,
                  settings: device.settings,
                  capabilities: device.capabilities
                }
                callback( null, devices );
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

module.exports.init = function(devices_data, callback) {
    if (homewizard.debug) {
        devices_data = homewizard.debug_devices_data;
    }
    
    devices_data.forEach(function initdevice(device) {
        Homey.log('add device: ' + JSON.stringify(device));
        devices[device.id] = device;
        module.exports.getSettings(device, function(err, settings){
            devices[device.id].settings = settings;
        });
        homewizard.setDevices(devices);
    });   
    
	Homey.log('HomeWizard driver init done');
	callback (null, true);
};

module.exports.deleted = function( device_data ) {  
    Homey.log('deleted: ' + JSON.stringify(device_data));
    devices[device_data.id] = [];
};

// SCENES
Homey.manager('flow').on('action.switch_scene_on.scene.autocomplete', function( callback, args ){
    homewizard.getScenes(args, function(err, response) {
      callback(err, response ); // err, results
    });
});

Homey.manager('flow').on('action.switch_scene_on', function( callback, args ){
    var uri = '/gp/' + args.scene.id + '/on';
    homewizard.call(devices, args.device.id, uri, function(err, response) {
      if (err === null) {
        Homey.log('Scene is on');
        callback( null, true );
      } else {
        callback(err, false); // err
      }
    });
});  

Homey.manager('flow').on('action.switch_scene_off.scene.autocomplete', function( callback, args ){
    homewizard.getScenes(args, function(err, response) {
      callback(err, response ); // err, results
    });
});

Homey.manager('flow').on('action.switch_scene_off', function( callback, args ){
    var uri = '/gp/' + args.scene.id + '/off';
    homewizard.call(devices, args.device.id, uri, function(err, response) {
      if (err === null) {
        Homey.log('Scene is off');
        callback( null, true );
      } else {
        callback(err, false); // err
      }
    });
});  


// PRESETS
Homey.manager('flow').on('condition.check_preset', function( callback, args ){
    homewizard.call(devices, args.device.id, '/get-status/', function(err, response) {
      if (err === null) {
        if (response.preset == args.preset) {
            Homey.log('Yes, preset is: '+ response.preset+'!');
            if(typeof callback === 'function') {
                callback(null, true);
            }
        } else {
            Homey.log('Preset is: ' + response.preset+', not '+args.preset);
            if(typeof callback === 'function') {
                callback(null, false);
            }
        }
      } else {
        callback(err, false); // err
      }
    });
});
	
	
Homey.manager('flow').on('action.set_preset', function( callback, args ){
    var uri = '/preset/' + args.preset;
    homewizard.call(devices, args.device.id, uri, function(err, response) {
      if (err === null) {
        homewizard.ledring_pulse(devices, args.device.id, 'green');
        callback(null, true);
      } else {
        homewizard.ledring_pulse(devices, args.device.id, 'red');
        callback(err, false); // err
      }
    });
});