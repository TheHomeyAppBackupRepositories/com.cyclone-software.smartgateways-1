'use strict';

const { Driver } = require('homey');
const mdnsResolver = require('mdns-resolver');
const constants = require('../../constants.js');
const sg = require('../../smartgateway.js');

class KamstDriver extends Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('KamstDriver has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    this.log('Start ip range discovery');

    const smartmeter = new sg();	
    const devs = await smartmeter.discover(constants.kamstUrl).then(
            hosts => {
                const devices = [];
                hosts.forEach((host) => {

                        let dev = {
                            name: 'Kamst-IR',
                            data: { id: `ConKamst ${host}` },
                            settings: {
                                KamstIp: host,
                             }
                        }
                        devices.push(dev);
                    }
                )
                return devices;
            }
        ).catch(c => {return []});

        if (devs && devs[0]) {
            this.log('found ip search device');
            return devs;
        }
        {

            this.log('Did not found ip adress, default ip address (127.0.0.1) change in advanced settings...');

            return [
                {
                    name: 'Smart Gateways def Kamst-IR',
                    data: { id: `ConKamst 127.0.0.1` },
                    settings: {
                        KamstIp: '127.0.0.1',
                        }
                },
            ];
       }
  }

}

module.exports = KamstDriver;
