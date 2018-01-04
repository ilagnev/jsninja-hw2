import test from 'ava';
import { Writable } from 'stream';
import HttpResponser from '../httprr/HttpResponser';

test('Response should be writtable stream', t => {
  const res = new HttpResponser({});
  t.true(res instanceof Writable);
});

test.cb('Call setHeader not send headers, and writeHeaders send', t => {
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

  // check that function esists
  t.is(typeof res.setHeader, 'function');
  // set header
  res.setHeader('Server', 'ava test');

  setTimeout(() => {
    // check that headers data not sent
    t.is(sentData, '');
    // write headers to socket
    res.writeHeaders();
    // check sent data
    t.is(sentData, testHeadersString);
    t.end();
  });
});

test('All headers set to response should be written to the socket', t => {
  let sentData = '';
  const testHeadersString = `HTTP/1.1 200 OK\r\nServer: ava test\r\nDigest: abcdf666\r\n\r\n`;
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
  res.writeHeaders();
  t.is(sentData, testHeadersString);
});

test.cb(
  'Call to setHeader should emit error when headers already have been sent',
  t => {
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

    // send response code 200
    res.writeHead(200);
    // set headers
    res.setHeader('Timestamp', Date.now());
    // send headers which already set
    res.writeHeaders();

    // try to set additional header after headers sent
    res.setHeader('Server', 'ava test');
  }
);

/* 
  write head method tests 
*/

test('Call writeHead without status code should emit error', t => {
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

test.cb('Call to writeHead should send corresponding status code', t => {
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

test.cb('Call to writeHead few times should emit error', t => {
  t.plan(2);

  // create sample socket and response instances
  const socket = new Writable({ write: () => {} });
  const res = new HttpResponser(socket);

  // attach listener to check error
  res.on('error', err => {
    t.true(err instanceof Error);
    t.is(err.message, 'Status already sent');
    t.end();
  });

  // try to send few status codes
  res.writeHead(200);
  res.writeHead(404);
});
