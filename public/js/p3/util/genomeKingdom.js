/**
 * genomeKingdom: decide whether a set of genomes is all-bacteria, all-viruses, or mixed,
 * so a list viewer can hide the tabs that cannot apply.
 *
 * This queries `/genome/` directly rather than the `/data/taxon_category/` convenience
 * endpoint. That endpoint is a pass-through -- it appends a fixed facet string, runs it
 * against `genome`, and returns `Object.keys()` of each facet -- with no caching and no
 * other server-side logic. Calling it cost us three things:
 *
 *   1. It discarded the counts. {Viruses: 15643133, null: 4} became ["Viruses","null"],
 *      which reads like a genuine two-kingdom list. That shape is why the original
 *      caller treated four incompletely-annotated genomes as "mixed" and stopped
 *      pruning tabs for every virus genome list.
 *   2. It computed `order` and `family` facets that neither caller ever read --
 *      measured 6041 vs 1963 bytes, and roughly 1.5s vs 0.6s on the Viruses case.
 *   3. Being a bespoke route, it obscured that this is a `genome` query and so is
 *      subject to the same join_too_broad guard as everything else.
 *
 * With real counts we can use a proportional threshold instead of exact key matching,
 * so a handful of unannotated records no longer decides the answer.
 *
 * NOTE: `/data/taxon_category/` is still used by MAAGE-Web, so the endpoint stays.
 */
define([
  'dojo/request', './PathJoin', '../auth/authHeaders', './joinTooBroad'
], function (xhr, PathJoin, authHeader, joinTooBroad) {

  // A kingdom holding under this share of the genomes is treated as annotation noise
  // rather than evidence of a mixed list. The real case is 4 records in 15.6M (2.6e-7);
  // anything genuinely mixed is orders of magnitude above this.
  var NOISE_FRACTION = 0.001;

  /**
   * @param opts { apiServer, query, authToken }
   * @returns promise resolving to:
   *   { kingdom: 'Bacteria'|'Viruses'|null, counts: {...}, total: n }
   *   `kingdom` is null when the list is genuinely mixed, empty, something other than
   *   Bacteria/Viruses, or when the query could not be answered.
   */
  function detect(opts) {
    opts = opts || {};
    var api = opts.apiServer || (window.App && window.App.dataAPI) || '';
    var query = opts.query || '';

    // Only superkingdom: the callers never read order/family.
    var url = PathJoin(api, 'genome') + '/?' + query
      + '&facet((field,superkingdom),(mincount,1))&limit(1)&json(nl,map)';

    return xhr.get(url, {
      headers: {
        // forToken: the callers hold a prototype-level token captured at module-declare
        // time; passing it through preserves that rather than silently substituting the
        // ambient one.
        Authorization: authHeader.forToken('api', opts.authToken),
        Accept: 'application/solr+json'
      },
      handleAs: 'json'
    }).then(function (res) {
      var counts = (res && res.facet_counts && res.facet_counts.facet_fields
        && res.facet_counts.facet_fields.superkingdom) || {};
      return { kingdom: classify(counts), counts: counts, total: totalOf(counts) };
    }, function (err) {
      // A too-broad genome(...) filter is refused here exactly as it is for the grid.
      // Tab pruning is a refinement, not the page -- degrade to "show everything"
      // rather than surfacing a second error for something the grid already reports.
      if (!joinTooBroad.isJoinTooBroad(err)) {
        console.error('Unable to determine genome kingdom: ' + (err && err.message));
      }
      return { kingdom: null, counts: {}, total: 0 };
    });
  }

  function totalOf(counts) {
    return Object.keys(counts).reduce(function (sum, k) {
      var n = counts[k];
      return sum + (typeof n === 'number' ? n : 0);
    }, 0);
  }

  /**
   * Which single kingdom, if any, this set of facet counts represents.
   *
   * Ignores the literal "null" bucket (genomes whose superkingdom field is unset) and
   * any kingdom below NOISE_FRACTION of the total, then requires exactly one survivor.
   */
  function classify(counts) {
    var total = totalOf(counts);
    if (!total) { return null; }

    var significant = Object.keys(counts).filter(function (k) {
      if (!k || k === 'null') { return false; }
      return (counts[k] / total) >= NOISE_FRACTION;
    });

    if (significant.length !== 1) { return null; }
    var k = significant[0];
    return (k === 'Bacteria' || k === 'Viruses') ? k : null;
  }

  return {
    detect: detect,
    classify: classify,
    NOISE_FRACTION: NOISE_FRACTION
  };
});
