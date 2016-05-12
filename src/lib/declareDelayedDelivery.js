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

var amqpConnectionFactory =  require('./amqpConnectionFactory');
var amqpConnectionDisconnector = require('./amqpConnectionDisconnector');
var AMQPDeclarer = require('./AMQPDeclarer');
var logger = require('log2out').getLogger('declareDelayedDelivery');

var EXCHANGE_PREFIX   = 'ex.';
var DELAYED_PREFIX    = 'delayed.';
var DEADLETTER_PREFIX = 'deadletter.';

/**
 * Declares exchanges and queues needed for implementing Delayed Message Delivery in RabbitMQ.
 * The result is an exchange <name> and a queue <name>. When a message is sent to the exchange <name>, it is
 * retained in Rabbit for <delayMillis> millis and then delivered to queue <name>
 * @param name: name of the queue and exchange created.
 * @param delayMillis: delay between sending to exchange<name> and receiving in queue<name>
 * @param amqp_connection: amqp connection.
 * @param callback: called back when done. Only one param is passed to callback: null/error.
 */
function declareDelayedDelivery (name, delayMillis, amqp_connection, callback){
    var delayed_queue_name = DELAYED_PREFIX + name;
    var delayed_deadletter_exchange_name = DELAYED_PREFIX + DEADLETTER_PREFIX + EXCHANGE_PREFIX + name;

    var summary = 'exchange['+name+'] --()--> queue['+delayed_queue_name+'] --(deadletter+ttl:'+delayMillis+'-ms.)--> exchange['+delayed_deadletter_exchange_name+'] --()--> queue['+name+']';
    logger.debug('Declaring Delayed :', summary);

    var exchange_options = {
        type: 'topic',
        durable: true,
        autoDelete: false
    };

    var destination_queue_options = {
        durable: true,
        exclusive: false,
        autoDelete: false
    };

    var delayed_queue_options = {
        durable: true,
        exclusive: false,
        autoDelete: false,
        arguments: {
            "x-message-ttl": delayMillis,
            "x-dead-letter-exchange": delayed_deadletter_exchange_name
        }
    };

    function onError (error) {
        logger.error('Error Declaring Delayed:', summary, error);
        if (callback) {
            callback(error);
        }
        return;
    }

    // temporary (until declaration is finished) listening to connecton errors.
    amqp_connection.once('error', onError);

    var declarer = new AMQPDeclarer(amqp_connection);

    //Christmas Tree ;-)
    declarer.declareQueue(name, destination_queue_options, function(destination_queue){
        declarer.declareExchange(delayed_deadletter_exchange_name, exchange_options, function(delayed_deadletter_exchange){
            declarer.bindQueueToExchange(delayed_deadletter_exchange_name, name, '#', function () {
                declarer.declareQueue(delayed_queue_name, delayed_queue_options, function (delayed_queue){
                    declarer.declareExchange(name, exchange_options, function(source_exchange) {
                        declarer.bindQueueToExchange(name, delayed_queue_name, '#', function onSuccess() {
                            logger.info('Declared Delayed :', summary);
                            if (callback) {
                                callback(null, {
                                    queue: destination_queue,
                                    exchange: source_exchange
                                });
                            }
                            amqp_connection.removeListener('error', onError);
                            return;
                        });
                    });
                });
            });
        })
    });

}

module.exports = declareDelayedDelivery;
