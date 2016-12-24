var request = require('request');

module.exports = (function(){
   var homewizard = {};
   var self = {};
   self.devices = [];
   self.polls = [];
   var testdata = {"preset":0,"time":"2016-12-07 20:26","switches":[{"id":0,"type":"dimmer","status":"on","dimlevel":39},{"id":1,"type":"switch","status":"on"},{"id":2,"type":"dimmer","status":"off","dimlevel":0},{"id":3,"type":"switch","status":"off"},{"id":4,"type":"dimmer","status":"off","dimlevel":0},{"id":5,"type":"virtual"},{"id":6,"type":"hue","status":"on","color":{"hue":60,"sat":57,"bri":65}},{"id":7,"type":"virtual"},{"id":8,"type":"virtual"},{"id":9,"type":"switch","status":"on"},{"id":10,"type":"hue","status":"off","color":{"hue":175,"sat":0,"bri":100}},{"id":11,"type":"hue","status":"off","color":{"hue":60,"sat":59,"bri":66}},{"id":12,"type":"virtual"},{"id":13,"type":"hue","status":"off","color":{"hue":68,"sat":88,"bri":10}},{"id":14,"type":"hue","status":"off","color":{"hue":68,"sat":88,"bri":57}},{"id":15,"type":"hue","status":"off","color":{"hue":68,"sat":88,"bri":98}},{"id":16,"type":"hue","status":"off","color":{"hue":68,"sat":88,"bri":19}},{"id":17,"type":"hue","status":"off","color":{"hue":8,"sat":0,"bri":0}},{"id":18,"type":"hue","status":"off","color":{"hue":43,"sat":96,"bri":21}},{"id":19,"type":"hue","status":"on","color":{"hue":307,"sat":99,"bri":18}},{"id":20,"type":"virtual"},{"id":21,"type":"virtual"},{"id":22,"type":"virtual"}],"uvmeters":[],"windmeters":[],"rainmeters":[],"thermometers":[{"id":0,"te":20.3,"hu":47,"favorite":"no"},{"id":1,"te":6.9,"hu":78,"favorite":"no"},{"id":2,"te":20.4,"hu":44,"favorite":"no"},{"id":3,"te":24.7,"hu":43,"favorite":"no"},{"id":4,"te":23.1,"hu":45,"favorite":"no"},{"id":5,"te":7.1,"hu":32,"favorite":"no"}],"weatherdisplays":[], "energymeters":[{"id": 0, "name": "Wattcher", "key": "0", "code": "xxxxxxxxxx", "po": 320, "dayTotal": 5.33, "po+": 2730, "po+t": "6:23", "po-": 120, "po-t": "8:25", "lowBattery": "no", "favorite": "no"}], "energylinks": [{"id":0,"tariff":2,"s1":{"po":114,"dayTotal":0.00,"po+":114,"po+t":"00:01","po-":114,"po-t":"00:01"},"s2":null,"aggregate":{"po":264,"dayTotal":0.00,"po+":264,"po+t":"00:01","po-":264,"po-t":"00:01"},"used":{"po":378,"dayTotal":0.00,"po+":378,"po+t":"00:01","po-":378,"po-t":"00:01"},"gas":{"lastHour":0.23,"dayTotal":0.00},"kwhindex":0.73}], "heatlinks": [{"id": 0, "pump": "off", "heating": "off", "dhw": "off", "rte": 20.230, "rsp": 20.000, "tte": 0.000, "ttm": null, "wp": 1.359, "wte": 0.000, "ofc": 0, "odc": 0}], "kakusensors": [{"id":0,"status":"yes","timestamp":"20:25"},{"id":1,"status":"no","timestamp":"19:17"},{"id":2,"status":"yes","timestamp":"20:25"}]};
   
   homewizard.debug = false;
   homewizard.debug_devices = [];
   homewizard.debug_devices.HW12345 = {
      id: 'HW12345',
      name: 'HomeWizard',
      settings: {
         homewizard_ip: '192.168.1.123',
         homewizard_pass: 'xxxxx',
         homewizard_ledring: true,
      }
   };
   homewizard.debug_devices_data =  [ { id: 'HW12345' }];
   
   homewizard.setDevices = function(devices){
      Homey.log('Devices SET!');
      Homey.log(devices);
      if (homewizard.debug) {
         self.devices = homewizard.debug_devices;
      } else {
         self.devices = devices;  
      }
   };
   
   homewizard.getDevices = function(callback) {
      callback(self.devices); 
   };
   
   homewizard.getDeviceData = function(device_id, data_part, callback) {
      if (typeof self.devices[device_id] === 'undefined' || typeof self.devices[device_id].polldata === 'undefined' || typeof self.devices[device_id].polldata[data_part] === 'undefined') {
         callback([]); 
      } else {
         callback(self.devices[device_id].polldata[data_part]);   
      }
   };
   
   homewizard.call = function(device_id, uri_part, callback) {
      if (homewizard.debug) {
         callback(null, testdata); 
      } else {
         Homey.log('Call device' + device_id);
         if (typeof self.devices[device_id].settings !== 'undefined' && typeof self.devices[device_id].settings.homewizard_ip !== 'undefined' && typeof self.devices[device_id].settings.homewizard_pass !== 'undefined') {
            var homewizard_ip = self.devices[device_id].settings.homewizard_ip;
            var homewizard_pass = self.devices[device_id].settings.homewizard_pass;
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
                  var jsonObject;
                  try {
                     jsonObject = JSON.parse(body);
                     
                     if (jsonObject.status == 'ok') {
                        if(typeof callback === 'function') {
                          callback(null, jsonObject.response); 
                        }
                     }
                  } catch (exception) {
                     Homey.log('JSON: '+ body);
                     jsonObject = null;
                     callback(false); 
                  }
               } else {        
                  if(typeof callback === 'function') {
                    callback(false); 
                  }
                  Homey.log('Error: '+error);
               }
           });
         } else {
            Homey.log('Homewizard '+ device_id +': settings not found!');
        }
      } 
   };
   
   homewizard.getScenes = function(args, callback) {
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
   };
   
   homewizard.ledring_pulse = function(device_id, colorName) {
      var homewizard_ledring =  self.devices[device_id].settings.homewizard_ledring;
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
   };
   
   homewizard.startpoll = function() {
         self.polls.device_id = setInterval(function () {
            homewizard.poll();
         }, 1000 * 10);
   };
   
   homewizard.poll = function() {
      Object.keys(self.devices).forEach(function (device_id) {
         if (typeof self.devices[device_id].polldata === 'undefined') {
            self.devices[device_id].polldata = [];  
         }
         homewizard.call(device_id, '/get-sensors', function(err, response) {
            if (err === null) {
               self.devices[device_id].polldata.preset = response.preset;
               self.devices[device_id].polldata.heatlinks = response.heatlinks;
               self.devices[device_id].polldata.energylinks = response.energylinks;
               self.devices[device_id].polldata.energymeters = response.energymeters;
               //self.devices[device_id].polldata.thermometers = response.thermometers;
               
               Homey.log('HW-Data polled for: '+device_id);
            }
         });
      });
   };
   
   return homewizard;
})();
