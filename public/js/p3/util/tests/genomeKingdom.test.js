/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * genomeKingdom.js is an AMD module; evaluate it with a `define` shim that supplies its
 * four dependencies. Only `classify` is exercised here -- `detect` is the network call,
 * covered by the live browser checks.
 */
function loadGenomeKingdom() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'genomeKingdom.js'), 'utf8');
  let exported;
  const stubs = {
    'dojo/request': { get: () => Promise.resolve({}) },
    './PathJoin': (...p) => p.join('/'),
    '../auth/authHeaders': { forToken: () => '' },
    './joinTooBroad': { isJoinTooBroad: () => false }
  };
  const define = function (deps, factory) {
    exported = factory.apply(null, deps.map((d) => stubs[d]));
  };
  // eslint-disable-next-line no-new-func
  new Function('define', src)(define);
  return exported;
}

const gk = loadGenomeKingdom();

describe('genomeKingdom.classify', () => {
  test('a pure bacteria list', () => {
    expect(gk.classify({ Bacteria: 128823 })).toBe('Bacteria');
  });

  test('a pure virus list', () => {
    expect(gk.classify({ Viruses: 15643133 })).toBe('Viruses');
  });

  test('THE BUG: 4 unannotated genomes in 15.6M must not read as "mixed"', () => {
    // Real counts from /genome/?eq(taxon_lineage_ids,10239). The old key-array form
    // reduced this to ["Viruses","null"] and concluded two kingdoms.
    expect(gk.classify({ Viruses: 15643133, null: 4 })).toBe('Viruses');
  });

  test('the same for bacteria', () => {
    expect(gk.classify({ Bacteria: 1316755, null: 11 })).toBe('Bacteria');
  });

  test('a genuinely mixed list is still mixed', () => {
    expect(gk.classify({ Bacteria: 500000, Viruses: 400000 })).toBeNull();
  });

  test('mixed stays mixed even with a null bucket', () => {
    expect(gk.classify({ Bacteria: 500000, Viruses: 400000, null: 3 })).toBeNull();
  });

  test('a minority kingdom above the noise floor still counts as mixed', () => {
    // 1% -- well above NOISE_FRACTION, so this is a real mixed list, not annotation dirt.
    expect(gk.classify({ Bacteria: 990000, Viruses: 10000 })).toBeNull();
  });

  test('a minority kingdom below the noise floor is ignored', () => {
    // 0.0001% -- the shape that caused the bug, now with a named kingdom rather than
    // "null". A handful of misfiled records should not disable tab pruning either.
    expect(gk.classify({ Viruses: 15643133, Bacteria: 4 })).toBe('Viruses');
  });

  test('the noise floor is proportional, not absolute', () => {
    // 4 records out of 400 is 1% -- the same absolute count that was noise at 15.6M
    // is signal in a small list.
    expect(gk.classify({ Viruses: 396, Bacteria: 4 })).toBeNull();
  });

  test('only null', () => {
    expect(gk.classify({ null: 7 })).toBeNull();
  });

  test('empty', () => {
    expect(gk.classify({})).toBeNull();
  });

  test('a kingdom we have no tab rules for yields no switch', () => {
    expect(gk.classify({ Archaea: 5000 })).toBeNull();
    expect(gk.classify({ Eukaryota: 5000 })).toBeNull();
  });

  test('tolerates non-numeric counts rather than throwing', () => {
    expect(() => gk.classify({ Bacteria: 'x' })).not.toThrow();
  });
});

describe('the noise threshold', () => {
  test('is small enough that any plausible real mix exceeds it', () => {
    // A mixed list would have to be more lopsided than 1-in-1000 to be misread.
    expect(gk.NOISE_FRACTION).toBeLessThanOrEqual(0.001);
    // The real case is 2.6e-7, comfortably under.
    expect(4 / 15643137).toBeLessThan(gk.NOISE_FRACTION);
  });
});
