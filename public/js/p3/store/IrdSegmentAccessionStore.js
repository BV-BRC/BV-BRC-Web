define([
  'dojo/_base/lang', 'dojo/when', 'dojo/store/util/QueryResults', 'dojo/request', '../util/PathJoin'
], function (lang, when, QueryResults, request, PathJoin) {

  /**
   * IRD's Strain Display shows one column per segment (1 PB2 ... 8 NS) with
   * its accession. Genome records cannot supply that: genbank_accessions is
   * one unordered string, and incomplete on genomes where segment linking
   * merged extra sequences. So, like GenomeMetadataStore, this wraps the
   * genome store and, for the rows actually displayed, fetches their segment
   * records (genome_sequence: genome_id, segment, accession).
   *
   * Each row gains `ird_segments`: { PB2: ['CY...'], HA: ['A', 'B'], ... }.
   * More than one accession for a segment means linking put several
   * sequences in this genome; the cell says so rather than picking one.
   *
   * Lookups go in small batches of genomes: one overfilled genome can hold
   * hundreds of sequences (A/swine/England/453/2006 has 922), and the API
   * truncates responses at 10,000 rows. A batch that comes back full marks
   * its rows `ird_segments_truncated` instead of showing partial lists as
   * complete.
   */

  var BATCH_GENOMES = 25;
  var ROW_LIMIT = 9999;

  return function IrdSegmentAccessionStore(baseStore, apiServer) {
    var store = lang.delegate(baseStore);
    store.query = function (query, options) {
      var results = baseStore.query.call(this, query, options);
      var enriched = when(results, function (rows) {
        var ids = [];
        rows.forEach(function (row) {
          if (row.genome_id && ids.indexOf(row.genome_id) === -1) ids.push(row.genome_id);
        });
        if (!ids.length) return rows;

        var bySegment = Object.create(null);
        var truncated = Object.create(null);
        var pending = when(null, function () {});
        for (var start = 0; start < ids.length; start += BATCH_GENOMES) {
          (function (batch) {
            pending = when(pending, function () {
              return request.post(PathJoin(apiServer, 'genome_sequence') + '/', {
                handleAs: 'json',
                headers: {
                  accept: 'application/json',
                  'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                  'X-Requested-With': null,
                  Authorization: window.App.authorizationToken || ''
                },
                data: 'in(genome_id,(' + batch.map(encodeURIComponent).join(',') + '))'
                  + '&select(genome_id,segment,accession)&sort(+accession)&limit(' + ROW_LIMIT + ')'
              }).then(function (records) {
                if (records.length >= ROW_LIMIT) {
                  batch.forEach(function (id) { truncated[id] = true; });
                }
                records.forEach(function (r) {
                  if (!r.genome_id || !r.segment || !r.accession) return;
                  var segs = bySegment[r.genome_id] || (bySegment[r.genome_id] = {});
                  (segs[r.segment] || (segs[r.segment] = [])).push(r.accession);
                });
              });
            });
          }(ids.slice(start, start + BATCH_GENOMES)));
        }

        return when(pending, function () {
          return rows.map(function (row) {
            var result = lang.mixin({}, row);
            result.ird_segments = bySegment[row.genome_id] || {};
            if (truncated[row.genome_id]) result.ird_segments_truncated = true;
            return result;
          });
        }, function (err) {
          // The grid still shows the strains; the segment cells stay empty.
          console.error('IRD strain display: unable to load segment accessions', err);
          return rows;
        });
      });
      // Dojo promises are frozen; QueryResults creates a mutable wrapper.
      var decorated = QueryResults(enriched);
      decorated.total = results.total;
      return decorated;
    };
    return store;
  };
});
