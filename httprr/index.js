// const fs = require('fs');

const net = require('net');
const EventEmitter = require('events');
const HttpRequester = require('./HttpRequester');
const HttpResponser = require('./HttpResponser');

class httprr extends EventEmitter {
  static createServer() {
    return new this();
  }

  constructor() {
    super();

    this.req = null;
    this.res = null;

    const server = net.createServer();

    server.on('error', err => {
      console.log('server interrupted with error: %s', err.code);
    });

    server.on('connection', socket => {
      console.log('\n-> new connection');
      socket.on('close', () => {
        console.log('r: connection closed');
      });
      socket.on('error', err => {
        console.log('r:!! caught unexpected connection error: ', err.code);
      });

      this.req = new HttpRequester(socket);
      this.res = new HttpResponser(socket);

      this.req.on('headers', () => {
        // console.log('headers parsed emitted');
        this.emit('request', this.req, this.res);

        // somehow send requested content
        // this.res.processResponse();
      });
    });

    const listeningPort = process.env.PORT || 3000;
    console.log(`start listening: localhost: ${listeningPort}`);
    server.listen(listeningPort);
  }
}

module.exports = httprr;
