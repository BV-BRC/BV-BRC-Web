/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * PageGrid.Scrolling cancels the previous refresh's query when a new refresh
 * starts. dgrid's OnDemandList does not, and the last answer to arrive sets
 * the grid's total: a tab's unfiltered first query (287,502,509 sequences)
 * answered after its real one (75) and the grid kept the wrong total.
 *
 * Runs the real PageGrid.js with stand-ins for Dojo and dgrid.
 */

const src = fs.readFileSync(path.join(__dirname, '..', 'PageGrid.js'), 'utf8');

function loadScrollingPrototype() {
  global.window = global.window || {};
  window.App = window.App || {};
  let exported;
  // eslint-disable-next-line no-new-func
  new Function('define', 'dojo', src)(function (deps, factory) {
    const stubs = deps.map((d) => {
      if (d === 'dojo/_base/declare') {
        return (bases, props) => { function Ctor() {} Ctor.prototype = props; return Ctor; };
      }
      if (d === 'dojo/_base/lang') return { mixin: (dest, ...s) => Object.assign(dest, ...s), hitch: (o, f) => f.bind(o) };
      if (d === 'dojo/has') return () => false;
      if (d === '../store/cursorPaging') return { isEnabled: () => false };
      return {};
    });
    exported = factory.apply(null, stubs);
  }, {});
  return exported.Scrolling.prototype;
}

const proto = loadScrollingPrototype();

/** A grid whose inherited refresh/renderQuery are recorded stand-ins. */
function makeGrid() {
  const calls = [];
  const grid = Object.create(proto);
  grid.inherited = function (args) {
    const name = args.callee ? args.callee.nom : null;
    calls.push(name);
    return grid._next;
  };
  return { grid, calls };
}

function fakeResults() {
  return { cancelled: 0, cancel() { this.cancelled++; } };
}

describe('PageGrid.Scrolling refresh', () => {
  test('THE POINT: a new refresh cancels the previous refresh\'s query', () => {
    const { grid } = makeGrid();
    const first = fakeResults();
    grid._next = first;
    proto.renderQuery.call(grid, () => {}, undefined);
    expect(grid._refreshResults).toBe(first);

    const order = [];
    first.cancel = () => order.push('cancel old');
    grid.inherited = () => { order.push('start new refresh'); };
    proto.refresh.call(grid);
    // Old first: dgrid's error handler rejects whichever refresh is current.
    expect(order).toEqual(['cancel old', 'start new refresh']);
    expect(grid._refreshResults).toBeNull();
  });

  test('nested renders (with a container) are not taken for the refresh query', () => {
    const { grid } = makeGrid();
    const top = fakeResults();
    grid._next = top;
    proto.renderQuery.call(grid, () => {}, undefined);
    grid._next = fakeResults();
    proto.renderQuery.call(grid, () => {}, { container: {} });
    expect(grid._refreshResults).toBe(top);
  });

  test('a settled or non-cancellable result is left alone', () => {
    const { grid } = makeGrid();
    grid._refreshResults = { cancel() { throw new Error('already resolved'); } };
    grid.inherited = () => 'refreshed';
    expect(proto.refresh.call(grid)).toBe('refreshed');
    grid._refreshResults = [];
    expect(proto.refresh.call(grid)).toBe('refreshed');
  });
});
