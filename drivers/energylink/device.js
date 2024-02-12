'use strict';

const Homey = require('homey');
const homewizard = require('./../../includes/homewizard.js');

const debug = false;

var refreshIntervalId;
var refreshIntervalIdReadings;

class HomeWizardEnergylink extends Homey.Device {

	onInit() {

		console.log('HomeWizard Energylink: "'+this.getName() +'" has been added'); 

		this.startPolling();

		// Init flow triggers
		this._flowTriggerPowerUsed = this.homey.flow.getDeviceTriggerCard('power_used_changed');
		this._flowTriggerPowerNetto = this.homey.flow.getDeviceTriggerCard('power_netto_changed');
		this._flowTriggerPowerS1 = this.homey.flow.getDeviceTriggerCard('power_s1_changed');
		this._flowTriggerMeterPowerS1 = this.homey.flow.getDeviceTriggerCard('meter_power_s1_changed');
		this._flowTriggerPowerS2 = this.homey.flow.getDeviceTriggerCard('power_s2_changed');
		this._flowTriggerMeterPowerS2 = this.homey.flow.getDeviceTriggerCard('meter_power_s2_changed');
		this._flowTriggerMeterPowerUsed = this.homey.flow.getDeviceTriggerCard('meter_power_used_changed');
		this._flowTriggerMeterPowerAggregated = this.homey.flow.getDeviceTriggerCard('meter_power_aggregated_changed');
		this._flowTriggerMeterReturnT1 = this.homey.flow.getDeviceTriggerCard('meter_return_t1_changed');
		this._flowTriggerMeterReturnT2 = this.homey.flow.getDeviceTriggerCard('meter_return_t2_changed');

	}

	flowTriggerPowerUsed( device, tokens ) {
		this._flowTriggerPowerUsed.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerPowerNetto( device, tokens ) {
		this._flowTriggerPowerNetto.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerPowerS1( device, tokens ) {
		this._flowTriggerPowerS1.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerMeterPowerS1( device, tokens ) {
		this._flowTriggerMeterPowerS1.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerPowerS2( device, tokens ) {
		this._flowTriggerPowerS2.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerMeterPowerS2( device, tokens ) {
		this._flowTriggerMeterPowerS2.trigger( device, tokens ).catch( this.error )
	}
	flowTriggerMeterPowerUsed( device, tokens ) {
		this._flowTriggerMeterPowerUsed.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerMeterPowerAggregated( device, tokens ) {
		this._flowTriggerMeterPowerAggregated.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerMeterReturnT1( device, tokens ) {
		this._flowTriggerMeterReturnT1.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerMeterReturnT2( device, tokens ) {
		this._flowTriggerMeterReturnT2.trigger( device, tokens ).catch( this.error )
	}

	startPolling() {

		// Clear interval
		if (this.refreshIntervalId) {
				clearInterval(this.refreshIntervalId);
		}

		this.refreshIntervalId = setInterval(() => {

			if (debug) {console.log("--Start Energylink Polling-- ");}
			if (debug) {console.log(this.getSetting('homewizard_id'));}
			if(this.getSetting('homewizard_id') !== undefined ) {
				if (debug) {console.log('Poll for '+this.getName());}

				this.getStatus();
			}

		}, 1000 * 15);

		// Clear interval
		if (this.refreshIntervalIdReadings) {
					clearInterval(this.refreshIntervalIdReadings);
		}

		this.refreshIntervalIdReadings = setInterval(() => {
			if (debug) {console.log("--Start Energylink Readings Polling-- ");}

			if(this.getSetting('homewizard_id') !== undefined ) {
				if (debug) {console.log('Poll for ' + this.getName());}

				this.getReadings();

			}
		}, 1000 * 60);

	}


	async getStatus() {
		
		const homewizard_id = this.getSetting('homewizard_id');

		const me = this;

//		homewizard.getDeviceData(homewizard_id, 'energylinks', async function(callback){
		const callback = await homewizard.getDeviceData(homewizard_id, 'energylinks');
		try {

			if (Object.keys(callback).length > 0) {

			//	try {

					me.setAvailable();

					const promises = []; 

					let value_s1 = ( callback[0].t1 ) ; // Read t1 from energylink (solar/water/null)
					let value_s2 = ( callback[0].t2 ) ; // Read t2 from energylink (solar/water/null)
					if (debug) {console.log("t1- " + value_s1);}
					if (debug) {console.log("t2- " + value_s2);}

					// Common Energylink data
					let energy_current_cons = ( callback[0].used.po ); // WATTS Energy used JSON $energylink[0]['used']['po']
					let energy_daytotal_cons = ( callback[0].used.dayTotal ); // KWH Energy used JSON $energylink[0]['used']['dayTotal']
					let energy_daytotal_aggr = ( callback[0].aggregate.dayTotal ) ; // KWH Energy aggregated is used - generated $energylink[0]['aggregate']['dayTotal']
					let energy_current_netto = ( callback[0].aggregate.po ); // Netto power usage from aggregated value, this value can go negative

					// Some Energylink do not have gas information so try to get it else fail silently
					try {
						let gas_daytotal_cons = ( callback[0].gas.dayTotal ); // m3 Energy produced via S1 $energylink[0]['gas']['dayTotal']
						// Consumed gas
						await me.setCapabilityValue("meter_gas.today", gas_daytotal_cons).catch(me.error);
					}
					catch(err) {
						// Error with Energylink no data in Energylink
						console.log ("No Gas information found");
					}

					// Consumed elec current
					promises.push(me.setCapabilityValue('measure_power.used', energy_current_cons).catch(me.error));
					// Consumed elec current
					promises.push(me.setCapabilityValue('measure_power', energy_current_netto).catch(me.error));
					// Consumed elec current Netto
					promises.push(me.setCapabilityValue('measure_power.netto', energy_current_netto).catch(me.error));
					// Consumed elec total day
					promises.push(me.setCapabilityValue('meter_power.used', energy_daytotal_cons).catch(me.error));
					// Consumed elec total day
				    promises.push(me.setCapabilityValue('meter_power.aggr', energy_daytotal_aggr).catch(me.error));


         			 // Disable meter_power
					// me.removeCapability('meter_power');
					// Set solar used to zero before counting
					let solar_current_prod = 0;
					let solar_daytotal_prod = 0;
					let energy_current_prod = 0;
					let energy_daytotal_prod = 0;
					let water_current_cons = 0;
					let water_daytotal_cons = 0;


					if (value_s1 == 'solar' ) {
						energy_current_prod = ( callback[0].s1.po ); // WATTS Energy produced via S1 $energylink[0]['s1']['po']
						energy_daytotal_prod = ( callback[0].s1.dayTotal ); // KWH Energy produced via S1 $energylink[0]['s1']['po']

						solar_current_prod = solar_current_prod + energy_current_prod;
						solar_daytotal_prod = solar_daytotal_prod + energy_daytotal_prod;

						if (me.hasCapability('meter_power.s1other')) {
							promises.push(me.removeCapability('meter_power.s1other').catch(me.error));
							promises.push(me.removeCapability('measure_power.s1other').catch(me.error));
						}
					}

					if (value_s2 == 'solar' ) {
						energy_current_prod = ( callback[0].s2.po ); // WATTS Energy produced via S1 $energylink[0]['s2']['po']
						energy_daytotal_prod = ( callback[0].s2.dayTotal ); // KWH Energy produced via S1 $energylink[0]['s2']['dayTotal']

						solar_current_prod = solar_current_prod + energy_current_prod;
						solar_daytotal_prod = solar_daytotal_prod + energy_daytotal_prod;
						if (me.hasCapability('meter_power.s2other')) {
							promises.push(me.removeCapability('meter_power.s2other').catch(me.error));
							promises.push(me.removeCapability('measure_power.s2other').catch(me.error));
						}
					}

					if(value_s1 == 'solar' || value_s2 == 'solar') {
						promises.push(me.setCapabilityValue("measure_power.s1", solar_current_prod ).catch(me.error));
						promises.push(me.setCapabilityValue("meter_power.s1", solar_daytotal_prod ).catch(me.error));
						if (me.hasCapability('meter_power.s1other')) {
							promises.push(me.removeCapability('meter_power.s1other').catch(me.error));
							promises.push(me.removeCapability('measure_power.s1other').catch(me.error));
						}
					}

					if (value_s1 == 'water' ) {
						water_current_cons = ( callback[0].s1.po ); // Water used via S1 $energylink[0]['s1']['po']
						water_daytotal_cons = ( callback[0].s1.dayTotal / 1000 ); // Water used via S1 $energylink[0]['s1']['dayTotal']
						//console.log("Water- " + water_daytotal_cons);
						// Used water m3
						promises.push(me.setCapabilityValue("meter_water", water_daytotal_cons).catch(me.error));
						promises.push(me.setCapabilityValue("measure_water", water_current_cons).catch(me.error));

						if (me.hasCapability('meter_power.s1other')) {
							promises.push(me.removeCapability('meter_power.s1other').catch(me.error));
							promises.push(me.removeCapability('measure_power.s1other').catch(me.error));
						}
					}

					if (value_s2 == 'water' ) {
						water_current_cons = ( callback[0].s2.po ); // Water used via S2 $energylink[0]['s1']['po']
						water_daytotal_cons = ( callback[0].s2.dayTotal / 1000 ); // Water used via S1 $energylink[0]['s2']['dayTotal']
						//console.log("Water- " + water_daytotal_cons);
						// Used water m3
						promises.push(me.setCapabilityOptions("meter_water", {"decimals":3}).catch(me.error));
						promises.push(me.setCapabilityValue("meter_water", water_daytotal_cons).catch(me.error));
						promises.push(me.setCapabilityValue("measure_water", water_current_cons).catch(me.error));
						if (me.hasCapability('meter_power.s2other')) {
							promises.push(me.removeCapability('meter_power.s2other').catch(me.error));
							promises.push(me.removeCapability('measure_power.s2other').catch(me.error));
						}
					}

					if (value_s1 == 'other' || value_s1 == 'car') {
						let other_current_cons_s1 = ( callback[0].s1.po ); // Other used via S1 $energylink[0]['s1']['po']
						let other_daytotal_cons_s1 = ( callback[0].s1.dayTotal ); // Other used via S1 $energylink[0]['s1']['dayTotal']
						//console.log("Other- " + other_daytotal_cons_s1);
						// Used power
						promises.push(me.setCapabilityValue("meter_power.s1other", other_daytotal_cons_s1).catch(me.error));
						promises.push(me.setCapabilityValue("measure_power.s1other", other_current_cons_s1).catch(me.error));
					}

					if (value_s2 == 'other' || value_s2 == 'car' ) {
						let other_current_cons_s2 = ( callback[0].s2.po ); // Other used via S2 $energylink[0]['s1']['po']
						let other_daytotal_cons_s2 = ( callback[0].s2.dayTotal ); // Other used via S1 $energylink[0]['s2']['dayTotal']
						//console.log("Other- " + other_daytotal_cons_s2);
						// Used power
						promises.push(me.setCapabilityValue("meter_power.s2other", other_daytotal_cons_s2).catch(me.error));
						promises.push(me.setCapabilityValue("measure_power.s2other", other_current_cons_s2).catch(me.error));
					}

					// Trigger flows
					if (energy_current_cons != me.getStoreValue("last_measure_power_used") && energy_current_cons != undefined && energy_current_cons != null) {
						//console.log("Current Power - "+ energy_current_cons);
						promises.push(me.flowTriggerPowerUsed(me, { power_used: energy_current_cons }));
						me.setStoreValue("last_measure_power_used",energy_current_cons);
					}
					if (energy_current_netto != me.getStoreValue('last_measure_power_netto') && energy_current_netto != undefined && energy_current_netto != null) {
					    //console.log("Current Netto Power - "+ energy_current_netto);
						promises.push(me.flowTriggerPowerNetto(me, { netto_power_used: energy_current_netto }));
						me.setStoreValue("last_measure_power_netto",energy_current_netto);
					}

					if (value_s1 != 'other' || value_s1 != 'car') {
						if (energy_current_prod != me.getStoreValue('last_measure_power_s1') && energy_current_prod != undefined && energy_current_prod != null) {
					        //console.log("Current S1 Solar- "+ solar_current_prod);
						promises.push(me.flowTriggerPowerS1(me, { power_s1: solar_current_prod }));
						me.setStoreValue("last_measure_power_s1",solar_current_prod);

						}
					}
					if (value_s1 == 'other' || value_s1 == 'car') {
						let other_current_cons_s1 = ( callback[0].s1.po ); // Other used via S1 $energylink[0]['s1']['po']
						if (other_current_cons_s1 != me.getStoreValue('last_measure_power_s1') && other_current_cons_s1 != undefined && other_current_cons_s1 != null) {
									//console.log("Current S1 - "+ other_current_cons_s1);
						promises.push(me.flowTriggerPowerS1(me, { power_s1: other_current_cons_s1 }));
						me.setStoreValue("last_measure_power_s1",other_current_cons_s1);

						}
					}

					if (value_s2 == 'other' || value_s2 == 'car') {
						let other_current_cons_s2 = ( callback[0].s2.po ); // Other used via S2 $energylink[0]['s1']['po']
						if (other_current_cons_s2 != me.getStoreValue('last_measure_power_s2') && other_current_cons_s2 != undefined && other_current_cons_s2 != null) {
									//console.log("Current S2 - "+ other_current_cons_s2);
						promises.push(me.flowTriggerPowerS2(me, { power_s2: other_current_cons_s2 }));
						me.setStoreValue("last_measure_power_s2",other_current_cons_s2);

						}
					}


					if (energy_daytotal_cons != me.getStoreValue('last_meter_power_used') && energy_daytotal_cons != undefined && energy_daytotal_cons != null) {
					    //console.log("Used Daytotal- "+ energy_daytotal_cons);
						promises.push(me.flowTriggerMeterPowerUsed(me, { power_daytotal_used: energy_current_prod }));
						me.setStoreValue("last_meter_power_used",energy_daytotal_cons);
					}

          			if (value_s1 != 'other' || value_s1 != 'car') {
						if (energy_daytotal_prod != me.getStoreValue('last_meter_power_s1') && energy_daytotal_prod != undefined && energy_daytotal_prod != null) {
					    	//console.log("S1 Daytotal Solar- "+ solar_daytotal_prod);
							promises.push(me.flowTriggerMeterPowerS1(me, { power_daytotal_s1: solar_daytotal_prod }));
								me.setStoreValue("last_meter_power_s1",solar_daytotal_prod);
								}
					}

					if (value_s1 == 'other' || value_s1 == 'car') {
						let other_daytotal_cons_s1 = ( callback[0].s1.dayTotal ); // Other used via S1 $energylink[0]['s1']['dayTotal']
						if (other_daytotal_cons_s1 != me.getStoreValue('last_meter_power_s1') && other_daytotal_cons_s1 != undefined && other_daytotal_cons_s1 != null) {
					    	//console.log("S1 Daytotal- "+ other_daytotal_cons_s1);
							promises.push(me.flowTriggerMeterPowerS1(me, { power_daytotal_s1: other_daytotal_cons_s1 }));
								me.setStoreValue("last_meter_power_s1",other_daytotal_cons_s1);
								}
					}

					if (value_s2 == 'other' || value_s2 == 'car') {
						let other_daytotal_cons_s2 = ( callback[0].s2.dayTotal ); // Other used via S1 $energylink[0]['s2']['dayTotal']
						if (other_daytotal_cons_s2 != me.getStoreValue('last_meter_power_s2') && other_daytotal_cons_s2 != undefined && other_daytotal_cons_s2 != null) {
					    	//console.log("S2 Daytotal- "+ other_daytotal_cons_s2);
							promises.push(me.flowTriggerMeterPowerS2(me, { power_daytotal_s2: other_daytotal_cons_s2 }));
								me.setStoreValue("last_meter_power_s2",other_daytotal_cons_s2);
								}
					}

					if (energy_daytotal_aggr != me.getStoreValue('last_meter_power_aggr') && energy_daytotal_aggr != undefined && energy_daytotal_aggr != null) {
					    //console.log("Aggregated Daytotal- "+ energy_daytotal_aggr);
						promises.push(me.flowTriggerMeterPowerAggregated(me, { power_daytotal_aggr: energy_daytotal_aggr }));
						me.setStoreValue("last_meter_power_aggr",energy_daytotal_aggr);

					}
					// Execute all promises concurrently using Promise.all()
					await Promise.all(promises);

				} else {
					this.setUnavailable('No Energylink data available');
				}

				} catch (error) {
					console.log(error);
					me.setUnavailable();
				}
	}
		


	async getReadings() {
		const homewizard_id = this.getSetting('homewizard_id');
			  
		try {
		  const callback = await homewizard.getDeviceData(homewizard_id, 'energylink_el');
		  	  
		  if (Object.keys(callback).length > 0) {
			this.setAvailable().catch(this.error);

			const promises = [];
	  
			let metered_gas = callback[2].consumed;
			let metered_electricity_consumed_t1 = callback[0].consumed;
			let metered_electricity_produced_t1 = callback[0].produced;
			let metered_electricity_consumed_t2 = callback[1].consumed;
			let metered_electricity_produced_t2 = callback[1].produced;
			let aggregated_meter_power = (metered_electricity_consumed_t1 + metered_electricity_consumed_t2) - (metered_electricity_produced_t1 + metered_electricity_produced_t2);
	  
			if (!this.hasCapability('meter_power')) {
			  await this.addCapability('meter_power').catch(this.error);
			}
	  
			promises.push(this.setCapabilityValue('meter_gas.reading', metered_gas).catch(this.error));
			promises.push(this.setCapabilityValue('meter_power', aggregated_meter_power).catch(this.error));
			promises.push(this.setCapabilityValue('meter_power.consumed.t1', metered_electricity_consumed_t1).catch(this.error));
			promises.push(this.setCapabilityValue('meter_power.produced.t1', metered_electricity_produced_t1).catch(this.error));
			promises.push(this.setCapabilityValue('meter_power.consumed.t2', metered_electricity_consumed_t2).catch(this.error));
			promises.push(this.setCapabilityValue('meter_power.produced.t2', metered_electricity_produced_t2).catch(this.error));
	  
			if (metered_electricity_produced_t1 != this.getStoreValue('last_meter_return_t1') && metered_electricity_produced_t1 != undefined && metered_electricity_produced_t1 != null) {
			  this.flowTriggerMeterReturnT1(this, { meter_power_produced_t1: metered_electricity_produced_t1 });
			  promises.push(this.setStoreValue('last_meter_return_t1', metered_electricity_produced_t1));
			}
	  
			if (metered_electricity_produced_t2 != this.getStoreValue('last_meter_return_t2') && metered_electricity_produced_t2 != undefined && metered_electricity_produced_t2 != null) {
			  this.flowTriggerMeterReturnT2(this, { meter_power_produced_t2: metered_electricity_produced_t2 });
			  promises.push(this.setStoreValue('last_meter_return_t2', metered_electricity_produced_t2));
			}
			// Execute all promises concurrently using Promise.all()
			await Promise.all(promises);

		  }
		} catch (err) {
		  console.log('ERROR Energylink getStatus ', err);
		  this.setUnavailable().catch(this.error);
		}
	  }
	  

	onDeleted() {

		clearInterval(this.refreshIntervalId);
		clearInterval(this.refreshIntervalIdReadings);
		console.log("--Stopped Polling--");
		console.log('deleted: ' + JSON.stringify(this));

	}

}

module.exports = HomeWizardEnergylink;
