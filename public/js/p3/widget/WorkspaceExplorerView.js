define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dojo/dom-construct", "./WorkspaceGrid",
	"dojo/_base/Deferred", "dojo/dom-geometry", "../JobManager", "./Confirmation", './Uploader', "dijit/form/Select",
	"dojo/topic", '../WorkspaceManager', "dojo/promise/all"
], function(declare, WidgetBase, on,
			domClass, domConstr, WorkspaceGrid,
			Deferred, domGeometry, JobManager, Confirmation, Uploader, Select,
			Topic, WorkspaceManager, all){
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
			var prom1 = WorkspaceManager.getFolderContents(ws, window.App && window.App.showHiddenFiles, null, filterPublic);

			// if listing user's top level, included 'shared with me' as well
			var userID = window.App.user.id;
			var isUserTopLevel = (ws == '/'+userID);
			if(isUserTopLevel){
				var prom2 = WorkspaceManager.listSharedWithUser(userID);
			}

			return all([prom1, prom2]).then(function(results){
				var res = results[0];

				// join 'shared with me' data if needed
				if(isUserTopLevel) res = res.concat(results[1]);


				var paths = res.map(function(obj) { return obj.path; });
				var prom2 = WorkspaceManager.listPermissions(paths)
				return Deferred.when(prom2, function(permHash){

					res.forEach(function(obj){
						obj.permissions = permHash[obj.path]
					})


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
				})

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


			// initialize drag and drop
			if(!this.dndZone) this.initDragAndDrop();
		},

		refreshWorkspace: function(){
			var _self = this;
			this.listWorkspaceContents(this.path).then(function(contents){

				var parts = _self.path.split("/").filter(function(x){
					return !!x;
				});

				if(parts.length > 1){
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

		// enables drag and drop on data browser
		initDragAndDrop: function(){
			var self = this;

			// treat explorer view as drag and drop zone
			this.dndZone = document.getElementsByClassName('WorkspaceExplorerView')[0];
			this.dndZone.addEventListener('dragover', onDragOver);
			this.dndZone.addEventListener("dragleave", onDragLeave);
			this.dndZone.addEventListener('drop', onDragDrop);


			function upload(files) {
				var uploader = new Uploader();

				// build type selector
				var knownTypes = uploader.knownTypes;

				var options = []
				Object.keys(knownTypes).forEach(function(t){
					options.push({disabled: false, label: knownTypes[t].label, value: t});
				})

				var typeSelector = new Select({
					name: "typeSelector",
					style: { width: '200px' },
					options: options
				})

				var content = domConstr.toDom('<div>Select an object type to proceed:</div>');
				domConstr.place(typeSelector.domNode, content)

				// have user select the type before being brought to uploader
				var dlg = new Confirmation({
					title: 'Uploading '+ files.length + (files.length > 1 ? ' Files' : ' File') +'...',
					content: content,
					cancelLabel: false,
					okLabel: 'Next ➜',
					style: { width: '300px' },
					onConfirm: function(evt){
						Topic.publish("/openDialog", {
							type: "Upload",
							params: {
								path: self.path,
								dndFiles: files,
								dndType: typeSelector.get('value')
							}
						});
					}
				}).show();

				self.dndZone.classList.remove("dnd-active");
			}

			function onDragLeave(e) {
				if (e.target.className.indexOf("dnd-active") != -1)
					self.dndZone.classList.remove("dnd-active");
			}

			function onDragOver(e) {
				e.stopPropagation();
				e.preventDefault();

				// only allow drag and drop in folders
				if(self.path.split('/').length < 3) return;

				self.dndZone.classList.add("dnd-active");
				e.dataTransfer.dropEffect = 'copy';
			}

			function onDragDrop(e) {
				e.stopPropagation();
				e.preventDefault();

				// only allow drag and drop in folders
				if(self.path.split('/').length < 3) return;

				if ( e.target['className'] == "dnd-active" )
					self.dndZone.classList.remove("dnd-active");

				var files = e.dataTransfer.files; // Array of all files
				upload(files);
			}
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
