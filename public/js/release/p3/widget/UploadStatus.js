require({cache:{
'url:p3/widget/templates/UploadStatus.html':"<div class=\"UploadStatusButton\">\n\t<div class=\"UploadStatusUpload\"><i class=\"DialogButton fa icon-upload fa\" style=\"font-size:1.5em;  vertical-align:middle;\" rel=\"Upload:\" ></i></div>\n\t<div data-dojo-attach-point=\"focusNode\" class=\"UploadStatusArea\">\n\t\t<span>Uploads</span>\n\t\t<span data-dojo-attach-point=\"uploadStatusCount\" class=\"UploadStatusCounts dijitHidden\">\n\n\t\t\t<i class=\"icon-play22 UploadsRunning\"></i>\n\t\t\t<span data-dojo-attach-point=\"activeUploadCountNode\">0</span>\n\n\t\t\t<span class=\"divider\"></span>\n\n\t\t\t<i class=\"icon-checkmark2 UploadsCompleted\"></i>\n\t\t\t<span data-dojo-attach-point=\"completedUploadCountNode\">0</span>\n\n\n\t\t\t<span class=\"UploadingProgress dijitHidden\" data-dojo-attach-point=\"uploadingProgress\"></span>\n\t\t</span>\n\t</div>\n</div>\n"}});
define("p3/widget/UploadStatus", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dojo/topic", "dojo/_base/lang",
	"dojo/dom-construct", "../JobManager", "../UploadManager",
	"dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/UploadStatus.html",
	"dijit/_HasDropDown", "dijit/layout/ContentPane",
	"dijit/Tooltip"
], function(declare, WidgetBase, on,
			domClass, Topic, lang,
			domConstr, JobManager, UploadManager,
			TemplatedMixin, WidgetsInTemplate, template,
			HasDropDown, ContentPane, Tooltip){

	var UploadSummaryPanel = new ContentPane({
		content: "<div style='border:2px solid #34698e;padding:2px;margin:0px;'>No Active Uploads</div>",
		style: "padding:0px;background:#fff;"
	});
	return declare([WidgetBase, TemplatedMixin, HasDropDown], {
		"baseClass": "WorkspaceController",
		"disabled": false,
		templateString: template,
		dropDown: UploadSummaryPanel,
		constructor: function(){
			this._uploads = {
				inProgress: 0,
				complete: 0,
				progress: 0,
				files: {}
			}
		},
		startup: function(){
			this.inherited(arguments);
			Topic.subscribe("/upload", lang.hitch(this, "onUploadMessage"))
			UploadManager.getUploadSummary().then(lang.hitch(this, "onUploadMessage"));
			this.tooltip = new Tooltip({
				connectId: [this.uploadStatusCount],
				label: ' <i class="icon-play22 JobsRunning"></i> In progress | ' +
					'<i class="icon-checkmark2 JobsCompleted"></i> Completed | ' +
					'% Complete',
				position: ["above"]
			});
		},
		onUploadMessage: function(msg){
			if(msg && msg.type == "UploadStatSummary"){

				this._uploads.inProgress = msg.summary.inProgress;
				this._uploads.complete = msg.summary.complete;
				this._uploads.progress = msg.summary.progress;
				msg.summary.completedFiles.forEach(function(f){
					this._uploads.files[f] = {}
				}, this);
				this.completedUploadCountNode.innerHTML = this._uploads.complete;
				this.activeUploadCountNode.innerHTML = this._uploads.inProgress;
				this.uploadingProgress.innerHTML = this._uploads.progress + "%"

				if(this._uploads.inProgress < 1){
					domClass.add(this.uploadingProgress, "dijitHidden");
				}
				return;

			}

			if(msg && msg.type == "UploadStart"){
				this._uploads.inProgress++;
				this._uploads.files[msg.filename] = {progress: 0}
				this.completedUploadCountNode.innerHTML = this._uploads.complete;
				this.activeUploadCountNode.innerHTML = this._uploads.inProgress;
				this.uploadingProgress.innerHTML = this._uploads.progress + "%"
				return;
			}

			if(msg && msg.type == "UploadProgress"){
				if(this._uploads.files[msg.filename]){
					this._uploads.files[msg.filename] = msg;
				}

				var content = ["<div style='border:2px solid #34698e;padding:2px;margin:0px;'><table><tbody>"];
				Object.keys(this._uploads.files).forEach(function(key){
					content.push("<tr><td><a class=\"navigationLink\" href=\"/workspace" + this._uploads.files[key].workspacePath + "\">" + key + "</a></td><td>" + this._uploads.files[key].progress + "%</td></tr>");
				}, this);
				content.push("</tbody></table></div>");
				UploadSummaryPanel.set('content', content.join(""));

				UploadManager.getUploadSummary().then(lang.hitch(this, function(res){
					var stats = res.summary;

					this._uploads.progress = stats.progress;

					this.uploadingProgress.innerHTML = this._uploads.progress + "%";
					if(this._uploads.inProgress > 0){
						domClass.remove(this.uploadStatusCount, "dijitHidden");
						domClass.remove(this.uploadingProgress, "dijitHidden");
					}

				}));
				return;
			}

			if(msg && msg.type == "UploadComplete"){
				this._uploads.inProgress--;
				this._uploads.complete++
				this.completedUploadCountNode.innerHTML = this._uploads.complete;
				this.activeUploadCountNode.innerHTML = this._uploads.inProgress;

				if(this._uploads.inProgress < 1){
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
