define("p3/widget/WorkspaceBrowser", [
	"dojo/_base/declare","dijit/layout/BorderContainer","dojo/on",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"./WorkspaceExplorerView"
], function(
	declare, BorderContainer, on,
	domClass,ContentPane,domConstruct,
	WorkspaceExplorerView
){
	return declare([BorderContainer], {
		"baseClass": "WorkspaceBrowser",
		"disabled":false,
		"path": "/",
		startup: function(){
			if (this._started) {return;}
			var parts = this.path.split("/").filter(function(x){ return x!=""; })
			var out = [];

			parts.forEach(function(p,idx){
				if((idx<1)||(idx==parts.length-1)) { 
					out.push("<span>"+p+"</span>&nbsp;/&nbsp;")
					return;
				}
				if (idx == parts.length-1){
					out.push("<span>" + p + "</span>&nbsp;/")
					return;
				}
				console.log("parts.length: ", parts.length, idx, parts.length-idx)
				out.push('<a href="');
				for (var i=0;(i<(parts.length-idx-1));i++){out.push("../"); }
				out.push('">' + p + "</a>&nbsp;/&nbsp;");
			})
			out.push("<span style='float:right'>");
			out.push("<a href class='DialogButton' rel='Upload:" + this.path + "'>Upload</a> &nbsp;&nbsp;");
			out.push("<a href class='DialogButton' rel='CreateFolder:" + this.path + "'>Create Folder</a>");
			out.push("</span>");
			this.browserHeader = new ContentPane({content: out.join(""), region: "top"});
			this.explorer = new WorkspaceExplorerView({path: this.path, region: "center"});
			this.addChild(this.browserHeader);
			this.addChild(this.explorer);
			this.inherited(arguments);

		},
		_setPathAttr: function(val){
			console.log("WorkspaceBrowser setPath()", val)
			this.path = val;
			if (this._started){
				var parts = this.path.split("/").filter(function(x){ return x!=""; }).slice(0,-1);
				var len = parts.length;
				var out = [];
				parts.forEach(function(p){
					out.push("<a href='");
					for (i=0;i<len--;i++){ out.push("../"); }
					out.push("'>" + p + "</a>");
				})

				this.browserHeader.set("content", out.join("&nbsp;/"));

				console.log("Set Explorer set()", val);
				this.explorer.set("path", val);
			}
		},
		getMenuButtons: function(){
			// console.log("Get Menu Buttons");
	  //       if (this.buttons) { return this.buttons; }
	  //       this.buttons = [];
	  //       var b = domConstruct.create("div", {innerHTML:"Add Folder", 'class':'facetMenuIcon plusIcon',title:"Add Document Comment"});
	  //       on(b, "click", function(){
	  //               Topic.publish("/dialog/show","AddComment");
	  //       });
	  //       this.buttons.push(b);
	  		this.buttons=[];
	        return this.buttons;

		}
	});
});
