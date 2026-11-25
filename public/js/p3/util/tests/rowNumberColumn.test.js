/* eslint-env jest */
const fs = require('fs');
const path = require('path');

const P3 = path.join(__dirname, '..', '..');

function loadAmd(rel, deps) {
  const src = fs.readFileSync(path.join(P3, rel), 'utf8');
  let exported;
  // eslint-disable-next-line no-new-func
  new Function('define', src)(function (d, factory) {
    exported = factory.apply(null, deps || (Array.isArray(d) ? d.map(() => ({})) : []));
  });
  return exported;
}

const R = loadAmd('util/rowNumberColumn.js');

describe('rowNumberColumn', () => {
  test('the flag is on only for true or "true" (argv/env deliver strings)', () => {
    expect(R.isEnabled({ showRowNumbers: true })).toBe(true);
    expect(R.isEnabled({ showRowNumbers: 'true' })).toBe(true);
    expect(R.isEnabled({ showRowNumbers: 'false' })).toBe(false);
    expect(R.isEnabled({})).toBe(false);
    expect(R.isEnabled(undefined)).toBe(false);
  });

  test('placed right after the checkbox column', () => {
    const cols = { 'Selection Checkboxes': { x: 1 }, genome_name: { label: 'Name' }, genome_id: { label: 'ID' } };
    expect(Object.keys(R.withRowNumbers(cols))).toEqual(['Selection Checkboxes', R.KEY, 'genome_name', 'genome_id']);
  });

  test('first when there is no checkbox column', () => {
    expect(Object.keys(R.withRowNumbers({ a: {}, b: {} }))).toEqual([R.KEY, 'a', 'b']);
  });

  test('never mutates the input (grid columns are often shared prototype objects)', () => {
    const cols = { a: {} };
    const out = R.withRowNumbers(cols);
    expect(out).not.toBe(cols);
    expect(Object.keys(cols)).toEqual(['a']);
    expect(out.a).toBe(cols.a);
  });

  test('added once; array column definitions are left alone', () => {
    const once = R.withRowNumbers({ a: {} });
    expect(R.withRowNumbers(once)).toBe(once);
    const arr = [{ field: 'a' }];
    expect(R.withRowNumbers(arr)).toBe(arr);
    expect(R.withRowNumbers(null)).toBe(null);
  });

  test('display only: not sortable, not in the column chooser, no real field', () => {
    const col = R.withRowNumbers({ a: {} })[R.KEY];
    expect(col.sortable).toBe(false);
    expect(col.unhidable).toBe(true);
    expect(col.field).toBe(R.FIELD);
    expect(col.label).toBe('#');
  });

  test('THE POINT: the number is the position in the whole result, 1-based', () => {
    expect(R.label(0)).toBe('1');
    expect(R.label(200)).toBe((201).toLocaleString()); // first row of page 2
    expect(R.label(4200)).toBe((4201).toLocaleString());
    expect(R.label(undefined)).toBe('');
    expect(R.label(-1)).toBe('');
  });
});

describe('the row-number column never becomes data', () => {
  // Its field is not a real one: in a download's select() or sort() an unknown
  // field can produce a silent empty file (CLAUDE.md, Pitfall 1a).
  const lang = { mixin: (dest, ...sources) => Object.assign(dest, ...sources) };
  const QD = loadAmd('util/QueryDescriptor.js', [lang, () => '']);
  const cols = R.withRowNumbers({
    'Selection Checkboxes': { unhidable: true },
    genome_name: { label: 'Genome Name' }
  });

  test.each(['visibleColumns', 'availableColumns'])('the download wizard\'s %s leave it out', (prop) => {
    // createFromGrid is the wizard's entry point; its column lists become the
    // download's select() and saved column sets.
    const d = QD.createFromGrid({ columns: cols, query: 'eq(genome_id,*)' }, 'genome_data', {});
    expect(d[prop].map((c) => c.field)).toEqual(['genome_name']);
  });

  test.each(['widget/GridCopyToClipboard.js', 'widget/CopyTooltipDialog.js'])('%s skips it when copying', (rel) => {
    const src = fs.readFileSync(path.join(P3, rel), 'utf8');
    expect(src).toMatch(/\['Selection Checkboxes', 'Row Number', 'public'\]\.indexOf/);
  });

  test('the key those modules skip is the module\'s KEY', () => {
    expect(R.KEY).toBe('Row Number');
  });
});
