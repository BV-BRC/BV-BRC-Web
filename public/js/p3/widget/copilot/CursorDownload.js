/**
 * Cursor-paged downloads for the data-API links in Copilot answers.
 *
 * The data API returns at most 25,000 rows per request, whatever limit() the
 * link asks for, so a download link for 57,445 Salmonella genomes saved
 * 25,000 rows and said nothing.  The API pages with cursor(<mark>) (sorted on
 * the collection's unique key) and returns the next mark in X-Cursor-Mark,
 * for TSV and FASTA alike; this module fetches every page and joins them into
 * one file.  ChatMessage intercepts the click and shows the progress.
 *
 * Pure functions plus run(), which takes fetch as an argument, so it is
 * testable under Jest (tests/CursorDownload.test.js).
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CopilotCursorDownload = factory();
  }
}(this, function () {
  var PAGE_SIZE = 25000; // the API's per-request maximum
  var CONFIRM_ABOVE_ROWS = 500000; // held in memory until saved, so ask first

  // Solr unique key per collection; a cursor needs the sort on it.
  // Kept in step with COLLECTION_ID_FIELD in bvbrc-agents shared/tools/url_utils.py.
  var UNIQUE_KEY = {
    genome: 'genome_id',
    genome_feature: 'feature_id',
    taxonomy: 'taxon_id',
    epitope: 'epitope_id',
    protein_structure: 'pdb_id',
    genome_amr: 'id',
    genome_sequence: 'sequence_id',
    sp_gene: 'id',
    pathway: 'id',
    subsystem: 'id'
  };

  var FORMATS = {
    'text/tsv': { ext: 'tsv', mime: 'text/tab-separated-values', header: true },
    'text/csv': { ext: 'csv', mime: 'text/csv', header: true },
    'application/dna+fasta': {
      ext: 'fasta', mime: 'text/plain', header: false, suffix: '_dna'
    },
    'application/protein+fasta': {
      ext: 'fasta', mime: 'text/plain', header: false, suffix: '_protein'
    }
  };

  var PATH_RE = /^\/(api|api-bulk)\/([a-z_]+)\/?$/;

  function decode(part) {
    try {
      return decodeURIComponent(part.replace(/\+/g, '%2B'));
    } catch (e) {
      return part;
    }
  }

  /**
   * A BV-BRC data download link, taken apart; null for any other link.
   * @returns {{origin, path, collection, accept, format, parts: string[], hasSort: boolean}|null}
   */
  function parseDownloadUrl(href) {
    var url;
    try {
      url = new URL(href);
    } catch (e) {
      return null;
    }
    if (!/(^|\.)bv-brc\.org$/.test(url.hostname)) return null;
    var match = PATH_RE.exec(url.pathname);
    if (!match) return null;

    var parts = [];
    var accept = null;
    var download = false;
    var hasSort = false;
    url.search.replace(/^\?/, '').split('&').forEach(function (part) {
      if (!part) return;
      var plain = decode(part);
      if (/^http_download=/.test(plain)) {
        download = /=true$/.test(plain);
      } else if (/^http_accept=/.test(plain)) {
        accept = plain.slice('http_accept='.length);
      } else if (/^(limit|cursor)\(/.test(plain)) {
        // replaced per page
      } else {
        if (/^sort\(/.test(plain)) hasSort = true;
        parts.push(part);
      }
    });
    if (!download || !FORMATS[accept]) return null;
    return {
      origin: url.origin,
      path: url.pathname.replace(/\/?$/, '/'),
      collection: match[2],
      accept: accept,
      format: FORMATS[accept],
      parts: parts,
      hasSort: hasSort
    };
  }

  /** True when the link can be paged (it is sorted, or we know the unique key). */
  function canPage(parsed) {
    return !!parsed && (parsed.hasSort || !!UNIQUE_KEY[parsed.collection]);
  }

  /** The URL of one page: the link's query, its sort, cursor(mark), limit(size). */
  function pageUrl(parsed, cursorMark, size) {
    var parts = parsed.parts.slice();
    if (!parsed.hasSort) parts.push('sort(+' + UNIQUE_KEY[parsed.collection] + ')');
    parts.push('cursor(' + encodeURIComponent(cursorMark) + ')');
    parts.push('limit(' + size + ')');
    parts.push('http_accept=' + parsed.accept);
    return parsed.origin + parsed.path + '?' + parts.join('&');
  }

  /** Total from "items 0-25000/57445"; null when absent. */
  function totalFromRange(range) {
    var m = /\/(\d+)\s*$/.exec(range || '');
    return m ? parseInt(m[1], 10) : null;
  }

  /** A page's text ready to append: TSV/CSV pages after the first lose their header (the API repeats it). */
  function pageBody(text, format, isFirst) {
    var body = text || '';
    if (format.header && !isFirst) {
      var nl = body.indexOf('\n');
      body = nl === -1 ? '' : body.slice(nl + 1);
    }
    if (body && body.charAt(body.length - 1) !== '\n') body += '\n';
    return body;
  }

  /** Records on a page: data lines for tables (every page has a header), '>' lines for FASTA. */
  function countRecords(text, format) {
    if (!text) return 0;
    if (format.header) {
      var lines = text.split('\n').filter(function (l) { return l.length > 0; }).length;
      return Math.max(0, lines - 1);
    }
    var m = text.match(/^>/gm);
    return m ? m.length : 0;
  }

  function fileName(parsed, total) {
    return parsed.collection + (parsed.format.suffix || '') + '_' + total + '.' + parsed.format.ext;
  }

  /**
   * Save-dialog details for a link: the suggested name (no row count, which
   * is not known yet when the dialog opens) and the file type.  Null for a
   * link this module does not page.
   */
  function saveOptions(href) {
    var parsed = parseDownloadUrl(href);
    if (!canPage(parsed)) return null;
    var accept = {};
    accept[parsed.format.mime] = ['.' + parsed.format.ext];
    return {
      suggestedName: parsed.collection + (parsed.format.suffix || '') + '.' + parsed.format.ext,
      types: [{ description: parsed.format.ext.toUpperCase() + ' file', accept: accept }]
    };
  }

  /**
   * Fetch every page.  opts: {fetch, token, pageSize, confirmLarge(total) -> Promise<bool>,
   * onProgress(rows, total), isCancelled() -> bool, sink}.
   *
   * Without a sink the pages are kept and joined by the caller (resolves
   * {parts, rows, total, fileName, mime}); above CONFIRM_ABOVE_ROWS it asks
   * first, since all of it is in memory until saved.  With a sink
   * ({write(text) -> Promise}: a file the browser writes as we go, File
   * System Access API) each page is written as it arrives and dropped, so
   * memory stays at one page and nothing is asked (resolves
   * {rows, total, streamed: true}).  Either way {cancelled: true} on cancel;
   * closing or aborting the sink is the caller's.
   */
  function run(href, opts) {
    var parsed = parseDownloadUrl(href);
    if (!canPage(parsed)) return Promise.reject(new Error('Not a pageable BV-BRC download link'));
    var doFetch = opts.fetch;
    var size = opts.pageSize || PAGE_SIZE;
    var headers = {};
    if (opts.token) headers.Authorization = opts.token; // data API takes the bare token
    var cancelled = function () { return !!(opts.isCancelled && opts.isCancelled()); };

    function get(mark, limit) {
      return doFetch(pageUrl(parsed, mark, limit), { headers: headers }).then(function (resp) {
        if (!resp.ok) throw new Error('The data API answered HTTP ' + resp.status);
        return resp.text().then(function (text) {
          return {
            text: text,
            total: totalFromRange(resp.headers.get('Content-Range')),
            next: resp.headers.get('X-Cursor-Mark')
          };
        });
      });
    }

    // One-row probe for the total, so a very large download is confirmed
    // before anything big is fetched.
    return get('*', 1).then(function (probe) {
      var total = probe.total;
      var sink = opts.sink || null;
      var ask = (!sink && total !== null && total > CONFIRM_ABOVE_ROWS && opts.confirmLarge)
        ? opts.confirmLarge(total) : Promise.resolve(true);
      return Promise.resolve(ask).then(function (ok) {
        if (!ok) return { cancelled: true };
        var parts = [];
        var rows = 0;
        var step = function (mark, isFirst) {
          if (cancelled()) return { cancelled: true };
          return get(mark, size).then(function (page) {
            if (cancelled()) return { cancelled: true };
            var n = countRecords(page.text, parsed.format);
            var body = pageBody(page.text, parsed.format, isFirst);
            var written = Promise.resolve();
            if (body && sink) {
              written = sink.write(body);
            } else if (body) {
              parts.push(body);
            }
            return Promise.resolve(written).then(function () {
              rows += n;
              if (page.total !== null) total = page.total;
              if (opts.onProgress) opts.onProgress(rows, total);
              var done = n === 0 || !page.next || page.next === mark || (total !== null && rows >= total);
              return done ? null : step(page.next, false);
            });
          });
        };
        return Promise.resolve(step('*', true)).then(function (stop) {
          if (stop && stop.cancelled) return stop;
          if (sink) return { rows: rows, total: total, streamed: true };
          return {
            parts: parts,
            rows: rows,
            total: total,
            fileName: fileName(parsed, rows),
            mime: parsed.format.mime
          };
        });
      });
    });
  }

  return {
    PAGE_SIZE: PAGE_SIZE,
    CONFIRM_ABOVE_ROWS: CONFIRM_ABOVE_ROWS,
    parseDownloadUrl: parseDownloadUrl,
    canPage: canPage,
    pageUrl: pageUrl,
    totalFromRange: totalFromRange,
    pageBody: pageBody,
    countRecords: countRecords,
    saveOptions: saveOptions,
    run: run
  };
}));
