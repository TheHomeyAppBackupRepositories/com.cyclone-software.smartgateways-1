/*
Copyright 2016 - 2018, Robin de Gruijter (gruijter@hotmail.com)
adjusted for SDK 3
*/

'use strict';

const StdOutFixture = require('fixture-stdout');
const fs = require('fs');
// const util = require('util');

class captureLogs {
	// Log object to keep logs in memory and in persistent storage
	// captures and reroutes Homey's this.log (stdout) and this.err (stderr)

	constructor(opts) {
		this.homey = opts.homey;
		this.logName = opts.name || 'log';
		this.logLength = opts.length || 50;
		this.logFile = `/userdata/${this.logName}.json`;
		this.logArray = [];
		this.getLogs();
		this.captureStdOut();
		this.captureStdErr();
		// Homey.app.log('capture is ready :)');
	}

	getLogs() {
		try {
			const log = fs.readFileSync(this.logFile, 'utf8');
			this.logArray = JSON.parse(log);
			this.homey.log('logfile retrieved');
			return this.logArray;
		} catch (error) {
			if (error.message.includes('ENOENT')) return [];
			this.homey.error('error parsing logfile: ', error.message);
			return [];
		}
	}

	saveLogs() {
		try {
			fs.writeFileSync(this.logFile, JSON.stringify(this.logArray));
			this.homey.log('logfile saved');
			return true;
		} catch (error) {
			this.homey.error('error writing logfile: ', error.message);
			return false;
		}
	}

	deleteLogs() {
		try {
			fs.unlinkSync(this.logFile);
			this.logArray = [];
			this.homey.log('logfile deleted');
			return true;
		} catch (error) {
			if (error.message.includes('ENOENT')) return false;
			this.homey.error('error deleting logfile: ', error.message);
			return false;
		}
	}

	captureStdOut() {
		// Capture all writes to stdout (e.g. this.log)
		this.captureStdout = new StdOutFixture({ stream: process.stdout });
		this.captureStdout.capture((string) => {
			if (this.logArray.length >= this.logLength) {
				this.logArray.shift();
			}
			this.logArray.push(string);
			// return false;	// prevent the write to the original stream
		});
		this.homey.log('capturing stdout');
		// captureStdout.release();
	}

	captureStdErr() {
		// Capture all writes to stderr (e.g. this.error)
		this.captureStderr = new StdOutFixture({ stream: process.stderr });
		this.captureStderr.capture((string) => {
			if (this.logArray.length >= this.logLength) {
				this.logArray.shift();
			}
			this.logArray.push(string);
			// return false;	// prevent the write to the original stream
		});
		this.homey.log('capturing stderr');
		// captureStderr.release();
	}

	releaseStdOut() {
		this.captureStdout.release();
	}

	releaseStdErr() {
		this.captureStderr.release();
	}

}

module.exports = captureLogs;
