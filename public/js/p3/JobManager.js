define(["dojo/_base/Deferred", "dojo/topic", "dojo/request/xhr",
	"dojo/promise/all", "dojo/store/Memory", "dojo/store/Observable", "dojo/when"
], function(Deferred, Topic, xhr,
			All, MemoryStore, Observable, when){
	//console.log("Start Job Manager");
	var Jobs = {};
	var ready = new Deferred();
	var firstRun = true;

	var _DataStore = new Observable(new MemoryStore({idProperty: "id", data: []}));
	var initialDataSet=true;

	setTimeout(function(){
		PollJobs();
	})

	function PollJobs(){
		// digest cycle is unclear, so leaving this here.
		if(!(window.App && window.App.api && window.App.api.service)) return;

		Deferred.when(window.App.api.service("AppService.enumerate_tasks", [0, 10000]), function(tasks){
			if (initialDataSet){
				_DataStore.setData(tasks[0].slice(0,-1));
				_DataStore.put(tasks[0][tasks[0].length-1])
				initialDataSet=false;
			}else{
				tasks[0].forEach(function(task){
					_DataStore.put(task);
				});
			}
			Deferred.when(getJobSummary(), function(msg){
				Topic.publish("/Jobs", msg);
			});

			if(firstRun){
				ready.resolve(true);
				firstRun = false;
			}
			setTimeout(function(){
				PollJobs();
			}, 15000)
		});
	}

	function getJobSummary(){
		var def = new Deferred();
		var summary = {total: 0};
		when(ready, function(){
			when(_DataStore.query({}), function(Jobs){
				Jobs.forEach(function(job){
					summary.total++;
					if(!summary[job.status]){
						summary[job.status] = 1;
					}else{
						summary[job.status]++;
					}
				});
				def.resolve({type: "JobStatusSummary", summary: summary});
			}, function(err){
				console.log("Error Generating Job Summary", err)
			})
		});

		return def.promise;
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
		getShockNode: function(url){
			return xhr.get(url + "?download", {
				headers: {
					"Authorization": "Oauth " + window.App.authorizationToken,
					"X-Requested-With": false
				}
			});
		},
		getJobSummary: getJobSummary,
		getJobs: function(){
			return Deferred.when(ready, function(){
				return Object.keys(Jobs).map(function(id){
					return Jobs[id];
				});
			});
		},

		getStore: function(){
			return _DataStore;
		}
	}
});
