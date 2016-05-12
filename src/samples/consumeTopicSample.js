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

#! /usr/bin/env node

var eyeosAmqp = require('../index');
var amqpConnectionFactory = eyeosAmqp.amqpConnectionFactory;
var amqpConnectionDisconnector = eyeosAmqp.amqpConnectionDisconnector;
var AMQPDeclarer = eyeosAmqp.AMQPDeclarer;

var processArgv = process.argv.slice(2);

if (processArgv.length < 1) {
    console.log('Usage: consumeTopicSample.js [topicName] [numberOfMessages] [host] [port]');
    console.log('  topicName:       (mandatory) name of the topic to consume.');
    console.log('  numberOfMessages: (optional, default: 1) number of messages to consume.');
    console.log('  host:            (optional, default: localhost) rabbit host.');
    console.log('  port:            (optional, default: 5672) rabbit port.');
    process.exit(1);
}

// parse arguments
var topicName = processArgv[0];
var numberOfMessages = +processArgv[1] || 1;
var host = processArgv[2] || 'localhost';
var port = processArgv[3] || 5672;

console.log('>> Subscribing to receive', numberOfMessages, 'msgs from topic', topicName, 'in', host+':'+port);


function declareAndConsume (error, connection){
    if (error) {
        console.log('Error connecting to ', host+':'+port, error);
        process.exit(5672);
    }

    var declarer = new AMQPDeclarer(connection);

    var queueName = ''+Date.now()+'-'+process.pid;

    declarer.declareQueue(queueName, {exclusive: true}, function(queue) {
        declarer.bindQueueToExchange('amq.topic', queue.name, topicName, function(){
            console.log('>> Declared queue:', queue.name, 'and bounded it to "amq.topic" with routing key:', topicName);
            console.log('>> Subscribed to:', topicName);

            queue.subscribe({prefetchCount: 1}, function (message, headers, deliveryInfo, ack) {
                console.log('>> Got a message with routing key ' + deliveryInfo.routingKey);
                console.log('-- Message:', message.data.toString());
                console.log('-- headers:', headers);
            });
        });

    });

}

amqpConnectionFactory.getInstance({host: host, port: port, heartbeat: 1},  declareAndConsume);
