const PaperPlane = require( '../src/client' ),
      inquirer = require( 'inquirer' )

const getInput = async ( type, message ) => {
    let input = ''
    while ( ! input.length ) {
        const result = await inquirer.prompt( [ { type, name: 'input', message } ] )
        input = result.input
    }
    return input
}

const onReady = async ( client ) => {
    const answer = await inquirer.prompt( {
        type:       'list',
        name:       'action',
        message:    'Authenticated!',
        choices:    [ 'send a message', 'display updates realtime', 'logout', 'destroy & exit' ]
    } )
    const action = answer.action

    if ( action == 'send a message' ) {
        console.log( 'Let\'s send a text message!' )
        const chat_id = await getInput( 'input', 'chat_id: ' )
        const text = await getInput( 'input', 'text: ' )

        var result = await client.fetch( { '@type': 'sendMessage', 'chat_id': parseInt( chat_id ), 'input_message_content': { '@type': 'inputMessageText', 'text':
            { '@type': 'formattedText', 'text': text }
        } } )
        console.log( result )
        console.log( '' )
        onReady( client )
    }
    if ( action == 'display updates realtime' ) {
        console.log( 'Displaying updates...' )
        client.on( 'update', console.log )
    }
    if ( action == 'logout' ) {
        console.log( 'See you soon...!' )
        await client.send( { '@type': 'logOut' } )
        await client.destroy()
        process.exit( 0 )
    }
    if ( action == 'destroy & exit' ) {
        await client.destroy()
        process.exit( 0 )
    }
}

async function main() {
    const client = new PaperPlane( 'libtdjson', {
        'api_id':       process.env.TD_API_ID,
        'api_hash':     process.env.TD_API_HASH
    } )
    
    await client.connect()
    
    client.on( 'error', console.log )

    client.on( 'authStateUpdate', async ( update ) => {
        switch( update[ 'authorization_state' ][ '@type' ] ) {
            case 'authorizationStateWaitPhoneNumber': {
                await client.send( {
                    '@type': 'setAuthenticationPhoneNumber',
                    'phone_number': await getInput( 'input', 'Phone number: ' )
                } )
                break
            }
            case 'authorizationStateWaitCode': {
                await client.send( {
                    '@type': 'checkAuthenticationCode',
                    'code': await getInput( 'input', 'Code you received: ' )
                } )
                break
            }
            case 'authorizationStateWaitPassword': {
                const passwordHint = update['authorization_state']['password_hint']
                const password = await getInput('password', `Please enter password (${passwordHint}): `)
                await client.send({
                  '@type': 'checkAuthenticationPassword',
                  'password': password,
                })
                break
            }
            case 'authorizationStateReady': {
                onReady( client )
                break
            }
        }
    } )
}

main()