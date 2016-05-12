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

var sinon = require('sinon');
var assert = require('chai').assert;
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Connection = require('../lib/Connection');

suite('Connection', function(){
    var sut, conn;
    setup(function(){
        var Conn = function(){};
        util.inherits(Conn, EventEmitter);
        var amqp = {createConnection: function(){}};
        sinon.stub(amqp, "createConnection");
        conn = new Conn();
        amqp.createConnection.returns(conn);

        var settings, defaultSettings = {};
        sut = new Connection(settings, defaultSettings, amqp);
    });

    function avoidNodeErrorBubble(obj) {
        obj.on('error', function(){});
    }

    suite('#connect', function(){
        var spy;
        setup(function() {
            spy = sinon.spy();
            sut.connect(spy);
            avoidNodeErrorBubble(conn);
        });
        test('Should execute the callback only once even multiple errors are emitted', function(done){
            conn.emit('error', "some error");
            conn.emit('error', "some other error");

            //Wait for the next loop to assert if our spy has been called or not
            setTimeout(function(){
                sinon.assert.calledOnce(spy);
                done();
            }, 0);
        });

        test('Should execute the callback only once even when an error is emitted after ready', function(done){
            conn.emit('ready');
            conn.emit('error', "some other error");

            //Wait for the next loop to assert if our spy has been called or not
            setTimeout(function(){
                sinon.assert.calledOnce(spy);
                done();
            }, 0);
        });
    });

    suite('#declareQueue', function() {
        test('Should fail if options are invalid', function(done) {
            var strangeOptions = {
                'foo': 'bar'
            };

            sut.conn = {
                on: sinon.stub(),
                queue: sinon.stub()
            };

            sut.declareQueue(sut, strangeOptions, function(err) {
                assert.equal(err.type, 'InvalidArgumentError');
                done();
            });
        });

    });
});
