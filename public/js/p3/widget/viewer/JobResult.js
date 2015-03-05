define([
	"dojo/_base/declare","dijit/layout/BorderContainer","dojo/on",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"../PageGrid","../formatter","../../WorkspaceManager","dojo/_base/lang",
	"dojo/dom-attr"
], function(
	declare, BorderContainer, on,
	domClass,ContentPane,domConstruct,
	Grid,formatter,WorkspaceManager,lang,
	domAttr
){
	return declare([BorderContainer], {
		"baseClass": "ExperimentViewer",
		"disabled":false,
		"query": null,
		data: null,
		_setDataAttr: function(data){
			this.data = data;	
			console.log("job result viewer data: ", data);
			var paths = this.data.autoMeta.output_files.map(function(o){
				return o[0];
			});

			WorkspaceManager.getObjects(paths,true).then(lang.hitch(this, function(objs){
				this._resultObjects = objs;
				console.log("got objects: ", objs);
				this.refresh();
			}));

		},
		refresh: function(){
			if (this.data) {
				if (this.data.autoMeta && this.data.autoMeta.app){
					this.viewHeader.set('content', this.data.autoMeta.app.id + " Job Result");
				}
				var output = ["<div>"];

				if (this.data.userMeta) {
					Object.keys(this.data.userMeta).forEach(function(prop){
						output.push("<div>" + prop + ": " + this.data.userMeta[prop] + "</div>");
					},this);
				}

				if (this.data.autoMeta) {
					Object.keys(this.data.autoMeta).forEach(function(prop){
						if (prop=="output_files") { return; }
						if (prop=="app") { return; }
						if (prop=="job_output") { return; }
						if (prop=="hostname") { return; }

						output.push("<div>" +prop + ": " + this.data.autoMeta[prop] + "</div>");
					},this);
				}
				if (this._resultObjects) {
					output.push("<h2>Result Files</h2> ");
					output.push('<table><tbody>');
					this._resultObjects.forEach(function(obj){
						output.push("<tr>");
						output.push('<td><i class="fa fa-download fa-2x" rel="' + obj.path + "/" + obj.name +  '" /></td>');
						output.push("<td>" + obj.name + "</td>");
						output.push("<td>" + obj.type+ "</td>");
						output.push("<td>" + obj.size + "</td>");
						Object.keys(obj.autoMeta).forEach(function(prop){
							if (!obj.autoMeta[prop]) { return; }
							output.push("<td>");
							output.push(prop + ": " + obj.autoMeta[prop]);
							output.push("</td>");
						});
						output.push("</tr>");
					});
					output.push("</tbody></table>");
				}

				output.push("</div>");	
				this.viewer.set("content", output.join("")); 
			}
		},
		startup: function(){
			if (this._started) {return;}
			this.inherited(arguments);
			this.viewHeader = new ContentPane({content: "Loading Job Results...", region: "top"});
			this.viewer= new ContentPane({content: "", region: "center"});
			this.addChild(this.viewHeader);
			this.addChild(this.viewer);

			
			this.on("i:click", function(evt){
				var rel = domAttr.get(evt.target,'rel');
				if (rel) {
					WorkspaceManager.downloadFile(rel);
				}else{
					console.warn("link not found: ", rel);
				}
			});
		}
	});
});
