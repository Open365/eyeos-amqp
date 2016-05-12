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
var assert = require('chai').assert;

suite('amqpConnectionFactory', function() {

    var sut,
        connectionSettings,
        amqpFake,
        connectionFake,
        fakeTargetExchange,
        amqpConnectionFactory;

    setup(function () {
        fakeTargetExchange = {publish: "some func"};
        connectionFake = {
            exchange: function (ten, teo, cb) {
                if (cb) {
                    cb(fakeTargetExchange);
                }
                return fakeTargetExchange;
            },
            queue: function () {
            },
            on: function (event, cb) {
                if(event === 'ready') {
                    console.log('connectionFake.on');
                    cb(null, connectionFake);
                }
            },
            once: function (event, cb) {
                if (event === 'ready') {
                    cb(null, connectionFake);
                }
            },
            removeListener: function () {}
        };
        connectionSettings = {host: 'localhost', port: 5672, defaultExchange: {confirm: true}};

        amqpFake = {createConnection: function (settings) {
            console.log('amqpFake.createConnection');
            return connectionFake;
        }};

        amqpConnectionFactory = require('../lib/amqpConnectionFactory');

        sut = amqpConnectionFactory;
    });

    teardown(function () {
        //someStaticMockOrStub.restore();
    });

    suite('#getInstance', function () {
        test('Should return always the same instance', function (done) {

            sut.getInstance(connectionSettings, function(err, conn1){
                sut.getInstance(connectionSettings, function(err, conn2){
                    sut.getInstance(connectionSettings, function(err, conn3){
                        assert.deepEqual(conn1, conn2);
                        assert.deepEqual(conn1, conn3);
                        done();
                    }, null, amqpFake);
                }, null, amqpFake);
            }, null, amqpFake);
        });

        test('We should overwrite default exchange if settings.defaultExchange is not falsy #VDI-2899', function (done) {
            sut.getInstance(connectionSettings, function(err, conn1){
                console.log(conn1);
                assert.deepEqual(conn1._defaultExchange, fakeTargetExchange);
                done();
            });
        });

        test('Brand new amqpConnectionFactory should call only once amqp.createConnection', function (done) {

            amqpConnectionFactory.reset();

            var expCreateConnectionOnce = sinon.mock(amqpFake)
                                                .expects('createConnection')
                                                .once()
                                                .withExactArgs(sinon.match(connectionSettings))
                                                .returns(connectionFake);
                                    
            
            sut.getInstance(connectionSettings, function(conn1){
                sut.getInstance(connectionSettings, function(conn2){
                    sut.getInstance(connectionSettings, function(conn3){
                        expCreateConnectionOnce.verify();
                        done();
                    },null, amqpFake);
                },null, amqpFake);
            },null, amqpFake);
        });

        test('Should call amqp.createConnection with correct params', function(done){
            sut.reset();
            var expCreateConnection = sinon.mock(amqpFake)
                                                .expects('createConnection')
                                                .once()
                                                .withExactArgs(sinon.match(connectionSettings))
                                                .returns(connectionFake);

            sut.getInstance(connectionSettings, function(connection){
                expCreateConnection.verify();
                done();
            }, null, amqpFake);
        });


        //heartbeat has been hardcoded for now, test no longer valid
        test.skip('Should call amqp.createConnection with heartbeat set, when default settings have it', function(done){
            var defaultConnectionSettings = require('../settings').defaultConnectionSettings;

            assert.property(defaultConnectionSettings, 'heartbeat');

            sut.reset();
            var expCreateConnection = sinon.mock(amqpFake)
                .expects('createConnection')
                .once()
                .withExactArgs(sinon.match(defaultConnectionSettings))
                .returns(connectionFake);

            sut.getInstance(connectionSettings, function(connection){
                expCreateConnection.verify();
                done();
            }, null, amqpFake);
        });
    });

    suite('#preprocessSettings', function () {
        test('Should apply default heartbeat settings if not specified by client', function () {
            var defaultConnectionSettings = {heartbeat: 25};
            connectionSettings = {host: 'localhost', port: 5672};

            assert.notProperty(connectionSettings, 'heartbeat');

            var processedSettings = sut.preprocessSettings(connectionSettings, defaultConnectionSettings);


            assert.equal(processedSettings.heartbeat, 25);
            assert.equal(processedSettings.host, 'localhost');
            assert.equal(processedSettings.port, 5672);
        });

        test("Should settings from client must override default's", function () {
            var defaultConnectionSettings = {host: 'should be overriden', heartbeat: 25};
            connectionSettings = {host: 'localhost', port: 5672};

            var processedSettings = sut.preprocessSettings(connectionSettings, defaultConnectionSettings);

            assert.equal(processedSettings.host, 'localhost');
        });
    });
});

