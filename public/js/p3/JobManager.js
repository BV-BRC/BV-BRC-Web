define(["dojo/_base/Deferred", "dojo/topic", "dojo/request/xhr",
	"dojo/promise/all", "dojo/store/Memory", "dojo/store/Observable", "dojo/when"
], function(Deferred, Topic, xhr,
			All, MemoryStore, Observable, when){

	var self = this;
	var TIME_OUT = 5000; // in ms

	var StatusSummary = {init: null};
	var filters = {};

	var _DataStore = new MemoryStore({
		idProperty: "id",
		data: []
	})

	// kick off the polling
	setTimeout(PollJobs, 1000);

	function PollJobs(){
		// leaving this here since instantiation order is unpredictable
		if(!(window.App && window.App.api && window.App.api.service)){
			setTimeout(PollJobs, 1000);
			return;
		}

		// check for status change.  if change, update jobs list
		var prom = getStatus();
		prom.then(function(statusChange){
			if(statusChange) updateJobsList();

			setTimeout(PollJobs, TIME_OUT);
		})
	}

	/**
	 * listen for job filtering to store filter state locally
	 */
	Topic.subscribe("/JobFilter", function(val){
		filters = {app: val}
	});


	/**
	 * updates the job list (see JobsGrid.js)
	 */
	function updateJobsList(){
		Topic.publish("/JobInfo", {status: 'loading'});

		var prom = window.App.api.service("AppService.enumerate_tasks", [0, 10000]);
		return Deferred.when(prom, function(res){
			var jobs = res[0];
			_DataStore.setData(jobs)

			if('app' in filters && filters.app == 'all'){
				Topic.publish("/JobInfo", {status: 'filter', jobs: _DataStore.data});
				return
			}else if('app' in filters){
				Topic.publish("/JobInfo", {status: 'filtered', jobs: _DataStore.data});
				Topic.publish("/JobFilter", filters.app);
				return;
			}

			Topic.publish("/JobInfo", {status: 'updated', jobs: _DataStore.data});
		});
	}


	/**
	 * sets status locally, publishes status for jobs ticker, and returns True if any changes
	 */
	function getStatus(){
		var prom = window.App.api.service("AppService.query_task_summary", []);
		return prom.then(function(res){
			var status = res[0];

			var queued = (status.queued || 0) + (status.pending || 0) + (status.init || 0);
			var	inProgress = status['in-progress'] || 0;
			var	completed = status.completed || 0;
			var	failed = status.failed || 0;

			// check for any changes in status
			var change;
			if(queued !== StatusSummary.queued ||
			   inProgress !== StatusSummary.inProgress ||
			   completed !== StatusSummary.completed ||
			   failed !== StatusSummary.failed){
				change = true;
			}

			StatusSummary = {
				'queued': queued,
				'inProgress': inProgress,
				'completed': completed,
				'failed': failed
			}

			// publish job status for jobs ticker
			Topic.publish("/JobStatus", StatusSummary);

			return change; // no changes
		})
	}

	return {
		queryTaskDetail: function(id, stdout, stderr){
			return Deferred.when(window.App.api.service("AppService.query_task_details", [id]), function(detail){
				detail = detail[0];
				var defs = [];
				if(detail.stderr_url && stderr){
					defs.push(Deferred.when(xhr.get(detail.stderr_url, {
						headers: {
							"Authorization": "Oauth " + window.App.authorizationToken,
							"X-Requested-With": false
						}
					}), function(txt){
						detail.stderr = txt;

					}));
				}
				if(detail.stdout_url && stdout){
					defs.push(Deferred.when(xhr.get(detail.stdout_url, {
						headers: {
							"Authorization": "Oauth " + window.App.authorizationToken,
							"X-Requested-With": false
						}
					}), function(txt){
						detail.stdout = txt;

					}));
				}
				if(defs.length < 1){
					return detail;
				}else{
					return Deferred.when(All(defs), function(){
						return detail;
					});
				}
			});
		},

		getStore: function(){
			return _DataStore;
		}
	}
});
