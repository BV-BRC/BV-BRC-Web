define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dojo/topic","dojo/_base/lang",
	"dojo/dom-construct","../JobManager","../UploadManager"
], function(
	declare, WidgetBase, on,
	domClass,Topic,lang,
	domConstr,JobManager,UploadManager
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
			this._uploads={
				inProgress: 0,
				complete: 0,
				progress: 0,
				files: {}
			}

			UploadManager.getUploadSummary().then(lang.hitch(this,"onUploadMessage"));
		},

		onJobsMessage: function(msg){
			console.log("OnJobsMessage: ", msg);
			if (msg.type=="JobStatusSummary"){
				console.log("Update Job Summary");

				if (!this.jobSummaryNode){
					console.log("Creating Job Summary Node");
					this.jobSummaryNode = domConstr.create('div',{"style":{"float":"right","font-size": "1.2em"}}, this.domNode);
				}	
				var Summary = "<div style='padding:1px;margin:2px;border-radius:3px;background: #333;color:#333;'> <span style='color:#fff;margin:2px;padding:2px'>Jobs</span> <div style='display:inline-block;background:#efefef;border-radius:2px;margin:2px;padding:2px;'><span style='color:blue'>" + (msg.summary.completed||0) + "</span>&centerdot;<span style='color:green'>" + (msg.summary.running||0) + "</span>" + "&centerdot;<span style='color:orange'>" + (msg.summary.queued||0) + "</span></div></div>"; 
				console.log("Summary: ", Summary);
				this.jobSummaryNode.innerHTML= Summary;
			}
		},

		onUploadMessage: function(msg){
			console.log("WorkspaceController: ", this);
			if (msg && msg.type=="UploadStatSummary"){
				console.log("UploadStatSummary: ", msg.summary);
				this._uploads.inProgress=msg.summary.inProgress;
				this._uploads.complete = msg.summary.complete;
				this._uploads.progress = msg.summary.progress;
				msg.summary.completedFiles.forEach(function(f){
					this._uploads[f]={}
				},this);
				if (!this.uploadStatusButton) {
					this.uploadStatusButton = domConstr.create("div",{"style":{"float":"right","font-size": "1.2em"}}, this.domNode);		
					var wrapper = domConstr.create("div",{'class':"UploadStatusButton",innerHTML: "<span>Uploads</span>"}, this.uploadStatusButton);
					var innerWrap = domConstr.create("div",{},wrapper);
					this.uploadTotalCount = domConstr.create("span",{"class":"UploadStatusMarker", innerHTML: this._uploads.complete},innerWrap);
					
					this.uploadingCount = domConstr.create("span",{"class":"UploadStatusMarker", innerHTML: this._uploads.inProgress},innerWrap);
					this.uploadingProgress = domConstr.create("span",{innerHTML: this._uploads.progress + "%"},innerWrap);
				}else{
					this.uploadTotalCount.innerHTML = this._uploads.complete;
					this.uploadingCount.innerHTML = this._uploads.inProgress;
					this.uploadingProgress.innerHTML = this._uploads.progress + "%"
				}

				if (this._uploads.inProgress <1){
					domClass.add(this.uploadingProgress,"dijitHidden");
				}
				return;

			}

			if (msg && msg.type == "UploadStart"){
				this._uploads.inProgress++;
				this._uploads.files[msg.filename] = {}
		
				if (!this.uploadStatusButton) {
					this.uploadStatusButton = domConstr.create("div",{"style":{"float":"right","font-size": "1.2em"}}, this.domNode);		
					var wrapper = domConstr.create("div",{'class':"UploadStatusButton",innerHTML: "<span>Uploads</span>"}, this.uploadStatusButton);
					var innerWrap = domConstr.create("div",{},wrapper);
					this.uploadTotalCount = domConstr.create("span",{innerHTML: this._uploads.complete},innerWrap);
					this.uploadingCount = domConstr.create("span",{innerHTML: this._uploads.inProgress},innerWrap);
					this.uploadingProgress = domConstr.create("span",{innerHTML: this._uploads.progress},innerWrap);
				}else{
					this.uploadTotalCount.innerHTML = this._uploads.complete;
					this.uploadingCount.innerHTML = this._uploads.inProgress;
					this.uploadingProgress.innerHTML = this._uploads.progress + "%"
				}

				return;
			}


			if (msg && msg.type == "UploadProgress"){
				if (this._uploads[msg.filename]){
					this._uploads[msg.filename] = msg;
				}
				UploadManager.getUploadSummary().then(lang.hitch(this, function(res){
					var stats = res.summary;
					console.log("getUploadSummary cb stats: ", res);
					console.log("Stats.progress: ", stats.progress);

					this._uploads.progress = stats.progress;
					console.log("this._uploads.progress: ", this._uploads.progress, this._uploads);
					this.uploadingProgress.innerHTML = this._uploads.progress + "%";
					if (this._uploads.inProgress>0){
						domClass.remove(this.uploadingProgress,"dijitHidden");
					}
				}));
				return;
			}

			if (msg && msg.type == "UploadComplete"){
				this._uploads.inProgress--;
				this._uploads.complete++
				this.uploadTotalCount.innerHTML = this._uploads.complete;
				this.uploadingCount.innerHTML = this._uploads.inProgress;
	
				if (this._uploads.inProgress<1){
					domClass.add(this.uploadingProgress, "dijitHidden");			
				}


//				if (this._uploadButtons[msg.filename]){
//					domClass.add(this._uploadButtons[msg.filename],"UploadComplete");
//					this._uploadButtons[msg.filename].innerHTML= msg.filename 
//					setTimeout(function(){
//						domConstr.destroy(this._uploadButtons[msg.filename]);
//						delete this._uploadButtons[msg.filename];
//					},30000);
//				}
				return;
			}
	
		}
	});
});
