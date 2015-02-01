require({cache:{
'url:p3/widget/templates/UploadStatus.html':"<div class=\"UploadStatusButton\">\n\t<span>Uploads</span>\n\t<div>\n\t\t<span class=\"UploadingComplete\" data-dojo-attach-point=\"completedUploadCountNode\">0</span><span class=\"UploadingActive\" data-dojo-attach-point=\"activeUploadCountNode\">0</span><span class=\"UploadingProgress dijitHidden\" data-dojo-attach-point=\"uploadingProgress\"></span>\n\t</div>\n</div>\n"}});
define("p3/widget/UploadStatus", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dojo/topic","dojo/_base/lang",
	"dojo/dom-construct","../JobManager","../UploadManager",
	"dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
        "dojo/text!./templates/UploadStatus.html",
	"dijit/_HasDropDown","dijit/layout/ContentPane"
], function(
	declare, WidgetBase, on,
	domClass,Topic,lang,
	domConstr,JobManager,UploadManager,
	TemplatedMixin,WidgetsInTemplate,template,
	HasDropDown,ContentPane
){

	var UploadSummaryPanel = new ContentPane({content: "No Active Uploads", style:"background:#fff;"});
	return declare([WidgetBase,TemplatedMixin,HasDropDown], {
		"baseClass": "WorkspaceController",
		"disabled":false,
		templateString: template,
		dropDown: UploadSummaryPanel,
		constructor: function(){
			this._uploads={
				inProgress: 0,
				complete: 0,
				progress: 0,
				files: {}
			}
		},
		startup: function(){
			this.inherited(arguments);
			Topic.subscribe("/upload", lang.hitch(this,"onUploadMessage"))
			UploadManager.getUploadSummary().then(lang.hitch(this,"onUploadMessage"));
		},
		onUploadMessage: function(msg){
			console.log("UPLOADMMANAGER MESSAGE: ", msg);
			if (msg && msg.type=="UploadStatSummary"){
				console.log("UploadStatSummary: ", msg.summary);
				this._uploads.inProgress=msg.summary.inProgress;
				this._uploads.complete = msg.summary.complete;
				this._uploads.progress = msg.summary.progress;
				msg.summary.completedFiles.forEach(function(f){
					this._uploads.files[f]={}
				},this);
				this.completedUploadCountNode.innerHTML = this._uploads.complete;
				this.activeUploadCountNode.innerHTML = this._uploads.inProgress;
				this.uploadingProgress.innerHTML = this._uploads.progress + "%"

				if (this._uploads.inProgress <1){
					domClass.add(this.uploadingProgress,"dijitHidden");
				}
				return;

			}

			if (msg && msg.type == "UploadStart"){
				this._uploads.inProgress++;
				this._uploads.files[msg.filename] = {progress:0}
				this.completedUploadCountNode.innerHTML = this._uploads.complete;
				this.activeUploadCountNode.innerHTML = this._uploads.inProgress;
				this.uploadingProgress.innerHTML = this._uploads.progress + "%"
				return;
			}


			if (msg && msg.type == "UploadProgress"){
				console.log("UploadProgress msg: ", msg);
				if (this._uploads.files[msg.filename]){
					this._uploads.files[msg.filename] = msg;
				}

				var content=["<table><tbody>"];
				Object.keys(this._uploads.files).forEach(function(key){
					content.push("<tr><td><a class=\"navigationLink\" href=\"/workspace" + this._uploads.files[key].workspacePath + "\">"+key+"</a></td><td>" + this._uploads.files[key].progress + "%</td></tr>");	
				},this);
				content.push("</tbody></table>");
				console.log("Panel Content: ", content.join(""));
				UploadSummaryPanel.set('content', content.join(""));

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
				this.completedUploadCountNode.innerHTML = this._uploads.complete;
				this.activeUploadCountNode.innerHTML = this._uploads.inProgress;
	
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
