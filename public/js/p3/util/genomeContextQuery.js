define([
  'dojo/request'
], function (
  request
) {

  /**
   * Re-target a query written against the `genome` collection so a sibling
   * tab can run it against its own collection.
   *
   * THE BUG THIS FIXES. A list view's `state.search` is shared verbatim by
   * every tab (CLAUDE.md, "Never inject collection-specific filters into
   * state.search"). GenomeList's search is built from genome fields, so the
   * moment it carries one that only `genome` has, every non-genome tab 400s:
   *
   *   genome          eq(taxon_lineage_ids,2955291)&eq(segment,"HA")   200
   *   genome_sequence  same                                            400 undefined field collection_year
   *   genome_feature   same                                            400 undefined field segment
   *
   * Measured on alpha. Taxonomy.js already solved this by wrapping the
   * query in the `genome(...)` cross-collection join; GenomeList never did,
   * so the Sequences/Features/Proteins tabs have been broken for any search
   * richer than a taxon id. Saved searches made it easy to hit because they
   * replay a full facet-built query.
   *
   * WHY NOT ALWAYS WRAP. The join is refused when the inner query matches
   * more genomes than the server will join (`join_too_broad`, 400 — see
   * util/joinTooBroad.js). The "My Genomes" link is `eq(public,false)`,
   * which is 726,474 genomes against a limit of 150,000:
   *
   *   genome_feature/?eq(public,false)                      200
   *   genome_feature/?eq(genome_id,*)&genome(eq(public,false))
   *                                                         400 join_too_broad
   *
   * `public` is native on genome_feature, so that query never needed a join.
   * Hence the rule: **join only when the query actually names a field the
   * target collection does not have.** Anything the target can answer itself
   * is left alone, which keeps today's working cases on today's code path.
   *
   * WHY WRAP THE WHOLE QUERY rather than only the genome-only clauses.
   * Both return the same rows (verified: 546 either way on the 1918 H1N1
   * set), but every clause left outside the join is one fewer constraint on
   * the genome set, which makes `join_too_broad` more likely. Putting
   * everything inside keeps the join as narrow as the user made it.
   */

  /**
   * Fields a collection can be FILTERED on, restricted to those that also
   * exist on `genome` -- the only ones a genome-built query can mention.
   *
   * From `/<collection>/fields` on alpha, 2026-11-13. **Enriched fields
   * are deliberately excluded**: the endpoint lists them, but they are
   * added to the page after the query runs, so Solr never sees them --
   * `/genome_feature/fields` advertises `segment` and `collection_year`,
   * and filtering on either is a 400. That trap is the whole reason this
   * module exists.
   *
   * BV-BRC-API#287 made this explicit: each field now reports
   * `filterable`, so the distinction no longer has to be inferred from
   * `source: native`. `useFilterableFields()` below adopts the live
   * answer when it is available. This table remains the fallback, because
   * /fields still 404s on production (see util/CollectionFields.js).
   *
   * Checked field-for-field against that endpoint's `filterable` set: the
   * two agree everywhere, with one difference -- `text`, Solr's catch-all
   * copy field, which is filterable but is not a `genome` field any query
   * here would name. Being wrong in the safe direction costs a join we
   * did not need; being wrong the other way is the 400 above, so when in
   * doubt leave a field out.
   */
  /**
   * Every field `genome` itself can be filtered on, from
   * `/genome/fields?all=true` on alpha, 2026-11-13.
   *
   * Only used to bound `useFilterableFields()`: a genome-built query can
   * only ever name a genome field, so anything outside this set is noise
   * from the target collection's own schema.
   */
  var GENOME_FIELDS = [
    'additional_metadata', 'altitude', 'annotation_job_id',
    'annotation_method', 'antimicrobial_resistance',
    'antimicrobial_resistance_evidence', 'assembly_accession',
    'assembly_method', 'authors', 'bioproject_accession',
    'biosample_accession', 'biovar', 'body_sample_site',
    'body_sample_subsite', 'cds', 'cds_ratio', 'cell_shape', 'cgmlst_hc0',
    'cgmlst_hc10', 'cgmlst_hc100', 'cgmlst_hc2', 'cgmlst_hc20',
    'cgmlst_hc5', 'cgmlst_hc50', 'cgmlst_id', 'checkm_completeness',
    'checkm_contamination', 'chromosomes', 'city', 'clade', 'class',
    'coarse_consistency', 'collection_date', 'collection_date_dr',
    'collection_year', 'comments', 'common_name', 'completion_date',
    'contig_l50', 'contig_n50', 'contigs', 'core_families',
    'core_family_ratio', 'county', 'culture_collection', 'date_inserted',
    'date_modified', 'depth', 'disease', 'family', 'fine_consistency',
    'gc_content', 'genbank_accessions', 'genome_id', 'genome_length',
    'genome_name', 'genome_quality', 'genome_quality_flags',
    'genome_status', 'genus', 'geographic_group', 'geographic_location',
    'gram_stain', 'h1_clade_global', 'h1_clade_us', 'h3_clade', 'h5_clade',
    'h_type', 'habitat', 'host_age', 'host_common_name', 'host_gender',
    'host_group', 'host_health', 'host_name', 'host_scientific_name',
    'hypothetical_cds', 'hypothetical_cds_ratio', 'isolation_comments',
    'isolation_country', 'isolation_site', 'isolation_source', 'kingdom',
    'lab_host', 'latitude', 'lineage', 'longitude', 'mat_peptide',
    'missing_core_family_ids', 'mlst', 'motility', 'n_type',
    'ncbi_project_id', 'nearest_genomes', 'optimal_temperature', 'order',
    'organism_name', 'other_clinical', 'other_environmental',
    'other_names', 'other_typing', 'outgroup_genomes', 'owner',
    'oxygen_requirement', 'p2_genome_id', 'partial_cds',
    'partial_cds_ratio', 'passage', 'pathovar', 'patric_cds', 'ph1n1_like',
    'phenotype', 'phylum', 'plasmids', 'plfam_cds', 'plfam_cds_ratio',
    'public', 'publication', 'reference_genome', 'refseq_accessions',
    'refseq_cds', 'refseq_project_id', 'rrna', 'salinity', 'season',
    'segment', 'segments', 'sequencing_centers', 'sequencing_depth',
    'sequencing_platform', 'sequencing_status', 'serovar', 'species',
    'sporulation', 'sra_accession', 'state_province', 'strain', 'subclade',
    'subtype', 'superkingdom', 'taxon_id', 'taxon_lineage_ids',
    'taxon_lineage_names', 'temperature_range', 'text', 'trna',
    'type_strain', 'user_read', 'user_write'
  ];

  var SHARED_NATIVE_FIELDS = {
    genome_sequence: ['date_inserted', 'date_modified', 'gc_content', 'genome_id',
      'genome_name', 'owner', 'public', 'segment', 'taxon_id', 'user_read', 'user_write'],
    genome_feature: ['date_inserted', 'date_modified', 'genome_id', 'genome_name',
      'owner', 'public', 'segments', 'taxon_id', 'user_read', 'user_write'],
    sp_gene: ['date_inserted', 'date_modified', 'genome_id', 'genome_name',
      'owner', 'public', 'taxon_id', 'user_read', 'user_write'],
    pathway: ['date_inserted', 'date_modified', 'genome_id', 'genome_name',
      'owner', 'public', 'taxon_id', 'user_read', 'user_write'],
    subsystem: ['class', 'date_inserted', 'date_modified', 'genome_id', 'genome_name',
      'owner', 'public', 'taxon_id', 'user_read', 'user_write'],
    genome_amr: ['date_inserted', 'date_modified', 'genome_id', 'genome_name',
      'owner', 'public', 'taxon_id', 'user_read', 'user_write'],
    protein_feature: ['comments', 'date_inserted', 'date_modified', 'genome_id',
      'genome_name', 'publication', 'segments', 'taxon_id'],
    protein_structure: ['authors', 'date_inserted', 'date_modified', 'genome_id',
      'organism_name', 'taxon_id', 'taxon_lineage_ids', 'taxon_lineage_names'],
    experiment: ['additional_metadata', 'date_inserted', 'date_modified', 'genome_id',
      'strain', 'taxon_id', 'taxon_lineage_ids'],
    strain: ['collection_date', 'collection_year', 'date_inserted', 'date_modified',
      'family', 'genbank_accessions', 'genus', 'geographic_group', 'h_type',
      'host_common_name', 'host_group', 'host_name', 'isolation_country', 'lab_host',
      'n_type', 'owner', 'passage', 'public', 'season', 'species', 'strain', 'subtype',
      'taxon_id', 'taxon_lineage_ids', 'taxon_lineage_names', 'user_read', 'user_write'],
    surveillance: ['additional_metadata', 'collection_date', 'collection_year', 'comments',
      'date_inserted', 'date_modified', 'genome_id', 'geographic_group', 'host_age',
      'host_common_name', 'host_group', 'host_health', 'species', 'strain', 'subtype',
      'taxon_lineage_ids'],
    serology: ['additional_metadata', 'collection_date', 'collection_year', 'comments',
      'date_inserted', 'date_modified', 'geographic_group', 'host_age', 'host_common_name',
      'host_health', 'strain', 'taxon_lineage_ids'],
    epitope: ['comments', 'date_inserted', 'date_modified', 'host_name', 'taxon_id',
      'taxon_lineage_ids', 'taxon_lineage_names'],
    ppi: ['date_inserted', 'date_modified']
  };

  /**
   * How to reach `genome` from a collection.
   *
   * `lead` is the positive top-level term the join needs in front of it --
   * a bare `genome(...)` as the only clause makes the API emit `q=()` and
   * Solr 400s (CLAUDE.md, Pitfall 3). It must be a field the *target*
   * collection has: `eq(genome_id,*)` on epitope is itself a 400.
   *
   * `via` names the join field when it is not `genome_id`.
   *
   * Collections absent from this table cannot be joined to genome at all:
   * `serology` and `epitope` have no genome reference (verified -- the join
   * returns `undefined field genome_id`). They fall back to native-only
   * filtering, and `dropped` reports what was discarded so the caller can
   * say so rather than silently widening the result.
   */
  var GENOME_JOIN = {
    genome_sequence: { lead: 'genome_id' },
    genome_feature: { lead: 'genome_id' },
    sp_gene: { lead: 'genome_id' },
    pathway: { lead: 'genome_id' },
    subsystem: { lead: 'genome_id' },
    genome_amr: { lead: 'genome_id' },
    protein_feature: { lead: 'genome_id' },
    protein_structure: { lead: 'genome_id' },
    experiment: { lead: 'genome_id' },
    surveillance: { lead: 'genome_id' },
    strain: { lead: 'id', via: 'genome_ids' },
    ppi: { lead: 'id', via: 'genome_id_a' }
  };

  /**
   * Used to render "this tab cannot answer that search" as zero rows.
   *
   * An empty query means *everything*, so when no clause survives we ask
   * for a primary key that cannot exist instead. Each of these was checked
   * to return `found=0` rather than an error.
   */
  var MATCH_NOTHING = '__BVBRC_NO_MATCH__';
  var MATCH_NOTHING_FIELD = {
    epitope: 'epitope_id',
    serology: 'id',
    strain: 'id',
    ppi: 'id'
  };

  // Operators that take a field name as their first argument. `keyword` is
  // absent on purpose: it is a full-text term with no field.
  var FIELD_OP_RE = /\b(?:eq|ne|gt|lt|ge|le|in|all|any|between)\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,/g;

  /** Split on top-level `&`, ignoring any inside parentheses. */
  function splitTopLevel(query) {
    var parts = [];
    var depth = 0;
    var start = 0;
    for (var i = 0; i < query.length; i++) {
      var ch = query.charAt(i);
      if (ch === '(') { depth++; }
      else if (ch === ')') { depth--; }
      else if (ch === '&' && depth === 0) {
        parts.push(query.slice(start, i));
        start = i + 1;
      }
    }
    parts.push(query.slice(start));
    return parts.filter(function (p) { return p !== ''; });
  }

  /** Every field named anywhere in a clause, including nested and()/or(). */
  function fieldsIn(clause) {
    var found = [];
    var m;
    FIELD_OP_RE.lastIndex = 0;
    while ((m = FIELD_OP_RE.exec(clause)) !== null) {
      if (found.indexOf(m[1]) === -1) { found.push(m[1]); }
    }
    return found;
  }

  /**
   * If the query is already `eq(<x>,*)&genome(<inner>)`, return `<inner>`.
   *
   * Influenza search builds exactly that shape, and wrapping it again is a
   * 400 ("Can not mix conjunctions"), so an existing join is re-led for the
   * new collection rather than nested.
   */
  function existingJoinInner(query) {
    var clauses = splitTopLevel(query);
    var inner = null;
    var others = [];
    clauses.forEach(function (c) {
      var t = c.trim();
      if (inner === null && /^genome\(/.test(t) && t.charAt(t.length - 1) === ')') {
        inner = t.slice('genome('.length, -1);
      } else if (!/^eq\([a-zA-Z_][a-zA-Z0-9_]*,\*\)$/.test(t)) {
        // a bare eq(field,*) is only there to anchor the join; drop it
        others.push(t);
      }
    });
    if (inner === null) { return null; }
    return { inner: inner, others: others };
  }

  /**
   * @param {string} query - RQL built against the `genome` collection
   * @param {string} dataType - the target collection, e.g. 'genome_feature'
   * @returns {Object} `{ query, joined, dropped, unfiltered }` -- `joined`
   *   is true when a `genome(...)` join was added; `dropped` lists clauses
   *   discarded because the collection can neither answer nor join them
   *   (empty for every joinable collection); `unfiltered` is true when
   *   *nothing* survived, meaning the query would match the entire
   *   collection and the caller must not run it.
   */
  function genomeContextQuery(query, dataType) {
    var result = {
      query: query || '', joined: false, dropped: [], unfiltered: false
    };
    if (!result.query || !dataType || dataType === 'genome') {
      return result;
    }

    var native = SHARED_NATIVE_FIELDS[dataType];
    var join = GENOME_JOIN[dataType];

    // An unknown collection gets the query untouched: guessing would be
    // the 400 this module exists to prevent.
    if (!native) { return result; }

    var existing = existingJoinInner(result.query);
    if (existing) {
      if (!join) {
        // Cannot join, and the whole filter lives inside a join we cannot
        // re-target. Everything is dropped.
        result.dropped = ['genome(' + existing.inner + ')'].concat(existing.others);
        result.unfiltered = true;
        result.query = 'eq(' + (MATCH_NOTHING_FIELD[dataType] || 'id') + ',' + MATCH_NOTHING + ')';
        return result;
      }
      var reled = ['eq(' + join.lead + ',*)',
        'genome(' + (join.via ? 'to(' + join.via + '),' : '') + existing.inner + ')'];
      result.query = reled.concat(existing.others).join('&');
      result.joined = true;
      return result;
    }

    var clauses = splitTopLevel(result.query);
    var needsJoin = clauses.some(function (c) {
      return fieldsIn(c).some(function (f) { return native.indexOf(f) === -1; });
    });

    if (!needsJoin) {
      // Every field is the target's own. Leave it exactly as it is --
      // this is the path that keeps `eq(public,false)` off the join and
      // out of `join_too_broad`.
      return result;
    }

    if (!join) {
      var kept = [];
      clauses.forEach(function (c) {
        var fields = fieldsIn(c);
        if (fields.length && fields.every(function (f) { return native.indexOf(f) !== -1; })) {
          kept.push(c);
        } else {
          result.dropped.push(c);
        }
      });
      // Nothing survived. An empty RQL query is not "no results" -- it is
      // *every* row (measured: an unfiltered /epitope/ returns all 301,723),
      // so running it would present the whole collection as though it were
      // this search's result. That is worse than the 400 it replaces.
      // Substitute a clause that matches nothing, so the grid honestly
      // shows no rows while the banner explains why.
      if (!kept.length) {
        result.unfiltered = true;
        result.query = 'eq(' + (MATCH_NOTHING_FIELD[dataType] || 'id') + ',' + MATCH_NOTHING + ')';
        return result;
      }
      result.query = kept.join('&');
      return result;
    }

    result.query = 'eq(' + join.lead + ',*)&genome('
      + (join.via ? 'to(' + join.via + '),' : '')
      + (clauses.length > 1 ? 'and(' + clauses.join(',') + ')' : clauses[0])
      + ')';
    result.joined = true;
    return result;
  }

  /**
   * Replace a collection's table entry with the live `filterable` set
   * from `/<collection>/fields` (BV-BRC-API#287).
   *
   * Deliberately a push, not a fetch: genomeContextQuery is called from
   * setActivePanelState, which is synchronous, and a query that waited on
   * a round trip would race the grid it is meant to configure. A caller
   * that already holds a /fields payload hands it over; everyone else
   * keeps the static table.
   *
   * Intersected with `genome`'s own fields, because only those can appear
   * in a genome-built query, and union'd with nothing -- an unexpected
   * payload leaves the vetted table in place rather than narrowing it to
   * whatever arrived. Narrowing wrongly would add joins (slow but
   * correct); widening wrongly would 400, so the guard is one-sided.
   *
   * @param {string} dataType
   * @param {Array} fields `/fields` entries, each `{name, filterable}`
   * @returns {boolean} true when the table was updated
   */
  function useFilterableFields(dataType, fields) {
    if (!dataType || !SHARED_NATIVE_FIELDS[dataType] || !fields || !fields.length) {
      return false;
    }
    var genomeFields = GENOME_FIELDS;
    var next = [];
    fields.forEach(function (f) {
      if (f && f.filterable && f.name && genomeFields.indexOf(f.name) !== -1
          && next.indexOf(f.name) === -1) {
        next.push(f.name);
      }
    });
    // A payload that yields nothing recognisable is a shape change, not a
    // collection that lost every field. Keep what we have.
    if (!next.length) { return false; }
    SHARED_NATIVE_FIELDS[dataType] = next;
    return true;
  }

  /**
   * Refresh the table for one collection from the live endpoint.
   *
   * Fire-and-forget, and deliberately NOT awaited by anything: the first
   * query of a session uses the static table (correct as of the date
   * above), and a later one picks up the live answer if the fetch landed.
   * The point is drift protection, not correctness -- so nothing blocks
   * on it, a failure is silent, and each collection is tried once.
   *
   * `fetchFields` is injectable so the rules stay testable without a
   * transport; it defaults to `fetchFilterableFields` below.
   *
   * @param {string} dataType
   * @param {Function} [fetchFields] `function(dataType) -> promise of payload`
   */
  /**
   * Ask the Data API which of a collection's fields can be filtered on.
   *
   * `?all=true` because the default payload is returnable fields only,
   * and a field can be filterable without being returnable.
   */
  function fetchFilterableFields(dataType) {
    var app = (typeof window !== 'undefined' && window.App) || {};
    var base = String(app.dataAPI || app.dataServiceURL || '').replace(/\/+$/, '');
    if (!base || !request || typeof request.get !== 'function') { return null; }
    return request.get(base + '/' + dataType + '/fields?all=true', {
      handleAs: 'json',
      headers: { Accept: 'application/json' }
    });
  }

  var refreshed = {};
  function refreshFilterableFields(dataType, fetchFields) {
    fetchFields = fetchFields || fetchFilterableFields;
    if (!dataType || refreshed[dataType] || typeof fetchFields !== 'function') {
      return;
    }
    refreshed[dataType] = true;
    try {
      var p = fetchFields(dataType);
      if (p && typeof p.then === 'function') {
        p.then(function (payload) {
          var fields = payload && (payload.fields || payload);
          useFilterableFields(dataType, fields);
        }, function () { /* /fields 404s on production; the table stands */ });
      }
    } catch (e) { /* same */ }
  }

  genomeContextQuery.useFilterableFields = useFilterableFields;
  genomeContextQuery.refreshFilterableFields = refreshFilterableFields;
  genomeContextQuery._resetRefreshed = function () { refreshed = {}; };
  genomeContextQuery.GENOME_FIELDS = GENOME_FIELDS;
  genomeContextQuery.SHARED_NATIVE_FIELDS = SHARED_NATIVE_FIELDS;
  genomeContextQuery.GENOME_JOIN = GENOME_JOIN;
  genomeContextQuery.splitTopLevel = splitTopLevel;
  genomeContextQuery.fieldsIn = fieldsIn;

  return genomeContextQuery;
});
