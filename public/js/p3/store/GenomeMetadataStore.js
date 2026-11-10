'use strict';

define([
  'dojo/_base/lang', 'dojo/when', 'dojo/store/util/QueryResults', 'dojo/request', '../util/PathJoin'
], function (lang, when, QueryResults, request, PathJoin) {
  // Enrich only returned rows, rather than fetching the genomes for an entire
  // search. Native sequence/feature fields always retain their own values.
  return function (baseStore, fields, apiServer) {
    var store = lang.delegate(baseStore);
    store.genomeMetadataFields = fields.slice();
    store.query = function (query, options) {
      var results = baseStore.query.call(this, query, options);
      var enriched = when(results, function (rows) {
        var ids = [];
        rows.forEach(function (row) {
          if (row.genome_id && ids.indexOf(row.genome_id) === -1) ids.push(row.genome_id);
        });
        if (!ids.length) return rows;
        var genomes = Object.create(null);
        var pending = when(null, function () {});
        // Keep selection queries bounded too (they can exceed a display page).
        for (var start = 0; start < ids.length; start += 200) {
          (function (batch) {
            pending = when(pending, function () {
              return request.post(PathJoin(apiServer, 'genome') + '/', {
                handleAs: 'json',
                headers: {
                  accept: 'application/json',
                  'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                  'X-Requested-With': null,
                  Authorization: window.App.authorizationToken || ''
                },
                data: 'in(genome_id,(' + batch.map(encodeURIComponent).join(',') + '))'
                  + '&select(genome_id,' + fields.join(',') + ')&limit(' + batch.length + ')'
              }).then(function (records) {
                records.forEach(function (record) { genomes[record.genome_id] = record; });
              });
            });
          }(ids.slice(start, start + 200)));
        }
        return when(pending, function () {
          return rows.map(function (row) {
            var result = lang.mixin({}, row);
            var genome = genomes[row.genome_id] || {};
            fields.forEach(function (field) {
              if (!Object.prototype.hasOwnProperty.call(row, field)) result[field] = genome[field];
            });
            return result;
          });
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
