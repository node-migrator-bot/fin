require('./lib/js.io/packages/jsio')

jsio.addPath('js', 'shared')
jsio.addPath('js', 'server')

jsio('import server.Server')
jsio('import server.Connection')

var engine = require('./engines/development')
var finServer = new server.Server(server.Connection, engine)

// for browser clients
finServer.listen('csp', { port: 5555 }) 

// for robots
finServer.listen('tcp', { port: 5556, timeout: 0 }) 
