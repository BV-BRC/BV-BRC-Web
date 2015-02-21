define([
	"dojo/_base/declare","dijit/layout/BorderContainer","dojo/on",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"../formatter","../../WorkspaceManager","dojo/_base/Deferred"
], function(
	declare, BorderContainer, on,
	domClass,ContentPane,domConstruct,
	formatter,WorkspaceManager,Deferred
){
	return declare([BorderContainer], {
		"baseClass": "FileViewer",
		"disabled":false,
		"filepath": null,
		"file": null,

		_setFileAttr: function(val){
			console.log("setting file: ", val.metadata);
			if (!val) { this.file = {}, this.filepath = ""; return; }
			if (typeof val=="string"){
				this.set("filepath", val);
			}else{
				this.filepath=val.metadata.path + ((val.metadata.path.charAt(-1)=="/")?"":"/") + val.metadata.name;
				this.file=val;
				console.log("this.file before refresh(): ", this.file);
				this.refresh();
			}
		},
		_setFilepathAttr: function(val){
			this.filepath= val;
			var _self=this;
			console.log("set filepath: ", val);
			return Deferred.when(WorkspaceManager.getObjects([val],true),function(meta){
				console.log("FileViewer Obj: ", obj);
				_self.file = { metadata: meta}
				_self.refresh();
			});
		},
		startup: function(){
			if (this._started) {return;}
			this.inherited(arguments);
			this.viewHeader = new ContentPane({content: "File Viewer", region: "top"});
			this.viewer = new ContentPane({region: "center"});
			this.addChild(this.viewHeader);
			this.addChild(this.viewer);
			this.refresh();
		},

		refresh: function(){
			var _self=this;
			if (!this._started) { return; }	
			if (!this.file || !this.file.metadata){
				this.viewer.set("content", "<div class='error'>Unable to load file</div>");
				return;
			}

			if (!this.file.data && this.file.metadata.size && (this.file.metadata.size > 1000000)) {
				var content="<div>File Metadata</div>" +
					"<div>File to large to view directly in the application.</div>"+
 	 				"<pre>"+JSON.stringify(this.file.metadata,null,4)+ "</pre>"
				this.file.data='Unloaded Content';	
				this.viewer.set('content',content);
				return;
			}else if (!this.file.data){
				this.viewer.set("Content", "<div>Loading file content...</div>");
				return Deferred.when(WorkspaceManager.getObjects([this.filepath],false), function(obj){	
					console.log("set file to: ", obj);
					_self.set("file", obj);	
				});
			}

			if (this.file && this.file.metadata){
				if (this.file.metadata.type=="unspecified"){
					console.log("Getting type from filename: ", this.file.metadata.name);

					if (this.file.metadata.name.match(/\.json/)){
						console.log("Matched JSON to ", this.file.metadata.name);
						if (typeof this.file.data != "string") {
							this.file.data = JSON.stringify(this.file.data,null,4);
						}
						console.log("this.file.data: ",typeof this.file.data);
						this.viewer.set('content',"<pre>" + this.file.data + "</pre>");
						return;
					}
					if (this.file.metadata.name.match(/\.txt/)){
						console.log("Matched JSON to ", this.file.metadata.name);
						this.viewer.set('content',"<pre>" + this.file.data + "</pre>");
						return;
					}
				}
			}
		}
	});
});
