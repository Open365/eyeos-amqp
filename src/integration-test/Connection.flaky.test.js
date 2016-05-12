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
var RabbitController = require('./RabbitController');

suite('Connection', function() {
    var sut;
    var settings;
    var rabbit;

    setup(function(done) {
        settings = {
            host: 'localhost',
            port: '2222',
            user: 'guest',
            adminPanelPort: '3333',
            stompPort: '4444',
            password: 'guest'
        };

        this.timeout(5000);
        rabbit = new RabbitController();
        rabbit.start(function() {
            sut = new Connection(settings);
            done();
        })
    });

    teardown(function(done) {
        rabbit.stop(done);
    });

    suite('#declareQueue', function() {
        var rabbitUtils, name;
        setup(function() {
            name = 'queueName_'+ uuid.v4();
        });

        test('Should execute the callback with an error when connection is dropped', function(done) {
            sut.connect(function() {
                rabbit.stop(function() {
                    sut.declareQueue(name, {}, function(err) {
                        assert.ok(err);
                        done();
                    });
                });
            });
        });
    });
    suite('#exchangePublish', function(){
        test('Should execute the callback with an error when connection is dropped', function(done) {
            sut.connect(function() {
                rabbit.stop(function() {
                    sut.exchangePublish('queueName', {}, function(err) {
                        assert.ok(err);
                        done();
                    });
                });
            });
        });
    });
});
