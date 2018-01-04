import test from 'ava';
import sinon from 'sinon';
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
  const testPort = 8888;
  const server = http.createServer();

  // make fake func for server
  sinon.stub(server.server, 'listen').callsFake(port => {
    t.is(port, testPort);
  });
  /* simple check without sinon
  server.server.listen = port => {
    t.is(port, testPort);
  };*/

  server.listen(testPort);
});
