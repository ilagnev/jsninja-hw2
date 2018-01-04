const HttpServer = require('./HttpServer');

module.exports = {
  createServer: () => new HttpServer()
};
