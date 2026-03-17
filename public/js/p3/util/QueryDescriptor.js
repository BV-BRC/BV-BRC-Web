define([
  'dojo/_base/lang',
  './QueryToEnglish'
], function (
  lang,
  QueryToEnglish
) {
  /**
   * QueryDescriptor - Encapsulates query information for saved searches and downloads
   *
   * A QueryDescriptor captures all context needed to:
   * 1. Save a search for later re-execution
   * 2. Configure a download with the unified download wizard
   * 3. Share searches via workspace files
   */

  var dataTypeLabels = {
    genome: 'Genomes',
    genome_feature: 'Features',
    genome_sequence: 'Sequences',
    sp_gene: 'Specialty Genes',
    sp_gene_ref: 'Specialty Gene References',
    pathway: 'Pathways',
    subsystem: 'Subsystems',
    protein_structure: 'Protein Structures',
    epitope: 'Epitopes',
    surveillance: 'Surveillance',
    serology: 'Serology',
    transcriptomics_experiment: 'Experiments',
    transcriptomics_sample: 'Comparisons',
    transcriptomics_gene: 'Gene Expression',
    experiment: 'Experiments',
    bioset: 'Biosets',
    ppi: 'Interactions',
    genome_amr: 'AMR Phenotypes',
    protein_feature: 'Domains and Motifs',
    sequence_feature: 'Sequence Features'
  };

  // Map containerType to dataType
  var containerTypeToDataType = {
    genome_data: 'genome',
    feature_data: 'genome_feature',
    sequence_data: 'genome_sequence',
    spgene_data: 'sp_gene',
    spgene_ref_data: 'sp_gene_ref',
    pathway_data: 'pathway',
    subsystem_data: 'subsystem',
    structure_data: 'protein_structure',
    epitope_data: 'epitope',
    surveillance_data: 'surveillance',
    serology_data: 'serology',
    transcriptomics_experiment_data: 'transcriptomics_experiment',
    transcriptomics_sample_data: 'transcriptomics_sample',
    transcriptomics_gene_data: 'transcriptomics_gene',
    gene_expression_data: 'transcriptomics_gene',
    experiment_data: 'experiment',
    bioset_data: 'bioset',
    interaction_data: 'ppi',
    genome_amr_data: 'genome_amr',
    proteinFeatures_data: 'protein_feature',
    sequence_feature_data: 'sequence_feature',
    protein_data: 'genome_feature',
    specialty_genes: 'sp_gene',
    fasta_data: 'genome_feature'
  };

  /**
   * Generate a unique ID for a search
   */
  function generateId() {
    return 'search_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate a human-readable name from a query
   * @param {string} dataType - The data type
   * @param {string} rqlQuery - The RQL query string
   * @returns {string} A human-readable name
   */
  function generateName(dataType, rqlQuery) {
    var typeName = dataTypeLabels[dataType] || dataType;
    var english = '';

    // Clean up the query for display: remove wildcard conditions like eq(genome_id,*)
    var cleanedQuery = rqlQuery;
    try {
      // Remove common wildcard patterns that don't add meaning
      // Patterns: eq(field_id,*) or eq(field_id,"*") (including URL-encoded quotes)
      cleanedQuery = rqlQuery
        .replace(/eq\([a-z_]+_id,\*\)&?/gi, '')      // eq(genome_id,*)&
        .replace(/eq\([a-z_]+_id,%22\*%22\)&?/gi, '') // eq(genome_id,%22*%22)&
        .replace(/eq\([a-z_]+_id,"\*"\)&?/gi, '')    // eq(genome_id,"*")&
        .replace(/eq\([a-z_]+,\*\)&?/gi, '')         // eq(genome_id,*) without _id suffix
        .replace(/^&+|&+$/g, '')  // trim leading/trailing &
        .replace(/&&+/g, '&');     // collapse multiple &
    } catch (e) {
      // If cleanup fails, use original
      cleanedQuery = rqlQuery;
    }

    try {
      // Use QueryToEnglish if available, with plain text output
      if (QueryToEnglish && QueryToEnglish.toPlainText) {
        english = QueryToEnglish.toPlainText(cleanedQuery);
      } else if (QueryToEnglish) {
        // Fall back to HTML version and strip tags
        var html = QueryToEnglish(cleanedQuery);
        if (html) {
          english = html.replace(/<[^>]*>/g, '').trim();
        }
      }
    } catch (e) {
      console.warn('QueryDescriptor: Failed to generate English from query:', e);
    }

    if (!english || english === 'undefined') {
      // Fall back to truncated query
      english = rqlQuery.length > 50 ? rqlQuery.substr(0, 50) + '...' : rqlQuery;
    }

    // Truncate if too long (increased limit for better readability)
    if (english.length > 80) {
      english = english.substr(0, 77) + '...';
    }

    return typeName + ': ' + english;
  }

  /**
   * Extract visible columns from a grid in display order
   * @param {Object} grid - A dgrid instance with columns
   * @returns {Array} Array of {field, label} objects for visible columns
   */
  function extractVisibleColumns(grid) {
    if (!grid || !grid.columns) {
      return [];
    }

    var columns = grid.columns;
    var visibleColumns = [];
    var columnKeys = Object.keys(columns);

    columnKeys.forEach(function (key) {
      var col = columns[key];

      // Skip hidden columns
      if (col.hidden) {
        return;
      }

      // Skip special columns (selection checkboxes, etc.)
      if (col.unhidable && key === 'Selection Checkboxes') {
        return;
      }

      // Get field name - use explicit field property or fall back to key
      var field = col.field || key;

      // Skip internal columns
      if (field === 'public' || field === 'Selection Checkboxes') {
        return;
      }

      visibleColumns.push({
        field: field,
        label: col.label || field
      });
    });

    return visibleColumns;
  }

  /**
   * Extract all available columns from a grid
   * @param {Object} grid - A dgrid instance with columns
   * @returns {Array} Array of {field, label, group} objects for all columns
   */
  function extractAllColumns(grid) {
    if (!grid || !grid.columns) {
      return [];
    }

    var columns = grid.columns;
    var allColumns = [];
    var columnKeys = Object.keys(columns);

    columnKeys.forEach(function (key) {
      var col = columns[key];

      // Skip special columns (selection checkboxes, etc.)
      if (col.unhidable && key === 'Selection Checkboxes') {
        return;
      }

      // Get field name - use explicit field property or fall back to key
      var field = col.field || key;

      // Skip internal columns
      if (field === 'public' || field === 'Selection Checkboxes') {
        return;
      }

      var colInfo = {
        field: field,
        label: col.label || field
      };

      // Include group if present (useful for organizing in download UI)
      if (col.group) {
        colInfo.group = col.group;
      }

      allColumns.push(colInfo);
    });

    return allColumns;
  }

  return {
    /**
     * Data type label mappings
     */
    dataTypeLabels: dataTypeLabels,

    /**
     * Container type to data type mappings
     */
    containerTypeToDataType: containerTypeToDataType,

    /**
     * Create a new QueryDescriptor
     * @param {Object} options - Configuration options
     * @param {string} options.dataType - Primary data type (e.g., 'genome', 'genome_feature')
     * @param {string} options.rqlQuery - Full RQL query string
     * @param {string} [options.name] - User-provided name (auto-generated if not provided)
     * @param {string} [options.description] - Optional description/notes
     * @param {string} [options.baseQuery] - Type prefix for joining
     * @param {string} [options.source] - Where the query was created (e.g., 'advanced_search')
     * @param {Object} [options.downloadConfig] - Saved download preferences
     * @param {number} [options.resultCount] - Cached result count
     * @returns {Object} A new QueryDescriptor object
     */
    create: function (options) {
      if (!options.dataType || !options.rqlQuery) {
        throw new Error('QueryDescriptor.create requires dataType and rqlQuery');
      }

      var descriptor = {
        // Core identity
        id: options.id || generateId(),
        name: options.name || generateName(options.dataType, options.rqlQuery),
        description: options.description || '',

        // Query definition
        dataType: options.dataType,
        rqlQuery: options.rqlQuery,
        baseQuery: options.baseQuery || '',

        // Display (generated lazily if needed)
        displayQuery: options.displayQuery || '',

        // Metadata
        source: options.source || 'unknown',
        created: options.created || Date.now(),
        lastUsed: options.lastUsed || Date.now(),

        // Download configuration (user preferences)
        downloadConfig: options.downloadConfig || {
          lastUsedFormat: null,
          lastUsedRecordScope: 'all',
          fastaDefLineFields: null,
          tableColumns: null
        },

        // Cached results
        resultCount: options.resultCount || null,
        countTimestamp: options.countTimestamp || null,

        // Visible columns at time of save (user's current view)
        visibleColumns: options.visibleColumns || null,

        // All available columns for this data type
        availableColumns: options.availableColumns || null
      };

      // Generate display query if not provided
      if (!descriptor.displayQuery) {
        try {
          descriptor.displayQuery = QueryToEnglish(options.rqlQuery) || '';
        } catch (e) {
          descriptor.displayQuery = '';
        }
      }

      return descriptor;
    },

    /**
     * Create a QueryDescriptor from container type and selection
     * @param {string} containerType - The container type (e.g., 'genome_data')
     * @param {string} rqlQuery - The RQL query
     * @param {string} [source] - Source identifier
     * @returns {Object} A new QueryDescriptor
     */
    createFromContainerType: function (containerType, rqlQuery, source) {
      var dataType = containerTypeToDataType[containerType] || containerType.replace(/_data$/, '');
      return this.create({
        dataType: dataType,
        rqlQuery: rqlQuery,
        source: source || 'grid'
      });
    },

    /**
     * Create a QueryDescriptor from a grid's current state
     * @param {Object} grid - A grid widget with store and state
     * @param {string} containerType - The container type
     * @returns {Object} A new QueryDescriptor
     */
    createFromGrid: function (grid, containerType) {
      var query = '';

      // Priority order for getting the RQL query string:
      // 1. grid.query - the actual RQL string set on the grid
      // 2. grid.state.search - RQL from the grid's state
      // 3. grid.store._currentQuery - some stores cache the current query string
      // Note: grid.store.query is a FUNCTION, not the query string!
      if (grid && typeof grid.query === 'string' && grid.query) {
        query = grid.query;
      } else if (grid && grid.state && typeof grid.state.search === 'string' && grid.state.search) {
        query = grid.state.search;
      } else if (grid && grid.store && typeof grid.store._currentQuery === 'string') {
        query = grid.store._currentQuery;
      }

      // Extract columns from the grid
      var visibleColumns = extractVisibleColumns(grid);
      var availableColumns = extractAllColumns(grid);

      var dataType = containerTypeToDataType[containerType] ||
                     (containerType ? containerType.replace(/_data$/, '') : 'genome_feature');

      return this.create({
        dataType: dataType,
        rqlQuery: query,
        source: 'grid',
        visibleColumns: visibleColumns.length > 0 ? visibleColumns : null,
        availableColumns: availableColumns.length > 0 ? availableColumns : null
      });
    },

    /**
     * Validate a QueryDescriptor
     * @param {Object} descriptor - The descriptor to validate
     * @returns {boolean} True if valid
     */
    validate: function (descriptor) {
      if (!descriptor) return false;
      if (!descriptor.dataType) return false;
      if (!descriptor.rqlQuery) return false;
      if (!descriptor.id) return false;
      return true;
    },

    /**
     * Serialize a QueryDescriptor to JSON string
     * @param {Object} descriptor - The descriptor to serialize
     * @returns {string} JSON string
     */
    serialize: function (descriptor) {
      return JSON.stringify(descriptor);
    },

    /**
     * Deserialize a QueryDescriptor from JSON string
     * @param {string} json - JSON string
     * @returns {Object} QueryDescriptor object
     */
    deserialize: function (json) {
      try {
        var obj = JSON.parse(json);
        // Ensure required fields exist
        if (!obj.id) obj.id = generateId();
        if (!obj.downloadConfig) obj.downloadConfig = {};
        return obj;
      } catch (e) {
        console.error('QueryDescriptor.deserialize failed:', e);
        return null;
      }
    },

    /**
     * Clone a QueryDescriptor with a new ID
     * @param {Object} descriptor - The descriptor to clone
     * @returns {Object} A new QueryDescriptor
     */
    clone: function (descriptor) {
      var cloned = lang.clone(descriptor);
      cloned.id = generateId();
      cloned.created = Date.now();
      cloned.lastUsed = Date.now();
      return cloned;
    },

    /**
     * Update the lastUsed timestamp
     * @param {Object} descriptor - The descriptor to update
     * @returns {Object} The updated descriptor
     */
    touch: function (descriptor) {
      descriptor.lastUsed = Date.now();
      return descriptor;
    },

    /**
     * Update the result count cache
     * @param {Object} descriptor - The descriptor to update
     * @param {number} count - The result count
     * @returns {Object} The updated descriptor
     */
    updateCount: function (descriptor, count) {
      descriptor.resultCount = count;
      descriptor.countTimestamp = Date.now();
      return descriptor;
    },

    /**
     * Get the data type label for a descriptor
     * @param {Object|string} descriptorOrDataType - Descriptor object or data type string
     * @returns {string} Human-readable label
     */
    getDataTypeLabel: function (descriptorOrDataType) {
      var dataType = typeof descriptorOrDataType === 'string'
        ? descriptorOrDataType
        : descriptorOrDataType.dataType;
      return dataTypeLabels[dataType] || dataType;
    },

    /**
     * Generate a unique ID (exposed for external use)
     */
    generateId: generateId,

    /**
     * Generate a name from query (exposed for external use)
     */
    generateName: generateName
  };
});
