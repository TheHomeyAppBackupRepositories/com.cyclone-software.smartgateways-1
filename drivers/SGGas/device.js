const Homey = require('homey');
const fetch = require('node-fetch');
const constants = require('../../constants.js');


const getReadingObject = (value) => {
	const ts = new Date();
	const reading = {
		hour: ts.getHours(),
		day: ts.getDate(),
		month: ts.getMonth(),
		year: ts.getFullYear(),
		meterValue: value,
	};
	return reading;
};

class SGGas extends Homey.Device {

    async onInit() {
        try {
            this.log(`Init device ${this.getName()}`);
            this.gasmeter = 0;
            this.lastGasmeter = 0;
           
            this.lastReading = 0;
            this.lastReadingTime = 0;
            this.lastReadingDay = null;
            this.lastReadingHour = null;
            this.lastSoftwareUpdate = false;
    
            this.settings = this.getSettings();
            
            this.gasTotalToken = await this.homey.flow.createToken('sm_gasmeter_token', {
                type: 'number',
                title: this.homey.__('gasmeter')
              }).catch();
            this.gasDailyToken = await this.homey.flow.createToken('sm_gasmeter_daily_token', {
                type: 'number',
                title: this.homey.__('gasmeter_daily')
              }).catch();
    
            this.gasSoftwareUpdate = await this.homey.flow.createToken('sm_gasmeter_software_update_token', {
                type: 'boolean',
                title: 'Gasmeter Software Update Available'
            }).catch();
    
            // this.gasTrigger = this.homey.flow.getDeviceTriggerCard('gasmeter_change');
            this.softwareUpdateTrigger = this.homey.flow.getDeviceTriggerCard('software_update');

			// polling for device info
			this.timerPoll = setInterval(async () => {
				try {
					// get new readings and update the devicestate
					await this.doPolling();
				} catch (error) {
					this.error('Polling error', error);
				}
			}, this.settings.pollingInterval * 1000);
            
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
    
    // calculateFlow(value, time) {
	// 	let flow = 0;
	// 	const lastTm = this.lastReadingTime;
	// 	if (lastTm !== 0) { 
	// 		const timePast = (time - lastTm) / 1000; // in seconds
	// 		const usedgas = (value - this.lastgasmeter); // in liters
    //         flow = Math.round(((usedgas * 60) / timePast) * 10) / 10;
    //         //this.log(`time: ${time} - ${this.lastReadingTime} = ${timePast}`);
    //         //this.log(`gas ${value} - ${this.lastgasmeter} = ${usedgas}`);
    //         //this.log(`flow gas ${flow}`);
	// 	}
	// 	this.lastReadingTime = time;
	// 	this.lastgasmeter = value;
	// 	return flow;
	// }

    //getRandomInt(max) {return Math.floor(Math.random() * max);}
    parseBool(val) { return val === true || val === "true" }
    pf(val) {return parseFloat(val)}

    async doPolling() {
        this.log(`Updating device: ${this.getName()}`);
        let url = `http://${this.settings.SGGasIp}:82${constants.SGGasURL}`;
        fetch(url).then( async res => {
            if (res.ok) {
                this.setAvailable().catch(this.error);
                const gasdata = await res.json();

                let verbruikGas = parseInt(gasdata.gasmeter_value,10);
              
                // console.log(gasdata);
               // gasdata.gasmeter_value = this.getRandomInt(10000);

                let time = Date.now()

                if (this.lastReadingTime === 0) this.lastReadingTime = time;
                if (this.lastgasmeter === 0) this.lastgasmeter = verbruikGas;

                // if ((time-this.lastReadingTime) > 60000 ){ // 60 seconden 
                //     let flow = this.calculateFlow(verbruikLiters, time); // in liters
                //     await this.setCapabilityValue("measure_gas", flow).catch(e => {this.log(`Unable to set gas flow: ${ e.message }`);});
                // } 


                this.gasmeter = verbruikGas/1000;   // in m3
                let WiFiState = this.pf(gasdata.wifi_rssi);
        
                this.setSettings({
                    mac_address: gasdata.mac_address,
                    firmware_run: gasdata.firmware_running,
                    firmware_available: gasdata.firmware_available,
                    startup_time: gasdata.startup_time,
                    model: gasdata.gateway_model,
                    pulse_factor: gasdata.gasmeter_pulse_factor,
                    pulsecount: gasdata.gasmeter_pulsecount
                }).catch(this.error);
        
                const reading = getReadingObject( this.gasmeter);
                await this.updateHour(reading);
                await this.updateDay(reading);
               
                let softwareUpdate = this.parseBool(gasdata.firmware_update_available);
        
                if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===true) {
                    this.lastSoftwareUpdate=softwareUpdate;
                    //console.log("trigger software update");
                    this.softwareUpdateTrigger.trigger(this, {}, {}).catch(this.error); 
                } else if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===false) {
                    this.lastSoftwareUpdate=softwareUpdate;
                }
        
        
                if (this.lastReading!==this.gasmeter) {
                    this.lastReading=this.gasmeter;
                    //console.log("trigger gas");
                    //this.gasTrigger.trigger(this, {}, {}).catch(this.error);
                }
        
                await this.gasTotalToken.setValue(this.gasmeter);
                await this.gasSoftwareUpdate.setValue(softwareUpdate);

                await this.setCapabilityValue("wifiState", WiFiState).catch(e => {this.log(`Unable to set wifiState: ${ e.message }`);});
        
                await this.setCapabilityValue("meter_gas", this.gasmeter).catch(e => {this.log(`Unable to set gasmeter: ${ e.message }`);});

            } else
            {
              this.setUnavailable(res.statusText);
            }
        }).catch(error => {
            this.setUnavailable(error).catch(this.error);
        })
    }

	async updateHour(reading) {
		if (!this.lastReadingHour) {	// after init
			//await this.setSettings({ meter_latest: `${reading.meterValue}` });
			this.lastReadingHour = this.getStoreValue('lastReadingHour');
			if (!this.lastReadingHour) {	// after new pair
				await this.setStoreValue('lastReadingHour', reading);
				this.lastReadingHour = reading;
			}
		}
        let val = reading.meterValue - this.lastReadingHour.meterValue;
        if (val>0)
            val = Math.round(val * 100) / 100;
		if ((reading.day === this.lastReadingHour.day) && (reading.hour === this.lastReadingHour.hour)) {
            await this.setCapabilityValue("meter_gas.hourly", val).catch(e => {this.log(`Unable to set hourly meter: ${ e.message }`);});
		} else {
			// new hour started
            await this.setCapabilityValue("meter_gas.hourly", 0).catch(e => {this.log(`Unable to set hourly meter: ${ e.message }`);});
            await this.setCapabilityValue("meter_gas.hourly", val).catch(e => {this.log(`Unable to set hourly meter: ${ e.message }`);});
			await this.setStoreValue('lastReadingHour', reading);
			//await this.setSettings({ meter_latest: `${reading.meterValue}` });
			this.lastReadingHour = reading;
		}
	}

	async updateDay(reading) {
		if (!this.lastReadingDay) {	// after init
			this.lastReadingDay = this.getStoreValue('lastReadingDay');
            if (!this.lastReadingDay) {	// after new pair
                let zeroReading = reading.meterValue;
				await this.setStoreValue('lastReadingDay', zeroReading);
				this.lastReadingDay = zeroReading;
			}
		}
		let val = reading.meterValue - this.lastReadingDay.meterValue;
        if (val>0)
            val = Math.round(val * 100) / 100;
		if ((reading.month === this.lastReadingDay.month) && (reading.day === this.lastReadingDay.day)) {
            await this.setCapabilityValue("meter_gas.daily", val).catch(e => {this.log(`Unable to set gasmeter Daily: ${ e.message }`);});
            await this.gasDailyToken.setValue(val);
		} else {
			// new day started
            await this.setCapabilityValue("meter_gas.daily", 0).catch(e => {this.log(`Unable to set gasmeter Daily: ${ e.message }`);}),
            await this.setCapabilityValue("meter_gas.daily", val).catch(e => {this.log(`Unable to set gasmeter Daily: ${ e.message }`);}),
            await this.gasDailyToken.setValue(val);
			await this.setStoreValue('lastReadingDay', reading);
			this.lastReadingDay = reading;
		}
	}

    // async OnResetMidnight(data) {
    // //    this.log(`OnResetMidnight: ${data}`);
    // //    this.lastReadingDay = this.gasmeter;
    // //    await this.setStoreValue('lastReadingDay', this.gasmeter);
    // //    await Promise.all([
    // //     this.setCapabilityValue("meter_gas", this.lastReadingDay).catch(e => {this.log(`Unable to set gasmeter with lastReadingDay: ${ e.message }`);}),
    // //    ]);
    // }

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

        this.homey.flow.unregisterToken(this.gasTotalToken);
        this.homey.flow.unregisterToken(this.gasDailyToken);
        this.homey.flow.unregisterToken(this.gasSoftwareUpdate);

		setTimeout(() => {
			this.onInit();
		}, 5000);
	}

    // this method is called when the Device is added
	onAdded() {
		this.log(`SmartGateways gas added as device: ${this.getName()}`);
	}

	// this method is called when the Device is deleted
	onDeleted() {
		// stop polling
        clearInterval(this.timerPoll);
        this.homey.flow.unregisterToken(this.gasTotalToken);
        this.homey.flow.unregisterToken(this.gasDailyToken);
        this.homey.flow.unregisterToken(this.gasSoftwareUpdate);
		this.log(`SmartGateways gas deleted as device: ${this.getName()}`);
	}

	onRenamed(name) {
		this.log(`SmartGateways gas renamed to: ${name}`);
    }
    
    
}

module.exports = SGGas;