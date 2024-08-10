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
   
        // return [
        //                 {
        //                     name: 'Smart Gateways Distance Meter TEST',
        //                     data: { id: `ConWLM 31.187.250.44_1` },
        //                     settings: {
        //                         SGDistancemeterIp: '31.187.250.44_1',
        //                      }
        //                 },
        //             ];

        this.log('Start ip range discovery');

        const smartmeter = new sg();	
        const devs = await smartmeter.discover(constants.SGDistanceMeterURL).then(
                hosts => {
                    const devices = [];
                    hosts.forEach((host) => {

                            let dev = {
                                name: 'Smart Gateways Distance Meter',
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

            {

                this.log('Did not found ip adress, default ip address (127.0.0.1) change in advanced settings...');

                return [
                    {
                        name: 'Smart Gateways Distance Meter',
                        data: { id: `ConWLM 127.0.0.1` },
                        settings: {
                            SGDistancemeterIp: '127.0.0.1',
                            }
                    },
                ];
           }

    }
   
}

module.exports = SmartGatewayDriver;