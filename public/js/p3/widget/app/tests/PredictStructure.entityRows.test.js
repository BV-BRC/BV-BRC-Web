/* eslint-env jest */
//
// Typed entity rows in the PredictStructure form.
//
// The rows are presentation only: the form must still submit exactly
// input_file / dna_file / rna_file, leaving the app spec, service script and
// CLI untouched. The risk is the clearing rule -- getValues() collects EVERY
// named widget via this.inherited(arguments) regardless of visibility, so a
// selector left populated after its row changed type would still be submitted
// and the user would silently get a chain they never asked for.
//
// This loads the REAL methods out of PredictStructure.js rather than
// reimplementing them, so it fails if that logic changes.
//
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'PredictStructure.js');
const src = fs.readFileSync(SRC, 'utf8');

/** Extract a named method's parameter list and body from the source. */
function grab(name) {
  const i = src.indexOf('\n    ' + name + ': function');
  if (i < 0) { throw new Error('method not found: ' + name); }
  const sig = src.indexOf('function', i);
  const paren = src.indexOf('(', sig);
  const parenEnd = src.indexOf(')', paren);
  const params = src.slice(paren, parenEnd + 1);
  let j = src.indexOf('{', parenEnd), d = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') { d++; } else if (src[k] === '}') { d--; if (d === 0) { break; } }
  }
  return { params: params, body: src.slice(j, k + 1) };
}

const METHODS = ['_entityTypeOf', '_entityTypesTaken', '_rebuildEntityOptions',
  '_refreshEntityRows', 'onEntityAdd', 'onEntityRemove'];

const ENTITY_TYPES = [
  { value: 'protein', label: 'Protein', slot: 'input_file' },
  { value: 'dna', label: 'DNA', slot: 'dna_file' },
  { value: 'rna', label: 'RNA', slot: 'rna_file' }
];

function mkSelect(vals, value) {
  return { options: vals.map(function (v) { return { value: v }; }), value: value, tagName: 'SELECT' };
}
function mkWidget(name) {
  return {
    name: name, _v: '', domNode: { parentNode: null },
    get: function () { return this._v; },
    set: function (k, v) { if (k === 'value') { this._v = v; } }
  };
}

function makeApp(rowTypes, files) {
  global.document = { scrollingElement: { scrollTop: 0 }, documentElement: { scrollTop: 0 } };
  global.domStyle = { set: function () {} };
  global.domConstruct = {
    empty: function (sel) { sel.options = []; },
    create: function (tag, props, parent) { const o = { value: props.value }; parent.options.push(o); return o; },
    place: function (node, parent) { node.parentNode = parent; }
  };

  const app = {
    _ENTITY_TYPES: ENTITY_TYPES,
    _entityRowCount: rowTypes.length,
    entityParking: { parking: true },
    checkParameterRequiredFields: function () {}
  };
  for (let i = 0; i < 3; i++) {
    app['entityRow' + i] = {};
    app['entityAdd' + i] = {};
    app['entityRemove' + i] = {};
    app['entitySlot' + i] = { slot: i };
    app['entityType' + i] = mkSelect(['protein', 'dna', 'rna'], rowTypes[i] || null);
  }
  ENTITY_TYPES.forEach(function (t) { app[t.slot] = mkWidget(t.slot); });
  Object.keys(files).forEach(function (slot) { app[slot]._v = files[slot]; });
  METHODS.forEach(function (m) {
    const g = grab(m);
    /* eslint-disable no-eval */
    app[m] = eval('(function' + g.params + g.body + ')');
    /* eslint-enable no-eval */
  });
  return app;
}

/** Mirror of getValues()'s _copyIfPresent over the three file parameters. */
function submissionOf(app) {
  const out = {};
  ENTITY_TYPES.forEach(function (t) {
    const v = app[t.slot].get('value');
    if (v) { out[t.slot] = v; }
  });
  return out;
}

function submissionFor(rowTypes, files) {
  const app = makeApp(rowTypes, files);
  app._refreshEntityRows();
  return submissionOf(app);
}

describe('PredictStructure typed entity rows', () => {
  test('all three rows submit all three files', () => {
    expect(submissionFor(['protein', 'dna', 'rna'],
      { input_file: 'p.fasta', dna_file: 'd.fasta', rna_file: 'r.fasta' }))
      .toEqual({ input_file: 'p.fasta', dna_file: 'd.fasta', rna_file: 'r.fasta' });
  });

  test('two rows submit only those two files', () => {
    expect(submissionFor(['protein', 'dna'], { input_file: 'p.fasta', dna_file: 'd.fasta' }))
      .toEqual({ input_file: 'p.fasta', dna_file: 'd.fasta' });
  });

  test('a single protein row submits only the protein file', () => {
    expect(submissionFor(['protein'], { input_file: 'p.fasta' }))
      .toEqual({ input_file: 'p.fasta' });
  });

  test('protein is not required: a DNA-only job submits only dna_file', () => {
    expect(submissionFor(['dna'], { dna_file: 'd.fasta' }))
      .toEqual({ dna_file: 'd.fasta' });
  });

  test('switching a row type clears the file chosen under the old type', () => {
    expect(submissionFor(['rna'], { dna_file: 'stale.fasta', rna_file: 'r.fasta' }))
      .toEqual({ rna_file: 'r.fasta' });
  });

  test('removing a row drops its file from the submission', () => {
    expect(submissionFor(['protein'], { input_file: 'p.fasta', rna_file: 'orphan.fasta' }))
      .toEqual({ input_file: 'p.fasta' });
  });

  test("a row's own option set never changes with its own value", () => {
    // Why the active <select> is never rebuilt: rebuilding the element the
    // user just clicked drops focus and makes the page jump.
    const avail = (rows, i) => ENTITY_TYPES
      .map((t) => t.value)
      .filter((v) => !rows.filter((_, j) => j !== i).includes(v));
    const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((v, i) =>
      perms(a.slice(0, i).concat(a.slice(i + 1))).map((p) => [v].concat(p))));
    let transitions = 0;
    [1, 2, 3].forEach((n) => perms(ENTITY_TYPES.map((t) => t.value)).forEach((p) => {
      const rows = p.slice(0, n);
      rows.forEach((_, i) => avail(rows, i).forEach((nv) => {
        transitions++;
        const after = rows.slice(); after[i] = nv;
        expect(avail(after, i)).toEqual(avail(rows, i));
      }));
    }));
    expect(transitions).toBeGreaterThan(0);
  });
});
