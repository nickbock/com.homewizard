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
            Homey.log('Energylink added ' + device.data.id);
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
	Homey.log('Energylink driver init done');

	callback (null, true);
};

module.exports.deleted = function( device_data ) {
    clearInterval(refreshIntervalId);
    console.log("--Stopped Polling Energy Link--");  
    devices = [];
    Homey.log('deleted: ' + JSON.stringify(device_data));
};

module.exports.capabilities = {
    "measure_power.used": {
        get: function (device_data, callback) {
            var device = devices[device_data.id];

            if (device === undefined) {
                callback(null, 0);
            } else {
                callback(null, device.last_measure_power_used);
            }
        }
    },
    "measure_power.s1": {
        get: function (device_data, callback) {
            var device = devices[device_data.id];

            if (device === undefined) {
                callback(null, 0);
            } else {
                callback(null, device.last_measure_power_s1);
            }
        }
    },
    "meter_power.used": {
        get: function (device_data, callback) {
            var device = devices[device_data.id];

            if (device === undefined) {
                callback(null, 0);
            } else {
                callback(null, device.last_meter_power_used);
            }
        }
    },
    "meter_power.s1": {
        get: function (device_data, callback) {
            var device = devices[device_data.id];

            if (device === undefined) {
                callback(null, 0);
            } else {
                callback(null, device.last_meter_power_s1);
            }
        }
    },
    meter_gas: {
        get: function (device_data, callback) {
            var device = devices[device_data.id];

            if (device === undefined) {
                callback(null, 0);
            } else {
                callback(null, device.last_meter_gas);
            }
        }
    }
};

// Start polling
function startPolling() {
  refreshIntervalId = setInterval(function () {
    console.log("--Start Polling Energylink-- ");
    devices.forEach(function (device) {
      getStatus(device);
    })
  }, 1000 * 10);
}

function getStatus(device, callback) {
    var homewizard_id = devices[device.id].settings.homewizard_id;
   homewizard.call(homewizard_id, '/get-status', function(err, response) {
    if (err === null) {
      var output = [];
      try {
           var energy_current_cons = ( response.energylinks[0].used.po ); // WATTS Energy used JSON $energylink[0]['used']['po']
           var energy_current_prod = ( response.energylinks[0].s1.po ); // WATTS Energy produced via S1 $energylink[0]['s1']['po']
           var energy_daytotal_cons = ( response.energylinks[0].used.dayTotal ); // KWH Energy used JSON $energylink[0]['used']['po']
           var energy_daytotal_prod = ( response.energylinks[0].s1.dayTotal ); // KWH Energy produced via S1 $energylink[0]['s1']['po']
           var gas_daytotal_cons = ( response.energylinks[0].gas.dayTotal ); // m3 Energy produced via S1 $energylink[0]['gas']['dayTotal']
           module.exports.setAvailable({id: device.id});
           if (typeof devices[device.id].settings === 'undefined') {
             var logip = 'undefined';
           } else {
             var logip = devices[device.id].settings.homewizard_ip;
           }
           
           console.log(device.id + ' - ' + logip);
     			
     			// Consumed elec current
     			module.exports.realtime( { id: device.id }, "measure_power.used", energy_current_cons );
     			// Consumed elec total day
     			module.exports.realtime( { id: device.id }, "meter_power.used", energy_daytotal_cons );
     			// Produced elec current
     			module.exports.realtime( { id: device.id }, "measure_power.s1", energy_current_prod );
     			// Produced elec total day
     			module.exports.realtime( { id: device.id }, "meter_power.s1", energy_daytotal_prod );
     			// Consumed gas      
     			module.exports.realtime( { id: device.id }, "meter_gas", gas_daytotal_cons );
     			
     			// Trigger flows
     			if (energy_current_cons != device.last_measure_power_used) {
     				  console.log("Current Power - "+ energy_current_cons);
     			    module.exports.realtime( { id: device.id }, "measure_power.used", energy_current_cons );
     			    Homey.manager('flow').triggerDevice('power_used_changed', {
     			    	 power_used: energy_current_cons
     			    },
     			    null,
     			    { id: device.id }
     			    );
     		  }
     			if (energy_current_prod != device.last_measure_power_s1) {
     				  console.log("Current S1 - "+ energy_current_prod);
     			    module.exports.realtime( { id: device.id }, "measure_power.s1", energy_current_prod );
     			    Homey.manager('flow').triggerDevice('power_s1_changed', {
     			    	 power_s1: energy_current_prod
     			    },
     			    null,
     			    { id: device.id }
     			    );
     		  }
     			if (energy_daytotal_cons != device.last_meter_power_used) {
     				  console.log("Used Daytotal- "+ energy_daytotal_cons);                                
     			    module.exports.realtime( { id: device.id }, "meter_power.used", energy_daytotal_cons );
         			Homey.manager('flow').triggerDevice('meter_power_used_changed', {                             
         	 		power_daytotal_used: energy_daytotal_cons                                                      
         			},                                                                                    
         			null,                                                                                 
         			{ id: device.id }                                                                     
         			);                                                                                    
         	}
         	if (energy_daytotal_prod != device.last_meter_power_s1) {                                
         		  console.log("S1 Daytotal- "+ energy_daytotal_prod);                                
     			    module.exports.realtime( { id: device.id }, "meter_power.s1", energy_daytotal_prod );
         			Homey.manager('flow').triggerDevice('meter_power_s1_changed', {                             
         	 		power_daytotal_s1: energy_daytotal_prod                                                      
         			},                                                                                    
         			null,                                                                                 
         			{ id: device.id }                                                                     
         			);                                                                                    
     
         	}
     }
     catch(err) {
     
     		// Error with Energylink no data in Energylink
		 		console.log ("No Energylink found");
    		module.exports.setUnavailable({id: device.id}, "No Energylink found" );
    }
   } 
  })
}
