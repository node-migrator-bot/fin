var http = require('http'),
	fs = require('fs')

http.createServer(function(req, res) {
	var demo = req.url.substr(1)
	if (!demo) { listDemos(res) }
	else { showDemo(demo, res) }
}).listen(1234)

function listDemos(res) {
	fs.readdir(__dirname, function(err, entries) {
		if (err) { return res.end(err.stack) }
		res.writeHead(200, { 'Content-Type':'text/html' })
		entries.forEach(function(entry) {
			if (!entry.match(/\.html$/)) { return }
			res.write('<br/><a href="'+entry+'">'+entry+'</a>')
		})
		res.end()
	})
}

function showDemo(demo, res) {
	fs.readFile(__dirname + '/' + demo, function(err, content) {
		if (err) { return res.end(err.stack) }
		res.end(content)
	})
}

var fin = require('../api/server'), engine = require('../engines/development')
fin.start('localhost', 8080, engine)
