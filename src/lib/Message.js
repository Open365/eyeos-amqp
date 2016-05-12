/*
    Copyright (c) 2016 eyeOS

    This file is part of Open365.

    Open365 is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

var Connection = require('./Connection');
var merge = require('merge');
var util = require('util');
var WError = require('verror').WError;
var globalSettings = require('../settings.js');

/**
	Construct a Message normally used to communicate with another microservice
	Arguments -
	* queue - Either a string containing the name or an object containing the
			name along with default options to use in order to declare the queue
			if it doesn't exist
	* payload - String payload or object which will be serialized
*/
var Message = function(queue, payload, injSettings, injCon) {
	if (typeof queue == 'string') {
		queue = {
			name: queue
		}
	}

	var defaultOptions = {
		durable: true,
		autoDelete: false
	};
	this.queue = merge(defaultOptions, queue);
	this.payload = payload;

	var defaultSettings = {
		host: globalSettings.host,
		port: globalSettings.port,
		user: globalSettings.login,
		password: globalSettings.password
	};
	this.settings = merge(defaultSettings, injSettings);
	this.injectedConnection = injCon;
};

var InvalidArgumentError = function(propName, message) {
	Error.captureStackTrace(this, this.constructor);
	this.name = 'InvalidArgumentError';
	this.propertyName = propName;
	this.message = message;
};
util.inherits(InvalidArgumentError, Error);

Message.prototype.send = function(callback) {
	if (!this.queue) {
		callback(new InvalidArgumentError('queue', 'Missing Queue Object'));
		return;
	}
	if (!this.queue.name) {
		callback(new InvalidArgumentError('queue', 'Missing Queue name'));
		return;
	}

	if (!this.payload) {
		callback(new InvalidArgumentError('payload', 'Missing Payload'));
		return;
	}

	var self = this;
	var con = this.injectedConnection || new Connection(this.settings);
	con.connect(function(err) {
		if (err) {
			var connectError = new Error();
			connectError.name = 'ConnectionError';
			callback(connectError);
			return;
		}

		var name = self.queue.name;
		delete self.queue.name;
		con.declareQueue(name, self.queue, function(err) {
			if (err) {
				// Queue already exists, but with different options. Not a problem
				if (err.name != 'InvalidArgumentError') {
					callback(new WError(err, "Failed to create queue " + name));
					return;
				}
			}

			con.exchangePublish(name, self.payload, function(err) {
				if (err) {
					callback(new WError(err, "Failed to send message to queue " + name));
					return;
				}
				con.disconnect(callback);
			});
		});
	});
};

module.exports = Message;
