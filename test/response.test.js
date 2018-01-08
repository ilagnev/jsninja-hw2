import test from 'ava';
import { Writable } from 'stream';
import crypto from 'crypto';
import HttpResponser from '../httprr/HttpResponser';

test('HttpResponser should be writtable stream', t => {
  const res = new HttpResponser({});
  t.true(res instanceof Writable);
});

test.cb('should send headers on writeHead call, not setHeader', t => {
  t.plan(3);

  // fake socket save all pushed data to sentData var
  let sentData = '';
  const testHeadersString = 'HTTP/1.1 200 OK\r\nServer: ava test\r\n\r\n';
  const socket = new Writable({
    write: (data, enc, cb) => {
      sentData += data.toString();
      cb();
    }
  });
  // create response instance
  const res = new HttpResponser(socket);

  // check that function exists
  t.is(typeof res.setHeader, 'function');
  // set header
  res.setHeader('Server', 'ava test');

  setTimeout(() => {
    // check that headers data not sent
    t.is(sentData, '');
    // write headers to socket
    res.writeHead(200);
    // check sent data
    t.is(sentData, testHeadersString);
    t.end();
  });
});

test('all headers set to response should be written to the socket', t => {
  const testHeadersString = `HTTP/1.1 200 OK\r\nServer: ava test\r\nDigest: abcdf666\r\n\r\n`;

  // fake socket save all pushed data to sentData var
  let sentData = '';
  const socket = new Writable({
    write: (data, enc, cb) => {
      sentData += data.toString();
      cb();
    }
  });
  // create response instance
  const res = new HttpResponser(socket);

  // set test headers
  res.setHeader('Server', 'ava test');
  res.setHeader('Digest', 'abcdf666');
  res.writeHead(200);
  t.is(sentData, testHeadersString);
});

test.cb('should emit error when headers already have been sent', t => {
  t.plan(2);

  // create sample socket and response instances
  const socket = new Writable({ write: () => {} });
  const res = new HttpResponser(socket);

  // attach listener for error
  res.on('error', err => {
    t.true(err instanceof Error);
    t.is(err.message, 'Headers already sent');
    t.end();
  });

  // set headers
  res.setHeader('Timestamp', Date.now());
  // send response headers with status code 200
  res.writeHead(200);

  // try to set additional header after headers sent
  res.setHeader('Server', 'ava test');
});

test('should correctly send data in few chunks', t => {
  // length will be 4096 because hex code each byte in two chars (FF)
  const sampleBigData = crypto.randomBytes(2048).toString('hex');

  // fake socket save all pushed data to sentData var
  let sentData = '';
  const socket = new Writable({
    write: (data, enc, cb) => {
      sentData += data.toString();
      cb();
    }
  });
  // create response instance
  const res = new HttpResponser(socket);

  // send sample data in few chunks
  res.writeHead(200);
  res.write(sampleBigData.substring(0, 1024));
  res.write(sampleBigData.substring(1024, 2048));
  res.write(sampleBigData.substring(2048, 3072));
  res.write(sampleBigData.substring(3072, 4096));
  res.end();

  t.is(sentData, `HTTP/1.1 200 OK\r\n\r\n\r\n${sampleBigData}`);
});

/* 
  write head method tests 
*/

test('should emit error when writeHead invoked without status code', t => {
  t.plan(2);

  // create sample socket and response instances
  const socket = new Writable({ write: () => {} });
  const res = new HttpResponser(socket);

  // check error message
  res.on('error', err => {
    t.true(err instanceof Error);
    t.is(err.message, 'Status should not be empty');
  });

  // call writeHead without status code
  res.writeHead();
});

test.cb('writeHead should send corresponding status code', t => {
  t.plan(1);

  const socket = new Writable({
    write: data => {
      t.is(data.toString(), 'HTTP/1.1 200 OK\r\n');
      t.end();
    }
  });
  const res = new HttpResponser(socket);
  res.writeHead(200);
});

test.cb('should emit error when writeHead invoked several times', t => {
  t.plan(2);

  // create sample socket and response instances
  const socket = new Writable({ write: () => {} });
  const res = new HttpResponser(socket);

  // attach listener to check error
  res.on('error', err => {
    t.true(err instanceof Error);
    t.is(err.message, 'Headers already sent');
    t.end();
  });

  // try to send few status codes
  res.writeHead(200);
  res.writeHead(404);
});

test('writeHead should overwrite headers params with same name', t => {
  const testHeadersString = `HTTP/1.1 200 OK\r\nServer: ava test\r\nDigest: 888\r\n\r\n`;

  // fake socket save all pushed data to sentData var
  let sentData = '';
  const socket = new Writable({
    write: (data, enc, cb) => {
      sentData += data.toString();
      cb();
    }
  });
  // create response instance
  const res = new HttpResponser(socket);

  // set test headers
  res.setHeader('Server', 'ava test');
  res.setHeader('Digest', '666');
  res.writeHead(200, { Digest: '888' });
  t.is(sentData, testHeadersString);
});
