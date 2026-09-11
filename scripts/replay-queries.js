#!/usr/bin/env node

'use strict';

var fs = require('fs');
var readline = require('readline');
var http = require('http');
var https = require('https');
var zlib = require('zlib');

var args = parseArgs(process.argv.slice(2));

if (args.help || !args.logFile || !args.endpoint) {
  console.log('Usage: replay-queries.js <logfile.jsonl> <api-endpoint> [options]');
  console.log('');
  console.log('Arguments:');
  console.log('  <logfile.jsonl>       JSONL file from query logger');
  console.log('  <api-endpoint>        Base URL of data API to test against');
  console.log('                        e.g. https://p3.theseed.org/services/data_api');
  console.log('');
  console.log('Options:');
  console.log('  --token <token>       Authorization token for authenticated queries');
  console.log('  --concurrency <n>     Parallel requests (default: 1)');
  console.log('  --timeout <ms>        Request timeout in ms (default: 120000)');
  console.log('  --fail-only           Only print failures');
  console.log('  --summary             Print summary only, no per-query output');
  console.log('  --output <file>       Write detailed results to JSONL file');
  console.log('  --ignore-order        Ignore array element order in JSON comparison');
  console.log('  --max <n>             Stop after n queries');
  console.log('  --help                Show this help');
  process.exit(args.help ? 0 : 1);
}

var stats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: 0,
  skipped: 0,
  totalOriginalMs: 0,
  totalReplayMs: 0
};

var outputStream = null;
if (args.output) {
  outputStream = fs.createWriteStream(args.output, { flags: 'w' });
}

run().then(function () {
  printSummary();
  if (outputStream) {
    outputStream.end();
  }
  process.exit(stats.failed > 0 || stats.errors > 0 ? 1 : 0);
}).catch(function (err) {
  console.error('Fatal error:', err.message);
  process.exit(2);
});

async function run() {
  var entries = await loadEntries(args.logFile);
  console.log('Loaded ' + entries.length + ' replayable queries from ' + args.logFile);
  console.log('Target: ' + args.endpoint);
  console.log('');

  if (args.concurrency > 1) {
    await runParallel(entries, args.concurrency);
  } else {
    for (var i = 0; i < entries.length; i++) {
      await replayOne(entries[i], i + 1, entries.length);
    }
  }
}

async function runParallel(entries, concurrency) {
  var idx = 0;
  var workers = [];
  for (var w = 0; w < concurrency; w++) {
    workers.push((async function () {
      while (idx < entries.length) {
        var i = idx++;
        await replayOne(entries[i], i + 1, entries.length);
      }
    })());
  }
  await Promise.all(workers);
}

function loadEntries(filePath) {
  return new Promise(function (resolve, reject) {
    var entries = [];
    var rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });

    rl.on('line', function (line) {
      line = line.trim();
      if (!line) return;
      try {
        var entry = JSON.parse(line);
        if (entry.download) return;
        if (!entry.response) return;
        if (entry.path && entry.path.indexOf('/jbrowse/') === 0) return;
        if (args.max && entries.length >= args.max) return;
        entries.push(entry);
      } catch (e) {
        console.error('Skipping malformed line:', e.message);
      }
    });

    rl.on('close', function () { resolve(entries); });
    rl.on('error', reject);
  });
}

async function replayOne(entry, idx, total) {
  stats.total++;
  var targetUrl = args.endpoint.replace(/\/+$/, '') + entry.path;
  var parsed = new URL(targetUrl);
  var isHttps = parsed.protocol === 'https:';
  var mod = isHttps ? https : http;

  var reqOpts = {
    hostname: parsed.hostname,
    port: parsed.port || (isHttps ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method: entry.method || 'POST',
    headers: {
      'Accept': entry.accept || 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': entry.contentType || 'application/rqlquery+x-www-form-urlencoded'
    },
    timeout: args.timeout
  };

  if (entry.range) {
    reqOpts.headers['Range'] = entry.range;
  }

  if (args.token) {
    reqOpts.headers['Authorization'] = args.token;
  }

  var body = null;
  if (entry.method === 'POST' && entry.query) {
    body = entry.query;
    reqOpts.headers['Content-Length'] = Buffer.byteLength(body);
  } else if (entry.method === 'GET' && entry.query) {
    reqOpts.path += (reqOpts.path.indexOf('?') === -1 ? '?' : '&') + entry.query;
  }

  var startTime = Date.now();

  try {
    var result = await makeRequest(mod, reqOpts, body);
    var elapsed = Date.now() - startTime;

    var comparison = compareResponses(entry.response, result.body, entry.accept);

    var record = {
      idx: idx,
      path: entry.path,
      method: entry.method,
      query: truncate(entry.query, 120),
      originalStatus: entry.status,
      replayStatus: result.statusCode,
      originalMs: entry.elapsed,
      replayMs: elapsed,
      speedRatio: entry.elapsed > 0 ? (elapsed / entry.elapsed).toFixed(2) : 'N/A',
      match: comparison.match,
      diff: comparison.diff
    };

    stats.totalOriginalMs += entry.elapsed || 0;
    stats.totalReplayMs += elapsed;

    if (comparison.note) {
      record.note = comparison.note;
    }

    if (comparison.match && result.statusCode === entry.status) {
      stats.passed++;
      if (!args.failOnly && !args.summary) {
        printResult(comparison.note ? 'SKIP' : 'PASS', record, idx, total);
      }
    } else {
      stats.failed++;
      if (!args.summary) {
        printResult('FAIL', record, idx, total);
      }
    }

    if (outputStream) {
      outputStream.write(JSON.stringify(record) + '\n');
    }
  } catch (err) {
    stats.errors++;
    if (!args.summary) {
      console.log('[' + idx + '/' + total + '] ERROR ' + entry.method + ' ' + entry.path + ' — ' + err.message);
    }
    if (outputStream) {
      outputStream.write(JSON.stringify({
        idx: idx,
        path: entry.path,
        method: entry.method,
        error: err.message
      }) + '\n');
    }
  }
}

function makeRequest(mod, opts, body) {
  return new Promise(function (resolve, reject) {
    var req = mod.request(opts, function (res) {
      var chunks = [];

      var stream = res;
      var encoding = res.headers['content-encoding'];
      if (encoding === 'gzip') {
        stream = res.pipe(zlib.createGunzip());
      } else if (encoding === 'deflate') {
        stream = res.pipe(zlib.createInflate());
      }

      stream.on('data', function (chunk) { chunks.push(chunk); });
      stream.on('end', function () {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf-8')
        });
      });
      stream.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', function () {
      req.destroy(new Error('Request timed out after ' + opts.timeout + 'ms'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function compareResponses(original, replayed, accept) {
  if (!original && !replayed) {
    return { match: true, diff: null };
  }

  var isJson = !accept || accept.indexOf('json') !== -1;

  if (isJson) {
    var origObj, replayObj;
    var origParsed = false, replayParsed = false;

    try { origObj = JSON.parse(original); origParsed = true; } catch (e) {}
    try { replayObj = JSON.parse(replayed); replayParsed = true; } catch (e) {}

    if (!origParsed && replayParsed) {
      return { match: true, diff: null, note: 'original response was truncated, skipping comparison' };
    }
    if (origParsed && replayParsed) {
      return deepCompare(origObj, replayObj);
    }
  }

  if (original === replayed) {
    return { match: true, diff: null };
  }

  return {
    match: false,
    diff: stringDiff(original, replayed)
  };
}

var IGNORE_PATHS = [
  'responseHeader.QTime',
  'responseHeader.params.NOW',
  'responseHeader.params.appRid',
  'response.maxScore',
  'responseHeader.params.shards.preference'
];

function shouldIgnore(path) {
  for (var i = 0; i < IGNORE_PATHS.length; i++) {
    if (path === '$.' + IGNORE_PATHS[i] || path.endsWith('.' + IGNORE_PATHS[i])) {
      return true;
    }
  }
  return false;
}

function deepCompare(a, b, path) {
  path = path || '$';

  if (shouldIgnore(path)) return { match: true, diff: null };

  if (a === b) return { match: true, diff: null };
  if (a === null || b === null || typeof a !== typeof b) {
    return { match: false, diff: path + ': type mismatch (' + summarize(a) + ' vs ' + summarize(b) + ')' };
  }

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return { match: false, diff: path + ': array vs non-array' };
    }
    if (a.length !== b.length) {
      return { match: false, diff: path + ': array length ' + a.length + ' vs ' + b.length };
    }

    if (args.ignoreOrder && a.length > 0 && typeof a[0] === 'object') {
      a = sortArray(a);
      b = sortArray(b);
    }

    for (var i = 0; i < a.length; i++) {
      var elemResult = deepCompare(a[i], b[i], path + '[' + i + ']');
      if (!elemResult.match) return elemResult;
    }
    return { match: true, diff: null };
  }

  if (typeof a === 'object') {
    var aKeys = Object.keys(a).sort();
    var bKeys = Object.keys(b).sort();

    var missingInB = aKeys.filter(function (k) { return bKeys.indexOf(k) === -1; });
    var extraInB = bKeys.filter(function (k) { return aKeys.indexOf(k) === -1; });

    if (missingInB.length > 0) {
      return { match: false, diff: path + ': missing keys in replay: ' + missingInB.join(', ') };
    }
    if (extraInB.length > 0) {
      return { match: false, diff: path + ': extra keys in replay: ' + extraInB.join(', ') };
    }

    for (var j = 0; j < aKeys.length; j++) {
      var key = aKeys[j];
      var propResult = deepCompare(a[key], b[key], path + '.' + key);
      if (!propResult.match) return propResult;
    }
    return { match: true, diff: null };
  }

  if (a !== b) {
    return { match: false, diff: path + ': ' + summarize(a) + ' vs ' + summarize(b) };
  }

  return { match: true, diff: null };
}

function sortArray(arr) {
  return arr.slice().sort(function (a, b) {
    return JSON.stringify(a) < JSON.stringify(b) ? -1 : 1;
  });
}

function summarize(val) {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  var s = JSON.stringify(val);
  return s.length > 80 ? s.slice(0, 77) + '...' : s;
}

function stringDiff(a, b) {
  if (a.length !== b.length) {
    return 'length ' + a.length + ' vs ' + b.length;
  }
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return 'first diff at char ' + i + ': "...' + a.slice(Math.max(0, i - 20), i + 20) + '..." vs "...' + b.slice(Math.max(0, i - 20), i + 20) + '..."';
    }
  }
  return 'unknown difference';
}

function truncate(s, len) {
  if (!s) return '';
  return s.length > len ? s.slice(0, len - 3) + '...' : s;
}

function printResult(status, record, idx, total) {
  var prefix = '[' + idx + '/' + total + '] ' + status;
  var timing = record.originalMs + 'ms → ' + record.replayMs + 'ms (' + record.speedRatio + 'x)';
  var line = prefix + ' ' + record.method + ' ' + record.path + '  ' + timing;

  if (record.originalStatus !== record.replayStatus) {
    line += '  status: ' + record.originalStatus + ' → ' + record.replayStatus;
  }

  console.log(line);

  if (record.query && status === 'FAIL') {
    console.log('       query: ' + record.query);
  }
  if (record.diff && status === 'FAIL') {
    console.log('       diff:  ' + record.diff);
  }
  if (record.note) {
    console.log('       note:  ' + record.note);
  }
}

function printSummary() {
  console.log('');
  console.log('=== Summary ===');
  console.log('Total:   ' + stats.total);
  console.log('Passed:  ' + stats.passed);
  console.log('Failed:  ' + stats.failed);
  console.log('Errors:  ' + stats.errors);
  console.log('');
  if (stats.total > 0) {
    console.log('Original total time: ' + stats.totalOriginalMs + 'ms');
    console.log('Replay total time:   ' + stats.totalReplayMs + 'ms');
    console.log('Avg original:        ' + Math.round(stats.totalOriginalMs / stats.total) + 'ms');
    console.log('Avg replay:          ' + Math.round(stats.totalReplayMs / stats.total) + 'ms');
    var ratio = stats.totalOriginalMs > 0 ? (stats.totalReplayMs / stats.totalOriginalMs).toFixed(2) : 'N/A';
    console.log('Overall speed ratio: ' + ratio + 'x');
  }
}

function parseArgs(argv) {
  var result = {
    logFile: null,
    endpoint: null,
    token: null,
    concurrency: 1,
    timeout: 120000,
    failOnly: false,
    summary: false,
    output: null,
    ignoreOrder: false,
    max: 0,
    help: false
  };

  var positional = 0;
  for (var i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--token': result.token = argv[++i]; break;
      case '--concurrency': result.concurrency = parseInt(argv[++i], 10) || 1; break;
      case '--timeout': result.timeout = parseInt(argv[++i], 10) || 120000; break;
      case '--fail-only': result.failOnly = true; break;
      case '--summary': result.summary = true; break;
      case '--output': result.output = argv[++i]; break;
      case '--ignore-order': result.ignoreOrder = true; break;
      case '--max': result.max = parseInt(argv[++i], 10) || 0; break;
      case '--help': case '-h': result.help = true; break;
      default:
        if (argv[i].startsWith('-')) {
          console.error('Unknown option: ' + argv[i]);
          result.help = true;
        } else if (positional === 0) {
          result.logFile = argv[i];
          positional++;
        } else if (positional === 1) {
          result.endpoint = argv[i];
          positional++;
        }
    }
  }

  return result;
}
