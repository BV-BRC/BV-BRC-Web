define("p3/widget/viewer/File", [
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../../WorkspaceManager", "dojo/_base/Deferred", "dojo/dom-attr", "dojo/_base/array"
], function(declare, BorderContainer, on,
			domClass, ContentPane, domConstruct,
			formatter, WorkspaceManager, Deferred, domAttr, array){
	return declare([BorderContainer], {
		"baseClass": "FileViewer",
		"disabled": false,
		containerType: "file",
		"filepath": null,
		"file": null,

		_setFileAttr: function(val){
			console.log("setting file: ", val);
			if(!val){
				this.file = {}, this.filepath = "";
				return;
			}
			if(typeof val == "string"){
				this.set("filepath", val);
			}else{
				this.filepath = val.metadata.path + ((val.metadata.path.charAt(val.metadata.path.length - 1) == "/") ? "" : "/") + val.metadata.name;
				console.log("filepath: ", this.filepath);
				this.file = val;
				console.log("this.file before refresh(): ", this.file);
				this.refresh();
			}
		},
		_setFilepathAttr: function(val){
			this.filepath = val;
			var _self = this;
			console.log("set filepath: ", val);
			return Deferred.when(WorkspaceManager.getObject(val, true), function(meta){
				console.log("FileViewer Obj: ", obj);
				_self.file = {metadata: meta}
				_self.refresh();
			});
		},
		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			this.viewHeader = new ContentPane({content: "", region: "top"});
			this.viewer = new ContentPane({region: "center"});
			this.addChild(this.viewHeader);
			this.addChild(this.viewer);
			this.refresh();

			this.on("i:click", function(evt){
				var rel = domAttr.get(evt.target, 'rel');
				if(rel){
					WorkspaceManager.downloadFile(rel);
				}else{
					console.warn("link not found: ", rel);
				}
			});
		},

		formatFileMetaData: function(){
			var output = [];
			var header = '<div><div style="width:370px;" ><h3 style="background:white;" class="section-title normal-case close2x"><span style="background:white;margin-right:10px;" class="wrap">';
			if(this.file && this.file.metadata){
				header = header + this.file.metadata.type + " file: " + this.file.metadata.name + '</span>'
				if(array.indexOf(WorkspaceManager.downloadTypes, this.file.metadata.type) >= 0){
					header = header + '<i class="fa icon-download fa" rel="' + this.filepath + '" />';
				}
				header = header + '</h3>';
				output.push(header);
				var formatLabels = formatter.autoLabel("fileView", this.file.metadata);
				output.push('<table class="basic stripe far2x" id="data-table"><tbody>');
				Object.keys(formatLabels).forEach(function(key){
					output.push('<tr class="alt"><th scope="row" style="width:20%"><b>' + formatLabels[key]["label"] + '</b></th><td class="last">' + formatLabels[key]["value"] + "</td></tr>");
				}, this);
				output.push("</tbody></table></div>");
			}
			return output.join("");
		},

		refresh: function(){
			var _self = this;
			if(!this._started){
				return;
			}
			if(!this.file || !this.file.metadata){
				this.viewer.set("content", "<div class='error'>Unable to load file</div>");
				return;
			}

			if(!this.file.data && this.file.metadata.size && (this.file.metadata.size > 1000000)){
				var content = this.formatFileMetaData();
				this.file.data = 'Unloaded Content';
				this.viewer.set('content', content);
				return;
			}else if(!this.file.data){
				this.viewer.set("Content", "<div>Loading file content...</div>");
				return Deferred.when(WorkspaceManager.getObject(this.filepath, false), function(obj){
					console.log("set file to: ", obj);
					_self.set("file", obj);
				});
			}

			if(this.file && this.file.metadata){
				if(this.file.metadata.type == "unspecified"){
					console.log("Getting type from filename: ", this.file.metadata.name);

					if(this.file.metadata.name.match(/\.json/)){
						console.log("Matched JSON to ", this.file.metadata.name);
						if(typeof this.file.data != "string"){
							this.file.data = JSON.stringify(this.file.data, null, 4);
						}else{
							this.file.data = JSON.stringify(JSON.parse(this.file.data), null, 4)
						}
						console.log("this.file.data: ", typeof this.file.data);
						this.viewer.set('content', this.formatFileMetaData + "<pre>" + this.file.data + "</pre>");
						return;
					}
					if(this.file.metadata.name.match(/\.txt/)){
						console.log("Matched JSON to ", this.file.metadata.name);
						this.viewer.set('content', this.formatFileMetaData + "<pre>" + this.file.data + "</pre>");
						return;
					}
				}
				this.viewer.set('content', this.formatFileMetaData + "<pre>" + this.file.data + "</pre>");

			}
		}
	});
});
