const Homey = require('homey');
const fetch = require('node-fetch');
const constants = require('../../constants.js');

class SGDistancemeter extends Homey.Device {

    async onInit() {
        try {
            this.log(`Init device ${this.getName()}`);          
            this.lastSoftwareUpdate = false
            this.lastReading=0;
    
            this.settings = this.getSettings();
            
            // this.realTimeDistance = await this.homey.flow.createToken('sm_distancemeter_realtime_distance_token', {
            //     type: 'number',
            //     title: this.homey.__('distancemeter')
            //   }).catch();   
            this.distancemeterSoftwareUpdate = await this.homey.flow.createToken('sm_distancemeter_software_update_token', {
                type: 'boolean',
                title: 'Distancemeter Software Update Available'
            }).catch();
    

            this.waterlevelTrigger = this.homey.flow.getDeviceTriggerCard('waterlevelmeter_change');
            this.softwareUpdateTrigger = this.homey.flow.getDeviceTriggerCard('software_update_SGDIST');

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
        this.log(`Updating device: ${this.getName()}`);
        let url = `http://${this.settings.SGDistancemeterIp}:82${constants.SGDistanceMeterURL}`;
        fetch(url).then( async res => {
            if (res.ok) {
                this.setAvailable().catch(this.error);
                const SGDistancemeterData = await res.json();

                let distancemeter_average_distance = parseInt(SGDistancemeterData.average_distance,10);
                let levelpercentage = parseInt(SGDistancemeterData.percentage_full,10);
                let levelabsolute = parseInt(SGDistancemeterData.level_full,10);
                     

                let WiFiState = this.pf(SGDistancemeterData.wifi_rssi);
        
                this.setSettings({
                    mac_address: SGDistancemeterData.mac_address,
                    firmware_run: SGDistancemeterData.firmware_running,
                    firmware_available: SGDistancemeterData.firmware_available,
                    startup_time: SGDistancemeterData.startup_time,
                    model: SGDistancemeterData.gateway_model,
                    entered_hight: SGDistancemeterData.entered_hight,
                    entered_offset: SGDistancemeterData.entered_offset
                }).catch(this.error);
                      
                let softwareUpdate = this.parseBool(SGDistancemeterData.firmware_update_available);
        
                if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===true) {
                    this.lastSoftwareUpdate=softwareUpdate;
                    //console.log("trigger software update");
                    this.softwareUpdateTrigger.trigger(this, {}, {}).catch(this.error); 
                } else if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===false) {
                    this.lastSoftwareUpdate=softwareUpdate;
                }
        
                if (this.lastReading!==this.distancemeter_average_distance) {
                    this.lastReading=this.distancemeter_average_distance;
                    this.waterlevelTrigger.trigger(this, {}, {}).catch(this.error);
                }
        
                await this.distancemeterSoftwareUpdate.setValue(softwareUpdate);
                //await this.realTimeDistance .setValue(distancemeter_average_distance);

                await this.setCapabilityValue("wifiState", WiFiState).catch(e => {this.log(`Unable to set wifiState: ${ e.message }`);});
                await this.setCapabilityValue("my_measure_distance", distancemeter_average_distance).catch(e => {this.log(`Unable to set my_measure_distance: ${ e.message }`);});
                await this.setCapabilityValue("my_measure_levelpercentage", levelpercentage).catch(e => {this.log(`Unable to set my_measure_levelpercentage: ${ e.message }`);});
                await this.setCapabilityValue("my_measure_levelabsolute", levelabsolute).catch(e => {this.log(`Unable to set my_measure_levelabsolute: ${ e.message }`);});
 
               // await this.setCapabilityValue("meter_water", this.watermeter).catch(e => {this.log(`Unable to set watermeter: ${ e.message }`);});

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
        //this.homey.flow.unregisterToken(this.realTimeDistance);
        this.homey.flow.unregisterToken(this.distancemeterSoftwareUpdate);


		setTimeout(() => {
			this.onInit();
		}, 5000);
	}

    // this method is called when the Device is added
	onAdded() {
		this.log(`SmartGateway Distancemeter added as device: ${this.getName()}`);
	}

	// this method is called when the Device is deleted
	onDeleted() {
		// stop polling
        clearInterval(this.timerPoll);

       // this.homey.flow.unregisterToken(this.realTimeDistance);
        this.homey.flow.unregisterToken(this.distancemeterSoftwareUpdate);
		
        this.log(`SmartGateway Distancemeter deleted as device: ${this.getName()}`);
	}

	onRenamed(name) {
		this.log(`SmartGateway Distancemeter renamed to: ${name}`);
    }
    
    
}

module.exports = SGDistancemeter;