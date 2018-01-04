const net = require('net');
const EventEmitter = require('events');
const HttpRequester = require('./HttpRequester');
const HttpResponser = require('./HttpResponser');

class HttpServer extends EventEmitter {
  constructor() {
    super();

    this.req = null;
    this.res = null;

    this.server = net.createServer();

    this.server.on('error', err => {
      console.log('server interrupted with error: %s', err.code);
    });

    this.server.on('connection', socket => {
      console.log('\n-> new connection');
      socket.on('close', () => {
        console.log('-> connection closed');
      });
      socket.on('error', err => {
        console.log('->!! caught unexpected connection error: ', err.code);
      });

      this.req = new HttpRequester(socket);
      this.res = new HttpResponser(socket);

      this.req.on('headers', () => {
        // console.log('headers parsed emitted');
        this.emit('request', this.req, this.res);

        // somehow send requested content
        // this.res.processResponse(this.req.url);
      });
    });
  }

  listen(port) {
    const listeningPort = process.env.PORT || port || 3000;
    console.log(`start server on localhost:${listeningPort}`);
    this.server.listen(listeningPort);
  }
}

module.exports = HttpServer;
