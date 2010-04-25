/* Query observer
	
	Listen to query requests
	When a query request comes in
		lock that query
		if got lock
			subscribe to all involved properties
			run query for all items currently in database (ugh...)
*/

require('./lib/js.io/packages/jsio')
jsio.path.shared = './js'
jsio.path.server = './js'

var redis = require('./lib/redis-node-client/lib/redis-client')
var sys = require('sys')

jsio('from shared.javascript import bind')
jsio('import shared.query')

shared.query.init(redis)

process.addListener('exit', shared.query.release)
process.addListener('uncaughtException', function(e) {
	sys.puts("ERROR: uncaught exception", JSON.stringify(e))
	process.exit()
})
process.addListener('SIGINT', process.exit)