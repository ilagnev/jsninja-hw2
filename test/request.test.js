import test from 'ava';
import { Readable } from 'stream';
import HttpRequester from '../httprr/HttpRequester';

const headersSample = `GET /stevemao/left-pad HTTP/1.1
Host: github.com
Connection: keep-alive
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8
Referer: http://github.com/
Accept-Encoding: gzip, deflate, br
Accept-Language: uk,en-US;q=0.9,en;q=0.8,ru-RU;q=0.7,ru;q=0.6
Cookie: logged_in=yes; tz=Europe%2FKiev

`.replace(/\n/g, '\r\n');

test.cb('Should correctly handle when headers come in several chunks', t => {
  t.plan(4);

  // sample readable socket
  const socket = new Readable({
    read: () => {}
  });
  // sample request instance
  const req = new HttpRequester(socket);

  // split headers to 2 chanks
  // prettier-ignore
  const headersPartOne = headersSample.substring(0, (headersSample.length / 2).toFixed());
  const headersPartTwo = headersSample.substring(headersPartOne.length);

  // check that headers event emitted
  req.on('headers', () => {
    t.true(req.headersParsed);
    t.true(req.headers.length > 0);
    t.end();
  });

  // push first part of headers
  t.true(socket.push(Buffer.from(headersPartOne)));

  // on next queue round
  setTimeout(() => {
    // headers not parsed yet
    t.false(req.headersParsed);
    // push second part of headers
    socket.push(Buffer.from(headersPartTwo));
  });
});
