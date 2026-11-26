/* eslint-env jest */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'scrollStatus.js'), 'utf8');
let S;
// eslint-disable-next-line no-new-func
new Function('define', src)(function (deps, factory) { S = factory(); });

const fmt = (n) => n.toLocaleString();
const row = (index, top, height = 24) => ({ index, top, height });

describe('visibleRange', () => {
  const rows = [row(0, 0), row(1, 24), row(2, 48), row(3, 72), row(4, 96)];

  test('rows overlapping the viewport, partly visible ones included', () => {
    expect(S.visibleRange(rows, 30, 50)).toEqual({ first: 1, last: 3 });
  });

  test('a row ending exactly at the top, or starting exactly at the bottom, is not in view', () => {
    expect(S.visibleRange(rows, 24, 48)).toEqual({ first: 1, last: 2 });
  });

  test('rows in any order; non-row nodes (no index, or the -1 of a placeholder) are ignored', () => {
    const mixed = [row(3, 72), { top: 0, height: 999 }, row(-1, 0), row(1, 24), row(2, 48)];
    expect(S.visibleRange(mixed, 30, 50)).toEqual({ first: 1, last: 3 });
  });

  test('THE POINT: deep in a list, the indexes are the real row numbers', () => {
    // Rows above are trimmed from the DOM; what remains carries its rowIndex.
    const deep = [row(4200, 98784), row(4201, 98808), row(4202, 98832)];
    expect(S.visibleRange(deep, 98800, 40)).toEqual({ first: 4200, last: 4202 });
  });

  test('nothing in view', () => {
    expect(S.visibleRange(rows, 5000, 100)).toBeNull();
    expect(S.visibleRange([], 0, 100)).toBeNull();
  });
});

describe('statusText', () => {
  test('THE POINT: where you are, out of how many, and how far loading has reached', () => {
    expect(S.statusText({ first: 4200, last: 4223 }, 17094027, 4400))
      .toBe('Rows ' + fmt(4201) + '–' + fmt(4224) + ' of ' + fmt(17094027) + ' · ' + fmt(4400) + ' loaded');
  });

  test('"loaded" is dropped once everything is', () => {
    expect(S.statusText({ first: 0, last: 22 }, 150, 150)).toBe('Rows 1–23 of 150');
  });

  test('no rows in view yet: just the total', () => {
    expect(S.statusText(null, 17094027, 0)).toBe(fmt(17094027) + ' rows · 0 loaded');
  });

  test('an empty result says so; an unknown total says nothing', () => {
    expect(S.statusText(null, 0, 0)).toBe('No results');
    expect(S.statusText(null, undefined, 0)).toBe('');
  });
});

describe('statusText while a fetch is in flight', () => {
  test('THE POINT: scrolling into rows not yet fetched says so', () => {
    expect(S.statusText({ first: 4200, last: 4223 }, 11672177, 4400, true))
      .toBe('Rows ' + fmt(4201) + '–' + fmt(4224) + ' of ' + fmt(11672177) + ' · ' + fmt(4400) + ' loaded · loading more…');
  });

  test('before the first rows of a query: just "Loading…" (the total on hand may be the last query\'s)', () => {
    expect(S.statusText(null, 287502509, 0, true)).toBe('Loading…');
    expect(S.statusText(null, undefined, 0, true)).toBe('Loading…');
  });

  test('not loading: unchanged', () => {
    expect(S.statusText({ first: 0, last: 22 }, 150, 150, false)).toBe('Rows 1–23 of 150');
  });
});
