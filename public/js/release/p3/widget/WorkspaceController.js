require({cache:{
'url:p3/widget/templates/WorkspaceController.html':"<div>\n\t<div data-dojo-type=\"p3/widget/UploadStatus\" style=\"float:right;\"></div>\n</div>\n"}});
define("p3/widget/WorkspaceController", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dojo/topic","dojo/_base/lang",
	"dojo/dom-construct","../JobManager","../UploadManager",
	"./UploadStatus","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
        "dojo/text!./templates/WorkspaceController.html"
], function(
	declare, WidgetBase, on,
	domClass,Topic,lang,
	domConstr,JobManager,UploadManager,
	UploadStatus,TemplatedMixin,WidgetsInTemplate,
	Template
){
	return declare([WidgetBase,TemplatedMixin,WidgetsInTemplate], {
		"baseClass": "WorkspaceController",
		"disabled":false,
		templateString: Template,
		startup: function(){
			this.inherited(arguments);
			Topic.subscribe("/Jobs",lang.hitch(this,function(msg){
				if (msg!="JobStatusSummary"){
					JobManager.getJobSummary().then(lang.hitch(this,"onJobsMessage"));	
				}
			}));
			JobManager.getJobSummary().then(lang.hitch(this,"onJobsMessage"));
		},

		onJobsMessage: function(msg){
			if (msg.type=="JobStatusSummary"){

				if (!this.jobSummaryNode){
					this.jobSummaryNode = domConstr.create('div',{"style":{"float":"right","font-size": "1.2em"}}, this.domNode);
				}	
				var Summary = "<div style='padding:1px;margin:2px;border-radius:3px;background: #333;color:#333;'> <span style='color:#fff;margin:2px;padding:2px'>Jobs</span> <div style='display:inline-block;background:#efefef;border-radius:2px;margin:2px;padding:2px;'><span style='color:blue'>" + (msg.summary.completed||0) + "</span>&centerdot;<span style='color:green'>" + (msg.summary.running||0) + "</span>" + "&centerdot;<span style='color:orange'>" + (msg.summary.queued||0) + "</span></div></div>"; 
				this.jobSummaryNode.innerHTML= Summary;
				on(this.jobSummaryNode, "click", function(evt){
					Topic.publish("/navigate", {href:"/job/"});
				});
	
			}
		}


	});
});
