var request = require('request');

module.exports = {
   
   call: function(device_id, uri_part, callback) {
      var debug = true;
      var homewizard_ip = devices[device_id].settings.homewizard_ip;
      var homewizard_pass = devices[device_id].settings.homewizard_pass;
      if (debug) {
         callback(null, "empty data");
      } else {
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
   },
   
   getScenes: function(args, callback) {
      this.call(args.args.device.id, '/gplist', function(err, response) {
        if (err === null) {
          var output = [];
          for (var i = 0, len = response.length; i < len; i++) {
              if (response[i].name.toLowerCase().indexOf(args.query.toLowerCase()) !== -1) {
                  output[output.length] = response[i];
              }
          }
          if(typeof callback === 'function') {
            callback(null, output); 
          }  
        } else {
          callback(err); // err
        }
      });
   },
   
   ledring_pulse: function(device_id, colorName) {
      var homewizard_ledring = devices[device_id].settings.homewizard_ledring;
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
   },
   
   sayHelloInEnglish: function() {
     return this.sayHelloInSpanish();
   },
        
   sayHelloInSpanish: function() {
     return "Hola";
   }
};


//module.exports.homewizard = (function(){
//call = (function(){
//   var homewizard = {};
//
//   homewizard.settings = function() {
//
//   }
//
//   homewizard.call = function(){
//       
//   };
//   
//   self.getScenes = function(){
//   
//   };
//   
//   
//   return self;
//})();