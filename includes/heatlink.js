var homewizard = require('./../../includes/homewizard.js');
var request = require('request');

module.exports = (function(){
   var heatlink = {};
   var self = {};
   self.devices = [];
   
   heatlink.setDevices = function(devices){
         self.devices = devices;
         Homey.log('Devices updated!!!');
         Homey.log(self.devices);
   };
    
   heatlink.getStatus = function(device, callback) {
      var homewizard_id = self.devices[device.id].settings.homewizard_id;
      Homey.log(homewizard_id);
      homewizard.call(homewizard_id, '/get-status', function(err, response) {
        if (err === null) {
          var output = [];
          var rte = (response.heatlinks[0].rte.toFixed(1) * 2) / 2;
          var rsp = (response.heatlinks[0].rsp.toFixed(1) * 2) / 2;
          var tte = (response.heatlinks[0].tte.toFixed(1) * 2) / 2;
          
          if (typeof self.devices[device.id].settings === 'undefined') {
            var logip = 'undefined';
          } else {
            var logip = self.devices[device.id].homewizard_ip;
          }
      
          console.log(device.id + ' - ' + logip);
          
          //Check current temperature
          if (self.devices[device.id].temperature != rte) {
            console.log("New RTE - "+ rte);
            //module.exports.realtime( { id: device.id }, "measure_temperature", rte );
            self.devices[device.id].temperature = rte;    
          } else {
            console.log("RTE: no change");
          }
          
          //Check thermostat temperature
          if (self.devices[device.id].thermTemperature != rsp) {
            console.log("New RSP - "+ rsp);
            if (self.devices[device.id].setTemperature == 0) {
              //module.exports.realtime( { id: device.id }, "target_temperature", rsp );
            }
            self.devices[device.id].thermTemperature = rsp;    
          } else {
            console.log("RSP: no change");
          }
      
          //Check heatlink set temperature
          if (self.devices[device.id].setTemperature != tte) {
            console.log("New TTE - "+ tte);
            if (tte > 0) {
              //module.exports.realtime( { id: device.id }, "target_temperature", tte );
            } else {
              //module.exports.realtime( { id: device.id }, "target_temperature", self.devices[device.id].thermTemperature );
            }
            self.devices[device.id].setTemperature = tte;    
          } else {
            console.log("TTE: no change");
          }
        }
      });
   }
   
   heatlink.startPolling = function() {
      refreshIntervalId = setInterval(function () {
        console.log("--Start Polling-- ");
        self.devices.forEach(function (device) {
          this.getStatus(device);
        })
      }, 1000 * 10);
   }
   
   return heatlink;
})();
