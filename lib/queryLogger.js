var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var sessionManager = {
  logDir: null,

  init: function (logDir) {
    this.logDir = logDir;
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (err) {
      console.error('queryLogger: failed to create log directory:', err.message);
    }
  },

  start: function (username) {
    var ts = new Date().toISOString().replace(/[:.]/g, '-');
    var filename = username + '-' + ts + '.jsonl';
    var filePath = path.join(this.logDir, filename);
    fs.writeFileSync(filePath, '');
    return { filename: filename };
  },

  isValidFilename: function (filename) {
    if (!filename) return false;
    if (filename.indexOf('/') !== -1 || filename.indexOf('\\') !== -1) return false;
    if (filename.indexOf('..') !== -1) return false;
    if (!filename.endsWith('.jsonl')) return false;
    return true;
  },

  isActive: function (filename) {
    if (!this.isValidFilename(filename)) return false;
    try {
      fs.accessSync(path.join(this.logDir, filename), fs.constants.W_OK);
      return true;
    } catch (e) {
      return false;
    }
  }
};

function appendEntry(filePath, entry) {
  var line = JSON.stringify(entry) + '\n';
  fs.appendFile(filePath, line, function (err) {
    if (err) {
      console.error('queryLogger: write error for ' + filePath + ':', err.message);
    }
  });
}

function middleware() {
  return function queryLogMiddleware(req, res, next) {
    var filename = req.cookies && req.cookies._querylog;
    if (!filename) {
      return next();
    }

    if (!sessionManager.isValidFilename(filename) || !sessionManager.logDir) {
      return next();
    }

    var filePath = path.join(sessionManager.logDir, filename);

    var startTime = Date.now();
    var entry = {
      ts: new Date(startTime).toISOString(),
      method: req.method,
      path: req.path,
      accept: req.headers['accept'] || '',
      range: req.headers['range'] || '',
      contentType: req.headers['content-type'] || ''
    };

    if (req.method === 'POST' && req.body) {
      entry.query = Buffer.isBuffer(req.body) ? req.body.toString('utf-8') : String(req.body);
    } else {
      entry.query = req.url.indexOf('?') !== -1 ? req.url.slice(req.url.indexOf('?') + 1) : '';
    }

    var isDownload = req.originalUrl.indexOf('http_download=true') !== -1;
    var chunks = [];
    var totalSize = 0;
    var maxSize = 5 * 1024 * 1024;

    if (!isDownload) {
      var originalWrite = res.write;
      var originalEnd = res.end;

      res.write = function (chunk) {
        if (chunk && totalSize < maxSize) {
          var buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          chunks.push(buf);
          totalSize += buf.length;
        }
        return originalWrite.apply(res, arguments);
      };

      res.end = function (chunk) {
        if (chunk && totalSize < maxSize) {
          var buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          chunks.push(buf);
          totalSize += buf.length;
        }
        return originalEnd.apply(res, arguments);
      };
    }

    res.on('finish', function () {
      entry.status = res.statusCode;
      entry.contentRange = res.getHeader('content-range') || res.getHeader('x-content-range') || '';
      entry.elapsed = Date.now() - startTime;

      if (isDownload) {
        entry.download = true;
        appendEntry(filePath, entry);
      } else {
        var raw = Buffer.concat(chunks);
        entry.responseTruncated = totalSize > maxSize;

        var encoding = res.getHeader('content-encoding');
        if (encoding === 'gzip' || encoding === 'deflate') {
          var decompress = encoding === 'gzip' ? zlib.gunzip : zlib.inflate;
          decompress(raw, function (err, decoded) {
            if (err) {
              entry.response = raw.toString('utf-8');
              entry.decompressError = err.message;
            } else {
              entry.response = decoded.toString('utf-8');
            }
            appendEntry(filePath, entry);
          });
        } else {
          entry.response = raw.toString('utf-8');
          appendEntry(filePath, entry);
        }
      }
    });

    next();
  };
}

module.exports = {
  sessionManager: sessionManager,
  middleware: middleware
};
