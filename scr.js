var adm = require("adm-zip");
var fs = require("fs");
var fse = require("fs-extra");
var WebSocket = require("ws");
var archiver = require("archiver");

var args = process.argv.splice(2);
var linesToClear = 0;
var optionPair = [];

args.forEach((c, i) => {
	if (c[0].startsWith("-")) {
		c = c.split("-")[c.split("-").length - 1];
		optionPair.push([c, args[i + 1] || ""]);
	}
});

console.log = function (...txt) {
	var t = txt.join(" ") + "\n"
	process.stdout.write(t)
	linesToClear += (t.match("\\n") ? t.match("\\n").length : 0) || 0;
}

console.scr = {};

console.scr.install = function (...txt) {
	console.log(...txt.map(x => "\x1b[1m\x1b[43mINSTALL\x1b[0m " + x));
}
console.scr.uninstall = function (...txt) {
	console.log(...txt.map(x => "\x1b[42m\x1b[1mUNINSTALL\x1b[0m " + x));
}
console.scr.error = function (...txt) {
	clear();
	
	console.log(...txt.map(x => "\x1b[41mERROR\x1b[0m " + x));
	
	process.exit();
}

function clear() {
	for (let i = 0;i < linesToClear + 1; i++) {
		process.stdout.moveCursor(0, -1);
		process.stdout.clearLine();
	}
	
	linesToClear = 0;
}

if (args[0] == "install") {
	var install = {
		"user": args[1].split("/")[0],
		"file": args[1].split("/")[1]
	}
	
	console.scr.install("Retreiving server default settings..");
	
	// Get default server.
	fs.readFile(`${__dirname}\\default.json`, (err, def) => {
		err && console.scr.error(err);
		
		var data = JSON.parse(def).server;
		console.scr.install("--");
		console.scr.install(`"server":"${data.main}"`);
		console.scr.install(`"path":"${data.path}"`);
		console.scr.install("--\n");
		
		console.scr.install(`Creating WebSocket connection..`);
		var ws = new WebSocket(`ws://${data.main + data.path}`);
				
		ws.on("open", () => {
			console.scr.install("Opened websocket at " + `ws://${data.main + data.path}`.toLowerCase());
			
			linesToClear++;
			console.log("");
			
			console.scr.install("Beginning file transfer...");
			
			ws.send(JSON.stringify({
				op: 1,
				user: install.user,
				file: install.file
			}));
		});
		
		ws.on("message", function onmessageWS(dat) {
			var d = JSON.parse(dat);
			ws.close();
			
			var fileTransfer = new WebSocket(`ws://${data.main + data.path}${d.path}`);
			
			fileTransfer.on("open", () => {
				console.scr.install("Opened websocket at " + `ws://${data.main + data.path}${d.path}`);
				console.scr.install("Getting file names..");
				fileTransfer.send(JSON.stringify({op: 3}));
			});
			
			fileTransfer.on("message", message => {
				var message_data = JSON.parse(message);
				
				if (message_data.op == 4) {
					console.scr.install("Got file names");
					console.scr.install("--");
					console.scr.install(`"files": [${message_data.files.join(",")}]`);
					console.scr.install("--");
					linesToClear++;
					console.log("");
					console.scr.install("Making file directory..");
					
					fs.mkdir(`${__dirname}/${install.file}`, (err) => {
						if (err) {
							if (err.toString().indexOf("EEXIST")+1) {
								console.scr.error("File already exists, use uninstall to uninstall file, then run this command again");
							}
							
							return;
						}
						
						console.scr.install("Made file directory");
						
						console.scr.install("Requesting and writing file contents..");
						
						function oM(messag) {
							var message_dat = JSON.parse(messag);
								
							if (message_dat.op == 6) {
								fse.outputFile(`${__dirname}/${install.file}/${ message_dat.filenm}`, message_dat.file, (er) => {
									if (er) return console.scr.error(er);
									
									load(message_data.files[message_dat.carry_data.i + 1], message_dat.carry_data.i + 1);
								});
							}
						}
						
						function load(file, i) {
							if (i < message_data.files.length) {
								process.stdout.moveCursor(0, -1);
								process.stdout.clearLine();
								linesToClear--;
								
								console.scr.install(`Requesting and writing file contents.. [${i}] ${file}`);
								
								fileTransfer.send(JSON.stringify({
									op: 5,
									file: file,
									carry_data: {
										i: i
									}
								}));
								
								fileTransfer.removeListener("message", onmessageWS);
								fileTransfer.removeListener("message", oM);
								
								fileTransfer.on("message", oM);
							} else {
								process.stdout.moveCursor(0, -1);
								process.stdout.clearLine();
								linesToClear--;
								console.scr.install(`Requested all file contents`);
								console.scr.install(`All files written`);
								console.scr.install(`Compressing and zipping files..`);
								
								var out = fs.createWriteStream(`${__dirname}/${install.file}/${install.file}.zip`);
								var archive = archiver("zip", {
									gzip: true,
									zlip: { level: 9 }
								});
								
								out.on("error", function (err) {
									console.log(err);
								});
								
								out.on("close", function (err) {
									console.scr.install("Completed and successfully installed " + install.user + "/" + install.file);
									
									var iee = 0;
									
									function ie(a) {
										if (a == message_data.files.length) {
											fs.rename(`${__dirname}/${install.file}/${install.file}.zip`, `${__dirname}/${install.file}/${install.file}.sb3`, function(err) {
												if ( err ) console.log('ERROR: ' + err);
											});
										}
									}
									
									for (let i = 0;i < message_data.files.length; i++) {
										function doClose(f) {
											fs.unlink(install.file + "/" + f.split("/")[0], (error) => {
												if (error && error.toString().indexOf("ENOENT")+1) {
													doClose(f);
												} else {
													iee ++;
													
													ie(iee);
												}
											});
										}
										
										doClose(message_data.files[i]);
									}
								});
								
								archive.pipe(out);
								
								for (let i = 0;i < message_data.files.length; i++) {
									archive.append(message_data.files[i], {name: message_data.files[i].split("/")[message_data.files[i].split("/").length - 1]});
								}
								
								archive.finalize();
							}
						}
						
						load(message_data.files[0], 0);
					});
				}
			});
		});
		ws.on("error", e => {
			if (e.toString().indexOf("ECONNREFUSED") + 1) {
				console.scr.error("Error connecting to server. Make sure the server is open and you have a stable internet connection");
			} else {
				console.scr.error(e);
			}
		});
	});
}

var deleteFolderRecursive = function(path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function(file, index){
			var curPath = path + "/" + file;
			if (fs.lstatSync(curPath).isDirectory()) {
				deleteFolderRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};

if (args[0] == "uninstall") {
	deleteFolderRecursive(__dirname + "/" + args[1]);
	
	console.scr.uninstall("Successfully Uninstalled " + args[1]);
}

if (args[0] == "open") {
	require("child_process").exec('scr-open ' + args[1]);
}