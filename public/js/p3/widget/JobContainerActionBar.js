define([
	"dojo/_base/declare", "./ActionBar", "dojo/dom-construct", "dojo/dom-style", "dojo/on",
	"dijit/form/Button", "dijit/form/Select", "dojo/topic", "dojo/query", "../JobManager",
], function(
	declare, ActionBar, domConstruct, domStyle, on,
	Button, Select, Topic, query, JobManager){
	return declare([ActionBar], {
		path: null,
		loadingHTML:
			'<img src="/patric/images/loader.gif" style="vertical-align: middle;" height="20"/> '+
			'<span>loading...</span>',
		postCreate: function(){
			this.inherited(arguments);
			this.container = domConstruct.create("div", {}, this.domNode);
			this.containerNode = domConstruct.create("div", {
				"class": "",
				"style": "border: none;"
			}, this.domNode);
		},

		startup: function(){
			var self = this;

			this.gutters = false
			domStyle.set(this.domNode, {
				border: 'none',
				margin: '10px 0 0 0',
				padding: '5px'
			})

			/**
			 * add header/ title
			 */
			if(this.header){
				var header = domConstruct.create("b", {
					style: {
						fontSize: '1.2em',
						float: 'left',
						lineHeight: '.8em'
					},
					innerHTML: this.header + '<br>'
				}, this.container);

				var lastUpdated = domConstruct.create("span", {
					style: {
						fontSize: '.5em',
						color: '#666'
					},
					innerHTML: self.loadingHTML
				});
				domConstruct.place(lastUpdated, header, 'last');
			}


			/**
			 * add option containers
			 */
			var options = domConstruct.create("span", {
				style: {
					float: 'right'
				}
			}, this.container);

			var filters = domConstruct.create("span", {
				style: {
					float: 'right'
				}
			}, options);

			var appFilter = domConstruct.create("span", {
				style: {
					float: 'right'
				}
			}, options);

			/**
			 * app filter
			 */
			var selector = new Select({
				name: "type",
				style: {
					width: '150px', float: 'right', marginRight: '30px'
				},
				options: [
					{ label: "All Apps", value: "all", selected: true}
				]
			}, appFilter)

			this.appFilter = 'all';
			on(selector, 'change', function(val){
				self.appFilter = val;
				Topic.publish('/JobFilter', {app: val});
			})

			// initialize app filters
			var apps = self.getFilterLabels(JobManager.getStore().data);
			selector.set("options", apps).reset();


			/**
			 * status filters / counts
			 */
			var queuedBtn = domConstruct.create("span", {
				class: 'JobsFilter',
				innerHTML: '<i class="icon-tasks Queued"></i> ' +
					'<span>-</span> queued',
				style: {
					fontSize: '1.2em',
					margin: '0 0.8em'
				}
			}, filters);

			var inProgressBtn = domConstruct.create("span", {
				class: 'JobsFilter',
				innerHTML: '<i class="icon-play22 JobsRunning"></i> ' +
					'<span>-</span> running',
				style: {
					fontSize: '1.2em',
					margin: '0 0.8em'
				}
			}, filters);

			var completedBtn = domConstruct.create("span", {
				innerHTML: '<i class="icon-checkmark2 JobsCompleted"></i> ' +
					'<span>-</span> completed',
				style: {
					fontSize: '1.2em',
					margin: '0 0.8em'
				}
			}, filters);


			var failedBtn = domConstruct.create("span", {
				innerHTML: '<i class="icon-warning2 JobsFailed"></i> ' +
					'<span>-</span> failed',
				style: {
					fontSize: '1.2em',
					margin: '0 0.8em'
				}
			}, filters);

			/* not used in favor of listening for changes
			var refreshBtn = new Button({
				style: { float: 'right', paddingBottom: '5px' },
				label: '<i class="icon-refresh"></i>',
				onClick: function(){

				}
			}, refreshArea).startup();
			*/

			// listen for job status counts
			var loadingJobList = false;
			Topic.subscribe('/JobStatus', function(status){
				query('span', queuedBtn)[0].innerHTML = status.queued
				query('span', inProgressBtn)[0].innerHTML = status.inProgress
				query('span', completedBtn)[0].innerHTML = status.completed
				query('span', failedBtn)[0].innerHTML = status.failed

				if(!loadingJobList)
					lastUpdated.innerHTML = "Last updated: " + self.getTime();
			})

			// listen for job app types and loading status
			Topic.subscribe('/Jobs', function(info){
				if(info.status == 'loading'){
					lastUpdated.innerHTML = self.loadingHTML;
					loadingJobList = true;
				}else if(info.status == 'updated'){
					var labels = self.getFilterLabels(info.jobs);
					selector.set("options", labels).reset();

					lastUpdated.innerHTML = "Last updated: " + self.getTime();
					loadingJobList = false;
				}else if(info.status == 'filtered'){
					var labels = self.getFilterLabels(info.jobs);
					selector.set("options", labels)

					lastUpdated.innerHTML = "Last updated: " + self.getTime();
					loadingJobList = false;
				}
			})


			this.inherited(arguments);
		},


		// returns current time in HH:MM:SS, 12 hour format
		getTime: function(){
			var time = new Date().toTimeString().split(' ')[0];
			var hours = parseInt(time.split(':')[0]);
			hours = (hours + 11) % 12 + 1;
			return hours + time.slice(time.indexOf(':'));
		},


		getFilterLabels: function(jobs){
			var self = this;
			// count by apps
			var info = {};
			jobs.forEach(function(job){
				info[job.app] = job.app in info ? info[job.app] + 1 : 1;
			})

			// organize options by app count
			var apps = []
			var facet = {label: "All Apps", value: "all"};
			if(self.appFilter == 'all') facet.selected = true;
			apps.push(facet)

			for (var k in info) {
				var facet = {
					label: k + ' (' + info[k] + ')',
					value: k,
					count: info[k]
				};
				if(k == this.appFilter) facet.selected = true;
				apps.push(facet)
			};
			apps.sort(function(a, b) { return a.count - b.count; });

			return apps;
		}

	});
});
