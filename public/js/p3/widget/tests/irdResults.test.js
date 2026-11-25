/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * viewer/IrdResults (the IRD results page) and util/irdSearchRunner, run on
 * the real code with stand-ins for Dojo, the grid containers and the API.
 */

const P3 = path.join(__dirname, '..', '..');

function loadAmd(rel, deps) {
  const src = fs.readFileSync(path.join(P3, rel), 'utf8');
  let exported;
  // eslint-disable-next-line no-new-func
  new Function('define', src)(function (d, factory) { exported = factory.apply(null, deps || []); });
  return exported;
}

const TextInputEncoder = loadAmd('widget/search/TextInputEncoder.js');
const pattern = loadAmd('util/fullCollectionDatePattern.js');
const Q = loadAmd('util/irdSequenceQuery.js', [TextInputEncoder, pattern]);
const runner = loadAmd('util/irdSearchRunner.js', [Q]);
const irdColumns = loadAmd('util/irdColumns.js');

const lang = {
  hitch: (obj, fn) => (typeof fn === 'string' ? function () { return obj[fn].apply(obj, arguments); } : fn.bind(obj)),
  mixin: (dest, ...sources) => Object.assign(dest, ...sources)
};

/** A transport answering counts with `range` and errors with `error`. */
function transport(answer) {
  const calls = [];
  const post = (collection, body) => {
    calls.push({ collection, body });
    const a = answer(collection, body);
    const p = a.error ? Promise.reject(a.error) : Promise.resolve(a.data || []);
    p.catch(() => {});
    p.response = a.error ? p : Promise.resolve({ getHeader: () => a.range });
    return p;
  };
  return { post, calls };
}

describe('irdSearchRunner', () => {
  test('run: builds, counts, and gives the results page with the form state in the hash', async () => {
    const t = transport(() => ({ range: 'items 0-0/42' }));
    const state = { grain: 'segment', virusTypes: ['A'], segments: ['HA'] };
    const r = await runner.run(state, t.post);
    expect(r.count).toBe(42);
    expect(r.href).toBe('/ird/results/segment/?' + Q.buildQuery(state).query
      + '#irdState=' + encodeURIComponent(JSON.stringify(state)));
  });

  test('portable state drops resolved genome IDs; the accessions stay', () => {
    expect(runner.portableState({ grain: 'strain', accessions: 'CY1', genomeIds: ['g1'] })).toEqual({ grain: 'strain', accessions: 'CY1' });
  });

  test('count: zero matches and refused joins become messages', async () => {
    await expect(runner.count({ collection: 'genome', query: 'q' }, transport(() => ({ range: 'items 0-0/0' })).post))
      .rejects.toThrow('No records match this search.');
    const tooBroad = { response: { data: { error: 'join_too_broad', genomeCount: 179944 } } };
    await expect(runner.count({ collection: 'genome', query: 'q' }, transport(() => ({ error: tooBroad })).post))
      .rejects.toThrow((179944).toLocaleString() + ' genomes');
  });
});

// ----- IrdResults -----

function fakeContainerClass(log) {
  return function Container(opts) {
    this.opts = opts;
    this.sets = [];
    this.destroyed = false;
    this.selection = [];
    this.selectionActionBar = { get: () => this.selection };
    this.set = (k, v) => { this.sets.push([k, v]); if (k === 'state') this.state = v; };
    this.destroyRecursive = () => { this.destroyed = true; };
    log.push(this);
  };
}

function makeViewer(answer) {
  const published = [];
  const created = { segment: [], protein: [], strain: [] };
  const t = transport(answer || (() => ({ range: 'items 0-0/7' })));
  const declare = (bases, props) => props;
  const Topic = { publish: (topic, msg) => published.push(msg) };
  const proto = loadAmd('widget/viewer/IrdResults.js', [
    declare, lang, {}, {}, Topic, {},
    {}, function ContentPane() {},
    fakeContainerClass(created.segment), fakeContainerClass(created.protein), fakeContainerClass(created.strain),
    () => 'T', irdColumns, Q, runner
  ]);
  const v = Object.assign(Object.create(proto), {
    _started: true,
    children: [],
    addChild: function (c) { this.children.push(c); },
    removeChild: function (c) { this.children = this.children.filter((x) => x !== c); },
    _set: function (k, val) { this[k] = val; },
    titleNode: {},
    hintNode: {},
    messageNode: { textContent: '', style: {} },
    switchButtons: {
      segment: { classList: { toggle: () => {} } },
      protein: { classList: { toggle: () => {} } },
      strain: { classList: { toggle: () => {} } }
    },
    _post: t.post
  });
  return {
    v, published, created, calls: t.calls
  };
}

function stateFor(grain, query, formState) {
  const hashParams = formState ? { irdState: encodeURIComponent(JSON.stringify(formState)) } : {};
  return { pathname: '/ird/results/' + grain + '/', search: query, hashParams };
}

const FORM = {
  grain: 'segment', virusTypes: ['A'], fullSubtype: ['H5N1'], segments: ['HA']
};

describe('IrdResults page', () => {
  test('THE POINT: the grid gets its state after it starts, so the first view is filtered', () => {
    // State given only to the constructor leaves GridContainer's first view
    // unfiltered: it showed all 287,502,509 BV-BRC sequences.
    const { v, created } = makeViewer();
    v._setStateAttr(stateFor('segment', 'eq(segment,HA)', FORM));
    const c = created.segment[0];
    const visibleAt = c.sets.findIndex((s) => s[0] === 'visible');
    const stateAt = c.sets.findIndex((s) => s[0] === 'state');
    expect(visibleAt).toBeGreaterThan(-1);
    expect(stateAt).toBeGreaterThan(visibleAt);
    expect(c.state.search).toBe('eq(segment,HA)');
  });

  test('the grid gets IRD\'s columns for its grain', () => {
    const { v, created } = makeViewer();
    v._setStateAttr(stateFor('strain', 'eq(genome_id,*)', FORM));
    expect(created.strain[0].state.hashParams.defaultColumns).toBe(irdColumns.defaultColumns('strain'));
  });

  test('a new query at the same grain reuses the grid; a new grain replaces it', () => {
    const { v, created } = makeViewer();
    v._setStateAttr(stateFor('segment', 'q1', FORM));
    v._setStateAttr(stateFor('segment', 'q2', FORM));
    expect(created.segment).toHaveLength(1);
    expect(created.segment[0].state.search).toBe('q2');
    v._setStateAttr(stateFor('protein', 'q3', FORM));
    expect(created.segment[0].destroyed).toBe(true);
    expect(created.protein).toHaveLength(1);
    expect(v.children).toEqual([created.protein[0]]);
  });

  test('before startup the state is only stored', () => {
    const { v, created } = makeViewer();
    v._started = false;
    v._setStateAttr(stateFor('segment', 'q', FORM));
    expect(created.segment).toEqual([]);
  });

  test('THE POINT: nothing selected: the whole search, re-run at the other grain', async () => {
    const { v, published, calls } = makeViewer();
    v._setStateAttr(stateFor('segment', Q.buildQuery(FORM).query, FORM));
    await v.switchTo('strain');
    const strainState = Object.assign({}, FORM, { grain: 'strain' });
    expect(calls[0]).toEqual({ collection: 'genome', body: Q.buildQuery(strainState).query + '&limit(1)' });
    expect(published[0].href).toBe(runner.resultsHref('strain', Q.buildQuery(strainState).query, strainState));
  });

  test('THE POINT: rows selected: just those records, at the other grain', async () => {
    const { v, published, created } = makeViewer();
    v._setStateAttr(stateFor('segment', 'q', FORM));
    created.segment[0].selection = [{ sequence_id: 's1', genome_id: 'g1' }, { sequence_id: 's2', genome_id: 'g1' }];
    await v.switchTo('strain');
    expect(published[0].href).toBe('/ird/results/strain/?in(genome_id,(g1))');
  });

  test('a page reached from a selection switches selections only', async () => {
    const { v, published } = makeViewer();
    v._setStateAttr(stateFor('strain', 'in(genome_id,(g1))', null));
    expect(v.formState).toBeNull();
    await v.switchTo('segment');
    expect(published).toEqual([]);
    expect(v.messageNode.textContent).toBe('Select rows to show them as segments.');
  });

  test('a refused or empty switch is explained on the page, not opened', async () => {
    const tooBroad = { response: { data: { error: 'join_too_broad', genomeCount: 200000 } } };
    const { v, published } = makeViewer(() => ({ error: tooBroad }));
    v._setStateAttr(stateFor('strain', 'q', Object.assign({}, FORM, { grain: 'strain' })));
    await v.switchTo('segment');
    expect(published).toEqual([]);
    expect(v.messageNode.textContent).toContain((200000).toLocaleString() + ' genomes');
  });

  test('switching to the current grain does nothing', async () => {
    const { v, published, calls } = makeViewer();
    v._setStateAttr(stateFor('segment', 'q', FORM));
    await v.switchTo('segment');
    expect(published).toEqual([]);
    expect(calls).toEqual([]);
  });

  test('an unreadable irdState is treated as none', () => {
    const { v } = makeViewer();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    v._setStateAttr({ pathname: '/ird/results/segment/', search: 'q', hashParams: { irdState: '%7Bnot-json' } });
    spy.mockRestore();
    expect(v.formState).toBeNull();
  });
});

describe('client routes (p3app.js)', () => {
  const SRC = fs.readFileSync(path.join(P3, 'app/p3app.js'), 'utf8');

  test.each(['/ird/search/sequences', '/ird/results/(segment|protein|strain)(/.*)?'])(
    'THE POINT: %s builds its state from params.newPath',
    (route) => {
      // The router passes the first capture group as the second argument, not
      // the path: using it produced /ird/results/segment/segment with no query.
      const start = SRC.indexOf("Router.register('" + route + "'");
      expect(start).toBeGreaterThan(-1);
      const body = SRC.slice(start, SRC.indexOf('});', start));
      expect(body).toContain('getState(params, params.newPath)');
      expect(body).toContain('window.App.enableIrdSearch');
    }
  );
});
