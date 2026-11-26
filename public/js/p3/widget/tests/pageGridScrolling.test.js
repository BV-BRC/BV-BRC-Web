/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * The scrolling PageGrid's dgrid settings are not independent: three of them
 * have to agree or the grid misbehaves in ways no unit test of the store can
 * see. Each of these was found by driving the grid in a browser, and each
 * failed in a way that is easy to introduce again by "tidying" a number.
 *
 * PageGrid.js is a dijit module with no test harness, so this reads the
 * literals out of the source rather than instantiating it.
 */
const src = fs.readFileSync(path.join(__dirname, '..', 'PageGrid.js'), 'utf8');

function scrollingSetting(name) {
  const block = src.slice(src.indexOf('var scrollingBody'));
  const m = new RegExp(name + ':\\s*([0-9]+)').exec(block);
  if (!m) { throw new Error('scrollingBody has no numeric ' + name); }
  return parseInt(m[1]);
}

// dgrid recomputes rowHeight from the first rows (23.52 px in this app). The
// request distance is bufferRows * rowHeight, so which way a check is
// conservative depends on the direction: a TALL row makes the request distance
// longer (the danger for farOffRemoval), a SHORT row makes it shorter (the
// danger for the unloaded-space cap).
const TALL_ROW = 26;
const SHORT_ROW = 20;

describe('scrolling PageGrid settings', () => {
  const bufferRows = scrollingSetting('bufferRows');
  const farOffRemoval = scrollingSetting('farOffRemoval');
  const maxEmptySpace = scrollingSetting('maxEmptySpace');
  const requestBufferTall = bufferRows * TALL_ROW;
  const requestBufferShort = bufferRows * SHORT_ROW;

  test('THE THRASH: rows are kept at least as far out as they are requested', () => {
    // dgrid requests up to bufferRows * rowHeight beyond the viewport and trims
    // to farOffRemoval beyond it. Trim shorter than request and it loads a page,
    // trims it, loads it again -- store.query alternated start=170 / 564 every
    // 72 ms until the tab hung.
    expect(farOffRemoval).toBeGreaterThanOrEqual(requestBufferTall);
  });

  test('a page that has just landed is not trimmed at once', () => {
    // Trimming starts past 2 * farOffRemoval. Worst case right after a load: the
    // request distance plus one 200-row page.
    const pageHeight = 200 * TALL_ROW;
    expect(2 * farOffRemoval).toBeGreaterThan(requestBufferTall + pageHeight);
  });

  test('the unloaded space is capped below the request distance', () => {
    // Beyond it, End or a thumb drag makes dgrid load a page further on than the
    // next one, leaving a gap.
    expect(maxEmptySpace).toBeLessThan(requestBufferShort);
    expect(maxEmptySpace).toBeGreaterThan(0);
  });

  test('the scroller opts out of browser scroll anchoring', () => {
    // With the viewport inside the unloaded space (End key), that space is the
    // anchor, so each page inserted above it shifts scrollTop down by the same
    // height, which triggers the next load: 141,000 px in three seconds.
    expect(src).toMatch(/bodyNode\.style\.overflowAnchor = 'none'/);
    expect(src).toMatch(/if \(this\.scrolling && this\.bodyNode\)/);
    expect(src).toMatch(/scrolling: true/);
  });

  test('a re-sort or new filter returns to the top, as the pager did', () => {
    // The shared body sets keepScrollPosition: true, which only OnDemandList
    // reads; left in, a re-sort from 79,000 px down landed at the bottom of
    // the first page.
    const block = src.slice(src.indexOf('var scrollingBody'));
    expect(block).toMatch(/keepScrollPosition: false/);
  });

  test('pages are requested while scrolling, not after it stops', () => {
    // 'debounce' (dgrid's default) fires nothing until scrolling ends, which
    // defeats prefetch.
    expect(src).toMatch(/pagingMethod: 'throttleDelayed'/);
  });

  test('the grid draws in 200-row chunks; the store fetches configured pages', () => {
    // The two need not match: the store serves any start/count by slicing
    // whole cursor pages (cursorPaging.sliceRows), and dgrid asks for
    // unaligned ranges anyway. A larger configured page (cursorPageRows)
    // just leaves rows in the store's cache for the grid's next chunks.
    expect(src).toMatch(/minRowsPerPage: PAGE_ROWS/);
    expect(src).toMatch(/maxRowsPerPage: PAGE_ROWS/);
    expect(parseInt(/var PAGE_ROWS = ([0-9]+)/.exec(src)[1])).toBe(200);
    const store = fs.readFileSync(path.join(__dirname, '..', '..', 'store', 'P3JsonRest.js'), 'utf8');
    expect(store).toMatch(/cursorPaging\.pageSizes\(window\.App\)/);
    const paging = fs.readFileSync(path.join(__dirname, '..', '..', 'store', 'cursorPaging.js'), 'utf8');
    expect(parseInt(/var DEFAULT_PAGE_ROWS = ([0-9]+)/.exec(paging)[1])).toBe(200);
  });
});
