define("p3/widget/viewer/File", [
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../../WorkspaceManager", "dojo/_base/Deferred", "dojo/dom-attr", "dojo/_base/array"
], function(declare, BorderContainer, on,
			domClass, ContentPane, domConstruct,
			formatter, WS, Deferred, domAttr, array){
	return declare([BorderContainer], {
		baseClass: "FileViewer",
		disabled: false,
		containerType: "file",
		filepath: null,
		file: null,

		_setFileAttr: function(val){
			//console.log('[File] _setFileAttr:', val);
			if(!val){
				this.file = {}, this.filepath = "", this.url = "";
				return;
			}
			if(typeof val == "string"){
				this.set("filepath", val);
			}else{
				this.filepath =
					'path' in val.metadata ?
						val.metadata.path +
						((val.metadata.path.charAt(val.metadata.path.length - 1) == "/") ? "" : "/")
					 	+ val.metadata.name : '/'

				this.file = val;
				this.refresh();
			}
		},
		_setFilepathAttr: function(val){
			//console.log('[File] _setFilepathAttr:', val);
			this.filepath = val;
			var _self = this;
			return Deferred.when(WS.getObject(val, true), function(meta){
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
					WS.downloadFile(rel);
				}else{
					console.warn("link not found: ", rel);
				}
			});
		},

		formatFileMetaData: function(){
			var output = [];
			var fileMeta = this.file.metadata;
			if(this.file && fileMeta){
				var content = '<div><h3 class="section-title-plain close2x pull-left"><b>' + fileMeta.type + " file</b>: " + fileMeta.name + '</h3>';

				if(WS.downloadTypes.indexOf(fileMeta.type) >= 0){
					content += ' <i class="fa icon-download pull-left fa-2x" rel="' + this.filepath + '"></i>';
				}

				var formatLabels = formatter.autoLabel("fileView", fileMeta);
				content += formatter.keyValueTable(formatLabels);
				content += "</tbody></table></div>";
			}

			return content;
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

			//console.log('[File] file:', this.file);
			var viewable = false;
			if(WS.viewableTypes.indexOf(this.file.metadata.type) >= 0){
				viewable = true;
			}
			//console.log('[File] viewable?:', viewable);

			if(!this.file.data && viewable && this.file.metadata.size <= 10000000) {
				// get the object to display
				Deferred.when(WS.getObject(this.filepath, false), function(obj){
					//console.log('[File] obj:', obj);
					_self.set("file", obj);
				});
			}

			if(!this.url && viewable){
				// get the download url
				Deferred.when(WS.getDownloadUrls(this.filepath), function(url){
					//console.log('[File] url:', url);
					_self.set("url", url);
				});
			}

			if(this.file && this.file.metadata){
				if (viewable) {
					//this.viewer.set('content', this.formatFileMetaData() + "<pre>" + this.file.data + "</pre>");
					this.viewer.set('content', this.formatFileMetaData());

					if (this.file.data) {
						var childContent = '</br>';
						switch(this.file.metadata.type){
							case "html":
								//console.log('[File] type: html');
								childContent = this.file.data;
								break;
							case "json":
							case "diffexp_experiment":
							case "diffexp_expression":
							case "diffexp_mapping":
							case "diffexp_sample":
								//console.log('[File] type: json');
								childContent = '<pre style="font-size:.8em; background-color:#ffffff;">' + JSON.stringify(JSON.parse(this.file.data || null),null,2)  + "</pre>";
								break;
							case "svg":
							case "gif":
							case "png":
							case "jpg":
							case "txt":
							default:
								//console.log('[File] type: txt/img');
								childContent = '<pre style="font-size:.8em; background-color:#ffffff;">' + this.file.data + '</pre>';
								break;
						}
						this.viewer.addChild(new ContentPane({content: childContent, region: "center"}));
					}
				} else {
					this.viewer.set('content', this.formatFileMetaData());
				}
			}
		}
	});
});
