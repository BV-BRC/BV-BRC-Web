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

    // Get the sort field from data type config (matches the pattern in DownloadTooltipDialog.js)
    var dataTypeConfig = DownloadFormats.getDataTypeConfig(spec.dataType);
    var sortField = dataTypeConfig.sortField || pk;

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

    // IMPORTANT: The data API requires sort() and limit() clauses for downloads to work.
    // Without these, the server returns Content-Length: 0 (no results).
    // This matches the pattern used in DownloadTooltipDialog.js and other working download code.
    //
    // Build sort clause: use sortField, and if it's different from the primary key,
    // add the primary key as a secondary sort to ensure deterministic ordering.
    var sortClause = 'sort(+' + sortField;
    if (sortField !== pk) {
      sortClause += ',+' + pk;
    }
    sortClause += ')';

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
  function executeServerSideDownload(spec) {
    var deferred = new Deferred();

    console.log('executeServerSideDownload: spec =', spec);

    try {
      var format = DownloadFormats.getFormat(spec.format);
      if (!format) {
        deferred.reject(new Error('Unknown format: ' + spec.format));
        return deferred;
      }

      // Build the RQL query
      var query = buildQuery(spec);
      console.log('executeServerSideDownload: query =', query);

      var selectClause = buildSelectClause(spec);
      console.log('executeServerSideDownload: selectClause =', selectClause);

      if (selectClause) {
        query = query ? query + '&' + selectClause : selectClause;
      }
      console.log('executeServerSideDownload: final query =', query);

      // Determine the content type based on format
      var acceptType = format.mimeType || 'text/plain';
      var filename = generateFilename(spec);

      // Build the action URL with http_download and http_accept as query params
      // Note: http_download=true triggers the download, the server determines filename
      // Note: Do NOT encode http_accept - the working code doesn't encode it
      var actionUrl = DATA_API_URL + '/' + spec.dataType + '/';
      actionUrl += '?http_download=true';
      actionUrl += '&http_accept=' + acceptType;
      console.log('executeServerSideDownload: actionUrl =', actionUrl);

      // Create hidden form for download
      // Note: Do NOT use target='_blank' - it gets blocked by popup blockers
      // The server's Content-Disposition header will trigger a download
      var form = domConstruct.create('form', {
        method: 'POST',
        action: actionUrl,
        id: 'downloadForm',
        name: 'downloadForm',
        style: 'display: none;',
        enctype: 'application/x-www-form-urlencoded'
      }, document.body);

      // Add RQL query as form field
      // The server expects double-URL-encoded values:
      // 1. We encode with encodeURIComponent
      // 2. The browser's form submission encodes again
      // This matches the behavior of the working download code
      var encodedQuery = encodeURIComponent(query);
      console.log('executeServerSideDownload: encodedQuery =', encodedQuery);
      domConstruct.create('input', {
        type: 'hidden',
        name: 'rql',
        value: encodedQuery
      }, form);

      // Add authorization if available
      if (window.App && window.App.authorizationToken) {
        domConstruct.create('input', {
          type: 'hidden',
          name: 'http_authorization',
          value: window.App.authorizationToken
        }, form);
      }

      // Submit the form - the server's Content-Disposition header triggers the download
      form.submit();

      topic.publish('/Download/started', {
        type: 'server-side',
        spec: spec,
        filename: filename
      });

      deferred.resolve({
        success: true,
        filename: filename,
        method: 'server-side'
      });

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

    // Add FASTA configuration headers
    if (spec.fastaConfig) {
      if (spec.fastaConfig.defLineFields && spec.fastaConfig.defLineFields.length > 0) {
        requestHeaders['X-FASTA-DefLine-Fields'] = spec.fastaConfig.defLineFields.join(',');
      }
      if (spec.fastaConfig.delimiter) {
        requestHeaders['X-FASTA-DefLine-Delimiter'] = spec.fastaConfig.delimiter;
      }
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
    var defLineFields = fastaConfig.defLineFields || ['feature_id'];
    var delimiter = fastaConfig.delimiter || '|';
    var sequenceField = spec.format === 'protein+fasta' ? 'aa_sequence' : 'na_sequence';

    data.forEach(function (record) {
      // Build definition line
      var parts = defLineFields.map(function (field) {
        return record[field] || '';
      });
      var defLine = '>' + parts.join(delimiter);
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
