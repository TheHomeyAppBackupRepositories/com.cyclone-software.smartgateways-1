'use strict';

const { Device } = require('homey');
const fetch = require('node-fetch');
const constants = require('../../constants.js');

class kamstir extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    try {
      this.log(`Init device ${this.getName()}`);

      this.lastSoftwareUpdate = false;

      this.settings = this.getSettings();

      this.softwareUpdateTrigger = this.homey.flow.getDeviceTriggerCard('software_update_kamst'); 
 
			// polling for device info
			this.timerPoll = setInterval(async () => {
				try {
					// get new readings and update the devicestate
					await this.doPolling();
				} catch (error) {
					this.error('Polling error', error);
				}
			}, this.settings.pollingInterval_kamst * 1000);
            
            await this.setAvailable();
               
		} catch (error) {
			this.error(error);
		}   
  }

  parseBool(val) { return val === true || val === "true" }
  pf(val) {return parseFloat(val)}

  async doPolling() {
    this.log(`Updating device: ${this.getName()}`);
    // let url = "http://84.27.155.81:82/kamst-ir/api/read"
    let url = `http://${this.settings.KamstIp}:82${constants.kamstUrl}`;
    fetch(url).then( async res => {
      if (res.ok) {
          this.setAvailable().catch(this.error);
          const data = await res.json();

          this.log(data);

          this.setSettings({
            mac_address_kamst: data.mac_address,
            firmware_run_kamst: data.firmware_running,
            firmware_available_kamst: data.firmware_available,
            startup_time_kamst: data.startup_time,
            model_kamst: data.gateway_model
          }).catch(this.error);

          let softwareUpdate = this.parseBool(data.firmware_update_available);

          if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===true) {
            this.lastSoftwareUpdate=softwareUpdate;
            console.log("trigger software update");
            this.softwareUpdateTrigger.trigger(this, {}, {}).catch(this.error); 
          } else if (this.lastSoftwareUpdate!==softwareUpdate && softwareUpdate===false) {
            this.lastSoftwareUpdate=softwareUpdate;
        }
        await Promise.all([
           this.setCapabilityValue("measure_thermheat",this.pf(data.heat_energy)).catch(e => {this.log(`Unable to set measure_thermheat: ${ e.message }`);}),
           this.setCapabilityValue("measure_power", this.pf(data.power)).catch(e => {this.log(`Unable to set meter_power.peak: ${ e.message }`);}),
           this.setCapabilityValue("measure_temperature.in", this.pf(data.temp1)).catch(e => {this.log(`Unable to set meter_power.peak: ${ e.message }`);}),
           this.setCapabilityValue("measure_temperature.out", this.pf(data.temp2)).catch(e => {this.log(`Unable to set meter_power.peak: ${ e.message }`);}),
           this.setCapabilityValue("measure_temperature.diff", this.pf(data.tempdiff)).catch(e => {this.log(`Unable to set meter_power.peak: ${ e.message }`);}),
           this.setCapabilityValue("measure_water", this.pf(data.flow)).catch(e => {this.log(`Unable to set measure_water: ${ e.message }`);}),
           this.setCapabilityValue("measure_water.min", this.pf(data.minflow_m)).catch(e => {this.log(`Unable to set measure_water.min: ${ e.message }`);}),
           this.setCapabilityValue("measure_water.max", this.pf(data.maxflow_m)).catch(e => {this.log(`Unable to set measure_water.max: ${ e.message }`);}),
           this.setCapabilityValue("meter_water", this.pf(data.volume)).catch(e => {this.log(`Unable to set measure_water.max: ${ e.message }`);}),
           this.setCapabilityValue("measure_hourcounter", this.pf(data.hourcounter)).catch(e => {this.log(`Unable to set measure_hourcounter: ${ e.message }`);}),      
           this.setCapabilityValue("wifiState", this.pf(data.wifi_rssi)).catch(e => {this.log(`Unable to set measure_water.max: ${ e.message }`);})
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

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log(`${this.getName()} has been added`);
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
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

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log(`SmartGateway Kamst-IR renamed to: ${name}`);
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    clearInterval(this.timerPoll);
		this.log(`SmartGateway Kamst-IR deleted as device: ${this.getName()}`);
  }

}

module.exports = kamstir;
