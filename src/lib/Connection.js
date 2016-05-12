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

var amqp = require('amqp');
var merge = require('merge');
var globalSettings = require('../settings.js');

var Connection = function(settings, defaultSettings, amqpInj) {
    defaultSettings = defaultSettings || globalSettings.defaultConnectionSettings;
    this.conn = null;
    this.amqp = amqpInj || amqp;
    this.settings = merge(defaultSettings, settings);
};

/**
 * node-amqp is catching exceptiongs thrown by OUR callbacks, thus converting them
 * into node-amqp errors, for example error events will be emitted.
 */
function runIntoCallback(cb, arg) {
    setTimeout(cb.bind(null, arg), 0);
}

Connection.prototype.connect = function(cb) {
    var self = this;
    this.conn = this.amqp.createConnection(this.settings, {reconnect: false});

    var readyCallback = function readyCallback() {
        removeListeners();
        runIntoCallback(cb);
    };
    this.conn.on('ready', readyCallback);

    var errorCallback = function errorCallback(err) {
        removeListeners();
        runIntoCallback(cb, err);
    };
    this.conn.on('error', errorCallback);

    function removeListeners() {
        self.conn.removeListener('ready', readyCallback);
        self.conn.removeListener('error', errorCallback);
    }

    this.conn.on('error', function(err) {
        console.log("ConnectionError:", err);
        self.conn = null;
    });
};

Connection.prototype.declareQueue = function(name, options, cb) {
    if (!this.conn) {
        runIntoCallback(cb, new Error("Connection is missing"));
        return;
    }

    var validOptions = ['passive', 'durable', 'exclusive', 'autoDelete', 'noDeclare',
                        'arguments', 'closeChannelOnUnsubscribe'];
    for (var propName in options) {
        if (validOptions.indexOf(propName) == -1) {
            var error = new Error();
            error.type = 'InvalidArgumentError';
            error.message = 'Option ' + propName + ' is not an accepted option';
            error.propertyName = propName;

            cb(error);
            return;
        }
    }

    var conError = function(err) {
        cb(err);
    };
    this.conn.on('error', conError);

    var self = this;
    var queue = this.conn.queue(name, options, function() {
        queue.close();

        self.conn.removeListener('error', conError);
        runIntoCallback(cb);
    });

    queue.once('error', function(err) {
        self.conn.removeListener('error', conError);
        if (err.code === 406 /*Precondition Failed*/) {
            err.name = 'InvalidArgumentError';
            err.propertyName = 'options';
        }

        runIntoCallback(cb, err);
    });
};

Connection.prototype.declareExchange = function(name, options, callback) {
    if (!this.conn) {
        runIntoCallback(callback, new Error("Connection is missing"));
        return;
    }
    var conError = function(err) {
        runIntoCallback(callback, err);
        callback(err);
    };
    this.conn.on('error', conError);

    var self = this;
    function removeListeners() {
        self.conn.removeListener('ready', conError);
    }
    this.conn.exchange(name, options, function() {
        removeListeners();
        callback(null);
    });
};

Connection.prototype.exchangePublish = function(queueName, message, callback) {
    if (!this.conn) {
        runIntoCallback(callback, new Error("Connection is missing"));
        return;
    }
    var conError = function(err) {
        callback(err);
    };
    this.conn.on('error', conError);

    var self = this;
    var options = {
        confirm: true
    };
    this.conn.exchange('', options, function(ex) {
        ex.on('basic-return', function(err) {
            console.log("Exchange Got basic-return event", err);
            ex.emit('error', err);
        });

        var options = {
            mandatory: true
        };
        console.log("Sending message to queue " + queueName);
        setTimeout(function() {
            ex.publish(queueName, message, options, function(hasError, err) {
                ex.close();
                self.conn.removeListener('error', conError);
                runIntoCallback(callback, err);
            });
        }, 0);
    });
};

Connection.prototype.disconnect = function (cb) {
	if (!this.conn) {
		cb();
		return;
	}

	this.conn.socket.on('close', function() {
		cb();
	});
	this.conn.disconnect();
};

module.exports = Connection;
