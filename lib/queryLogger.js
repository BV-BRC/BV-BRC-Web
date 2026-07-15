var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var sessions = new Map();

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
    var sessionId = crypto.randomUUID();
    var ts = new Date().toISOString().replace(/[:.]/g, '-');
    var filename = username + '-' + ts + '.jsonl';
    var filePath = path.join(this.logDir, filename);
    var writeStream = fs.createWriteStream(filePath, { flags: 'a' });

    writeStream.on('error', function (err) {
      console.error('queryLogger: write error for ' + filename + ':', err.message);
    });

    sessions.set(sessionId, {
      username: username,
      writeStream: writeStream,
      filePath: filePath,
      filename: filename
    });

    return { sessionId: sessionId, filename: filename };
  },

  stop: function (sessionId) {
    var session = sessions.get(sessionId);
    if (session) {
      session.writeStream.end();
      sessions.delete(sessionId);
      return true;
    }
    return false;
  },

  getSession: function (sessionId) {
    return sessions.get(sessionId) || null;
  }
};

function writeEntry(sessionId, entry) {
  var line = JSON.stringify(entry) + '\n';
  var currentSession = sessions.get(sessionId);
  if (currentSession && currentSession.writeStream.writable) {
    currentSession.writeStream.write(line);
  }
}

function middleware() {
  return function queryLogMiddleware(req, res, next) {
    var sessionId = req.cookies && req.cookies._querylog;
    if (!sessionId) {
      return next();
    }

    var session = sessions.get(sessionId);
    if (!session) {
      return next();
    }

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
        writeEntry(sessionId, entry);
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
            writeEntry(sessionId, entry);
          });
        } else {
          entry.response = raw.toString('utf-8');
          writeEntry(sessionId, entry);
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
