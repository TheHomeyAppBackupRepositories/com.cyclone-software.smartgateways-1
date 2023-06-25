const Homey = require('homey');
const mdnsResolver = require('mdns-resolver');
const constants = require('../../constants.js');
const sg = require('../../smartgateway.js');

const SECONDS = 1000;

class SmartGatewayDriver extends Homey.Driver {
    async onInit() {
        this.log('entering Smart Gateways SGP1 driver');    
    }


    async onPairListDevices()  {

        this.log('Start ip range discovery');

        const smartmeter = new sg();	
        const devs = await smartmeter.discover(constants.SGSGP1URL).then(
                hosts => {
                    const devices = [];
                    hosts.forEach((host) => {

                            let dev = {
                                name: 'Smart Gateways Smartmeter',
                                data: { id: `ConSM ${host}` },
                                settings: {
                                    SGP1Ip: host,
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
                        name: 'Smart Gateways def Smartmeter',
                        data: { id: `ConSM 127.0.0.1` },
                        settings: {
                            SGP1Ip: '127.0.0.1',
                            }
                    },
                ];
           }

        // this.log('device discovery started');


        //    let devices = await mdnsResolver.resolve4('connectix_smartmeter.local').then(
        //         e => {
        //             return [
        //                 {
        //                     name: 'Smart Gateways Smartmeter',
        //                     data: { id: `ConSM ${e}` },
        //                     settings: {
        //                         SGP1Ip: e,
        //                      }
        //                 },
        //             ];
        //         }
        //     ).catch(c => {return []});
        //     if (devices && devices[0]) {
        //         this.log('found ip search device');
        //         return devices;
        //     } else
        //     {

        //         this.log('Did not found ip adress, default ip address (127.0.0.1) change in advanced settings...');

        //         return [
        //             {
        //                 name: 'Smart Gateways Smartmeter',
        //                 data: { id: `ConSM 127.0.0.1` },
        //                 settings: {
        //                     SGP1Ip: '127.0.0.1',
        //                  }
        //             },
        //         ];
        //     }

    }
   
}

module.exports = SmartGatewayDriver;