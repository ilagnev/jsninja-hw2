const fs = require('fs');
const Writable = require('stream').Writable;
const httpStatuses = require('./httpStatuses');

class HttpResponser extends Writable {
  constructor(socket) {
    super();
    this.socket = socket;
    this.statusSent = false;
    this.headersSent = false;
    this.headers = [];
    this.publicDir = './static';

    this.on('pipe', src => {
      src.on('close', () => this.pipeSrcClosed());
    });
    this.on('unpipe', src => {
      src.removeEventListener(() => this.pipeSrcClosed());
    });
  }

  pipeSrcClosed() {
    console.log('src close -> socket.end');
    this.socket.end();
  }

  setHeader(name, value) {
    if (this.headersSent) {
      this.emit('error', new Error('Headers already sent'));
    } else {
      this.headers.push({ name, value });
    }
  }

  writeHead(code) {
    if (!this.statusSent) {
      this.socket.write(`HTTP/1.1 ${code} ${httpStatuses[code] || ''}\r\n`);
      this.statusSent = true;
    } else {
      this.emit('error', new Error('Status already sent'));
    }
  }

  writeHeaders() {
    if (this.headersSent) {
      this.emit('error', new Error('Headers already sent'));
    } else {
      if (this.headers.length) {
        this.socket.write(
          `${this.headers
            .map(header => `${header.name}: ${header.value}`)
            .join('\r\n')}\r\n\r\n`
        );
      }
      this.headersSent = true;
    }
  }

  _write(data) {
    if (!this.headersSent) {
      if (!this.statusSent) this.writeHead(200);
      this.writeHeaders();
    }

    this.socket.write(data);
    // this.socket.end();
  }

  processResponse(url) {
    const requestedPath = this.publicDir + url;
    fs.open(requestedPath, 'r', (err, fd) => {
      if (err) {
        switch (err.code) {
          case 'EACCES':
            this.sendError(403);
            break;
          case 'ENOENT':
            this.sendError(404);
            break;
          default:
            this.sendError(400);
            break;
        }
      } else if (!fd) {
        this.sendError(404);
      } else {
        // get path info and send file or dir list
        fs.fstat(fd, (errStat, stats) => {
          if (stats.isFile()) {
            this.sendFileContent(fd, stats, requestedPath.split('/').pop());
          } else if (stats.isDirectory()) {
            this.sendDirContent(requestedPath);
          }
        });
      }
    });
  }

  sendFileContent(fd, stats, fname) {
    const responseHeaders = [
      `HTTP/1.1 200 OK`,
      `Content-Length: ${stats.size}`,
      `Content-Type: ${this.constructor.getMimeType(fname.split('.').pop())}`
    ];
    this.socket.write(`${responseHeaders.join('\r\n')}\r\n\r\n`);

    // todo: change to less memory usage method -> fs.read
    fs.readFile(fd, (err, data) => {
      // console.log('read iteration ', data.length);
      if (err) {
        console.log(err);
        return;
      }

      this.socket.end(data);
    });
  }

  sendDirContent(path) {
    const responseHeaders = [
      'HTTP/1.1 200 OK',
      `Content-Type: ${this.constructor.getMimeType('html')}`
    ];
    this.socket.write(`${responseHeaders.join('\r\n')}\r\n\r\n`);

    fs.readdir(path, (err, files) => {
      if (err) {
        console.log(err);
        return;
      }

      const linkBasePath = `${path}/`
        .replace(this.publicDir, '/')
        .replace(/[/]+/g, '/');

      // possible xss attack through {path} variable ^_^
      this.socket.end(
        files
          .map(fname => `<a href="${linkBasePath}${fname}">${fname}</a>`)
          .join('<br/>\n')
      );
    });
  }

  static getMimeType(ext) {
    switch (ext) {
      case 'htm':
      case 'html':
        return 'text/html; charset=utf-8';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'js':
        return 'text/javascript';
      case 'txt':
      default:
        return 'text/plain; charset=utf-8';
    }
  }

  sendError(httpCode) {
    const message = `${httpCode} ${httpStatuses[httpCode] || ''}`;
    this.socket.end(`HTTP/1.1 ${message}\r\n\r\n${message}`);
  }
}

module.exports = HttpResponser;
