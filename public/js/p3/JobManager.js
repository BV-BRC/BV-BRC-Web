define(["dojo/_base/Deferred","dojo/topic"], 

function(Deferred,Topic){
	console.log("Start Job Manager");
	var Jobs = {}
	var ready = new Deferred();
	var firstRun=true;

	function PollJobs() {
		if (window.App && window.App.api && window.App.api.service) {
			Deferred.when(window.App.api.service("AppService.enumerate_tasks",[0,50]), function(tasks){
//				console.log("tasks: ", tasks);
				tasks[0].forEach(function(task){
					if (!Jobs[task.id]){
						Jobs[task.id]=task;
						Topic.publish("/Jobs", {type: "JobStatus", job: task});
					}else{
						if (Jobs[task.id].status != task.status){
							var oldJob= Jobs[task.id];
							Jobs[task.id] = task;
							Topic.publish("/Jobs", {type: "JobStatusChanged", job: task, status: task.status, oldStatus: oldJob.status});	
						}else{
							Jobs[task.id]=task;
						}
					}

				});
				if (firstRun){
					ready.resolve(true);	
					firstRun=false;	
				}
				setTimeout(function(){
					PollJobs();
				},10000)
			});
		}else{
			setTimeout(function(){
				PollJobs();
			},1000);
		}
	}
	
	PollJobs();

	return {
		getJobSummary: function(){
			console.log("getJobSummary()");
			var def = new Deferred();
			var summary = {total: 0}
			Deferred.when(ready, function(){
				Object.keys(Jobs).forEach(function(id){
					var job = Jobs[id];
					summary.total++;
					if (!summary[job.status]){
						summary[job.status]=1;
					}else{
						summary[job.status]++;
					}
				});
				def.resolve({type: "JobStatusSummary",summary: summary});
			});

			return def.promise;
		}
	}

})
