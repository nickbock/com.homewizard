var devices = [];
var homewizard = require('./../../includes/homewizard.js');
var refreshIntervalId = 0;

// SETTINGS
module.exports.settings = function( device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback ) {
    Homey.log ('Changed settings: ' + JSON.stringify(device_data) + ' / ' + JSON.stringify(newSettingsObj) + ' / old = ' + JSON.stringify(oldSettingsObj));
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
    socket.on('get_homewizards', function () {
        homewizard.getDevices(function(homewizard_devices) {
            var hw_devices = {};
            Object.keys(homewizard_devices).forEach(function(key) {
                thermometers = JSON.stringify(homewizard_devices[key].polldata.thermometers);
                
                hw_devices[key] = homewizard_devices[key];
                hw_devices[key].polldata = {};
                hw_devices[key].thermometers = thermometers;   
            });
            socket.emit('hw_devices', hw_devices);
        });
    });
    
    socket.on('manual_add', function (device, callback) {        
        if (device.settings.homewizard_id.indexOf('HW_') === -1 && device.settings.homewizard_id.indexOf('HW') === 0) {
            //true
            Homey.log('Thermometer added ' + device.data.id);
            devices[device.data.id] = {
              id: device.data.id,
              name: device.name,
              settings: device.settings,
            };
            callback( null, devices );
            socket.emit("success", device);
            startPolling();   
        } else {
            socket.emit("error", "No valid HomeWizard found, re-pair if problem persists");
        }
    });
    
    socket.on('disconnect', function(){
        console.log("User aborted pairing, or pairing is finished");
    });
}

module.exports.init = function(devices_data, callback) {
    devices_data.forEach(function initdevice(device) {
        Homey.log('add device: ' + JSON.stringify(device));
        devices[device.id] = device;
        module.exports.getSettings(device, function(err, settings){
            devices[device.id].settings = settings;
        });
        
    });
    if (Object.keys(devices).length > 0) {
      startPolling();
    }
	Homey.log('Thermometer driver init done');

	callback (null, true);
};

module.exports.deleted = function( device_data ) {
    clearInterval(refreshIntervalId);
    Homey.log("--Stopped Polling--");  
    devices = [];
    Homey.log('deleted: ' + JSON.stringify(device_data));
};


module.exports.capabilities = {

  measure_temperature: {
    get: function (device, callback) {
      if (device instanceof Error) return callback(device);
      console.log("measure_temperature");
      getStatus(device.id);
      newvalue = devices[device.id].temperature;
      // Callback ambient temperature
      callback(null, newvalue);
    }
  },
};

function getStatus(device_id) {
    if(devices[device_id].settings.homewizard_id !== undefined ) {
        var homewizard_id = devices[device_id].settings.homewizard_id;
        var thermometer_id = devices[device_id].settings.thermometer_id;
        homewizard.getDeviceData(homewizard_id, 'thermometers', function(callback) {
            
            if (Object.keys(callback).length > 0) {
                try {
                    for (var index in callback){
                        if (callback[index].id == thermometer_id) {
                            var te = (callback[index].te.toFixed(1) * 2) / 2;
                            var hu = (callback[index].hu.toFixed(1) * 2) / 2;
                            
                            //Check current temperature
                            if (devices[device_id].temperature != te) {
                              console.log("New TE - "+ te);
                              module.exports.realtime( { id: device_id }, "measure_temperature", te );
                              devices[device_id].temperature = te;    
                            } else {
                              console.log("TE: no change");
                            }
                            
                            //Check current humidity
                            if (devices[device_id].humidity != hu) {
                              console.log("New HU - "+ hu);
                              module.exports.realtime( { id: device_id }, "measure_humidity", hu );
                              devices[device_id].humidity = hu;    
                            } else {
                              console.log("HU: no change");
                            }
                        }
                    }
                } catch(err) {
                      console.log ("Thermometer data corrupt");
                }
            }
        });
    } else {
        Homey.log('Removed Thermometer '+ device_id +' (old settings)');
        module.exports.setUnavailable({id: device_id}, "No Thermometer found" );
        clearInterval(refreshIntervalId);
    }
 }
 
 function startPolling() {
    refreshIntervalId = setInterval(function () {
      Homey.log("--Start Thermometer Polling-- ");
      Object.keys(devices).forEach(function (device_id) {
        getStatus(device_id);
      });
    }, 1000 * 10);
 }