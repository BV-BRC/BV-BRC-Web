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
    var query = spec.rqlQuery || '';

    // Handle record scope
    if (spec.scope === 'selected' && spec.selectedIds && spec.selectedIds.length > 0) {
      var pk = spec.primaryKey || 'id';
      var idQuery = 'in(' + pk + ',(' + spec.selectedIds.join(',') + '))';

      if (query) {
        query = 'and(' + query + ',' + idQuery + ')';
      } else {
        query = idQuery;
      }
    } else if (spec.scope === 'random' && spec.randomLimit) {
      // Random sampling handled server-side
      query += '&limit(' + spec.randomLimit + ')';
    }

    return query;
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
    var extension = format ? format.extension : 'txt';
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

    try {
      var format = DownloadFormats.getFormat(spec.format);
      if (!format) {
        deferred.reject(new Error('Unknown format: ' + spec.format));
        return deferred;
      }

      // Build the request URL
      var query = buildQuery(spec);
      var selectClause = buildSelectClause(spec);
      if (selectClause) {
        query = query ? query + '&' + selectClause : selectClause;
      }

      // Determine the content type based on format
      var acceptType = format.mimeType || 'text/plain';
      var filename = generateFilename(spec);

      // For FASTA formats, add header customization
      var headers = {};
      if (spec.fastaConfig) {
        if (spec.fastaConfig.defLineFields && spec.fastaConfig.defLineFields.length > 0) {
          headers['x-fasta-defline-fields'] = spec.fastaConfig.defLineFields.join(',');
        }
        if (spec.fastaConfig.delimiter) {
          headers['x-fasta-defline-delimiter'] = spec.fastaConfig.delimiter;
        }
      }

      // Create hidden form for download
      var form = domConstruct.create('form', {
        method: 'POST',
        action: DATA_API_URL + '/' + spec.dataType + '/',
        target: '_blank',
        style: 'display: none;'
      }, document.body);

      // Add query parameter
      domConstruct.create('input', {
        type: 'hidden',
        name: 'rql',
        value: query
      }, form);

      // Add accept header via form field (server interprets this)
      domConstruct.create('input', {
        type: 'hidden',
        name: 'http_accept',
        value: acceptType
      }, form);

      // Add download header
      domConstruct.create('input', {
        type: 'hidden',
        name: 'http_download',
        value: filename
      }, form);

      // Add custom headers for FASTA
      Object.keys(headers).forEach(function (key) {
        domConstruct.create('input', {
          type: 'hidden',
          name: key.replace('x-', 'http_x_').replace(/-/g, '_'),
          value: headers[key]
        }, form);
      });

      // Add authorization if available
      if (window.App && window.App.authorizationToken) {
        domConstruct.create('input', {
          type: 'hidden',
          name: 'http_authorization',
          value: window.App.authorizationToken
        }, form);
      }

      // Submit and cleanup
      form.submit();
      setTimeout(function () {
        domConstruct.destroy(form);
      }, 1000);

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
