define([
	"dojo/_base/declare","dijit/layout/BorderContainer","dojo/on",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"./WorkspaceExplorerView","dojo/topic","./ItemDetailPanel"
], function(
	declare, BorderContainer, on,
	domClass,ContentPane,domConstruct,
	WorkspaceExplorerView,Topic,ItemDetailPanel
){
	return declare([BorderContainer], {
		"baseClass": "WorkspaceBrowser",
		"disabled":false,
		"path": "/",
		startup: function(){
			if (this._started) {return;}
			var parts = this.path.split("/").filter(function(x){ return x!=""; })
			var out = [];
			var parts = this.path.split("/").filter(function(x){ return x!=""; });
			var len = parts.length;
			var bp = ["workspace"];
			parts.forEach(function(p,idx){
				if (idx == (parts.length-1)){
					out.push(p + "&nbsp;/");
					return;
				}
				out.push("<a class='navigationLink' href='");
				bp.push(p);
				out.push("/" + bp.join("/")+"/")
				out.push("'>" + p + "</a>&nbsp;/");
			})

			out.push("<span style='float:right'>");
			out.push("<a href class='DialogButton' rel='Upload:" + this.path + "'>Upload</a> &nbsp;&nbsp;");
			out.push("<a href class='DialogButton' rel='CreateFolder:" + this.path + "'>Create Folder</a>");
			out.push("</span>");
			this.browserHeader = new ContentPane({content: out.join(""), region: "top"});
			this.explorer = new WorkspaceExplorerView({path: this.path, region: "center"});
			this.detailPanel = new ContentPane({content: "Detail", style:"width:300px", region: "right", splitter: true});
			this.itemDetailPanel = new ItemDetailPanel({region: "right", splitter: true})
			this.itemDetailPanel.startup();
			this.addChild(this.browserHeader);
			this.addChild(this.explorer);
//			this.addChild(this.detailPanel);

			var self=this;
			Topic.subscribe("/select", function(selection){
				if (selection.length==0){
					var done=0;
					self.getChildren().some(function(child){
						if (child===self.detailPanel){
							self.removeChild(self.detailPanel);
							done++;
						}
						if (child===self.itemDetailPanel){
							self.removeChild(self.itemDetailPanel);
							done++;
						}
						if (done>1) { return true; }	
					});
					return;
				}

				if (selection.length==1){
					if (!self.getChildren().some(function(child){
						return child===self.detailPanel
					})){
						self.removeChild(self.detailPanel);
					}

					console.log("Set Item Detail Panel: ", selection[0]);
	
					self.itemDetailPanel.set("item",selection[0]);	

					console.log("itemDetailPanel: ", self.itemDetailPanel);

					if (!self.getChildren().some(function(child){
						return child===self.itemDetailPanel
					})){
						self.addChild(self.itemDetailPanel);
					}
	
				}else{
					if (!self.getChildren().some(function(child){
						return child===self.itemDetailPanel
					})){
						self.removeChild(self.itemDetailPanel);
					}

					if (!self.getChildren().some(function(child){
						return child===self.detailPanel
					})){
						self.addChild(self.detailPanel);
					}
	
					self.detailPanel.set("content", selection.length + " Items Selected");
				}
			});	
			this.inherited(arguments);

		},
		_setPathAttr: function(val){
			console.log("WorkspaceBrowser setPath()", val)
			this.path = val;
			if (this._started){
				var parts = this.path.split("/").filter(function(x){ return x!=""; });
				var len = parts.length;
				var out = [];
				var bp = ["workspace"];
				parts.forEach(function(p,idx){
					if (idx == (parts.length-1)){
						out.push(p + "&nbsp;/");
						return;
					}
					out.push("<a class='navigationLink' href='");
					bp.push(p);
					out.push("/" + bp.join("/")+"/")
					out.push("'>" + p + "</a>&nbsp;/");
				})
				//out.push("<span>" + parts.join("/") + "</span>");
				out.push("<span style='float:right'>");
				out.push("<a href class='DialogButton' rel='Upload:" + this.path + "'>Upload</a> &nbsp;&nbsp;");
				out.push("<a href class='DialogButton' rel='CreateFolder:" + this.path + "'>Create Folder</a>");
				out.push("</span>");

				this.browserHeader.set("content", out.join(""));

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
