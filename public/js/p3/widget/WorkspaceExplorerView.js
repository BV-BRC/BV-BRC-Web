define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dojo/query",
	"dojo/dom-class", "dojo/dom-construct", "./WorkspaceGrid",
	"dojo/_base/Deferred", "dojo/dom-geometry", "../JobManager", "./Confirmation", './Uploader', "dijit/form/Select",
	"dojo/topic", '../WorkspaceManager', "dojo/promise/all"
], function(declare, WidgetBase, on, query,
			domClass, domConstr, WorkspaceGrid,
			Deferred, domGeometry, JobManager, Confirmation, Uploader, Select,
			Topic, WorkspaceManager, all){
	return declare([WorkspaceGrid], {
		disabled: false,
		path: "/",
		types: null,
		containerType: "folder",
		onlyWritable: false, 		// only lists writable workspaces
		allowDragAndDrop: true,		// whether or not to allow drag and drop
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

			// join permissions with objects
			return all([prom1, prom2]).then(function(results){
				var objs = results[0];

				// join 'shared with me' data if needed
				if(isUserTopLevel) objs = objs.concat(results[1]);

				var paths = objs.map(function(obj) { return obj.path; });
				var prom2 = WorkspaceManager.listPermissions(paths);
				return Deferred.when(prom2, function(permHash){

					// empty folder notice
					if(!objs.length){
						_self.addEmptyFolderDiv();
					}else{
						_self.rmEmptyFolderDiv();
					}

					// option to filter only writable thing
					if(_self.onlyWritable){
						objs = objs.filter(function(o){
							return !(o.user_permission == 'r' || o.user_permission == 'n')
						})
					}

					// join permissions to each obj
					objs.forEach(function(obj){
						obj.permissions = permHash[obj.path]
					})

					// option to filter by types
					if(_self.types){
						objs = objs.filter(function(r){
							return (r && r.type && (_self.types.indexOf(r.type) >= 0))
						})
					}

					// sorting
					var sort = _self.get('sort');
					if(!sort || sort.length == 0){
						sort = _self.queryOptions.sort;
					}

					objs.sort(function(a, b){
						var s = sort[0];
						if(s.descending){
							return (a[s.attribute] > b[s.attribute]) ? 1 : -1
						}else{
							return (a[s.attribute] > b[s.attribute]) ? 1 : -1
						}
					});
					return objs;
				})

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

			var cell = this.cell(0, "name");
			this.edit(cell);
		},

		render: function(val, items){
			this.refresh();
			this._items = items;
			this.renderArray(items);

			// initialize drag and drop
			if(this.allowDragAndDrop && !this.dndZone) this.initDragAndDrop();
		},

		refreshWorkspace: function(){
			var _self = this;
			this.listWorkspaceContents(this.path).then(function(contents){

				var parts = _self.path.split("/").filter(function(x){
					return !!x;
				});

				// add parent folder if not top level or if not owner
				var user = window.App.user.id;
				var isSharedWS = (
					_self.path.split('/').length == 3 &&
					parts[0] != user &&
					parts[0] != 'public'
				);

				if(parts.length > 1 || isSharedWS){
					parts.pop();

					if(isSharedWS){
						var parentPath = '/' + user;
					}else{
						var parentPath = parts[0] == 'public' ? "/"+parts.slice(1).join('/') : "/" + parts.join('/');
							parentPath = (parts[0] == 'public' && parentPath.split('/').length < 3) ? '/' : parentPath;
					}

					var p = {
						name: (isSharedWS ? "Back to my workspaces" : "Parent folder"),
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

		// gives notice that folder is empty and user could use drag n drop.
		addEmptyFolderDiv: function(){
			// needed since listWorkspacEContents is called twice on url load
			var exists = query('.emptyFolderNotice', this.domNode)[0];
			if(exists) return;

			var n = domConstr.create('div', {
				'class': 'emptyFolderNotice',
				style: {
					position: 'relative',
					padding: '10px',
					margin: '300px auto auto',
					width: '40%',
					textAlign: 'center',
					color: '#777',
					fontSize: '1.2em'
				},
				innerHTML: '<b>This folder is empty.</b>'+
					(this.allowDragAndDrop ? '<br>Drag and drop files onto this window to upload.' : '')
			}, this.domNode);
		},

		rmEmptyFolderDiv: function(){
			domConstr.destroy(query('.emptyFolderNotice', this.domNode)[0]);
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
					style: { width: '200px', marginBottom: '25px' },
					options: options
				})

				var content = domConstr.toDom(
					'<div>Select an object type for these files:</div>'
				);
				domConstr.place(typeSelector.domNode, content)

				// have user select the type before being brought to uploader
				var dlg = new Confirmation({
					title: 'Uploading '+ files.length + (files.length > 1 ? ' Files' : ' File') +'...',
					content: content,
					cancelLabel: false,
					okLabel: 'Start Upload',
					style: { width: '300px' },
					onConfirm: function(evt){
						// upload the files
						var defs = [];
						Object.keys(files).forEach(function(key){
							var f = files[key];
							var prom = uploader.uploadFile(f, self.path, typeSelector.get('value'));
							defs.push(Deferred.when(prom, function(res){
								return true;
							}));
						})
						dlg.destroy();
					}
				})

				// add option to add more files (with different type)
				// (not in use for now)
				/*
				var addFilesBtn = domConstr.create("div", {
					style: { float: 'left', paddingTop: '7px' },
					innerHTML: '<a>add more files...</a>'
				}, content);

				on(addFilesBtn, 'click', function(){
					Topic.publish("/openDialog", {
						type: "Upload",
						params: {
							path: self.path,
							dndFiles: files,
							dndType: typeSelector.get('value')
						}
					});
					dlg.destroy();
				})
				*/

				dlg.show();

				// remove hover styling
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
