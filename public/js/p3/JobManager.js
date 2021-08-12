define(['dojo/_base/Deferred', 'dojo/topic', 'dojo/request/xhr',
  'dojo/promise/all', 'dojo/store/Memory'
], function (
  Deferred, Topic, xhr,
  All, MemoryStore
) {

  var self = this;
  var TIME_OUT = 5000; // in ms
  var job_callbacks={}; // key job id to callback function
  // state model of filters applied to jobs
  self.filters = {
    app: 'all',
    status: null
  };

  self.targetJob = null;
  self.targetJobCallback = null;

  // state of status (used to detect changes)
  var StatusSummary = { init: null };

  var _DataStore = new MemoryStore({
    idProperty: 'id',
    data: []
  });

  /**
   * updates the job list (see JobsGrid.js)
   */
  function updateJobsList(cb) {
    Topic.publish('/Jobs', { status: 'loading' });

    var prom = window.App.api.service('AppService.enumerate_tasks', [0, 30000]);
    return prom.then(function (res) {
      // filter out jobs marked as deleted (includes killed jobs)
      var jobs = res[0].filter(function (job) { return job.status !== 'deleted'; });

      _DataStore.setData(jobs);

      // perform any callback action before filtering
      if (cb) cb();
      

      if (self.filters.app || self.filters.status) {
        Topic.publish('/Jobs', { status: 'filtered', jobs: _DataStore.data });
        Topic.publish('/JobFilter', self.filters);
        return;
      }
      //check job ids as finished and remove them from callback list and call the callback
      Topic.publish('/Jobs', { status: 'updated', jobs: _DataStore.data });
    });
  }


  /**
   * sets status locally, publishes status for jobs ticker, and returns True if any changes
   */
  function getStatus() {
    var prom = window.App.api.service('AppService.query_task_summary', []);
    return prom.then(function (res) {
      var status = res[0];

      var queued = (status.queued || 0) + (status.pending || 0) + (status.init || 0);
      var inProgress = status['in-progress'] || 0;
      var completed = status.completed || 0;
      var failed = status.failed || 0;

      // check for any changes in status
      var change = false;
      if (queued !== StatusSummary.queued ||
          inProgress !== StatusSummary.inProgress ||
          completed !== StatusSummary.completed ||
          failed !== StatusSummary.failed) {
        change = true;
        if (self.targetJob && self.targetJobCallback){
            //NEED TO FIND FINISHED JOBS
            var prom2 = window.App.api.service('AppService.query_tasks', [self.targetJob]);
            prom2.then(function (res) {
                var status = res[0];
                finished_jobs=[];
                if (self.targetJob == finished_jobs){
                    self.targetJob=null;
                    self.targetJobCallback();
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

  function setJobHook(jobID, callback){
    self.targetJob = jobID;
    self.targetJobCallback = callback;
  }

  function PollJobs() {
    // leaving this here since instantiation order is unpredictable
    if (!(window.App && window.App.api && window.App.api.service)) {
      setTimeout(PollJobs, 1000);
      return;
    }

    // check for status change.  if change, update jobs list
    var prom = getStatus();
    prom.then(function (statusChange) {
      if (statusChange) {
        updateJobsList().then(function () {
          setTimeout(PollJobs, TIME_OUT);
        });
        return;
      }

      setTimeout(PollJobs, TIME_OUT);
    }, function () {
      Topic.publish('/Jobs', { status: 'failed' });
      Topic.publish('/JobStatus', 'failed'); // send 'failed' instead of usual meta object

      setTimeout(PollJobs, TIME_OUT);
    });
  }

  // kick off the polling
  setTimeout(PollJobs, 1000);

  /**
   * listen for job filtering to store filter state locally
   */
  Topic.subscribe('/JobFilter', function (filter) {
    Object.assign(self.filters, filter);
  });

  return {
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

    }
  };
});
