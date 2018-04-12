const uuid = require( 'uuid/v4' ),
      EventEmitter = require( 'events' ),
      ffi = require( 'ffi-napi' ),
      ref = require( 'ref-napi' ),
      path = require( 'path' )

class Client extends EventEmitter {
    /**
     * Constructor takes the path to libtdjson binary
     * and tdLibParameters.
     * Make sure you have a built version of libtdjson
     * installed.
     * 
     * @see https://core.telegram.org/tdlib/docs/#building
     * @see https://core.telegram.org/tdlib/docs/classtd_1_1td__api_1_1tdlib_parameters.html
     * @see https://core.telegram.org/tdlib/docs/classtd_1_1_log.html#a9dd71044a37db700da89001c96b978c3
     * @param {string} binaryPath Path to libtdjson binary
     * @param {object} options Parameters that must be passed to TDlib.
     * @param {int} verbosityLevel
     * @return {void}
     */
    constructor( binaryPath, options = {}, verbosityLevel = 2 ) {
        super()
        const defaultOptions = {
            'use_message_database':     true,
            'use_secret_chats':         false,
            'system_language_code':     'en',
            'application_version':      '0.0.0',
            'device_model':             'Device',
            'system_version':           'Version',
            'enable_storage_optimizer': true,
            'database_directory':       path.resolve( process.cwd(), '.td_db' ),
            'files_directory':          path.resolve( process.cwd(), '.td_files' ),
            'api_id':                   '',
            'api_hash':                 ''
        }
        this.options = Object.assign( defaultOptions, options )
        this.verbosityLevel = verbosityLevel

        this.td = ffi.Library(
            binaryPath, {
                'td_json_client_create':            [ ref.refType( 'void' ), [] ],
                'td_json_client_send':              [ ref.types.void, [ ref.refType( 'void' ), ref.types.CString ] ],
                'td_json_client_receive':           [ ref.types.CString, [ ref.refType( 'void' ), ref.types.double ] ],
                'td_json_client_execute':           [ ref.types.CString, [ ref.refType( 'void' ), ref.types.CString ] ],
                'td_json_client_destroy':           [ ref.types.void, [ ref.refType( 'void' ) ] ],
                'td_set_log_verbosity_level':       [ ref.types.void, [ ref.types.int ] ]
            }
        )

        this.connect = () => new Promise( ( resolve, reject ) => {
            this.resolver = resolve
            this.rejector = reject
        } )

        this._fetching = {}
        this._init()
    }

    /**
     * Set the verbosity level, create the client
     * and start the loop.
     * 
     * @private
     * @async
     * @return {void}
     */
    async _init() {
        try {
            this.td.td_set_log_verbosity_level( this.verbosityLevel )
            this.client = await this._create()
            this._loop()
        } catch( error ) {
            this.rejector( `Error while creating client: ${error}` )
        }
    }

    /**
     * Main loop of Paper Plane.
     * It handles basic auth events and emits
     * the events.
     * 
     * @async
     * @private
     */
    async _loop() {
        const update = await this._receive()
        if ( ! update )
            return this._loop()
        
        switch( update[ '@type' ] ) {
            case 'updateAuthorizationState': {
                await this._handleAuth( update )
                this.emit( 'authStateUpdate', update )
                break
            }
            case 'error': {
                this.emit( 'tdError', update )
                break
            }
            default: {
                await this._handleUpdate( update )
                break
            }
        }

        return this._loop()
    }

    /**
     * Set TDlib parameters when it's
     * required.
     * 
     * @private
     * @async
     * @param {object} update Update received
     */
    async _handleAuth( update ) {
        if ( update[ 'authorization_state' ][ '@type' ] == 'authorizationStateWaitTdlibParameters' ) {
            const params = Object.assign( this.options, { '@type': 'tdLibParameters' } )
            await this.send( {
                '@type': 'setTdlibParameters',
                'parameters': params
            } )
        }
    }

    /**
     * Handles asynchronous events required
     * by this.fetch()
     * 
     * @async
     * @private
     * @param {object} update Received update
     */
    async _handleUpdate( update ) {
        const id = update[ '@extra' ]
        if ( id && this.fetching[ id ] ) {
            delete update[ '@extra' ]
            this.fetching[ id ]( update )
            delete this.fetching[ id ]
        } else {
            this.emit( 'update', update )
        }
    }

    /**
     * Performs an asynchronous request and returns
     * the result.
     * Maximum timeout is set to 10 seconds.
     * 
     * @async
     * @param {object} query Query to be performed on TDlib.
     * @return {object} The response received. 
     */
    async fetch( query ) {
        const id = uuid()
        query[ '@extra' ] = id
        const receiver = new Promise( ( resolve, reject ) => {
            this.fetching[ id ] = resolve

            setTimeout( () => {
                delete this.fetching[ id ]
                reject( 'Query timed out' )
            }, 1000 * 10 )
        } )
        await this.send( query )
        const result = await receiver
        return result
    }

    /**
     * Create the client by calling proper
     * C++ methods.
     * 
     * @async
     * @private
     * @return {object} Client
     */
    _create() {
        return new Promise( ( resolve, reject ) => {
            this.td.td_json_client_create.async( ( err, client ) => {
                if ( err ) return reject( err )
                else return resolve( client )
            } )
        } )
    }

    /**
     * Sends an asynchronous without setting
     * @extra parameter.
     * 
     * @async
     * @param {object} query Query to be performed
     * @return {object} Response received.
     */
    send( query ) {
        return new Promise( ( resolve, reject ) => {
            this.td.td_json_client_send.async( this.client, this._buildQuery( query ), ( err, resp ) => {
                if ( err ) return reject( err )
                if ( ! resp ) return resolve( null )
                resolve( JSON.parse( resp ) )
            } )
        } )
    }

    /**
     * Receives updates from TDlib and parses
     * them to JavaScript object.
     * 
     * @private
     * @async
     * @param {int} timeout Maximum timeout in seconds.
     * @return {object} Latest updates
     */
    _receive( timeout = 10 ) {
        return new Promise( ( resolve, reject ) => {
            this.td.td_json_client_receive.async( this.client, timeout, ( err, resp ) => {
                if ( err ) return reject( err )
                if ( ! resp ) return resolve( null )
                resolve( JSON.parse( resp ) )
            } )
        } )
    }

    /**
     * Performs a synchronous request.
     * Note that only a few TDlib methods can be
     * called synchronously.
     * 
     * @async
     * @param {object} query Query to be performed.
     * @return {object} Received response.
     */
    execute( query ) {
        return new Promise( ( resolve, reject ) => {
            try {
                const resp = this.td.td_json_client_execute( this.client, this._buildQuery( query ) )
                if ( ! resp ) return resolve( null )
                resolve( JSON.parse( resp ) )
            } catch( err ) {
                reject( err )
            }
        } )
    }

    /**
     * Closes the current session.
     * @return {bool} Always true.
     */
    destroy() {
        this.td.td_json_client_destroy( this.client )
        this.client = null
        return true
    }

    /**
     * Builds the queries, so they can
     * be parsed by Tdlib.
     * 
     * @param {object} query Query object
     * @return {string} TDlib compatible query
     */
    _buildQuery( query ) {
        const buffer = Buffer.from( JSON.stringify( query ) + '\0', 'utf-8' )
        buffer.type = ref.types.CString
        return buffer
    }
}

module.exports = Client