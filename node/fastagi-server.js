const net = require('net');
const carrier = require('./lib/carrier.js');
const AGI = require('./lib/AGI.js');

process.env.ASTAGIDIR = process.env.ASTAGIDIR ? process.env.ASTAGIDIR : '/var/lib/asterisk/agi-bin';

process.chdir(process.env.ASTAGIDIR);

const server = net.createServer((sock) => {
	let init = false;
	let settings = {};
	let agi = null;
	let port = sock.remotePort;
	console.log(`[${port}] Asterisk connection opened`);

	carrier.carry(sock, function(line) {
		if(!line.length) { //line is blank (technically two newlines)
			init = true;
			settings.agi_ASTAGIDIR = process.env.ASTAGIDIR;
			settings.agi_port = port;
			agi = new AGI(settings);
			agi.on('exit',(code, signal) => {
				sock.end();
			})
			agi.on('data',(data) => {
				sock.write(data.toString('utf8'));
			})
			return;
		}
		if(!init) {
			let s = line.split(":").map((item) => {
				return item.trim();
			});
			settings[s[0]] = s[1];
		} else {
			agi.scriptStdin(line)
		}
	});
	sock.on('close', () => {
		agi = null
		delete(agi)
		console.log(`[${port}] Asterisk connection closed`);
	});
	sock.on('error', (err) => {
		console.log(`[${port}] Asterisk connection error: ${err.message}`);
	});
});

server.listen(4573, 'localhost');
console.log(`FastAGI Server is ready to process calls`);