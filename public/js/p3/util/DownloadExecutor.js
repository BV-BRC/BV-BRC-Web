define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/when',
  'dojo/request/xhr',
  'dojo/dom-construct',
  'dojo/topic',
  './DownloadFormats',
  'FileSaver'
], function (
  declare,
  lang,
  Deferred,
  when,
  xhr,
  domConstruct,
  topic,
  DownloadFormats,
  saveAs
) {
  /**
   * DownloadExecutor - Centralized download execution utility
   *
   * Handles three download strategies:
   * 1. Server-side: POST form to data API, server generates file
   * 2. Client-side: Fetch data via XHR, generate file in browser
   * 3. Bundle: Request genome package via bundler service
   *
   * Events published:
   * - /Download/started - When download begins
   * - /Download/progress - Progress updates (for client-side)
   * - /Download/completed - When download finishes
   * - /Download/error - When download fails
   */

  // Configuration
  var DATA_API_URL = window.App && window.App.dataServiceURL
    ? window.App.dataServiceURL
    : '/api/data';

  var BUNDLER_API_URL = window.App && window.App.dataServiceURL
    ? window.App.dataServiceURL.replace('/data', '/bundle')
    : '/api/bundle';

  // Maximum records for client-side download
  var CLIENT_SIDE_LIMIT = 25000;

  // Chunk size for paginated fetches
  var FETCH_CHUNK_SIZE = 5000;

  /**
   * Build RQL query string from download spec
   * @param {Object} spec - Download specification
   * @returns {string} RQL query string
   */
  function buildQuery(spec) {
    var query = '';
    var pk = spec.primaryKey || 'id';

    // Get the sort field — explicit override takes priority, then data type config
    var dataTypeConfig = DownloadFormats.getDataTypeConfig(spec.dataType);
    var sortField = spec.sortFieldOverride || dataTypeConfig.sortField || pk;

    // Handle record scope
    if (spec.scope === 'selected' && spec.selectedIds && spec.selectedIds.length > 0) {
      // For selected records, use ONLY the ID query - we know exactly which records we want
      query = 'in(' + pk + ',(' + spec.selectedIds.join(',') + '))';
    } else if (spec.scope === 'random' && spec.randomLimit) {
      // For random sampling, use the original query with a limit
      query = cleanQuery(spec.rqlQuery || '', spec.dataType);
      if (query) {
        query += '&limit(' + spec.randomLimit + ')';
      } else {
        query = 'limit(' + spec.randomLimit + ')';
      }
    } else {
      // For 'all' scope, use the cleaned original query
      query = cleanQuery(spec.rqlQuery || '', spec.dataType);
    }

    // Guard: a cross-collection join filter (e.g. genome(...)) as the SOLE top-level clause makes
    // the data API emit an empty main query (q=()) → Solr "Cannot parse '()'" (HTTP 400). This bites
    // the all-rows cross-collection prefetch, whose source query from a taxon view is just
    // "genome(and(eq(taxon_lineage_ids,…),…))". Grids avoid it by prepending a top-level term; do the
    // same here with a match-all on the primary key so the join has something to attach to.
    if (/^(?:genome|feature|genome_feature|genome_sequence)\(/.test(query)) {
      query = 'eq(' + pk + ',*)&' + query;
    }

    // IMPORTANT: The data API requires sort() and limit() clauses for downloads to work.
    // Without these, the server returns Content-Length: 0 (no results).
    // This matches the pattern used in DownloadTooltipDialog.js and other working download code.
    //
    // Build sort clause: sortField, then the primary key, then the collection's Solr
    // uniqueKey as the final tiebreaker. The uniqueKey is REQUIRED: the streaming export
    // path uses cursorMark, which Solr rejects (HTTP 400) unless the uniqueKey is part of
    // the sort. Collections whose sortField/pk are non-unique (e.g. subsystem's
    // subsystem_id, pathway's pathway_id) would otherwise fail.
    var uniqueKey = DownloadFormats.getUniqueKey(spec.dataType);
    var sortFields = [];
    [sortField, pk, uniqueKey].forEach(function (f) {
      if (f && sortFields.indexOf(f) === -1) {
        sortFields.push(f);
      }
    });
    var sortClause = 'sort(+' + sortFields.join(',+') + ')';

    if (query) {
      query += '&' + sortClause + '&limit(2500000)';
    } else {
      query = sortClause + '&limit(2500000)';
    }

    return query;
  }

  /**
   * Clean up a query to remove cross-collection join syntax and wildcards
   * @param {string} query - The original RQL query
   * @param {string} dataType - The data type being queried
   * @returns {string} Cleaned query
   */
  function cleanQuery(query, dataType) {
    if (!query) return '';

    var cleaned = query;

    // Remove eq(field_id,*) wildcard patterns - they match everything and are meaningless
    cleaned = cleaned
      .replace(/eq\([a-z_]+_id,\*\)&?/gi, '')
      .replace(/eq\([a-z_]+_id,%22\*%22\)&?/gi, '')
      .replace(/eq\([a-z_]+_id,"\*"\)&?/gi, '');

    // Remove cross-collection join syntax: genome(...), feature(...), etc.
    // These are used by grids for cross-collection queries but shouldn't be sent
    // to the target collection's endpoint
    // Pattern: collectionName(query) where collectionName is the SAME as dataType
    // e.g., if dataType is 'genome', remove 'genome(...)' wrappers
    if (dataType) {
      // Extract the inner query from dataType(...) wrappers
      var joinPattern = new RegExp(dataType + '\\(([^)]+)\\)', 'gi');
      var match = joinPattern.exec(cleaned);
      if (match) {
        // If the entire query is just a join wrapper, extract the inner part
        var inner = match[1];
        cleaned = cleaned.replace(match[0], inner);
      }
    }

    // Clean up any remaining issues
    cleaned = cleaned
      .replace(/^&+|&+$/g, '')  // trim leading/trailing &
      .replace(/&&+/g, '&');     // collapse multiple &

    return cleaned;
  }

  /**
   * Build field selection for query
   * @param {Object} spec - Download specification
   * @returns {string} Select clause or empty string
   */
  function buildSelectClause(spec) {
    if (spec.columns && spec.columns.length > 0) {
      return 'select(' + spec.columns.join(',') + ')';
    }
    return '';
  }

  /**
   * Generate filename for download
   * @param {Object} spec - Download specification
   * @returns {string} Filename
   */
  function generateFilename(spec) {
    if (spec.filename) {
      return spec.filename;
    }

    var format = DownloadFormats.getFormat(spec.format);
    var extension = format ? format.extension : '.txt';
    // Remove leading dot from extension if present (we'll add it ourselves)
    if (extension && extension.charAt(0) === '.') {
      extension = extension.substr(1);
    }
    var baseName = spec.dataType || 'data';

    // Add timestamp
    var timestamp = new Date().toISOString().slice(0, 10);

    return baseName + '_' + timestamp + '.' + extension;
  }

  /**
   * Execute server-side download via form POST
   * @param {Object} spec - Download specification
   * @returns {Deferred} Promise that resolves when download starts
   */
  /**
   * Submit a server-side download via hidden form POST
   */
  function submitDownloadForm(spec, query) {
    var format = DownloadFormats.getFormat(spec.format);
    var acceptType = format.mimeType || 'text/tsv';
    var filename = generateFilename(spec);

    var selectClause = buildSelectClause(spec);
    if (selectClause) {
      query = query ? query + '&' + selectClause : selectClause;
    }

    var actionUrl = DATA_API_URL + '/' + spec.dataType + '/';
    actionUrl += '?http_download=true';
    actionUrl += '&http_accept=' + acceptType;

    // GenBank merged mode
    if (spec.genbankMerged) {
      actionUrl += '&http_genbank_merged=true';
    }

    // FASTA header configuration via http_fasta_* query parameters.
    // Send all params when configured — empty string disables a section/prefix.
    if (spec.fastaConfig) {
      var idFields = spec.fastaConfig.idFields || [];
      var descFields = spec.fastaConfig.descriptionFields || [];
      actionUrl += '&http_fasta_id_fields=' + encodeURIComponent(idFields.join(','));
      actionUrl += '&http_fasta_id_prefix=';
      actionUrl += '&http_fasta_description_fields=' + encodeURIComponent(descFields.join(','));
      actionUrl += '&http_fasta_context_fields=';
    }

    var form = domConstruct.create('form', {
      method: 'POST',
      action: actionUrl,
      id: 'downloadForm',
      name: 'downloadForm',
      style: 'display: none;',
      enctype: 'application/x-www-form-urlencoded'
    }, document.body);

    domConstruct.create('input', {
      type: 'hidden',
      name: 'rql',
      value: encodeURIComponent(query)
    }, form);

    if (window.App && window.App.authorizationToken) {
      domConstruct.create('input', {
        type: 'hidden',
        name: 'http_authorization',
        value: window.App.authorizationToken
      }, form);
    }

    form.submit();

    topic.publish('/Download/started', {
      type: 'server-side',
      spec: spec,
      filename: filename
    });

    return { success: true, filename: filename, method: 'server-side' };
  }

  function executeServerSideDownload(spec) {
    var deferred = new Deferred();

    try {
      var format = DownloadFormats.getFormat(spec.format);
      if (!format) {
        deferred.reject(new Error('Unknown format: ' + spec.format));
        return deferred;
      }

      // Cross-collection download: the format targets a different collection than the
      // source grid. Fetch linking IDs from the source, then download from the target.
      //
      // In 'selected' scope the wizard has already resolved the target linkField values
      // from the selected grid rows (which carry the linkField directly), so selectedIds
      // are the TARGET collection's key values and we query it directly — no prefetch.
      // Only 'all'/'random' scope needs to derive the linkField set from the source query.
      if (spec.sourceDataType && spec.linkField && spec.scope !== 'selected') {
        var sourceQuery = buildQuery({
          dataType: spec.sourceDataType,
          rqlQuery: spec.rqlQuery,
          primaryKey: spec.sourcePrimaryKey || 'id',
          scope: 'all',
          format: spec.format
        });
        sourceQuery += '&select(' + spec.linkField + ')';

        var sourceUrl = DATA_API_URL + '/' + spec.sourceDataType + '/';
        var headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded'
        };
        if (window.App && window.App.authorizationToken) {
          headers['Authorization'] = window.App.authorizationToken;
        }

        xhr.post(sourceUrl, {
          data: sourceQuery,
          headers: headers,
          handleAs: 'json',
          timeout: 120000
        }).then(function (data) {
          var linkIds = data.map(function (item) {
            return item[spec.linkField];
          }).filter(function (id) { return id; });

          if (linkIds.length === 0) {
            deferred.reject(new Error('No matching records found'));
            return;
          }

          // Build download query against the target collection
          var targetSpec = lang.mixin({}, spec, {
            scope: 'selected',
            selectedIds: linkIds,
            primaryKey: spec.linkField
          });
          if (spec.targetSortField) {
            targetSpec.sortFieldOverride = spec.targetSortField;
          }
          var query = buildQuery(targetSpec);
          deferred.resolve(submitDownloadForm(spec, query));
        }, function (err) {
          deferred.reject(err);
        });

        return deferred;
      }

      var query = buildQuery(spec);
      deferred.resolve(submitDownloadForm(spec, query));

    } catch (err) {
      deferred.reject(err);
    }

    return deferred;
  }

  /**
   * Execute client-side download via XHR + FileSaver
   * @param {Object} spec - Download specification
   * @param {Function} progressCallback - Optional progress callback
   * @returns {Deferred} Promise that resolves when download completes
   */
  function executeClientSideDownload(spec, progressCallback) {
    var deferred = new Deferred();

    var format = DownloadFormats.getFormat(spec.format);
    if (!format) {
      deferred.reject(new Error('Unknown format: ' + spec.format));
      return deferred;
    }

    var query = buildQuery(spec);
    var selectClause = buildSelectClause(spec);
    if (selectClause) {
      query = query ? query + '&' + selectClause : selectClause;
    }

    var acceptType = format.mimeType || 'text/plain';
    var filename = generateFilename(spec);

    // Build request headers
    var requestHeaders = {
      'Accept': acceptType,
      'Content-Type': 'application/rqlquery+x-www-form-urlencoded'
    };

    if (window.App && window.App.authorizationToken) {
      requestHeaders['Authorization'] = window.App.authorizationToken;
    }

    // FASTA header configuration — send all params when configured
    if (spec.fastaConfig) {
      var idFields = spec.fastaConfig.idFields || [];
      var descFields = spec.fastaConfig.descriptionFields || [];
      query += '&http_fasta_id_fields=' + encodeURIComponent(idFields.join(','));
      query += '&http_fasta_id_prefix=';
      query += '&http_fasta_description_fields=' + encodeURIComponent(descFields.join(','));
      query += '&http_fasta_context_fields=';
    }

    topic.publish('/Download/started', {
      type: 'client-side',
      spec: spec,
      filename: filename
    });

    xhr.post(DATA_API_URL + '/' + spec.dataType + '/', {
      data: query,
      headers: requestHeaders,
      handleAs: 'text',
      timeout: 300000 // 5 minute timeout
    }).then(function (data) {
      try {
        var blob = new Blob([data], { type: acceptType });
        saveAs(blob, filename);

        topic.publish('/Download/completed', {
          type: 'client-side',
          spec: spec,
          filename: filename,
          size: blob.size
        });

        deferred.resolve({
          success: true,
          filename: filename,
          method: 'client-side',
          size: blob.size
        });
      } catch (err) {
        deferred.reject(err);
      }
    }, function (err) {
      topic.publish('/Download/error', {
        type: 'client-side',
        spec: spec,
        error: err
      });
      deferred.reject(err);
    });

    return deferred;
  }

  /**
   * Execute genome bundle download
   * @param {Object} spec - Download specification
   * @returns {Deferred} Promise that resolves when bundle is requested
   */
  function executeBundleDownload(spec) {
    var deferred = new Deferred();

    if (!spec.bundleConfig) {
      deferred.reject(new Error('Bundle configuration required'));
      return deferred;
    }

    var query = buildQuery(spec);

    // Build bundle request
    var bundleRequest = {
      dataType: spec.dataType,
      query: query,
      types: spec.bundleConfig.fileTypes || [],
      archiveType: spec.bundleConfig.archiveType || 'zip'
    };

    // Add annotation type if specified
    if (spec.bundleConfig.annotationType) {
      bundleRequest.annotationType = spec.bundleConfig.annotationType;
    }

    // Build request headers
    var requestHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (window.App && window.App.authorizationToken) {
      requestHeaders['Authorization'] = window.App.authorizationToken;
    }

    topic.publish('/Download/started', {
      type: 'bundle',
      spec: spec
    });

    xhr.post(BUNDLER_API_URL + '/genome/', {
      data: JSON.stringify(bundleRequest),
      headers: requestHeaders,
      handleAs: 'json',
      timeout: 60000 // 1 minute timeout for job submission
    }).then(function (response) {
      // Bundle service returns a job ID or direct download link
      if (response.downloadUrl) {
        // Direct download available
        window.location.href = response.downloadUrl;

        topic.publish('/Download/completed', {
          type: 'bundle',
          spec: spec,
          downloadUrl: response.downloadUrl
        });

        deferred.resolve({
          success: true,
          method: 'bundle-direct',
          downloadUrl: response.downloadUrl
        });
      } else if (response.jobId) {
        // Async job submitted
        topic.publish('/Download/jobSubmitted', {
          type: 'bundle',
          spec: spec,
          jobId: response.jobId
        });

        deferred.resolve({
          success: true,
          method: 'bundle-async',
          jobId: response.jobId,
          message: 'Bundle job submitted. You will be notified when ready.'
        });
      } else {
        deferred.reject(new Error('Invalid bundle service response'));
      }
    }, function (err) {
      topic.publish('/Download/error', {
        type: 'bundle',
        spec: spec,
        error: err
      });
      deferred.reject(err);
    });

    return deferred;
  }

  /**
   * Execute chunked download for large datasets
   * @param {Object} spec - Download specification
   * @param {Function} progressCallback - Progress callback
   * @returns {Deferred} Promise
   */
  function executeChunkedDownload(spec, progressCallback) {
    var deferred = new Deferred();

    var format = DownloadFormats.getFormat(spec.format);
    if (!format) {
      deferred.reject(new Error('Unknown format: ' + spec.format));
      return deferred;
    }

    // For chunked downloads, we need to know total count first
    var totalCount = spec.totalCount || 0;
    if (!totalCount) {
      deferred.reject(new Error('Total count required for chunked download'));
      return deferred;
    }

    var chunks = Math.ceil(totalCount / FETCH_CHUNK_SIZE);
    var allData = [];
    var completed = 0;

    var query = buildQuery(spec);
    var selectClause = buildSelectClause(spec);
    if (selectClause) {
      query = query ? query + '&' + selectClause : selectClause;
    }

    var acceptType = 'application/json'; // Fetch as JSON for chunking
    var filename = generateFilename(spec);

    var requestHeaders = {
      'Accept': acceptType,
      'Content-Type': 'application/rqlquery+x-www-form-urlencoded'
    };

    if (window.App && window.App.authorizationToken) {
      requestHeaders['Authorization'] = window.App.authorizationToken;
    }

    topic.publish('/Download/started', {
      type: 'chunked',
      spec: spec,
      filename: filename,
      totalChunks: chunks
    });

    function fetchChunk(chunkIndex) {
      var offset = chunkIndex * FETCH_CHUNK_SIZE;
      var chunkQuery = query + '&limit(' + FETCH_CHUNK_SIZE + ',' + offset + ')';

      return xhr.post(DATA_API_URL + '/' + spec.dataType + '/', {
        data: chunkQuery,
        headers: requestHeaders,
        handleAs: 'json',
        timeout: 120000
      }).then(function (data) {
        allData = allData.concat(data);
        completed++;

        var progress = Math.round((completed / chunks) * 100);
        topic.publish('/Download/progress', {
          type: 'chunked',
          spec: spec,
          progress: progress,
          chunk: completed,
          totalChunks: chunks
        });

        if (progressCallback) {
          progressCallback(progress, completed, chunks);
        }

        if (completed < chunks) {
          return fetchChunk(chunkIndex + 1);
        }
      });
    }

    fetchChunk(0).then(function () {
      // Convert to requested format
      try {
        var output = convertToFormat(allData, spec, format);
        var blob = new Blob([output], { type: format.mimeType || 'text/plain' });
        saveAs(blob, filename);

        topic.publish('/Download/completed', {
          type: 'chunked',
          spec: spec,
          filename: filename,
          size: blob.size,
          recordCount: allData.length
        });

        deferred.resolve({
          success: true,
          filename: filename,
          method: 'chunked',
          size: blob.size,
          recordCount: allData.length
        });
      } catch (err) {
        deferred.reject(err);
      }
    }, function (err) {
      topic.publish('/Download/error', {
        type: 'chunked',
        spec: spec,
        error: err
      });
      deferred.reject(err);
    });

    return deferred;
  }

  /**
   * Convert JSON data to requested format
   * @param {Array} data - Array of records
   * @param {Object} spec - Download specification
   * @param {Object} format - Format definition
   * @returns {string} Formatted output
   */
  function convertToFormat(data, spec, format) {
    if (data.length === 0) {
      return '';
    }

    var columns = spec.columns || Object.keys(data[0]);

    switch (format.category) {
      case 'tabular':
        return convertToTabular(data, columns, format);
      case 'fasta':
        return convertToFasta(data, spec);
      case 'json':
        return JSON.stringify(data, null, 2);
      default:
        return convertToTabular(data, columns, format);
    }
  }

  /**
   * Convert data to tabular format (TSV/CSV)
   * @param {Array} data - Array of records
   * @param {Array} columns - Column names
   * @param {Object} format - Format definition
   * @returns {string} Tabular output
   */
  function convertToTabular(data, columns, format) {
    var delimiter = format.id === 'csv' ? ',' : '\t';
    var lines = [];

    // Header
    lines.push(columns.join(delimiter));

    // Data rows
    data.forEach(function (record) {
      var values = columns.map(function (col) {
        var val = record[col];
        if (val === null || val === undefined) {
          return '';
        }
        val = String(val);
        // Escape for CSV
        if (format.id === 'csv' && (val.indexOf(',') !== -1 || val.indexOf('"') !== -1)) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      });
      lines.push(values.join(delimiter));
    });

    return lines.join('\n');
  }

  /**
   * Convert data to FASTA format
   * @param {Array} data - Array of records
   * @param {Object} spec - Download specification
   * @returns {string} FASTA output
   */
  function convertToFasta(data, spec) {
    var lines = [];
    var fastaConfig = spec.fastaConfig || {};
    var idFields = fastaConfig.idFields || ['feature_id'];
    var descFields = fastaConfig.descriptionFields || [];
    var sequenceField = spec.format === 'protein+fasta' ? 'aa_sequence' : 'na_sequence';

    data.forEach(function (record) {
      var idPart = idFields.map(function (f) { return record[f] || ''; }).join('|');
      var defLine = '>' + idPart;
      if (descFields.length > 0) {
        var descPart = descFields.map(function (f) { return record[f] || ''; }).join(' ');
        defLine += ' ' + descPart;
      }
      lines.push(defLine);

      // Add sequence (wrap at 70 chars)
      var sequence = record[sequenceField] || '';
      for (var i = 0; i < sequence.length; i += 70) {
        lines.push(sequence.substr(i, 70));
      }
    });

    return lines.join('\n');
  }

  // Public API
  return {
    /**
     * Execute a download based on specification
     * @param {Object} spec - Download specification
     *   - dataType: Data type (genome, genome_feature, etc.)
     *   - format: Format ID (tsv, csv, dna+fasta, etc.)
     *   - rqlQuery: RQL query string
     *   - scope: 'all', 'selected', or 'random'
     *   - selectedIds: Array of IDs (for scope='selected')
     *   - randomLimit: Number (for scope='random')
     *   - primaryKey: Primary key field name
     *   - columns: Array of column names (for tabular)
     *   - totalCount: Total record count
     *   - filename: Optional filename override
     *   - fastaConfig: FASTA configuration { defLineFields, delimiter }
     *   - bundleConfig: Bundle configuration { fileTypes, annotationType, archiveType }
     * @param {Object} options - Execution options
     *   - forceServerSide: Always use server-side
     *   - forceClientSide: Always use client-side
     *   - progressCallback: Function(percent, current, total)
     * @returns {Deferred} Promise that resolves with download result
     */
    execute: function (spec, options) {
      options = options || {};

      var format = DownloadFormats.getFormat(spec.format);
      if (!format) {
        var deferred = new Deferred();
        deferred.reject(new Error('Unknown format: ' + spec.format));
        return deferred;
      }

      // Determine download strategy
      var isBundle = format.category === 'package' || spec.bundleConfig;
      var isLargeDataset = spec.totalCount && spec.totalCount > CLIENT_SIDE_LIMIT;
      var preferServerSide = format.serverSide !== false;

      if (isBundle) {
        return executeBundleDownload(spec);
      }

      if (options.forceClientSide) {
        if (isLargeDataset) {
          return executeChunkedDownload(spec, options.progressCallback);
        }
        return executeClientSideDownload(spec, options.progressCallback);
      }

      if (options.forceServerSide || preferServerSide) {
        return executeServerSideDownload(spec);
      }

      // Auto-select based on size
      if (isLargeDataset) {
        return executeServerSideDownload(spec);
      }

      return executeClientSideDownload(spec, options.progressCallback);
    },

    /**
     * Get estimated download size
     * @param {Object} spec - Download specification
     * @returns {Object} Size estimate { bytes, formatted }
     */
    estimateSize: function (spec) {
      var recordCount = spec.totalCount || 0;
      var columnCount = spec.columns ? spec.columns.length : 10;
      var avgFieldSize = 50; // Average bytes per field

      var bytesEstimate = recordCount * columnCount * avgFieldSize;

      return {
        bytes: bytesEstimate,
        formatted: this.formatBytes(bytesEstimate)
      };
    },

    /**
     * Format bytes to human-readable string
     * @param {number} bytes - Byte count
     * @returns {string} Formatted string (e.g., "1.5 MB")
     */
    formatBytes: function (bytes) {
      if (bytes === 0) return '0 Bytes';
      var k = 1024;
      var sizes = ['Bytes', 'KB', 'MB', 'GB'];
      var i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    /**
     * Check if format is available for data type
     * @param {string} format - Format ID
     * @param {string} dataType - Data type
     * @returns {boolean}
     */
    isFormatAvailable: function (format, dataType) {
      return DownloadFormats.isFormatAvailable(format, dataType);
    },

    /**
     * Get available formats for data type
     * @param {string} dataType - Data type
     * @returns {Array} Array of format definitions
     */
    getAvailableFormats: function (dataType) {
      return DownloadFormats.getFormatsForDataType(dataType);
    },

    // Constants
    CLIENT_SIDE_LIMIT: CLIENT_SIDE_LIMIT,
    FETCH_CHUNK_SIZE: FETCH_CHUNK_SIZE
  };
});
