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

var uuid = require('uuid');
var sinon = require('sinon');
var assert = require('chai').assert;
var Connection = require('../lib/Connection');
var RabbitRestApiUtils = require('../lib/RabbitRestApiUtils');
var RabbitController = require('./RabbitController');

suite('Connection', function() {
    var sut;
    var settings;
    var rabbit;

    setup(function() {
        settings = {
            host: 'localhost',
            port: '2222',
            user: 'guest',
            adminPanelPort: '3333',
            stompPort: '4444',
            password: 'guest'
        };

        sut = new Connection(settings);
    });

    suiteSetup(function(done) {
        this.timeout(5000);

        rabbit = new RabbitController();
        rabbit.start(function() {
            console.log("Rabbit Started");
            done();
        });
    });
    suiteTeardown(function(done) {
        rabbit.stop(done);
    });

    suite('#connect', function() {
        test('Should execute callback with an error when fails to connect', function(done) {
            sut.settings.host = 'some host';

            sut.connect(function(err) {
                assert.ok(err, "An error should be passed");
                done();
            });
        });
        test('Sould pass no error when connection works', function(done) {
            sut.connect(function(err) {
                assert.notOk(err);
                done();
            });
        });
    });
    suite('#Constructor', function(){
        var expectedSettings, defaultSettings, settings;
        setup(function() {
            settings = {
                foo: 'bar',
                heartbeat: 10,
                reconnect: true
            };
            defaultSettings = {
                heartbeat: 5,
                reconnect: false,
                appName: 'someappname'
            };
            expectedSettings = {
                foo: 'bar',
                appName: defaultSettings.appName,
                heartbeat: settings.heartbeat,
                reconnect: settings.reconnect
            };

            sut = new Connection(settings, defaultSettings);
        });
        test('Should merge settings with default settings, given settings should have precedence', function(){
            assert.deepEqual(sut.settings, expectedSettings);
        });
    });

    suite('#declareQueue', function() {
        var rabbitUtils, name;
        setup(function() {
            name = 'queueName_'+ uuid.v4();
            rabbitUtils = new RabbitRestApiUtils(settings.host,
                                                 settings.adminPanelPort,
                                                 settings.user,
                                                 settings.password);
        });

        test('Should execute callback with error when not connected', function (done) {
            sut.declareQueue(name, {}, function(err) {
                assert.ok(err);
                done();
            });
        });

        test('A queue with given name should be declared', function(done) {
            sut.connect(function() {
                sut.declareQueue(name, {}, function() {
                    rabbitUtils.assertQueueExists(name, done);
                });
            });
        });
        test('Should declare the queue with given name and options', function (done) {
            var options = {durable: true};
            sut.connect(function() {
                sut.declareQueue(name, options, function() {
                    rabbitUtils.assertQueueExistsWithOptions(name, options, done);
                });
            });
        });
        test('Should execute the callback passing an error when Queue can not be declared', function(done) {
            sut.connect(function() {
                sut.declareQueue(name, {durable: true}, function(err) {
                    sut.declareQueue(name, {durable: false}, function(err) {
                        assert.equal(err.name, 'InvalidArgumentError');
                        done();
                    });
                });
            });
        });
    });
    suite('#exchangePublish', function(){
        test('Should execute callback with error when not connected', function (done) {
            sut.exchangePublish('not important', 'this neither', function(err) {
                assert.ok(err, 'error should be passed since no connection is stablished');
                done();
            });
        });
        test('Should execute callback with error if message can not be routed', function(done){
            sut.connect(function() {
                sut.exchangePublish('not existing queue', 'Some message', function(err) {
                    assert.ok(err, 'error should be passed since the message can not be routed');
                    done();
                });
            });
        });
        test('Should execute callback without error if message can be routed', function(done){
            sut.connect(function() {
                var queueName = 'exchangeSuccessQueue';
                sut.declareQueue(queueName, {}, function() {
                    sut.exchangePublish(queueName, 'Some message', function(err) {
                        assert.notOk(err, 'No error should be passed since everything went nice');
                        done();
                    });
                });
            });
        });
        test('Should put the message in the queue queue when it can be routed', function(done){
            process.env.BUS_EXPECTATION_PORT = settings.stompPort;
            process.env.BUS_EXPECTATION_HOST = settings.host;
            var BusSpy = require('bus-expectation').BusSpy;

            var msg = 'Fake Message';
            sut.connect(function() {
                var queueName = 'poop';
                sut.declareQueue(queueName, {}, function() {
                    sut.exchangePublish(queueName, JSON.stringify(msg), function(err) {
                    });
                });
            });

            var spy = BusSpy();
            spy.onDestination('/queue/poop')
                .exercise(function(done) { done(); })
                .expectPredicate(function(receivedMsg) {
                    return JSON.parse(receivedMsg.body) == msg;
                })
                .done(done);
		});
	});
	suite('#disconnect', function() {
		test('Should disconnect after calling disconnect', function(done) {
			sut.connect(function() {
				sut.disconnect(function(err) {
					done(err);
				});
			});
		});
	});
});
