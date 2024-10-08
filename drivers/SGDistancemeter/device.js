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
            
            // if for some reason the token exist.
            try {
                var idToken = await this.homey.flow.getToken('sm_distancemeter_software_update_token');
                if (idToken!=null)
                {
                    this.homey.flow.unregisterToken(idToken);
                }                    
            } catch (error) {
                
            }
           
            // this.distancemeterSoftwareUpdate = await this.homey.flow.createToken('sm_distancemeter_software_update_token', {
            //     type: 'boolean',
            //     title: 'Distancemeter Software Update Available'
            // }).catch();
    

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
        let url = `http://${this.settings.SGDistancemeterIp}:82${constants.SGDistanceMeterURL}`;
        this.log(`Updating device: ${this.getName()} at ${url}`);

        // if (this.settings.SGDistancemeterIp=='31.187.250.44_1')
        // {
        //     url = `http://31.187.250.44:83${constants.SGDistanceMeterURL}`;
        //     this.log(`Updating device: ${url}`);
        // }

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
        
                if (this.lastReading!==distancemeter_average_distance) {
                    this.log(`water level trigger: ${distancemeter_average_distance}`);
                    await this.waterlevelTrigger.trigger(this, {}, {}).catch(this.error);
                    this.lastReading=distancemeter_average_distance;
                }
        
               // await this.distancemeterSoftwareUpdate.setValue(softwareUpdate);
                //await this.realTimeDistance .setValue(distancemeter_average_distance);

                await this.setCapabilityValue("wifiState", WiFiState).catch(e => {this.log(`Unable to set wifiState: ${ e.message }`);});
                await this.setCapabilityValue("measure_distance_waterlevel", distancemeter_average_distance).catch(e => {this.log(`Unable to set measure_distance_waterlevel: ${ e.message }`);});
                await this.setCapabilityValue("measure_levelpercentage_waterlevel", levelpercentage).catch(e => {this.log(`Unable to set measure_levelpercentage_waterlevel: ${ e.message }`);});
                await this.setCapabilityValue("measure_levelabsolute_waterlevel", levelabsolute).catch(e => {this.log(`Unable to set measure_levelabsolute_waterlevel: ${ e.message }`);});
 
               // await this.setCapabilityValue("meter_water", this.watermeter).catch(e => {this.log(`Unable to set watermeter: ${ e.message }`);});

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
        //this.homey.flow.unregisterToken(this.realTimeDistance);
       // this.homey.flow.unregisterToken(this.distancemeterSoftwareUpdate);

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
       // this.homey.flow.unregisterToken(this.distancemeterSoftwareUpdate);
		
        this.log(`SmartGateway Distancemeter deleted as device: ${this.getName()}`);
	}

	onRenamed(name) {
		this.log(`SmartGateway Distancemeter renamed to: ${name}`);
    }
    
    
}

module.exports = SGDistancemeter;