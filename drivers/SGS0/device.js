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

class SGS0 extends Homey.Device {

    async onInit() {
        try {
            this.log(`Init device ${this.getName()}`);
            this.meter_value = 0;
           
            this.lastReading = 0;
            this.lastReadingTime = 0;
            this.lastReadingDay = null;
            this.lastReadingHour = null;
            this.lastSoftwareUpdate = false;
    
            this.settings = this.getSettings();
            
            // this.ThermTotalToken = await this.homey.flow.createToken('sm_thermal_token', {
            //     type: 'number',
            //     title: this.homey.__('thermal')
            //   }).catch();
   
            this.s0SoftwareUpdate = await this.homey.flow.createToken('sm_S0_software_update_token', {
                type: 'boolean',
                title: 'S0 Software Update Available'
            }).catch();
    
            this.softwareUpdateTrigger = this.homey.flow.getDeviceTriggerCard('software_update_s0');

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
       // this.log(`Updating device: ${this.getName()}`);
        let url = `http://${this.settings.SGS0Ip}:82${constants.s0}`;
        this.log(`Updating device: ${this.getName()} at ${url}`);
        fetch(url).then( async res => {
            if (res.ok) {
                this.setAvailable().catch(this.error);
                const s0data = await res.json();

                let verbruik = parseFloat(s0data.meter_value_kw);
             
                let WiFiState = this.pf(s0data.wifi_rssi);
        
                this.setSettings({
                    mac_address: s0data.mac_address,
                    firmware_run: s0data.firmware_running,
                    firmware_available: s0data.firmware_available,
                    startup_time: s0data.startup_time,
                    model: s0data.gateway_model
                }).catch(this.error);
        
               
                let softwareUpdate = this.parseBool(s0data.firmware_update_available);
        
                if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===true) {
                    this.lastSoftwareUpdate=softwareUpdate;
                    //console.log("trigger software update");
                    this.softwareUpdateTrigger.trigger(this, {}, {}).catch(this.error); 
                } else if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===false) {
                    this.lastSoftwareUpdate=softwareUpdate;
                }
        
                this.setCapabilityValue("meter_power", verbruik).catch(e => {this.log(`Unable to set meter_power: ${ e.message }`);})
                this.setCapabilityValue("measure_power", verbruik).catch(e => {this.log(`Unable to set measure_power: ${ e.message }`);})
        
                
                await this.s0SoftwareUpdate.setValue(softwareUpdate);

                await this.setCapabilityValue("wifiState", WiFiState).catch(e => {this.log(`Unable to set wifiState: ${ e.message }`);});
        
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

       // this.homey.flow.unregisterToken(this.ThermTotalToken);
        this.homey.flow.unregisterToken(this.s0SoftwareUpdate);

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
    //    this.homey.flow.unregisterToken(this.ThermTotalToken);
        this.homey.flow.unregisterToken(this.s0SoftwareUpdate);
		this.log(`SmartGateway S0 deleted as device: ${this.getName()}`);
	}

	onRenamed(name) {
		this.log(`SmartGateway S0 renamed to: ${name}`);
    }
    
    
}

module.exports = SGS0;