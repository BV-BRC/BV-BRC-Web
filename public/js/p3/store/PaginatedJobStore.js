define([
  'dojo/_base/declare', 'dojo/_base/Deferred', 'dojo/_base/lang',
  'dojo/store/util/QueryResults', 'dojo/store/Memory'
], function (
  declare, Deferred, lang, QueryResults, Memory
) {
  return declare([Memory], {
    idProperty: 'id',
    _totalCount: null,
    _totalCountPromise: null,

    constructor: function (options) {
      this.inherited(arguments);
      this._cache = {}; // Cache for paginated results
    },

    /**
     * Get the total count of jobs (excluding deleted)
     * Uses query_task_summary API which is much more efficient than fetching all jobs
     * @param {Object} statusFilter - Optional status filter to get count for specific status
     */
    _getTotalCount: function (statusFilter) {
      // If we have a cached total and no status filter, return it
      if (this._totalCount !== null && !statusFilter) {
        var def = new Deferred();
        def.resolve(this._totalCount);
        return def.promise;
      }

      // If we're getting status-specific count, always fetch fresh
      // Don't cache status-specific counts since they can change
      var _self = this;
      var promise = window.App.api.service('AppService.query_task_summary', [])
        .then(function (res) {
          if (!res || !res[0]) {
            return 0;
          }
          var status = res[0];

          // If filtering by status, return the count for that specific status
          if (statusFilter) {
            // Handle RegExp filters (e.g., queued|init|pending or failed|deleted)
            if (statusFilter.test && typeof statusFilter.test === 'function') {
              var total = 0;
              // Check which statuses match the regex
              if (statusFilter.test('queued') || statusFilter.test('init') || statusFilter.test('pending')) {
                total += (status.queued || 0) + (status.pending || 0) + (status.init || 0);
              }
              if (statusFilter.test('in-progress')) {
                total += (status['in-progress'] || 0);
              }
              if (statusFilter.test('completed')) {
                total += (status.completed || 0);
              }
              if (statusFilter.test('failed') || statusFilter.test('deleted')) {
                total += (status.failed || 0);
                // Note: deleted jobs are filtered out, but failed count includes them in the summary
              }
            //   console.log('Total count for status filter (regex):', total);
              return total;
            }
            // Handle string status filters
            else if (statusFilter === 'queued') {
              var queued = (status.queued || 0) + (status.pending || 0) + (status.init || 0);
              return queued;
            } else if (statusFilter === 'in-progress') {
              var inProgress = status['in-progress'] || 0;
              return inProgress;
            } else if (statusFilter === 'completed') {
              var completed = status.completed || 0;
              return completed;
            } else if (statusFilter === 'failed') {
              var failed = status.failed || 0;
              return failed;
            }
          }

          // For unfiltered, sum up all job statuses
          var queued = (status.queued || 0) + (status.pending || 0) + (status.init || 0);
          var inProgress = status['in-progress'] || 0;
          var completed = status.completed || 0;
          var failed = status.failed || 0;
          var total = queued + inProgress + completed + failed;

          // If there's a total field directly, use it (some APIs provide this)
          if (status.total !== undefined && status.total !== null) {
            total = status.total;
          }

          // Cache the unfiltered total
          if (!statusFilter) {
            _self._totalCount = total;
            _self._totalCountPromise = null;
          }

        //   console.log('Total job count from summary - queued:', queued, 'inProgress:', inProgress, 'completed:', completed, 'failed:', failed, 'total:', total);
          return total;
        }, function (err) {
          console.error('Error fetching total job count:', err);
          return 0;
        });

      // Cache the promise only for unfiltered requests
      if (!statusFilter) {
        this._totalCountPromise = promise;
      }

      return promise;
    },

    /**
     * Apply client-side filtering to jobs based on query object
     */
    _applyFilters: function (jobs, query) {
      if (!query || Object.keys(query).length === 0) {
        return jobs;
      }

      return jobs.filter(function (job) {
        var match = true;
        for (var key in query) {
          if (query.hasOwnProperty(key)) {
            var filterValue = query[key];
            var jobValue = job[key];

            // Handle special case for 'app' field - check both 'app' and 'application_name'
            if (key === 'app') {
              jobValue = job.application_name || job.app;
            }

            // Handle special case for 'parameters' field - check output_file
            if (key === 'parameters' && filterValue && filterValue.test) {
              var outputFile = (job.parameters && job.parameters.output_file) || '';
              if (!filterValue.test(outputFile)) {
                match = false;
                break;
              }
              continue;
            }

            // Handle regex or objects with test method
            if (filterValue && typeof filterValue === 'object' && filterValue.test) {
              if (!filterValue.test(jobValue)) {
                match = false;
                break;
              }
            } else if (filterValue != jobValue) {
              match = false;
              break;
            }
          }
        }
        return match;
      });
    },

    /**
     * Apply client-side sorting to jobs based on sort options
     * Note: This only sorts the current page's data, not all jobs
     */
    _applySorting: function (jobs, sort) {
      if (!sort || !Array.isArray(sort) || sort.length === 0) {
        return jobs;
      }

      var sortCriteria = sort[0]; // Use first sort criterion
      var attribute = sortCriteria.attribute;
      var descending = sortCriteria.descending;

      // Create a copy to avoid mutating the original array
      var sortedJobs = jobs.slice();

      sortedJobs.sort(function (a, b) {
        var aVal = a[attribute];
        var bVal = b[attribute];

        // Handle special cases for nested fields
        if (attribute === 'parameters') {
          // Sort by output_file within parameters
          aVal = (a.parameters && a.parameters.output_file) || '';
          bVal = (b.parameters && b.parameters.output_file) || '';
        }

        // Handle null/undefined values
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';

        // Compare values
        var result;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          result = aVal.localeCompare(bVal);
        } else if (aVal < bVal) {
          result = -1;
        } else if (aVal > bVal) {
          result = 1;
        } else {
          result = 0;
        }

        return descending ? -result : result;
      });

      return sortedJobs;
    },

    /**
     * Query method that implements server-side pagination with client-side filtering and sorting
     */
    query: function (query, opts) {
      if (!localStorage.getItem("tokenstring") || !localStorage.getItem("userid")) {
        return QueryResults([]);
      }

      opts = opts || {};
      var start = opts.start || 0;
      var count = opts.count || 10;
      var offset = start;
      var limit = count;

      // Extract sort options
      var sort = opts.sort || null;

      // Extract status filter from query if present
      var statusFilter = null;
      var statusFilterString = null;
      if (query && query.status) {
        statusFilter = query.status;
        // Convert RegExp or string status filter to API status string
        if (statusFilter.test && typeof statusFilter.test === 'function') {
          // Handle RegExp filters - convert to appropriate API status
          // Check which statuses the regex matches
          if (statusFilter.test('queued') || statusFilter.test('init') || statusFilter.test('pending')) {
            statusFilterString = 'queued'; // API uses 'queued' for queued/init/pending
          } else if (statusFilter.test('failed') || statusFilter.test('deleted')) {
            statusFilterString = 'failed'; // API uses 'failed' for failed/deleted
          } else if (statusFilter.test('completed')) {
            statusFilterString = 'completed';
          } else if (statusFilter.test('in-progress')) {
            statusFilterString = 'in-progress';
          }
        } else if (typeof statusFilter === 'string') {
          // Direct string status values: 'completed', 'in-progress', 'queued', 'failed'
          statusFilterString = statusFilter;
        }
      }

      // Extract app filter from query if present
      var appFilter = null;
      if (query && query.app && query.app !== 'all') {
        appFilter = query.app;
      }

      // Determine if we should use filtered API - for status or app filters
      var useFilteredAPI = !!(statusFilterString || appFilter);

      // Create cache key for this page (include query and sort in key)
      var queryKey = query ? JSON.stringify(query) : 'noquery';
      var sortKey = sort ? JSON.stringify(sort) : 'nosort';
      var cacheKey = offset + '_' + limit + '_' + queryKey + '_' + sortKey;

      var _self = this;

      // Check cache first
      if (this._cache[cacheKey]) {
        var cachedResult = this._cache[cacheKey];
        var cachedData = cachedResult.data;
        var cachedTotal = cachedResult.total;

        // Wrap with QueryResults first
        var results = QueryResults(cachedData);

        // Now set total AFTER wrapping - this ensures it's set on the QueryResults object
        if (useFilteredAPI && cachedTotal !== undefined) {
          // For filtered results from API, use the cached total
          results.total = typeof cachedTotal === 'number' ? cachedTotal : Deferred.when(cachedTotal, function (total) {
            return total || 0;
          });
        } else if (query && Object.keys(query).length > 0) {
          // For other filters (non-status), we can't know the true total without fetching all pages
          // Use the cached page count as a fallback
          results.total = cachedData.length;
        } else {
          // For unfiltered, always get the current total count (don't rely on cached total)
          // This ensures the total is always accurate even if jobs are added/deleted
          results.total = Deferred.when(this._getTotalCount(), function (total) {
            var finalTotal = total || 0;
            return finalTotal;
          });
        }

        return results;
      }

      // Get total count promise for unfiltered queries
      var totalPromise = useFilteredAPI ? null : _self._getTotalCount();

      // Build SimpleTaskFilter if using filtered API - include status and/or app
      var simpleFilter = null;
      if (useFilteredAPI) {
        simpleFilter = {};
        if (statusFilterString) {
          simpleFilter.status = statusFilterString;
        }
        if (appFilter) {
          simpleFilter.app = appFilter;
        }
      }

      // Make API call for this page
      var apiPromise;
      if (useFilteredAPI && simpleFilter) {
        // Use enumerate_tasks_filtered when filtering by status or app
        apiPromise = window.App.api.service('AppService.enumerate_tasks_filtered', [offset, limit, simpleFilter])
          .then(function (res) {
            // enumerate_tasks_filtered returns [tasks, total_tasks]
            var jobs = res[0] || [];
            var totalTasks = res[1] || 0;

            // Filter out deleted jobs
            jobs = jobs.filter(function (job) { return job.status !== 'deleted'; });

            // Apply any remaining client-side filters (e.g., parameters/output_file search)
            // Status and app are handled by the filtered API, other filters are applied client-side
            if (query && Object.keys(query).length > 0) {
              // Remove status and app from query since they're handled by API
              var clientQuery = {};
              for (var key in query) {
                if (query.hasOwnProperty(key) && key !== 'status' && key !== 'app') {
                  clientQuery[key] = query[key];
                }
              }
              if (Object.keys(clientQuery).length > 0) {
                jobs = _self._applyFilters(jobs, clientQuery);
                // If we filtered client-side, we can't know the true total
                // But we'll use the API total as an approximation
              }
            }

            // Apply client-side sorting (sorts current page only)
            if (sort) {
              jobs = _self._applySorting(jobs, sort);
            }

            // Cache the result with the total from API
            _self._cache[cacheKey] = {
              data: jobs,
              timestamp: Date.now(),
              total: totalTasks
            };

            // Clear old cache entries (keep last 10 pages)
            var cacheKeys = Object.keys(_self._cache);
            if (cacheKeys.length > 10) {
              // Sort by timestamp and remove oldest
              var sortedKeys = cacheKeys.sort(function (a, b) {
                return _self._cache[a].timestamp - _self._cache[b].timestamp;
              });
              for (var i = 0; i < sortedKeys.length - 10; i++) {
                delete _self._cache[sortedKeys[i]];
              }
            }

            // Return both jobs and total
            return { jobs: jobs, total: totalTasks };
          }, function (err) {
            throw err;
          });
      } else {
        // Use regular enumerate_tasks for unfiltered queries
        apiPromise = window.App.api.service('AppService.enumerate_tasks', [offset, limit])
          .then(function (res) {
            // Filter out deleted jobs
            var jobs = res[0].filter(function (job) { return job.status !== 'deleted'; });

            // Apply client-side filters if query is provided
            if (query && Object.keys(query).length > 0) {
              jobs = _self._applyFilters(jobs, query);
            }

            // Apply client-side sorting (sorts current page only)
            if (sort) {
              jobs = _self._applySorting(jobs, sort);
            }

            // Cache the result
            _self._cache[cacheKey] = {
              data: jobs,
              timestamp: Date.now(),
              total: totalPromise // Store the promise, will resolve when needed
            };

            // Clear old cache entries (keep last 10 pages)
            var cacheKeys = Object.keys(_self._cache);
            if (cacheKeys.length > 10) {
              // Sort by timestamp and remove oldest
              var sortedKeys = cacheKeys.sort(function (a, b) {
                return _self._cache[a].timestamp - _self._cache[b].timestamp;
              });
              for (var i = 0; i < sortedKeys.length - 10; i++) {
                delete _self._cache[sortedKeys[i]];
              }
            }

            // Return just jobs for unfiltered
            return { jobs: jobs, total: null };
          }, function (err) {
            throw err;
          });
      }

      // Transform the promise to return just the jobs array, but preserve total
      var jobsPromise = apiPromise.then(function (result) {
        return result.jobs;
      });

      // Set total on the promise
      if (useFilteredAPI) {
        // For filtered API, use the total returned from the API
        jobsPromise.total = apiPromise.then(function (result) {
          var finalTotal = (result.total !== null && result.total !== undefined) ? result.total : 0;
          return finalTotal;
        });
      } else {
        // For unfiltered, use the total count promise
        jobsPromise.total = totalPromise.then(function (total) {
          var finalTotal = (total !== null && total !== undefined) ? total : 0;
          return finalTotal;
        });
      }

      // Now wrap the promise with QueryResults
      var results = QueryResults(jobsPromise);

      // CRITICAL: Ensure total is set on the QueryResults object
      if (useFilteredAPI) {
        // For filtered results, ensure total is set from API response
        results.total = apiPromise.then(function (result) {
          var finalTotal = (result.total !== null && result.total !== undefined) ? result.total : 0;
          return finalTotal;
        });
      } else {
        // For unfiltered, ensure total is the promise
        if (!results.total || results.total === jobsPromise.total) {
        } else {
          console.warn('QueryResults may have overridden total, resetting to correct value');
          results.total = totalPromise.then(function (total) {
            var finalTotal = (total !== null && total !== undefined) ? total : 0;
            return finalTotal;
          });
        }
      }

      return results;
    },

    /**
     * Clear the cache (useful when jobs are updated or filters change)
     */
    clearCache: function () {
      this._cache = {};
      this._totalCount = null;
      this._totalCountPromise = null;
    },

    /**
     * Get a single job by ID
     */
    get: function (id, opts) {
      // Try to find in cache first
      for (var key in this._cache) {
        if (this._cache.hasOwnProperty(key)) {
          var jobs = this._cache[key].data;
          for (var i = 0; i < jobs.length; i++) {
            if (jobs[i].id === id) {
              return jobs[i];
            }
          }
        }
      }

      // If not in cache, make API call
      return window.App.api.service('AppService.query_tasks', [[id]])
        .then(function (res) {
          return res[0][id];
        });
    }
  });
});

