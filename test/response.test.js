import test from 'ava';
import { Writable } from 'stream';
import HttpResponser from '../httprr/HttpResponser';

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
