define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dojo/dom-construct", "./JobsGrid",
	"dojo/_base/Deferred", "dojo/dom-geometry","../JobManager",
	"dojo/topic"
], function(
	declare, WidgetBase, on,
	domClass, domConstr, JobsGrid,
	Deferred, domGeometry,JobManager,
	Topic
) {
	return declare([JobsGrid], {
		"disabled": false,
		path: "/",

		listJobs: function() {
			return Deferred.when(JobManager.getJobs(),function(res){ return res; }, function(err) {
				console.log("Error Getting Jobs:", err);
				_self.showError(err);
			})
		},
		postCreate: function(){
			this.inherited(arguments);
			domClass.add(this.domNode, "JobManager");
		},

		showError: function(err) {
			var n = domConstr.create("div", {
				style: {
					position: "relative",
					zIndex: 999,
					padding: "10px",
					margin: "auto",
					"margin-top": "300px",
					width: "30%",
					border: "2px solid #aaa",
					"border-radius": "4px",
					"text-align": "center",
					color: "red",
					"font-size": "1.2em"
				},
				innerHTML: err
			}, this.domNode);
	
		},
//		queryOptions: {
//			sort: [{attribute: "submit_time", descending: false}]
//		},

		render: function(items) {
			items.sort(function(a,b){
				return (Date.parse(a.submit_time) < Date.parse(b.submit_time))?1:-1;
			});
			this.refresh();
			this.renderArray(items);
		},

		startup: function() {
			if (this._started) {
				return;
			}
			this.inherited(arguments);

			var _self = this;

			this.listJobs().then(function(jobs) {
				_self.render(jobs);
			})

			Topic.subscribe("/Jobs", function(msg){
				console.log("REFRESH JOBS ARRAY");
				_self.listJobs().then(function(jobs) {
					_self.render(jobs);
				})
			});

		}
	});
});
