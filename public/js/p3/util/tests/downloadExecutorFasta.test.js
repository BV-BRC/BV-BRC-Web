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
    // A working Deferred: the validation gate returns one and callers
    // attach to it, so a no-op stub is no longer enough.
    'dojo/Deferred': function () {
      const self = this;
      let settled = null;
      const oks = [];
      const errs = [];
      this.resolve = function (v) {
        settled = { ok: true, v: v };
        oks.forEach(function (f) { f(v); });
      };
      this.reject = function (e) {
        settled = { ok: false, v: e };
        errs.forEach(function (f) { f(e); });
      };
      this.then = function (ok, err) {
        if (settled) {
          if (settled.ok) { if (ok) ok(settled.v); } else if (err) err(settled.v);
        } else {
          if (ok) oks.push(ok);
          if (err) errs.push(err);
        }
        return self;
      };
      this.promise = this;
    },
    'dojo/_base/lang': { mixin: Object.assign },
    'dojo/when': function (v, cb, eb) {
      if (v && typeof v.then === 'function') return v.then(cb, eb);
      if (cb) cb(v);
      return v;
    },
    'dojo/request/xhr': {
      post: function (url, opts) {
        captured.posts = captured.posts || [];
        captured.posts.push({ url: url, data: opts && opts.data });
        captured.url = url;
        captured.data = opts && opts.data;
        if (typeof captured.onPost === 'function') {
          var forced = captured.onPost(url, opts);
          if (forced) return forced;
        }
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

describe('strict validation of a format string', () => {
  /**
   * The API renders an unknown field as an empty string and returns 200 by
   * default, so a typo like {hostname} produces a silently truncated header
   * in every record. `http_fasta_strict=true` turns that into a 400 naming
   * the fields. Measured on alpha: the 400 arrives in ~250ms at limit(0),
   * before any rows are fetched, so it is cheap enough to precede the
   * download.
   */
  function run(opts) {
    const captured = {};
    captured.onPost = opts.onPost;
    const Executor = loadExecutor(makeStubs(captured));
    let resolved = false;
    let rejected = null;
    Executor.execute({
      format: 'protein+fasta',
      dataType: 'genome_feature',
      scope: 'all',
      rqlQuery: 'eq(genome_id,83332.12)',
      primaryKey: 'feature_id',
      fastaConfig: opts.fastaConfig
    }, opts.options || { forceClientSide: true }).then(
      function () { resolved = true; },
      function (e) { rejected = e; }
    );
    return { captured, resolved, rejected };
  }

  const TEMPLATE = { headerTemplate: '{patric_id} {hostname}' };

  test('a template download preflights with strict mode at limit(0)', () => {
    const r = run({ fastaConfig: TEMPLATE });
    const first = r.captured.posts[0];

    expect(first.url).toContain('http_fasta_strict=true');
    expect(first.url).toContain('http_fasta_header=');
    expect(first.data).toContain('limit(0)');
    expect(first.data).not.toContain('limit(2500000)');
  });

  test('a rejected preflight surfaces the server message and stops the download', () => {
    const message = 'http_fasta_header references unknown field(s): hostname. '
      + 'See /genome_feature/fields for the fields this collection can return.';
    let calls = 0;
    const r = run({
      fastaConfig: TEMPLATE,
      onPost: function () {
        calls++;
        if (calls > 1) return null;   // only the preflight fails
        return {
          then: function (ok, err) {
            err({ response: { status: 400, data: JSON.stringify({ message: message }) } });
            return this;
          }
        };
      }
    });

    expect(r.rejected).toBeTruthy();
    expect(r.rejected.message).toBe(message);
    // The real download never ran.
    expect(r.captured.posts).toHaveLength(1);
  });

  test('a passing preflight lets the download proceed', () => {
    const r = run({ fastaConfig: TEMPLATE });
    // Preflight, then the actual request.
    expect(r.captured.posts.length).toBeGreaterThan(1);
    expect(r.captured.posts[1].url).not.toContain('http_fasta_strict=true');
  });

  describe('validation never blocks on anything but a 400', () => {
    /**
     * Strict mode is an improvement on the status quo, not a gate. A
     * deployment without it, a timeout, or a network blip must let the
     * download through rather than refusing it.
     */
    test.each([
      ['a 404 (strict mode not deployed)', { response: { status: 404 } }],
      ['a 500', { response: { status: 500 } }],
      ['a timeout with no response', { message: 'timeout' }],
      ['a 400 with an unparseable body', { response: { status: 400, data: 'not json' } }]
    ])('%s still downloads', (_name, err) => {
      let calls = 0;
      const r = run({
        fastaConfig: TEMPLATE,
        onPost: function () {
          calls++;
          if (calls > 1) return null;
          return { then: function (ok, e) { e(err); return this; } };
        }
      });

      expect(r.rejected).toBeNull();
      expect(r.captured.posts.length).toBeGreaterThan(1);
    });
  });

  test('zone-mode downloads skip the preflight entirely', () => {
    // Zone parameters are built from a picker, so they cannot carry an
    // unknown field reference -- no point paying for a round trip.
    const r = run({
      fastaConfig: {
        idFields: ['patric_id'],
        descriptionFields: ['strain'],
        descriptionDelimiter: ' | '
      }
    });

    expect(r.captured.posts).toHaveLength(1);
    expect(r.captured.posts[0].url).not.toContain('http_fasta_strict=true');
  });

  test('no FASTA config at all skips it', () => {
    const r = run({ fastaConfig: null });
    expect(r.captured.posts[0].url).not.toContain('http_fasta_strict=true');
  });
});

describe('a configured API base with a trailing slash', () => {
  /**
   * DownloadExecutor joins DATA_API_URL with '/' + dataType, so a base
   * ending in a slash produced `/proxyapi//genome_feature/?...` -- a 404,
   * which loses the download entirely rather than merely degrading it.
   * Same root cause as the field picker falling back on alpha.
   */
  function urlFor(base) {
    const captured = {};
    global.window = { App: { dataServiceURL: base } };
    const Executor = loadExecutor(makeStubs(captured));
    Executor.execute({
      format: 'protein+fasta',
      dataType: 'genome_feature',
      scope: 'all',
      rqlQuery: 'eq(genome_id,83332.12)',
      primaryKey: 'feature_id',
      fastaConfig: { idFields: ['patric_id'], descriptionFields: [] }
    }, { forceClientSide: true });
    return captured.url;
  }

  test.each([
    ['/proxyapi/'],
    ['/proxyapi'],
    ['/proxyapi//']
  ])('base %p never doubles the slash', (base) => {
    const url = urlFor(base);
    expect(url).toContain('/proxyapi/genome_feature/');
    expect(url).not.toContain('//genome_feature');
  });
});

describe('sort clause when primaryKey is omitted', () => {
  /**
   * A saved-search download produced a zero-byte file. buildQuery fell
   * back to a bare 'id' for the primary key and emitted
   * sort(+feature_id,+id) -- genome_feature has no `id` field, and the
   * http_download path answers an unknown sort field with 200 and an
   * EMPTY body rather than an error, so nothing surfaced.
   *
   * Confirmed identical on alpha and production.
   */
  function sortIn(spec) {
    const captured = {};
    const Executor = loadExecutor(makeStubs(captured));
    Executor.execute(Object.assign({
      format: 'protein+fasta',
      dataType: 'genome_feature',
      scope: 'all',
      rqlQuery: 'eq(genome_id,83332.12)'
    }, spec), { forceClientSide: true });
    const m = (captured.data || '').match(/sort\(([^)]*)\)/);
    return m ? m[1] : null;
  }

  test('no bare id for a collection that has none', () => {
    const sort = sortIn({});           // primaryKey omitted
    expect(sort).not.toMatch(/\+id\b/);
  });

  test('falls back to the collection primary key', () => {
    expect(sortIn({})).toBe('+feature_id');
  });

  test('an explicit primaryKey is still honoured', () => {
    expect(sortIn({ primaryKey: 'feature_id' })).toBe('+feature_id');
  });

  test('the uniqueKey is always present — cursorMark requires it', () => {
    expect(sortIn({ sortFieldOverride: 'product' })).toMatch(/\+feature_id/);
  });
});
