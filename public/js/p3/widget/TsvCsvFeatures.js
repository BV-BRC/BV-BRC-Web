define([], function() {
    return {
        // column headers associated with features in tsv/csv files
        // columnHeaders value indicates whether 1st row in data file contains column headers
        // the following values define which buttons will be displayed in the action panel. 
        // Only the FEATURE(S) and GENE(S) buttons currently work.  (Dev:  Add other buttons?)

        // variation service
        '.annotated.tsv': {columnHeaders: true, 
                          feature: {columnName: 'Gene_ID', feature: 'patric_id'},
                          gene: {columnName: 'Gene_ID', feature: 'patric_id'}
                        },
        
        '.all.tsv': {columnHeaders: true,
                    feature: {columnName: 'Gene_ID', feature: 'patric_id'},
                    gene: {columnName: 'Gene_ID', feature: 'patric_id'}},

        // phylogenetic tree service
        '.genesPerGenome.txt': {columnHeaders: true,
                                feature: {columnName: 'Genome', feature: 'genome_id'},
                                gene: {columnName: 'Genome', feature: 'genome_id'}},

        '.pgfamAlignmentStats.txt': {columnHeaders: true},
        
        '.pgfamsAndGenesIncludedInAlignment.txt': {columnHeaders: false},

        // RNA-Seq Service
        '_transcripts.txt': {columnHeaders: true,
                            feature: {columnName: 'Name', feature: 'patric_id'},
                            gene: {columnName: 'Name', feature: 'patric_id'}},

        '.diff': {columnHeaders: true, 
                feature: {columnName: 'gene', feature: 'patric_id'},
                gene: {columnName: 'gene', feature: 'patric_id'}},

        '.gene_counts': {columnHeaders: true,
                        feature: {columnName: 'gene_id', feature: 'patric_id'},
                        gene: {columnName: 'gene_id', feature: 'patric_id'}},

        '.deseq2': {columnHeaders: true}

        // these are test cases and will need to be removed:
        /*
        '.pgfamAlignmentStats.tsv': {columnName: '', feature: '', columnHeaders: true},  
        '_transcripts.tsv': {columnName: 'Name', feature: 'patric_id', columnHeaders: true}, // temp test
        '.pgfamAlignmentStats.tsv': {columnName: '', feature: '', columnHeaders: true},                 // check this
        '.pgfamsAndGenesIncludedInAlignment.tsv': {columnName: '', feature: '', columnHeaders: false},   // check this
        'diff.tsv': {columnName: 'gene', feature: 'patric_id', columnHeaders: true},
*/

    }

});