define(['./irdSequenceQuery'], function (irdSequenceQuery) {

  /**
   * Running an IRD search (Option C): shared by the search form and the
   * results page's display switch, so both resolve accessions and check
   * counts the same way.
   *
   * `post(collection, body)` is the caller's transport: a dojo/request style
   * POST returning a promise for the parsed JSON, with a `.response`
   * sub-promise whose value has getHeader(). Passing it in keeps this module
   * free of Dojo and testable.
   */

  /** A strain search by accession needs genome IDs first (accessionLookup). */
  function resolveAccessions(state, post) {
    var lookup = irdSequenceQuery.accessionLookup(state);
    if (!lookup) return Promise.resolve(state);
    return Promise.resolve(post(lookup.collection, lookup.query)).then(function (rows) {
      var ids = (rows || []).map(function (r) { return r.genome_id; })
        .filter(function (id, i, all) { return id && all.indexOf(id) === i; });
      if (!ids.length) throw new Error('No genomes contain those accessions.');
      var resolved = {};
      Object.keys(state).forEach(function (k) { resolved[k] = state[k]; });
      resolved.genomeIds = ids;
      return resolved;
    });
  }

  /**
   * Count a built query. A query over the API's 150,000-genome join limit, or
   * with no matches, becomes an Error with a message for the user, so the
   * caller can say so instead of opening a grid that looks like "no data".
   */
  function count(built, post) {
    var req = post(built.collection, built.query + '&limit(1)');
    return Promise.resolve(req.response).then(function (response) {
      var n = parseInt(String(response.getHeader('Content-Range') || '').split('/')[1]);
      if (n === 0) throw new Error('No records match this search.');
      return n;
    }, function (err) {
      var data = err && err.response && err.response.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { data = null; }
      }
      if (data && data.error === 'join_too_broad') {
        throw new Error('This search matches ' + Number(data.genomeCount).toLocaleString()
          + ' genomes, more than can be searched at once. Narrow it with a subtype, host, place or date.');
      }
      throw new Error((data && data.message) || 'The search could not be run. Please try again.');
    });
  }

  /** Form state without the resolved genome IDs, for carrying in a URL. */
  function portableState(state) {
    var out = {};
    Object.keys(state).forEach(function (k) {
      if (k !== 'genomeIds') out[k] = state[k];
    });
    return out;
  }

  /**
   * The IRD results page for a query: /ird/results/<grain>/?<query>, with the
   * form state in the hash so the page can switch displays for the whole
   * result.
   */
  function resultsHref(grain, query, state) {
    var href = '/ird/results/' + grain + '/?' + query;
    if (state) href += '#irdState=' + encodeURIComponent(JSON.stringify(portableState(state)));
    return href;
  }

  /**
   * Run a search: resolve accessions, build, count. Resolves to
   * { state, built, count, href }; rejects with a user-facing message.
   */
  function run(state, post) {
    return resolveAccessions(state, post).then(function (resolved) {
      var built = irdSequenceQuery.buildQuery(resolved);
      return count(built, post).then(function (n) {
        return {
          state: resolved, built: built, count: n, href: resultsHref(resolved.grain, built.query, resolved)
        };
      });
    });
  }

  return {
    resolveAccessions: resolveAccessions,
    count: count,
    portableState: portableState,
    resultsHref: resultsHref,
    run: run
  };
});
