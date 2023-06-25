const Homey = require('homey');
const mdnsResolver = require('mdns-resolver')
const sg = require('../../smartgateway.js');
const constants = require('../../constants.js');

const SECONDS = 1000;

class SmartGatewayDriver extends Homey.Driver {
    async onInit() {
        this.log('entering Smart Gateways driver');
        //this.onResetAtMidnight();
     
    }

    // onResetAtMidnight() {
    //     let me = this;
    //     var now = new Date();
    //     var night = new Date(
    //         now.getFullYear(),
    //         now.getMonth(),
    //         now.getDate() + 1, // the next day, ...
    //         0, 0, 0 // ...at 00:00:00 hours
    //     );
    //     this.log("reset midnight");

    //     var msToMidnight = night.getTime() - now.getTime();

    //     setTimeout(function() {
    //           // do some work
    //           me.DoResetMidnight();
    //           me.onResetAtMidnight();
    //         }, msToMidnight);
    // }

    // async DoResetMidnight() {
    //     let me = this;
    //     this.log('start reset midnight');
    //     return new Promise(function(resolve, reject) {
    //         try {
    //                   me.getDevices().forEach(async(dev) => {
    //                     let data = dev.getData();
    //                     let homeyDevice = me.getDevice(data);
    //                     if (homeyDevice instanceof Homey.Device) {
    //                             // update device
    //                             await homeyDevice.OnResetMidnight(data);
    //                     } 
    //                 });
    //                 resolve(true); 
    //             } catch (error) {
    //                 reject(error);
    //         }
    //     });

    // }


    async onPairListDevices()  {
        // return [
        //     {
        //         name: 'Connectix Gasmeter',
        //         data: { id: `ConGM http://support.connectix.nl/` },
        //         settings: {
        //             SGGasIp: 'support.connectix.nl',
        //          }
        //     },
        // ];

        this.log('Start ip range discovery');

        const smartmeter = new sg();	
        const devs = await smartmeter.discover(constants.SGGasURL).then(
                hosts => {
                    const devices = [];
                    hosts.forEach((host) => {

                            let dev = {
                                name: 'Smart Gateways Gasmeter',
                                data: { id: `ConGM ${host}` },
                                settings: {
                                    SGWaterIp: host,
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

        this.log('device discovery started');


        const mdnsdevs = await mdnsResolver.resolve4('connectix_gasmeter.local').then(
                e => {
                    return [
                        {
                            name: 'Smart Gateways Gasmeter',
                            data: { id: `ConGM ${e}` },
                            settings: {
                                SGWaterIp: e,
                             }
                        },
                    ];
                }
            ).catch(c => {return []});
               
            if (mdnsdevs && mdnsdevs[0]) {
                this.log('found mdns device');
                //console.log(mdnsdevs);
                return mdnsdevs;
            }
            {

                this.log('Did not found ip adress, default ip address (127.0.0.1) change in advanced settings...');

                return [
                    {
                        name: 'mart Gateways def Gasmeter',
                        data: { id: `ConGM 127.0.0.1` },
                        settings: {
                            SGP1Ip: '127.0.0.1',
                            }
                    },
                ];
           }

        return Promise.resolve(devs);
    }
   
}

module.exports = SmartGatewayDriver;