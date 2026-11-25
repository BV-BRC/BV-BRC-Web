/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * IrdSegmentAccessionStore against stand-ins for dojo/when, QueryResults and
 * dojo/request: which segment records it asks for, and what it attaches.
 */

const SRC = fs.readFileSync(path.join(__dirname, '..', 'IrdSegmentAccessionStore.js'), 'utf8');

const lang = {
  delegate: (obj) => Object.create(obj),
  mixin: (dest, ...sources) => Object.assign(dest, ...sources)
};
const when = (v, ok, fail) => Promise.resolve(v).then(ok, fail);
const QueryResults = (p) => {
  const q = Promise.resolve(p).then((x) => x);
  return q;
};

function load(respond) {
  const posts = [];
  const request = {
    post: (url, opts) => {
      posts.push({ url, data: opts.data });
      return Promise.resolve(respond(opts.data, posts.length));
    }
  };
  let factory;
  // eslint-disable-next-line no-new-func
  new Function('define', SRC)((deps, f) => { factory = f(lang, when, QueryResults, request, (a, b) => a + '/' + b); });
  return { factory, posts };
}

function baseStore(rows, total) {
  return {
    query: function () {
      const p = Promise.resolve(rows);
      p.total = total;
      return p;
    }
  };
}

global.window = { App: { authorizationToken: 'T' } };

function idsOf(data) {
  return /in\(genome_id,\(([^)]*)\)\)/.exec(data)[1].split(',');
}

describe('IrdSegmentAccessionStore', () => {
  test('attaches each row\'s accessions by segment, from its segment records', async () => {
    const { factory, posts } = load(() => [
      { genome_id: 'g1', segment: 'HA', accession: 'A1' },
      { genome_id: 'g1', segment: 'HA', accession: 'A2' },
      { genome_id: 'g1', segment: 'NA', accession: 'N1' },
      { genome_id: 'g2', segment: 'PB2', accession: 'P1' }
    ]);
    const store = factory(baseStore([{ genome_id: 'g1' }, { genome_id: 'g2' }, { genome_id: 'g3' }], 3), 'https://api');
    const rows = await store.query('q', {});
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe('https://api/genome_sequence/');
    expect(posts[0].data).toBe('in(genome_id,(g1,g2,g3))&select(genome_id,segment,accession)&sort(+accession)&limit(9999)');
    expect(rows[0].ird_segments).toEqual({ HA: ['A1', 'A2'], NA: ['N1'] });
    expect(rows[1].ird_segments).toEqual({ PB2: ['P1'] });
    expect(rows[2].ird_segments).toEqual({});
  });

  test('keeps the store\'s total', () => {
    const { factory } = load(() => []);
    const store = factory(baseStore([{ genome_id: 'g1' }], 524), 'https://api');
    expect(store.query('q', {}).total).toBe(524);
  });

  test('THE POINT: looks genomes up in small batches, so overfilled genomes stay under the row limit', async () => {
    // One genome can hold hundreds of sequences (922 for A/swine/England/453/2006).
    const rows = [];
    for (let i = 0; i < 60; i++) rows.push({ genome_id: 'g' + i });
    const { factory, posts } = load(() => []);
    await factory(baseStore(rows, 60), 'https://api').query('q', {});
    expect(posts.map((p) => idsOf(p.data).length)).toEqual([25, 25, 10]);
    expect(posts.flatMap((p) => idsOf(p.data))).toEqual(rows.map((r) => r.genome_id));
  });

  test('THE POINT: a batch that hits the row limit marks its rows truncated', async () => {
    const full = [];
    for (let i = 0; i < 9999; i++) full.push({ genome_id: 'g1', segment: 'HA', accession: 'A' + i });
    const { factory } = load((data, n) => (n === 1 ? full : [{ genome_id: 'g30', segment: 'HA', accession: 'X' }]));
    const rows = [];
    for (let i = 0; i < 30; i++) rows.push({ genome_id: 'g' + i });
    const out = await factory(baseStore(rows, 30), 'https://api').query('q', {});
    expect(out[0].ird_segments_truncated).toBe(true);
    expect(out[24].ird_segments_truncated).toBe(true);
    expect(out[25].ird_segments_truncated).toBeUndefined();
  });

  test('duplicate genome IDs on a page are looked up once', async () => {
    const { factory, posts } = load(() => []);
    await factory(baseStore([{ genome_id: 'g1' }, { genome_id: 'g1' }], 2), 'https://api').query('q', {});
    expect(idsOf(posts[0].data)).toEqual(['g1']);
  });

  test('a failed lookup still shows the strains, with empty segment cells', async () => {
    const { factory } = load(() => Promise.reject(new Error('503')));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const out = await factory(baseStore([{ genome_id: 'g1', strain: 'A/x' }], 1), 'https://api').query('q', {});
    spy.mockRestore();
    expect(out).toEqual([{ genome_id: 'g1', strain: 'A/x' }]);
  });

  test('rows without genome IDs: no lookup', async () => {
    const { factory, posts } = load(() => []);
    const out = await factory(baseStore([{ strain: 'x' }], 1), 'https://api').query('q', {});
    expect(posts).toEqual([]);
    expect(out).toEqual([{ strain: 'x' }]);
  });
});
