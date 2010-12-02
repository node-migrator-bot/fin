jsio('from shared.javascript import Class, bind')

jsio('import shared.keys')
jsio('import shared.mutations')

jsio('import net.protocols.rtjp')

exports = Class(net.protocols.rtjp.RTJPProtocol, function(supr) {

	this.init = function(id, storeEngine) {
		supr(this, 'init')
		this._id = id
		this._store = storeEngine.getStore()
		this._requestHandlers = {}
		
		this._setupHandlers()
	}
	
	this.connectionMade = function() {
		supr(this, 'connectionMade', arguments)
		this._clientConnected = true
	}
	
	this.connectionLost = function() {
		this._log('connection lost - closing store')
		this._clientConnected = false
		this._store.close()
	}
	
	this.getId = function() { return this._id }
	
	this._setupHandlers = function() {	
		this._itemChannelHandler = bind(this, function(key, mutationBytes) {
			var mutationInfo = shared.mutations.parseMutationBytes(mutationBytes)
			if (mutationInfo.originId == this._id) { return }
			if (!this._clientConnected) {
				logger.warn("Received item mutation event even though store is closed", mutationInfo.json)
				return
			}
			this.sendFrame('FIN_EVENT_MUTATION', mutationInfo.json)
		})
		
		this.handleRequest('FIN_REQUEST_OBSERVE', bind(this, function(args) {
			var type = args.type,
				key = args.key
			
			logger.log("Subscribe channel:", key)
			this._store.subscribe(key, this._itemChannelHandler)
			
			if (args.snapshot != false) {
				// fake an item mutation event
				this.server.retrieveStateMutation(key, type, bind(this, function(mutation) {
					this.sendFrame('FIN_EVENT_MUTATION', JSON.stringify(mutation))
				}))
			}
		}))
		
		this.handleRequest('FIN_REQUEST_UNSUBSCRIBE', bind(this, function(key) {
			this._store.unsubscribe(key, this._itemChannelHandler)
		}))
		
		this.handleRequest('FIN_REQUEST_MONITOR_QUERY', bind(this, function(queryJSON) {
			this.server.monitorQuery(queryJSON)
		}))
		
		this.handleRequest('FIN_REQUEST_CREATE_ITEM', bind(this, function(request) {
			this.server.createItem(request.data, this, bind(this, function(itemData) {
				var response = { _requestId: request._requestId, data: itemData }
				this.sendFrame('FIN_RESPONSE', response)
			}))
		}))
		
		this.handleRequest('FIN_REQUEST_MUTATE', bind(this, '_handleMutationRequest'))
		
		this.handleRequest('FIN_REQUEST_EXTEND_LIST', bind(this, function(request) {
			var key = request.key,
				from = request.from,
				to = request.to
			
			this.server.getListItems(key, from, to, bind(this, function(items) {
				var response = { _requestId: request._requestId, data: items }
				this.sendFrame('FIN_RESPONSE', response)
			}))
		}))
		
		// TODO: get Reduction handler to work
		this.handleRequest('FIN_REQUEST_ADD_REDUCTION', bind(this, function(args) {
			var itemSetId = args.id,
				reductionId = args.reductionId
			this.server.addItemSetReduction(itemSetId, reductionId, this._itemSetSubs[itemSetId])
		}))
	}
	
/* Requests
 **********/
	this.handleRequest = function(requestName, callback) {
		this._requestHandlers[requestName] = callback
	}
	
	this.frameReceived = function(id, name, args) {
		this._log('recv', id, name, JSON.stringify(args))
		if (!this._requestHandlers[name]) {
			logger.warn('Received request without handler', name)
			return
		}
		this._requestHandlers[name](args)
	}

/* Util
 ******/
	this.sendFrame = function(name, args) {
		this._log('send', name, JSON.stringify(args))
		try {
			supr(this, 'sendFrame', arguments)
		} catch(e) {
			logger.error("when writing", e, name, JSON.stringify(args))
		}
	}

	this._log = function() {
		var args = Array.prototype.slice.call(arguments)
		if (this.transport._socket) {
			if (this.transport._socket._session) {
				args.unshift(this.transport._socket._session.key)
			}
		}
		logger.log.apply(logger, args)
	}
/*
 ******/

	this._handleMutationRequest = function(mutation) {
		mutation.time = new Date().getTime()
		this.server.mutateItem(mutation, this)
	}
})
