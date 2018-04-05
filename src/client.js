const uuid = require( 'uuid/v4' ),
      EventEmitter = require( 'events' ),
      ffi = require( 'ffi-napi' ),
      ref = require( 'ref-napi' ),
      path = require( 'path' )

class Client extends EventEmitter {
    constructor( binaryPath, options = {} ) {
        super()
        const defaultOptions = {
            'use_message_database':     true,
            'use_secret_chats':         false,
            'system_language_code':     'en',
            'application_version':      '0.0.0',
            'device_model':             'Paper',
            'system_version':           'Plane',
            'enable_storage_optimizer': true,
            'database_directory':       path.resolve( process.cwd(), '.td_db' ),
            'files_directory':          path.resolve( process.cwd(), '.td_files' ),
            'api_id':                   '',
            'api_hash':                 ''
        }
        this.options = {
            ...defaultOptions,
            ...options
        }

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

        this.fetching = {}
        this.init()
    }

    async init() {
        try {
            this.td.td_set_log_verbosity_level( this.options.verbosityLevel )
            this.client = await this._create()
            this.loop()
        } catch( error ) {
            this.rejector( `Error while creating client: ${error}` )
        }
    }

    async loop() {
        const update = await this._receive()
        if ( ! update )
            return this.loop()
        

        switch( update[ '@type' ] ) {
            case 'updateAuthorizationState': {
                await this._handleAuth( update )
                this.emit( 'authStateUpdate', update )
                break
            }
            case 'error': {
                this.emit( 'error', update )
                // console.error( update )
            }
            default: {
                await this._handleUpdate( update )
                break
            }
        }

        this.loop()
    }

    async _handleAuth( update ) {
        switch( update[ 'authorization_state' ][ '@type' ] ) {
            case 'authorizationStateWaitTdlibParameters': {
                await this.send( {
                    '@type': 'setTdlibParameters',
                    'parameters': {
                        ...this.options,
                        '@type':        'tdlibParameters'
                    }
                } )
                break
            }
            case 'authorizationStateWaitEncryptionKey': {
                await this.send( {
                    '@type': 'checkDatabaseEncryptionKey'
                } )
            }
            case 'authorizationStateReady': {
                this.resolver()
                break
            }
        }
    }

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

    _create() {
        return new Promise( ( resolve, reject ) => {
            this.td.td_json_client_create.async( ( err, client ) => {
                if ( err ) return reject( err )
                else return resolve( client )
            } )
        } )
    }

    send( query ) {
        return new Promise( ( resolve, reject ) => {
            this.td.td_json_client_send.async( this.client, this._buildQuery( query ), ( err, resp ) => {
                if ( err ) return reject( err )
                if ( ! resp ) return resolve( null )
                resolve( JSON.parse( resp ) )
            } )
        } )
    }

    _receive( timeout = 10 ) {
        return new Promise( ( resolve, reject ) => {
            this.td.td_json_client_receive.async( this.client, timeout, ( err, resp ) => {
                if ( err ) return reject( err )
                if ( ! resp ) return resolve( null )
                resolve( JSON.parse( resp ) )
            } )
        } )
    }

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

    destroy() {
        this.td.td_json_client_destroy( this.client )
        this.client = null
        return true
    }

    _buildQuery( query ) {
        const buffer = Buffer.from( JSON.stringify( query ) + '\0', 'utf-8' )
        buffer.type = ref.types.CString
        return buffer
    }
}

module.exports = Client