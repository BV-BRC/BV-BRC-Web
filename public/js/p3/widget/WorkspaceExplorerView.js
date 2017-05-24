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

			// change root path '/public' to '/'
			if(!ws || ws == "/public"){
				ws = "/"
			}

			// ignore "/public/"
			// "/public/..." isn't a real path, just used in urls for state
			var parts = ws.replace(/\/+/g, '/').split('/');
			if(parts[1] == 'public'){
				parts.splice(1, 1);
				ws = parts.join('/');
			}

			var filterPublic =  ws == '/' ? true : false;
			return Deferred.when(WorkspaceManager.getFolderContents(
				ws, window.App && window.App.showHiddenFiles, null, filterPublic), function(res){
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

				var parts = _self.path.split("/").filter(function(x){
					return !!x
				});

				// don't add parrent folder link for ASM workshop ('/public/PATRIC@patricbrc.org/home')
				if(parts.length > 1 && _self.path != '/public/PATRIC@patricbrc.org/home'){
					parts.pop();

					var parentPath = parts[0] == 'public' ? "/"+parts.slice(1).join('/') : "/"+parts.join('/');
						parentPath = (parts[0] == 'public' && parentPath.split('/').length < 3) ? '/' : parentPath;
					var p = {
						name: "Parent Folder",
						path: parentPath,
						type: "parentfolder",
						id: parentPath,
						owner_id: "@"
					};

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
		},
		getLayout: function(){
			console.log('is this the layout?', this.layout)
		}
	});
});
