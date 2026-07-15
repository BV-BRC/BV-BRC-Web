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
   * - category: Category for grouping ('sequence', 'accession', 'table')
   * - serverSide: Whether download is handled server-side (form POST) or client-side (Blob)
   * - configurable: Whether format has Step 3 configuration options
   * - configurator: Name of configurator step component (if configurable)
   * - limit: Optional record limit (e.g., for Excel)
   */
  var formats = {
    // Table formats
    'tsv': {
      label: 'TSV format',
      mimeType: 'text/tsv',
      extension: '.tsv',
      category: 'table',
      serverSide: true,
      icon: 'fa-table'
    },
    'csv': {
      label: 'CSV format',
      mimeType: 'text/csv',
      extension: '.csv',
      category: 'table',
      serverSide: true,
      icon: 'fa-table'
    },
    'excel': {
      label: 'Excel format',
      mimeType: 'application/vnd.openxmlformats',
      extension: '.xlsx',
      category: 'table',
      serverSide: true,
      icon: 'fa-file-excel',
      limit: 10000
    },

    // Sequence formats - FASTA variants
    'protein+fasta': {
      label: 'Protein fasta',
      mimeType: 'application/protein+fasta',
      extension: '.faa',
      category: 'sequence',
      serverSide: true,
      configurable: true,
      configurator: 'FASTAConfigurator',
      icon: 'fa-cubes'
    },
    'dna+fasta': {
      label: 'DNA fasta',
      mimeType: 'application/dna+fasta',
      extension: '.fna',
      category: 'sequence',
      serverSide: true,
      configurable: true,
      configurator: 'FASTAConfigurator',
      icon: 'fa-dna'
    },
    'protein_feature+fasta': {
      label: 'Protein feature fasta',
      mimeType: 'application/protein+fasta',
      extension: '.faa',
      category: 'sequence',
      serverSide: true,
      configurable: true,
      configurator: 'FASTAConfigurator',
      icon: 'fa-cubes'
    },
    'dna_feature+fasta': {
      label: 'DNA feature fasta',
      mimeType: 'application/dna+fasta',
      extension: '.ffn',
      category: 'sequence',
      serverSide: true,
      configurable: true,
      configurator: 'FASTAConfigurator',
      icon: 'fa-dna'
    },
    'contig_dna+fasta': {
      label: 'Contig DNA fasta',
      mimeType: 'application/dna+fasta',
      extension: '.fna',
      category: 'sequence',
      serverSide: true,
      configurable: true,
      configurator: 'FASTAConfigurator',
      icon: 'fa-dna'
    },

    // Annotation/other sequence formats
    'gff': {
      label: 'GFF',
      mimeType: 'text/gff3',
      extension: '.gff',
      category: 'sequence',
      serverSide: true,
      icon: 'fa-list-alt'
    },
    'genbank': {
      label: 'Genbank',
      mimeType: 'application/genbank',
      extension: '.gbk',
      category: 'sequence',
      serverSide: true,
      icon: 'fa-file-alt'
    },

    // Accession list formats
    'bvbrc_id': {
      label: 'BV-BRC ID',
      mimeType: 'text/tsv',
      extension: '.txt',
      category: 'accession',
      field: 'patric_id',
      serverSide: true,
      icon: 'fa-list'
    },
    'genbank_accession': {
      label: 'Genbank Accession',
      mimeType: 'text/tsv',
      extension: '.txt',
      category: 'accession',
      field: 'genbank_accessions',
      serverSide: true,
      icon: 'fa-list'
    },
    'feature_bvbrc_id': {
      label: 'Feature BV-BRC ID',
      mimeType: 'text/tsv',
      extension: '.txt',
      category: 'accession',
      field: 'patric_id',
      dataEndpoint: 'genome_feature',
      linkField: 'genome_id',
      serverSide: true,
      icon: 'fa-list'
    },
    'feature_genbank_accession': {
      label: 'Feature Genbank Accession',
      mimeType: 'text/tsv',
      extension: '.txt',
      category: 'accession',
      field: 'genbank_accessions',
      dataEndpoint: 'genome_feature',
      linkField: 'genome_id',
      serverSide: true,
      icon: 'fa-list'
    },
    'genome_bvbrc_id': {
      label: 'Genome BV-BRC ID',
      mimeType: 'text/tsv',
      extension: '.txt',
      category: 'accession',
      field: 'genome_id',
      serverSide: true,
      icon: 'fa-list'
    },
    'genome_genbank_accession': {
      label: 'Genome Genbank Accession',
      mimeType: 'text/tsv',
      extension: '.txt',
      category: 'accession',
      field: 'genbank_accessions',
      serverSide: true,
      icon: 'fa-list'
    }
  };

  /**
   * Category definitions with display info
   */
  var categories = {
    'sequence': {
      label: 'Sequence data',
      description: 'Download sequences in FASTA or annotation format',
      icon: 'fa-dna',
      order: 1
    },
    'accession': {
      label: 'Accession list',
      description: 'Download list of accession IDs',
      icon: 'fa-list',
      order: 2
    },
    'table': {
      label: 'Results table',
      description: 'Download tabular data',
      icon: 'fa-table',
      order: 3
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
      defaultFormat: 'protein_feature+fasta',
      defaultIdField: 'genome_id',
      categories: {
        'sequence': ['protein_feature+fasta', 'dna_feature+fasta', 'contig_dna+fasta', 'genbank', 'gff'],
        'accession': ['feature_bvbrc_id', 'feature_genbank_accession', 'genome_bvbrc_id', 'genome_genbank_accession'],
        'table': ['csv', 'tsv', 'excel']
      },
      formatOverrides: {
        'contig_dna+fasta': { dataEndpoint: 'genome_sequence', linkField: 'genome_id', sortField: 'sequence_id' },
        'protein_feature+fasta': { dataEndpoint: 'genome_feature', linkField: 'genome_id' },
        'dna_feature+fasta': { dataEndpoint: 'genome_feature', linkField: 'genome_id' },
        'genbank': {},
        'gff': { dataEndpoint: 'genome_feature', linkField: 'genome_id' }
      }
    },

    'genome_feature': {
      pk: 'feature_id',
      sortField: 'feature_id',
      defaultFormat: 'protein+fasta',
      defaultIdField: 'patric_id',
      categories: {
        'sequence': ['protein+fasta', 'dna+fasta', 'gff'],
        'accession': ['bvbrc_id', 'genbank_accession'],
        'table': ['csv', 'tsv', 'excel']
      }
    },

    'genome_sequence': {
      pk: 'sequence_id',
      sortField: 'sequence_id',
      defaultFormat: 'dna+fasta',
      defaultIdField: 'sequence_id',
      categories: {
        'sequence': ['dna+fasta'],
        'table': ['csv', 'tsv', 'excel']
      }
    },

    'sp_gene': {
      pk: 'id',
      sortField: 'id',
      secondaryDataType: 'genome_feature',
      secondaryPK: 'feature_id',
      defaultFormat: 'protein+fasta',
      defaultIdField: 'patric_id',
      categories: {
        'sequence': ['protein+fasta', 'dna+fasta'],
        'accession': ['bvbrc_id', 'genbank_accession'],
        'table': ['csv', 'tsv', 'excel']
      },
      formatOverrides: {
        'protein+fasta': { dataEndpoint: 'genome_feature', linkField: 'feature_id' },
        'dna+fasta': { dataEndpoint: 'genome_feature', linkField: 'feature_id' }
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
            configurable: f.configurable || false,
            limit: f.limit || null
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
     * Get format overrides for a specific data type + format combination.
     * Returns cross-collection redirect info (dataEndpoint, linkField, sortField)
     * when a format targets a different collection than the source grid.
     * @param {string} dataType - Source data type (e.g., 'genome')
     * @param {string} formatId - Format identifier (e.g., 'contig_dna+fasta')
     * @returns {Object|null} Override properties or null
     */
    getFormatOverride: function (dataType, formatId) {
      var config = dataTypeFormats[dataType];
      if (config && config.formatOverrides && config.formatOverrides[formatId]) {
        return config.formatOverrides[formatId];
      }
      return null;
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
    },

    /**
     * Get the default format for a data type
     * @param {string} dataType - Data type
     * @returns {string} Default format ID
     */
    getDefaultFormat: function (dataType) {
      var config = dataTypeFormats[dataType];
      if (config && config.defaultFormat) {
        return config.defaultFormat;
      }
      // Fallback: return first format from first category
      if (config && config.categories) {
        var cats = Object.keys(config.categories);
        if (cats.length > 0 && config.categories[cats[0]].length > 0) {
          return config.categories[cats[0]][0];
        }
      }
      return 'tsv';
    },

    /**
     * Get the default ID field for a data type (used for FASTA sequence ID)
     * @param {string} dataType - Data type
     * @returns {string} Default ID field name
     */
    getDefaultIdField: function (dataType) {
      var config = dataTypeFormats[dataType];
      if (config && config.defaultIdField) {
        return config.defaultIdField;
      }
      // Fallback to pk
      return config ? config.pk : 'id';
    },

    /**
     * Get the record limit for a format (e.g., Excel has 10,000 limit)
     * @param {string} formatId - Format ID
     * @returns {number|null} Record limit or null if unlimited
     */
    getFormatLimit: function (formatId) {
      var format = formats[formatId];
      return format ? (format.limit || null) : null;
    },

    /**
     * Check if format is a FASTA format
     * @param {string} formatId - Format ID
     * @returns {boolean}
     */
    isFastaFormat: function (formatId) {
      return formatId && formatId.indexOf('+fasta') !== -1;
    },

    /**
     * Check if format is an accession list format
     * @param {string} formatId - Format ID
     * @returns {boolean}
     */
    isAccessionFormat: function (formatId) {
      var format = formats[formatId];
      return format && format.category === 'accession';
    },

    /**
     * Check if format is a table format
     * @param {string} formatId - Format ID
     * @returns {boolean}
     */
    isTableFormat: function (formatId) {
      var format = formats[formatId];
      return format && format.category === 'table';
    }
  };
});
