define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dojo/topic","dojo/_base/lang",
	"dojo/dom-construct","../JobManager"
], function(
	declare, WidgetBase, on,
	domClass,Topic,lang,
	domConstr,JobManager
){
	return declare([WidgetBase], {
		"baseClass": "WorkspaceController",
		"disabled":false,
		postCreate: function(){
			this.inherited(arguments);
			this.domNode.innerHTML="&nbsp;";
		},
		startup: function(){
			Topic.subscribe("/upload", lang.hitch(this,"onUploadMessage"))
			Topic.subscribe("/Jobs",lang.hitch(this,function(msg){
				if (msg!="JobStatusSummary"){
					JobManager.getJobSummary().then(lang.hitch(this,"onJobsMessage"));	
				}
			}));
			JobManager.getJobSummary().then(lang.hitch(this,"onJobsMessage"));

			this._uploadButtons={}
		},

		onJobsMessage: function(msg){
			console.log("OnJobsMessage: ", msg);
			if (msg.type=="JobStatusSummary"){
				console.log("Update Job Summary");

				if (!this.jobSummaryNode){
					console.log("Creating Job Summary Node");
					this.jobSummaryNode = domConstr.create('div',{style:{float:"right","font-size": "1.2em"}}, this.domNode);
				}	
				var Summary = "Jobs <span style='color:blue'>" + (msg.summary.completed||0) + "</span> <span style='color:green'>" + (msg.summary.running||0) + "</span>" + "</span> <span style='color:orange'>" + (msg.summary.queued||0) + "</span>"; 
				console.log("Summary: ", Summary);
				this.jobSummaryNode.innerHTML= Summary;
			}
		},

		onUploadMessage: function(msg){
			console.log("WorkspaceController: ", this);
			if (msg && msg.type == "UploadStart"){
				var b = domConstr.create("div",{innerHTML: msg.filename, "class":"UploadingButton"}, this.domNode);		
				this._uploadButtons[msg.filename]=b;
				return;
			}


			if (msg && msg.type == "UploadProgress"){
				if (this._uploadButtons[msg.filename]){
					this._uploadButtons[msg.filename].innerHTML= msg.filename + "&nbsp;( " + msg.progress + "% )";
				}
				return;
			}

			if (msg && msg.type == "UploadComplete"){
				if (this._uploadButtons[msg.filename]){
					domClass.add(this._uploadButtons[msg.filename],"UploadComplete");
					this._uploadButtons[msg.filename].innerHTML= msg.filename 
//					setTimeout(function(){
//						domConstr.destroy(this._uploadButtons[msg.filename]);
//						delete this._uploadButtons[msg.filename];
//					},30000);
				}
				return;
			}
	
		}
	});
});
