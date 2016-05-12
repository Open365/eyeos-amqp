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
var ExchangeCache = require('../lib/ExchangeCache');

suite('ExchangeCache', function(){
	var sut;

	var options = {foo: 'bar'};
	var alreadyExchange = {foo: 'bar'};
	var newCreatedExchange = {foo: 'newCreated'};
	var defaultExchangeName = '';
	var fakeConn = {
		implOptions: {defaultExchangeName: defaultExchangeName},
		exchange: function(){},
		exchanges: {
			'exchangeName': alreadyExchange
		}
	};
	var fakeConMock;
	var expExchange;
	var callback = function(){};
	setup(function(){
		fakeConMock = sinon.mock(fakeConn);
		expExchange = fakeConMock.expects('exchange').once()
		                                             .withExactArgs(defaultExchangeName, options, callback)
		                                             .returns(newCreatedExchange);
		sut = new ExchangeCache();
	});

	teardown(function() {
		fakeConMock.restore();
	});

	suite('#getExchange', function(){
		test('We should call conn.exchange with name, options and callback forwarded', function(){
			sut.getExchange(fakeConn, undefined, options, callback);
			expExchange.verify();
		});
		test('The exchange created by calling conn.exchange should be returned', function () {
			var exchange = sut.getExchange(fakeConn, undefined, options, callback);
			assert.equal(exchange, newCreatedExchange);
		});
		test('If an exchagne already exists, it should be returned instead', function () {
			var exchange = sut.getExchange(fakeConn, 'exchangeName', options, callback);
			assert.equal(exchange, alreadyExchange);
		});
	});
});