define("p3/JobManager", ["dojo/_base/Deferred", "dojo/topic", "dojo/request/xhr",
	"dojo/promise/all", "dojo/store/Memory", "dojo/store/Observable", "dojo/when"
],
function(Deferred, Topic, xhr,
		 All, MemoryStore, Observable, when){
	//console.log("Start Job Manager");
	var Jobs = {};
	var ready = new Deferred();
	var firstRun = true;

	// var _DataStore = new Observable(new MemoryStore({idProperty: "id", data: []}));
	var _DataStore = new MemoryStore({idProperty: "id", data: []});
	function PollJobs(){
		if(window.App && window.App.api && window.App.api.service){
			console.log("AppService.enumerate_tasks")
			Deferred.when(window.App.api.service("AppService.enumerate_tasks", [0, 1000]), function(tasks){
				console.log("Enumerate Task Results: ", tasks);
				tasks[0].forEach(function(task){
					// console.log("Get and Update Task: ", task);
					console.log("Checking for task: ", task.id)
					// when(_DataStore.get(task.id), function(oldTask){
					// 	if(!oldTask){
					// 		 console.log("No Old Task, store as new");
					// 		_DataStore.put(task);
					// 	}else if(oldTask.status != task.status){
					// 		console.log("Updating Status of task", task.status)
					// 		_DataStore.put(task);
					// 	}
					// }, function(err){
					// 	console.log("ERROR RETRIEVING TASK ", err)
					// });

					_DataStore.put(task);
				});

				Deferred.when(getJobSummary(), function(msg){
					console.log("Publish Job Summary: ", msg);
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
		}else{
			setTimeout(function(){
				PollJobs();
			}, 1000);
		}
	}

	PollJobs();

	function getJobSummary(){
		//console.log("getJobSummary() from api_service");
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
				//console.log('getJobs()', Jobs);
				return Object.keys(Jobs).map(function(id){
					return Jobs[id];
				});
			});
		},

		getStore: function(){
			return new Observable(_DataStore);
			// return _DataStore;
		}
	}
});
