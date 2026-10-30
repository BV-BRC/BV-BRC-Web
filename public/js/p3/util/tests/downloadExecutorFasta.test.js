/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * DownloadExecutor's FASTA header parameters.
 *
 * These guard the bug that prompted the work: the wizard preview showed
 * '|'-separated description fields while the download joined them with a
 * space, because the client never sent a delimiter and the server's default
 * was ' '. The invariant worth protecting is that whatever the configurator
 * reports from getData() is what reaches the wire.
 *
 * DownloadExecutor is an AMD module with real dependencies, so load it with a
 * define shim and stub them, following joinTooBroad.test.js. The xhr stub
 * captures the request so we can assert on the query string.
 */
function loadExecutor(stubs) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'DownloadExecutor.js'), 'utf8');
  let exported;
  const define = function (deps, factory) {
    exported = factory.apply(null, deps.map((d) => stubs[d] || stubs._default));
  };
  // eslint-disable-next-line no-new-func
  new Function('define', src)(define);
  return exported;
}

/**
 * The module reads window.App both at load time (DATA_API_URL) and during a
 * download (the auth token), so window must exist for the whole run. jsdom is
 * not installed; a bare global stands in, as retryRequest.test.js does.
 */
beforeEach(() => {
  global.window = { App: { dataServiceURL: '/api/data' } };
  global.document = { body: {} };
});

afterEach(() => {
  delete global.window;
  delete global.document;
});

/** Minimal stand-ins for the dojo modules DownloadExecutor pulls in. */
function makeStubs(captured) {
  const thenable = {
    then: function (ok) { if (ok) ok(''); return thenable; },
    otherwise: function () { return thenable; }
  };

  return {
    _default: function () {},
    'dojo/_base/declare': function () {},
    'dojo/_base/lang': { mixin: Object.assign },
    'dojo/Deferred': function () {
      this.promise = {};
      this.resolve = function () {};
      this.reject = function () {};
    },
    'dojo/when': function (v, cb) { if (cb) cb(v); return v; },
    'dojo/request/xhr': {
      post: function (url, opts) {
        captured.url = url;
        captured.data = opts && opts.data;
        return thenable;
      }
    },
    'dojo/dom-construct': {
      create: function (tag, attrs) {
        // The server-side path builds a hidden form and submits it; capture
        // the action URL, which is where its http_fasta_* params live.
        if (tag === 'form' && attrs && attrs.action) {
          captured.formAction = attrs.action;
        }
        return { submit: function () {}, appendChild: function () {} };
      },
      destroy: function () {}
    },
    'dojo/topic': { publish: function () {} },
    './DownloadFormats': {
      getFormat: function () {
        return { id: 'protein+fasta', mimeType: 'application/protein+fasta', extension: '.fasta' };
      },
      getUniqueKey: function () { return 'feature_id'; },
      getDataTypeConfig: function () { return {}; }
    },
    FileSaver: function () {}
  };
}

function specFor(fastaConfig) {
  return {
    format: 'protein+fasta',
    dataType: 'genome_feature',
    scope: 'all',
    rqlQuery: 'eq(genome_id,83332.12)',
    primaryKey: 'feature_id',
    fastaConfig: fastaConfig
  };
}

/**
 * The client-side route: parameters ride in the POST body.
 * Requires forceClientSide — FASTA formats are serverSide by default.
 */
function queryFor(fastaConfig) {
  const captured = {};
  const Executor = loadExecutor(makeStubs(captured));
  Executor.execute(specFor(fastaConfig), { forceClientSide: true });
  return captured.data || '';
}

/**
 * The server-side route: parameters ride in the form action URL. This is the
 * path a real FASTA download takes, so both must carry the delimiters —
 * they were separate copies of the same code before this change.
 */
function actionUrlFor(fastaConfig) {
  const captured = {};
  const Executor = loadExecutor(makeStubs(captured));
  Executor.execute(specFor(fastaConfig), { forceServerSide: true });
  return captured.formAction || '';
}

/** Pull one http_fasta_* parameter back out, decoded. */
function param(query, name) {
  const m = query.match(new RegExp('[&?]' + name + '=([^&]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

describe('DownloadExecutor FASTA header parameters', () => {
  describe('delimiters reach the request', () => {
    test('sends the description delimiter the configurator reported', () => {
      const q = queryFor({
        idFields: ['patric_id'],
        descriptionFields: ['strain', 'host_name'],
        idDelimiter: '|',
        descriptionDelimiter: ' | '
      });

      expect(param(q, 'http_fasta_description_delimiter')).toBe(' | ');
      expect(param(q, 'http_fasta_id_delimiter')).toBe('|');
    });

    test('sends fields alongside the delimiters', () => {
      const q = queryFor({
        idFields: ['patric_id'],
        descriptionFields: ['strain', 'host_name'],
        descriptionDelimiter: ' | '
      });

      expect(param(q, 'http_fasta_id_fields')).toBe('patric_id');
      expect(param(q, 'http_fasta_description_fields')).toBe('strain,host_name');
    });

    test('url-encodes a delimiter that would otherwise break the query string', () => {
      const q = queryFor({
        idFields: ['patric_id'],
        descriptionFields: ['strain', 'host_name'],
        descriptionDelimiter: ' & '
      });

      // The raw '&' must not appear as a separator...
      expect(q).toContain('http_fasta_description_delimiter=%20%26%20');
      // ...and must survive the round trip.
      expect(param(q, 'http_fasta_description_delimiter')).toBe(' & ');
    });
  });

  describe('absent vs empty delimiter', () => {
    /**
     * An empty string is a meaningful delimiter ("run the fields together"),
     * so it must be transmitted. Absent means "leave the server default
     * alone". Conflating the two via a falsiness check would silently drop
     * the user's choice.
     */
    test('an empty delimiter is sent, not dropped', () => {
      const q = queryFor({
        idFields: ['patric_id'],
        descriptionFields: ['strain'],
        descriptionDelimiter: ''
      });

      expect(q).toContain('http_fasta_description_delimiter=');
      expect(param(q, 'http_fasta_description_delimiter')).toBe('');
    });

    test('an absent delimiter is omitted entirely', () => {
      const q = queryFor({
        idFields: ['patric_id'],
        descriptionFields: ['strain']
      });

      expect(param(q, 'http_fasta_description_delimiter')).toBeUndefined();
      expect(param(q, 'http_fasta_id_delimiter')).toBeUndefined();
      // The field params are still sent.
      expect(param(q, 'http_fasta_id_fields')).toBe('patric_id');
    });
  });

  describe('no FASTA config', () => {
    test('adds no http_fasta_* parameters at all', () => {
      const q = queryFor(null);
      expect(q).not.toContain('http_fasta_');
    });
  });

  describe('server-side path carries the same parameters', () => {
    /**
     * A real FASTA download goes server-side (format.serverSide !== false), so
     * this is the path that actually produced the reported bug. The two paths
     * used to hold duplicate parameter-building code.
     */
    test('delimiters appear in the form action URL', () => {
      const url = actionUrlFor({
        idFields: ['patric_id'],
        descriptionFields: ['strain', 'host_name'],
        idDelimiter: '|',
        descriptionDelimiter: ' | '
      });

      expect(param(url, 'http_fasta_description_delimiter')).toBe(' | ');
      expect(param(url, 'http_fasta_id_delimiter')).toBe('|');
      expect(param(url, 'http_fasta_description_fields')).toBe('strain,host_name');
    });

    test('both paths agree for the same config', () => {
      const cfg = {
        idFields: ['patric_id'],
        descriptionFields: ['strain', 'host_name'],
        idDelimiter: '|',
        descriptionDelimiter: ' | '
      };
      const names = [
        'http_fasta_id_fields',
        'http_fasta_description_fields',
        'http_fasta_id_delimiter',
        'http_fasta_description_delimiter'
      ];

      const q = queryFor(cfg);
      const url = actionUrlFor(cfg);
      names.forEach((n) => expect(param(url, n)).toBe(param(q, n)));
    });
  });
});
