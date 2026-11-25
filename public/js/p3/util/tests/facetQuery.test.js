/* eslint-env jest */
const fs = require('fs');
const path = require('path');

function loadAmd(rel) {
  const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  let exported;
  // eslint-disable-next-line no-new-func
  new Function('define', src)(function (deps, factory) { exported = factory(); });
  return exported;
}

const F = loadAmd('facetQuery.js');

const YEAR = 'or(eq(collection_year,%222019%22),eq(collection_year,%222020%22))';
const HOST = 'eq(host_common_name,%22Human%22)';
const FIELDS = ['collection_year', 'host_common_name', { field: 'isolation_country' }];

describe('buildFilter', () => {
  test('categories and keywords are ANDed; nothing selected is empty', () => {
    expect(F.buildFilter({}, [])).toBe('');
    expect(F.buildFilter({ collection_year: YEAR }, [])).toBe(YEAR);
    expect(F.buildFilter({ collection_year: YEAR, host_common_name: HOST }, ['flu']))
      .toBe('and(' + YEAR + ',' + HOST + ',keyword(flu))');
  });

  test('an array of clauses (URL or Advanced Search) is alternatives, with or without keywords', () => {
    // The old builder ANDed them whenever a keyword was present: and(eq(a),eq(b),keyword(k)).
    const both = ['eq(collection_year,2019)', 'eq(collection_year,2020)'];
    expect(F.buildFilter({ collection_year: both }, ['flu']))
      .toBe('and(or(eq(collection_year,2019),eq(collection_year,2020)),keyword(flu))');
    expect(F.buildFilter({ collection_year: ['eq(collection_year,2019)'] }, [])).toBe('eq(collection_year,2019)');
  });

  test('empty keywords and cleared categories add nothing', () => {
    // Clearing the keyword box leaves [''], which once produced and(...,false).
    expect(F.buildFilter({ collection_year: YEAR, host_common_name: '', country: [] }, [''])).toBe(YEAR);
  });

  test('keyword parentheses are escaped', () => {
    expect(F.keywordClause('a(b)')).toBe('keyword(a%28b%29)');
  });
});

describe('facetRequests', () => {
  test('nothing selected: one request for every category', () => {
    expect(F.facetRequests('?eq(taxon_lineage_ids,11320)', {}, [], FIELDS))
      .toEqual([{ query: 'eq(taxon_lineage_ids,11320)', fields: FIELDS }]);
  });

  test('THE POINT: a selected category is counted without its own selection', () => {
    // With it applied, Collection Year listed only the year already picked,
    // so a second year could not be added.
    const reqs = F.facetRequests('eq(taxon_lineage_ids,11320)', { collection_year: YEAR }, [], FIELDS);
    expect(reqs).toEqual([
      { query: 'and(eq(taxon_lineage_ids,11320),' + YEAR + ')', fields: ['host_common_name', { field: 'isolation_country' }] },
      { query: 'eq(taxon_lineage_ids,11320)', fields: ['collection_year'] }
    ]);
  });

  test('each selected category keeps the others\' selections and the keywords', () => {
    const reqs = F.facetRequests('q', { collection_year: YEAR, host_common_name: HOST }, ['flu'], FIELDS);
    expect(reqs).toEqual([
      { query: 'and(q,and(' + YEAR + ',' + HOST + ',keyword(flu)))', fields: [{ field: 'isolation_country' }] },
      { query: 'and(q,and(' + HOST + ',keyword(flu)))', fields: ['collection_year'] },
      { query: 'and(q,and(' + YEAR + ',keyword(flu)))', fields: ['host_common_name'] }
    ]);
  });

  test('a filter on a field with no facet (Advanced Search) applies to every request', () => {
    const reqs = F.facetRequests('q', { genome_length: ['between(genome_length,1,2)'] }, [], ['collection_year']);
    expect(reqs).toEqual([{ query: 'and(q,between(genome_length,1,2))', fields: ['collection_year'] }]);
  });

  test('every category selected: no shared request', () => {
    const reqs = F.facetRequests('q', { collection_year: YEAR }, [], ['collection_year']);
    expect(reqs).toEqual([{ query: 'q', fields: ['collection_year'] }]);
  });
});
