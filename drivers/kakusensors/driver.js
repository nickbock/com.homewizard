'use strict';

const Homey = require('homey');


var devices = {};
var homewizard = require('./../../includes/homewizard.js');
var homewizard_devices;

class HomeWizardKakusensors extends Homey.Driver {

    onInit() {
        console.log('HomeWizard Kakusensors has been inited');
    }

    async onPair(socket) {
        // Show a specific view by ID
        await socket.showView('start');

        // Show the next view
        await socket.nextView();

        // Show the previous view
        await socket.prevView();

        // Close the pair session
        await socket.done();

        // Received when a view has changed
        socket.setHandler('showView', function (viewId) {
          console.log('View: ' + viewId);
          //this.log("data", viewId);
        });


        //socket.on('get_homewizards', function () {
        socket.setHandler('get_homewizards', () => {

            //homewizard_devices = driver.getDevices();
            homewizard_devices = this.homey.drivers.getDriver('homewizard').getDevices();

            homewizard.getDevices(function ( homewizard_devices)  {
                var hw_devices = {};

                Object.keys(homewizard_devices).forEach(function (key) {
                    var kakusensors = JSON.stringify(homewizard_devices[key].polldata.kakusensors);

                    hw_devices[key] = homewizard_devices[key];
                    hw_devices[key].polldata = {}
                    hw_devices[key].kakusensors = kakusensors;
                });

                console.log(hw_devices);
                socket.emit('hw_devices', hw_devices);

            });
        });

        socket.setHandler('manual_add', function (device) {
            if (typeof device.settings.homewizard_id == "string" && device.settings.homewizard_id.indexOf('HW_') === -1 && device.settings.homewizard_id.indexOf('HW') === 0) {
                //true
                console.log('Kakusensor added ' + device.data.id);
                //console.log(device);
                //console.log(device.kakusensors);
                //console.log(device.kakusensors[device.settings.kakusensors_id].type);


                devices[device.data.id] = {
                  id: device.data.id,
                  name: device.name,
                  settings: device.settings,
                  //data: {
                  //      capabilities: [];
                  //}
                };
                //callback( null, devices );
                socket.emit("success", device);
                return devices;

            } else {
                socket.emit("error", "No valid HomeWizard found, re-pair if problem persists");
            }
        });

        socket.setHandler('disconnect', () => {
            console.log("User aborted pairing, or pairing is finished");
        });
    }

    onPairListDevices( data, callback ) {
        const devices = [

        ]

        callback(null, devices);
    }

}

module.exports = HomeWizardKakusensors;
