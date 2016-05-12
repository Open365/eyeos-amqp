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

var Message = require('../lib/Message');
var Connection = require('../lib/Connection');

suite('Message', function() {
	var sut;

	suite('#send.validation', function() {
		test('Should fail to send if missing queue', function(done) {
			sut = new Message();
			sut.send(function(err) {
				assert.equal(err.name, "InvalidArgumentError");
				assert.equal(err.propertyName, "queue");
				done();
			});
		});

		test('Should fail to send if missing queue name', function(done) {
			sut = new Message({});
			sut.send(function(err) {
				assert.equal(err.name, "InvalidArgumentError");
				assert.equal(err.propertyName, "queue");
				done();
			});
		});

		test('Should fail to send if missing payload', function(done) {
			sut = new Message("destinationQueue");
			sut.send(function(err) {
				assert.equal(err.name, "InvalidArgumentError");
				assert.equal(err.propertyName, "payload");
				done();
			});
		});
	});

	suite('#send', function() {
		var payload;
		var connection;

		setup(function() {
			connection = sinon.stub(new Connection());
			connection.connect.callsArg(0);
			connection.disconnect.callsArg(0);
			connection.declareQueue.callsArg(2);
			connection.exchangePublish.callsArg(2);

			payload = "PayLoad-Data";
			sut = new Message('dest', payload, null, connection);
		});

		test('Should fail to send if connection fails', function(done) {
			connection.connect = sinon.stub();
			connection.connect.callsArgWith(0, new Error("Fake Error"));
			sut.send(function(err) {
				assert.equal(err.name, "ConnectionError");
				done();
			});
		});

		test('Should declare the queue with the correct name', function(done) {
			sut.send(function() {
				sinon.assert.calledWith(connection.declareQueue, 'dest');
				done();
			});
		});

		test('Should declare the queue with the default options', function(done) {
			var defaultOptions = {
				durable: true,
				autoDelete: false
			};

			sut.send(function() {
				sinon.assert.calledWith(connection.declareQueue, 'dest', defaultOptions);
				done();
			});
		});

		test('Should send the payload to the correct queue', function(done) {
			sut.send(function() {
				sinon.assert.calledWith(connection.exchangePublish, 'dest', payload);
				done();
			});
		});
	});
});
