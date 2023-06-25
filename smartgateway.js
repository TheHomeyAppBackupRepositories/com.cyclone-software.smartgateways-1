'use strict';

const os = require('os');
const http = require('http');

class SmartGateway {

    constructor() {
	}


    async discover(url) {
        const hostsToTest = [];	// make an array of all host IP's in the LAN
        const servers = [];
        try { 

            const ifaces = os.networkInterfaces();	// get ip address info from all network interfaces
            Object.keys(ifaces).forEach((ifName) => {
              ifaces[ifName].forEach((iface) => {
                if (iface.family === 'IPv4' && !iface.internal) {
                  servers.push(iface.address);
                }
              });
            });
          
            servers.map((server) => {
              const splitServer = server.split('.').slice(0, 3);
              const reducer = (accumulator, currentValue) => `${accumulator}.${currentValue}`;
              const segment = splitServer.reduce(reducer);
              if (segment.slice(0, 3) === '127') { return undefined; }
              for (let host = 1; host <= 254; host += 1) {
                const ipToTest = `${segment}.${host}`;
                hostsToTest.push(ipToTest);
              }
              return hostsToTest;
            });
          
            this.timeout = 10000;	// temporarily set http timeout to 2 seconds
            const allHostsPromise = hostsToTest.map(async (hostToTest) => {
              const result = await this.getInfo(hostToTest, url)
                .catch(() => undefined);
              return result;
            });

            const allHosts = await Promise.all(allHostsPromise);
            const discoveredHosts = allHosts.filter((host) => host);
            return Promise.resolve(discoveredHosts);

        } catch (error) {
			return Promise.reject(error);
		}

    }

    async getInfo(host, url) {
        const headers = {
          'Content-Length': 0,
          Connection: 'keep-alive',
        };
        const options = {
          hostname: host,
          path: url,
          port: 82,
          headers,
          method: 'GET',
        };
    
        try {
            const res = await this._makeHttpRequest(options, '', 10000);
            const { statusCode } = res;
            console.log(res.body);
        
            if ((statusCode==200) && (res.body.includes('{'))) {
                return Promise.resolve(host);
            } else
                return Promise.resolve('');              
        } catch (error) {
            return Promise.reject(error);
        }
      }
    
      async _makeHttpRequest(options, postData, timeout) {
            return new Promise((resolve, reject) => {
                const opts = options;
                opts.timeout = timeout || this.timeout;
                const req = http.request(opts, (res) => {
                    let resBody = '';
                    res.on('data', (chunk) => {
                        resBody += chunk;
                    });
                    res.once('end', () => {
                        if (!res.complete) {
                            return reject(Error('The connection was terminated while the message was still being sent'));
                        }
                        res.body = resBody;
                        return resolve(res); // resolve the request
                    });
                });
                req.on('error', (e) => {
                    req.destroy();
                //	this.lastResponse = e;	// e.g. ECONNREFUSED on wrong soap port or wrong IP // ECONNRESET on wrong IP
                    return reject(e);
                });
                req.on('timeout', () => {
                    req.destroy();
                });
                // req.write(postData);
                req.end(postData);
            });
        }

}

module.exports = SmartGateway;