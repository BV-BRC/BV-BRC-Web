define(['dojo/_base/Deferred', 'dojo/topic', 'dojo/request/xhr',
  'dojo/promise/all', 'dojo/when', './store/PaginatedJobStore'
], function (
  Deferred, Topic, xhr,
  All, When, PaginatedJobStore
) {

  var self = this;
  var TIME_OUT = 30000; // in ms
  // var job_callbacks = {}; // key job id to callback function
  // state model of filters applied to jobs
  self.filters = {
    app: 'all',
    status: null
  };


  // state of status (used to detect changes)
  var StatusSummary = { init: null };

  // Flag to track if this is the first poll - skip refresh on first poll
  // since the grid is already loading its initial data
  var isFirstPoll = true;

  // Use paginated store instead of MemoryStore
  var _DataStore = new PaginatedJobStore({
    idProperty: 'id',
    data: []
  });

  /**
   * updates the job list (see JobsGrid.js)
   * With paginated store, we just need to clear the cache to force refresh
   */
  function updateJobsList(cb) {
    if (!localStorage.getItem("tokenstring") || !localStorage.getItem("userid")){
      return Deferred.when(null);
    }
    Topic.publish('/Jobs', { status: 'loading' });

    // Clear the cache so the next query will fetch fresh data
    if (_DataStore.clearCache) {
      _DataStore.clearCache();
    }

    // perform any callback action
    if (cb) {
      cb();
    }

    // Publish update status - the grid will fetch data as needed via pagination
    Topic.publish('/Jobs', { status: 'updated' });

    // Return a resolved promise for compatibility
    return Deferred.when(null);
  }


  /**
   * sets status locally, publishes status for jobs ticker, and returns True if any changes
   * Uses query_task_summary_filtered to get counts matching current filters
   */
  function getStatus() {
    if (!localStorage.getItem("tokenstring") || !localStorage.getItem("userid")){
      return
    }

    // Build SimpleTaskFilter from current filters
    var simpleFilter = {};
    if (self.filters.app && self.filters.app !== 'all') {
      simpleFilter.app = self.filters.app;
    }
    if (self.filters.includeArchived) {
      simpleFilter.include_archived = 1;
    }
    if (self.filters.search) {
      simpleFilter.search = self.filters.search;
    }
    // Note: We don't filter by status for the summary counts - we want all status counts

    var prom = window.App.api.service('AppService.query_task_summary_filtered', [simpleFilter]);
    return prom.then(function (res) {
      var status = res[0];

      var queued = (status.queued || 0) + (status.pending || 0) + (status.init || 0);
      var inProgress = status['in-progress'] || 0;
      var completed = status.completed || 0;
      var failed = status.failed || 0;
      var _self = this;

      // check for any changes in status
      var change = false;
      if (queued !== StatusSummary.queued ||
          inProgress !== StatusSummary.inProgress ||
          completed !== StatusSummary.completed ||
          failed !== StatusSummary.failed) {
        change = true;

        if (self.targetJob) {
          // NEED TO FIND FINISHED JOBS
          var prom2 = window.App.api.service('AppService.query_tasks', [[self.targetJob]]);
          prom2.then(function (res) {
            var status = res[0][self.targetJob].status;
            if (status == 'failed') {
              var currentJob = self.targetJob;
              self.targetJob = null;
              Topic.publish('/Notification', {
                message: `<span class="default">Job ${_self.targetJobLabel} failed..</span>`,
                type: 'default',
                duration: 50000
              });
              if (self.targetErrorCallback) {
                self.targetErrorCallback(`Job failed to finish. Please check ${res[0][currentJob].parameters.output_path}/${res[0][currentJob].parameters.output_file} for details`);
              }
            }
            else if (status == 'in-progress') {
              Topic.publish('/Notification', {
                message: `<span class="default">Job ${_self.targetJobLabel} running...</span>`,
                type: 'default',
                duration: 50000
              });
            }
            else if (status == 'queued') {
              Topic.publish('/Notification', {
                message: `<span class="default">Job ${_self.targetJobLabel} allocating resources...</span>`,
                type: 'default',
                duration: 50000
              });
            }
            else {
              self.targetJob = null;
              Topic.publish('/Notification', {
                message: `<span class="default">Job ${_self.targetJobLabel} finished.</span>`,
                type: 'default',
                duration: 50000
              });
              if (self.targetJobCallback) {
                self.targetJobCallback();
              }
            }
          });
        }
      }

      StatusSummary = {
        queued: queued,
        inProgress: inProgress,
        completed: completed,
        failed: failed
      };

      // publish job status for jobs ticker
      Topic.publish('/JobStatus', StatusSummary);

      return change; // bool
    });
  }


  function PollJobs() {
    // leaving this here since instantiation order is unpredictable
    if (!(window.App && window.App.api && window.App.api.service)) {
      setTimeout(PollJobs, TIME_OUT);
      return;
    }

    // check for status change.  if change, update jobs list
    var prom = getStatus();
    return When(prom,function (statusChange) {
      // Skip refresh on first poll ONLY if there's no status change
      // If there is a status change (e.g., new job submitted), we must refresh
      if (isFirstPoll) {
        isFirstPoll = false;
        if (!statusChange) {
          // No change - skip refresh since the grid is already loading its initial data
          setTimeout(PollJobs, TIME_OUT);
          return;
        }
      }

      if (statusChange) {
        updateJobsList().then(function () {
          setTimeout(PollJobs, TIME_OUT);
        });
        return;
      }

      setTimeout(PollJobs, TIME_OUT);
    }, function () {
      isFirstPoll = false; // Reset flag even on error
      Topic.publish('/Jobs', { status: 'failed' });
      Topic.publish('/JobStatus', 'failed'); // send 'failed' instead of usual meta object

      setTimeout(PollJobs, TIME_OUT);
    });
  }


  // kick off the polling
  setTimeout(PollJobs, 1000);

  /**
   * listen for job filtering to store filter state locally
   * and update status counts to match new filters
   */
  Topic.subscribe('/JobFilter', function (filter) {
    Object.assign(self.filters, filter);
    // Update status counts to reflect new filters
    getStatus();
  });

  /**
   * listen for keyword/search filtering to update status counts
   */
  Topic.subscribe('/KeywordFilter', function (keyword) {
    if (keyword && keyword.trim() !== '') {
      self.filters.search = keyword.trim();
    } else {
      delete self.filters.search;
    }
    // Update status counts to reflect new search filter
    getStatus();
  });

  return {
    getStatus: function () {
      return getStatus();
    },
    queryTaskDetail: function (id, stdout, stderr) {
      return Deferred.when(window.App.api.service('AppService.query_task_details', [id]), function (detail) {
        detail = detail[0];
        var defs = [];
        if (detail.stderr_url && stderr) {
          defs.push(Deferred.when(xhr.get(detail.stderr_url, {
            headers: {
              Authorization: 'Oauth ' + window.App.authorizationToken,
              'X-Requested-With': false
            }
          }), function (txt) {
            detail.stderr = txt;

          }));
        }
        if (detail.stdout_url && stdout) {
          defs.push(Deferred.when(xhr.get(detail.stdout_url, {
            headers: {
              Authorization: 'Oauth ' + window.App.authorizationToken,
              'X-Requested-With': false
            }
          }), function (txt) {
            detail.stdout = txt;

          }));
        }
        if (defs.length < 1) {
          return detail;
        }
        return Deferred.when(All(defs), function () {
          return detail;
        });

      });
    },

    getStore: function () {
      return _DataStore;
    },
    targetJob: null,
    targetJobCallback: null,
    targetErrorCallback: null,
    setJobHook: function (jobInfo, callback, error_callback) {
      self.targetJob = jobInfo.jobID;
      self.targetJobLabel = jobInfo.jobLabel;
      self.targetJobPath = jobInfo.jobPath;
      self.targetJobCallback = callback;
      self.targetErrorCallback = error_callback;
    },

    killJob: function (id) {

      Topic.publish('/Notification', {
        message: '<span class="default">Terminating job ' + id + '...</span>',
        type: 'default',
        duration: 50000
      });

      window.App.api.service('AppService.kill_task', [id]).then(function (res) {
        updateJobsList(function () {
          Topic.publish('/Notification', {
            message: 'Job terminated.',
            type: 'message'
          });
        });
      });

    },

    /**
     * Force an immediate refresh of job status and job list.
     * Call this after a new job is submitted to immediately update the UI.
     */
    refreshJobs: function () {
      // Clear the cache to ensure fresh data
      if (_DataStore.clearCache) {
        _DataStore.clearCache();
      }

      // Fetch updated status and publish to update the summary widget
      return getStatus().then(function () {
        // Trigger grid refresh
        updateJobsList();
      });
    }
  };
});
