import test from 'ava';
import proxyquire from 'proxyquire';
import EventEmitter from 'events';
import { Readable } from 'stream';

import http from '../httprr';
import HttpServer from '../httprr/HttpServer';
import HttpRequester from '../httprr/HttpRequester';
import HttpResponser from '../httprr/HttpResponser';

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

test.cb('should emit request event with req and res instances', t => {
  t.plan(2);

  // prepare request headers, fake socket, and server instance
  const testHeaders = 'GET / HTTP/1.1\r\nHost: github.com\r\n\r\n';
  const socket = new Readable({ read: () => {} });
  const server = new HttpServer();

  // check request event with required arguments
  server.on('request', (req, res) => {
    t.true(req instanceof HttpRequester);
    t.true(res instanceof HttpResponser);
    t.end();
  });

  // emit fake connection with fake socket
  server.server.emit('connection', socket);
  // emulate http get request
  socket.push(testHeaders);
});

test.cb('shoud close socket when response end', t => {
  t.plan(1);

  const testRequest = 'GET / HTTP/1.1\r\nHost: github.com\r\n\r\n';
  const testResponseContent = 'some resp\ncontent';
  const supposeResponse = `HTTP/1.1 200 OK\r\n\r\n\r\n${testResponseContent}`;

  const socket = new EventEmitter();
  socket.unshift = () => {};
  socket.pause = () => {};

  // collect data written to the socket
  let sentData = '';
  socket.write = data => {
    sentData += data.toString();
  };

  // check that socket ended(closed) and response data is correct
  socket.end = () => {
    t.is(sentData, supposeResponse);
    t.end();
  };

  const server = new HttpServer();
  server.on('request', (req, res) => {
    // write content to response and invoke stream end
    res.writeHead(200);
    res.end(testResponseContent);
  });

  // emulate new connection with test request
  server.server.emit('connection', socket);
  socket.emit('data', Buffer.from(testRequest));
});
