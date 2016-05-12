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
var amqp = require('amqp');
var ConnectionCache = require('../lib/ConnectionCache');

suite('ConnectionCache', function(){
	var sut;

	var amqpMock;
	var expCreateConnection;

	var settings = {
		host: '127.0.0.1',
		port: 9000
	};
	var conn = {myConnection: true};

	setup(function(){
		amqpMock = sinon.mock(amqp);
		expCreateConnection = amqpMock.expects('createConnection').once().withExactArgs(settings).returns(conn);
		sut = new ConnectionCache(amqp);
	});

	teardown(function(){
		amqpMock.restore();
	});

	suite('#getConnection', function(){
		test('We should call this.conn.createConnection with settings as a param', function(){
			sut.getConnection(settings);
			expCreateConnection.verify();
		});
		test('getConnection should always return a connection, stored or new', function () {
			var newConn = sut.getConnection(settings);
			assert.equal(conn.myConnection, newConn.myConnection);
		});
		test('Should NOT create a new connection since it should be cached', function () {
			expCreateConnection.never();
			var key = settings.host + ':' + settings.port;
			sut.connections[key] = conn;
			sut.getConnection(settings);
			expCreateConnection.verify();
		});
	});
});