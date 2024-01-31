define([], function () {
  return {
    // column headers associated with features in tsv/csv files
    // columnHeaders value indicates whether 1st row in data file contains column headers
    // keys are used by tsv/csv reader to determine if file type should be treated as tsv even though it is typed as txt.

    // variation service
    '.annotated.tsv': { columnHeaders: true },
    '.all.tsv': { columnHeaders: true },
    '.var.tsv': { columnHeaders: true },

    // phylogenetic tree service
    '.genesPerGenome.txt': { columnHeaders: true },
    '.pgfamAlignmentStats.txt': { columnHeaders: true },
    '.pgfamsAndGenesIncludedInAlignment.txt': { columnHeaders: false },

    // RNA-Seq Service
    '_transcripts.txt': { columnHeaders: true },
    '.diff': { columnHeaders: true },
    '.gene_counts': { columnHeaders: true },
    '.deseq2': { columnHeaders: true },

    // MSA/SNP service
    '.snp.tsv': { columnHeaders: true },

    // MetaCATS service
    '-mcTable.tsv': { columnHeaders: true },
    '-chisqTable.tsv': { columnHeaders: true },

    // RNA-Seq service
    'deseq2.tsv': { columnHeaders: true },
    'gene_counts.tsv': { columnHeaders: true },
    'tpms.tsv': { columnHeaders: true },

    // Subsystems Service
    '_subsystems.tsv': { columnHeaders: true },
    '_pathways.tsv': { columnHeaders: true },

    // Subspecies Classification Service
    'result.tsv': { columnHeaders: true },
    'input.fasta.err': { columnHeaders: true },
    'input.fasta.result': { columnHeaders: true },

    // Sequence Submission Service
    'Sequence_Validation_Report.csv': {
      columnHeaders: true,
      colSpan: {
        'Unique_Sequence_Identifier': 2,
        'Segment': 1,
        'Serotype': 1,
        'Status': 2,
        'Messages': 4
      }
    },

    // HA Subtype Numbering Conversion Service
    'sequence_annotation.tsv': {
      columnHeaders: true,
      colSpan: {
        'QueryId': 1,
        'Virus Type': 1,
        'Segment': 1,
        'Subtype': 1,
        'Score': 1,
        'Warning Messages': 2,
        'Sequence Name': 5
      }
    },

    // CEIRR Data Submission Service
    'BVBRC_Accession_ID.csv': {
      columnHeaders: true,
      colSpan: {
        'Row': 1,
        'Sample_Identifier': 2,
        'Influenza_Test_Type': 3,
        'BVBRC_Accession_ID': 4,
        'Virus_Identifier': 4
      }
    },
    'sample_valid.csv': {columnHeaders: true},
    'sample_processed.csv': {columnHeaders: true},
    'validation_report.csv': {
      columnHeaders: true,
      colSpan: {
        'Row': 1,
        'Field': 2,
        'Value': 3,
        'Message': 10
      }
    }
  };

});
