/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * FilterContainerActionBar's facet refresh, run on the real code with
 * stand-ins for Dojo and the API.
 */

const P3 = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(P3, 'widget/FilterContainerActionBar.js'), 'utf8');

function loadAmd(rel) {
  const src = fs.readFileSync(path.join(P3, rel), 'utf8');
  let exported;
  // eslint-disable-next-line no-new-func
  new Function('define', src)(function (deps, factory) { exported = factory(); });
  return exported;
}

const facetQuery = loadAmd('util/facetQuery.js');

function loadPanelProto() {
  global.window = global.window || {};
  window.App = window.App || {};
  let proto;
  // eslint-disable-next-line no-new-func
  new Function('define', SRC)(function (deps, factory) {
    const stubs = deps.map(function (d) {
      if (d === 'dojo/_base/declare') return (bases, props) => props;
      if (d === 'dojo/_base/lang') return { hitch: (obj, fn) => fn.bind(obj) };
      if (d === '../util/facetQuery') return facetQuery;
      return {};
    });
    proto = factory.apply(null, stubs);
  });
  return proto;
}

const proto = loadPanelProto();

/** A panel whose getFacets records requests and answers when told to. */
function makePanel(fields) {
  const pending = [];
  const widgets = {};
  fields.forEach((f) => { widgets[f] = { data: null, set: function (k, v) { this.data = v; } }; });
  const panel = Object.assign(Object.create(proto), {
    query: 'eq(taxon_lineage_ids,11320)',
    facetFields: fields,
    _filter: {},
    _ffWidgets: widgets,
    state: {},
    _clearFacetUnavailable: () => {},
    _set: function (k, v) { this[k] = v; },
    getFacets: function (query, requested) {
      let resolve;
      const p = new Promise((r) => { resolve = r; });
      pending.push({ query: query.substr(1), fields: requested || fields, resolve });
      return p;
    }
  });
  /** Answer a request with one bucket per field, labelled with `tag`. */
  const answer = async (i, tag) => {
    const out = {};
    pending[i].fields.forEach((f) => { out[f] = [{ label: tag, value: tag, count: 1 }]; });
    pending[i].resolve(out);
    await new Promise((r) => { setTimeout(r, 0); });
  };
  return {
    panel, pending, widgets, answer
  };
}

const YEAR = 'eq(collection_year,%222019%22)';

describe('facet refresh after a selection', () => {
  test('THE POINT: the selected category is fetched without its own selection', async () => {
    const {
      panel, pending, widgets, answer
    } = makePanel(['collection_year', 'host_common_name']);
    panel._filter = { collection_year: YEAR };
    panel._refreshAllFacets();
    expect(pending.map((p) => [p.query, p.fields])).toEqual([
      ['and(eq(taxon_lineage_ids,11320),' + YEAR + ')', ['host_common_name']],
      ['eq(taxon_lineage_ids,11320)', ['collection_year']]
    ]);
    await answer(0, 'filtered');
    await answer(1, 'all-years');
    expect(widgets.collection_year.data[0].label).toBe('all-years');
    expect(widgets.host_common_name.data[0].label).toBe('filtered');
  });

  test('a slow response from an earlier click does not overwrite a later one', async () => {
    const { panel, widgets, answer } = makePanel(['collection_year']);
    panel._filter = { collection_year: YEAR };
    panel._refreshAllFacets(['a']);
    panel._refreshAllFacets(['b']);
    await answer(1, 'new');
    await answer(0, 'old');
    expect(widgets.collection_year.data[0].label).toBe('new');
  });

  test('the same refresh twice (click, then the URL catching up) is fetched once', () => {
    const { panel, pending } = makePanel(['collection_year']);
    panel._filter = { collection_year: YEAR };
    panel._refreshAllFacets();
    panel._refreshAllFacets();
    expect(pending).toHaveLength(1);
  });

  test('a failed request can be retried', async () => {
    const { panel, pending } = makePanel(['collection_year']);
    panel._refreshAllFacets();
    pending[0].resolve(new Error('503'));
    await new Promise((r) => { setTimeout(r, 0); });
    panel._refreshAllFacets();
    expect(pending).toHaveLength(2);
  });

  test('unfiltered counts from a new query do not overwrite a filtered round started after them', async () => {
    const { panel, widgets, answer } = makePanel(['host_common_name']);
    panel._setQueryAttr('eq(taxon_lineage_ids,2697049)');
    panel._filter = { collection_year: YEAR };
    panel._refreshAllFacets();
    await answer(1, 'filtered');
    await answer(0, 'unfiltered');
    expect(widgets.host_common_name.data[0].label).toBe('filtered');
  });
});
