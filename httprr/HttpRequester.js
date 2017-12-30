// const fs = require('fs');
const Readable = require('stream').Readable;

class HttpRequester extends Readable {
  constructor(socket) {
    super();

    this.socket = socket;
    this.requestBuf = Buffer.allocUnsafe(0);

    this.headersParsed = false;
    this.headers = [];
    this.method = null;
    this.url = null;

    socket.on('data', data => this.onDataReceived(data));
  }

  onDataReceived(data) {
    // save received data to buffer
    // console.log('data received: ', data.toString().indexOf('\r\n'));
    this.requestBuf = Buffer.concat([this.requestBuf, data]);

    // check buffer for sequence of \r\n\r\n
    // which mean the end of the head section
    if (
      !this.headersParsed &&
      this.requestBuf.indexOf(Buffer.from('\r\n\r\n')) > -1
    ) {
      this.processRequest();
    } else if (this.headersParsed) {
      // pass data further in stream
      this.push(data);
      this.socket.pause();
    }
  }

  _read() {
    this.socket.resume();
  }

  processRequest() {
    const headersEndPosition = this.requestBuf.indexOf('\r\n\r\n');
    const requestHead = this.requestBuf
      .slice(0, headersEndPosition)
      .toString('utf8');

    // parse request
    this.parseRequest(requestHead);
    this.headersParsed = true;

    // return body data back to stream and pause
    this.socket.unshift(this.requestBuf.slice(headersEndPosition + 4));
    this.socket.pause();

    // show debug info about request to console
    /*
    console.log('request method: ', this.method);
    console.log('request url: ', this.url);
    console.log(
      `request headers: \n\t${this.headers
        .map(h => `[${h.key}] ${h.value}`)
        .join('\n\t')}\n`
    );
    */

    this.emit('headers');
  }

  parseRequest(requestHead) {
    let matches;

    // check http GET request and save requested path
    const methodRegexp = /^([^ ]+) ([^ ]+) ([^\n]+)\r?\n/;
    matches = requestHead.match(methodRegexp);
    if (matches) {
      // console.log('method matches:', matches);
      this.method = matches[1];
      this.url = matches[2];
    }

    // collect headers
    const headersRegexp = /^([^:]+): ([^$]+)$/;
    requestHead.split('\r\n').forEach(line => {
      matches = line.match(headersRegexp);
      if (matches) {
        // console.log('header matches: ', matches);
        this.headers.push({ key: matches[1], value: matches[2] });
      }
    });
  }
}

module.exports = HttpRequester;
