/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * Re-targeting a genome query for a sibling tab's collection.
 *
 * The behaviour worth pinning is *when not to join*. Always wrapping is the
 * obvious fix and it breaks the "My Genomes" view: eq(public,false) matches
 * 726,474 genomes, over the server's 150,000 join limit, so the wrapped form
 * 400s on a query that works untouched today. Measured on alpha 2026-11-13.
 */
function loadGenomeContextQuery() {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'genomeContextQuery.js'), 'utf8');
  let exported;
  const define = function (deps, factory) { exported = factory(); };
  // eslint-disable-next-line no-new-func
  new Function('define', src)(define);
  return exported;
}

const gcq = loadGenomeContextQuery();

// The query the "sel" saved search replays, and the one that produced the
// original bug report: 400 on Sequences and on Proteins.
const SAVED_SEARCH = 'eq(taxon_lineage_ids,2955291)&ne(genome_status,Deprecated)'
  + '&eq(public,%22false%22)&and(eq(segment,%22HA%22),eq(collection_year,%221918%22))';

describe('leaves alone what the collection can already answer', () => {
  test('THE REGRESSION GUARD: eq(public,false) is never joined', () => {
    // public is native on genome_feature. Joining it means join_too_broad
    // (726,474 genomes > 150,000 limit) on a query that works today.
    const r = gcq('eq(public,false)', 'genome_feature');
    expect(r.query).toBe('eq(public,false)');
    expect(r.joined).toBe(false);
  });

  test('several native fields together still need no join', () => {
    const r = gcq('eq(public,false)&eq(genome_id,1234.5)', 'genome_feature');
    expect(r.joined).toBe(false);
    expect(r.query).toBe('eq(public,false)&eq(genome_id,1234.5)');
  });

  test('segment is native on genome_sequence but not on genome_feature', () => {
    // The asymmetry is real and is why the table is per-collection.
    expect(gcq('eq(segment,%22HA%22)', 'genome_sequence').joined).toBe(false);
    expect(gcq('eq(segment,%22HA%22)', 'genome_feature').joined).toBe(true);
  });

  test('a keyword-only query names no field, so no join', () => {
    const r = gcq('keyword(1918)', 'genome_feature');
    expect(r.joined).toBe(false);
    expect(r.query).toBe('keyword(1918)');
  });

  test('the genome collection itself is never rewritten', () => {
    const r = gcq(SAVED_SEARCH, 'genome');
    expect(r.query).toBe(SAVED_SEARCH);
    expect(r.joined).toBe(false);
  });
});

describe('joins when the collection genuinely lacks the field', () => {
  test('THE BUG: the saved search is wrapped for genome_sequence', () => {
    const r = gcq(SAVED_SEARCH, 'genome_sequence');
    expect(r.joined).toBe(true);
    expect(r.query).toBe(
      'eq(genome_id,*)&genome(and(eq(taxon_lineage_ids,2955291),'
      + 'ne(genome_status,Deprecated),eq(public,%22false%22),'
      + 'and(eq(segment,%22HA%22),eq(collection_year,%221918%22))))');
  });

  test('and for genome_feature', () => {
    const r = gcq(SAVED_SEARCH, 'genome_feature');
    expect(r.joined).toBe(true);
    expect(r.query).toMatch(/^eq\(genome_id,\*\)&genome\(and\(/);
    expect(r.dropped).toEqual([]);
  });

  test('a lone clause is not wrapped in a pointless and()', () => {
    const r = gcq('eq(taxon_lineage_ids,2955291)', 'genome_feature');
    expect(r.query).toBe('eq(genome_id,*)&genome(eq(taxon_lineage_ids,2955291))');
  });

  test('the join always has a positive lead term', () => {
    // A bare genome(...) makes the API emit q=() -> Solr 400 (CLAUDE.md
    // Pitfall 3), so the lead is not optional.
    const r = gcq('eq(genome_status,Complete)', 'genome_feature');
    expect(r.query.startsWith('eq(genome_id,*)&genome(')).toBe(true);
  });

  test('the lead term is a field the TARGET has, not always genome_id', () => {
    // eq(genome_id,*) on strain/epitope is itself a 400.
    expect(gcq('eq(genome_status,Complete)', 'strain').query)
      .toBe('eq(id,*)&genome(to(genome_ids),eq(genome_status,Complete))');
  });

  test('a non-genome_id join field uses to()', () => {
    expect(gcq('eq(genome_status,Complete)', 'ppi').query)
      .toContain('genome(to(genome_id_a),');
  });

  test('nested fields inside and()/or() are seen', () => {
    const r = gcq('and(eq(public,false),or(eq(segment,HA),eq(host_group,Human)))',
      'genome_feature');
    // host_group is genome-only -> must join even though it is two levels down
    expect(r.joined).toBe(true);
  });
});

describe('an existing genome() join is re-led, not nested', () => {
  // Influenza search emits eq(genome_id,*)&genome(...). Wrapping that again
  // is a 400: "Can not mix conjunctions".
  const INFLUENZA = 'eq(genome_id,*)&genome(eq(taxon_lineage_ids,2955291),eq(segment,4))';

  test('the inner clause is reused under the new lead field', () => {
    const r = gcq(INFLUENZA, 'genome_feature');
    expect(r.query).toBe(
      'eq(genome_id,*)&genome(eq(taxon_lineage_ids,2955291),eq(segment,4))');
    expect(r.joined).toBe(true);
  });

  test('never produces two genome() clauses', () => {
    const r = gcq(INFLUENZA, 'strain');
    expect(r.query.match(/genome\(/g).length).toBe(1);
    expect(r.query).toBe(
      'eq(id,*)&genome(to(genome_ids),eq(taxon_lineage_ids,2955291),eq(segment,4))');
  });

  test('clauses outside the join are preserved', () => {
    const r = gcq(INFLUENZA + '&eq(feature_type,CDS)', 'genome_feature');
    expect(r.query).toContain('&eq(feature_type,CDS)');
    expect(r.query.match(/genome\(/g).length).toBe(1);
  });
});

describe('collections that cannot join to genome', () => {
  // serology and epitope carry no genome reference at all -- the join is
  // "undefined field genome_id". Filtering has to degrade.
  test('keeps the clauses the collection can answer', () => {
    const r = gcq('eq(taxon_lineage_ids,2955291)&eq(genome_status,Complete)', 'epitope');
    expect(r.query).toBe('eq(taxon_lineage_ids,2955291)');
    expect(r.joined).toBe(false);
  });

  test('REPORTS what it dropped, rather than silently widening', () => {
    // A filter that vanishes without a word looks like wrong data.
    const r = gcq('eq(taxon_lineage_ids,2955291)&eq(genome_status,Complete)', 'epitope');
    expect(r.dropped).toEqual(['eq(genome_status,Complete)']);
  });

  test('drops an un-retargetable join whole', () => {
    const r = gcq('eq(genome_id,*)&genome(eq(segment,4))', 'serology');
    expect(r.dropped).toEqual(['genome(eq(segment,4))']);
    expect(r.unfiltered).toBe(true);
  });

  /**
   * An empty RQL query is not "no results" -- it is EVERY row. Measured on
   * alpha: an unfiltered /epitope/ returns all 301,723 records. Emitting
   * one here would show the entire collection as though it were the user's
   * search result, which is a worse failure than the 400 being fixed.
   */
  describe('THE EMPTY-QUERY TRAP: never emit a query that matches everything', () => {
    test('a fully-dropped filter becomes a match-nothing clause', () => {
      const r = gcq('eq(genome_status,Complete)', 'epitope');
      expect(r.unfiltered).toBe(true);
      expect(r.query).not.toBe('');
      expect(r.query).toBe('eq(epitope_id,__BVBRC_NO_MATCH__)');
    });

    test('same for a dropped join', () => {
      const r = gcq('eq(genome_id,*)&genome(eq(segment,4))', 'serology');
      expect(r.query).toBe('eq(id,__BVBRC_NO_MATCH__)');
    });

    test('the match-nothing field is one the collection actually has', () => {
      // eq(genome_id,...) on epitope is itself a 400, so the sentinel has
      // to use the collection's own primary key.
      expect(gcq('eq(genome_status,X)', 'epitope').query).toContain('epitope_id');
      expect(gcq('eq(genome_status,X)', 'serology').query).toContain('eq(id,');
    });

    test('unfiltered is FALSE whenever something survived', () => {
      const r = gcq('eq(taxon_lineage_ids,2955291)&eq(genome_status,Complete)', 'epitope');
      expect(r.unfiltered).toBe(false);
      expect(r.query).toBe('eq(taxon_lineage_ids,2955291)');
    });

    test('and false on every normal path', () => {
      expect(gcq('eq(public,false)', 'genome_feature').unfiltered).toBe(false);
      expect(gcq(SAVED_SEARCH, 'genome_sequence').unfiltered).toBe(false);
      expect(gcq('', 'genome_feature').unfiltered).toBe(false);
    });
  });
});

describe('degenerate input', () => {
  test('empty / missing query is returned unchanged', () => {
    expect(gcq('', 'genome_feature').query).toBe('');
    expect(gcq(null, 'genome_feature').query).toBe('');
    expect(gcq(undefined, 'genome_feature').joined).toBe(false);
  });

  test('an unknown collection is left strictly alone', () => {
    // Guessing is the 400 this module exists to prevent.
    const r = gcq(SAVED_SEARCH, 'something_new');
    expect(r.query).toBe(SAVED_SEARCH);
    expect(r.joined).toBe(false);
  });

  test('a missing dataType is left alone', () => {
    expect(gcq(SAVED_SEARCH, undefined).query).toBe(SAVED_SEARCH);
  });
});

describe('splitTopLevel', () => {
  test('does not split on & inside parentheses', () => {
    expect(gcq.splitTopLevel('and(eq(a,1),eq(b,2))&eq(c,3)'))
      .toEqual(['and(eq(a,1),eq(b,2))', 'eq(c,3)']);
  });

  test('drops empty segments from doubled separators', () => {
    expect(gcq.splitTopLevel('eq(a,1)&&eq(b,2)')).toEqual(['eq(a,1)', 'eq(b,2)']);
  });
});

describe('fieldsIn', () => {
  test('finds fields across operators and nesting', () => {
    expect(gcq.fieldsIn('and(eq(a,1),or(ne(b,2),in(c,(1,2))))').sort())
      .toEqual(['a', 'b', 'c']);
  });

  test('keyword() is not a field reference', () => {
    expect(gcq.fieldsIn('keyword(1918)')).toEqual([]);
  });

  test('comparison operators count', () => {
    expect(gcq.fieldsIn('gt(completion_date,NOW-1YEARS)')).toEqual(['completion_date']);
  });
});

describe('the field tables match what alpha reports', () => {
  /**
   * These encode measurements, not preferences, so a casual edit should
   * fail. Each was verified by running the clause against the collection.
   */
  test('genome_feature does NOT natively carry the viral metadata fields', () => {
    const f = gcq.SHARED_NATIVE_FIELDS.genome_feature;
    ['segment', 'collection_year', 'genome_status', 'taxon_lineage_ids']
      .forEach(function (field) { expect(f).not.toContain(field); });
  });

  test('genome_feature DOES carry public and genome_id', () => {
    expect(gcq.SHARED_NATIVE_FIELDS.genome_feature).toContain('public');
    expect(gcq.SHARED_NATIVE_FIELDS.genome_feature).toContain('genome_id');
  });

  test('serology and epitope have no join route', () => {
    expect(gcq.GENOME_JOIN.serology).toBeUndefined();
    expect(gcq.GENOME_JOIN.epitope).toBeUndefined();
  });

  test('every joinable collection has a lead field it actually owns', () => {
    Object.keys(gcq.GENOME_JOIN).forEach(function (coll) {
      const lead = gcq.GENOME_JOIN[coll].lead;
      // the lead must be native on the target, or the join itself 400s
      if (lead !== 'id') {
        expect(gcq.SHARED_NATIVE_FIELDS[coll]).toContain(lead);
      }
    });
  });
});
