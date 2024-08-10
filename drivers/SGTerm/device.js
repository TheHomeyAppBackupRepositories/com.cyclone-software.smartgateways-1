const Homey = require('homey');
const fetch = require('node-fetch');

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

class SGTherm extends Homey.Device {

    async onInit() {
        try {
            this.log(`Init device ${this.getName()}`);
            this.thermmeter = 0;
           
            this.lastReading = 0;
            this.lastReadingTime = 0;
            this.lastReadingDay = null;
            this.lastReadingHour = null;
            this.lastSoftwareUpdate = false;
    
            this.settings = this.getSettings();
            
            this.ThermTotalToken = await this.homey.flow.createToken('sm_thermal_token', {
                type: 'number',
                title: this.homey.__('thermal')
              }).catch();
   
            this.thermSoftwareUpdate = await this.homey.flow.createToken('sm_thermal_software_update_token', {
                type: 'boolean',
                title: 'WarmteLink Software Update Available'
            }).catch();
    
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
    

    //getRandomInt(max) {return Math.floor(Math.random() * max);}
    parseBool(val) { return val === true || val === "true" }
    pf(val) {return parseFloat(val)}

    async doPolling() {
        //this.log(`Updating device: ${this.getName()}`);
        let url = `http://${this.settings.SGThermIp}:82/warmtelink/api/read?`;
        this.log(`Updating device: ${this.getName()} at ${url}`);
        fetch(url).then( async res => {
            if (res.ok) {
                this.setAvailable().catch(this.error);
                const thermdata = await res.json();

                let verbruikTherm = parseFloat(thermdata.Thermal_Delivered);
              
                // console.log(gasdata);
               // gasdata.gasmeter_value = this.getRandomInt(10000);

                let time = Date.now()

                if (this.lastReadingTime === 0) this.lastReadingTime = time;
                if (this.lastReading === 0) this.lastReading = verbruikTherm;

                // if ((time-this.lastReadingTime) > 60000 ){ // 60 seconden 
                //     let flow = this.calculateFlow(verbruikLiters, time); // in liters
                //     await this.setCapabilityValue("measure_gas", flow).catch(e => {this.log(`Unable to set gas flow: ${ e.message }`);});
                // } 



                let WiFiState = this.pf(thermdata.wifi_rssi);
        
                this.setSettings({
                    mac_address: thermdata.mac_address,
                    firmware_run: thermdata.firmware_running,
                    firmware_available: thermdata.firmware_available,
                    startup_time: thermdata.startup_time,
                    model: thermdata.gateway_model
                }).catch(this.error);
        
                // const reading = getReadingObject( verbruikTherm);
                // await this.updateHour(reading);
                // await this.updateDay(reading);
               
                let softwareUpdate = this.parseBool(thermdata.firmware_update_available);
        
                if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===true) {
                    this.lastSoftwareUpdate=softwareUpdate;
                    //console.log("trigger software update");
                    this.softwareUpdateTrigger.trigger(this, {}, {}).catch(this.error); 
                } else if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===false) {
                    this.lastSoftwareUpdate=softwareUpdate;
                }
        
        
                if (this.lastReading!==verbruikTherm) {
                    this.lastReading=verbruikTherm;
                    //console.log("trigger gas");
                    //this.gasTrigger.trigger(this, {}, {}).catch(this.error);
                }
        
                await this.ThermTotalToken.setValue(verbruikTherm);
                await this.thermSoftwareUpdate.setValue(softwareUpdate);

                await this.setCapabilityValue("wifiState", WiFiState).catch(e => {this.log(`Unable to set wifiState: ${ e.message }`);});
        
                await this.setCapabilityValue("measure_thermheat", verbruikTherm).catch(e => {this.log(`Unable to set thermheat: ${ e.message }`);});

            } else
            {
                this.log(`Updating ${url} failed: ${res.statusText}`);
                this.setUnavailable(res.statusText);
            }
        }).catch(error => {
            this.setUnavailable(error).catch(this.error);
            this.log(`Updating failed: ${error}`);
        })
    }

	// async updateHour(reading) {
	// 	if (!this.lastReadingHour) {	// after init
	// 		//await this.setSettings({ meter_latest: `${reading.meterValue}` });
	// 		this.lastReadingHour = this.getStoreValue('lastReadingHour');
	// 		if (!this.lastReadingHour) {	// after new pair
	// 			await this.setStoreValue('lastReadingHour', reading);
	// 			this.lastReadingHour = reading;
	// 		}
	// 	}
    //     let val = reading.meterValue - this.lastReadingHour.meterValue;
    //     if (val>0)
    //         val = Math.round(val * 100) / 100;
	// 	if ((reading.day === this.lastReadingHour.day) && (reading.hour === this.lastReadingHour.hour)) {
    //         await this.setCapabilityValue("meter_gas.hourly", val).catch(e => {this.log(`Unable to set hourly meter: ${ e.message }`);});
	// 	} else {
	// 		// new hour started
    //         await this.setCapabilityValue("meter_gas.hourly", 0).catch(e => {this.log(`Unable to set hourly meter: ${ e.message }`);});
    //         await this.setCapabilityValue("meter_gas.hourly", val).catch(e => {this.log(`Unable to set hourly meter: ${ e.message }`);});
	// 		await this.setStoreValue('lastReadingHour', reading);
	// 		//await this.setSettings({ meter_latest: `${reading.meterValue}` });
	// 		this.lastReadingHour = reading;
	// 	}
	// }

	// async updateDay(reading) {
	// 	if (!this.lastReadingDay) {	// after init
	// 		this.lastReadingDay = this.getStoreValue('lastReadingDay');
    //         if (!this.lastReadingDay) {	// after new pair
    //             let zeroReading = reading.meterValue;
	// 			await this.setStoreValue('lastReadingDay', zeroReading);
	// 			this.lastReadingDay = zeroReading;
	// 		}
	// 	}
	// 	let val = reading.meterValue - this.lastReadingDay.meterValue;
    //     if (val>0)
    //         val = Math.round(val * 100) / 100;
	// 	if ((reading.month === this.lastReadingDay.month) && (reading.day === this.lastReadingDay.day)) {
    //         await this.setCapabilityValue("meter_gas.daily", val).catch(e => {this.log(`Unable to set gasmeter Daily: ${ e.message }`);});
    //         await this.gasDailyToken.setValue(val);
	// 	} else {
	// 		// new day started
    //         await this.setCapabilityValue("meter_gas.daily", 0).catch(e => {this.log(`Unable to set gasmeter Daily: ${ e.message }`);}),
    //         await this.setCapabilityValue("meter_gas.daily", val).catch(e => {this.log(`Unable to set gasmeter Daily: ${ e.message }`);}),
    //         await this.gasDailyToken.setValue(val);
	// 		await this.setStoreValue('lastReadingDay', reading);
	// 		this.lastReadingDay = reading;
	// 	}
	// }

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

        this.homey.flow.unregisterToken(this.ThermTotalToken);
        this.homey.flow.unregisterToken(this.thermSoftwareUpdate);

		setTimeout(() => {
			this.onInit();
		}, 5000);
	}

    // this method is called when the Device is added
	onAdded() {
		this.log(`SmartGateways thermal added as device: ${this.getName()}`);
	}

	// this method is called when the Device is deleted
	onDeleted() {
		// stop polling
        clearInterval(this.timerPoll);
        this.homey.flow.unregisterToken(this.ThermTotalToken);
        this.homey.flow.unregisterToken(this.thermSoftwareUpdate);
		this.log(`SmartGateway thermal deleted as device: ${this.getName()}`);
	}

	onRenamed(name) {
		this.log(`SmartGateway thermal renamed to: ${name}`);
    }
    
    
}

module.exports = SGTherm;