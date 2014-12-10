define("cid/widget/WorkspaceManager", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dojo/request","dojo/_base/lang",
	"dojo/dom-construct","./Button","dojo/dnd/Target","dojo/topic",
	"dojo/aspect","dijit/Dialog","dijit/registry","./WorkspaceGroupButton"
], function(
	declare, WidgetBase, on,
	domClass,xhr,lang,
	domConstruct,Button,Target,Topic,
	aspect,Dialog,Registry,WorkspaceGroupButton
){
	return declare([WidgetBase], {
		"baseClass": "WorkspaceManager",
		"workspaceServer": "",
		"currentWorkspace": "",
		postCreate: function(){
			this.inherited(arguments);
			this.headerGroupNodes={};
			console.log("Workspace Manager PostCreate");
			this.wsHeader = domConstruct.create("div", {"class":"WorkspaceHeader", innerHTML:"Loading Workspaces..."},this.domNode);
			this.wsContainer = domConstruct.create("div", {"class":"WorkspaceContainer"},this.domNode);
			this.getWorkspaces().then(lang.hitch(this, function(workspaces){
				this.set("currentWorkspace", workspaces[0].id);
			}));

			this.createWorkspaceHeader();	
/*
			this.on(".MultiButton:click", function(evt){
				evt.preventDefault();
				evt.stopPropagation();
				console.log("onCLick");
			});
*/
		},

		_setCurrentWorkspaceAttr: function(wsId){
			console.log("_SetCurrent Workspace : ", wsId);
			var workspace;
			if (wsId && typeof wsId == "string") {
				this.workspaces.some(function(ws){
					if (ws.id == wsId) { workspace = ws; return true }
				});
			}else if (wsId){
				workspace = wsId;
			}else{
				throw new Error("Not a valid workspace to set as current");
			}

			this.currentWorkspace = workspace;

			if (workspace === this.workspaces[0]){
				this.prevWorkspaceButton.set("disabled", true);
			}else{
				this.prevWorkspaceButton.set("disabled", false);
			}

			if (workspace === this.workspaces[this.workspaces.length-1]){
				this.nextWorkspaceButton.set("disabled", true);
			}else{
				this.nextWorkspaceButton.set("disabled", false);
			}

			this.updateWorkspaceHeader();
		},

		setupDnD: function(targetNode){
			var _self=this;
                        var dndtarget = new Target(targetNode, {
				accept: ["gid","bioset"],
				onDrop: function(source,items,copy){
					var type;
					var data = [];
					items.forEach(function(it){
						var x = source.getItem(it.id);
						type = x.type[0];
						data.push(x.data);
						
					});
					_self.addDataGroup("Unamed Group", data, type);
	
//					console.log("onDrop: ", items);
				}	
			});

			/*
                        aspect.before(dndtarget, "onDrop", function(evt){
				console.log("WorkspaceManager onDrop()", evt);	
                        });
			*/

		},

		addDataGroup: function(name, data,type){
			console.log("Adding new data group: ", name, data, type);
			var wsItem = {
				name: name,
				itemType: "group",
				groupType: type,
				itemData: (typeof data=='string')?data:data.map(function(d){ return (d.id || d.genome_info_id) }) ,
				workspaceId: this.currentWorkspace.id
			}
				
			return this.createWorkspaceItem(wsItem);	
		},

		createWorkspaceHeader: function(){
			domConstruct.empty(this.wsHeader);
			this.setupDnD(this.wsHeader);
			this.prevWorkspaceButton = new Button({"class":"leftIcon"}).placeAt(this.wsHeader);
			this.prevWorkspaceButton.on("click", lang.hitch(this,"gotoPrevWorkspace"));
				

			this.workspaceLabelNode = domConstruct.create("span", {"class":"WorkspaceLabel", innerHTML: (this.currentWorkspace && this.currentWorkspace.name)?this.currentWorkspace.name:"~", title: "Workspace ID: " + this.currentWorkspace.id + " Owner ID: " + this.currentWorkspace.ownerId},this.wsHeader);

			this.nextWorkspaceButton = new Button({"class":"rightIcon"}).placeAt(this.wsHeader);
			this.nextWorkspaceButton.on("click", lang.hitch(this,"gotoNextWorkspace"));

			
			this.shareButton = new Button({"class":"shareIcon"}).placeAt(this.wsHeader);
			this.downloadButton = new Button({"class":"downloadIcon"}).placeAt(this.wsHeader);
			this.uploadButton = new Button({"class":"uploadIcon"}).placeAt(this.wsHeader);
			this.groupsContainer = domConstruct.create("span", {"class": "WorkspaceGroups"}, this.wsHeader);

			this.on(".WorkspaceGroups:click", function(evt){
				evt.preventDefault();
				evt.stopPropagation();
				var groupButton = Registry.byNode(evt.target);
				console.log("GroupButton: ", groupButton.get("text"), groupButton);
			});
			this.updateWorkspaceHeaderGroups();
		},

		updateWorkspaceHeaderGroups: function(){
			if (!this.currentWorkspace || !this.currentWorkspace.items) { return; }
			/*
			this.currentWorkspace.items.forEach(function(item){
				console.log("items: ", item);
				if (item.itemType=="group") {
					if  (item.id && !this.headerGroupNodes[item.id]) {
						//console.log("item.id: ", item.id, item.itemData);
						this.headerGroupNodes[item.id] = new WorkspaceGroupButton({class:"", text: item.name + " (" + ((item&&item.itemData)?item.itemData.length:0)+ ") ", data: item.itemData}).placeAt(this.groupsContainer);
					}else{
						this.headerGroupNodes[item.id].set('text', item.name + " (" + item.itemData.length +  ") ");
						this.headerGroupNodes[item.id].set('data', item.itemData);
					}
				}
			},this);
			*/
		},

		updateWorkspaceHeader: function(){
			var workspace = this.currentWorkspace;

			this.workspaceLabelNode.innerHTML = (workspace&&workspace.name)?workspace.name:"~";

			if (workspace === this.workspaces[0]){
				this.prevWorkspaceButton.set("disabled", true);
			}else{
				this.prevWorkspaceButton.set("disabled", false);
			}

			if (workspace === this.workspaces[this.workspaces.length-1]){
				this.nextWorkspaceButton.set("disabled", true);
			}else{
				this.nextWorkspaceButton.set("disabled", false);
			}
			this.updateWorkspaceHeaderGroups();
		},

		gotoNextWorkspace: function(evt){
			evt.preventDefault();
			evt.stopPropagation();
			console.log("goto Next");	
			var current = this.workspaces.indexOf(this.currentWorkspace)
			if (current < (this.workspaces.length-1)){
				this.set("currentWorkspace", this.workspaces[current+1]);
			}
		},

		gotoPrevWorkspace: function(evt){
			console.log("goto Prev");	
			evt.preventDefault();
			evt.stopPropagation();
			var current = this.workspaces.indexOf(this.currentWorkspace)
			if (current>0){
				this.set("currentWorkspace", this.workspaces[current+1]);
			}
	
		},
	
		getWorkspaces: function(){
			var url = this.workspaceServer + "/workspace/";
			console.log("Get Workspaces()",url);
			return xhr.get(url, {
				headers: {
					"accept":"application/json"
				},
				withCredentials: true,
				handleAs: "json"
			}).then(lang.hitch(this,function(workspaces){
				console.log("Workspaces: ", workspaces);
				if (workspaces.length>0) {
					this.set("workspaces", workspaces);
					return workspaces;
				}else{
					console.log("No Workspace Found, create new temporary one");
					return this.createWorkspace("default").then(lang.hitch(this,function(ws){
						this.set("workspaces", [ws]);
						console.log("this.workspaces: ", this.workspaces);
						return this.workspaces;
					}));
				}		
			}), lang.hitch(this, function(){
				return this.createWorkspace("default").then(lang.hitch(this,function(ws){
					this.set("workspaces", [ws]);
					console.log("this.workspaces: ", this.workspaces);
					return this.workspaces;
				}));
			})).then(lang.hitch(this, function(workspaces) {
				return this.getWorkspaceItems(workspaces);	

			}));
		},

		getWorkspaceItems: function(workspaces){
			var query =  workspaces.map(function(ws){
				return ("eq(workspaceId," + ((ws && ws.id)?ws.id:ws) + ")");
			})
			if (workspaces.length==1){
				query = query[0];
			}else if (workspaces.length>1) {
				query="or(" + query.join(",") +")";
			}

			var url = this.workspaceServer + "/workspaceItem/?" + query
			console.log("get workspace items: ", url);
			return xhr.get(url, {
				headers: {
					"accept":"application/json"
				},
				withCredentials: true,
				handleAs: "json"
			}).then(lang.hitch(this, function(wsItems){
				console.log("wsItems: ", wsItems, "workspaces: ", workspaces);
				workspaces.forEach(function(ws){
					ws.items = wsItems.filter(function(wsi){
						return wsi.workspaceId==ws.id;
					});
				});
				return workspaces;
			}));
			console.log("Get Workspace Items Query: ", query);

		},


		createWorkspaceItem: function(obj){
			console.log("Create Workspace Item: ", obj);
			var url = this.workspaceServer + "/workspaceItem/";
			return xhr.post(url, {
				headers: {
					"accept": "application/json",
					"content-type": "application/json"
				},
				withCredentials: true,
				handleAs: "json",
				data: JSON.stringify(obj)
			}).then(lang.hitch(this, function(wsItem){
				console.log("New WS Item Results: ", wsItem);
				this.currentWorkspace.items.push(wsItem);
				this.refresh();
			}), function(err) {
				console.log("Error Creating Workspace Item: ", err);
				return err;
			});
		},

		refresh: function(){
			this.updateWorkspaceHeader();
		},

		createWorkspace: function(name){
			console.log("Create Workspace: ", name);
			var url = this.workspaceServer + "/workspace/";
			return xhr.post(url, {
				headers: {
					"accept": "application/json",
					"content-type": "application/json"
				},
				withCredentials: true,
				handleAs: "json",
				data: JSON.stringify({name: name})
			}).then(function(ws){
				console.log("New Workspace: ", ws);
				return ws;
			});
		},

		_setWorkspacesAttr: function(workspaces){
			this.workspaces=workspaces;
		}
	});
});
