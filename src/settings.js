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

var settings = {
	port: process.env.HTTP_TO_BUS_AMQP_PORT || 5672,
	host: process.env.HTTP_TO_BUS_AMQP_HOST || "rabbit.service.consul",
	login: process.env.EYEOS_BUS_MASTER_USER || "guest",
	password: process.env.EYEOS_BUS_MASTER_PASSWD || "guest",
	defaultConnectionSettings: {
		heartbeat: +process.env.EYEOS_AMQP_HEARTBEAT || 5 //5 secs, set to 0 to disable it.
	}
};

module.exports = settings;
