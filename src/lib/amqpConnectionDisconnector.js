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

'use stict';
var logger = require('log2out').getLogger('AMQPConnectionDisconnector');


function disconnect(connection){
    var address = connection.socket.address();
    logger.debug('Disconnecting from RabbitMQ:', address);

    connection.setImplOptions({reconnect: false});
    connection.removeAllListeners('error');
    connection.disconnect();
    connection.on('error', function () {
        logger.debug('Disconnected connection for ', address);
    });
}

module.exports.disconnect = disconnect;
