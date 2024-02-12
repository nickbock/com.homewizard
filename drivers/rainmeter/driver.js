'use strict';

const Homey = require('homey');

var devices = {};
var homewizard = require('./../../includes/homewizard.js');
var homewizard_devices;

class HomeWizardRainmeter extends Homey.Driver {

  onInit() {
        console.log('HomeWizard Rainmeter has been inited');
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
                    hw_devices[key] = homewizard_devices[key];
                });

                console.log(hw_devices);
                socket.emit('hw_devices', hw_devices);

            });
        });

        socket.setHandler('manual_add', function (device) {

            if (device.settings.homewizard_id.indexOf('HW_') === -1 && device.settings.homewizard_id.indexOf('HW') === 0) {
                //true
                console.log('Rainmeter added ' + device.data.id);
                devices[device.data.id] = {
                    id: device.data.id,
                    name: device.name,
                    settings: device.settings,
                };
                socket.emit("success", device);
                return devices;

            } else {
                socket.emit("error", "No valid HomeWizard found, re-pair if problem persists");
            }
        });

        socket.setHandler('disconnect', function(){
            console.log("User aborted pairing, or pairing is finished");
        });

    }

}

module.exports = HomeWizardRainmeter;
