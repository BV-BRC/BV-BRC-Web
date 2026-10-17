/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * HomologyResultMemoryStore.js is an AMD module with a long dependency list and
 * this repo has no AMD loader under Jest. Rather than stub Dojo, lift the one
 * pure function under test straight out of the source text, so the test still
 * fails if someone edits the real implementation.
 */
function loadNormalizeSequenceId() {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'HomologyResultMemoryStore.js'), 'utf8');
  const match = src.match(/normalizeSequenceId: function \(id\) \{([\s\S]*?)\n {4}\},/);
  if (!match) {
    throw new Error('normalizeSequenceId not found in HomologyResultMemoryStore.js');
  }
  // eslint-disable-next-line no-new-func
  return new Function('id', match[1]);
}

const normalizeSequenceId = loadNormalizeSequenceId();

describe('HomologyResultMemoryStore.normalizeSequenceId', () => {
  it('strips the accn| prefix BLAST adds to nucleotide hit ids', () => {
    expect(normalizeSequenceId('accn|CP002078')).toBe('CP002078');
    expect(normalizeSequenceId('accn|NC_003317')).toBe('NC_003317');
    expect(normalizeSequenceId('accn|235.127.con.0001')).toBe('235.127.con.0001');
  });

  it('collapses a doubled genome prefix on .con. ids', () => {
    expect(normalizeSequenceId('235.127.235.127.con.0001')).toBe('235.127.con.0001');
  });

  it('leaves an already-canonical sequence_id alone', () => {
    expect(normalizeSequenceId('235.127.con.0001')).toBe('235.127.con.0001');
  });

  it('strips a leading genome prefix from a plain accession', () => {
    expect(normalizeSequenceId('224914.11.NC_003317')).toBe('NC_003317');
  });

  /**
   * Issue #1542: the query side normalized ids before asking Solr, but
   * formatJSONResult looked the metadata back up under the RAW BLAST id. Nothing
   * ever matched, so every row rendered with a blank Genome and the CSV export
   * had an empty Subject ID. Both sides must agree -- normalizing twice must be
   * a no-op so the lookup key equals the keyMap key.
   */
  it('is idempotent, so query-side and lookup-side keys agree (#1542)', () => {
    ['accn|CP002078', 'accn|235.127.con.0001', 'accn|NC_003317',
      '235.127.235.127.con.0001', '1567502.3.con.0001'].forEach((id) => {
      const once = normalizeSequenceId(id);
      expect(normalizeSequenceId(once)).toBe(once);
    });
  });
});
