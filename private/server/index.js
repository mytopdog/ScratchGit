var WebSocket = require("ws");
var readLine = require("readline");
var fs = require("fs");
var user_dir = "../users/";
var http = require("http");
var unzip = require("unzip");
var url = require("url");

/* OPCODES
 * 1: Create websocket file transfer {name, file}
 * 2: Websocket file transfer path {path}
 * 3: File name requests {}
 * 4: File names {files}
 * 5: File request {file}
 * 6: File data {filedata}
 * 7: Request Extra info {info}
 * 8: Send extra info {info}
 * 9: Loading {for}
*/

var rl = readLine.createInterface({
	input: process.stdin,
	output: process.stdout
});

var _G = {};
var paths = [];

// fs.readdirSync(user_dir + d.user + "/projects/" + d.file)

rl.question("Port? ", (answer) => {
	process.stdout.write("\x1b[0m");
	var port = answer;
	
	process.stdout.moveCursor(0, -1);
	process.stdout.clearLine();
	rl.close();
	
	var server = http.createServer((req, res) => {
		res.end("ok")
	});
	
	_G["/"] = new WebSocket.Server({noServer: true});
	
	var ws = _G["/"];
	
	paths.push("/");
	
	ws.on("connection", (socket, req) => {
		var ip = req.connection.remoteAddress;
		socket.id = Math.floor(Math.random() * 1000);
		
		socket.on("message", data => {
			var d = JSON.parse(data);
			
			if (d.op == 1) {
				var id = Math.random().toString(36).substr(7);
				paths.push("/" + id);
				
				_G["/" + id] = new WebSocket.Server({noServer: true});
				
				_G["/" + id].on("connection", s => {
					s.files = [];
					s.fileData = [];
					
					s.on("message", s_data => {
						var s_d = JSON.parse(s_data);
						
						if (s_d.op == 3) {
							fs.createReadStream(user_dir + d.user + "/projects/" + d.file + "/" + d.file + ".sb3")
								.pipe(unzip.Parse())
								.on("entry", function(entry) {
									var chunks = [];
									var res;
									
									entry.on('data', function(data) {
										chunks.push(data.toString());
									});
									entry.on('end', function () {
										res = chunks.join("");
										
										s.files.push(entry.path);
										s.fileData[entry.path] = res;
									});
								})
								.on("error", console.log)
								.on("close", () => {
									s.send(JSON.stringify({
										op: 4,
										files: s.files
									}));
								});
						}
						
						if (s_d.op == 5) {
							s.send(JSON.stringify({
								op: 6,
								file: s.fileData[s_d.file],
								filenm: s_d.file,
								carry_data: s_d.carry_data
							}));
						}
					});
				});
				
				socket.send(JSON.stringify({
					op: 2,
					path: id
				}))
			}
		});
	});
	
	server.listen(port, function () {
		console.log("Listening on port *:" + port);
	});
	
	server.on("upgrade", (req, s, h) => {
		const pathname = url.parse(req.url).pathname;
		
		var path = paths.filter(p => {
			return p == pathname;
		});
		
		console.log(path[0]);
		
		if (path.length == 1) {
			_G[path[0]].handleUpgrade(req, s, h, webs => {
				_G[path[0]].emit("connection", webs, req);
			});
		}
	});
});

process.stdout.on("STDIN", process.exit);