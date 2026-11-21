/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * savedSearchUrl.js is a dependency-free AMD module; load it with a
 * `define` shim.
 *
 * It is shared by the saved-search browser's Run action and the
 * Workspaces-menu list specifically so the two cannot send a user to
 * different places for the same search.
 */
function loadSavedSearchUrl() {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'savedSearchUrl.js'), 'utf8');
  let exported;
  const define = function (deps, factory) { exported = factory(); };
  // eslint-disable-next-line no-new-func
  new Function('define', src)(define);
  return exported;
}

const savedSearchUrl = loadSavedSearchUrl();

describe('savedSearchUrl', () => {
  test('maps a data type to its list view', () => {
    expect(savedSearchUrl({ dataType: 'genome', rqlQuery: 'keyword(coli)' }))
      .toBe('/view/GenomeList/?keyword(coli)');
    expect(savedSearchUrl({ dataType: 'genome_feature', rqlQuery: 'keyword(coli)' }))
      .toBe('/view/FeatureList/?keyword(coli)');
    expect(savedSearchUrl({ dataType: 'sp_gene', rqlQuery: 'keyword(x)' }))
      .toBe('/view/SpecialtyGeneList/?keyword(x)');
  });

  test('an unknown data type falls back to the genome list', () => {
    expect(savedSearchUrl({ dataType: 'nonesuch', rqlQuery: 'keyword(x)' }))
      .toBe('/view/GenomeList/?keyword(x)');
  });

  test('a search with no query gets no query string', () => {
    expect(savedSearchUrl({ dataType: 'genome', rqlQuery: '' }))
      .toBe('/view/GenomeList/');
    expect(savedSearchUrl({ dataType: 'genome' }))
      .toBe('/view/GenomeList/');
  });

  test('null in, null out', () => {
    expect(savedSearchUrl(null)).toBeNull();
    expect(savedSearchUrl(undefined)).toBeNull();
  });

  describe('query cleanup', () => {
    test('drops the wildcard clause that only existed to anchor a join', () => {
      // eq(<x>_id,*) is prepended so a bare genome(...) join has a
      // positive top-level term; it is noise in a view URL.
      expect(savedSearchUrl({
        dataType: 'genome_feature',
        rqlQuery: 'eq(feature_id,*)&keyword(polymerase)'
      })).toBe('/view/FeatureList/?keyword(polymerase)');
    });

    /**
     * A `genome(...)` join now survives the round trip.
     *
     * This previously degraded to the inner clause (the old test here
     * pinned that, while noting it would 400 on any field the target
     * collection lacks). Two things turned out to depend on the wrapper:
     *
     *  - GenomeList.onSetQuery builds the results header from the clauses
     *    INSIDE `genome(...)`, so without it a reloaded saved search shows
     *    a bare "( 382 Genomes )" with none of the criteria. That is what
     *    was reported.
     *  - The join is what makes the non-genome tabs work at all
     *    (util/genomeContextQuery.js).
     *
     * Both forms return the same rows -- verified on alpha, 382 either
     * way for the influenza search below -- which is why this went
     * unnoticed: the grid looked correct.
     */
    test('THE REGRESSION: a genome() join is preserved, not unwrapped', () => {
      expect(savedSearchUrl({
        dataType: 'genome_feature',
        rqlQuery: 'eq(feature_id,*)&genome(eq(species,Escherichia coli))'
      })).toBe('/view/FeatureList/?eq(feature_id,*)&genome(eq(species,Escherichia coli))');
    });

    test('the influenza search round-trips verbatim', () => {
      // Saved from grid.get('query') -- exactly what the view was running.
      const rql = 'eq(genome_id,*)&genome(eq(taxon_lineage_ids,2955291),'
        + 'eq(h5_clade,2.3.2.1e),eq(subtype,%22H5N1%22),eq(host_group,Avian),'
        + 'ne(genome_status,Deprecated))';
      expect(savedSearchUrl({ dataType: 'genome', rqlQuery: rql }))
        .toBe('/view/GenomeList/?' + rql);
    });

    test('a bare collection wrapper is still unwrapped', () => {
      // No top-level clause beside it, so there is no join to preserve --
      // this is the old shape and keeps the old handling.
      expect(savedSearchUrl({
        dataType: 'genome',
        rqlQuery: 'subsystem(and(eq(species,Ecoli),ne(genome_status,Deprecated)))'
      })).toBe('/view/GenomeList/?and(eq(species,Ecoli),ne(genome_status,Deprecated))');
    });

    test('collapses the separators left behind by stripping', () => {
      const url = savedSearchUrl({
        dataType: 'genome',
        rqlQuery: 'eq(genome_id,*)&keyword(a)'
      });
      expect(url).toBe('/view/GenomeList/?keyword(a)');
      expect(url).not.toMatch(/\?&/);
      expect(url).not.toMatch(/&&/);
    });

    test('a wildcard-only query leaves no dangling "?"', () => {
      expect(savedSearchUrl({ dataType: 'genome', rqlQuery: 'eq(genome_id,*)' }))
        .toBe('/view/GenomeList/');
    });
  });

  /**
   * The returned string is a raw RQL query containing bare `&gt(`-style
   * tokens. Those are legacy HTML named entities that the parser decodes
   * WITHOUT a trailing semicolon, so rendering this through innerHTML
   * corrupts the query (CLAUDE.md, "RQL Queries in HTML Attributes").
   * The builder must not pre-escape -- callers assign it as a DOM
   * attribute -- so this pins the raw form.
   */
  /**
   * A saved selection can be tens of kilobytes of ids, which no URL should
   * carry, so the hash carries the search id and the view resolves the ids
   * from SavedSearchManager.
   */
  describe('selection hash', () => {
    test('adds #savedSearch when the search carries a selection', () => {
      const url = savedSearchUrl({
        id: 'search_123', dataType: 'genome_feature',
        rqlQuery: 'keyword(x)', selectedIds: ['a', 'b']
      });
      expect(url).toBe('/view/FeatureList/?keyword(x)#savedSearch=search_123');
    });

    test('no hash when there is nothing to resolve', () => {
      expect(savedSearchUrl({
        id: 'search_123', dataType: 'genome', rqlQuery: 'keyword(x)'
      })).toBe('/view/GenomeList/?keyword(x)');
      expect(savedSearchUrl({
        id: 'search_123', dataType: 'genome', rqlQuery: 'keyword(x)', selectedIds: []
      })).toBe('/view/GenomeList/?keyword(x)');
    });

    /**
     * EDIT SEARCH looks its form URL up by the saved search's id, so the
     * id has to be in the URL even when no rows were selected. Keying the
     * hash on selectedIds alone left the button hidden for every saved
     * search without a selection.
     */
    test('a form URL alone is enough to need the hash', () => {
      expect(savedSearchUrl({
        id: 'search_123', dataType: 'genome', rqlQuery: 'keyword(x)',
        searchFormUrl: '/searches/InfluenzaSearch/#fluSearch=%7B%7D'
      })).toBe('/view/GenomeList/?keyword(x)#savedSearch=search_123');
    });

    test('a selection and a form URL still produce one hash', () => {
      const url = savedSearchUrl({
        id: 's1', dataType: 'genome', rqlQuery: 'keyword(x)',
        selectedIds: ['a'], searchFormUrl: '/searches/InfluenzaSearch/#fluSearch=%7B%7D'
      });
      expect(url).toBe('/view/GenomeList/?keyword(x)#savedSearch=s1');
      expect(url.match(/#/g).length).toBe(1);
    });

    test('no hash when the search has no id to resolve', () => {
      expect(savedSearchUrl({
        dataType: 'genome', rqlQuery: 'keyword(x)', selectedIds: ['a']
      })).toBe('/view/GenomeList/?keyword(x)');
    });

    test('the id is encoded', () => {
      const url = savedSearchUrl({
        id: 'a b&c', dataType: 'genome', rqlQuery: 'keyword(x)', selectedIds: ['a']
      });
      expect(url).toContain('#savedSearch=a%20b%26c');
    });

    test('works on a query-less search', () => {
      expect(savedSearchUrl({
        id: 's1', dataType: 'genome', rqlQuery: '', selectedIds: ['a']
      })).toBe('/view/GenomeList/#savedSearch=s1');
    });
  });

  test('comparison operators are returned raw, for DOM-attribute assignment', () => {
    const url = savedSearchUrl({
      dataType: 'genome',
      rqlQuery: 'keyword(carsonella)&gt(completion_date,NOW-1YEARS)&ne(genome_status,Deprecated)'
    });
    expect(url).toContain('&gt(completion_date,NOW-1YEARS)');
    expect(url).not.toContain('&amp;');
    expect(url).not.toContain('>(completion_date');
  });
});
