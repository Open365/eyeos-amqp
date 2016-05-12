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

var eyeosAmqp = require('../index');
var amqpConnectionFactory = eyeosAmqp.amqpConnectionFactory;
var amqpConnectionDisconnector = eyeosAmqp.amqpConnectionDisconnector;
var AMQPDeclarer = eyeosAmqp.AMQPDeclarer;

function declareSendAndDisconnect (error, connection){

    var declarationObject = {
        queue: {
            name: "user_kentbeck",
            durable: true,
            exclusive: false,
            autoDelete: false
        },
        bindTo: [
            {
                exchangeName: "user_kentbeck",
                routingKey: '#',
                options: {
                    type: 'topic',
                    durable: true
                }
            },
            {
                exchangeName: "another.exch",
                routingKey: 'user_kentbeck',
                options: {
                    type: 'direct',
                    durable: true
                }
            }
        ]
    };

    var declarer = new AMQPDeclarer(connection);

    declarer.declare(declarationObject, function (err, userQueue){
        userQueue.subscribe(function (message, headers, deliveryInfo, messageObject) {
            console.log('Got a message with routing key ' + deliveryInfo.routingKey, message, headers, messageObject);
            console.log('Disconnecting');
            amqpConnectionDisconnector.disconnect(connection);
        });
    });
}

amqpConnectionFactory.getInstance({host: 'localhost', port: 5672},  declareSendAndDisconnect);

