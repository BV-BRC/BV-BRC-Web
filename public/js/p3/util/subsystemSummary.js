define([], function () {

  /**
   * The Subsystems Overview pie chart's data, for a genome the cached summary
   * cannot see.
   *
   * The chart is fed by GET /api/data/subsystem_summary/<genome_id>. That
   * route builds a Solr pivot facet over the `subsystem` collection, but
   * through the API's internal query path with no user, and caches the result
   * by URL. So it only ever sees public rows: for a private genome (or one
   * shared with the viewer) it answers `[]` and the chart renders nothing.
   *
   * The same pivot can be asked of the ordinary /api/subsystem/ endpoint as a
   * raw Solr query. That path carries the caller's token and the API applies
   * its permission filter (public OR owner OR user_read) to it, so a signed-in
   * user gets their own private genomes' subsystems and nobody else's.
   *
   * fromPivot() reshapes the pivot into exactly what the cached route returns
   * (verified against its real output for a real genome, see the test), so the
   * chart does not care which source answered.
   */

  var PIVOT = 'superclass,class,subclass,subsystem_id';

  // BV-BRC genome ids are <taxon>.<n>. The id is placed inside a Solr query, so
  // anything else is refused rather than escaped.
  var GENOME_ID = /^[0-9]+\.[0-9]+$/;

  function isGenomeId(id) {
    return typeof id === 'string' && GENOME_ID.test(id);
  }

  /**
   * The form-encoded Solr body for one genome's subsystem pivot, or null if
   * the id is not a genome id.
   */
  function buildSolrQuery(genomeId) {
    if (!isGenomeId(genomeId)) {
      return null;
    }
    return 'q=*:*&fq=genome_id:' + genomeId
      + '&rows=0&facet=true&facet.limit=-1&facet.pivot.mincount=1'
      + '&facet.pivot=' + PIVOT + '&wt=json';
  }

  // Highest gene count first. Array.prototype.sort is stable, so ties keep
  // Solr's order, which is also what the cached route produces.
  function byGeneCountDesc(a, b) {
    return b.gene_count - a.gene_count;
  }

  /**
   * Solr pivot response -> [{ name, subsystem_count, gene_count, children }],
   * the shape /data/subsystem_summary returns: superclass > class > subclass,
   * where a subclass is a leaf carrying how many distinct subsystems it spans.
   *
   * A genome with no subsystem rows gets no pivot from Solr at all, which is an
   * empty summary and not an error.
   */
  function fromPivot(solrResponse) {
    var counts = solrResponse && solrResponse.facet_counts;
    var pivot = counts && counts.facet_pivot;
    var raw = pivot && pivot[PIVOT];
    if (!raw) {
      return [];
    }

    return raw.map(function (superclass) {
      var superclassSubsystems = 0;
      var classes = (superclass.pivot || []).map(function (klass) {
        var classSubsystems = 0;
        var subclasses = (klass.pivot || []).map(function (subclass) {
          // The last pivot level is one entry per subsystem_id.
          var subsystems = (subclass.pivot || []).length;
          classSubsystems += subsystems;
          return {
            name: subclass.value,
            subsystem_count: subsystems,
            gene_count: subclass.count
          };
        });
        superclassSubsystems += classSubsystems;
        return {
          name: klass.value,
          subsystem_count: classSubsystems,
          gene_count: klass.count,
          children: subclasses.sort(byGeneCountDesc)
        };
      });
      return {
        name: superclass.value,
        subsystem_count: superclassSubsystems,
        gene_count: superclass.count,
        children: classes.sort(byGeneCountDesc)
      };
    }).sort(byGeneCountDesc);
  }

  /**
   * Where to get the summary:
   *
   *   'cache'          the cached public summary (fast, complete for anything
   *                    anonymous users can see)
   *   'api'            the permission-aware Solr query
   *   'cache-then-api' try the cache and, if it comes back empty for a signed-in
   *                    user, ask the API: the genome's privacy is not known yet
   *
   * state.genome is the genome record, and arrives a beat after genome_id, so
   * it can be missing. A genome known to be public never needs the second
   * query; one known to be private skips the cache, which could only answer [].
   */
  function chooseSource(state, signedIn) {
    var genome = state && state.genome;
    if (!signedIn) {
      return 'cache';
    }
    if (genome && genome.public === true) {
      return 'cache';
    }
    if (genome && genome.public === false) {
      return 'api';
    }
    return 'cache-then-api';
  }

  return {
    PIVOT: PIVOT,
    isGenomeId: isGenomeId,
    buildSolrQuery: buildSolrQuery,
    fromPivot: fromPivot,
    chooseSource: chooseSource
  };
});
