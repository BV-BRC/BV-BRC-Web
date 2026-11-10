/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * FastaFormatStore — presets from a configured workspace folder, plus the
 * user's own saved formats.
 *
 * The workspace is stubbed, but the response shapes are the real ones,
 * captured from alpha against /olson@patricbrc.org/tmp/presets:
 *
 *   Workspace.ls  -> { result: [ { "<path>": [ [name, type, ...], ... ] } ] }
 *   Workspace.get -> { result: [ [ [ [meta...], "<file contents>" ] ] ] }
 *                     ...where result[0][0][1] is the data.
 *
 * Getting that indexing wrong is the most likely way this module breaks, so
 * the fixtures mirror it exactly rather than being simplified.
 */

const PRESETS_PATH = '/olson@patricbrc.org/tmp/presets';

/** A real preset file, as seeded on alpha. */
const NCBI_CLASSIC = {
  name: 'NCBI / BLAST (classic)',
  description: 'ID, product, and organism in brackets.',
  dataType: 'genome_feature',
  mode: 'template',
  template: '{patric_id} {product} [{genome_name}]'
};

const GISAID_SEQUENCE = {
  name: 'GISAID style (sequence level)',
  dataType: 'genome_sequence',
  mode: 'template',
  template: '{accession}|{segment}|{strain}'
};

/**
 * Load the AMD module with stubbed dependencies.
 *
 * `rpc` receives every anonymous Workspace call so a test can assert on it;
 * `workspaceManager` stands in for the authenticated surface.
 */
function loadStore(opts) {
  const o = opts || {};
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'FastaFormatStore.js'), 'utf8'
  );

  // Minimal Deferred/when, enough for the module's synchronous stubs.
  function Deferred() {
    this._cbs = [];
    this._errs = [];
    this._done = false;
    this._failed = false;
    this._value = undefined;
    const self = this;
    this.resolve = function (v) {
      self._done = true; self._value = v;
      self._cbs.forEach((cb) => cb(v));
    };
    this.reject = function (e) {
      self._done = true; self._failed = true; self._value = e;
      self._errs.forEach((cb) => cb(e));
    };
    this.promise = {
      then: function (ok, err) {
        if (self._done) {
          if (self._failed) { if (err) err(self._value); } else if (ok) ok(self._value);
        } else {
          if (ok) self._cbs.push(ok);
          if (err) self._errs.push(err);
        }
        return this;
      }
    };
  }

  function when(value, ok, err) {
    if (value && typeof value.then === 'function') return value.then(ok, err);
    if (ok) ok(value);
    return value;
  }

  const calls = [];
  const rpcImpl = o.rpc || (() => { throw new Error('unexpected rpc call'); });
  const RPC = function () {
    return function (method, params) {
      calls.push({ method, params });
      return rpcImpl(method, params);
    };
  };

  let exported;
  const define = function (deps, factory) {
    exported = factory(Deferred, when, o.workspaceManager || {}, RPC);
  };
  // eslint-disable-next-line no-new-func
  new Function('define', src)(define);

  return { store: exported, calls };
}

/** Build a Workspace.ls reply in the real shape. */
function lsReply(p, names) {
  const listing = {};
  listing[p] = names.map((n) => [
    n, /\.json$/.test(n) ? 'json' : 'folder', p + '/', '2026-10-31T02:17:05Z',
    'id', 'olson@patricbrc.org', 123, {}, {}, 'o', 'r', ''
  ]);
  return { 0: listing, length: 1 };
}

/** Workspace.get reply: result[0][0][1] holds the data. */
function getReply(contents) {
  return [[[['meta'], contents]]];
}

function makeRpc(files) {
  return function (method, params) {
    if (method === 'Workspace.ls') {
      const p = params[0].paths[0];
      if (!files) return [{}];               // nonexistent path
      const listing = {};
      listing[p] = Object.keys(files).map((n) => [
        n, 'json', p + '/', 't', 'id', 'o', 1, {}, {}, 'o', 'r', ''
      ]);
      return [listing];
    }
    if (method === 'Workspace.get') {
      const obj = params[0].objects[0];
      const name = obj.split('/').pop();
      if (!(name in files)) throw new Error('not found');
      return getReply(files[name]);
    }
    throw new Error('unexpected method ' + method);
  };
}

beforeEach(() => {
  global.window = {
    App: {
      workspaceAPI: '/services/Workspace',
      fastaFormatPresetsPath: PRESETS_PATH
    }
  };
  global.console = Object.assign({}, console, { warn: jest.fn() });
});

afterEach(() => {
  delete global.window;
});

describe('FastaFormatStore presets', () => {
  test('loads presets from the configured folder', () => {
    const { store } = loadStore({
      rpc: makeRpc({
        'ncbi-classic.json': JSON.stringify(NCBI_CLASSIC),
        'gisaid-sequence.json': JSON.stringify(GISAID_SEQUENCE)
      })
    });

    let got;
    store.loadPresets().then((p) => { got = p; });

    expect(got.map((f) => f.name).sort())
      .toEqual(['GISAID style (sequence level)', 'NCBI / BLAST (classic)']);
    expect(got.every((f) => f.isPreset)).toBe(true);
    expect(got[0].sourcePath).toContain(PRESETS_PATH);
  });

  test('reads the data from result[0][0][1], the real Workspace.get shape', () => {
    const { store } = loadStore({
      rpc: makeRpc({ 'a.json': JSON.stringify(NCBI_CLASSIC) })
    });

    let got;
    store.loadPresets().then((p) => { got = p; });

    expect(got).toHaveLength(1);
    expect(got[0].template).toBe('{patric_id} {product} [{genome_name}]');
  });

  test('no config means no presets, and no workspace call', () => {
    global.window.App.fastaFormatPresetsPath = '';
    const { store, calls } = loadStore({});

    let got;
    store.loadPresets().then((p) => { got = p; });

    expect(got).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  test('a trailing slash in the config is tolerated', () => {
    global.window.App.fastaFormatPresetsPath = PRESETS_PATH + '/';
    const { store, calls } = loadStore({
      rpc: makeRpc({ 'a.json': JSON.stringify(NCBI_CLASSIC) })
    });

    store.loadPresets();
    expect(calls[0].params[0].paths[0]).toBe(PRESETS_PATH);
  });

  describe('a misconfigured path', () => {
    /**
     * The workspace returns an EMPTY RESULT for a nonexistent path rather
     * than an error -- verified on alpha -- so a typo'd config is otherwise
     * completely invisible. The warning is the only signal.
     */
    test('resolves empty and warns', () => {
      const { store } = loadStore({ rpc: makeRpc(null) });

      let got;
      store.loadPresets().then((p) => { got = p; });

      expect(got).toEqual([]);
      expect(console.warn).toHaveBeenCalled();
      expect(console.warn.mock.calls[0][0]).toContain(PRESETS_PATH);
    });

    test('a service error is also non-fatal', () => {
      const { store } = loadStore({
        rpc: () => { throw new Error('permission denied'); }
      });

      let got;
      // The stub throws synchronously; the module must not propagate it.
      expect(() => store.loadPresets().then((p) => { got = p; })).not.toThrow();
      expect(got).toEqual([]);
    });
  });

  describe('malformed presets', () => {
    test('an unparseable file is skipped, not fatal', () => {
      const { store } = loadStore({
        rpc: makeRpc({
          'good.json': JSON.stringify(NCBI_CLASSIC),
          'bad.json': '{ not json'
        })
      });

      let got;
      store.loadPresets().then((p) => { got = p; });

      expect(got).toHaveLength(1);
      expect(got[0].name).toBe('NCBI / BLAST (classic)');
      expect(console.warn).toHaveBeenCalled();
    });

    test('a record missing its template is rejected', () => {
      const { store } = loadStore({
        rpc: makeRpc({
          'empty.json': JSON.stringify({ name: 'x', mode: 'template', template: '' })
        })
      });

      let got;
      store.loadPresets().then((p) => { got = p; });
      expect(got).toEqual([]);
    });

    test('a record with no name is rejected', () => {
      const { store } = loadStore({
        rpc: makeRpc({ 'x.json': JSON.stringify({ mode: 'template', template: '{a}' }) })
      });

      let got;
      store.loadPresets().then((p) => { got = p; });
      expect(got).toEqual([]);
    });

    test('a grouped { formats: [...] } file is accepted', () => {
      const { store } = loadStore({
        rpc: makeRpc({
          'group.json': JSON.stringify({ formats: [NCBI_CLASSIC, GISAID_SEQUENCE] })
        })
      });

      let got;
      store.loadPresets().then((p) => { got = p; });
      expect(got).toHaveLength(2);
    });

    test('non-json files in the folder are ignored', () => {
      const { store, calls } = loadStore({
        rpc: function (method, params) {
          if (method === 'Workspace.ls') {
            const p = params[0].paths[0];
            const listing = {};
            listing[p] = [
              ['readme.txt', 'unspecified', p + '/', 't', 'i', 'o', 1, {}, {}, 'o', 'r', ''],
              ['subfolder', 'folder', p + '/', 't', 'i', 'o', 0, {}, {}, 'o', 'r', ''],
              ['a.json', 'json', p + '/', 't', 'i', 'o', 1, {}, {}, 'o', 'r', '']
            ];
            return [listing];
          }
          return getReply(JSON.stringify(NCBI_CLASSIC));
        }
      });

      let got;
      store.loadPresets().then((p) => { got = p; });

      expect(got).toHaveLength(1);
      // Only the .json file was fetched.
      expect(calls.filter((c) => c.method === 'Workspace.get')).toHaveLength(1);
    });
  });

  test('presets are fetched once and cached', () => {
    const { store, calls } = loadStore({
      rpc: makeRpc({ 'a.json': JSON.stringify(NCBI_CLASSIC) })
    });

    store.loadPresets();
    store.loadPresets();
    store.loadPresets();

    expect(calls.filter((c) => c.method === 'Workspace.ls')).toHaveLength(1);
  });

  describe('signed out', () => {
    /**
     * The whole reason presets use their own RPC client: WorkspaceManager.api
     * is assigned only inside init(), which returns early without a token, so
     * it is undefined for an anonymous visitor. Presets must still load.
     */
    test('presets load with no user and no WorkspaceManager client', () => {
      const { store } = loadStore({
        rpc: makeRpc({ 'a.json': JSON.stringify(NCBI_CLASSIC) }),
        workspaceManager: {}   // no .api, as when signed out
      });

      let got;
      store.loadPresets().then((p) => { got = p; });
      expect(got).toHaveLength(1);
    });

    test('canSave is false', () => {
      const { store } = loadStore({ rpc: makeRpc({}) });
      expect(store.canSave()).toBe(false);
    });

    test('user formats resolve empty rather than erroring', () => {
      const { store } = loadStore({ rpc: makeRpc({}) });

      let got;
      store.loadUserFormats().then((f) => { got = f; });
      expect(got).toEqual([]);
    });

    test('save rejects with a sign-in message', () => {
      const { store } = loadStore({ rpc: makeRpc({}) });

      let err;
      store.save(NCBI_CLASSIC).then(null, (e) => { err = e; });
      expect(err.message).toMatch(/Sign in/);
    });
  });

  describe('list()', () => {
    test('filters by dataType', () => {
      const { store } = loadStore({
        rpc: makeRpc({
          'a.json': JSON.stringify(NCBI_CLASSIC),      // genome_feature
          'b.json': JSON.stringify(GISAID_SEQUENCE)    // genome_sequence
        })
      });

      let feature;
      store.list('genome_feature').then((f) => { feature = f; });
      expect(feature.map((f) => f.name)).toEqual(['NCBI / BLAST (classic)']);

      let sequence;
      store.list('genome_sequence').then((f) => { sequence = f; });
      expect(sequence.map((f) => f.name)).toEqual(['GISAID style (sequence level)']);
    });

    test('a format with no dataType is offered everywhere', () => {
      const { store } = loadStore({
        rpc: makeRpc({
          'any.json': JSON.stringify({
            name: 'Any', mode: 'template', template: '{patric_id}'
          })
        })
      });

      let got;
      store.list('genome_sequence').then((f) => { got = f; });
      expect(got.map((f) => f.name)).toEqual(['Any']);
    });

    test('without a dataType, everything is returned', () => {
      const { store } = loadStore({
        rpc: makeRpc({
          'a.json': JSON.stringify(NCBI_CLASSIC),
          'b.json': JSON.stringify(GISAID_SEQUENCE)
        })
      });

      let got;
      store.list().then((f) => { got = f; });
      expect(got).toHaveLength(2);
    });
  });
});
