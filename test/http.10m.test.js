import test from 'ava';
import fs from 'fs';
import { Duplex } from 'stream';
import crypto from 'crypto';

import HttpServer from '../httprr/HttpServer';

test('should correctly return 10mb file to several requests', async t => {
  // md5(10m.log) = d8170858209d2ee8c1235f5f809296f3
  // with status  = b940019b07725e1551074076ab4f3807
  const filePath = `${__dirname}/10mb.sample`;
  const testRequest = 'GET /10mb.sample HTTP/1.1\r\n\r\n';
  const sampleResponseHeader = 'HTTP/1.1 200 OK\r\n\r\n\r\n';
  const reqNumber = 5;

  // calculate sample hash of the file
  const sampleHash = await new Promise(resolve => {
    const testHash = crypto.createHash('md5');
    testHash.write(sampleResponseHeader);
    fs.createReadStream(filePath).pipe(testHash);
    testHash.on('finish', () => resolve(testHash.read().toString('hex')));
  });
  // console.log('sample hash', sampleHash);

  // create server instance
  const server = new HttpServer();

  // answer to each request with status 200 and '10m.log' file content
  server.on('request', (req, res) => {
    res.writeHead(200);
    fs.createReadStream(filePath).pipe(res);
  });

  // create socket which calculating hash and invoke server request with it
  const spawnRequest = index =>
    new Promise(resolve => {
      // collect data written to the socket and put it to the hash
      const hash = crypto.createHash('md5');
      const socket = new Duplex({
        read: () => {},
        write: (chunk, enc, done) => {
          // console.log('update socket number', index);
          hash.update(chunk);
          done();
        },
        final: () => {
          // when stream ended, get final hash value
          resolve(hash.digest().toString('hex'));
        }
      });
      socket.index = index;

      // emulate new connection with test request
      server.server.emit('connection', socket);
      socket.push(Buffer.from(testRequest));
    });

  // spawnn required num of async requests and wait for hash from each one
  const multiReqDigest = await Promise.all(
    [...Array(reqNumber).keys()].map(index => spawnRequest(index))
  );

  // check that each hash calculated in request equal to sample
  t.true(multiReqDigest.every(reqHash => reqHash === sampleHash));
});
