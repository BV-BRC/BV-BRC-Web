/* eslint-env jest */
// The tests walk a cursor in order on purpose: each page's mark comes from the
// previous response, so awaiting inside the loops is the thing under test.
/* eslint-disable no-await-in-loop */
const fs = require('fs');
const path = require('path');

/**
 * cursorPaging.js is a dependency-free AMD module; load it with a `define`
 * shim, as the other util tests do.
 */
function load() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'cursorPaging.js'), 'utf8');
  let exported;
  // eslint-disable-next-line no-new-func
  new Function('define', src)(function (deps, factory) { exported = factory(); });
  return exported;
}

const cp = load();

/**
 * A stand-in for the data API's cursor behaviour, as measured against
 * www/alpha.bv-brc.org:
 *
 *  - a mark encodes a position, not a session, so any mark replays
 *  - the response carries the NEXT mark
 *  - a page with rows ALWAYS carries a fresh mark, even a short final one;
 *    the server echoes the mark it was sent only when a page comes back EMPTY
 *  - `*` starts at the beginning
 *
 * Counts every request so tests can assert on how many were made.
 */
function fakeServer(total) {
  const server = {
    requests: [],
    fetchOne(mark, limit) {
      server.requests.push({ mark, limit });
      const at = mark === '*' ? 0 : parseInt(mark.replace('m', ''));
      const rows = [];
      for (let i = at; i < Math.min(at + limit, total); i++) { rows.push({ id: i }); }
      const next = rows.length === 0 ? mark : 'm' + (at + rows.length);
      return Promise.resolve({ rows, next, total });
    }
  };
  return server;
}

const ids = (rows) => rows.map((r) => r.id);

describe('page arithmetic', () => {
  test('pageIndex / pageStart', () => {
    expect(cp.pageIndex(0, 200)).toBe(0);
    expect(cp.pageIndex(199, 200)).toBe(0);
    expect(cp.pageIndex(200, 200)).toBe(1);
    expect(cp.pageStart(3, 200)).toBe(600);
  });

  test('pagesFor spans the pages a request touches', () => {
    expect(cp.pagesFor(0, 200, 200)).toEqual({ first: 0, last: 0 });
    expect(cp.pagesFor(150, 100, 200)).toEqual({ first: 0, last: 1 });
    expect(cp.pagesFor(400, 1, 200)).toEqual({ first: 2, last: 2 });
  });

  test('pagesFor refuses an unbounded request, leaving it to the offset path', () => {
    [undefined, Infinity, 0, -5, NaN, '10'].forEach((c) => {
      expect(cp.pagesFor(0, c, 200)).toBeNull();
    });
  });
});

describe('query building', () => {
  test('appends sort, limit and an encoded cursor', () => {
    expect(cp.buildQuery('eq(public,true)', 'sort(+genome_id)', '*', 200))
      .toBe('eq(public,true)&sort(+genome_id)&limit(200)&cursor(*)');
  });

  test('a real mark is URL-encoded', () => {
    expect(cp.buildQuery('x', '', 'Ao+/=', 50)).toBe('x&limit(50)&cursor(Ao%2B%2F%3D)');
  });

  test('copes with an empty query and no sort', () => {
    expect(cp.buildQuery('', '', '*', 10)).toBe('limit(10)&cursor(*)');
  });

  test('sortClause renders dojo sort options', () => {
    expect(cp.sortClause([{ attribute: 'genome_name', descending: false },
      { attribute: 'start', descending: true }])).toBe('sort(+genome_name,-start)');
    expect(cp.sortClause([])).toBe('');
    expect(cp.sortClause(undefined)).toBe('');
  });

  test('sortClause encodes the attribute', () => {
    expect(cp.sortClause([{ attribute: 'a b' }])).toBe('sort(+a%20b)');
  });

  test('hasLimit spots a limit the grid already added', () => {
    expect(cp.hasLimit('eq(a,b)&limit(10000)')).toBe(true);
    expect(cp.hasLimit('limit(5)')).toBe(true);
    expect(cp.hasLimit('and(eq(a,b),limit(5))')).toBe(true);
    expect(cp.hasLimit('eq(a,limit)')).toBe(false);
    expect(cp.hasLimit('eq(a,b)')).toBe(false);
  });

  test('a grouped query is not cursorable: the API answers it with a 400', () => {
    expect(cp.isCursorable('eq(a,b)&group((genome_id))')).toBe(false);
    expect(cp.isCursorable('group((x))')).toBe(false);
    expect(cp.isCursorable('eq(a,b)&limit(10)')).toBe(false);
    expect(cp.isCursorable('eq(a,b)&eq(subgroup,x)')).toBe(true);
    expect(cp.isCursorable('eq(a,b)')).toBe(true);
    expect(cp.isCursorable('')).toBe(true);
  });

  test('totalFromRange', () => {
    expect(cp.totalFromRange('items 0-200/17094027')).toBe(17094027);
    expect(cp.totalFromRange('')).toBeUndefined();
    expect(cp.totalFromRange(null)).toBeUndefined();
  });
});

describe('state registry', () => {
  test('page 0 always starts at the initial mark', () => {
    const s = cp.stateFor(cp.newRegistry(), 'k');
    expect(cp.markFor(s, 0)).toBe('*');
    expect(cp.markFor(s, 1)).toBeNull();
  });

  test('the same key returns the same state', () => {
    const reg = cp.newRegistry();
    expect(cp.stateFor(reg, 'k')).toBe(cp.stateFor(reg, 'k'));
  });

  test('THE RESET: a different query or sort is a different state', () => {
    // Marks from sort(+genome_id) are meaningless under sort(+genome_name).
    const reg = cp.newRegistry();
    const a = cp.stateFor(reg, cp.resetKey('eq(x,1)', 'sort(+genome_id)'));
    cp.recordMark(a, 1, 'mA');
    const b = cp.stateFor(reg, cp.resetKey('eq(x,1)', 'sort(+genome_name)'));
    expect(b).not.toBe(a);
    expect(cp.markFor(b, 1)).toBeNull();
    // ...and the original is still there, not clobbered.
    expect(cp.markFor(cp.stateFor(reg, cp.resetKey('eq(x,1)', 'sort(+genome_id)')), 1)).toBe('mA');
  });

  test('keys differing only by query or only by sort do not collide', () => {
    expect(cp.resetKey('a', 'b')).not.toBe(cp.resetKey('ab', ''));
    expect(cp.resetKey('a', '')).not.toBe(cp.resetKey('', 'a'));
  });

  test('the registry is bounded, evicting the least recently used', () => {
    const reg = cp.newRegistry();
    for (let i = 0; i < 4; i++) { cp.stateFor(reg, 'k' + i, 3); }
    expect(Object.keys(reg.states)).toEqual(['k1', 'k2', 'k3']);
    cp.stateFor(reg, 'k1', 3); // touch
    cp.stateFor(reg, 'k4', 3);
    expect(Object.keys(reg.states).sort()).toEqual(['k1', 'k3', 'k4']);
  });

  test('resetRegistry forgets everything (grid refresh)', () => {
    const reg = cp.newRegistry();
    cp.recordMark(cp.stateFor(reg, 'k'), 1, 'm');
    cp.resetRegistry(reg);
    expect(cp.markFor(cp.stateFor(reg, 'k'), 1)).toBeNull();
  });

  test('walkLength is how many pages stand between the known marks and a page', () => {
    const s = cp.stateFor(cp.newRegistry(), 'k');
    expect(cp.walkLength(s, 0)).toBe(0);
    expect(cp.walkLength(s, 3)).toBe(3);
    cp.recordMark(s, 1, 'a'); cp.recordMark(s, 2, 'b');
    expect(cp.walkLength(s, 2)).toBe(0);
    expect(cp.walkLength(s, 4)).toBe(2);
  });
});

describe('page cache', () => {
  test('returns what was stored and is bounded', () => {
    const s = cp.stateFor(cp.newRegistry(), 'k');
    cp.cachePut(s, 0, ['a'], 2);
    cp.cachePut(s, 1, ['b'], 2);
    cp.cachePut(s, 2, ['c'], 2);
    expect(cp.cacheGet(s, 0)).toBeNull();
    expect(cp.cacheGet(s, 1)).toEqual(['b']);
    expect(cp.cacheGet(s, 2)).toEqual(['c']);
  });
});

describe('sliceRows', () => {
  const pages = { 0: [0, 1, 2, 3], 1: [4, 5, 6, 7], 2: [8, 9] };
  test('inside one page', () => { expect(cp.sliceRows(pages, 1, 2, 4)).toEqual([1, 2]); });
  test('across a page boundary', () => { expect(cp.sliceRows(pages, 2, 4, 4)).toEqual([2, 3, 4, 5]); });
  test('a short final page yields fewer rows', () => {
    expect(cp.sliceRows(pages, 8, 4, 4)).toEqual([8, 9]);
  });
});

describe('loadRange against a cursor server', () => {
  const PAGE = 10;
  const run = (total) => {
    const server = fakeServer(total);
    const state = cp.stateFor(cp.newRegistry(), 'k');
    const load = (start, count) => cp.loadRange(state, start, count, PAGE, server.fetchOne);
    return { server, state, load };
  };

  test('the first page uses the initial mark and reports the total', async () => {
    const { server, load } = run(95);
    const out = await load(0, 10);
    expect(ids(out.rows)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(out.total).toBe(95);
    expect(server.requests).toEqual([{ mark: '*', limit: PAGE }]);
  });

  test('scrolling forward is one request per page, in order', async () => {
    const { server, load } = run(95);
    await load(0, 10);
    await load(10, 10);
    await load(20, 10);
    expect(server.requests.map((r) => r.mark)).toEqual(['*', 'm10', 'm20']);
  });

  test('THE POINT: scrolling back replays a recorded mark; one request, right rows', async () => {
    const { server, state, load } = run(95);
    for (let i = 0; i < 4; i++) { await load(i * 10, 10); }
    // Drop the cached rows so this is a genuine replay, not a cache hit.
    state.pages = {}; state.pageOrder = [];
    server.requests.length = 0;

    const back = await load(10, 10);
    expect(ids(back.rows)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(server.requests).toEqual([{ mark: 'm10', limit: PAGE }]);
  });

  test('replaying marks out of order returns identical pages', async () => {
    const { server, state, load } = run(95);
    const first = [];
    for (let i = 0; i < 4; i++) { first.push(ids((await load(i * 10, 10)).rows)); }
    state.pages = {}; state.pageOrder = [];
    for (const i of [2, 0, 3, 1]) {
      expect(ids((await load(i * 10, 10)).rows)).toEqual(first[i]);
    }
    expect(server.requests.length).toBe(4 + 4);
  });

  test('variable-sized requests that fall inside one page cost one fetch', async () => {
    // dgrid asks for whatever the viewport needs, not whole pages.
    const { server, load } = run(95);
    await load(0, 10);
    server.requests.length = 0;
    const a = await load(2, 3);
    const b = await load(5, 4);
    expect(ids(a.rows)).toEqual([2, 3, 4]);
    expect(ids(b.rows)).toEqual([5, 6, 7, 8]);
    expect(server.requests.length).toBe(0); // all served from the cached page
  });

  test('a request straddling two pages loads both', async () => {
    const { load } = run(95);
    const out = await load(8, 4);
    expect(ids(out.rows)).toEqual([8, 9, 10, 11]);
  });

  test('THE COALESCING: two concurrent asks for one page issue one request', async () => {
    // A throttled scroll handler can ask again before the first answer lands.
    const { server, load } = run(95);
    await load(0, 10);
    server.requests.length = 0;
    const [a, b] = await Promise.all([load(10, 10), load(10, 10)]);
    expect(ids(a.rows)).toEqual(ids(b.rows));
    expect(server.requests.length).toBe(1);
  });

  test('a request for an unvisited page walks the cursor up to it', async () => {
    const { server, load } = run(95);
    const out = await load(30, 10); // pages 0,1,2 unseen
    expect(ids(out.rows)).toEqual([30, 31, 32, 33, 34, 35, 36, 37, 38, 39]);
    expect(server.requests.map((r) => r.mark)).toEqual(['*', 'm10', 'm20', 'm30']);
  });

  test('the walk records every intermediate mark for later replay', async () => {
    const { state, load } = run(95);
    await load(30, 10);
    expect([0, 1, 2, 3].map((i) => cp.markFor(state, i))).toEqual(['*', 'm10', 'm20', 'm30']);
  });

  test('a short final page ends the data and records no further mark', async () => {
    const { server, state, load } = run(95);
    const out = await load(90, 10);
    expect(ids(out.rows)).toEqual([90, 91, 92, 93, 94]);
    expect(cp.markFor(state, 10)).toBeNull();
    server.requests.length = 0;
    const beyond = await load(100, 10);
    expect(beyond.rows).toEqual([]);
    expect(server.requests.length).toBe(0); // no mark, so no request
  });

  test('a final page that is exactly full does not loop forever', async () => {
    // The server echoes the mark it was sent once it is exhausted.
    const { server, load } = run(20);
    await load(0, 10); await load(10, 10);
    const past = await load(20, 10);
    expect(past.rows).toEqual([]);
    expect(server.requests.length).toBeLessThanOrEqual(3);
  });

  test('a failed fetch is not cached and the page can be retried', async () => {
    const server = fakeServer(95);
    const state = cp.stateFor(cp.newRegistry(), 'k');
    let fail = true;
    const flaky = (mark, limit) => (fail
      ? Promise.reject(new Error('shed'))
      : server.fetchOne(mark, limit));
    await expect(cp.loadRange(state, 0, 10, PAGE, flaky)).rejects.toThrow('shed');
    expect(state.inflight[0]).toBeUndefined();
    fail = false;
    const out = await cp.loadRange(state, 0, 10, PAGE, flaky);
    expect(ids(out.rows)).toHaveLength(10);
  });

  test('a response for a superseded query cannot corrupt the new one', async () => {
    const reg = cp.newRegistry();
    const server = fakeServer(95);
    const oldState = cp.stateFor(reg, cp.resetKey('q1', ''));
    let release;
    const slow = (mark, limit) => new Promise((resolve) => {
      release = () => resolve(server.fetchOne(mark, limit));
    });
    const pending = cp.loadRange(oldState, 0, 10, PAGE, slow);
    // The grid moves to another query while that request is still out.
    const newState = cp.stateFor(reg, cp.resetKey('q2', ''));
    await Promise.resolve(); // let the request actually go out
    release();
    await pending;
    expect(cp.markFor(newState, 1)).toBeNull();
    expect(cp.markFor(oldState, 1)).toBe('m10');
  });

  test('walkTooLong flags a request that would need a very long walk', () => {
    const s = cp.stateFor(cp.newRegistry(), 'k');
    expect(cp.walkTooLong(s, 0, 0, 5)).toBe(false);
    expect(cp.walkTooLong(s, 5, 5, 5)).toBe(false);
    expect(cp.walkTooLong(s, 6, 6, 5)).toBe(true);
    cp.recordMark(s, 6, 'x');
    expect(cp.walkTooLong(s, 6, 6, 5)).toBe(false);
  });
});

describe('isEnabled', () => {
  test('reads window.App.useCursorPaging at call time', () => {
    expect(cp.isEnabled({ App: { useCursorPaging: true } })).toBe(true);
    expect(cp.isEnabled({ App: { useCursorPaging: false } })).toBe(false);
    expect(cp.isEnabled({ App: {} })).toBe(false);
    expect(cp.isEnabled({})).toBe(false);
    expect(cp.isEnabled(null)).toBe(false);
  });

  test('THE STRING TRAP: "false" from the environment must not turn it on', () => {
    // argv / env values arrive as strings, and "false" is truthy.
    expect(cp.isEnabled({ App: { useCursorPaging: 'true' } })).toBe(true);
    ['false', 'FALSE', '0', '', 'no', 0, 1, null, undefined].forEach((v) => {
      expect(cp.isEnabled({ App: { useCursorPaging: v } })).toBe(false);
    });
  });
});

describe('a first page of one size, later pages of another (cursorFirstPageRows / cursorPageRows)', () => {
  const G = { first: 200, rest: 1000 };

  test('page arithmetic: page 0 is rows 0-199, page 1 rows 200-1199, page 2 from 1200', () => {
    expect(cp.pageIndex(0, G)).toBe(0);
    expect(cp.pageIndex(199, G)).toBe(0);
    expect(cp.pageIndex(200, G)).toBe(1);
    expect(cp.pageIndex(1199, G)).toBe(1);
    expect(cp.pageIndex(1200, G)).toBe(2);
    expect(cp.pageStart(0, G)).toBe(0);
    expect(cp.pageStart(1, G)).toBe(200);
    expect(cp.pageStart(2, G)).toBe(1200);
    expect(cp.pageLength(0, G)).toBe(200);
    expect(cp.pageLength(5, G)).toBe(1000);
    expect(cp.pagesFor(150, 100, G)).toEqual({ first: 0, last: 1 });
  });

  test('a plain number still means one size for every page', () => {
    expect(cp.pageStart(3, 200)).toBe(600);
    expect(cp.pageLength(0, 200)).toBe(200);
  });

  test('THE POINT: later pages are fetched at the larger size, and the grid\'s 200-row chunks come from the cache', async () => {
    const server = fakeServer(5000);
    const state = cp.stateFor(cp.newRegistry(), 'k');
    // dgrid draws 200 rows at a time.
    for (let start = 0; start < 1400; start += 200) {
      const res = await cp.loadRange(state, start, 200, G, server.fetchOne);
      expect(ids(res.rows)).toEqual(Array.from({ length: 200 }, (_, i) => start + i));
    }
    // 7 chunks, 3 requests: 200, then 1,000, then the next 1,000.
    expect(server.requests.map((r) => r.limit)).toEqual([200, 1000, 1000]);
    expect(server.requests.map((r) => r.mark)).toEqual(['*', 'm200', 'm1200']);
  });

  test('the end of the result is still found with a large page', async () => {
    const server = fakeServer(700);
    const state = cp.stateFor(cp.newRegistry(), 'k');
    const res = await cp.loadRange(state, 600, 200, G, server.fetchOne);
    expect(ids(res.rows)).toEqual(Array.from({ length: 100 }, (_, i) => 600 + i));
    const past = await cp.loadRange(state, 1200, 200, G, server.fetchOne);
    expect(past.rows).toEqual([]);
  });
});

describe('pageSizes (from config)', () => {
  test('defaults to 200 for both', () => {
    expect(cp.pageSizes({})).toEqual({ first: 200, rest: 200 });
    expect(cp.pageSizes(undefined)).toEqual({ first: 200, rest: 200 });
  });

  test('numbers or strings (argv/env deliver strings)', () => {
    expect(cp.pageSizes({ cursorFirstPageRows: 100, cursorPageRows: '1000' })).toEqual({ first: 100, rest: 1000 });
  });

  test('unusable values fall back; sizes are kept within 25-5000', () => {
    expect(cp.pageSizes({ cursorFirstPageRows: 'lots', cursorPageRows: -5 })).toEqual({ first: 200, rest: 200 });
    expect(cp.pageSizes({ cursorFirstPageRows: 3, cursorPageRows: 100000 })).toEqual({ first: 25, rest: 5000 });
  });
});
