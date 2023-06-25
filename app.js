'use strict';

const Homey = require('homey');
const Logger = require('./captureLogs.js');


class SmartGatewaysApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('SmartGateWay App has been initialized');

    if (!this.logger) this.logger = new Logger({ name: 'log', length: 200, homey: this.homey });

    process.on('unhandledRejection', (error) => {
			this.error('unhandledRejection! ', error);
		});
		process.on('uncaughtException', (error) => {
			this.error('uncaughtException! ', error);
    });
  }

  deleteLogs() {
		return this.logger.deleteLogs();
	}

	getLogs() {
		return this.logger.logArray;
	}
}

module.exports = SmartGatewaysApp;