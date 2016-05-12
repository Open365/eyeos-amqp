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
/**
 * Set of utilities for managing (basically with testing purposes) some RabbitMQ aspects using
 * RabbitMQ REST API:
 * http://hg.rabbitmq.com/rabbitmq-management/raw-file/3646dee55e02/priv/www-api/help.html
 */
var assert = require('chai').assert;
var request = require('request');

var RabbitRestApiUtils = function(host, port, user, password, vhost) {
    user = user || 'guest';
    password = password || 'guest';
    host = host || 'localhost';
    port = port || 15672;
    this.vhost = vhost === '/' ? '/%2f' : vhost || '/%2f';
    this.apiUrl = 'http://'+user+':'+password+'@'+host+':'+port+'/api';
};

RabbitRestApiUtils.prototype.getResourcesUrl = function(resourceName, exchangeName){
    return this.apiUrl + resourceName + this.vhost + '/' + exchangeName;
}

RabbitRestApiUtils.prototype.getExchangesUrl = function(exchangeName){
    return this.getResourcesUrl('/exchanges', exchangeName);
}

RabbitRestApiUtils.prototype.getQueuesUrl = function(queueName){
    return this.getResourcesUrl('/queues', queueName);
}

RabbitRestApiUtils.prototype.deleteExchange = function (exchangeName, cb) {
    var url = this.getExchangesUrl(exchangeName);
    var status;
    request(url, {method: 'DELETE'}, function (error, response, body) {
        if(error) cb(error, null);
        if(cb && ! error) { // if delete was OK, statusCode is 204. if exchange did not exist, 404.
            status = response && response.statusCode || 500;
            cb(null, status);
        } else {
            console.log('>>> deleting exch:', url, exchangeName, status, 'body:', body, 'error:', error);
        }
    });
}

RabbitRestApiUtils.prototype.deleteQueue = function (queueName, cb) {
    var url = this.getQueuesUrl(queueName);
    var status;
    request(url, {method: 'DELETE'}, function (error, response, body) {
        if(error) cb(error, null);
        if(cb && ! error) { // if delete was OK, statusCode is 204. if exchange did not exist, 404.
            status = response && response.statusCode || 500;
            cb(null, status);
        } else {
            console.log('>>> deleting exch:', url, queueName, status, 'body:', body, 'error:', error);
        }
    });
};


function _doExistsRequest(url, resource, callback) {
    request(url, function (error, response, body) {
        if (error || response.statusCode !== 200) {
            callback(false);
        } else {
            callback(true, body);
        }
    });
}

RabbitRestApiUtils.prototype.checkExchangeExists = function (exchangeName, callback) {
    var url = this.getExchangesUrl(exchangeName);
    _doExistsRequest(url, exchangeName, callback);
};


RabbitRestApiUtils.prototype.checkQueueExists = function (queueName, callback) {
    var url = this.getQueuesUrl(queueName);
    _doExistsRequest(url, queueName, callback);
};

RabbitRestApiUtils.prototype.checkTwoExchangesBinded = function (srcExchName, tgtExchName, callback) {
    var url = this.apiUrl + '/bindings/'+this.vhost+'/e/'+srcExchName+'/e/'+tgtExchName;
    request(url, function (error, response, body) {
        var body = JSON.parse(body);
        if (error || response.statusCode !== 200 || !body.length || body.length < 1) {
            callback(false);
        } else {
            callback(true);
        }
    });
};

RabbitRestApiUtils.prototype.assertTwoExchangesBinded = function (srcExchName, tgtExchName, done) {
    this.checkTwoExchangesBinded(srcExchName, tgtExchName, function(exists){
        assert.isTrue(exists, 'Binding: ['+srcExchName+'] => ['+tgtExchName+ '] expected to exist, but was not found in rabbitmq.');
        if(done) {
            done();
        }
    });
};


RabbitRestApiUtils.prototype.assertExchangeExists = function (exchangeName, done) {
    this.checkExchangeExists(exchangeName, function(exists){
        assert.isTrue(exists, 'Exchange named [' +  exchangeName + '] expected to exist, but was not found in rabbitmq.');
        if(done) {
            done();
        }
    });
};

RabbitRestApiUtils.prototype.assertExchangeExists = function (exchangeName, done) {
    this.checkExchangeExists(exchangeName, function(exists){
        assert.isTrue(exists, 'Exchange named [' +  exchangeName + '] expected to exist, but was not found in rabbitmq.');
        if(done) {
            done();
        }
    });
};

RabbitRestApiUtils.prototype.assertQueueExists = function (queueName, done) {
    this.checkQueueExists(queueName, function(exists){
        assert.isTrue(exists, 'Queue named [' +  queueName + '] expected to exist, but was not found in rabbitmq.');
        if(done) {
            done();
        }
    });
};

RabbitRestApiUtils.prototype.assertQueueExistsWithOptions = function (queueName, options, done) {
    this.checkQueueExists(queueName, function(exists, body) {
        assert.isTrue(exists, 'Queue named [' +  queueName + '] expected to exist, but was not found in rabbitmq.');
        var queueInformation = JSON.parse(body);
        var queueOptions = {
            durable: queueInformation.durable,
            autoDelete: queueInformation.auto_delete,
            excluse: queueInformation.exclusive,
            arguments: queueInformation.arguments
        };
        for (var optionName in options) {
            assert.equal(queueOptions[optionName], options[optionName], 'Queue option [' + optionName + '] has an incorrect value');
        }
        if(done) {
            done();
        }
    });
};

RabbitRestApiUtils.prototype.assertExchangeNotExists = function (exchangeName, done) {
    this.checkExchangeExists(exchangeName, function(exists){
        assert.isFalse(exists, 'Exchange named [' +  exchangeName + '] expected not to exist, but was found in rabbitmq.');
        if(done) {
            done();
        }
    });
};

RabbitRestApiUtils.prototype.assertQueueNotExists = function (queueName, done) {
    this.checkQueueExists(queueName, function(exists){
        assert.isFalse(exists, 'Queue named [' +  queueName + '] expected not to exist, but was found in rabbitmq.');
        if(done) {
            done();
        }
    });
};

module.exports = RabbitRestApiUtils;
