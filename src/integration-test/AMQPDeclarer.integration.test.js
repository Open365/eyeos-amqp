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

"use strict";
/**
 * AMQPDeclarer Integration Tests.
 * work in lazy mode:
 * if a rabbitmq is available with default settings in localhost, test is executed.
 * if rabbitmq is not available, test is skipped.
 */

var AMQPDeclarer = require('../lib/AMQPDeclarer');
var RabbitRestApiUtils = require('../lib/RabbitRestApiUtils');

suite('AMQPDeclarer.integration', function(){
    var connectionSettings = {host:'localhost', port: 5672, login:'guest', password:'guest'},
        sut,
        rabbitAvailable = false,
        connection,
        queue,
        rabbitUtils = new RabbitRestApiUtils(connectionSettings.host, 15672, connectionSettings.user, connectionSettings.password);
    var queueName = 'a-queue';
    var exchangeNameSrc = 'a-exchange-src';
    var exchangeNameTgt = 'a-exchange-tgt';
    var options = {durable: false, exclusive: true};

    setup(function(done){
        // initialize connection to local rabbit, if not present, skip the test.
        try {
            connection = require('amqp').createConnection(connectionSettings, {reconnect: false});
            connection.on('ready', function(){
                rabbitAvailable = true;

                sut = new AMQPDeclarer(connection);
                done();
            });
            connection.on('error', function(err){
                console.log('********************* Skipping AMQPDeclarer.integration test due to error: ', err);
                rabbitAvailable = false;
                done();
                return;
            });

        } catch (err){
            console.log('********************* Skipping AMQPDeclarer.integration test due to error CATCHED: ', err);
        }
    });

    suite('#AMQPDeclarer.declareExchange', function(){
        setup(function(done){
            rabbitUtils.deleteExchange(exchangeNameSrc, function(){
                rabbitUtils.deleteExchange(exchangeNameTgt, function(){
                        done();
                });
            });
        });

        test('Should not exist an exchange in a fresh test', function(done){
            if (!rabbitAvailable) {
                console.log('********************* Skipping AMQPDeclarer.integration test due to Rabbit not available. THIS IS NOT AN ERROR.');
                return done();
            }

            rabbitUtils.assertExchangeNotExists(exchangeNameSrc, done);
        });

        test('Should create the exchange', function(done){
            if (!rabbitAvailable) {
                console.log('********************* Skipping AMQPDeclarer.integration test due to Rabbit not available. THIS IS NOT AN ERROR.');
                return done();
            }

            sut.declareExchange(exchangeNameSrc, options);
            rabbitUtils.assertExchangeExists(exchangeNameSrc, done);
        });
    });

    suite('#AMQPDeclarer.declareQueue', function(){
        setup(function(done){
                rabbitUtils.deleteQueue(queueName, function(){
                done();
            });
        });

        test('Should not exist an queue in a fresh test', function(done){
            if (!rabbitAvailable) {
                console.log('********************* Skipping AMQPDeclarer.integration test due to Rabbit not available. THIS IS NOT AN ERROR.');
                return done();
            }

            rabbitUtils.assertQueueNotExists(queueName, done);
        });

        test('Should create the queue', function(done){
            if (!rabbitAvailable) {
                console.log('********************* Skipping AMQPDeclarer.integration test due to Rabbit not available. THIS IS NOT AN ERROR.');
                return done();
            }

            sut.declareQueue(queueName, options);
            rabbitUtils.assertQueueExists(queueName, done);
        });
    });

    suite('#AMQPDeclarer.bindExchangeToExchange', function() {
        setup(function (done) {
            rabbitUtils.deleteExchange(exchangeNameSrc, function(){
                rabbitUtils.deleteExchange(exchangeNameTgt, function(){
                    done();
                });
            });
        });

        test('Should bind exchangeNameSrc and exchangeNameTgt', function (done) {
            if (!rabbitAvailable) {
                console.log('********************* Skipping AMQPDeclarer.integration test due to Rabbit not available. THIS IS NOT AN ERROR.');
                return done();
            }

            sut.declareExchange(exchangeNameSrc, options, function(){
                sut.declareExchange(exchangeNameTgt, options, function(){
                    sut.bindExchangeToExchange(exchangeNameSrc, exchangeNameTgt, 'a-rk', function(){
                        rabbitUtils.assertExchangeExists(exchangeNameSrc, function(){
                            rabbitUtils.assertExchangeExists(exchangeNameTgt, function() {
                                rabbitUtils.assertTwoExchangesBinded(exchangeNameSrc, exchangeNameTgt, done);
                            });
                        });
                    });
                });
            });

        });
    });
});

