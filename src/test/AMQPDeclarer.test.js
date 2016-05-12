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

var AMQPDeclarer = require('../lib/AMQPDeclarer');

suite('AMQPDeclarer', function(){

    var sut,
        fakeConnection, fakeTargetExchange, fakeTargetExchangeMock, fakeTargetQueue,
        sourceExchangeName = 'src-exch',
        targetExchangeName = 'tgt-exch',
        queueName = 'q-name',
        queueOptions = {durable: true, autoDelete: false},
        routingKey = 'rk',
        targetExchangeOptions = {durable: true, type: 'topic'},
        cb;

    setup(function(){
        cb = sinon.spy();
        fakeTargetExchange = {
            bind: sinon.spy(),
            close: sinon.spy()
        };
        fakeTargetQueue = {
            bind: sinon.spy(function(){this.listeners.forEach(function(cb){cb()})}),
            listeners: [],
            on: function(event, cb) {this.listeners.push(cb)}
        };
        fakeTargetExchangeMock = sinon.mock(fakeTargetExchange);
        function fakeExchangeFunc(ten, teo, cb){
            cb(fakeTargetExchange);
            return fakeTargetExchange;
        }
        fakeConnection = {
            exchange: sinon.spy(fakeExchangeFunc),
            queue: sinon.stub().yields(fakeTargetQueue)
        };

        sut = new AMQPDeclarer(fakeConnection);
    });

    teardown(function() {
    });

    suite('#declareQueue', function(){
        test('Should call connection.queue', function(){
            sut.declareQueue(queueName, queueOptions, cb);

            sinon.assert.calledOnce(fakeConnection.queue);
            sinon.assert.calledWith(fakeConnection.queue, queueName, queueOptions, cb);
        });
    });

    suite('#declareExchange', function(){
        test('Should call connection.exchange', function(){
            sut.declareExchange(targetExchangeName, targetExchangeOptions, cb);

            sinon.assert.calledOnce(fakeConnection.exchange);
            sinon.assert.calledWithExactly(fakeConnection.exchange, targetExchangeName, targetExchangeOptions, cb);
        });

    });

    suite('#bindExchangeToExchange', function(){
        test('Should call connection.exchange on the targetExchange', function(){
            sut.bindExchangeToExchange(sourceExchangeName, targetExchangeName, routingKey);

            sinon.assert.calledOnce(fakeConnection.exchange);
            sinon.assert.calledWith(fakeConnection.exchange, targetExchangeName);
        });

        test('Should call exchange.bind on the targetExchange', function(){

            sut.bindExchangeToExchange(sourceExchangeName, targetExchangeName, routingKey);

            sinon.assert.calledOnce(fakeTargetExchange.bind);
            sinon.assert.calledWithExactly(fakeTargetExchange.bind, sourceExchangeName, routingKey, undefined);
        });

        test('Should just bind, not declare unexisting exchanges (options = {passive: true})', function(){
            sut.bindExchangeToExchange(sourceExchangeName, targetExchangeName, routingKey);

            sinon.assert.calledOnce(fakeConnection.exchange);
            sinon.assert.calledWith(fakeConnection.exchange, targetExchangeName, {passive: true});
        });
    });

    suite('#declare', function(){
        var declarationObject;
        var minimumDeclarationObject;

        setup(function(){

            minimumDeclarationObject = {
                queue: {
                    name: 'aqueue'
                }
            };

            declarationObject = {
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
                    }
                ]
            };

        });

        test('Should call validateDeclaration', function(){
            sinon.spy(sut, 'validateDeclaration');

            sut.declare(minimumDeclarationObject, cb);

            sinon.assert.calledOnce(sut.validateDeclaration);
            sinon.assert.calledWithExactly(sut.validateDeclaration, minimumDeclarationObject);
        });

        test('Should callback when receives the minimum declarationObject', function(){
            sut.declare(minimumDeclarationObject, cb);

            sinon.assert.calledOnce(fakeConnection.queue);
            sinon.assert.calledWithExactly(fakeConnection.queue, minimumDeclarationObject.queue.name, minimumDeclarationObject.queue, sinon.match.func);
            sinon.assert.calledOnce(cb);
        });

        test('Should callback when receives a correct object specifying what to declare and callback', function(){
            sut.declare(declarationObject, cb);

            sinon.assert.calledOnce(cb);
        });

        test('Should callback once even when there are more than one exchange to bindTo', function(){
            declarationObject.bindTo.push(
                {exchangeName: "another-exchange", routingKey: '#', options: {type: 'topic',durable: true}
            });

            declarationObject.bindTo.push(
                {exchangeName: "last-one", routingKey: '#', options: {type: 'topic',durable: true}
            });

            sut.declare(declarationObject, cb);

            sinon.assert.calledOnce(cb);
        });

        test('Should declare queue using declarationObject.queue', function(){
            sut.declare(minimumDeclarationObject, cb);

            sinon.assert.calledOnce(fakeConnection.queue);
            sinon.assert.calledWith(fakeConnection.queue, minimumDeclarationObject.queue.name, minimumDeclarationObject.queue);
        });

        test('Should declare exchange using declarationObject.bindTo[].exchangeName', function(){
            var exchangeDeclaration1 = declarationObject.bindTo[0];

            sut.declare(declarationObject, cb);

            sinon.assert.calledOnce(fakeConnection.exchange);
            sinon.assert.calledWith(fakeConnection.exchange, exchangeDeclaration1.exchangeName, exchangeDeclaration1.options);
        });

        test('Should declare exchanges for all in declarationObject.bindTo', function(){
            var exchangeDeclaration1 = declarationObject.bindTo[0];
            var exchangeDeclaration2 = {exchangeName: "another-exchange", routingKey: '#', options: {type: 'topic',durable: true}};
            var exchangeDeclaration3 = {exchangeName: "last-one", routingKey: '#', options: {type: 'topic',durable: true}};


            declarationObject.bindTo.push(exchangeDeclaration2);
            declarationObject.bindTo.push(exchangeDeclaration3);

            sut.declare(declarationObject, cb);

            sinon.assert.calledThrice(fakeConnection.exchange);
            sinon.assert.calledWith(fakeConnection.exchange, exchangeDeclaration1.exchangeName, exchangeDeclaration1.options);
            sinon.assert.calledWith(fakeConnection.exchange, exchangeDeclaration2.exchangeName, exchangeDeclaration2.options);
            sinon.assert.calledWith(fakeConnection.exchange, exchangeDeclaration3.exchangeName, exchangeDeclaration3.options);
        });

        test('Should bind the queue to all exchanges in declarationObject.bindTo', function(){
            var exchangeDeclaration1 = declarationObject.bindTo[0];
            var exchangeDeclaration2 = {exchangeName: "another-exchange", routingKey: '#', options: {type: 'topic',durable: true}};
            var exchangeDeclaration3 = {exchangeName: "last-one", routingKey: '#', options: {type: 'topic',durable: true}};

            declarationObject.bindTo.push(exchangeDeclaration2);
            declarationObject.bindTo.push(exchangeDeclaration3);

            sut.declare(declarationObject, cb);

            sinon.assert.calledThrice(fakeTargetQueue.bind);
            sinon.assert.calledWithExactly(fakeTargetQueue.bind, exchangeDeclaration1.exchangeName, exchangeDeclaration1.routingKey);
            sinon.assert.calledWithExactly(fakeTargetQueue.bind, exchangeDeclaration2.exchangeName, exchangeDeclaration2.routingKey);
            sinon.assert.calledWithExactly(fakeTargetQueue.bind, exchangeDeclaration3.exchangeName, exchangeDeclaration3.routingKey);
        });

        suite('#validateDeclaration', function(){

            test('Should validate (not throw) when receives the minimum declarationObject', function(){
                var wrongDeclareCall = sut.validateDeclaration.bind(sut, minimumDeclarationObject, cb);

                assert.doesNotThrow(wrongDeclareCall, Error);
            });

            test('Should validate (not throw) when receives a declarationObject with queue.name and one exchangeName', function(){
                minimumDeclarationObject.bindTo = [{exchangeName: 'pepe'}];
                var wrongDeclareCall = sut.validateDeclaration.bind(sut, minimumDeclarationObject, cb);

                assert.doesNotThrow(wrongDeclareCall, Error);
            });

            test('Should validate (not throw) when receives a complete declaration object', function(){
                var wrongDeclareCall = sut.validateDeclaration.bind(sut, declarationObject, cb);

                assert.doesNotThrow(wrongDeclareCall, Error);
            });

            test('Should throw error when declarationObject is not an object', function(){
                var wrongDeclareCall = sut.validateDeclaration.bind(sut, 'invalid.declarationobject', cb);

                assert.throws(wrongDeclareCall, Error);
            });

            test('Should throw error when declarationObject does not contain queue object', function(){
                var wrongDeclareCall = sut.validateDeclaration.bind(sut, {}, cb);

                assert.throws(wrongDeclareCall, Error);
            });

            test('Should throw error when declarationObject is null', function(){
                var wrongDeclareCall = sut.validateDeclaration.bind(sut, null, cb);

                assert.throws(wrongDeclareCall, "Wrong declaration object:");
            });

            test('Should throw error when declarationObject does not contain queue object with name', function(){
                var wrongDeclareCall = sut.validateDeclaration.bind(sut, {queue:{}}, cb);

                assert.throws(wrongDeclareCall, "Wrong declaration object:");
            });

            test('Should throw error when declarationObject.bindTo is set, but not an Array', function(){
                minimumDeclarationObject.bindTo = 'invalid';
                var wrongDeclareCall = sut.validateDeclaration.bind(sut, minimumDeclarationObject, cb);
                assert.throws(wrongDeclareCall, "object.bindTo");
            });

            test('Should throw error when declarationObject.bindTo is set, but not an Array', function(){
                minimumDeclarationObject.bindTo = {};
                var wrongDeclareCall = sut.validateDeclaration.bind(sut, minimumDeclarationObject, cb);
                assert.throws(wrongDeclareCall, "object.bindTo");
            });

            test('Should throw error when exchange declaration in bindTo has no exchangeName field', function(){
                minimumDeclarationObject.bindTo = [{}];
                var wrongDeclareCall = sut.validateDeclaration.bind(sut, minimumDeclarationObject, cb);
                assert.throws(wrongDeclareCall, "invalid exchange declaration");
            });

            test('Should throw error when receives one exchange in bindTo is not correct', function(){
                minimumDeclarationObject.bindTo = [{exchangeName: 'pepe'}, {}];
                var wrongDeclareCall = sut.validateDeclaration.bind(sut, minimumDeclarationObject, cb);

                assert.throws(wrongDeclareCall, "invalid exchange declaration");
            });
        });

    });
});
