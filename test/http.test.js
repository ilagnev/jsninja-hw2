import test from 'ava';
import proxyquire from 'proxyquire';
import EventEmitter from 'events';
import http from '../httprr';
import HttpServer from '../httprr/HttpServer';

test('createServer should return instance of http class', t => {
  t.plan(2);

  // check function exists
  t.is(typeof http.createServer, 'function');

  // creata sample instance
  const server = http.createServer();
  t.true(server instanceof HttpServer);
});

test('listen method should call net.listen with specific port', t => {
  t.plan(1);

  const testPort = 8888;

  // assemble fake NetServer with fake net module
  const fakeNetServer = {
    listen: port => {
      t.is(port, testPort);
    },
    on: () => {}
  };
  const fakeNet = { createServer: () => fakeNetServer };

  // create server with proxied net module
  const HttpServerProxied = proxyquire('../httprr/HttpServer.js', {
    net: fakeNet
  });
  const server = new HttpServerProxied();

  // act: start server listening with specific port
  server.listen(testPort);
});

test('should emit error when error occured on socket', t => {
  t.plan(2);

  const errorText = 'test error';
  const socket = new EventEmitter();
  const server = new HttpServer();

  server.on('error', err => {
    t.true(err instanceof Error);
    t.is(err.message, errorText);
  });

  // emulate new connection
  server.server.emit('connection', socket);
  // emulate error on socket
  socket.emit('error', new Error(errorText));
});
