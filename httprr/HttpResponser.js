const fs = require('fs');
const Writable = require('stream').Writable;
const httpStatuses = require('./httpStatuses');

class HttpResponser extends Writable{
    constructor(socket) {
        super();
        this.socket = socket;
        this.statusSent = false;
        this.headersSent = false;
        this._headers = [];

        this.on('pipe', src => {
            src.on('close', src => this._pipeSrcClosed(src));
        });
        this.on('unpipe', src => {
            src.removeEventListener(src => this._pipeSrcClosed(src));
        });
    }

    _pipeSrcClosed(src) {
        console.log('src close -> socket.end');
        this.socket.end();
    }

    setHeader(name, value) {
        this._headers.push({
            name: name,
            value: value
        });
    }

    writeHead(code) {
        console.log('writeHead invoked: ', code);
        if (!this.statusSent) {
            this.socket.write(`HTTP/1.1 ${code} ${httpStatuses[code] || ''}\r\n`);
            this.statusSent = true;
        }
    }

    _write(data) {
        if (!this.headersSent) {
            if (!this.statusSent)
                this.writeHead(200);

            this.socket.write(this._headers
                .map(header => {
                    return header.name + ': ' + header.value
                })
                .join('\r\n')
                + '\r\n\r\n'
            );
        }
        console.log('data pushed to _write', data);

        this.socket.write(data);
        //this.socket.end();
    }

    processResponse(url) {
        const requestedPath = this.publicDir + url;
        fs.open(requestedPath, 'r', (err, fd) => {
            if (err || !fd) {
                switch (err.code) {
                    case 'EACCES':
                        return this.sendError('403 Forbidden');
                    case 'ENOENT':
                        return this.sendError('404 Not Found');
                    default:
                        return this.sendError('400 Bad Request');
                }
            }

            // get path info and send file or dir list
            fs.fstat(fd, (err, stats) => {
                if (stats.isFile()) {
                    this.sendFileContent(fd, stats);
                } else if (stats.isDirectory()) {
                    this.sendDirContent(requestedPath);
                }
            });
        });
    }

    sendFileContent(fd, stats) {
        const responseHeaders = [
            'HTTP/1.1 200 OK',
            'Content-Length: ' + stats.size,
            'Content-Type: ' + this.getMimeType(this.path.split('.').pop())
        ];
        this.socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

        let bytesRedTotal = 0;
        //todo: change to less memory usage method -> fs.read
        fs.readFile(fd, (err, data) => {
            //console.log('read interation ', data.length);
            if (err) {
                console.log(err);
                return;
            }

            this.socket.end(data);

            if ((bytesRedTotal += data.length) >= stats.size) {
                console.log('bytes read total: %s fsize: %s', bytesRedTotal, stats.size);
            }
        });
    }

    sendDirContent(path) {
        const responseHeaders = [
            'HTTP/1.1 200 OK',
            'Content-Type: ' + this.getMimeType('html')
        ];
        this.socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

        fs.readdir(path, (err, files) => {
            if (err) {
                console.log(err);
                return;
            }

            const linkBasePath = this.path[this.path.length-1] == '/' ? this.path : this.path + '/';
            this.socket.end(
                files
                    .map(fname => {
                        // possible xss attack through {path} variable ^_^
                        return `<a href="${linkBasePath}${fname}">${fname}</a>`;
                    })
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

    sendError(header) {
        this.socket.end('HTTP/1.1 ' + header + '\r\n\r\n');
    }
}

module.exports = HttpResponser;