define([], function() {
    return {
        // column headers associated with features in tsv/csv files
        // columnHeaders value indicates whether 1st row in data file contains column headers
        // keys are used by tsv/csv reader to determine if file type should be treated as tsv even though it is typed as txt.

        // variation service
        '.annotated.tsv': {columnHeaders: true},      
        '.all.tsv': {columnHeaders: true},

        // phylogenetic tree service
        '.genesPerGenome.txt': {columnHeaders: true},
        '.pgfamAlignmentStats.txt': {columnHeaders: true},      
        '.pgfamsAndGenesIncludedInAlignment.txt': {columnHeaders: false},

        // RNA-Seq Service
        '_transcripts.txt': {columnHeaders: true},
        '.diff': {columnHeaders: true},
        '.gene_counts': {columnHeaders: true},
        '.deseq2': {columnHeaders: true}
    }

});