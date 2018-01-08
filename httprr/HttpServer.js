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
      // console.err('server interrupted with error: %s', err.code);
      this.emit('error', err);
    });

    this.server.on('connection', socket => {
      // console.log('\n-> new connection');
      const req = new HttpRequester(socket);
      const res = new HttpResponser(socket);

      socket.on('close', () => {
        // console.log('-> connection closed');
      });
      socket.on('error', err => {
        // console.log('->!! connection error: ', err.message);
        this.emit('error', err);
      });

      req.on('headers', () => {
        this.emit('request', req, res);
      });
    });
  }

  listen(port) {
    const listeningPort = process.env.PORT || port || 3000;
    this.server.listen(listeningPort, () => {
      console.log(`start server on localhost:${listeningPort}`);
    });
  }
}

module.exports = HttpServer;
