'use strict';

define([], function () {
  // Keep URL/UI filters in RQL form; convert only when sending to the API.
  // keyword() passes a Solr subquery through the API's existing RQL parser.
  return function (query) {
    if (typeof query !== 'string') return query;
    return query.replace(/(^|[?(&,])(between|gt|lt)\(collection_date_dr,([^()]*)\)/g, function (match, prefix, op, args) {
      const bounds = args.split(',');
      if (bounds.length !== (op === 'between' ? 2 : 1)) return match;
      let dates;
      try {
        dates = bounds.map(decodeURIComponent);
      } catch (err) {
        return match;
      }
      // Only dates and wildcards belong in the generated Solr range.
      if (!dates.every(date => /^(\*|\d{4}(?:-\d{2}(?:-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?)?)?)$/.test(date))) return match;
      const lower = op === 'lt' ? '*' : dates[0];
      const upper = op === 'gt' ? '*' : dates[dates.length - 1];
      // The API expands and re-encodes RQL before parsing it again, leaving !
      // literal. Solr unescapes Unicode inside the quoted _query_ value.
      const solr = `_query_:"{\\u0021field f=collection_date_dr op=Within}[${lower} TO ${upper}]"`;
      return prefix + 'keyword(' + encodeURIComponent(solr) + ')';
    });
  };
});
