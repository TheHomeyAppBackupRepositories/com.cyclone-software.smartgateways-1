const Homey = require('homey');
const sg = require('../../smartgateway.js');
const constants = require('../../constants.js');

class SmartGatewayDriver extends Homey.Driver {
    async onInit() {
        this.log('entering Smart Gateways S0 driver');
    
    }

    async onPairListDevices()  {
        this.log('Start ip range discovery');

        const smartmeter = new sg();	
        const devs = await smartmeter.discover(constants.s0).then(
                hosts => {
                    const devices = [];
                    hosts.forEach((host) => {

                            let dev = {
                                name: 'Smart Gateways S0 Meter',
                                data: { id: `ConS0 ${host}` },
                                settings: {
                                    SGS0Ip: host,
                                }
                            }
                            devices.push(dev);
                        }
                    )
                    return devices;
                }
            ).catch(c => {return []});

            if (devs.length>0) {
                this.log('found ip search device');
                return devs;
            } 

        return Promise.resolve(devs);
    }
   
}

module.exports = SmartGatewayDriver;