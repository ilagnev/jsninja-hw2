const fs = require('fs');
const server = require('./httprr').createServer();

server.on('request', (req, res) => {
  console.log(req.headers, req.method, req.url);
  var a = 3;

  res.setHeader('Content-Type', 'application/json');
  // optional
  res.writeHead(200);

  fs.createReadStream('somefile.txt').pipe(res);
});
