define([
  '../widget/search/TextInputEncoder', './fullCollectionDatePattern'
], function (TextInputEncoder, fullCollectionDatePattern) {

  /**
   * Query building for the IRD-style influenza sequence search (Option C,
   * PLAN-ird-option-c.md): plain form state in, { collection, query } out.
   * No widget, no DOM, so every clause is testable.
   *
   * Seeded from widget/search/InfluenzaSearch.js (_buildGenomeFilters and the
   * per-data-type builders) but deliberately separate from it (decision D3):
   * a change there does not change this, and the reverse. When a query bug is
   * fixed in one, port it to the other on purpose.
   *
   * Where this differs from InfluenzaSearch, on purpose (checked against the
   * reorganized genomes on alpha, 2026-11-24):
   *
   *  - Segments are names (HA, PB2, ...). The reorganized records store names;
   *    InfluenzaSearch's numbers ('4' for HA) match 7 genomes on alpha, not
   *    276,282.
   *  - Year ranges use collection_year (int). collection_date_dr, which
   *    InfluenzaSearch ranges over, is empty in the reorganized genomes, so
   *    every range on it returns nothing on alpha.
   *  - No vaccine_strain or reference_genome filters: vaccine_strain is not a
   *    genome field (HTTP 400 on alpha and production) and reference_genome is
   *    empty for Influenza A on alpha.
   *  - Segment and protein searches filter on their own records wherever those
   *    carry the field (segment, sequence_status, length, accession,
   *    genome_name; gene, product, aa_length) and put only genome-level
   *    metadata in genome(...). On alpha those records carry almost no strain
   *    metadata, so host, subtype, dates and so on must go through the join.
   *    The API refuses a join matching more than 150,000 genomes unless it is
   *    purely taxonomic (lib/joinResolver.js), so nothing that can live on the
   *    target goes in the join. InfluenzaSearch also puts the segment inside
   *    the join, which makes "Flu A, HA" (276,282 genomes) a refused query.
   *  - One-sided ranges use between(f,x,*) / between(f,*,x), never gt/lt. The
   *    Data API's gt/ge and lt/le are swapped (PLAN-rql-range-operators.md);
   *    between() is inclusive and stays correct whether or not that is fixed.
   *
   * State shape (all fields optional unless noted):
   *
   *   grain            'strain' | 'segment' | 'protein'   (required)
   *   virusTypes       ['A', 'B', 'C', 'D']
   *   fullSubtype      ['H5N1', ...]       Flu A; wins over haSubtype/naSubtype
   *   haSubtype        ['5', ...]          Flu A, h_type (stored as numbers)
   *   naSubtype        ['1', ...]          Flu A, n_type
   *   fluBLineage      ['Victoria', ...]   Flu B, also the subtype field
   *   h1CladeGlobal, h1CladeUs, h3Clade, h5Clade, subclade    Flu A only
   *   ph1n1Like        'Positive' | 'Negative'                  Flu A only
   *   hostGroup        'Avian'
   *   hostName         ['Chicken', ...]    host_common_name
   *   hostGender, hostHealth
   *   geographicGroup  'Asia'
   *   country          ['China', ...]
   *   stateProvince
   *   collectionYear   { from: 2020, to: 2024 }    either bound optional
   *   collectionDate   { from: '2024-03-01', to: '2024-06-30' }  full dates
   *   fullCollectionDate  true: only records with a full Y-M-D date
   *   season
   *   strainName       free text against genome_name
   *   accessions       ['CY121680', ...] or one pasted string
   *   bioproject
   *   submissionDate   { from: '2024', to: '2024-06' }  Y, Y-M or Y-M-D
   *   isolationSource, passage
   *   excludeDeprecated  true
   *   segments         ['HA', 'NA']
   *   segmentSetComplete  true: genome has all eight segments
   *   sequenceComplete    true: full-length sequences (genome_status Complete)
   *   length           { from, to }  genome_length / length / aa_length by grain
   *   segmentLengths   { HA: { from, to }, ... }   segment grain only
   *   genes            ['HA', 'PA-X', ...]   protein grain
   *   product          free text             protein grain
   *   annotation       'PATRIC' (default) | 'RefSeq' | 'all'   protein grain.
   *                    Every influenza protein exists once per annotation, so
   *                    'all' lists each twice (as InfluenzaSearch does).
   *   genomeIds        strain grain: genome IDs resolved from `accessions` by
   *                    running accessionLookup(state) first. See there.
   *   keyword          free text, applied to the target collection
   */

  var FLU_TAXON_IDS = {
    A: '2955291', B: '2955465', C: '2955935', D: '2955744'
  };

  var SEGMENTS = ['PB2', 'PB1', 'PA', 'HA', 'NP', 'NA', 'M', 'NS'];

  var COLLECTION = { strain: 'genome', segment: 'genome_sequence', protein: 'genome_feature' };

  var LENGTH_FIELD = { strain: 'genome_length', segment: 'length', protein: 'aa_length' };

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\*|\||\[|\]/g, '');
  }

  function present(v) {
    return v !== undefined && v !== null && String(v).trim() !== '';
  }

  function values(v) {
    return (Array.isArray(v) ? v : [v]).filter(present);
  }

  /**
   * eq(field,value), or or(eq,...) for several values. Picked values are
   * quoted so one with spaces ("North America") stays one term. InfluenzaSearch
   * quotes lists but not single values; quoting both is the safer reading.
   * `freeText` URL-encodes a typed value unquoted, as InfluenzaSearch does for
   * strain name, BioProject and product.
   */
  function eqClause(field, v, freeText) {
    if (freeText && !Array.isArray(v)) {
      return present(v) ? 'eq(' + field + ',' + TextInputEncoder(sanitizeInput(String(v).trim())) + ')' : null;
    }
    var terms = values(v).map(function (value) {
      var clean = sanitizeInput(String(value)).trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return 'eq(' + field + ',' + TextInputEncoder('"' + clean + '"') + ')';
    });
    if (!terms.length) return null;
    return terms.length === 1 ? terms[0] : 'or(' + terms.join(',') + ')';
  }

  function push(arr, clause) {
    if (clause) arr.push(clause);
  }

  /** Inclusive range; either bound may be missing. Values must already be encoded. */
  function range(field, from, to) {
    var hasFrom = present(from);
    var hasTo = present(to);
    if (!hasFrom && !hasTo) return null;
    return 'between(' + field + ',' + (hasFrom ? from : '*') + ',' + (hasTo ? to : '*') + ')';
  }

  function intOrNull(v) {
    var n = parseInt(v);
    return isNaN(n) ? null : n;
  }

  function numericRange(field, r) {
    if (!r) return null;
    return range(field, intOrNull(r.from), intOrNull(r.to));
  }

  function solrDateLower(dateStr) {
    var parts = String(dateStr).trim().split('-');
    if (parts.length === 1) return parts[0] + '-01-01T00:00:00Z';
    if (parts.length === 2) return parts[0] + '-' + parts[1] + '-01T00:00:00Z';
    return parts[0] + '-' + parts[1] + '-' + parts[2] + 'T00:00:00Z';
  }

  function solrDateUpper(dateStr) {
    var parts = String(dateStr).trim().split('-');
    if (parts.length === 1) return parts[0] + '-12-31T23:59:59Z';
    if (parts.length === 2) {
      var lastDay = new Date(parseInt(parts[0]), parseInt(parts[1]), 0).getDate();
      return parts[0] + '-' + parts[1] + '-' + ('0' + lastDay).slice(-2) + 'T23:59:59Z';
    }
    return parts[0] + '-' + parts[1] + '-' + parts[2] + 'T23:59:59Z';
  }

  /** A pdate range (completion_date) from partial dates. */
  function dateRange(field, r) {
    if (!r) return null;
    return range(field,
      present(r.from) ? encodeURIComponent(solrDateLower(r.from)) : null,
      present(r.to) ? encodeURIComponent(solrDateUpper(r.to)) : null);
  }

  function accessionClause(field, accessions) {
    // A pasted list arrives as one string: split on spaces, commas, semicolons.
    var raw = typeof accessions === 'string' ? accessions.split(/[\s,;]+/) : accessions;
    var list = values(raw).map(function (a) {
      // Sequence records store the base accession separately from its version.
      return String(a).trim().toUpperCase().replace(/\.\d+$/, '');
    }).filter(function (a, i, all) { return a && all.indexOf(a) === i; }).map(function (a) {
      return TextInputEncoder('"' + a.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"');
    });
    if (!list.length) return null;
    return list.length === 1 ? 'eq(' + field + ',' + list[0] + ')' : 'in(' + field + ',(' + list.join(',') + '))';
  }

  function validSegments(segs) {
    return values(segs).filter(function (s) { return SEGMENTS.indexOf(s) !== -1; });
  }

  /**
   * Filters on the genome (strain) record, shared by all three grains.
   * `targetHas` lists what the segment and protein searches apply on their own
   * records instead (strain name, completeness), keeping joins narrow.
   */
  function genomeFilters(state, targetHas) {
    var onTarget = targetHas || {};
    var q = [];
    var types = values(state.virusTypes).filter(function (t) { return FLU_TAXON_IDS[t]; });

    if (types.length === 1) {
      q.push('eq(taxon_lineage_ids,' + FLU_TAXON_IDS[types[0]] + ')');
    } else if (types.length > 1) {
      q.push('in(taxon_lineage_ids,(' + types.map(function (t) { return FLU_TAXON_IDS[t]; }).join(',') + '))');
    }

    // Flu A and Flu B both write `subtype`; with both selected, either matches.
    var hasA = types.indexOf('A') !== -1;
    var hasB = types.indexOf('B') !== -1;
    var aSubtype = null;
    if (hasA) {
      if (values(state.fullSubtype).length) {
        aSubtype = eqClause('subtype', values(state.fullSubtype));
      } else {
        push(q, eqClause('h_type', values(state.haSubtype)));
        push(q, eqClause('n_type', values(state.naSubtype)));
      }
      push(q, eqClause('h1_clade_global', state.h1CladeGlobal));
      push(q, eqClause('h1_clade_us', state.h1CladeUs));
      push(q, eqClause('h3_clade', state.h3Clade));
      push(q, eqClause('h5_clade', state.h5Clade));
      push(q, eqClause('subclade', state.subclade));
      push(q, eqClause('ph1n1_like', state.ph1n1Like));
    }
    var bSubtype = hasB ? eqClause('subtype', values(state.fluBLineage)) : null;
    if (aSubtype && bSubtype) {
      q.push('or(' + aSubtype + ',' + bSubtype + ')');
    } else {
      push(q, aSubtype || bSubtype);
    }

    push(q, eqClause('host_group', state.hostGroup));
    push(q, eqClause('host_common_name', state.hostName));
    push(q, eqClause('host_gender', state.hostGender));
    push(q, eqClause('host_health', state.hostHealth));

    push(q, eqClause('geographic_group', state.geographicGroup));
    push(q, eqClause('isolation_country', state.country));
    push(q, eqClause('state_province', state.stateProvince));

    push(q, numericRange('collection_year', state.collectionYear));
    if (state.collectionDate) {
      // Full ISO dates compare correctly as strings on the raw field.
      push(q, range('collection_date',
        present(state.collectionDate.from) ? encodeURIComponent(String(state.collectionDate.from).trim()) : null,
        present(state.collectionDate.to) ? encodeURIComponent(String(state.collectionDate.to).trim()) : null));
    }
    if (state.fullCollectionDate) {
      q.push('eq(collection_date,' + encodeURIComponent(fullCollectionDatePattern) + ')');
    }
    push(q, eqClause('season', state.season));

    if (state.excludeDeprecated) q.push('ne(genome_status,Deprecated)');

    if (!onTarget.strainName) push(q, eqClause('genome_name', state.strainName, true));
    push(q, eqClause('bioproject_accession', state.bioproject, true));
    push(q, dateRange('completion_date', state.submissionDate));
    push(q, eqClause('isolation_source', state.isolationSource));
    push(q, eqClause('passage', state.passage));

    if (state.sequenceComplete && !onTarget.sequenceComplete) q.push('eq(genome_status,Complete)');
    if (state.segmentSetComplete) {
      // genome_status is sequence completeness, not segment-set completeness:
      // 25,654 alpha genomes have all eight segments and are Partial.
      SEGMENTS.forEach(function (s) { q.push('eq(segment,' + s + ')'); });
    }

    return q;
  }

  function keywordClause(state) {
    return present(state.keyword) ? 'keyword(' + TextInputEncoder(sanitizeInput(String(state.keyword))) + ')' : null;
  }

  function strainQuery(state) {
    var g = genomeFilters(state);
    var ids = values(state.genomeIds);
    if (ids.length) {
      g.push('in(genome_id,(' + ids.map(function (id) { return TextInputEncoder(String(id)); }).join(',') + '))');
    } else {
      // Only a fallback: see accessionLookup().
      push(g, accessionClause('genbank_accessions', state.accessions));
    }
    push(g, numericRange('genome_length', state.length));
    // Every selected segment must be on the same genome record.
    validSegments(state.segments).forEach(function (s) {
      if (!state.segmentSetComplete) g.push('eq(segment,' + s + ')');
    });
    // No empty genome(): a bare or empty join has broken the API before
    // (CLAUDE.md, download Pitfall 3).
    var parts = ['eq(genome_id,*)'];
    if (g.length) parts.push('genome(' + g.join(',') + ')');
    push(parts, keywordClause(state));
    return parts.join('&');
  }

  function segmentQuery(state) {
    var g = genomeFilters(state, { strainName: true, sequenceComplete: true });
    var seq = [];
    push(seq, accessionClause('accession', state.accessions));
    push(seq, eqClause('genome_name', state.strainName, true));
    if (state.sequenceComplete) {
      // This segment's own completeness. Existing annotations use both cases.
      seq.push('in(sequence_status,(Complete,complete))');
    }

    var segs = validSegments(state.segments);
    if (segs.length) {
      // On the sequence only. Also putting it in genome() would make the join
      // non-taxonomic, and "Flu A, HA" alone is over the API's join limit.
      seq.push(segs.length === 1 ? 'eq(segment,' + segs[0] + ')' : 'in(segment,(' + segs.join(',') + '))');
    }

    push(seq, numericRange('length', state.length));

    // IRD's per-segment length bounds: a sequence passes if its own segment's
    // bound holds. Segments without a bound pass unrestricted.
    var perSegment = state.segmentLengths || {};
    var bounded = Object.keys(perSegment).filter(function (s) {
      return SEGMENTS.indexOf(s) !== -1 && numericRange('length', perSegment[s]);
    });
    if (bounded.length) {
      var alts = bounded.map(function (s) {
        return 'and(eq(segment,' + s + '),' + numericRange('length', perSegment[s]) + ')';
      });
      var unbounded = SEGMENTS.filter(function (s) { return bounded.indexOf(s) === -1; });
      if (unbounded.length) alts.push('in(segment,(' + unbounded.join(',') + '))');
      seq.push('or(' + alts.join(',') + ')');
    }

    var parts = ['eq(sequence_id,*)'];
    if (g.length) parts.push('genome(' + g.join(',') + ')');
    parts = parts.concat(seq);
    push(parts, keywordClause(state));
    return parts.join('&');
  }

  function proteinQuery(state) {
    // Protein records have no segment field; choose proteins by gene instead.
    var f = ['in(feature_type,(CDS,mat_peptide))'];
    push(f, accessionClause('accession', state.accessions));
    push(f, eqClause('genome_name', state.strainName, true));
    var annotation = state.annotation || 'PATRIC';
    if (annotation !== 'all') f.push('eq(annotation,' + sanitizeInput(String(annotation)) + ')');
    var g = genomeFilters(state, { strainName: true });
    if (g.length) f.push('genome(' + g.join(',') + ')');
    // Genes are symbols (HA, PA-X, PB1-F2), quoted like any list.
    push(f, eqClause('gene', state.genes));
    push(f, eqClause('product', state.product, true));
    push(f, numericRange('aa_length', state.length));
    push(f, keywordClause(state));
    return f.join('&');
  }

  var BUILDERS = { strain: strainQuery, segment: segmentQuery, protein: proteinQuery };

  // A pivot names its records by ID; keep the request bounded.
  var MAX_PIVOT_IDS = 1000;

  // Which field of a selected row links it to the target records. Rows carry
  // these natively: segment and protein rows have sequence_id and genome_id,
  // strain rows genome_id. (Read the link off the rows, never reduce them to
  // the grid's primary key and try to recover it: CLAUDE.md, download
  // Pitfall 2.)
  var PIVOT_LINK = {
    segment: { protein: 'sequence_id', strain: 'genome_id' },
    protein: { segment: 'sequence_id', strain: 'genome_id' },
    strain: { segment: 'genome_id', protein: 'genome_id' }
  };

  /**
   * IRD's "Show Segment / Protein / Strain Display" for selected rows: the
   * same records seen at another grain.
   *
   * @param {string} from - grain of the selected rows
   * @param {string} to - grain to show
   * @param {Array<Object>} rows - selected row objects
   * @param {Object} [options] - { annotation } for a protein target
   * @returns {{collection: string, query: string}}
   */
  function pivotQuery(from, to, rows, options) {
    var link = PIVOT_LINK[from] && PIVOT_LINK[from][to];
    if (!link) throw new Error('irdSequenceQuery: cannot pivot from ' + from + ' to ' + to);
    var ids = (rows || []).map(function (r) { return r && r[link]; })
      .filter(function (id, i, all) { return present(id) && all.indexOf(id) === i; });
    if (!ids.length) throw new Error('None of the selected rows can be shown that way.');
    if (ids.length > MAX_PIVOT_IDS) {
      throw new Error('Select at most ' + MAX_PIVOT_IDS + ' to switch displays; ' + ids.length + ' are selected.');
    }
    var clause = 'in(' + link + ',(' + ids.map(function (id) { return encodeURIComponent(String(id)); }).join(',') + '))';
    var query = clause;
    if (to === 'protein') {
      var annotation = (options && options.annotation) || 'PATRIC';
      query = 'in(feature_type,(CDS,mat_peptide))' + (annotation === 'all' ? '' : '&eq(annotation,' + sanitizeInput(String(annotation)) + ')') + '&' + clause;
    }
    return { collection: COLLECTION[to], query: query };
  }

  return {
    FLU_TAXON_IDS: FLU_TAXON_IDS,
    SEGMENTS: SEGMENTS,
    COLLECTION: COLLECTION,
    LENGTH_FIELD: LENGTH_FIELD,

    /**
     * @param {Object} state - form state, see the shape above
     * @returns {{collection: string, query: string}}
     */
    buildQuery: function (state) {
      var build = BUILDERS[state && state.grain];
      if (!build) throw new Error('irdSequenceQuery: unknown grain ' + (state && state.grain));
      return { collection: COLLECTION[state.grain], query: build(state) };
    },

    genomeFilters: genomeFilters,

    MAX_PIVOT_IDS: MAX_PIVOT_IDS,
    pivotQuery: pivotQuery,

    /**
     * For a strain search by accession, the query that finds the genomes
     * holding those accessions. Run it, then call buildQuery with
     * `genomeIds` set to the genome_id values it returns.
     *
     * The genome record's own genbank_accessions is not reliable for this: on
     * genomes where segment linking merged extra sequences it is incomplete
     * (641809.294 holds 39 sequences and lists 11 accessions, so a search for
     * CY121680 misses it). The segment records are authoritative.
     *
     * @returns {{collection: string, query: string}|null} null if not needed
     */
    accessionLookup: function (state) {
      if (!state || state.grain !== 'strain') return null;
      var clause = accessionClause('accession', state.accessions);
      if (!clause) return null;
      // One accession can sit in several genomes; stay under the API's
      // 10,000-row response limit.
      return { collection: 'genome_sequence', query: clause + '&select(genome_id)&limit(9999)' };
    }
  };
});
