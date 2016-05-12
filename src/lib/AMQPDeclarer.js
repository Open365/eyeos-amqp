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

var logger = require('log2out');

var AMQPDeclarer = function(connection) {
    this.logger = logger.getLogger('AMQPDeclarer');
    this.connection = connection;
};

AMQPDeclarer.prototype.declareQueue = function declareQueue(name, options, cb) {
    this.connection.queue(name, options, cb);
};

AMQPDeclarer.prototype.declareExchange = function declareExchange(name, options, cb) {
    this.connection.exchange(name, options, cb);
};

AMQPDeclarer.prototype.bindExchangeToExchange = function bindExchangeToExchange(srcExchName, tgtExchName, routingKey, cb) {
    var tgtExchange = this.connection.exchange(tgtExchName, {passive: true}, function(exch){
        exch.bind(srcExchName, routingKey, cb);
    });
};

AMQPDeclarer.prototype.bindQueueToExchange = function bindQueueToExchange(srcExchangeName, tgtQueueName, routingKey, cb) {
    var tgtQueue = this.connection.queue(tgtQueueName, {passive: true}, function(queue){
        queue.bind(srcExchangeName, routingKey, cb);
    });
};

AMQPDeclarer.prototype.toString = function toString() {
    var extra = '';
    if ( this.connection && this.connection.options ) {
        extra = this.connection.options.toString();
    }
    return 'AMQPDeclarer ' + extra;
};

AMQPDeclarer.prototype.validateDeclaration = function validateDeclaration(declarationObject) {
    function isInvalidObject(obj) {
        return !obj || typeof obj !== 'object';
    }

    if ( isInvalidObject(declarationObject) || isInvalidObject(declarationObject.queue) || !declarationObject.queue.name) {
        throw Error('Wrong declaration object:' + JSON.stringify(declarationObject));
    }

    //declarationObject.bindTo is optional, with Array type.
    if ( declarationObject.bindTo && !Array.isArray(declarationObject.bindTo) ) {
        throw Error('Wrong declaration object.bindTo:' + JSON.stringify(declarationObject));
    }
    if ( Array.isArray(declarationObject.bindTo) ) {
        declarationObject.bindTo.forEach(function (exchangeDeclarationObj) {
            //exchange declarations expected to have exchangeName, rest of options are optional.
            if (isInvalidObject(exchangeDeclarationObj) || !exchangeDeclarationObj.exchangeName) {
                throw Error('Wrong declaration object, trying to bind to invalid exchange declaration:' + JSON.stringify(exchangeDeclarationObj) + ' in: ' + JSON.stringify(declarationObject));
            }
        });
    }
};

AMQPDeclarer.prototype.declare = function declare(declarationObject, cb) {
    var self = this;

    this.validateDeclaration(declarationObject);

    this.connection.queue(declarationObject.queue.name, declarationObject.queue, function(queue){
        var exchanges = declarationObject.bindTo || [];
        if (exchanges.length) { //there are exchanges to declare and bind
            var binded = 0;

            queue.on('queueBindOk', function(){ //counting exchanges binded to queue
                binded += 1;
                if (binded === exchanges.length) {//cb when all exchanges were binded.
                    return cb(null, queue);
                }
            });

            exchanges.forEach(function (exchangeDeclarationObj) {
                var exchangeName = exchangeDeclarationObj.exchangeName;
                var routingKey = exchangeDeclarationObj.routingKey || '';
                var options = exchangeDeclarationObj.options || {};

                self.connection.exchange(exchangeName, options, function (exchange){
                    exchange.close();
                    queue.bind(exchangeName, routingKey);
                });
            });
            return;
        }
        return cb(null, queue);
    });

};

module.exports = AMQPDeclarer;
