const Homey = require('homey');
const mdnsResolver = require('mdns-resolver');
const sg = require('../../smartgateway.js');
const constants = require('../../constants.js');

// const SECONDS = 1000;

// const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

class SmartGatewayDriver extends Homey.Driver {
    async onInit() {
        this.log('entering Smart Gateway water driver');

        // this.timeZone = this.homey.clock.getTimezone();

        // this.log(this.timeZone);

        //this.onResetAtMidnight();
     
    }

    // onResetAtMidnight() {
    //     let me = this;
    //     const now = new Date();
    //     const datestr = now.toLocaleString('en-US', { hour12: false, timeZone: this.timeZone });
    //     const nowLocal = new Date(datestr);

    //     var night = new Date(
    //         nowLocal.getFullYear(),
    //         nowLocal.getMonth(),
    //         nowLocal.getDate() + 1, // the next day, ...
    //         0, 0, 0 // ...at 00:00:00 hours
    //     );
    //     this.log("reset midnight");

    //     var msToMidnight = night.getTime() - nowLocal.getTime();

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
   
        this.log(`Start ip range discovery`);

        const smartmeter = new sg();	
        const devs = await smartmeter.discover(constants.SGWaterURL).then(
                hosts => {
                    const devices = [];
                    hosts.forEach((host) => {

                            let dev = {
                                name: ' Smart Gateways Watermeter',
                                data: { id: `SGWM ${host}` },
                                settings: {
                                    SGWaterIp: host,
                                }
                            }
                            this.log(`Device Obj ${dev.data}`);
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
            else
            {
    
                this.log('Did not found ip adress, default ip address (127.0.0.1) change in advanced settings...');
    
                return [
                    {
                        name: 'Smart Gateways def Watermeter',
                        data: { id: `ConWM 127.0.0.1` },
                        settings: {
                            SGP1Ip: '127.0.0.1',
                         }
                    },
                ];
            }


//        this.log('device discovery started');
   
        
        // const mdnsdevs = await mdnsResolver.resolve4('connectix_watermeter.local').then(
        //     e => {
        //         return [
        //             {
        //                 name: 'Connectix Watermeter',
        //                 data: { id: `ConWM ${e}` },
        //                 settings: {
        //                     SGWaterIp: e,
        //                  }
        //             },
        //         ];
        //     }
        // ).catch(c => {
        //     this.log('mdns did not find any device');                
        //   }
        // );
        
        // if (mdnsdevs && mdnsdevs[0]) {
        //     this.log('found mdns device');
        //     //console.log(mdnsdevs);
        //     return mdnsdevs;
        // } else
        // {

        //     this.log('Did not found ip adress, default ip address (127.0.0.1) change in advanced settings...');

        //     return [
        //         {
        //             name: 'Smart Gateways Watermeter',
        //             data: { id: `ConWM 127.0.0.1` },
        //             settings: {
        //                 SGP1Ip: '127.0.0.1',
        //              }
        //         },
        //     ];
        // }

        
        return Promise.resolve(devs);
    }
   
}

module.exports = SmartGatewayDriver;