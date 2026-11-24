/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * The Subsystems Overview pie chart for a private genome.
 *
 * GET /api/data/subsystem_summary/<id> queries as nobody and caches by URL, so
 * it returns [] for any genome an anonymous user cannot see. subsystemSummary.js
 * asks the permission-aware /api/subsystem/ endpoint for the same Solr pivot and
 * reshapes it. The reshaping has to match what the cached route returns, or the
 * chart would draw differently depending on which source answered.
 */
function load() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'subsystemSummary.js'), 'utf8');
  let exported;
  // eslint-disable-next-line no-new-func
  new Function('define', src)(function (deps, factory) { exported = factory(); });
  return exported;
}

const ss = load();
const fixture = (name) => JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'));

describe('fromPivot', () => {
  // raw: the real Solr pivot for genome 83332.12, trimmed to three superclasses.
  // expected: what the production cache route returned for those same
  // superclasses, captured from the live API, not written by hand.
  const raw = fixture('subsystemPivot.raw.json');
  const expected = fixture('subsystemPivot.expected.json');

  test('THE CONTRACT: reproduces the cached route\'s output exactly, order included', () => {
    expect(ss.fromPivot(raw)).toEqual(expected);
  });

  test('TIES keep Solr\'s order, as the cached route\'s do (not alphabetical, not reversed)', () => {
    // The real fixture has one tied pair and it happens to be alphabetical, so on
    // its own it cannot tell "kept Solr's order" from "sorted by name". Names here
    // are deliberately out of alphabetical order.
    const pivot = (value, count, children) => ({ value, count, pivot: children });
    const leaf = (value, count) => pivot(value, count, [pivot('SS_' + value, count, [])]);
    const resp = {
      facet_counts: {
        facet_pivot: {
          [ss.PIVOT]: [
            pivot('Zeta', 5, [pivot('c', 5, [leaf('x', 5)])]),
            pivot('Alpha', 5, [pivot('c', 5, [leaf('x', 5)])]),
            pivot('Mid', 5, [pivot('c', 5, [leaf('x', 5)])]),
            pivot('Big', 9, [pivot('c', 9, [leaf('x', 9)])])
          ]
        }
      }
    };
    expect(ss.fromPivot(resp).map((n) => n.name)).toEqual(['Big', 'Zeta', 'Alpha', 'Mid']);
  });

  test('sorts every level by gene count, highest first', () => {
    const sorted = (nodes) => nodes.every((n, i) => i === 0 || nodes[i - 1].gene_count >= n.gene_count)
      && nodes.every((n) => !n.children || sorted(n.children));
    expect(sorted(ss.fromPivot(raw))).toBe(true);
  });

  test('subsystem_count counts distinct subsystems, and sums up the levels', () => {
    const out = ss.fromPivot(raw);
    out.forEach((superclass) => {
      const fromClasses = superclass.children.reduce((n, c) => n + c.subsystem_count, 0);
      expect(superclass.subsystem_count).toBe(fromClasses);
      superclass.children.forEach((klass) => {
        const fromSubclasses = klass.children.reduce((n, s) => n + s.subsystem_count, 0);
        expect(klass.subsystem_count).toBe(fromSubclasses);
      });
    });
  });

  test('a subclass is a leaf', () => {
    ss.fromPivot(raw).forEach((s) => s.children.forEach((c) => c.children.forEach((leaf) => {
      expect(leaf.children).toBeUndefined();
    })));
  });

  describe('a genome with nothing to show is an empty summary, not an error', () => {
    test('Solr omits the pivot entirely', () => {
      expect(ss.fromPivot({ response: { numFound: 0 }, facet_counts: {} })).toEqual([]);
    });
    test('an empty pivot list', () => {
      expect(ss.fromPivot({ facet_counts: { facet_pivot: { [ss.PIVOT]: [] } } })).toEqual([]);
    });
    test.each([null, undefined, {}, [], 'x', 0])('junk %p', (v) => {
      expect(ss.fromPivot(v)).toEqual([]);
    });
  });
});

describe('buildSolrQuery', () => {
  test('pivots on the four levels, one genome, no rows', () => {
    const q = ss.buildSolrQuery('83332.12');
    expect(q).toContain('fq=genome_id:83332.12');
    expect(q).toContain('rows=0');
    expect(q).toContain('facet.pivot=superclass,class,subclass,subsystem_id');
    expect(q).toContain('facet.limit=-1');
  });

  test('never pivots on an ACL field (the API refuses it for everyone)', () => {
    expect(ss.buildSolrQuery('83332.12')).not.toMatch(/owner|user_read|user_write/);
  });

  describe('THE INJECTION GUARD: the id lands inside a Solr query', () => {
    test.each([
      'foo:(', '83332.12 OR public:true', '83332.12&fq=public:true', '*:*', '83332', '.12',
      '83332.', '83332.12.3', '', ' 83332.12', '83332.12\n', '83332.12)', 'a.b', null, undefined, 83332.12
    ])('refuses %p', (id) => {
      expect(ss.buildSolrQuery(id)).toBeNull();
    });

    test('accepts real genome ids', () => {
      ['83332.12', '1386.5934', '511145.12', '2697049.2849'].forEach((id) => {
        expect(ss.buildSolrQuery(id)).not.toBeNull();
      });
    });
  });
});

describe('chooseSource', () => {
  const pub = { genome: { public: true } };
  const priv = { genome: { public: false } };

  test('not signed in: the cache is all there is to ask', () => {
    expect(ss.chooseSource(priv, false)).toBe('cache');
    expect(ss.chooseSource(pub, false)).toBe('cache');
    expect(ss.chooseSource({}, false)).toBe('cache');
  });

  test('THE FIX: a signed-in user viewing a private genome goes to the API', () => {
    expect(ss.chooseSource(priv, true)).toBe('api');
  });

  test('a public genome never costs the second query', () => {
    expect(ss.chooseSource(pub, true)).toBe('cache');
  });

  test('privacy not known yet (genome record arrives late): try the cache, then the API', () => {
    expect(ss.chooseSource({}, true)).toBe('cache-then-api');
    expect(ss.chooseSource({ genome: {} }, true)).toBe('cache-then-api');
    expect(ss.chooseSource({ genome: { public: undefined } }, true)).toBe('cache-then-api');
    expect(ss.chooseSource(null, true)).toBe('cache-then-api');
    expect(ss.chooseSource(undefined, true)).toBe('cache-then-api');
  });

  test('only a real boolean counts: "false" strings do not mean private', () => {
    expect(ss.chooseSource({ genome: { public: 'false' } }, true)).toBe('cache-then-api');
    expect(ss.chooseSource({ genome: { public: 0 } }, true)).toBe('cache-then-api');
  });
});

describe('the store keeps using it', () => {
  // SubsystemsOverviewMemoryStore is a dojo module with no test harness, so the
  // wiring is pinned by reading its source. The logic worth testing lives above.
  const store = fs.readFileSync(
    path.join(__dirname, '..', '..', 'store', 'SubsystemsOverviewMemoryStore.js'), 'utf8');

  test('asks chooseSource, then the cache and/or the permission-aware endpoint', () => {
    expect(store).toMatch(/SubsystemSummary\.chooseSource\(/);
    expect(store).toMatch(/data\/subsystem_summary/);
    expect(store).toMatch(/PathJoin\(this\.apiServer, 'subsystem'\) \+ '\/'/);
    expect(store).toMatch(/application\/solrquery\+x-www-form-urlencoded/);
    expect(store).toMatch(/\.then\(SubsystemSummary\.fromPivot\)/);
  });

  test('a private genome is not left to the cache that cannot see it', () => {
    expect(store).toMatch(/source === 'api'/);
    expect(store).toMatch(/source === 'cache-then-api'/);
  });

  test('the token goes with the API request (the cache route ignores it)', () => {
    expect(store).toMatch(/Authorization: authHeader\('api', this\.token\)/);
  });
});

