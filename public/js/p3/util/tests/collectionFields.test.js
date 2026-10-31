/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * CollectionFields — the /<collection>/fields loader.
 *
 * Fixtures are real payload fragments from alpha's genome_feature, which
 * reports 88 fields (46 native, 42 enriched). The two behaviours that matter
 * are the filtering rules and the fallback: the endpoint 404s on production
 * while serving on alpha, so load() must never reject and must hand back the
 * caller's own list when it cannot do better.
 */

function loadModule(stubs) {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'CollectionFields.js'), 'utf8'
  );

  function Deferred() {
    this._cbs = [];
    this._errs = [];
    const self = this;
    this._done = false;
    this.resolve = function (v) {
      self._done = true; self._value = v; self._cbs.forEach((cb) => cb(v));
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
    if (value && value.__reject) { if (err) err(value.__reject); return value; }
    if (ok) ok(value);
    return value;
  }

  let exported;
  const define = function (deps, factory) {
    exported = factory(Deferred, when, stubs.request);
  };
  // eslint-disable-next-line no-new-func
  new Function('define', src)(define);
  return exported;
}

/** A /fields payload fragment, in the real shape. */
function payload(fields) {
  return {
    collection: 'genome_feature',
    fields: fields,
    counts: { total: fields.length, native: 0, enriched: 0 }
  };
}

const NATIVE = (name, label) => ({
  name, label: label || name, source: 'native', type: 'string', multiValued: false
});
const ENRICHED = (name, label) => ({
  name, label: label || name, source: 'enriched', from: 'genome', via: 'genome_id', hops: 1
});

const FALLBACK = [{ field: 'patric_id', label: 'BV-BRC ID' }];

beforeEach(() => {
  global.window = { App: { dataServiceURL: '/api/data' } };
});

afterEach(() => {
  delete global.window;
});

describe('parse', () => {
  test('maps name, label and source', () => {
    const M = loadModule({ request: { get: () => ({}) } });
    const out = M.parse(payload([NATIVE('product', 'Product')]));

    expect(out).toEqual([{ field: 'product', label: 'Product', source: 'native' }]);
  });

  test('drops internal fields that should never reach a FASTA header', () => {
    const M = loadModule({ request: { get: () => ({}) } });
    const out = M.parse(payload([
      NATIVE('product', 'Product'),
      NATIVE('aa_sequence_md5', 'AA Sequence MD5'),
      NATIVE('user_read', 'User Read'),
      NATIVE('owner', 'Owner'),
      NATIVE('date_inserted', 'Date Inserted'),
      NATIVE('p2_feature_id', 'P2 Feature ID')
    ]));

    expect(out.map((f) => f.field)).toEqual(['product']);
  });

  describe('label overrides', () => {
    /**
     * The endpoint titlecases mechanically, so `go` arrives as "Go" and
     * `na_length` as "Na Length". Only the wrong ones are overridden.
     */
    test.each([
      ['go', 'GO Terms'],
      ['na_length', 'NA Length'],
      ['aa_length', 'AA Length'],
      ['patric_id', 'BV-BRC ID'],
      ['ec', 'EC Number']
    ])('%s -> %s', (name, expected) => {
      const M = loadModule({ request: { get: () => ({}) } });
      const out = M.parse(payload([NATIVE(name, 'Wrong')]));
      expect(out[0].label).toBe(expected);
    });

    test('a good label from the endpoint is kept', () => {
      const M = loadModule({ request: { get: () => ({}) } });
      const out = M.parse(payload([NATIVE('refseq_locus_tag', 'RefSeq Locus Tag')]));
      expect(out[0].label).toBe('RefSeq Locus Tag');
    });

    test('segments is disambiguated from the flu segment field', () => {
      // genome_feature.segments is coordinate spans ("1..1108"), NOT the
      // influenza segment number, which is the enriched `segment`. Adjacent
      // in an alphabetical list and easy to confuse.
      const M = loadModule({ request: { get: () => ({}) } });
      const out = M.parse(payload([NATIVE('segments', 'Segments')]));
      expect(out[0].label).toBe('Segments (coordinates)');
    });
  });

  test('native fields sort before enriched', () => {
    const M = loadModule({ request: { get: () => ({}) } });
    const out = M.parse(payload([
      ENRICHED('host_name', 'Host Name'),
      NATIVE('product', 'Product'),
      ENRICHED('collection_date', 'Collection Date'),
      NATIVE('accession', 'Accession')
    ]));

    expect(out.map((f) => f.source))
      .toEqual(['native', 'native', 'enriched', 'enriched']);
    // Alphabetical within each group.
    expect(out.map((f) => f.field))
      .toEqual(['accession', 'product', 'collection_date', 'host_name']);
  });

  test('an empty or malformed payload parses to nothing', () => {
    const M = loadModule({ request: { get: () => ({}) } });
    expect(M.parse(null)).toEqual([]);
    expect(M.parse({})).toEqual([]);
    expect(M.parse({ fields: [] })).toEqual([]);
  });

  test('a field with no name is skipped', () => {
    const M = loadModule({ request: { get: () => ({}) } });
    const out = M.parse(payload([{ label: 'Nameless', source: 'native' }]));
    expect(out).toEqual([]);
  });
});

describe('load', () => {
  test('returns parsed fields on success', () => {
    const M = loadModule({
      request: { get: () => payload([NATIVE('product', 'Product')]) }
    });

    let got;
    M.load('genome_feature', FALLBACK).then((f) => { got = f; });
    expect(got.map((f) => f.field)).toEqual(['product']);
  });

  describe('falls back rather than failing', () => {
    /**
     * /fields 404s on production and serves on alpha, so the fallback is
     * the normal path in one deployment, not an error case.
     */
    test('on a rejected request (the production 404)', () => {
      const M = loadModule({
        request: { get: () => ({ __reject: { status: 404 } }) }
      });

      let got;
      M.load('genome_feature', FALLBACK).then((f) => { got = f; });
      expect(got).toBe(FALLBACK);
    });

    test('on a transport that throws synchronously', () => {
      const M = loadModule({
        request: { get: () => { throw new Error('no transport'); } }
      });

      let got;
      expect(() => M.load('genome_feature', FALLBACK).then((f) => { got = f; }))
        .not.toThrow();
      expect(got).toBe(FALLBACK);
    });

    test('on a payload whose shape we do not recognise', () => {
      const M = loadModule({ request: { get: () => ({ unexpected: true }) } });

      let got;
      M.load('genome_feature', FALLBACK).then((f) => { got = f; });
      expect(got).toBe(FALLBACK);
    });

    test('when every field is filtered out, rather than showing an empty picker', () => {
      const M = loadModule({
        request: { get: () => payload([NATIVE('user_read'), NATIVE('owner')]) }
      });

      let got;
      M.load('genome_feature', FALLBACK).then((f) => { got = f; });
      expect(got).toBe(FALLBACK);
    });

    test('with no API base configured', () => {
      global.window = { App: {} };
      const M = loadModule({
        request: { get: () => { throw new Error('should not be called'); } }
      });

      let got;
      M.load('genome_feature', FALLBACK).then((f) => { got = f; });
      expect(got).toBe(FALLBACK);
    });

    test('with no collection', () => {
      const M = loadModule({ request: { get: () => ({}) } });

      let got;
      M.load('', FALLBACK).then((f) => { got = f; });
      expect(got).toBe(FALLBACK);
    });
  });

  test('a collection is fetched once and cached', () => {
    let calls = 0;
    const M = loadModule({
      request: {
        get: () => { calls++; return payload([NATIVE('product', 'Product')]); }
      }
    });

    M.load('genome_feature', FALLBACK);
    M.load('genome_feature', FALLBACK);
    M.load('genome_feature', FALLBACK);

    expect(calls).toBe(1);
  });

  test('different collections are cached separately', () => {
    const seen = [];
    const M = loadModule({
      request: {
        get: (url) => { seen.push(url); return payload([NATIVE('product')]); }
      }
    });

    M.load('genome_feature', FALLBACK);
    M.load('genome_sequence', FALLBACK);

    expect(seen).toEqual([
      '/api/data/genome_feature/fields',
      '/api/data/genome_sequence/fields'
    ]);
  });
});

describe('the fields this replaces', () => {
  /**
   * The point of the change. Three fields the hardcoded picker offered are
   * absent from /fields on genome_feature and never resolve in any mode,
   * even though the genome record has values. Sourcing the list from the
   * endpoint drops them automatically.
   */
  test('an absent field is simply not offered', () => {
    const M = loadModule({
      request: () => {},
      ...{}
    });
    // Mirrors alpha: genome_feature has no assembly_accession.
    const real = M.parse(payload([
      NATIVE('patric_id', 'BRC ID'),
      NATIVE('accession', 'Accession'),
      ENRICHED('strain', 'Strain')
    ]));

    expect(real.map((f) => f.field)).not.toContain('assembly_accession');
    expect(real.map((f) => f.field)).not.toContain('bioproject_accession');
    expect(real.map((f) => f.field)).not.toContain('biosample_accession');
  });

  test('enriched fields arrive under their bare name, usable in a template', () => {
    const M = loadModule({ request: { get: () => ({}) } });
    const out = M.parse(payload([ENRICHED('strain', 'Strain')]));

    // Not genome_metadata.strain, which renders empty in a format string.
    expect(out[0].field).toBe('strain');
  });
});
