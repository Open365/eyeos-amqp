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

var sinon = require('sinon');

var amqpConnectionDisconnector = require('../lib/amqpConnectionDisconnector');

suite('amqpConnectionDisconnector', function () {
    var connectionFake = {exchange: function() {}
        , publish: function() {}
        , disconnect: function() {}
        , setImplOptions: function() {}
        , removeAllListeners: function() {}
        , on: function() {}
        , once: function() {}
        , socket: {address: function(){ return {host: 'rabbit12', port: 5672}}}
    };
    suite('#disconnect', function () {
        var connectionMock,
            expConnectionSetImplOptions,
            expConnectionRemoveAllOnErrorListeners,
            expConnectionDisconnect,
            expConnectionOnError,
            sut;

        setup(function(){
            sut = amqpConnectionDisconnector;
            connectionMock = sinon.mock(connectionFake);
            expConnectionSetImplOptions = connectionMock.expects('setImplOptions').once().withExactArgs(sinon.match({reconnect:false}));
            expConnectionRemoveAllOnErrorListeners = connectionMock.expects('removeAllListeners').once().withExactArgs('error');
            expConnectionDisconnect = connectionMock.expects('disconnect').once().withExactArgs();
            expConnectionOnError = connectionMock.expects('on').once().withExactArgs('error', sinon.match.func);
        });
        teardown(function(){
            connectionMock.restore();
        });
        test('calls connection.setImplOptions with reconnect=false', function () {
            sut.disconnect(connectionFake);
            expConnectionSetImplOptions.verify();
        });
        test('removes connection error listeners', function(){
            sut.disconnect(connectionFake);
            expConnectionRemoveAllOnErrorListeners.verify();
        });
        test('calls connection.disconnect', function(){
            sut.disconnect(connectionFake);
            expConnectionDisconnect.verify();
        });
        test('registers an on error listener for tracing disconnection', function(){
            sut.disconnect(connectionFake);
            expConnectionOnError.verify();
        });
    });
});
