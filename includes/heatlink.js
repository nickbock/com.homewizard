var request = require('request');

module.exports = {
   
   startPolling: function(devices) {
      refreshIntervalId = setInterval(function () {
        console.log("--Start Polling-- ");
        devices.forEach(function (device) {
          this.getStatus(device);
        })
      }, 1000 * 10);
    },
};
