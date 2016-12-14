var devices = [];
var scenes = [];
var homewizard = require('./../../includes/homewizard.js');
var request = require('request');
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
        if (device.settings.homewizard_id.indexOf('HW_') === -1 && device.settings.homewizard_id.indexOf('HW') === 0) {
            //true
            Homey.log('HeatLink added ' + device.data.id);
            devices[device.data.id] = {
              id: device.data.id,
              name: device.name,
              settings: device.settings,
            }
            callback( null, devices );
            socket.emit("success", device);
            startPolling();   
        } else {
            socket.emit("error", "No valid HomeWizard found, re-pair if problem persists");
        }
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
  if (devices.length > 0) {
    startPolling();
  }
	Homey.log('Heatlink driver init done');

	callback (null, true);
};

module.exports.deleted = function( device_data ) {
    clearInterval(refreshIntervalId);
    console.log("--Stopped Polling--");  
    devices = [];
    Homey.log('deleted: ' + JSON.stringify(device_data));
};


module.exports.capabilities = {

  measure_temperature: {
    get: function (device, callback) {
      if (device instanceof Error) return callback(device);
      console.log("measure_temperature");
      getStatus(device);
      newvalue = devices[device.id].temperature;
      // Callback ambient temperature
      callback(null, newvalue);
    }
  },
  target_temperature: {

    get: function (device, callback) {
      if (device instanceof Error) return callback(device);
      console.log("target_temperature:get");
      // Retrieve updated data
      getStatus(device);
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

function getStatus(device, callback) {
    var homewizard_id = devices[device.id].settings.homewizard_id;
    homewizard.call(homewizard_id, '/get-status', function(err, response) {
      if (err === null) {
        var output = [];
        var rte = (response.heatlinks[0].rte.toFixed(1) * 2) / 2;
        var rsp = (response.heatlinks[0].rsp.toFixed(1) * 2) / 2;
        var tte = (response.heatlinks[0].tte.toFixed(1) * 2) / 2;
        
        Homey.log('New RTE: '+rte);
        Homey.log('New RSP: '+rsp);
        Homey.log('New TTE: '+tte);
        
        //Check current temperature
        if (devices[device.id].temperature != rte) {
          console.log("New RTE - "+ rte);
          module.exports.realtime( { id: device.id }, "measure_temperature", rte );
          devices[device.id].temperature = rte;    
        } else {
          console.log("RTE: no change");
        }
        
        //Check thermostat temperature
        if (devices[device.id].thermTemperature != rsp) {
          console.log("New RSP - "+ rsp);
          if (devices[device.id].setTemperature == 0) {
            module.exports.realtime( { id: device.id }, "target_temperature", rsp );
          }
          devices[device.id].thermTemperature = rsp;    
        } else {
          console.log("RSP: no change");
        }
    
        //Check heatlink set temperature
        if (devices[device.id].setTemperature != tte) {
          console.log("New TTE - "+ tte);
          if (tte > 0) {
            module.exports.realtime( { id: device.id }, "target_temperature", tte );
          } else {
            module.exports.realtime( { id: device.id }, "target_temperature", devices[device.id].thermTemperature );
          }
          devices[device.id].setTemperature = tte;    
        } else {
          console.log("TTE: no change");
        }
      }
    });
 }
 
 function startPolling() {
    refreshIntervalId = setInterval(function () {
      console.log("--Start Polling-- ");
      devices.forEach(function (device) {
        getStatus(device);
      })
    }, 1000 * 10);
 }
