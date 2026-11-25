/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * IrdSequenceSearch's submit path, run against the real widget code with
 * stand-ins for Dojo and the network. The form's DOM needs dijit, so the
 * methods are exercised on a plain object carrying the real implementations.
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
const irdSequenceQuery = loadAmd('util/irdSequenceQuery.js', [TextInputEncoder, pattern]);

const lang = {
  hitch: (obj, fn) => (typeof fn === 'string' ? function () { return obj[fn].apply(obj, arguments); } : fn.bind(obj)),
  // Like dojo/_base/lang.mixin: any number of sources.
  mixin: (dest, ...sources) => Object.assign(dest, ...sources)
};

/** A dojo/request stand-in: POSTs are answered by `respond(collection, body)`. */
function fakeRequest(respond) {
  const calls = [];
  const post = (url, opts) => {
    const collection = url.replace(/\/$/, '').split('/').pop();
    calls.push({ collection, body: opts.data });
    const result = respond(collection, opts.data);
    const p = result.error ? Promise.reject(result.error) : Promise.resolve(result.data);
    p.catch(() => {});
    p.response = result.error ? p : Promise.resolve({ getHeader: (h) => (h === 'Content-Range' ? result.range : null) });
    return p;
  };
  return { post, get: () => Promise.resolve({}), calls };
}

function loadWidget(request, published) {
  const declare = (bases, props) => props;
  const Topic = { publish: (topic, msg) => published.push({ topic, msg }) };
  return loadAmd('widget/search/IrdSequenceSearch.js', [
    declare, lang, {}, {}, Topic,
    request, function Memory() {},
    {}, {}, {},
    '<form></form>',
    () => Promise.resolve(), {}, TextInputEncoder,
    () => 'TOKEN', irdSequenceQuery
  ]);
}

function textBox(value, valid) {
  return { get: (k) => (k === 'invalidMessage' ? 'Enter a four-digit year' : value), isValid: () => valid !== false, focus: jest.fn() };
}

/** A widget instance with the fields onSubmit touches. */
function makeSearch(state, respond, dates) {
  global.window = { App: { dataServiceURL: 'https://api.example/api' }, document: {} };
  const published = [];
  const request = fakeRequest(respond);
  const proto = loadWidget(request, published);
  const d = dates || {};
  const w = Object.assign(Object.create(proto), {
    getState: () => state,
    messageNode: { textContent: '', style: {} },
    submitNode: { disabled: false },
    collectionYearFromNode: textBox(d.yearFrom || ''),
    collectionYearToNode: textBox(d.yearTo || '', d.yearToValid),
    collectionDateFromNode: textBox(''),
    collectionDateToNode: textBox(''),
    submissionDateFromNode: textBox(''),
    submissionDateToNode: textBox('')
  });
  return { w, published, calls: request.calls };
}

const H5 = {
  grain: 'segment', virusTypes: ['A'], fullSubtype: ['H5N1'], segments: ['HA']
};

describe('IrdSequenceSearch submit', () => {
  test('a search with results opens the matching BV-BRC list', async () => {
    const { w, published } = makeSearch(H5, () => ({ data: [], range: 'items 0-0/32857' }));
    await w.onSubmit();
    expect(w.messageNode.style.display).toBe('none');
    expect(published).toHaveLength(1);
    expect(published[0].topic).toBe('/navigate');
    const href = published[0].msg.href;
    expect(href.startsWith('/view/SequenceList/?eq(sequence_id,*)&genome(')).toBe(true);
    expect(href.endsWith('#view_tab=sequences')).toBe(true);
    expect(w.submitNode.disabled).toBe(false);
  });

  test('results views per grain', async () => {
    for (const [grain, start, hash] of [
      ['strain', '/view/GenomeList/?', '#view_tab=genomes'],
      ['protein', '/view/FeatureList/?', '#view_tab=features']
    ]) {
      const { w, published } = makeSearch({ grain, virusTypes: ['A'] }, () => ({ data: [], range: 'items 0-0/9' }));
      // eslint-disable-next-line no-await-in-loop
      await w.onSubmit();
      expect(published[0].msg.href.startsWith(start)).toBe(true);
      expect(published[0].msg.href.endsWith(hash)).toBe(true);
    }
  });

  test('THE POINT: a search over the join limit is explained on the form, not opened as an empty grid', async () => {
    const tooBroad = {
      response: {
        data: {
          status: 400, error: 'join_too_broad', genomeCount: 179944, limit: 150000
        }
      }
    };
    const { w, published } = makeSearch({ grain: 'segment', virusTypes: ['A'], country: ['USA'] }, () => ({ error: tooBroad }));
    await w.onSubmit();
    expect(published).toEqual([]);
    expect(w.messageNode.style.display).toBe('');
    expect(w.messageNode.textContent).toContain((179944).toLocaleString() + ' genomes');
    expect(w.messageNode.textContent).toContain('Narrow it');
    expect(w.submitNode.disabled).toBe(false);
  });

  test('the error body may arrive as text', async () => {
    const tooBroad = { response: { data: JSON.stringify({ error: 'join_too_broad', genomeCount: 200000 }) } };
    const { w } = makeSearch(H5, () => ({ error: tooBroad }));
    await w.onSubmit();
    expect(w.messageNode.textContent).toContain((200000).toLocaleString() + ' genomes');
  });

  test('THE POINT: no matches is said plainly instead of opening an empty grid', async () => {
    const { w, published } = makeSearch(H5, () => ({ data: [], range: 'items 0-0/0' }));
    await w.onSubmit();
    expect(published).toEqual([]);
    expect(w.messageNode.textContent).toBe('No records match this search.');
  });

  test('other API errors show the API\'s message', async () => {
    const { w, published } = makeSearch(H5, () => ({ error: { response: { data: { message: 'undefined field x' } } } }));
    await w.onSubmit();
    expect(published).toEqual([]);
    expect(w.messageNode.textContent).toBe('undefined field x');
  });

  test('no virus type selected: nothing is sent', async () => {
    const { w, calls } = makeSearch({ grain: 'segment', virusTypes: [] }, () => ({ data: [], range: 'items 0-0/1' }));
    await w.onSubmit();
    expect(calls).toEqual([]);
    expect(w.messageNode.textContent).toBe('Choose at least one virus type.');
  });

  test('THE POINT: a mistyped date stops the search instead of being dropped', async () => {
    // Dropping it would silently widen the search.
    const { w, calls } = makeSearch(H5, () => ({ data: [], range: 'items 0-0/1' }), { yearTo: '20x4', yearToValid: false });
    await w.onSubmit();
    expect(calls).toEqual([]);
    expect(w.messageNode.textContent).toContain('Enter a four-digit year');
    expect(w.collectionYearToNode.focus).toHaveBeenCalled();
  });

  test('THE POINT: a strain search by accession resolves genome IDs through the segment records first', async () => {
    const state = { grain: 'strain', virusTypes: ['A'], accessions: 'CY121680, KU143263' };
    const { w, published, calls } = makeSearch(state, (collection) => (collection === 'genome_sequence'
      ? { data: [{ genome_id: '641809.294' }, { genome_id: '641809.288' }, { genome_id: '641809.294' }] }
      : { data: [], range: 'items 0-0/2' }));
    await w.onSubmit();
    expect(calls[0].collection).toBe('genome_sequence');
    expect(calls[0].body).toContain('select(genome_id)');
    expect(calls[1].collection).toBe('genome');
    expect(calls[1].body).toContain('in(genome_id,(641809.294,641809.288))');
    expect(published[0].msg.href).toContain('in(genome_id,(641809.294,641809.288))');
    expect(published[0].msg.href).not.toContain('genbank_accessions');
  });

  test('accessions found in no genome: said on the form', async () => {
    const state = { grain: 'strain', virusTypes: ['A'], accessions: 'ZZ000000' };
    const { w, published } = makeSearch(state, () => ({ data: [] }));
    await w.onSubmit();
    expect(published).toEqual([]);
    expect(w.messageNode.textContent).toBe('No genomes contain those accessions.');
  });

  test('the count request is the built query plus limit(1)', async () => {
    const { w, calls, published } = makeSearch(H5, () => ({ data: [], range: 'items 0-0/5' }));
    await w.onSubmit();
    const built = irdSequenceQuery.buildQuery(H5);
    expect(calls[0]).toEqual({ collection: built.collection, body: built.query + '&limit(1)' });
    expect(published[0].msg.href).toBe('/view/SequenceList/?' + built.query + '#view_tab=sequences');
  });
});

describe('IrdSequenceSearch source', () => {
  const SRC = fs.readFileSync(path.join(P3, 'widget/search/IrdSequenceSearch.js'), 'utf8');

  test('pick lists are scoped by lineage, not exact taxon IDs', () => {
    // Exact IDs cover 234,840 of 360,452 Influenza A genomes on alpha.
    expect(SRC).toContain("return 'taxon_lineage_ids:(' + ids.join(' OR ') + ')';");
    expect(SRC).not.toMatch(/buildTaxonCondition/);
  });

  test('does not extend InfluenzaSearch or SearchBase (decision D3)', () => {
    expect(SRC).not.toMatch(/['"]\.\/(InfluenzaSearch|SearchBase)['"]/);
  });
});
