const Homey = require('homey');
const fetch = require('node-fetch');
const constants = require('../../constants.js');

class SGP1 extends Homey.Device {

    async onInit() {
        try {
            this.log(`Init device ${this.getName()}`);
           
            this.lastSoftwareUpdate = false;
            this.lastGasReading = 0;
            this.lastPowerReading = 0;
            this.lastTariff = 1;
    
            this.settings = this.getSettings();
            
            this.softwareUpdateTrigger = this.homey.flow.getDeviceTriggerCard('software_update_p1');
            this.tariff_change_Trigger = this.homey.flow.getDeviceTriggerCard('tariff_change');
            // this.GasChangeTrigger = this.homey.flow.getDeviceTriggerCard('gas_change');
            // this.PowerChangeTrigger = this.homey.flow.getDeviceTriggerCard('power_change');
            
            if (this.hasCapability("measure_power.net")) {
                this.removeCapability("measure_power.net");
            }

            if (this.hasCapability("measure_power.saldo")) {
                this.removeCapability("measure_power.saldo");
            }

            if (!this.hasCapability("meter_power.saldo")) {
                this.addCapability("meter_power.saldo");
            }

			// polling for device info
			this.timerPoll = setInterval(async () => {
				try {
					// get new readings and update the devicestate
					await this.doPolling();
				} catch (error) {
					this.error('Polling error', error);
				}
			}, this.settings.pollingInterval_p1 * 1000);
            
            await this.setAvailable();
               
		} catch (error) {
			this.error(error);
		}
    }

    onDiscoveryResult(discoveryResult) {
        // Return a truthy value here if the discovery result matches your device.
       // return discoveryResult.id === this.getData().id;
       console.log(discoveryResult);
       return true;
    }

	async getP1Data(url) {

		console.log(`Get smartmeter data from ${url}`);
        const res = await fetch(url);
        //console.log(res);
		if (!res.ok) throw new Error('Unknown Error');
        const data = await res.json();
		return data;
    }
    

    //getRandomInt(max) {return Math.floor(Math.random() * max);}
    parseBool(val) { return val === true || val === "true" }
    pf(val) {return parseFloat(val)}

    async doPolling() {
        this.log(`Updating device: ${this.getName()}`);
        let url = `http://${this.settings.SGP1Ip}:82${constants.SGSGP1URL}`;
        fetch(url).then( async res => {
            if (res.ok) {
                this.setAvailable().catch(this.error);
                const p1data = await res.json();

                this.log(p1data);

                this.setSettings({
                    mac_address_p1: p1data.mac_address,
                    firmware_run_p1: p1data.firmware_running,
                    firmware_available_p1: p1data.firmware_available,
                    startup_time_p1: p1data.startup_time,
                    model_p1: p1data.gateway_model
                }).catch(this.error);
        
               
                let softwareUpdate = this.parseBool(p1data.firmware_update_available);

                let factor = this.settings.watt_hour_p1 ? 1000 : 1;

                this.log(`Factor (Wh): ${factor}`);

                let powerTotal = this.pf(p1data.PowerDelivered_total); // kwh
                let powerTotalReturned = this.pf(p1data.PowerReturned_total); // kwh
                let saldo = this.pf(p1data.PowerDeliveredNetto);

                
                let powermeter_total = this.pf(p1data.EnergyDeliveredTariff2) + this.pf(p1data.EnergyDeliveredTariff1) - this.pf(p1data.EnergyReturnedTariff1) - this.pf(p1data.EnergyReturnedTariff2);

                let meter = p1data.gateway_model;

                if (meter.includes('sweden')){
                    powermeter_total=this.pf(p1data.EnergyDelivered);
                }   

                let tariff = this.pf(p1data.ElectricityTariff);

                if (this.lastTariff!==tariff) {
                    console.log("trigger tariff update");
                    this.tariff_change_Trigger.trigger(this, {}, {}).catch(this.error); 
                }               

                this.lastTariff=tariff;

                // if (this.lastGasReading===0) {this.lastGasReading=this.pf(p1data.GasDelivered)}
                // if (this.lastPowerReading===0) {this.lastPowerReading=powerTotal}
        
                if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===true) {
                    this.lastSoftwareUpdate=softwareUpdate;
                    console.log("trigger software update");
                    this.softwareUpdateTrigger.trigger(this, {}, {}).catch(this.error); 
                } else if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===false) {
                    this.lastSoftwareUpdate=softwareUpdate;
                }

                // let net = (this.pf(p1data.PowerDelivered_l1)+this.pf(p1data.PowerDelivered_l2)+this.pf(p1data.PowerDelivered_l3))-(this.pf(p1data.PowerReturned_l1)+this.pf(p1data.PowerReturned_l2)+this.pf(p1data.PowerReturned_l3));
               

                await Promise.all([
                   // this.setCapabilityValue("meter_power.saldo", powerTotal - powerTotalReturned).catch(e => {this.log(`Unable to set meter_power.peak: ${ e.message }`);}),
                    this.setCapabilityValue("meter_power.saldo", saldo * factor).catch(e => {this.log(`Unable to set meter_power.saldo: ${ e.message }`);}),

                    // this.setCapabilityValue("meter_power.net", net * factor).catch(e => {this.log(`Unable to set meter_power.net: ${ e.message }`);}),

                    this.setCapabilityValue("measure_power", powerTotal * factor).catch(e => {this.log(`Unable to set meter_power.peak: ${ e.message }`);}),
                    this.setCapabilityValue("measure_power.return",powerTotalReturned * factor).catch(e => {this.log(`Unable to set meter_power.offPeak: ${ e.message }`);}),

                    this.setCapabilityValue("wifiState_p1", this.pf(p1data.wifi_rssi)).catch(e => {this.log(`Unable to set wifiState: ${ e.message }`);}),
                    this.setCapabilityValue("meter_power", powermeter_total).catch(e => {this.log(`Unable to set meter_power: ${ e.message }`);}),
                    this.setCapabilityValue("meter_power.peak", this.pf(p1data.EnergyDeliveredTariff2)).catch(e => {this.log(`Unable to set meter_power.peak: ${ e.message }`);}),
                    this.setCapabilityValue("meter_power.offPeak", this.pf(p1data.EnergyDeliveredTariff1)).catch(e => {this.log(`Unable to set meter_power.offPeak: ${ e.message }`);}),
                    this.setCapabilityValue("meter_power.producedPeak", this.pf(p1data.EnergyReturnedTariff2)).catch(e => {this.log(`Unable to set meter_power.producedPeak: ${ e.message }`);}),
                    this.setCapabilityValue("meter_power.producedOffPeak", this.pf(p1data.EnergyReturnedTariff1)).catch(e => {this.log(`Unable to set producedOffPeak: ${ e.message }`);}),
                    this.setCapabilityValue("meter_power.hourly", this.pf(p1data.PowerDeliveredHour)).catch(e => {this.log(`Unable to set measure_power: ${ e.message }`);}),
                    this.setCapabilityValue("meter_gas", this.pf(p1data.GasDelivered)).catch(e => {this.log(`Unable to set meter_gas: ${ e.message }`);}),
                    this.setCapabilityValue("meter_gas.hourly", this.pf(p1data.GasDeliveredHour)).catch(e => {this.log(`Unable to set meter_gas hourly: ${ e.message }`);}),

                    this.setCapabilityValue("measure_power.l1", this.pf(p1data.PowerDelivered_l1)).catch(e => {this.log(`Unable to set meter_power.peak: ${ e.message }`);}),
                    this.setCapabilityValue("measure_power.returnl1", this.pf(p1data.PowerReturned_l1)).catch(e => {this.log(`Unable to set meter_power.offPeak: ${ e.message }`);}),
                    this.setCapabilityValue("measure_power.l2", this.pf(p1data.PowerDelivered_l2)).catch(e => {this.log(`Unable to set meter_power.peak: ${ e.message }`);}),
                    this.setCapabilityValue("measure_power.returnl2", this.pf(p1data.PowerReturned_l2)).catch(e => {this.log(`Unable to set meter_power.offPeak: ${ e.message }`);}),
                    this.setCapabilityValue("measure_power.l3", this.pf(p1data.PowerDelivered_l3)).catch(e => {this.log(`Unable to set meter_power.peak: ${ e.message }`);}),
                    this.setCapabilityValue("measure_power.returnl3", this.pf(p1data.PowerReturned_l3)).catch(e => {this.log(`Unable to set meter_power.offPeak: ${ e.message }`);}),


                    this.setCapabilityValue("measure_voltage.l1", this.pf(p1data.Voltage_l1)).catch(e => {this.log(`Unable to set measure_voltage.l1: ${ e.message }`);}),
                    this.setCapabilityValue("measure_voltage.l2", this.pf(p1data.Voltage_l2)).catch(e => {this.log(`Unable to set measure_voltage.l2: ${ e.message }`);}),
                    this.setCapabilityValue("measure_voltage.l3", this.pf(p1data.Voltage_l3)).catch(e => {this.log(`Unable to set measure_voltage.l3: ${ e.message }`);}),

                    this.setCapabilityValue("measure_current.l1", this.pf(p1data.Current_l1)).catch(e => {this.log(`Unable to set measure_current.l1: ${ e.message }`);}),
                    this.setCapabilityValue("measure_current.l2", this.pf(p1data.Current_l2)).catch(e => {this.log(`Unable to set measure_current.l2: ${ e.message }`);}),
                    this.setCapabilityValue("measure_current.l3", this.pf(p1data.Current_l3)).catch(e => {this.log(`Unable to set measure_current.l3: ${ e.message }`);}),

                    this.setCapabilityValue("electricitytariff", p1data.ElectricityTariff).catch(e => {this.log(`Unable to set ElectricityTariff.l1: ${ e.message }`);}),
                    this.setCapabilityValue("energydeliveredtariff1", this.pf(p1data.EnergyDeliveredTariff1)).catch(e => {this.log(`Unable to set EnergyDeliveredTariff1: ${ e.message }`);}),
                    this.setCapabilityValue("energydeliveredtariff2", this.pf(p1data.EnergyDeliveredTariff2)).catch(e => {this.log(`Unable to set EnergyDeliveredTariff2: ${ e.message }`);}),
                    this.setCapabilityValue("energyreturnedtariff1", this.pf(p1data.EnergyReturnedTariff1)).catch(e => {this.log(`Unable to set EnergyReturnedTariff1: ${ e.message }`);}),
                    this.setCapabilityValue("energyreturnedtariff2", this.pf(p1data.EnergyReturnedTariff2)).catch(e => {this.log(`Unable to set EnergyReturnedTariff2: ${ e.message }`);}),

                ]).catch(error => {
                    this.log(error.message);
                });
                  
        
            } else
            {
              this.setUnavailable(res.statusText);
            }
        }).catch(error => {
            this.setUnavailable(error).catch(this.error);
        })
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        // run when the user has changed the device's settings in Homey.
        // changedKeysArr contains an array of keys that have been changed
		this.log('settings updated by user');
        this.log(`${this.getName()} device settings changed`);
        this.reInitDevice();
    }
    
    reInitDevice() {
		console.log(`Re-Initialize ${this.getName()}`);
        clearInterval(this.timerPoll);

		setTimeout(() => {
			this.onInit();
		}, 5000);
	}

    // this method is called when the Device is added
	onAdded() {
		this.log(`SmartGateway smart meter added as device: ${this.getName()}`);
	}

	// this method is called when the Device is deleted
	onDeleted() {
		// stop polling
        clearInterval(this.timerPoll);
		this.log(`SmartGateway smart meter deleted as device: ${this.getName()}`);
	}

	onRenamed(name) {
		this.log(`SmartGateway smart meter renamed to: ${name}`);
    }
    
    
}

module.exports = SGP1;