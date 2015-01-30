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
//			this.actionPanel = new ContentPane({content: '<div style="width:40px;height:40px;border:1px solid gray;margin-2px;margin-top:4px;margin-bottom:4px;"></div><div style="width:40px;height:40px;border:1px solid gray;margin-2px;margin-top:4px;margin-bottom:4px;"></div>',region: right, style: "width:44px;background:#efefef;", splitter: false, region: "right"});

			this.actionPanel = new ContentPane({region: "right",style: "width:44px;background:#efefef;", content: '<div style="width:40px;height:40px;border:1px solid gray;margin-2px;margin-top:4px;margin-bottom:4px;"></div><div style="width:40px;height:40px;border:1px solid gray;margin-2px;margin-top:4px;margin-bottom:4px;"></div>', layoutPriority:2});
			this.detailPanel = new ContentPane({content: "Detail", style:"width:300px", region: "right", splitter: true, layoutPriorty:1});
			this.itemDetailPanel = new ItemDetailPanel({region: "right", style: "width:300px", splitter: true, layoutPriority:1})
			this.itemDetailPanel.startup();
			this.addChild(this.browserHeader);
			this.addChild(this.explorer); 
			this.addChild(this.actionPanel);
//			this.addChild(this.detailPanel);

			var self=this;
			Topic.subscribe("/select", function(selection){
				if (selection.length==0){
					var done=0;
					self.removeChild(self.actionPanel);
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
					self.addChild(self.actionPanel);
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

					self.addChild(self.actionPanel);
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
