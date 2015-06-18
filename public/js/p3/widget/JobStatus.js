define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dojo/topic","dojo/_base/lang",
	"dojo/dom-construct","../JobManager",
	"dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
        "dojo/text!./templates/JobStatus.html",
	"dijit/_HasDropDown","dijit/layout/ContentPane",
	"dijit/Tooltip"
], function(
	declare, WidgetBase, on,
	domClass,Topic,lang,
	domConstr,JobManager,
	TemplatedMixin,WidgetsInTemplate,template,
	HasDropDown,ContentPane,Tooltip
){

	var UploadSummaryPanel = new ContentPane({content: "No Active Uploads", style:"background:#fff;"});
	return declare([WidgetBase,TemplatedMixin], {
		"baseClass": "WorkspaceController",
		"disabled":false,
		templateString: template,
		dropDown: UploadSummaryPanel,
		constructor: function(){
			this._jobstatus={
				inProgress: 0,
				complete: 0,
				queued: 0,
				failed:0
			}
		},
		startup: function(){
			this.inherited(arguments);
			Topic.subscribe("/Jobs", lang.hitch(this,"onJobMessage"))
			JobManager.getJobSummary().then(lang.hitch(this,"onJobMessage"));
			this.tooltip = new Tooltip({
				connectId: [this.domNode],
				label: " Completed &middot; In progress &middot; Queued &middot; Suspended",
				position: ["above"]
			});
		},
		openJobs: function(){
			Topic.publish("/navigate", {href: "/job/"});
		},
		onJobMessage: function(msg){
			//console.log("Job Message: ", msg);
			if (msg && msg.type=="JobStatusSummary"){
				//console.log("JobStatusSummary: ", msg.summary);
				this._jobstatus.inProgress=msg.summary['in-progress']||0;
				this._jobstatus.complete = msg.summary.completed||0;
				this._jobstatus.queued= (msg.summary.queued)||0 + (msg.summary.pending||0) + (msg.summary.init||0);;
				this._jobstatus.failed= msg.summary.failed||0;
				//console.log("this._jobstatus: ", this._jobstatus);
				this.jobsCompleteNode.innerHTML = this._jobstatus.complete;
				this.jobsRunningNode.innerHTML = this._jobstatus.inProgress;
				this.jobsQueuedNode.innerHTML = this._jobstatus.queued;
				this.jobsSuspendedNode.innerHTML = this._jobstatus.failed;
				return;
			}
	
		}
	});
});
