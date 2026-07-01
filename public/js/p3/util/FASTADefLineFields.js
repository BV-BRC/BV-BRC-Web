define([], function () {
  /**
   * FASTADefLineFields - Registry of fields available for FASTA definition lines
   *
   * Each data type has a list of fields that can be included in FASTA headers.
   * Fields include:
   * - id: Field identifier (matches data field name)
   * - label: Human-readable label
   * - example: Example value for preview
   * - description: Optional longer description
   */

  var fieldDefinitions = {
    /**
     * Fields for genome data (genomic sequences)
     */
    genome: [
      { id: 'genome_id', label: 'Genome ID', example: '83332.12', description: 'Unique genome identifier' },
      { id: 'genome_name', label: 'Genome Name', example: 'Mycobacterium tuberculosis H37Rv', description: 'Full genome name' },
      { id: 'species', label: 'Species', example: 'Mycobacterium tuberculosis', description: 'Species name' },
      { id: 'strain', label: 'Strain', example: 'H37Rv', description: 'Strain designation' },
      { id: 'taxon_id', label: 'Taxon ID', example: '83332', description: 'NCBI Taxonomy ID' },
      { id: 'accession', label: 'Accession', example: 'GCF_000195955.2', description: 'GenBank/RefSeq accession' },
      { id: 'bioproject_accession', label: 'BioProject', example: 'PRJNA57777', description: 'BioProject accession' },
      { id: 'biosample_accession', label: 'BioSample', example: 'SAMN00000001', description: 'BioSample accession' },
      { id: 'assembly_accession', label: 'Assembly', example: 'GCA_000195955.2', description: 'Assembly accession' },
      { id: 'contigs', label: 'Contigs', example: '1', description: 'Number of contigs' },
      { id: 'genome_length', label: 'Length', example: '4411532', description: 'Total genome length' },
      { id: 'gc_content', label: 'GC Content', example: '65.6', description: 'GC content percentage' },
      { id: 'isolation_country', label: 'Country', example: 'USA', description: 'Isolation country' },
      { id: 'collection_date', label: 'Collection Date', example: '2020-01-15', description: 'Collection date' },
      { id: 'host_name', label: 'Host', example: 'Homo sapiens', description: 'Host organism' },
      { id: 'isolation_source', label: 'Isolation Source', example: 'sputum', description: 'Isolation source' },
      { id: 'geographic_location', label: 'Location', example: 'North America', description: 'Geographic location' }
    ],

    /**
     * Fields for genome sequences (contigs/chromosomes)
     */
    genome_sequence: [
      { id: 'sequence_id', label: 'Sequence ID', example: '83332.12.con.0001', description: 'Unique sequence identifier' },
      { id: 'accession', label: 'Accession', example: 'NC_000962.3', description: 'Sequence accession' },
      { id: 'description', label: 'Description', example: 'chromosome', description: 'Sequence description' },
      { id: 'sequence_type', label: 'Type', example: 'chromosome', description: 'Sequence type' },
      { id: 'topology', label: 'Topology', example: 'circular', description: 'Sequence topology' },
      { id: 'length', label: 'Length', example: '4411532', description: 'Sequence length' },
      { id: 'gc_content', label: 'GC Content', example: '65.6', description: 'GC content percentage' },
      { id: 'genome_id', label: 'Genome ID', example: '83332.12', description: 'Parent genome ID' },
      { id: 'genome_name', label: 'Genome Name', example: 'Mycobacterium tuberculosis H37Rv', description: 'Parent genome name' }
    ],

    /**
     * Fields for genome features (genes, CDS, RNA)
     */
    genome_feature: [
      { id: 'feature_id', label: 'Feature ID', example: 'fig|83332.12.peg.1', description: 'Unique feature identifier' },
      { id: 'patric_id', label: 'BV-BRC ID', example: 'fig|83332.12.peg.1', description: 'BV-BRC feature ID' },
      { id: 'refseq_locus_tag', label: 'Locus Tag', example: 'Rv0001', description: 'RefSeq locus tag' },
      { id: 'gene', label: 'Gene Symbol', example: 'dnaA', description: 'Gene symbol' },
      { id: 'product', label: 'Product', example: 'chromosomal replication initiator protein DnaA', description: 'Product name' },
      { id: 'accession', label: 'Accession', example: 'NC_000962.3', description: 'Sequence accession' },
      { id: 'start', label: 'Start', example: '1', description: 'Start position' },
      { id: 'end', label: 'End', example: '1524', description: 'End position' },
      { id: 'strand', label: 'Strand', example: '+', description: 'Strand (+/-)' },
      { id: 'feature_type', label: 'Feature Type', example: 'CDS', description: 'Feature type' },
      { id: 'aa_length', label: 'AA Length', example: '507', description: 'Amino acid length' },
      { id: 'na_length', label: 'NA Length', example: '1524', description: 'Nucleotide length' },
      { id: 'protein_id', label: 'Protein ID', example: 'NP_214515.1', description: 'Protein accession' },
      { id: 'genome_id', label: 'Genome ID', example: '83332.12', description: 'Parent genome ID' },
      { id: 'genome_name', label: 'Genome Name', example: 'Mycobacterium tuberculosis H37Rv', description: 'Parent genome name' },
      { id: 'taxon_id', label: 'Taxon ID', example: '83332', description: 'NCBI Taxonomy ID' },
      { id: 'figfam_id', label: 'FIGfam', example: 'FIG00000001', description: 'FIGfam ID' },
      { id: 'pgfam_id', label: 'PATRIC Global Family', example: 'PGF_00000001', description: 'PATRIC global family ID' },
      { id: 'plfam_id', label: 'PATRIC Local Family', example: 'PLF_83332_00000001', description: 'PATRIC local family ID' },
      { id: 'go', label: 'GO Terms', example: 'GO:0006270', description: 'Gene Ontology terms' },
      { id: 'ec', label: 'EC Number', example: '3.6.4.-', description: 'Enzyme Commission number' }
    ],

    /**
     * Fields for specialty genes
     */
    sp_gene: [
      { id: 'feature_id', label: 'Feature ID', example: 'fig|83332.12.peg.1', description: 'Feature identifier' },
      { id: 'patric_id', label: 'BV-BRC ID', example: 'fig|83332.12.peg.1', description: 'BV-BRC feature ID' },
      { id: 'gene', label: 'Gene Symbol', example: 'katG', description: 'Gene symbol' },
      { id: 'product', label: 'Product', example: 'catalase-peroxidase', description: 'Product name' },
      { id: 'property', label: 'Property', example: 'Antibiotic Resistance', description: 'Specialty gene property' },
      { id: 'source', label: 'Source', example: 'CARD', description: 'Data source' },
      { id: 'evidence', label: 'Evidence', example: 'Literature', description: 'Evidence type' },
      { id: 'genome_id', label: 'Genome ID', example: '83332.12', description: 'Parent genome ID' },
      { id: 'genome_name', label: 'Genome Name', example: 'Mycobacterium tuberculosis H37Rv', description: 'Parent genome name' }
    ]
  };

  /**
   * Default fields for each data type (used when "Use Default" is selected)
   */
  var defaultFields = {
    genome: ['genome_id', 'genome_name'],
    genome_sequence: ['sequence_id', 'accession', 'description'],
    genome_feature: ['feature_id', 'gene', 'product', 'genome_name'],
    sp_gene: ['feature_id', 'gene', 'product', 'property']
  };

  return {
    /**
     * Get available fields for a data type
     * @param {string} dataType - Data type (e.g., 'genome', 'genome_feature')
     * @returns {Array} Array of field definitions
     */
    getFields: function (dataType) {
      return fieldDefinitions[dataType] || fieldDefinitions['genome_feature'];
    },

    /**
     * Get default fields for a data type
     * @param {string} dataType - Data type
     * @returns {Array} Array of default field IDs
     */
    getDefaultFields: function (dataType) {
      return defaultFields[dataType] || defaultFields['genome_feature'];
    },

    /**
     * Get field info by ID
     * @param {string} dataType - Data type
     * @param {string} fieldId - Field ID
     * @returns {Object|null} Field definition or null
     */
    getField: function (dataType, fieldId) {
      var fields = this.getFields(dataType);
      for (var i = 0; i < fields.length; i++) {
        if (fields[i].id === fieldId) {
          return fields[i];
        }
      }
      return null;
    },

    /**
     * Format a definition line preview
     * @param {string} dataType - Data type
     * @param {Array} fieldIds - Array of field IDs to include
     * @param {string} delimiter - Delimiter between fields (default: '|')
     * @returns {string} Formatted preview string
     */
    formatPreview: function (dataType, fieldIds, delimiter) {
      var self = this;
      delimiter = delimiter || '|';

      if (!fieldIds || fieldIds.length === 0) {
        return '>(no fields selected)';
      }

      var parts = fieldIds.map(function (fieldId) {
        var field = self.getField(dataType, fieldId);
        return field ? field.example : fieldId;
      });

      return '>' + parts.join(delimiter);
    },

    /**
     * Get all data types that have field definitions
     * @returns {Array} Array of data type names
     */
    getAvailableDataTypes: function () {
      return Object.keys(fieldDefinitions);
    },

    /**
     * Check if a data type has field definitions
     * @param {string} dataType - Data type
     * @returns {boolean}
     */
    hasFields: function (dataType) {
      return !!fieldDefinitions[dataType];
    }
  };
});
