define("p3/widget/viewer/Model", [
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
		"baseClass": "Model",
		"disabled":false,
		"query": null,
		data: null,
		containerType: "model",
		_setDataAttr: function(data){
			this.data = data;	
			console.log("Model Data: ", data);
			this.refresh();
		},
		refresh: function(){
			if (!this._started) { return; }
			if (this.data) {
				var output=['<div><div style="width:370px;" ><h3 style="background:white;" class="section-title normal-case close2x"><span style="background:white" class="wrap">'];
				output.push("Metabolic Model - " + this.data.name + '</span></h3>');

				output.push('<table class="basic stripe far2x" id="data-table"><tbody>');
				if (this.data.autoMeta){
					Object.keys(this.data.autoMeta).forEach(function(key){
						output.push("<tr><td>" + key + "</td><td>" + JSON.stringify(this.data.autoMeta[key]) + "</td></tr>");
					},this);			
				}
				output.push("</tbody></table>");

				this.viewer.set("content", output.join("")); 
			}
		},
		startup: function(){
			console.log("Model Viewer Startup()");
			if (this._started) {return;}
			this.inherited(arguments);
			this.viewer = new ContentPane({content: "Loading Metabolic Model...", region: "center"});
			this.addChild(this.viewer);
			this.refresh();
		
			/*	
			this.on("i:click", function(evt){
				var rel = domAttr.get(evt.target,'rel');
				if (rel) {
					WorkspaceManager.downloadFile(rel);
				}else{
					console.warn("link not found: ", rel);
				}
			});
			*/
		}
	});
});
