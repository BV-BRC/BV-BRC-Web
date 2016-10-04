define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dojo/dom-construct", "./WorkspaceGrid",
	"dojo/_base/Deferred", "dojo/dom-geometry", "../JobManager",
	"dojo/topic", '../WorkspaceManager'
], function(declare, WidgetBase, on,
			domClass, domConstr, WorkspaceGrid,
			Deferred, domGeometry, JobManager,
			Topic, WorkspaceManager){
	return declare([WorkspaceGrid], {
		"disabled": false,
		path: "/",
		types: null,
		containerType: "folder",
		_setTypes: function(val){
			if(!(val instanceof Array)){
				this.types = [val];
			}else{
				this.types = val;
			}
			this.refreshWorkspace();
		},
		queryOptions: {
			sort: [{attribute: "name", descending: false}]
		},
		listWorkspaceContents: function(ws){
			var _self = this;
			if(ws[ws.length - 1] == "/"){
				ws = ws.substr(0, ws.length - 1)
			}
			if(!ws){
				ws = "/"
			}

			return Deferred.when(WorkspaceManager.getFolderContents(ws, window.App && window.App.showHiddenFiles), function(res){
				if(_self.types){
					res = res.filter(function(r){
						return (r && r.type && (_self.types.indexOf(r.type) >= 0))
					})

				}
				// console.log("self.sort: ", _self.sort, _self.queryOptions);
				var sort = _self.get('sort');
				if(!sort || sort.length == 0){
					sort = _self.queryOptions.sort;
				}

				// console.log('sort: ', sort);

				res.sort(function(a, b){
					var s = sort[0];
					if(s.descending){
						return (a[s.attribute] > b[s.attribute]) ? 1 : -1
					}else{
						return (a[s.attribute] > b[s.attribute]) ? 1 : -1
					}
				});

				return res;
			}, function(err){
				console.log("Error Loading Workspace:", err);
				_self.showError(err);
			})
		},

		showError: function(err){
			var n = domConstr.create("div", {
				style: {
					position: "relative",
					zIndex: 999,
					padding: "10px",
					margin: "auto",
					"margin-top": "300px",
					width: "30%",
					border: "2px solid #aaa",
					"border-radius": "4px",
					"text-align": "center",
					color: "red",
					"font-size": "1.2em"
				},
				innerHTML: err
			}, this.domNode);
		},

		allowSelect: function(row){
			if(row.data && row.data.type && row.data.type == "parentfolder"){
				return false;
			}

			return true;
		},

		addNewFolder: function(item){
			var items = this._items;
			var list = [item].concat(items);
			this.render(this.path, list);
			this._items = items;
//			console.log("Cell: ", this.cell("untitled","name"));
//			var row = this.row(0);
			var cell = this.cell(0, "name");
			this.edit(cell);
		},
		render: function(val, items){
			this.refresh();
			this._items = items;
			this.renderArray(items);
			// this.refresh();	
		},

		refreshWorkspace: function(){
			var _self = this;
			this.listWorkspaceContents(this.path).then(function(contents){
				// console.log("listWSContents: ", contents);
				var parts = _self.path.split("/").filter(function(x){
					return !!x
				});
				// console.log("Path Parts: ", parts);
				if(parts.length > 1){
					parts.pop();
					var parentPath = "/" + parts.join("/");
					// console.log("parentPath: ", parentPath);

					var p = {
						name: "Parent Folder",
						path: parentPath,
						type: "parentfolder",
						id: parentPath,
						owner_id: "@"
					};
					// console.log("p: ", p);
					contents.unshift(p);
				}

				// console.log("Revised Contents:", contents);
				_self.render(_self.path, contents);
			})

		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			domClass.add(this.domNode, "WorkspaceExplorerView");

			var _self = this;
			this.refreshWorkspace();
//			this.listWorkspaceContents(this.path).then(function(contents) {
//				_self.render(_self.path, contents);
//			})

			Topic.subscribe("/refreshWorkspace", function(msg){
				_self.refreshWorkspace();
			});

			Topic.subscribe("/Jobs", function(msg){
				// if (msg.type=="JobStatus") {
				// 	console.log("JobStatus MSG: ", msg.job);
				// }else if (msg.type=="JobStatusChanged") {
				// 	console.log("Job Status Changed From ", msg.oldStatus, " to ", msg.status);
				// }
			});
		},

		_setPath: function(val){
			this.path = val;
			var _self = this;
			// console.log("WorkspaceExplorerView setPath", val)
			if(this._started){
				this.refreshWorkspace();
			}
		},

		save: function(){
			console.log("Save Arguments: ", arguments);
		}
	});
});
