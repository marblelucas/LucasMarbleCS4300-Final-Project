import * as osc from "osc-min"
import WebSocket, { WebSocketServer } from 'ws';
import udp from "dgram"
import express from "express"
import http from 'http'

/* 
1. Open up a socket server
2. Maintain a list of clients connected to the socket server
3. When a client sends a message to the socket server, forward it to all
connected clients
*/

const app = express()
app.use( express.static('../../') )

const server = http.createServer( app ),
      socketServer = new WebSocketServer({ server }),
      clients = []

socketServer.on( 'connection', client => {
    
  // when the server receives a message from this client...
  client.on( 'message', msg => {
	  // send msg to every client EXCEPT the one who originally sent it
    clients.forEach( c => { if( c !== client ) c.send( msg ) })
  })

  // add client to client list
  clients.push( client )
})

// start web server
server.listen( 8080 )

// select port
const inport = 57121//process.argv[2] != null ? parseInt(process.argv[2]) : 57121;

console.log(`OSC listener running at http://localhost:${inport}`);

const sock = udp.createSocket("udp4", (msg) => {
  try {
    const oscmsg = osc.fromBuffer(msg)
    console.log( oscmsg )
    clients.forEach( c => c.send( JSON.stringify( oscmsg ) ) )
  } catch (e) {
    console.log("invalid OSC packet", e)
  }
});

sock.bind(inport);
