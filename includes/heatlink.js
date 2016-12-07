var homewizard = require('./homewizard.js');
var request = require('request');

module.exports = {
   
   getStatus: function(devices, device, callback) {
      homewizard.call(devices, device, '/get-status', function(err, response) {
        if (err === null) {
          var output = [];
          var rte = (response.heatlinks[0].rte.toFixed(1) * 2) / 2;
          var rsp = (response.heatlinks[0].rsp.toFixed(1) * 2) / 2;
          var tte = (response.heatlinks[0].tte.toFixed(1) * 2) / 2;
          
          if (typeof device.settings === 'undefined') {
            var logip = 'undefined';
          } else {
            var logip = device.settings.homewizard_ip;
          }
    
          console.log(device.id + ' - ' + logip);
          
          //Check current temperature
          if (devices[0].temperature != rte) {
            console.log("New RTE - "+ rte);
            module.exports.realtime( { id: device.id }, "measure_temperature", rte );
            devices[0].temperature = rte;    
          } else {
            console.log("RTE: no change");
          }
          
          //Check thermostat temperature
          if (devices[0].thermTemperature != rsp) {
            console.log("New RSP - "+ rsp);
            if (devices[0].setTemperature == 0) {
              module.exports.realtime( { id: device.id }, "target_temperature", rsp );
            }
            devices[0].thermTemperature = rsp;    
          } else {
            console.log("RSP: no change");
          }
    
          //Check heatlink set temperature
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
        }
      })
   },
   
   startPolling: function(devices) {
      refreshIntervalId = setInterval(function () {
        console.log("--Start Polling-- ");
        devices.forEach(function (device) {
          this.getStatus(devices, device);
        })
      }, 1000 * 10);
    },
};
