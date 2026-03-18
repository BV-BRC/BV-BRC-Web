define([], function () {
  /**
   * DownloadFormats - Centralized registry for download format definitions
   *
   * This module consolidates all download format definitions previously scattered
   * across DownloadTooltipDialog.js, AdvancedDownload.js, and various viewers.
   */

  /**
   * Format definitions
   * Each format has:
   * - label: Display name
   * - mimeType: MIME type for Accept header
   * - extension: File extension
   * - category: Category for grouping ('sequence', 'annotation', 'table', 'other')
   * - serverSide: Whether download is handled server-side (form POST) or client-side (Blob)
   * - configurable: Whether format has Step 3 configuration options
   * - configurator: Name of configurator step component (if configurable)
   */
  var formats = {
    // Table formats
    'tsv': {
      label: 'Tab-separated (TSV)',
      mimeType: 'text/tsv',
      extension: '.tsv',
      category: 'table',
      serverSide: true,
      icon: 'fa-table'
    },
    'csv': {
      label: 'Comma-separated (CSV)',
      mimeType: 'text/csv',
      extension: '.csv',
      category: 'table',
      serverSide: true,
      icon: 'fa-table'
    },
    'excel': {
      label: 'Excel Spreadsheet',
      mimeType: 'application/vnd.openxmlformats',
      extension: '.xlsx',
      category: 'table',
      serverSide: true,
      icon: 'fa-file-excel'
    },

    // Sequence formats - FASTA variants
    'dna+fasta': {
      label: 'DNA FASTA',
      mimeType: 'application/dna+fasta',
      extension: '.fna',
      category: 'sequence',
      serverSide: true,
      configurable: true,
      configurator: 'FASTAConfigurator',
      icon: 'fa-dna'
    },
    'protein+fasta': {
      label: 'Protein FASTA',
      mimeType: 'application/protein+fasta',
      extension: '.faa',
      category: 'sequence',
      serverSide: true,
      configurable: true,
      configurator: 'FASTAConfigurator',
      icon: 'fa-cubes'
    },
    'cds+fasta': {
      label: 'CDS FASTA',
      mimeType: 'application/dna+fasta',
      extension: '.ffn',
      category: 'sequence',
      serverSide: true,
      configurable: true,
      configurator: 'FASTAConfigurator',
      icon: 'fa-dna'
    },
    'rna+fasta': {
      label: 'RNA FASTA',
      mimeType: 'application/dna+fasta',
      extension: '.frn',
      category: 'sequence',
      serverSide: true,
      configurable: true,
      configurator: 'FASTAConfigurator',
      icon: 'fa-dna'
    },

    // Annotation formats
    'gff': {
      label: 'GFF3 Annotation',
      mimeType: 'text/gff3',
      extension: '.gff',
      category: 'annotation',
      serverSide: true,
      icon: 'fa-list-alt'
    },
    'features.tab': {
      label: 'Features Table',
      mimeType: 'text/tsv',
      extension: '.features.tab',
      category: 'annotation',
      serverSide: true,
      icon: 'fa-table'
    },
    'pathway.tab': {
      label: 'Pathway Table',
      mimeType: 'text/tsv',
      extension: '.pathway.tab',
      category: 'annotation',
      serverSide: true,
      icon: 'fa-route'
    },

    // Bundle format (for genomes)
    'bundle': {
      label: 'Genome Package',
      mimeType: 'application/zip',
      extension: '.zip',
      category: 'bundle',
      serverSide: true,
      configurable: true,
      configurator: 'GenomeBundleConfigurator',
      icon: 'fa-file-archive'
    }
  };

  /**
   * Category definitions with display info
   */
  var categories = {
    'sequence': {
      label: 'Sequence Data',
      description: 'Download sequences in FASTA format',
      icon: 'fa-dna',
      order: 1
    },
    'annotation': {
      label: 'Annotation Data',
      description: 'Download annotation and feature data',
      icon: 'fa-list-alt',
      order: 2
    },
    'table': {
      label: 'Results Table',
      description: 'Download tabular data',
      icon: 'fa-table',
      order: 3
    },
    'bundle': {
      label: 'Data Package',
      description: 'Download multiple files as archive',
      icon: 'fa-file-archive',
      order: 4
    },
    'other': {
      label: 'Other Formats',
      description: 'Additional download options',
      icon: 'fa-file',
      order: 5
    }
  };

  /**
   * Data type format mappings
   * Maps each data type to available formats organized by category
   */
  var dataTypeFormats = {
    'genome': {
      pk: 'genome_id',
      sortField: 'genome_id',
      bundleSupport: true,
      secondaryDataType: 'genome_sequence',
      secondaryPK: 'genome_id',
      secondarySortField: 'sequence_id',
      categories: {
        'sequence': ['dna+fasta'],
        'annotation': ['gff', 'features.tab', 'pathway.tab'],
        'table': ['tsv', 'csv', 'excel'],
        'bundle': ['bundle']
      },
      bundleTypes: [
        { label: 'Genomic Sequences in FASTA (*.fna)', type: 'fna', skipAnnotation: true },
        { label: 'Protein Sequences in FASTA (*.faa)', type: 'faa' },
        { label: 'Genomic features in GFF format (*.gff)', type: 'gff' },
        { label: 'Genomic features in tab-delimited format (*.features.tab)', type: 'features.tab' },
        { label: 'DNA Sequences of Protein Coding Genes (*.ffn)', type: 'ffn' },
        { label: 'DNA Sequences of RNA Coding Genes (*.frn)', type: 'frn' },
        { label: 'Pathway assignments in tab-delimited format (*.pathway.tab)', type: 'pathway.tab' }
      ]
    },

    'genome_feature': {
      pk: 'feature_id',
      sortField: 'feature_id',
      categories: {
        'sequence': ['dna+fasta', 'protein+fasta'],
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'genome_sequence': {
      pk: 'sequence_id',
      sortField: 'sequence_id',
      categories: {
        'sequence': ['dna+fasta'],
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'sp_gene': {
      pk: 'id',
      sortField: 'id',
      secondaryDataType: 'genome_feature',
      secondaryPK: 'feature_id',
      categories: {
        'sequence': ['dna+fasta', 'protein+fasta'],
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'sp_gene_ref': {
      pk: 'id',
      sortField: 'id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'pathway': {
      pk: 'pathway_id',
      sortField: 'pathway_id',
      clientSideGenerate: true,
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'subsystem': {
      pk: 'feature_id',
      sortField: 'subsystem_id',
      clientSideGenerate: true,
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'protein_structure': {
      pk: 'pdb_id',
      sortField: 'pdb_id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'epitope': {
      pk: 'epitope_id',
      sortField: 'epitope_id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'surveillance': {
      pk: 'id',
      sortField: 'id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'serology': {
      pk: 'id',
      sortField: 'id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'transcriptomics_experiment': {
      pk: 'eid',
      sortField: 'eid',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'transcriptomics_sample': {
      pk: 'pid',
      sortField: 'pid',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'transcriptomics_gene': {
      pk: 'id',
      sortField: 'id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'experiment': {
      pk: 'exp_id',
      sortField: 'exp_id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'bioset': {
      pk: 'bioset_id',
      sortField: 'bioset_id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'ppi': {
      pk: 'id',
      sortField: 'id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'genome_amr': {
      pk: 'id',
      sortField: 'id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'protein_feature': {
      pk: 'id',
      sortField: 'id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    },

    'sequence_feature': {
      pk: 'id',
      sortField: 'id',
      categories: {
        'table': ['tsv', 'csv', 'excel']
      }
    }
  };

  /**
   * Container type to data type mapping
   */
  var containerTypeToDataType = {
    'genome_data': 'genome',
    'feature_data': 'genome_feature',
    'sequence_data': 'genome_sequence',
    'spgene_data': 'sp_gene',
    'spgene_ref_data': 'sp_gene_ref',
    'pathway_data': 'pathway',
    'subsystem_data': 'subsystem',
    'structure_data': 'protein_structure',
    'epitope_data': 'epitope',
    'surveillance_data': 'surveillance',
    'serology_data': 'serology',
    'transcriptomics_experiment_data': 'transcriptomics_experiment',
    'transcriptomics_sample_data': 'transcriptomics_sample',
    'transcriptomics_gene_data': 'transcriptomics_gene',
    'gene_expression_data': 'transcriptomics_gene',
    'experiment_data': 'experiment',
    'bioset_data': 'bioset',
    'interaction_data': 'ppi',
    'genome_amr_data': 'genome_amr',
    'proteinFeatures_data': 'protein_feature',
    'sequence_feature_data': 'sequence_feature',
    'protein_data': 'genome_feature',
    'specialty_genes': 'sp_gene',
    'fasta_data': 'genome_feature'
  };

  return {
    /**
     * Get all format definitions
     */
    formats: formats,

    /**
     * Get all category definitions
     */
    categories: categories,

    /**
     * Get all data type format mappings
     */
    dataTypeFormats: dataTypeFormats,

    /**
     * Get format info by format ID
     * @param {string} formatId - Format identifier (e.g., 'tsv', 'dna+fasta')
     * @returns {Object|null} Format definition or null
     */
    getFormat: function (formatId) {
      return formats[formatId] || null;
    },

    /**
     * Get available formats for a data type
     * @param {string} dataType - Data type (e.g., 'genome', 'genome_feature')
     * @returns {Object} Object with categories as keys and format arrays as values
     */
    getFormatsForDataType: function (dataType) {
      var config = dataTypeFormats[dataType];
      if (!config) {
        // Default to table formats only
        return {
          'table': ['tsv', 'csv', 'excel']
        };
      }
      return config.categories;
    },

    /**
     * Get formats for a data type as a flat array
     * @param {string} dataType - Data type
     * @returns {Array} Array of format IDs
     */
    getFormatList: function (dataType) {
      var categorized = this.getFormatsForDataType(dataType);
      var result = [];
      Object.keys(categorized).forEach(function (cat) {
        result = result.concat(categorized[cat]);
      });
      return result;
    },

    /**
     * Get formats organized by category with full format info
     * @param {string} dataType - Data type
     * @returns {Array} Array of category objects with formats
     */
    getFormatsGroupedByCategory: function (dataType) {
      var self = this;
      var categorized = this.getFormatsForDataType(dataType);
      var result = [];

      // Sort categories by order
      var sortedCats = Object.keys(categorized).sort(function (a, b) {
        var orderA = (categories[a] || {}).order || 99;
        var orderB = (categories[b] || {}).order || 99;
        return orderA - orderB;
      });

      sortedCats.forEach(function (catId) {
        var catInfo = categories[catId] || { label: catId, icon: 'fa-file' };
        var formatIds = categorized[catId];

        var categoryFormats = formatIds.map(function (fId) {
          var f = formats[fId] || { label: fId };
          return {
            id: fId,
            label: f.label,
            icon: f.icon,
            extension: f.extension,
            configurable: f.configurable || false
          };
        });

        result.push({
          id: catId,
          label: catInfo.label,
          description: catInfo.description,
          icon: catInfo.icon,
          formats: categoryFormats
        });
      });

      return result;
    },

    /**
     * Get data type config
     * @param {string} dataType - Data type
     * @returns {Object} Data type configuration
     */
    getDataTypeConfig: function (dataType) {
      return dataTypeFormats[dataType] || {
        pk: 'id',
        sortField: 'id',
        categories: { 'table': ['tsv', 'csv', 'excel'] }
      };
    },

    /**
     * Convert container type to data type
     * @param {string} containerType - Container type (e.g., 'genome_data')
     * @returns {string} Data type
     */
    containerTypeToDataType: function (containerType) {
      return containerTypeToDataType[containerType] || containerType.replace(/_data$/, '');
    },

    /**
     * Check if a data type supports sequence downloads
     * @param {string} dataType - Data type
     * @returns {boolean}
     */
    hasSequenceFormats: function (dataType) {
      var config = dataTypeFormats[dataType];
      return config && config.categories && config.categories.sequence;
    },

    /**
     * Check if a data type supports bundle downloads
     * @param {string} dataType - Data type
     * @returns {boolean}
     */
    hasBundleSupport: function (dataType) {
      var config = dataTypeFormats[dataType];
      return config && config.bundleSupport;
    },

    /**
     * Get bundle types for a data type (for AdvancedDownload-style bundle selection)
     * @param {string} dataType - Data type
     * @returns {Array} Array of bundle type definitions
     */
    getBundleTypes: function (dataType) {
      var config = dataTypeFormats[dataType];
      return (config && config.bundleTypes) || [];
    },

    /**
     * Get MIME type for Accept header
     * @param {string} formatId - Format ID
     * @returns {string} MIME type
     */
    getMimeType: function (formatId) {
      var format = formats[formatId];
      if (!format) {
        switch (formatId) {
          case 'csv': return 'text/csv';
          case 'tsv': return 'text/tsv';
          case 'excel': return 'application/vnd.openxmlformats';
          default: return 'application/' + formatId;
        }
      }
      return format.mimeType;
    },

    /**
     * Get file extension for a format
     * @param {string} formatId - Format ID
     * @returns {string} File extension including dot
     */
    getExtension: function (formatId) {
      var format = formats[formatId];
      return format ? format.extension : '.' + formatId;
    },

    /**
     * Check if format requires server-side download
     * @param {string} formatId - Format ID
     * @returns {boolean}
     */
    isServerSide: function (formatId) {
      var format = formats[formatId];
      return format ? format.serverSide !== false : true;
    },

    /**
     * Check if format is configurable (has Step 3 options)
     * @param {string} formatId - Format ID
     * @returns {boolean}
     */
    isConfigurable: function (formatId) {
      var format = formats[formatId];
      return format && format.configurable;
    },

    /**
     * Get configurator component name for a format
     * @param {string} formatId - Format ID
     * @returns {string|null} Configurator name or null
     */
    getConfigurator: function (formatId) {
      var format = formats[formatId];
      return format ? format.configurator : null;
    }
  };
});
