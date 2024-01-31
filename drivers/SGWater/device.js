const Homey = require('homey');
const fetch = require('node-fetch');
const constants = require('../../constants.js');

// const getReadingObject = (value) => {
// 	const ts = new Date();
// 	const reading = {
// 		hour: ts.getHours(),
// 		day: ts.getDate(),
// 		month: ts.getMonth(),
// 		year: ts.getFullYear(),
// 		meterValue: value,
// 	};
// 	return reading;
// };

class SGWater extends Homey.Device {

    async onInit() {
        try {
            this.log(`Init device ${this.getName()}`);
            this.watermeter = 0;
            this.lastWatermeter = 0;
           
            this.lastReading = 0;
            this.lastReadingTime = 0;
            this.lastReadingDay = null;
            this.lastReadingHour = null;
            this.lastSoftwareUpdate = false;

            this.timeZone = this.homey.clock.getTimezone();
    
            this.settings = this.getSettings();
            
            // this.waterTotalToken = await this.homey.flow.createToken('sm_watermeter_token', {
            //     type: 'number',
            //     title: this.homey.__('watermeter')
            //   }).catch();
            // this.waterDailyToken = await this.homey.flow.createToken('sm_watermeter_daily_token', {
            //     type: 'number',
            //     title: this.homey.__('watermeter_daily')
            //   }).catch();
    
            // this.waterSoftwareUpdate = await this.homey.flow.createToken('sm_watermeter_software_update_token', {
            //     type: 'boolean',
            //     title: 'Watermeter Software Update Available'
            // }).catch();
    
            this.waterTrigger = this.homey.flow.getDeviceTriggerCard('watermeter_change');
            this.softwareUpdateTrigger = this.homey.flow.getDeviceTriggerCard('software_update');

			// polling for device info
			this.timerPoll = this.homey.setInterval(async () => {
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


    async getReadingObject(value) {
		const date = new Date(); // IF value has not changed, it must be a poll ,meaning date is unchanged?
		const dateLocal = new Date(date.toLocaleString('en-US', { timeZone: this.timeZone }));
		const reading = {
			hour: dateLocal.getHours(),
			day: dateLocal.getDate(),
			month: dateLocal.getMonth(),
			year: dateLocal.getFullYear(),
			meterValue: value
		};
		return reading;
	}


    onDiscoveryResult(discoveryResult) {
        // Return a truthy value here if the discovery result matches your device.
       // return discoveryResult.id === this.getData().id;
       console.log(discoveryResult);
       return true;
    }

	async getWaterData(url) {

		this.log(`Get waterdata from ${url}`);
        const res = await fetch(url);
        //console.log(res);
		if (!res.ok) throw new Error('Unknown Error');
        const data = await res.json();
		return data;
    }
    
    calculateFlow(value, time) {
		let flow = 0;
		const lastTm = this.lastReadingTime;
		if (lastTm !== 0) { 
			const timePast = (time - lastTm) / 1000; // in seconds
			const usedWater = (value - this.lastWatermeter); // in liters
            flow = Math.round(((usedWater * 60) / timePast) * 10) / 10;
            //this.log(`time: ${time} - ${this.lastReadingTime} = ${timePast}`);
            //this.log(`water ${value} - ${this.lastWatermeter} = ${usedWater}`);
            //this.log(`flow water ${flow}`);
		}
		this.lastReadingTime = time;
		this.lastWatermeter = value;
		return flow;
	}

    //getRandomInt(max) {return Math.floor(Math.random() * max);}
    parseBool(val) { return val === true || val === "true" }
    pf(val) {return parseFloat(val)}

    async doPolling() {
        this.log(`Updating device: ${this.getName()}`);
        let url = `http://${this.settings.SGWaterIp}:82${constants.SGWaterURL}`;
        fetch(url).then( async res => {
            if (res.ok) {
                this.setAvailable().catch(this.error);
                const waterdata = await res.json();

                let verbruikLiters = parseInt(waterdata.watermeter_value,10);
              
                this.log(waterdata);
               // waterdata.watermeter_value = this.getRandomInt(10000);

                let time = Date.now()

                if (this.lastReadingTime === 0) this.lastReadingTime = time;
                if (this.lastWatermeter === 0) this.lastWatermeter = verbruikLiters;

                if ((time-this.lastReadingTime) > 60000 ){ // 60 seconden 
                    let flow = this.calculateFlow(verbruikLiters, time); // in liters
                    await this.setCapabilityValue("measure_water", flow).catch(e => {this.log(`Unable to set water flow: ${ e.message }`);});
                } 


                this.watermeter = verbruikLiters/1000;   // in m3
                let WiFiState = this.pf(waterdata.wifi_rssi);
        
                this.setSettings({
                    mac_address: waterdata.mac_address,
                    firmware_run: waterdata.firmware_running,
                    firmware_available: waterdata.firmware_available,
                    startup_time: waterdata.startup_time,
                    model: waterdata.gateway_model,
                    pulse_factor: waterdata.watermeter_pulse_factor,
                    pulsecount: waterdata.watermeter_pulsecount
                }).catch(this.error);
        
                const reading = await this.getReadingObject( this.watermeter);
                await this.updateHour(reading);
                await this.updateDay(reading);
               
                let softwareUpdate = this.parseBool(waterdata.firmware_update_available);
        
                if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===true) {
                    this.lastSoftwareUpdate=softwareUpdate;
                    //console.log("trigger software update");
                    this.softwareUpdateTrigger.trigger(this, {}, {}).catch(this.error); 
                } else if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===false) {
                    this.lastSoftwareUpdate=softwareUpdate;
                }
        
        
                if (this.lastReading!==this.watermeter) {
                    this.lastReading=this.watermeter;
                    //console.log("trigger water");
                    this.waterTrigger.trigger(this, {}, {}).catch(this.error);
                }
        
                // await this.waterTotalToken.setValue(this.watermeter);
                // await this.waterSoftwareUpdate.setValue(softwareUpdate);

                await this.setCapabilityValue("wifiState", WiFiState).catch(e => {this.log(`Unable to set wifiState: ${ e.message }`);});
        
                await this.setCapabilityValue("meter_water", this.watermeter).catch(e => {this.log(`Unable to set watermeter: ${ e.message }`);});

                try {
                    await this.setCapabilityValue("alarm_water", this.parseBool(waterdata.leak_detect)).catch(e => {this.log(`Unable to set watermeter: ${ e.message }`);});                    
                } catch (error) {
                    
                }
                

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
		const val = reading.meterValue - this.lastReadingHour.meterValue;
		if ((reading.day === this.lastReadingHour.day) && (reading.hour === this.lastReadingHour.hour)) {
            await this.setCapabilityValue("meter_water.hourly", val).catch(e => {this.log(`Unable to set hourly meter: ${ e.message }`);});
		} else {
			// new hour started
            await this.setCapabilityValue("meter_water.hourly", 0).catch(e => {this.log(`Unable to set hourly meter: ${ e.message }`);});
            await this.setCapabilityValue("meter_water.hourly", val).catch(e => {this.log(`Unable to set hourly meter: ${ e.message }`);});
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
		const val = reading.meterValue - this.lastReadingDay.meterValue;
		if ((reading.month === this.lastReadingDay.month) && (reading.day === this.lastReadingDay.day)) {
            await this.setCapabilityValue("meter_water.daily", val).catch(e => {this.log(`Unable to set Watermeter Daily: ${ e.message }`);});
            //await this.waterDailyToken.setValue(val);
		} else {
			// new day started
            await this.setCapabilityValue("meter_water.daily", 0).catch(e => {this.log(`Unable to set Watermeter Daily: ${ e.message }`);}),
            await this.setCapabilityValue("meter_water.daily", val).catch(e => {this.log(`Unable to set Watermeter Daily: ${ e.message }`);}),
            // this.waterDailyToken.setValue(val);
			await this.setStoreValue('lastReadingDay', reading);
			this.lastReadingDay = reading;
		}
	}

    async OnResetMidnight(data) {
    //    this.log(`OnResetMidnight: ${data}`);
    //    this.lastReadingDay = this.watermeter;
    //    await this.setStoreValue('lastReadingDay', this.watermeter);
    //    await Promise.all([
    //     this.setCapabilityValue("meter_water", this.lastReadingDay).catch(e => {this.log(`Unable to set Watermeter with lastReadingDay: ${ e.message }`);}),
    //    ]);
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
        this.homey.clearInterval(this.timerPoll);

        // this.homey.flow.unregisterToken(this.waterTotalToken);
        // this.homey.flow.unregisterToken(this.waterDailyToken);
        // this.homey.flow.unregisterToken(this.waterSoftwareUpdate);

		setTimeout(() => {
			this.onInit();
		}, 5000);
	}

    // this method is called when the Device is added
	onAdded() {
		this.log(`SmartGateway Water added as device: ${this.getName()}`);
	}

	// this method is called when the Device is deleted
	onDeleted() {
		// stop polling
        this.homey.clearInterval(this.timerPoll);
        // this.homey.flow.unregisterToken(this.waterTotalToken);
        // this.homey.flow.unregisterToken(this.waterDailyToken);
        // this.homey.flow.unregisterToken(this.waterSoftwareUpdate);
		this.log(`SmartGateway Water deleted as device: ${this.getName()}`);
	}

	onRenamed(name) {
		this.log(`SmartGateway Water renamed to: ${name}`);
    }
    
    
}

module.exports = SGWater;