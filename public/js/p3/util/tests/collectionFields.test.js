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

    expect(out).toEqual([
      { field: 'product', label: 'Product', source: 'native', group: 'collection' }
    ]);
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

  describe('grouping', () => {
    /**
     * A genome_feature download offers 77 fields. Sorting flat put every
     * joined field after all 46 native ones, which buried `subtype` at
     * position 75 of 77 in a box showing five at a time -- reported as
     * "the viral typing fields are missing". Groups keep them findable.
     */
    test('the collection\'s own fields lead, then typed groups', () => {
      const M = loadModule({ request: { get: () => ({}) } });
      const out = M.parse(payload([
        ENRICHED('host_name', 'Host Name'),
        NATIVE('product', 'Product'),
        ENRICHED('collection_date', 'Collection Date'),
        NATIVE('accession', 'Accession'),
        ENRICHED('subtype', 'Subtype'),
        ENRICHED('gram_stain', 'Gram Stain')
      ]));

      expect(out.map((f) => f.group)).toEqual([
        'collection', 'collection', // accession, product
        'typing',                   // subtype
        'host',                     // host_name
        'geo',                      // collection_date
        'genome'                    // gram_stain
      ]);
    });

    test('alphabetical within a group', () => {
      const M = loadModule({ request: { get: () => ({}) } });
      const out = M.parse(payload([
        NATIVE('product', 'Product'),
        NATIVE('accession', 'Accession'),
        NATIVE('annotation', 'Annotation')
      ]));

      expect(out.map((f) => f.field)).toEqual(['accession', 'annotation', 'product']);
    });

    test('virus typing fields are not left at the bottom', () => {
      const M = loadModule({ request: { get: () => ({}) } });
      // 20 native fields ahead of a typing field: flat sorting would put
      // subtype last; grouping puts it right after them.
      const many = [];
      for (let i = 0; i < 20; i++) many.push(NATIVE('zz_native_' + i, 'ZZ Native ' + i));
      many.push(ENRICHED('subtype', 'Subtype'));
      many.push(ENRICHED('host_name', 'Host Name'));

      const out = M.parse(payload(many));
      const names = out.map((f) => f.field);

      expect(names.indexOf('subtype')).toBe(20);
      expect(names.indexOf('subtype')).toBeLessThan(names.indexOf('host_name'));
    });

    test.each([
      ['subtype', 'typing'], ['lineage', 'typing'], ['clade', 'typing'],
      ['segment', 'typing'], ['h5_clade', 'typing'], ['strain', 'typing'],
      ['host_name', 'host'], ['lab_host', 'host'], ['disease', 'host'],
      ['isolation_country', 'geo'], ['collection_date', 'geo'], ['city', 'geo'],
      ['gram_stain', 'genome'], ['oxygen_requirement', 'genome']
    ])('%s is grouped as %s', (name, group) => {
      const M = loadModule({ request: { get: () => ({}) } });
      expect(M.parse(payload([ENRICHED(name, name)]))[0].group).toBe(group);
    });

    test('groups() leads with a caller-supplied label for the collection', () => {
      const M = loadModule({ request: { get: () => ({}) } });
      const g = M.groups('Feature fields');

      expect(g[0]).toEqual({ key: 'collection', label: 'Feature fields' });
      expect(g.map((x) => x.key))
        .toEqual(['collection', 'typing', 'host', 'geo', 'genome']);
    });
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
        request: { get: () => ({ __reject: { response: { status: 404 } } }) }
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

describe('a failure must not poison the cache', () => {
  /**
   * Reported from alpha: the picker showed the 8-field built-in list with
   * no group headings, while calling CF.load() by hand in the same page
   * returned 139 fields -- but only after CF._reset().
   *
   * The cause was caching the FALLBACK on failure. One transient failure
   * and every later call in that session returned the short list without
   * retrying, with nothing in the console to say why. A failure now leaves
   * the cache empty so the next dialog tries again.
   */
  test('a failed load is not cached, and the next call retries', () => {
    let attempt = 0;
    const M = loadModule({
      request: {
        get: function () {
          attempt++;
          if (attempt === 1) return { __reject: { response: { status: 500 } } };
          return payload([NATIVE('product', 'Product'), ENRICHED('subtype', 'Subtype')]);
        }
      }
    });

    let first;
    M.load('genome_feature', FALLBACK).then((f) => { first = f; });
    expect(first).toBe(FALLBACK);

    // The retry is the point: a second dialog in the same session must not
    // inherit the first one's bad luck.
    let second;
    M.load('genome_feature', FALLBACK).then((f) => { second = f; });
    expect(second).not.toBe(FALLBACK);
    expect(second.map((f) => f.field)).toEqual(['product', 'subtype']);
    expect(attempt).toBe(2);
  });

  test('a successful load is still cached', () => {
    let attempt = 0;
    const M = loadModule({
      request: {
        get: function () { attempt++; return payload([NATIVE('product', 'Product')]); }
      }
    });

    M.load('genome_feature', FALLBACK);
    M.load('genome_feature', FALLBACK);
    expect(attempt).toBe(1);
  });

  test.each([
    ['an HTTP error', { __reject: { response: { status: 500 } } }],
    ['an unrecognised payload', { unexpected: true }],
    ['a payload whose fields all filter out', null]
  ])('%s leaves the cache clear', (_name, response) => {
    let attempt = 0;
    const M = loadModule({
      request: {
        get: function () {
          attempt++;
          return response === null
            ? payload([NATIVE('user_read'), NATIVE('owner')])
            : response;
        }
      }
    });

    M.load('genome_feature', FALLBACK);
    M.load('genome_feature', FALLBACK);
    expect(attempt).toBe(2);
  });

  test('a failure warns, naming the collection and the reason', () => {
    // Spy before loading: the module closes over console at call time, so
    // the spy has to be installed for the duration of the load.
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const M = loadModule({ request: { get: () => ({ __reject: { response: { status: 500 } } }) } });
      M.load('genome_feature', FALLBACK);

      expect(spy).toHaveBeenCalled();
      const msg = spy.mock.calls[0][0];
      expect(msg).toContain('genome_feature');
      expect(msg).toContain('HTTP 500');
    } finally {
      spy.mockRestore();
    }
  });
});
