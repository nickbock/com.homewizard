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
                Homey.log('HeatLink added ' + device.data.id);
                devices.push({
                  id: device.data.id,
                  name: device.name,
                  settings: device.settings
                })
                callback( null, devices );
                socket.emit("success", device);
                heatlink.startPolling(devices);
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
    callback (null, true);
	devices_data.forEach(function initdevice(device) {
	    Homey.log('add device: ' + JSON.stringify(device));
	    
	    module.exports.getSettings(device, function(err, settings){
		    device.settings = settings;
        
		});
      devices.push(device);
	});
  if (devices.length > 0) {
    heatlink.startPolling(devices)
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
      devices = heatlink.getStatus(devices, device);
      newvalue = devices[0].temperature;
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
      heatlink.getStatus(devices, device);
      if (devices[0].setTemperature != 0) {
        var newvalue = devices[0].setTemperature;
      } else {
        var newvalue = devices[0].thermTemperature;
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

