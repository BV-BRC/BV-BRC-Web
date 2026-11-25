/* eslint-env jest */
const fs = require('fs');
const path = require('path');

const P3 = path.join(__dirname, '..', '..');

function loadAmd(rel) {
  const src = fs.readFileSync(path.join(P3, rel), 'utf8');
  let exported;
  // eslint-disable-next-line no-new-func
  new Function('define', src)(function (deps, factory) {
    exported = factory.apply(null, (deps || []).map(() => ({})));
  });
  return exported;
}

const irdColumns = loadAmd('util/irdColumns.js');

/** Column fields declared in a grid module (its `columns` object). */
function gridFields(rel) {
  const src = fs.readFileSync(path.join(P3, rel), 'utf8');
  return new Set([...src.matchAll(/field:\s*'([^']+)'/g)].map((m) => m[1]));
}

// What GridContainer._prepareSearchColumns can add to a sequence or feature
// grid: ColumnsGenome plus the genome's searchable Advanced Search fields.
const ColumnsGenome = loadAmd('widget/ColumnsGenome.js');
const genomeColumnFields = new Set(Object.keys(ColumnsGenome).map((k) => ColumnsGenome[k].field || k));
const advanced = loadAmd('widget/AdvancedSearchFields.js');
const genomeSearchFields = new Set((advanced.genome || []).filter((f) => f.search).map((f) => f.field));
const addable = new Set([...genomeColumnFields, ...genomeSearchFields]);

const GRIDS = {
  segment: gridFields('widget/SequenceGrid.js'),
  protein: gridFields('widget/FeatureGrid.js'),
  strain: genomeColumnFields
};

describe('irdColumns', () => {
  test('defaultColumns is a comma-joined token list', () => {
    expect(irdColumns.defaultColumns('segment').split(',')).toEqual(irdColumns.COLUMNS.segment);
    expect(() => irdColumns.defaultColumns('genome')).toThrow('unknown grain genome');
  });

  test.each(Object.keys(GRIDS))('THE POINT: every %s token names something real', (grain) => {
    // A misspelt token is silently ignored by _prepareSearchColumns: the
    // column just never appears, or a BV-BRC column is never hidden.
    irdColumns.COLUMNS[grain].forEach((token) => {
      const hide = token.charAt(0) === '-';
      const field = hide ? token.slice(1) : token;
      if (hide) {
        if (!GRIDS[grain].has(field)) throw new Error(grain + ': cannot hide ' + field + ', not a grid column');
      } else if (!GRIDS[grain].has(field) && !addable.has(field)) {
        throw new Error(grain + ': ' + field + ' is neither a grid column nor an addable genome field');
      }
    });
  });

  test('no token is both shown and hidden', () => {
    Object.keys(irdColumns.COLUMNS).forEach((grain) => {
      const shown = irdColumns.COLUMNS[grain].filter((t) => t.charAt(0) !== '-');
      const hidden = irdColumns.COLUMNS[grain].filter((t) => t.charAt(0) === '-').map((t) => t.slice(1));
      expect(shown.filter((f) => hidden.includes(f))).toEqual([]);
    });
  });

  test('segment and strain columns show the strain and its key metadata, as IRD did', () => {
    ['segment', 'protein', 'strain'].forEach((grain) => {
      ['strain', 'subtype', 'collection_date', 'host_common_name', 'isolation_country'].forEach((f) => {
        expect(irdColumns.COLUMNS[grain]).toContain(f);
      });
    });
  });

  test('protein columns do not show a segment: protein records have none, and the genome\'s is every segment', () => {
    expect(irdColumns.COLUMNS.protein).not.toContain('segment');
  });

  test('strain columns show the sequence count, so overfilled genomes are visible', () => {
    expect(irdColumns.COLUMNS.strain).toContain('contigs');
  });

  test('strain columns hide the genome\'s own segment list; the per-segment columns replace it', () => {
    // Hidden explicitly: grids remember column visibility, so leaving it out
    // is not enough.
    expect(irdColumns.COLUMNS.strain).toContain('-segment');
  });
});

describe('IRD Strain Display segment columns', () => {
  test('1 PB2 ... 8 NS, in IRD\'s order', () => {
    expect(irdColumns.SEGMENT_COLUMNS.map((c) => c.label))
      .toEqual(['1 PB2', '2 PB1', '3 PA', '4 HA', '5 NP', '6 NA', '7 M', '8 NS']);
  });

  test('one accession: shown as is', () => {
    expect(irdColumns.segmentCell({ ird_segments: { HA: ['KU143263'] } }, 'HA')).toEqual({ text: 'KU143263', title: '' });
  });

  test('THE POINT: several sequences for a segment are shown as such, not as one', () => {
    // Segment linking can put several sequences in a genome (A/Texas/37/2024:
    // two each for PB1, HA and NS).
    const cell = irdColumns.segmentCell({ ird_segments: { PB1: ['PP577941', 'PZ871779', 'PZ999999'] } }, 'PB1');
    expect(cell.text).toBe('PP577941 (+2)');
    expect(cell.title).toBe('3 sequences for PB1 in this genome: PP577941, PZ871779, PZ999999');
  });

  test('a missing segment is an empty cell', () => {
    expect(irdColumns.segmentCell({ ird_segments: { HA: ['X'] } }, 'PB2')).toEqual({ text: '', title: '' });
    expect(irdColumns.segmentCell({}, 'PB2')).toEqual({ text: '', title: '' });
    expect(irdColumns.segmentCell(null, 'PB2')).toEqual({ text: '', title: '' });
  });

  test('a truncated lookup is marked, not shown as complete', () => {
    const cell = irdColumns.segmentCell({ ird_segments: { HA: ['A', 'B'] }, ird_segments_truncated: true }, 'HA');
    expect(cell.text).toBe('A (+1) \u2026');
    expect(cell.title).toContain('too many sequences to list them all');
  });
});
