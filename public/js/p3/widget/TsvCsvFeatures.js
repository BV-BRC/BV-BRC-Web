define([], function() {
    return {
        // column headers associated with features in tsv/csv files
        // columnHeaders value indicates whether 1st row in data file contains column headers
        '.annotated.tsv': {columnName: 'Gene_ID', feature: 'patric_id', columnHeaders: true},        // Variation Service
        '.all.tsv': {columnName: 'Gene_ID', feature: 'patric_id', columnHeaders: true},
        '.genesPerGenome.txt': {columnName: 'Genome', feature: 'genome_id', columnHeaders: true},    // Phylogenetic Tree Service, check this
        '.pgfamAlignmentStats.txt': {columnName: '', feature: '', columnHeaders: true},                 // check this
        '.pgfamsAndGenesIncludedInAlignment.txt': {columnName: '', feature: '', columnHeaders: false},   // check this
        '.stats.txt': {columnName: '', feature: '', columnHeaders: false},                    // Metagenomic Binning Service
        '_transcripts.txt': {columnName: 'Name', feature: 'patric_id', columnHeaders: true}, // RNA-Seq Service
        '.diff': {columnName: 'gene', feature: 'patric_id', columnHeaders: true},

        '.pgfamAlignmentStats.tsv': {columnName: '', feature: '', columnHeaders: true},  //*** temporary test line */
        '_transcripts.tsv': {columnName: 'Name', feature: 'patric_id', columnHeaders: true}, // temp test

    }

});