define("p3/widget/WorkspaceBrowser", [
	"dojo/_base/declare","dijit/layout/BorderContainer","dojo/on",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"./WorkspaceExplorerView","dojo/topic","./ItemDetailPanel",
	"./ActionBar","dojo/_base/Deferred","../WorkspaceManager","dojo/_base/lang"
], function(
	declare, BorderContainer, on,
	domClass,ContentPane,domConstruct,
	WorkspaceExplorerView,Topic,ItemDetailPanel,
	ActionBar,Deferred,WorkspaceManager,lang
){
	return declare([BorderContainer], {
		"baseClass": "WorkspaceBrowser",
		"disabled":false,
		"path": "/",
		gutters: false,
		navigableTypes: ["parentfolder","folder","genome_group","feature_group","job_result","unspecified"],
		startup: function(){
			if (this._started) {return;}
			//var parts = this.path.split("/").filter(function(x){ return x!=""; })
			var out = ["<span class='wsBreadCrumb'>"];
			var parts = this.path.split("/").filter(function(x){ return x!=""; }).map(function(c){ return decodeURIComponent(c) });
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
				out.push("'>" + ((idx==0)?p.replace("@patricbrc.org",""):p) + "</a>&nbsp;/&nbsp;");
			})
			out.push("</span>");
			out.push("<span style='float:right;'>");
			out.push("<a href class='DialogButton fa fa-upload fa-2x' rel='Upload:" + ((this.path.charAt(-1)=="/")?this.path:this.path+"/") + "' style='margin:4px;' title='Upload to Folder'></a>");
			out.push("<a href class='DialogButton fa icon-folder-plus fa-2x' rel='CreateFolder:" + ((this.path.charAt(-1)=="/")?this.path:this.path+"/") + "' style='margin:4px;' title='Create Folder' ></a>");
			out.push("</span>");
			this.browserHeader = new ContentPane({className:"BrowserHeader",content: out.join(""), region: "top"});
			//this.explorer = new WorkspaceExplorerView({path: decodeURIComponent(this.path), region: "center"});
			this.actionPanel = new ActionBar({splitter:false,region:"right",layoutPriority:2, style:"width:32px;text-align:center;font-size:.75em;"});
			var self=this;

			this.actionPanel.addAction("EditItem","fa fa-info-circle fa-2x", {multiple: false,validTypes:["*"]}, function(selection){
				console.log("Edit Item Action", selection);
				self.itemDetailPanel.set("item",selection[0]);				
				if (self.getChildren().some(function(child){
					return child===self.itemDetailPanel
				})){
					self.removeChild(self.itemDetailPanel);
				}else{
					self.addChild(self.itemDetailPanel);
				}
				
			}, true);


			this.actionPanel.addAction("ViewItem","MultiButton fa fa-eye fa-2x", {
				multiple: false,
				validTypes: ["genome_group","feature_group","job_result","experiment_group"]
			},function(selection){
				console.log("selection: ", selection);
				var sel = selection[0];

				switch (sel.type) {
					case "genome_group":
						Topic.publish("/navigate",{href:"/view/GenomeList"}); //?in(genome_id,GenomeGroup(_uuid/" + sel.id + "))"});
						break;
					case "feature_group":
						Topic.publish("/navigate",{href:"/view/FeatureList"}); //?in(feature_id,FeatureGroup(_uuid/" + sel.id + "))"});
						break;
					case "job_results":
						Topic.publish("/navigate",{href:"/view/Experiment"}); //?in(feature_id,FeatureGroup(_uuid/" + sel.id + "))"});
						break;
	
					default:
						console.log("Type isn't setup with a viewer");
				}

				WorkspaceManager.getObjects([sel.path]).then(function(res){ console.log("View Data Object: ", res); })

			}, true);


			/*
			this.actionPanel.addAction("DownloadItem","fa fa-download fa-2x",{multiple: false,validTypes:["*"]}, function(selection){
				console.log("Download Item Action", selection);
			}, true);
			*/

			this.actionPanel.addAction("UploadItem","fa fa-upload fa-2x", {multiple: false,validTypes:["*"]}, function(selection){
				console.log("Replace Item Action", selection);
				Topic.publish("/openDialog",{type:"UploadReplace",params:{path: selection[0].path}});
			}, true);


			this.actionPanel.addAction("DeleteItem","fa fa-trash fa-2x",{allowMultiTypes:true,multiple: true,validTypes:["genome_group","feature_group","experiment_group","job_result","unspecified","contigs","reads"]}, function(selection){
				var objs = selection.map(function(s){
					console.log('s: ', s, s.data);
					return s.path||s.data.path;
				});
				WorkspaceManager.deleteObject(objs,true, false);
			}, true);

			this.actionPanel.addAction("DeleteFolder","fa fa-trash fa-2x",{allowMultiTypes:false,multiple: true,validTypes:["folder"]}, function(selection){
				var objs = selection.map(function(s){
					console.log('s: ', s, s.data);
					return s.path||s.data.path;
				});
				WorkspaceManager.deleteObject(objs,true, true);
			}, true);




			this.detailPanel = new ContentPane({content: "Detail", style:"width:300px", region: "right", splitter: false, layoutPriorty:1});
			this.itemDetailPanel = new ItemDetailPanel({region: "right", style: "width:300px", splitter: false, layoutPriority:1})
			this.itemDetailPanel.startup();
			this.addChild(this.browserHeader);
//			this.addChild(this.actionPanel);

			var self=this;
			this.inherited(arguments);

		},
		_setPathAttr: function(val){
			console.log("WorkspaceBrowser setPath()", val)
			this.path = decodeURIComponent(val);
			var parts = this.path.split("/").filter(function(x){ return x!=""; }).map(function(c){ return decodeURIComponent(c) });
			var workspace = parts[0] + "/" + parts[1];
			var obj;
			console.log("Workspace: ", workspace, parts[1], val)
			if (!parts[1]){
				obj = {metadata: {type: "folder"}}
			}else{
				obj = WorkspaceManager.getObjects(val,true)
			}

			Deferred.when(obj, lang.hitch(this,function(obj){
				var panelCtor;
				var params = {path: this.path, region: "center"}
				console.log("Browse to Type: ", obj.type, obj);
				switch(obj.type) {
					case "folder": 
						panelCtor = WorkspaceExplorerView;
						break;
					case "genome_group":
						panelCtor = window.App.getConstructor("p3/widget/viewer/GenomeList");
						params.query="?&in(genome_id,GenomeGroup("+encodeURIComponent(this.path).replace("(","%28").replace(")","%29")+"))";
						break;
					case "feature_group":
						panelCtor = window.App.getConstructor("p3/widget/viewer/FeatureList");
						params.query="?&in(feature_id,FeatureGroup("+encodeURIComponent(this.path)+"))";
						break;
					case "job_result":
						panelCtor = window.App.getConstructor("p3/widget/viewer/Experiment");
						params.query="?&in(feature_id,FeatureGroup("+encodeURIComponent(this.path)+"))";
						break;
					default:
						panelCtor = window.App.getConstructor("p3/widget/viewer/File");
						params.file = {metadata: obj};
						console.log("FileViewer Ctor params: ", params);
				}	

				console.log("params.query: ", params.query);
				Deferred.when(panelCtor, lang.hitch(this,function(Panel){
					console.log("ActivePanel instanceof Panel: ", this.activePanel instanceof Panel);
					if (!this.activePanel || !(this.activePanel instanceof Panel)){
						if (this.activePanel) { 
							this.removeChild(this.activePanel);
						 }
						console.log("Creeate New Active Panel");
						var newPanel = new Panel(params);
						var hideTimer;

						if (newPanel.on) {
						newPanel.on("select", lang.hitch(this,function(evt){
							console.log("Selected: ", evt);
							var sel = Object.keys(evt.selected).map(lang.hitch(this,function(rownum){
								console.log("rownum: ", rownum);
								console.log("Row: ", evt.grid.row(rownum).data);
								return evt.grid.row(rownum).data;
							}));
							console.log("selection: ", sel);
							console.log("this.activePanel: ", newPanel);
							if (hideTimer) {
								clearTimeout(hideTimer);
							}
							if (sel.length>0){
								this.addChild(this.actionPanel);
							}
							this.actionPanel.set("selection", sel);

							if (sel.length==1) {
								if (this.getChildren().some(function(child){
									return (child===this.actionPanel)
								},this)) {
									this.itemDetailPanel.set("item",sel[0]);	
								}

							}else if (sel.length>1) {

							}else {
								this.removeChild(this.actionPanel);
							}
						}));	

						newPanel.on("deselect", lang.hitch(this,function(evt){
							if (!evt.selected) { 
								this.actionPanel.set("selection", []); 
							}else{
								var sel = Object.keys(evt.selected).map(lang.hitch(this,function(rownum){
									console.log("rownum: ", rownum);
									console.log("Row: ", evt.grid.row(rownum).data);
									return evt.grid.row(rownum).data;
								}));
							}
							console.log("selection: ", sel);
							this.actionPanel.set("selection", sel);
							if (!sel || sel.length<1){
								hideTimer = setTimeout(lang.hitch(this,function(){
									this.removeChild(this.actionPanel);
									this.removeChild(this.itemDetailPanel);
								}),500);	
							}
						}));

						newPanel.on("ItemDblClick", lang.hitch(this,function(evt){
							console.log("ItemDblClick: ", evt);
							if (evt.item && evt.item.type && (this.navigableTypes.indexOf(evt.item.type)>=0)){
								Topic.publish("/navigate", {href:"/workspace" + evt.item_path })
								this.actionPanel.set("selection", []);
								console.log("SHOW LOADING STATUS SOMEHOW");	
								newPanel.clearSelection();
								hideTimer = setTimeout(lang.hitch(this,function(){
									this.removeChild(this.actionPanel);
									this.removeChild(this.itemDetailPanel);
								}),500);	
							}else{
								console.log("non-navigable type, todo: show info panel when dblclick");
							}
	
						}));
						}
	
						this.addChild(newPanel);
						this.activePanel = newPanel;
					}else{
						this.activePanel.set('path', this.path);
						if (this.activePanel.clearSelection){
							this.activePanel.clearSelection();
						}
						this.removeChild(this.actionPanel);
						this.removeChild(this.itemDetailPanel);
					}

					var parts = this.path.split("/").filter(function(x){ return x!=""; }).map(function(c){ return decodeURIComponent(c) });
					var workspace = parts[0] + "/" + parts[1];
					console.log("Publish to ActiveWorkspace:",workspace,val)
					WorkspaceManager.set("currentPath",val);
//					Topic.publish("/ActiveWorkspace",{workspace: workspace, path:val});

					if (this._started){
						var len = parts.length;
						var out = [];

						var out = ["<span class='wsBreadCrumb'>"];
						var bp = ["workspace"];
						parts.forEach(function(p,idx){
							if (idx == (parts.length-1)){
								out.push(p + "&nbsp;");
								return;
							}
							out.push("<a class='navigationLink' href='");
							bp.push(p);
							out.push("/" + bp.join("/") + ((idx==0)?"/":"") );
							out.push("'>" + ((idx==0)?p.replace("@patricbrc.org",""):p)  + "</a>&nbsp;/&nbsp;");
						})
						//out.push("<span>" + parts.join("/") + "</span>");
						out.push("<span style='float:right;'>");
						out.push("<a href class='DialogButton fa fa-upload fa-2x' rel='Upload:" + ((this.path.charAt(-1)=="/")?this.path:this.path+"/")+ "' style='margin:4px;' title='Upload to Folder'></a>");
						out.push("<a href class='DialogButton fa icon-folder-plus fa-2x' rel='CreateFolder:" + ((this.path.charAt(-1)=="/")?this.path:this.path+"/") + "' style='margin:4px;' title='Create Folder' ></a>");
						out.push("</span>");	

						this.browserHeader.set("content", out.join(""));
					}
				}));
			}));
		},
		refresh: function(){
			if (this.activePanel instanceof WorkspaceExplorerView){
				this.explorer.refreshWorkspace()
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
