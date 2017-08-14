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
		file: null,
		viewable: false,
		url: null,

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

			var _self = this;
			Deferred.when(WS.getDownloadUrls(_self.filepath), function(url){
					_self.url = url;
			});

			if(WS.viewableTypes.indexOf(this.file.metadata.type) >= 0 && this.file.metadata.size <= 10000000){
				this.viewable = true;
			}
			// console.log('[File] viewable?:', this.viewable);

			if(!this.file.data && this.viewable) {
				// get the object to display
				var _self = this;
				Deferred.when(WS.getObject(this.filepath, false), function(obj){
					// console.log('[File] obj:', obj);
					_self.set("file", obj);
				}).then(function(){
					_self.refresh();
				});
			}

			this.refresh();
		},

		formatFileMetaData: function(){
			var output = [];
			var fileMeta = this.file.metadata;
			if(this.file && fileMeta){
				var content = '<div><h3 class="section-title-plain close2x pull-left"><b>' + fileMeta.type + " file</b>: " + fileMeta.name + '</h3>';

				if(WS.downloadTypes.indexOf(fileMeta.type) >= 0){
					content += '<a href='+this.url+'><i class="fa icon-download pull-left fa-2x"></i></a>';
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

			if(this.file && this.file.metadata){
				if (this.viewable) {
					this.viewer.set('content', this.formatFileMetaData());

					if (this.file.data) {
						var childContent = '</br>';
						switch(this.file.metadata.type){
							case "html":
								// console.log('[File] type: html');
								childContent = this.file.data;
								break;
							case "json":
							case "diffexp_experiment":
							case "diffexp_expression":
							case "diffexp_mapping":
							case "diffexp_sample":
								// console.log('[File] type: json');
								childContent = '<pre style="font-size:.8em; background-color:#ffffff;">' + JSON.stringify(JSON.parse(this.file.data || null),null,2)  + "</pre>";
								break;
							case "svg":
							case "gif":
							case "png":
							case "jpg":
							case "txt":
							default:
								// console.log('[File] type: txt/img');
								childContent = '<pre style="font-size:.8em; background-color:#ffffff;">' + this.file.data + '</pre>';
								break;
						}
						this.viewer.addChild(new ContentPane({content: childContent, region: "center"}));
					} else {
						this.viewer.addChild(new ContentPane({content: '<pre style="font-size:.8em; background-color:#ffffff;">Loading file preview.  Content will appear here when available.  Wait time is usually less than 10 seconds.</pre>', region: "center"}));
					}
				} else {
					this.viewer.set('content', this.formatFileMetaData());
				}
			}
		}
	});
});
