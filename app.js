"use strict";

function init() {
	var request = require('request');

	Homey.log("HomeWizard app ready!");
	
	Homey.manager('flow').on('condition.check_preset', function( callback, args ){
		var homewizard_ip = Homey.manager('settings').get('homewizard_ip');
		var homewizard_pass = Homey.manager('settings').get('homewizard_pass');
		var homewizard_ledring = Homey.manager('settings').get('homewizard_ledring');
		if (isNaN(homewizard_ledring)) {
          homewizard_ledring = 0;
        }
		request('http://' + homewizard_ip + '/' + homewizard_pass + '/get-status/', function (error, response, body) {
		  if (!error && response.statusCode == 200) {
			var jsonObject = JSON.parse(body);
			if (jsonObject.response.preset == args.preset) {
				Homey.log('Yes, preset is: '+jsonObject.response.preset+'!');
				callback(null, true);
			} else {
				Homey.log('Preset is: '+jsonObject.response.preset+', not '+args.preset);
				callback(null, false);
			}
		  } else {
			Homey.log('Error: '+response.statusCode);
			callback(null, false);
		  }
		});
	});
	
	
	Homey.manager('flow').on('action.set_preset', function( callback, args ){
		var homewizard_ip = Homey.manager('settings').get('homewizard_ip');
		var homewizard_pass = Homey.manager('settings').get('homewizard_pass');
		var homewizard_ledring = Homey.manager('settings').get('homewizard_ledring');
		if (isNaN(homewizard_ledring)) {
          homewizard_ledring = 0;
        }
		request('http://' + homewizard_ip + '/' + homewizard_pass + '/preset/' + args.preset, function (error, response, body) {
		  if (!error && response.statusCode == 200) {	
			var jsonObject = JSON.parse(body);
			if (jsonObject.status == 'ok') {
				if (homewizard_ledring) {
					ledring_pulse('green');
				}
				callback(null, true);
			} else {
				if (homewizard_ledring) {
					ledring_pulse('red');
				}
				callback(null, false);
			}
		  } else {
			Homey.log('Error: '+response.statusCode);
			if (homewizard_ledring) {
				ledring_pulse('red');
			}
			callback(null, false);
		  }
		});
	});
}


function ledring_pulse(colorName) {
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

module.exports.init = init;