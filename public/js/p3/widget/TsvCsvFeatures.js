define([], function() {
    return {
        // column headers associated with features in tsv/csv files
        // columnHeaders value indicates whether 1st row in data file contains column headers
        '.annotated.tsv': {columnName: 'Gene_ID', feature: 'patric_id', columnHeaders: true},        // Variation Service
        '.all.tsv': {columnName: 'Gene_ID', feature: 'patric_id', columnHeaders: true},
        '.genesPerGenome.txt': {columnName: 'Genome', feature: 'genome_id', columnHeaders: true},    // Phylogenetic Tree Service, check this
        '.pgfamAlignmentStats.txt': {columnName: '', feature: '', columnHeaders: true},                 // check this
        '.pgfamsAndGenesIncludedInAlignment.txt': {columnName: '', feature: '', columnHeaders: false},   // check this
        '_transcripts.txt': {columnName: 'Name', feature: 'patric_id', columnHeaders: true}, // RNA-Seq Service
        '.diff': {columnName: 'gene', feature: 'patric_id', columnHeaders: true},

        // these are test cases and will need to be removed:
        '.pgfamAlignmentStats.tsv': {columnName: '', feature: '', columnHeaders: true},  //*** temporary test line */
        '_transcripts.tsv': {columnName: 'Name', feature: 'patric_id', columnHeaders: true}, // temp test
        '.pgfamAlignmentStats.tsv': {columnName: '', feature: '', columnHeaders: true},                 // check this
        '.pgfamsAndGenesIncludedInAlignment.tsv': {columnName: '', feature: '', columnHeaders: false},   // check this


    }

});