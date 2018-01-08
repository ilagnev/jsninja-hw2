// const fs = require('fs');
const server = require('./httprr').createServer();

server.on('request', (req, res) => {
  console.log(req.method, req.url, req.headers);

  // res.setHeader('Content-Type', 'application/json');
  // optional
  // res.writeHead(200);
  // fs.createReadStream('somefile.txt').pipe(res);

  res.processResponse(req.url);
});

server.listen();
