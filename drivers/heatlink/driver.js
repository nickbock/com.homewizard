var devices = [];
var scenes = [];
var request = require('request');

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
	devices_data.forEach(function initdevice(device) {
	    Homey.log('add device: ' + JSON.stringify(device));
	    
	    module.exports.getSettings(device, function(err, settings){
		    device.settings = settings;
        
		});
      devices.push(device);
	});

  startPolling()
	Homey.log('HomeWizard driver init done');

	callback (null, true);
};

module.exports.deleted = function( device_data ) {  
    Homey.log('deleted: ' + JSON.stringify(device_data));
    devices[device_data.id] = [];
};


module.exports.capabilities = {

  measure_temperature: {
    get: function (device, callback) {
      if (device instanceof Error) return callback(device);
      console.log("measure_temperature")
      getStatus(device);
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
      getStatus(device);
      var newvalue = devices[0].setTemperature;
      callback(null, newvalue);

    },

    set: function (device, temperature, callback) {
      if (device instanceof Error) return callback(device);
        // /hl/0/settarget/15.5
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
        callHomeWizard2(device, '/hl/0/settarget/'+temperature, function(err, response) {
            console.log(err);
            if (callback) callback(err, temperature);
          }
        )
      

    }
  },

};



function getStatus(device, callback) {
  callHomeWizard2( device, '/get-status', function(err, response) {
    if (err === null) {
      var output = [];
      
      var rte = (response.heatlinks[0].rte.toFixed(1) * 2) / 2;
      var rsp = (response.heatlinks[0].rsp.toFixed(1) * 2) / 2;
      var tte = (response.heatlinks[0].tte.toFixed(1) * 2) / 2;

      if (devices[0].temperature != rte) {
        console.log("New RTE - "+ rte);
        
        module.exports.realtime( { id: device.id }, "measure_temperature", rte );
        devices[0].temperature = rte;    
      } else {
        console.log("RTE: no change");
      }
      
      if (devices[0].thermTemperature != rsp) {
        console.log("New RSP - "+ rsp);
        if (devices[0].setTemperature == 0) {
          module.exports.realtime( { id: device.id }, "target_temperature", rsp );
        }
        devices[0].thermTemperature = rsp;    
      } else {
        console.log("RSP: no change");
      }

      if (devices[0].setTemperature != tte) {
        console.log("New TTE - "+ tte);
        
        if (tte > 0) {
          module.exports.realtime( { id: device.id }, "target_temperature", tte );
        } else {
          module.exports.realtime( { id: device.id }, "target_temperature", devices[0].thermTemperature );
        }
        devices[0].setTemperature = tte;    
      } else {
        console.log("TTE: no change");
      }

      console.log(device);
      //callback(null, rte);
    }
    
  }

    )
}

function startPolling() {
  setInterval(function () {
    //console.log("--Start Polling 1--");
    //console.log(devices);
    devices.forEach(function (device) {
      console.log("--Start Polling--");
      //console.log(device);
      getStatus(device);
      //console.log("New temp: "+ rte);
      
    })
  }, 1000 * 10);
}

function ledring_pulse(args, colorName) {
    var homewizard_ledring = devices[args.device.id].settings.homewizard_ledring;
    if (homewizard_ledring) {
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
}

function callHomeWizard(args, uri_part, callback) {
  var homewizard_ip = devices[args.device.id].settings.homewizard_ip;
  var homewizard_pass = devices[args.device.id].settings.homewizard_pass;
  request({
      uri: 'http://' + homewizard_ip + '/' + homewizard_pass + uri_part,
      method: "GET",
      timeout: 10000,
    }, function (error, response, body) {
      if (response === null || response === undefined) {
          callback(false); 
          return;
      }
      if (!error && response.statusCode == 200) {	
        var jsonObject = JSON.parse(body);
        if (jsonObject.status == 'ok') {
            if(typeof callback === 'function') {
              callback(null, jsonObject.response); 
            }
        }
      } else {        
        if(typeof callback === 'function') {
          callback(false); 
        }
        Homey.log('Error: '+error);
      }
  });
}

function callHomeWizard2(device, uri_part, callback) {
  var homewizard_ip = devices[0].settings.homewizard_ip;
  var homewizard_pass = devices[0].settings.homewizard_pass;
  request({
      uri: 'http://' + homewizard_ip + '/' + homewizard_pass + uri_part,
      method: "GET",
      timeout: 10000,
    }, function (error, response, body) {
      if (response === null || response === undefined) {
          callback(false); 
          return;
      }
      if (!error && response.statusCode == 200) { 
        var jsonObject = JSON.parse(body);
        if (jsonObject.status == 'ok') {
            if(typeof callback === 'function') {
              callback(null, jsonObject.response); 
            }
        }
      } else {        
        if(typeof callback === 'function') {
          callback(false); 
        }
        Homey.log('Error: '+error);
      }
  });
}

