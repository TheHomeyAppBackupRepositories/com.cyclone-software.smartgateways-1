const Homey = require('homey');
const mdnsResolver = require('mdns-resolver');
const constants = require('../../constants.js');
const sg = require('../../smartgateway.js');

const SECONDS = 1000;

class SmartGatewayDriver extends Homey.Driver {
    async onInit() {
        this.log('entering SmartGateways Warmtenet driver');
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

        this.log('Start ip range discovery');

        const smartmeter = new sg();	
        const devs = await smartmeter.discover(constants.warmtenet).then(
                hosts => {
                    const devices = [];
                    hosts.forEach((host) => {

                            let dev = {
                                name: 'SmartGateways Warmtenet',
                                data: { id: `ConSMN ${host}` },
                                settings: {
                                    SGThermIp: host,
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
                        name: 'SmartGateways def Warmtenet',
                        data: { id: `ConSMN 127.0.0.1` },
                        settings: {
                            SGThermIp: '127.0.0.1',
                            }
                    },
                ];
           }


        // return [
        //     {
        //         name: 'Smart Gateways WarmteLink',
        //         data: { id: { id: `ConTM 94.208.218.190` }, },
        //         settings: {
        //             SGThermIp: '94.208.218.190',
        //          }
        //     },
        // ];

    }
   
}

module.exports = SmartGatewayDriver;