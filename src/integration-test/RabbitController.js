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

var childProcess = require('child_process');

var RabbitController = function() {
	this.process = null;
};


RabbitController.prototype.start = function(callback) {
	if (this.process) {
		callback();
		return;
	}

	var image = "docker-registry.eyeosbcn.com/rabbitmq-discovery";
	var execCommand = "rabbitmq-server";
	var command = 'run -p 2222:5672 -p 3333:15672 -p 4444:61613 --rm ' + image + ' ' + execCommand;

	this.process = childProcess.spawn('docker', command.split(' '));
	this.process.stdout.on('data', function(data) {
		var str = data.toString();
		if (str.indexOf("plugins started.") != -1) {
			callback();
		}
	});
	this.process.stderr.on('data', function(data) {
		console.error("Error", data.toString());
	});
};

RabbitController.prototype.stop = function (callback) {
	if (!this.process) {
		callback();
		return;
	}

	this.process.on('close', function() {
		callback();
	})
	this.process.kill();
	this.process = null;
};

module.exports = RabbitController;
