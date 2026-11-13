define([], function () {

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
   * Fields a collection carries natively, restricted to those that also
   * exist on `genome` -- the only ones a genome-built query can mention.
   *
   * From `/<collection>/fields` on alpha, 2026-11-13, filtered to
   * `source: native`. **Enriched fields are deliberately excluded**: the
   * endpoint lists them, but they are not queryable, which is exactly the
   * trap here -- `/genome_feature/fields` advertises `segment` and
   * `collection_year`, and filtering on either is a 400.
   *
   * The endpoint 404s on production (see util/CollectionFields.js), so this
   * is a static table rather than a fetch. Being wrong in the safe
   * direction costs a join we did not need; being wrong the other way is
   * the 400 above, so when in doubt leave a field out.
   */
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
   * @returns {Object} `{ query, joined, dropped }` -- `joined` is true when
   *   a `genome(...)` join was added; `dropped` lists clauses discarded
   *   because the collection can neither answer nor join them (empty for
   *   every joinable collection).
   */
  function genomeContextQuery(query, dataType) {
    var result = { query: query || '', joined: false, dropped: [] };
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
        result.query = '';
        result.dropped = ['genome(' + existing.inner + ')'].concat(existing.others);
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

  genomeContextQuery.SHARED_NATIVE_FIELDS = SHARED_NATIVE_FIELDS;
  genomeContextQuery.GENOME_JOIN = GENOME_JOIN;
  genomeContextQuery.splitTopLevel = splitTopLevel;
  genomeContextQuery.fieldsIn = fieldsIn;

  return genomeContextQuery;
});
