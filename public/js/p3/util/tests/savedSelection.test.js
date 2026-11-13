/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * Saving and restoring a saved search's row selection.
 *
 * The behaviour worth pinning is the failure handling, not the happy path:
 *
 * - dgrid accepts `select(id)` for an id that is not in the result set. It
 *   does not throw, the id lands in `grid.selection`, nothing highlights,
 *   and GridContainer's `select` handler drops it (it maps ids through
 *   `grid.row(id).data`). The selection map, the DOM and the action bar
 *   then disagree. Measured in a live grid before this module existed.
 * - A selection can be megabytes; the preferences file is read on every
 *   page load, so it is capped at save time.
 */

function loadSavedSelection() {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'savedSelection.js'), 'utf8');
  let exported;
  const define = function (deps, factory) { exported = factory(); };
  // eslint-disable-next-line no-new-func
  new Function('define', src)(define);
  return exported;
}

const savedSelection = loadSavedSelection();
const MAX = savedSelection.MAX_SAVED_SELECTION;

/**
 * A dgrid stand-in with the behaviour that matters: row() returns an object
 * for any id, but only carries an `element` when the row is really there --
 * which is the only reliable signal that select() will do anything.
 */
function makeGrid(presentIds) {
  const present = new Set(presentIds);
  return {
    selection: {},
    selected: [],
    row: function (id) {
      return present.has(id) ? { id: id, element: {} } : { id: id };
    },
    select: function (id) {
      this.selection[id] = true;
      this.selected.push(id);
    }
  };
}

describe('capSelection', () => {
  test('an empty or absent selection stores nothing', () => {
    expect(savedSelection.capSelection(null))
      .toEqual({ ids: null, total: 0, truncated: false });
    expect(savedSelection.capSelection([]))
      .toEqual({ ids: null, total: 0, truncated: false });
  });

  test('a small selection is kept whole', () => {
    const r = savedSelection.capSelection(['a', 'b', 'c']);
    expect(r.ids).toEqual(['a', 'b', 'c']);
    expect(r.total).toBe(3);
    expect(r.truncated).toBe(false);
  });

  test('copies rather than aliasing the caller array', () => {
    const input = ['a', 'b'];
    const r = savedSelection.capSelection(input);
    r.ids.push('c');
    expect(input).toEqual(['a', 'b']);
  });

  test('exactly at the cap is not truncated', () => {
    const ids = Array.from({ length: MAX }, (_, i) => 'id' + i);
    const r = savedSelection.capSelection(ids);
    expect(r.ids.length).toBe(MAX);
    expect(r.truncated).toBe(false);
    expect(r.total).toBe(MAX);
  });

  test('THE CAP: a huge selection is truncated and says so', () => {
    const ids = Array.from({ length: MAX + 500 }, (_, i) => 'id' + i);
    const r = savedSelection.capSelection(ids);
    expect(r.ids.length).toBe(MAX);
    expect(r.truncated).toBe(true);
    // The original size is retained so the UI can report honestly.
    expect(r.total).toBe(MAX + 500);
  });
});

describe('applySelection', () => {
  test('selects the rows that are present', () => {
    const grid = makeGrid(['a', 'b', 'c']);
    const r = savedSelection.applySelection(grid, ['a', 'c']);
    expect(grid.selected).toEqual(['a', 'c']);
    expect(r).toEqual({ restored: 2, missing: 0, total: 2 });
  });

  test('THE PHANTOM TRAP: ids with no row are never passed to select()', () => {
    // dgrid would accept these silently and leave the selection map
    // disagreeing with the DOM and the action bar.
    const grid = makeGrid(['a']);
    const r = savedSelection.applySelection(grid, ['a', 'ghost1', 'ghost2']);

    expect(grid.selected).toEqual(['a']);
    expect(grid.selection.ghost1).toBeUndefined();
    expect(grid.selection.ghost2).toBeUndefined();
    expect(r).toEqual({ restored: 1, missing: 2, total: 3 });
  });

  test('a row object without an element does not count as present', () => {
    const grid = makeGrid([]);
    const r = savedSelection.applySelection(grid, ['x']);
    expect(grid.selected).toEqual([]);
    expect(r.restored).toBe(0);
    expect(r.missing).toBe(1);
  });

  test('a throwing row() is treated as missing, not fatal', () => {
    const grid = makeGrid(['a']);
    grid.row = function () { throw new Error('boom'); };
    const r = savedSelection.applySelection(grid, ['a']);
    expect(r).toEqual({ restored: 0, missing: 1, total: 1 });
  });

  test('a throwing select() counts as missing rather than restored', () => {
    const grid = makeGrid(['a']);
    grid.select = function () { throw new Error('nope'); };
    const r = savedSelection.applySelection(grid, ['a']);
    expect(r).toEqual({ restored: 0, missing: 1, total: 1 });
  });

  test('no ids, no grid, or a grid without select is a no-op', () => {
    expect(savedSelection.applySelection(makeGrid(['a']), []))
      .toEqual({ restored: 0, missing: 0, total: 0 });
    expect(savedSelection.applySelection(null, ['a']))
      .toEqual({ restored: 0, missing: 0, total: 1 });
    expect(savedSelection.applySelection({}, ['a']))
      .toEqual({ restored: 0, missing: 0, total: 1 });
  });
});

describe('describeRestore', () => {
  test('says nothing when everything was restored', () => {
    // Silence on the clean path: a toast for "it worked" is noise.
    expect(savedSelection.describeRestore(
      { restored: 3, missing: 0, total: 3 })).toBeNull();
  });

  test('reports missing rows, because a smaller selection looks like data loss', () => {
    const msg = savedSelection.describeRestore(
      { restored: 2, missing: 3, total: 5 });
    expect(msg).toContain('2 of 5');
    expect(msg).toContain('3 no longer match');
  });

  test('reports a truncated save', () => {
    const msg = savedSelection.describeRestore(
      { restored: MAX, missing: 0, total: MAX }, MAX + 500);
    expect(msg).toContain(String(MAX));
    expect(msg).toContain(String(MAX + 500));
  });

  test('nothing to say when there was no selection', () => {
    expect(savedSelection.describeRestore(
      { restored: 0, missing: 0, total: 0 })).toBeNull();
    expect(savedSelection.describeRestore(null)).toBeNull();
  });
});
