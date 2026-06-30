define([], function () {
  var recentReleaseFilter = 'gt(completion_date,NOW-1YEARS)';
  var deprecatedFilter = 'ne(genome_status,Deprecated)';
  var defaultGenomeJoinFilter = 'and(' + recentReleaseFilter + ',' + deprecatedFilter + ')';
  var genomeScopeOnlyTargets = {
    features: true,
    genome_feature: true,
    genome_features: true,
    protein: true,
    proteins: true,
    sp_gene: true,
    sp_genes: true,
    pathway: true,
    pathways: true,
    subsystem: true,
    subsystems: true,
    protein_feature: true,
    protein_features: true,
    protein_structure: true,
    protein_structures: true
  };
  var wrappedPropByTarget = {
    features: 'genome_id',
    genome_feature: 'genome_id',
    genome_features: 'genome_id',
    protein: 'genome_id',
    proteins: 'genome_id',
    sp_gene: 'genome_id',
    sp_genes: 'genome_id',
    pathway: 'genome_id',
    pathways: 'genome_id',
    subsystem: 'genome_id',
    subsystems: 'genome_id',
    protein_feature: 'protein_feature_id',
    protein_features: 'protein_feature_id',
    protein_structure: 'protein_structure_id',
    protein_structures: 'protein_structure_id'
  };

  function appendDefaultGenomeFilters(query) {
    if (!query) {
      return recentReleaseFilter + '&' + deprecatedFilter;
    }

    var terms = query.split('&').filter(function (term) {
      return term && term !== recentReleaseFilter && term !== deprecatedFilter;
    });

    terms.push(recentReleaseFilter);
    terms.push(deprecatedFilter);

    return terms.join('&');
  }

  function appendGenomeScopeDefaults(query) {
    if (!query) {
      return 'eq(genome_id,*)&genome(' + defaultGenomeJoinFilter + ')';
    }

    var out = query;
    if (out.indexOf('eq(genome_id,*)') === -1) {
      out = 'eq(genome_id,*)&' + out;
    }

    if (out.indexOf('genome(') > -1) {
      return out;
    }

    return out + '&genome(' + defaultGenomeJoinFilter + ')';
  }

  function wrapGenomeScopedQuery(query, prop) {
    if (!query) {
      return query;
    }

    if (query.indexOf('genome(') > -1) {
      return query;
    }

    var genomeQuery = appendDefaultGenomeFilters(query).split('&').join(',');
    if (genomeQuery.indexOf(',') > -1) {
      genomeQuery = 'and(' + genomeQuery + ')';
    }

    return 'eq(' + prop + ',*)&genome(' + (prop !== 'genome_id' ? 'to(' + prop + '),' : '') + genomeQuery + ')';
  }

  return function buildGlobalSearchQuery(target, query) {
    if (target === 'genome' || target === 'genomes') {
      return appendDefaultGenomeFilters(query);
    }

    if (genomeScopeOnlyTargets[target]) {
      return appendGenomeScopeDefaults(query);
    }

    if (wrappedPropByTarget[target]) {
      return wrapGenomeScopedQuery(query, wrappedPropByTarget[target]);
    }

    return query;
  };
});