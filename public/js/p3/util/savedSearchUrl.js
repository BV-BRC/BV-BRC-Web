define([], function () {

  /**
   * Build the results-view URL for a saved search.
   *
   * Shared by the saved-search browser's Run action and the Workspaces
   * menu list, so a search cannot open one place and not the other.
   *
   * Note for callers: the returned string contains a raw RQL query, which
   * may include `&gt(`/`&lt(`/`&ge(`/`&le(`. Those are legacy HTML named
   * entities and the browser decodes them **without a trailing semicolon**,
   * so assigning this into an innerHTML string silently corrupts the query
   * (see CLAUDE.md, "RQL Queries in HTML Attributes"). Assign it as a DOM
   * attribute -- `domConstruct.create('a', { href: url })` -- or escape it.
   */

  var dataTypeToView = {
    'genome': 'GenomeList',
    'genome_feature': 'FeatureList',
    'genome_sequence': 'SequenceList',
    'sp_gene': 'SpecialtyGeneList',
    'sp_gene_ref': 'SpecialtyGeneList',
    'pathway': 'PathwayList',
    'subsystem': 'SubsystemList',
    'protein_structure': 'ProteinStructureList',
    'epitope': 'EpitopeList',
    'surveillance': 'SurveillanceList',
    'serology': 'SerologyList',
    'transcriptomics_experiment': 'ExperimentList',
    'transcriptomics_sample': 'TranscriptomicsSampleList',
    'transcriptomics_gene': 'TranscriptomicsGeneList',
    'experiment': 'ExperimentList',
    'bioset': 'BiosetList',
    'ppi': 'InteractionList',
    'genome_amr': 'AMRPanelList',
    'protein_feature': 'ProteinFeatureList',
    'sequence_feature': 'SequenceFeatureList'
  };

  return function savedSearchUrl(search) {
    if (!search) return null;

    var viewName = dataTypeToView[search.dataType] || 'GenomeList';
    var url = '/view/' + viewName + '/';

    // Clean up the RQL query:
    // 1. Drop wildcard conditions like eq(genome_id,*), which exist only
    //    to give a join a positive top-level clause.
    // 2. Unwrap a query that is itself a collection wrapper.
    var rqlQuery = search.rqlQuery || '';

    rqlQuery = rqlQuery
      .replace(/eq\([a-z_]+_id,\*\)&?/gi, '')
      .replace(/^&+|&+$/g, '')
      .replace(/&&+/g, '&');

    var wrapperMatch = rqlQuery.match(
      /^(genome|genome_feature|genome_sequence|sp_gene|pathway|subsystem)\((.+)\)$/i);
    if (wrapperMatch) {
      rqlQuery = wrapperMatch[2];
    }

    if (rqlQuery) {
      url += '?' + rqlQuery;
    }

    // Carry the saved search's id, not its selection, when there are rows
    // to re-select. The ids themselves can run to tens of kilobytes, which
    // no URL should hold; the view resolves them from SavedSearchManager
    // instead. A short id also survives bookmarking.
    if (search.id && search.selectedIds && search.selectedIds.length) {
      url += '#savedSearch=' + encodeURIComponent(search.id);
    }

    return url;
  };
});
