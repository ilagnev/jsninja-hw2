const server = require('./httprr').createServer();

server.on('request', (req, res) => {
  console.log('\n--> new request', req.method, req.url, req.headers);
  res.processResponse(req.url);
});

server.listen();
