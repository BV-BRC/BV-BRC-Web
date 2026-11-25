/* eslint-env jest */
const fs = require('fs');
const path = require('path');

function load(rel, deps) {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
  let exported;
  // eslint-disable-next-line no-new-func
  new Function('define', src)(function (d, factory) { exported = factory.apply(null, deps || []); });
  return exported;
}

const TextInputEncoder = load('widget/search/TextInputEncoder.js');
const fullCollectionDatePattern = load('util/fullCollectionDatePattern.js');
const Q = load('util/irdSequenceQuery.js', [TextInputEncoder, fullCollectionDatePattern]);

const q = (state) => Q.buildQuery(state).query;
const A = 'eq(taxon_lineage_ids,2955291)';

/** The genome(...) clause of a query, or null. Assumes no nested genome(). */
function join(query) {
  const i = query.indexOf('genome(');
  if (i < 0) return null;
  let depth = 0;
  for (let j = i + 6; j < query.length; j++) {
    if (query[j] === '(') depth++;
    if (query[j] === ')' && --depth === 0) return query.slice(i, j + 1);
  }
  throw new Error('unbalanced: ' + query);
}

describe('grains', () => {
  test('each grain targets its collection', () => {
    expect(Q.buildQuery({ grain: 'strain' }).collection).toBe('genome');
    expect(Q.buildQuery({ grain: 'segment' }).collection).toBe('genome_sequence');
    expect(Q.buildQuery({ grain: 'protein' }).collection).toBe('genome_feature');
  });

  test('an unknown or missing grain is an error, not a silent query', () => {
    expect(() => Q.buildQuery({ grain: 'genome' })).toThrow('unknown grain genome');
    expect(() => Q.buildQuery({})).toThrow('unknown grain');
  });

  test('a strain search with no filters emits no empty genome() join', () => {
    // A bare or empty join has broken the API before (CLAUDE.md, Pitfall 3).
    expect(q({ grain: 'strain' })).toBe('eq(genome_id,*)');
  });
});

describe('THE POINT: no RQL comparison operators', () => {
  // The Data API's gt/ge and lt/le are swapped (PLAN-rql-range-operators.md).
  // between() is inclusive and correct before and after that is fixed.
  const states = [
    { grain: 'strain', collectionYear: { from: 2020 } },
    { grain: 'strain', collectionYear: { to: 1960 } },
    { grain: 'strain', submissionDate: { from: '2024' } },
    { grain: 'strain', submissionDate: { to: '2024-06' } },
    { grain: 'strain', collectionDate: { from: '2024-03-01' } },
    { grain: 'strain', length: { from: 13000 } },
    { grain: 'segment', length: { to: 900 } },
    { grain: 'segment', segmentLengths: { HA: { from: 1700 } } },
    { grain: 'protein', length: { from: 560 } }
  ];

  test.each(states.map((s) => [JSON.stringify(s), s]))('%s', (label, state) => {
    expect(q(state)).not.toMatch(/(^|[^a-z_])(gt|ge|lt|le)\(/);
    expect(q(state)).toContain('between(');
  });

  test('open bounds use *', () => {
    expect(q({ grain: 'strain', collectionYear: { from: 2020 } })).toContain('between(collection_year,2020,*)');
    expect(q({ grain: 'strain', collectionYear: { to: 1960 } })).toContain('between(collection_year,*,1960)');
    expect(q({ grain: 'strain', collectionYear: { from: 2020, to: 2024 } })).toContain('between(collection_year,2020,2024)');
  });

  test('a range with neither bound adds nothing', () => {
    expect(q({ grain: 'strain', collectionYear: {} })).toBe('eq(genome_id,*)');
    expect(q({ grain: 'strain', collectionYear: { from: 'abc' } })).toBe('eq(genome_id,*)');
  });
});

describe('virus type and subtype', () => {
  test('one type: eq; several: in', () => {
    expect(join(q({ grain: 'strain', virusTypes: ['A'] }))).toBe('genome(' + A + ')');
    expect(join(q({ grain: 'strain', virusTypes: ['A', 'B'] }))).toBe('genome(in(taxon_lineage_ids,(2955291,2955465)))');
  });

  test('an unknown type is ignored', () => {
    expect(join(q({ grain: 'strain', virusTypes: ['A', 'Z'] }))).toBe('genome(' + A + ')');
  });

  test('a full subtype wins over HA/NA numbers', () => {
    const query = q({
      grain: 'strain', virusTypes: ['A'], fullSubtype: ['H5N1'], haSubtype: ['3']
    });
    expect(query).toContain('eq(subtype,%22H5N1%22)');
    expect(query).not.toContain('h_type');
  });

  test('HA/NA numbers when no full subtype', () => {
    const query = q({
      grain: 'strain', virusTypes: ['A'], haSubtype: ['5', '7'], naSubtype: ['1']
    });
    expect(query).toContain('or(eq(h_type,%225%22),eq(h_type,%227%22))');
    expect(query).toContain('eq(n_type,%221%22)');
  });

  test('Flu A and B subtypes on the shared field combine with or()', () => {
    const query = q({
      grain: 'strain', virusTypes: ['A', 'B'], fullSubtype: ['H3N2'], fluBLineage: ['Victoria']
    });
    expect(query).toContain('or(eq(subtype,%22H3N2%22),eq(subtype,%22Victoria%22))');
  });

  test('Flu-A-only filters are dropped when Flu A is not selected', () => {
    const query = q({
      grain: 'strain', virusTypes: ['B'], h5Clade: '2.3.4.4b', ph1n1Like: 'Positive', fullSubtype: ['H5N1']
    });
    expect(query).not.toMatch(/h5_clade|ph1n1_like|H5N1/);
  });

  test('clades and pH1N1-like for Flu A', () => {
    const query = q({
      grain: 'strain', virusTypes: ['A'], h5Clade: '2.3.4.4b', h1CladeUs: '1A.3.3.2', ph1n1Like: 'Positive'
    });
    expect(query).toContain('eq(h5_clade,%222.3.4.4b%22)');
    expect(query).toContain('eq(h1_clade_us,%221A.3.3.2%22)');
    expect(query).toContain('eq(ph1n1_like,%22Positive%22)');
  });
});

describe('values', () => {
  test('a picked value with spaces stays one term', () => {
    expect(q({ grain: 'strain', geographicGroup: 'North America' })).toContain('eq(geographic_group,%22North%20America%22)');
  });

  test('lists become or() of quoted terms', () => {
    expect(q({ grain: 'strain', country: ['USA', 'Viet Nam'] }))
      .toContain('or(eq(isolation_country,%22USA%22),eq(isolation_country,%22Viet%20Nam%22))');
  });

  test('empty strings and empty lists add nothing', () => {
    expect(q({
      grain: 'strain', hostGroup: '  ', country: [], hostName: ['', null]
    })).toBe('eq(genome_id,*)');
  });

  test('characters that break RQL are removed', () => {
    expect(q({ grain: 'strain', passage: 'E2 (egg)' })).toContain('eq(passage,%22E2%20egg%22)');
  });

  test('free text is encoded, unquoted', () => {
    expect(q({ grain: 'strain', strainName: 'A/California/07' })).toContain('eq(genome_name,A%2FCalifornia%2F07)');
  });

  test('a double quote in a value is escaped', () => {
    expect(q({ grain: 'strain', country: ['a"b'] })).toContain(encodeURIComponent('"a\\"b"'));
  });
});

describe('dates', () => {
  test('submission date expands partial dates to inclusive ISO bounds', () => {
    expect(q({ grain: 'strain', submissionDate: { from: '2024', to: '2024' } }))
      .toContain('between(completion_date,' + encodeURIComponent('2024-01-01T00:00:00Z') + ',' + encodeURIComponent('2024-12-31T23:59:59Z') + ')');
  });

  test('a month bound ends on the last day of that month, leap years included', () => {
    expect(q({ grain: 'strain', submissionDate: { to: '2024-02' } }))
      .toContain('between(completion_date,*,' + encodeURIComponent('2024-02-29T23:59:59Z') + ')');
    expect(q({ grain: 'strain', submissionDate: { to: '2023-02' } }))
      .toContain(encodeURIComponent('2023-02-28T23:59:59Z'));
  });

  test('collection date compares full dates as strings on the raw field', () => {
    expect(q({ grain: 'strain', collectionDate: { from: '2024-03-01', to: '2024-06-30' } }))
      .toContain('between(collection_date,2024-03-01,2024-06-30)');
  });

  test('collection year uses collection_year, not the empty collection_date_dr', () => {
    const query = q({ grain: 'strain', collectionYear: { from: 2020, to: 2024 } });
    expect(query).toContain('between(collection_year,2020,2024)');
    expect(query).not.toContain('collection_date_dr');
  });

  test('full collection date only', () => {
    expect(q({ grain: 'strain', fullCollectionDate: true }))
      .toContain('eq(collection_date,' + encodeURIComponent(fullCollectionDatePattern) + ')');
  });
});

describe('segments', () => {
  test('THE POINT: segments are names, as stored in the reorganized genomes', () => {
    // InfluenzaSearch maps HA to '4', which matches 7 genomes on alpha, not 276,282.
    expect(q({ grain: 'strain', segments: ['HA'] })).toContain('eq(segment,HA)');
    expect(q({ grain: 'strain', segments: ['HA'] })).not.toContain('eq(segment,4)');
  });

  test('unknown segment names are ignored', () => {
    expect(q({ grain: 'strain', segments: ['XX', '4'] })).toBe('eq(genome_id,*)');
  });

  test('strain search: every selected segment on the same genome', () => {
    expect(join(q({ grain: 'strain', segments: ['HA', 'NA'] }))).toBe('genome(eq(segment,HA),eq(segment,NA))');
  });

  test('THE POINT: segment search keeps the segment out of the join', () => {
    // With only the taxon in genome(), the API rewrites the join cheaply. A
    // segment inside it makes the join non-taxonomic, and "Flu A, HA" (276,282
    // genomes) exceeds the 150,000-genome limit and is refused.
    const query = q({ grain: 'segment', virusTypes: ['A'], segments: ['HA', 'NA'] });
    expect(join(query)).toBe('genome(' + A + ')');
    expect(query).toContain('&in(segment,(HA,NA))');
  });

  test('all eight segments, without duplicating selected ones', () => {
    const query = q({ grain: 'strain', segmentSetComplete: true, segments: ['HA'] });
    Q.SEGMENTS.forEach((s) => expect(query.split('eq(segment,' + s + ')')).toHaveLength(2));
  });

  test('per-segment length bounds; other segments pass unrestricted', () => {
    expect(q({ grain: 'segment', segmentLengths: { HA: { from: 1700, to: 1800 } } }))
      .toContain('or(and(eq(segment,HA),between(length,1700,1800)),in(segment,(PB2,PB1,PA,NP,NA,M,NS)))');
  });

  test('when every segment is bounded there is no unrestricted remainder', () => {
    const all = {};
    Q.SEGMENTS.forEach((s) => { all[s] = { from: 100 }; });
    expect(q({ grain: 'segment', segmentLengths: all })).not.toContain('in(segment,');
  });
});

describe('completeness', () => {
  test('THE POINT: strain search: full-length sequences via genome_status', () => {
    expect(q({ grain: 'strain', sequenceComplete: true })).toContain('eq(genome_status,Complete)');
  });

  test('segment search: the segment\'s own sequence_status, not the genome\'s', () => {
    const query = q({ grain: 'segment', virusTypes: ['A'], sequenceComplete: true });
    expect(query).toContain('&in(sequence_status,(Complete,complete))');
    expect(query).not.toContain('genome_status');
    expect(join(query)).toBe('genome(' + A + ')');
  });

  test('segment-set completeness is not genome_status', () => {
    // 25,654 alpha genomes have all eight segments and are Partial.
    expect(q({ grain: 'strain', segmentSetComplete: true })).not.toContain('genome_status');
  });
});

describe('filters on the target record keep joins narrow', () => {
  test('strain name: in the join for strains, on the record for segments and proteins', () => {
    expect(join(q({ grain: 'strain', strainName: 'Brevig' }))).toContain('eq(genome_name,Brevig)');
    const seg = q({ grain: 'segment', virusTypes: ['A'], strainName: 'Brevig' });
    expect(join(seg)).toBe('genome(' + A + ')');
    expect(seg).toContain('&eq(genome_name,Brevig)');
    const prot = q({ grain: 'protein', virusTypes: ['A'], strainName: 'Brevig' });
    expect(join(prot)).toBe('genome(' + A + ')');
    expect(prot).toContain('&eq(genome_name,Brevig)');
  });

  test('genome-level metadata goes in the join', () => {
    expect(join(q({ grain: 'segment', virusTypes: ['A'], hostGroup: 'Avian' })))
      .toBe('genome(' + A + ',eq(host_group,%22Avian%22))');
  });
});

describe('protein search', () => {
  test('THE POINT: one row per protein: BV-BRC annotation by default', () => {
    // Each influenza protein exists once per annotation; without this every
    // protein is listed twice (47,088 PATRIC + 46,799 RefSeq for H5 2.3.4.4b HA).
    expect(q({ grain: 'protein' })).toContain('eq(annotation,PATRIC)');
    expect(q({ grain: 'protein', annotation: 'RefSeq' })).toContain('eq(annotation,RefSeq)');
    expect(q({ grain: 'protein', annotation: 'all' })).not.toContain('annotation');
  });

  test('CDS and mature peptides; genes as quoted terms', () => {
    const query = q({ grain: 'protein', genes: ['PA-X', 'PB1-F2'] });
    expect(query).toMatch(/^in\(feature_type,\(CDS,mat_peptide\)\)/);
    expect(query).toContain('or(eq(gene,%22PA-X%22),eq(gene,%22PB1-F2%22))');
  });

  test('protein records have no segment field, so segments are not applied', () => {
    expect(q({ grain: 'protein', segments: ['HA'] })).not.toContain('segment');
  });
});

describe('accessions', () => {
  test('versions stripped, upper-cased, de-duplicated', () => {
    expect(q({ grain: 'segment', accessions: ['ku143263.1', 'KU143263', ' cy121680 '] }))
      .toContain('in(accession,(%22KU143263%22,%22CY121680%22))');
  });

  test('THE POINT: a strain search by accession resolves through the segment records', () => {
    // genbank_accessions on the genome is incomplete for overfilled genomes:
    // 641809.294 holds 39 sequences and lists 11 accessions.
    const state = { grain: 'strain', accessions: ['CY121680'] };
    expect(Q.accessionLookup(state)).toEqual({
      collection: 'genome_sequence',
      query: 'eq(accession,%22CY121680%22)&select(genome_id)&limit(9999)'
    });
    const query = q(Object.assign({}, state, { genomeIds: ['641809.294', '641809.288'] }));
    expect(query).toContain('in(genome_id,(641809.294,641809.288))');
    expect(query).not.toContain('genbank_accessions');
  });

  test('accessionLookup is only for strain searches with accessions', () => {
    expect(Q.accessionLookup({ grain: 'segment', accessions: ['CY121680'] })).toBeNull();
    expect(Q.accessionLookup({ grain: 'strain' })).toBeNull();
    expect(Q.accessionLookup(null)).toBeNull();
  });
});

describe('kept identical to InfluenzaSearch (D3: separate, but not different without reason)', () => {
  // Expected strings follow widget/search/InfluenzaSearch.js on alpha
  // (2026-11-24). If InfluenzaSearch changes, these do not follow it; port
  // deliberately.
  test('taxon IDs per virus type (FLU_TAXON_IDS)', () => {
    expect(Q.FLU_TAXON_IDS).toEqual({
      A: '2955291', B: '2955465', C: '2955935', D: '2955744'
    });
  });

  test('accession list format (_buildAccessionQuery)', () => {
    expect(q({ grain: 'segment', accessions: ['CY121680'] })).toContain('eq(accession,%22CY121680%22)');
  });

  test('exclude deprecated', () => {
    expect(q({ grain: 'strain', excludeDeprecated: true })).toContain('ne(genome_status,Deprecated)');
  });

  test('query shapes: leading clause, then the join', () => {
    expect(q({ grain: 'strain', virusTypes: ['A'] })).toBe('eq(genome_id,*)&genome(' + A + ')');
    expect(q({ grain: 'segment', virusTypes: ['A'] })).toBe('eq(sequence_id,*)&genome(' + A + ')');
    expect(q({ grain: 'protein', virusTypes: ['A'], annotation: 'all' }))
      .toBe('in(feature_type,(CDS,mat_peptide))&genome(' + A + ')');
  });
});
