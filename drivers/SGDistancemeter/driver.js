const Homey = require('homey');
const mdnsResolver = require('mdns-resolver');
const sg = require('../../smartgateway.js');
const constants = require('../../constants.js');

const SECONDS = 1000;

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

class SmartGatewayDriver extends Homey.Driver {
    async onInit() {
        this.log('entering Smart Gateway driver');    
    }


    async onPairListDevices()  {
   
        this.log('Start ip range discovery');

        const smartmeter = new sg();	
        const devs = await smartmeter.discover(constants.SGDistanceMeterURL).then(
                hosts => {
                    const devices = [];
                    hosts.forEach((host) => {

                            let dev = {
                                name: 'Smart Gateways Waterlevel Meter',
                                data: { id: `ConWLM ${host}` },
                                settings: {
                                    SGDistancemeterIp: host,
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