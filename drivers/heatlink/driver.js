var devices = [];
var scenes = [];
var homewizard = require('./../../includes/homewizard.js');
var heatlink = require('./../../includes/heatlink.js');
var request = require('request');
var refreshIntervalId = 0;

// SETTINGS
module.exports.settings = function( device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback ) {
    Homey.log ('Changed settings: ' + JSON.stringify(device_data) + ' / ' + JSON.stringify(newSettingsObj) + ' / old = ' + JSON.stringify(oldSettingsObj));
    try {
	    changedKeysArr.forEach(function (key) {
		    devices[device_data.id].settings[key] = newSettingsObj[key];
		});
        heatlink.setDevices(devices);
		callback(null, true);
    } catch (error) {
      callback(error); 
    }
};

module.exports.pair = function( socket ) {
    socket.on('get_homewizards', function (device, callback) {
        homewizard.getDevices(function(homewizard_devices) {
            
            Homey.log(homewizard_devices);
            var hw_devices = {};
            Object.keys(homewizard_devices).forEach(function(key) {
                hw_devices[key] = homewizard_devices[key];
            });
            
            socket.emit('hw_devices', hw_devices);
        });
    });
    
    socket.on('manual_add', function (device, callback) {                
        //true
        Homey.log('HeatLink added ' + device.data.id);
        devices[device.data.id] = {
          id: device.data.id,
          name: device.name,
          settings: device.settings,
          capabilities: device.capabilities
        }
        heatlink.setDevices(devices);
        callback( null, devices );
        socket.emit("success", device);
        heatlink.startPolling();
    });
    
    socket.on('disconnect', function(){
        console.log("User aborted pairing, or pairing is finished");
    })
}

module.exports.init = function(devices_data, callback) {
    devices_data.forEach(function initdevice(device) {
        Homey.log('add device: ' + JSON.stringify(device));
        devices[device.id] = device;
        module.exports.getSettings(device, function(err, settings){
            devices[device.id].settings = settings;
        });
    });
    heatlink.setDevices(devices);
  if (devices.length > 0) {
    heatlink.startPolling();
  }
	Homey.log('Heatlink driver init done');

	callback (null, true);
};

module.exports.deleted = function( device_data ) {
    clearInterval(refreshIntervalId);
    console.log("--Stopped Polling--");  
    devices = [];
    heatlink.setDevices(devices);
    Homey.log('deleted: ' + JSON.stringify(device_data));
};


module.exports.capabilities = {

  measure_temperature: {
    get: function (device, callback) {
      if (device instanceof Error) return callback(device);
      console.log("measure_temperature");
      heatlink.getStatus(device);
      newvalue = devices[device.id].temperature;
      // Callback ambient temperature
      //console.log(newvalue);
      callback(null, newvalue);
    }
  },
  target_temperature: {

    get: function (device, callback) {
      if (device instanceof Error) return callback(device);
      console.log("target_temperature:get");
      // Retrieve updated data
      heatlink.getStatus(device);
      if (devices[device.id].setTemperature != 0) {
        var newvalue = devices[device.id].setTemperature;
      } else {
        var newvalue = devices[device.id].thermTemperature;
      }
      callback(null, newvalue);
    },

    set: function (device, temperature, callback) {
      if (device instanceof Error) return callback(device);
        // Catch faulty trigger and max/min temp
        if (!temperature) {
          callback(true, temperature);
          return false;
        }
        else if (temperature < 5) {
          temperature = 5;
        }
        else if (temperature > 35) {
          temperature = 35;
        }
        temperature = Math.round(temperature.toFixed(1) * 2) / 2;
        var url = '/hl/0/settarget/'+temperature;
        console.log(url);
        homewizard.call(device, '/hl/0/settarget/'+temperature, function(err, response) {
            console.log(err);
            if (callback) callback(err, temperature);
          }
        )
    }
  },
};