/* eslint-env jest */
//
// GenomeBrowser.regularizeReferenceName: the same function normalizes both the reference
// sequence names the browser loads from BV-BRC and the contig names in a track's file
// (e.g. a BAM header). A track only shows data where the two normalize to the same string.
//
// Host-genome RNA-Seq BAMs name chromosomes with versioned NCBI accessions (NC_000067.6),
// while BV-BRC genome_sequence names are unversioned (NC_000067), so the tracks were empty
// (GitHub #1507).
//
// Loads the REAL method out of GenomeBrowser.js rather than reimplementing it.
//
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'GenomeBrowser.js'), 'utf8');

function grab(name) {
  const i = src.indexOf('\n    ' + name + ': function');
  if (i < 0) { throw new Error('method not found: ' + name); }
  const paren = src.indexOf('(', i);
  const parenEnd = src.indexOf(')', paren);
  let j = src.indexOf('{', parenEnd), d = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') { d++; } else if (src[k] === '}') { d--; if (d === 0) { break; } }
  }
  // eslint-disable-next-line no-new-func
  return new Function('return function ' + src.slice(paren, parenEnd + 1) + ' ' + src.slice(j, k + 1))();
}

const regularize = grab('regularizeReferenceName');
const browser = { config: {} };
const norm = function (name) { return regularize.call(browser, name); };

describe('GenomeBrowser regularizeReferenceName', function () {
  test.each([
    // [name in track file (e.g. BAM header), name in BV-BRC genome_sequence]
    ['NC_000067.6', 'NC_000067'], // mouse chr1, GRCm38.p6 FASTA vs BV-BRC 10090.24
    ['NT_166280.1', 'NT_166280'], // mouse unplaced scaffold
    ['NW_003613575.1', 'NW_003613575'],
    ['NZ_CP012345.1', 'NZ_CP012345'],
    ['CP012345.1', 'CP012345'], // GenBank
    ['AE014075.1', 'AE014075'],
    ['JAAXYZ010000001.1', 'JAAXYZ010000001'] // WGS contig
  ])('versioned %s matches unversioned %s', function (fromFile, fromBvbrc) {
    expect(norm(fromFile)).toBe(norm(fromBvbrc));
  });

  test('names that match already keep matching', function () {
    expect(norm('NC_000067.6')).toBe(norm('NC_000067.6'));
    expect(norm('NC_000067')).toBe('nc_000067');
  });

  test.each([
    ['accn|NC_000913', 'nc_000913'],
    ['sid|123|accn|NC_000913', 'nc_000913'],
    ['Chromosome1', 'chr1'],
    ['chr1', 'chr1'],
    ['1', 'chr1'],
    ['JEZL01000001', 'jezl01000001'],
    ['scaffold_12', 'scaffold_12']
  ])('existing normalization unchanged: %s -> %s', function (name, expected) {
    expect(norm(name)).toBe(expected);
  });

  test.each([
    'contig1.2', // assembler-style names with a dot are not accessions
    'scaffold_12.3',
    'NODE_1_length_100.5',
    'NC_000067.6a'
  ])('does not strip dotted suffixes from non-accession names: %s', function (name) {
    expect(norm(name)).toMatch(/\./);
  });

  test('exactReferenceSequenceNames still returns names untouched', function () {
    expect(regularize.call({ config: { exactReferenceSequenceNames: true } }, 'NC_000067.6')).toBe('NC_000067.6');
  });
});
