var request = require('request');

module.exports = (function(){
   var heatlink = {};
    
   heatlink.getStatus = function(device, callback) {
      homewizard.call(device.id, '/get-status', function(err, response) {
        if (err === null) {
          var output = [];
          var rte = (response.heatlinks[0].rte.toFixed(1) * 2) / 2;
          var rsp = (response.heatlinks[0].rsp.toFixed(1) * 2) / 2;
          var tte = (response.heatlinks[0].tte.toFixed(1) * 2) / 2;
          
          if (typeof devices[device.id].settings === 'undefined') {
            var logip = 'undefined';
          } else {
            var logip = devices[device.id].homewizard_ip;
          }
      
          console.log(device.id + ' - ' + logip);
          
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
   
   heatlink.startPolling = function(devices) {
      refreshIntervalId = setInterval(function () {
        console.log("--Start Polling-- ");
        devices.forEach(function (device) {
          this.getStatus(device);
        })
      }, 1000 * 10);
   }
   
   return heatlink;
})();
