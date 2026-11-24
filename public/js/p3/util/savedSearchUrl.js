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

    var rqlQuery = search.rqlQuery || '';

    // A query carrying a `genome(...)` join is passed through untouched.
    //
    // The cleanup below strips `eq(genome_id,*)` and then unwraps what is
    // left, which turns the influenza search's
    //   eq(genome_id,*)&genome(eq(h5_clade,...),eq(subtype,...))
    // into a bare comma-separated clause list. Both forms return the same
    // rows, so the grid looked right and this went unnoticed -- but the
    // wrapper is load-bearing for the UI around it:
    //
    //  - GenomeList.onSetQuery builds the result header from the clauses
    //    INSIDE `genome(...)` and renders nothing without it, which is why
    //    a reloaded saved search showed a bare "( 382 Genomes )" instead
    //    of the criteria it was saved with.
    //  - The join is also what makes the non-genome tabs work at all
    //    (see util/genomeContextQuery.js).
    //
    // The query was saved from `grid.get('query')` -- exactly what the
    // view was already running -- so round-tripping it verbatim is both
    // safer and more faithful than re-deriving it.
    var hasGenomeJoin = /(^|&)genome\(/.test(rqlQuery);
    if (!hasGenomeJoin) {
      // 1. Drop wildcard conditions like eq(genome_id,*), which exist only
      //    to give a join a positive top-level clause.
      // 2. Unwrap a query that is itself a collection wrapper.
      rqlQuery = rqlQuery
        .replace(/eq\([a-z_]+_id,\*\)&?/gi, '')
        .replace(/^&+|&+$/g, '')
        .replace(/&&+/g, '&');

      var wrapperMatch = rqlQuery.match(
        /^(genome|genome_feature|genome_sequence|sp_gene|pathway|subsystem)\((.+)\)$/i);
      if (wrapperMatch) {
        rqlQuery = wrapperMatch[2];
      }
    }

    if (rqlQuery) {
      url += '?' + rqlQuery;
    }

    // Carry the saved search's id so the view can look the rest up.
    //
    // Never the payload itself: a selection runs to tens of kilobytes of
    // ids, which no URL should hold, and the form state behind EDIT
    // SEARCH is comparable. The view resolves both from
    // SavedSearchManager, and a short id still survives bookmarking.
    //
    // Added whenever there is anything to resolve -- not just a selection.
    // Keying this on `selectedIds` alone meant a saved search with no
    // selected rows arrived with no id, so EDIT SEARCH had nothing to
    // look itself up by and stayed hidden.
    var hasSelection = !!(search.selectedIds && search.selectedIds.length);
    if (search.id && (hasSelection || search.searchFormUrl)) {
      url += '#savedSearch=' + encodeURIComponent(search.id);
    }

    return url;
  };
});
