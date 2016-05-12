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

'use strict';
var logger = require('log2out').getLogger('amqpConnectionFactory');
var defaultConnectionSettings = require('../settings').defaultConnectionSettings;

var amqpConnection;
var pendingCallbacks = [];

function preprocessSetings(settings, defaultConnectionSettings){
    // Merge settings to defaultConnectionSettings, attributes existing in settings override those in defaultConnectionSettings.
    var settingsToMerge = defaultConnectionSettings;
    var mergedSettings = {};
    for (var setting in settingsToMerge) {
        if(settingsToMerge.hasOwnProperty(setting)) { // skip inherited properties
            mergedSettings[setting] = settingsToMerge[setting];
        }
    }
    for (var setting in settings) {
        if(settings.hasOwnProperty(setting)) { // skip inherited properties
            mergedSettings[setting] = settings[setting];
        }
    }
    return mergedSettings;
}

function callAllPending(error, connection){
    // pendingCallbacks to new var so that we can reset pendingCallbacks to avoid potential deadlocks
    var toNotify = pendingCallbacks;
    pendingCallbacks = [];
    for (var i = toNotify.length - 1; i >= 0; i--) {
        toNotify[i](error, connection);
    }
}

function getInstance(settings, callback, injectedConnectionInstance, injectedAmqp) {
    function connectingReady (connection) {
        logger.debug('connection ready for settings:', settings);
        amqpConnection.removeListener('error', connectingKo);
        amqpConnection.on('error', errorInConnection);
        if (settings.defaultExchange) {
            amqpConnection._defaultExchange = amqpConnection.exchange('', settings.defaultExchange);
        }
        callAllPending(null, amqpConnection);
    }

    function connectingKo(error){
        logger.error('error while connecting with settings:', settings, error);
        callAllPending(error, amqpConnection);
    }

    function errorInConnection (error) {
        logger.error('error in connection with settings:', settings, error);
    }

    if (!amqpConnection || pendingCallbacks.length > 0) {
        pendingCallbacks.push(callback);
        if (pendingCallbacks.length == 1) {
            var amqp = injectedAmqp || require('amqp');
            settings = preprocessSetings(settings, defaultConnectionSettings);
            settings.heartbeat = 60;
            amqpConnection = injectedConnectionInstance || amqp.createConnection(settings);
            amqpConnection.once('ready', connectingReady);
            amqpConnection.once('error', connectingKo);
        }
    } else {
        callback(null, amqpConnection);
    }
}

function reset(){
    amqpConnection = null;
}

module.exports = {
    getInstance: getInstance,
    reset: reset,
    preprocessSettings: preprocessSetings
};
