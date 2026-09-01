define([], function () {
  var deprecatedFilter = 'ne(genome_status,Deprecated)';

  function appendDeprecatedFilter(query) {
    if (!query) {
      return deprecatedFilter;
    }

    var terms = query.split('&').filter(function (term) {
      return term && term !== deprecatedFilter;
    });

    terms.push(deprecatedFilter);

    return terms.join('&');
  }

  // Only the genome collection can be filtered on genome_status directly. Other
  // collections would need a cross-collection join back to genome; that join is
  // very slow, and with a negative-only clause (ne(genome_status,Deprecated)) it
  // matches nothing at all. Those targets are passed through unchanged.
  return function buildGlobalSearchQuery(target, query) {
    if (target === 'genome' || target === 'genomes') {
      return appendDeprecatedFilter(query);
    }

    return query;
  };
});
