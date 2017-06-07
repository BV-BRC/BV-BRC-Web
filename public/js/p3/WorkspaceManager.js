define([
	"dojo/request", "dojo/_base/declare", "dojo/_base/lang",
	"dojo/_base/Deferred", "dojo/topic", "./jsonrpc", "dojo/Stateful",
	"dojo/promise/all", "dijit/Dialog", "dijit/form/Button", "dojo/dom-construct"
], function(
	xhr, declare, lang,
	Deferred, Topic, RPC, Stateful,
	All, Dialog, Button, domConstruct){

	var WorkspaceManager = (declare([Stateful], {
		userWorkspaces: null,
		currentWorkspace: null,
		currentPath: null,
		token: "",
		apiUrl: "",
		userId: "",
		downloadTypes: ["contigs", "reads", "unspecified", "diffexp_experiment", "diffexp_mapping", "diffexp_sample", "diffexp_expression", "diffexp_input_data"],

		getDefaultFolder: function(type){
			switch(type){
				case "genome_group":
					return "/" + [this.userId, "home", "Genome Groups"].join("/");
				case "feature_group":
					return "/" + [this.userId, "home", "Feature Groups"].join("/");
				case "experiment_folder":
					return "/" + [this.userId, "home", "Experiments"].join("/");
				case "experiment_group":
					return "/" + [this.userId, "home", "Experiment Groups"].join("/");

				default:
					return "/" + this.userId;
			}
		},
		_userWorkspacesGetter: function(){
			var _self = this;
			if(this.userWorkspaces && this.userWorkspaces.length > 0){
				return this.userWorkspaces;
			}

			var p = "/" + this.userId + "/";
			this.userWorkspaces = Deferred.when(this.api("Workspace.ls", [{
				paths: [p],
				includeSubDirs: false,
				Recursive: false
			}]), lang.hitch(this, function(results){
				var res;
				if(!results[0] || !results[0][p]){
					res = []
				}else{
					res = results[0][p].map(function(r){
						return _self.metaListToObj(r);
					})
				}

				if(res.length > 0){
					this.set("userWorkspaces", res);
					Topic.publish("/refreshWorkspace", {});
					return res;
				}

				return Deferred.when(this.createWorkspace("home"), lang.hitch(this, function(hws){
					this.userWorkspaces = [hws];
					return [hws];
				}, function(err){
					console.error("Error Creating User's home workspace: ", err);
					// console.error("Unable to create user's 'home' workspace: ", err);
					return [];
				}));
			}));
			return this.userWorkspaces;
		},

		create: function(obj, createUploadNode, overwrite){
			var self = this;
			if(obj.path.charAt(obj.path.length - 1) != "/"){
				obj.path = obj.path + "/";
			}
			// console.log("Workspace.create: ", obj.path, obj.path + obj.name, "Overwrite: ", overwrite);
			return Deferred.when(this.api("Workspace.create", [{
				objects: [[(obj.path + obj.name), (obj.type || "unspecified"), obj.userMeta || {}, (obj.content || "")]],
				createUploadNodes: createUploadNode,
				overwrite: overwrite
			}]), function(results){
				var res;
				if(!results[0][0] || !results[0][0]){
					throw new Error("Error Creating Object");
				}else{
					var r = results[0][0];
					Topic.publish("/refreshWorkspace", {});
					return self.metaListToObj(r);
				}
			});
		},

		updateObject: function(meta, data){
			return this.create({
				path: meta.path,
				type: meta.type,
				name: meta.name,
				meta: meta.userMeta || {},
				content: JSON.stringify(data)
			}, false, true);
		},

		addToGroup: function(groupPath, idType, ids){
			var _self = this;
			return Deferred.when(this.getObject(groupPath), function(res){
				if(typeof res.data == "string"){
					res.data = JSON.parse(res.data);
				}
				if(res && res.data && res.data.id_list){
					if(res.data.id_list[idType]){
						var existing = {}
						res.data.id_list[idType].forEach(function(id){
							existing[id] = true;
						});

						ids = ids.filter(function(id){
							return !existing[id];
						});

						res.data.id_list[idType] = res.data.id_list[idType].concat(ids);
					}else{
						res.data.id_list[idType] = ids;
					}
					return Deferred.when(_self.updateObject(res.metadata, res.data), function(r){
						Topic.publish("/Notification", {
							message: ids.length + " items added to group " + groupPath,
							type: "message"
						});
						return r;
					});
				}
				Topic.publish("/Notification", {
					message: "Unable to add Items to group.  Invalid group structure",
					type: "error",
					duration: 0
				});
				return new Error("Unable to append to group.  Group structure incomplete");
			});
		},

		removeFromGroup: function(groupPath, idType, ids){
			var _self = this;
			return Deferred.when(this.getObject(groupPath), function(res){
				if(typeof res.data == "string"){
					res.data = JSON.parse(res.data);
				}
				// console.log("Data: ", res.data);
				if(res && res.data && res.data.id_list && res.data.id_list[idType]){
					// console.log("Group Length Before: ", res.data.id_list[idType].length, res.data.id_list[idType]);
					res.data.id_list[idType] = res.data.id_list[idType].filter(function(id){
						return (ids.indexOf(id) < 0);
					});
					// console.log("Group Length After: ", res.data.id_list[idType].length, res.data.id_list[idType]);
					return Deferred.when(_self.updateObject(res.metadata, res.data), function(r){
						// console.log("Publish remove from group notification message");
						Topic.publish("/Notification", {
							message: ids.length + " Item removed from group " + groupPath,
							type: "message",
							duration: 0
						});
						return r;
					});

				}

				Topic.publish("/Notification", {
					message: "Unable to remove items from group.  Invalid group structure",
					type: "error",
					duration: 0
				});
				return new Error("Unable to remove from group.  Group structure incomplete");
			});
		},

		createGroup: function(name, type, path, idType, ids){
			var group = {
				name: name,
				id_list: {}
			};
			group.id_list[idType] = ids;

			// console.log("Creating Group: ", group);
			return this.create({
				path: path,
				name: name,
				type: type,
				userMeta: {},
				content: group
			})

		},

		createFolder: function(path){
			var _self = this;
			if(!path) throw new Error("Invalid Path to create");

			return Deferred.when(this.api("Workspace.create", [{
					objects: [[path, "Directory"]]
				}]), function(results){

				var createdPath = results[0][0];
				if(!createdPath){
					throw new Error("Please try a new name.");
				}else{
					return _self.metaListToObj(createdPath);
				}
			});
		},
		updateMetadata: function(path, userMeta, type){
			var data = [path, userMeta || {}, type || undefined];
			return Deferred.when(this.api("Workspace.update_metadata", [{objects: [data]}]), function(res){
				Topic.publish("/refreshWorkspace", {});
				return res[0][0];
			});
		},

		updateAutoMetadata: function(paths){
			if(!(paths instanceof Array)){
				paths = [paths];
			}
			return Deferred.when(this.api("Workspace.update_auto_meta", [{objects: paths}]), function(){
				Topic.publish("/refreshWorkspace", {});
			});
		},

		deleteObjects: function(paths, deleteFolders, force){
			var self = this;
			if(!paths) throw new Error("Invalid Path(s) to delete");

			// ensure is array
			paths = Array.isArray(paths) ? paths : [paths];

			// throw error for any special folder
			self.omitSpecialFolders(paths, 'delete');

			return Deferred.when(window.App.api.workspace("Workspace.delete", [{
				objects: paths,
				force: force,
				deleteDirectories: deleteFolders
			}]), function(results){
				Topic.publish("/Notification", {
					message: paths.length + (paths.length > 1 ? ' items' : ' item') + " deleted",
					type: "message"
				});
				Topic.publish("/refreshWorkspace", {});
			}, function(err) {
				console.log('error ', err)
				var btn = self.errorDetailsBtn();

				var msg = domConstruct.toDom('<span>' + paths.length + " items could not be deleted");
				domConstruct.place(btn.domNode, msg, 'last')
				console.log('msg', msg)

				Topic.publish("/Notification", {
					message: msg,
					type: "error"
				});
			});
		},

		createWorkspace: function(name){
			return Deferred.when(this.createFolder("/" + this.userId + "/" + name + "/"), lang.hitch(this, function(workspace){
				if(name == "home"){
					return Deferred.when(this.createFolder([
							workspace.path + "/Genome Groups",
							workspace.path + "/Feature Groups",
							workspace.path + "/Experiments",
							workspace.path + "/Experiment Groups"
						]), function(){
						Topic.publish("/Notification", {
							message: "New workspace '" + name + "' created",
							type: "message"
						});
						return workspace
					})
				}

				return workspace
			}));
		},

		getObjectsByType: function(types, showHidden, specialPath){
			var _self = this;
			types = (types instanceof Array) ? types : [types];
			// console.log("Get ObjectsByType: ", types);

			return Deferred.when(this.get("currentWorkspace"), lang.hitch(this, function(current){
				var _self = this;

				var path = specialPath || current.path;
				return Deferred.when(this.api("Workspace.ls", [{
					paths: [path],
					excludeDirectories: false,
					excludeObjects: false,
					query: {type: types},
					recursive: true
				}]), function(results){
					if(!results[0] || !results[0][path]){
						return [];
					}
					var res = results[0][path];

					res = res.map(function(r){
						return _self.metaListToObj(r);
					}).filter(function(r){
						if(r.type == "folder"){
							if(r.path.split("/").some(function(p){
									return p.charAt(0) == ".";
								})){
								return false;
							}
						}
						return (types.indexOf(r.type) >= 0);
					});
					/*.filter(function(r){
						if (!showHidden && r.name.charAt(0)=="."){ return false };
						return true;
					})*/

					//console.log("Final getObjectsByType()", res)
					return res;
				})
			}));
		},
		getDownloadUrls: function(paths){
			paths = paths instanceof Array ? paths : [paths];
			return Deferred.when(this.api("Workspace.get_download_url", [{objects: paths}]), function(urls){
				return urls[0];
			});
		},

		downloadFile: function(path){
			return Deferred.when(this.api("Workspace.get_download_url", [{objects: [path]}]), function(urls){
				// console.log("download Urls: ", urls);
				window.open(urls[0]);
			});
		},

		getObject: function(path, metadataOnly){
			if(!path){
				throw new Error("Invalid Path(s) to delete");
			}
			path = decodeURIComponent(path);

			// console.log('getObjects: ', path, "metadata_only:", metadataOnly);
			return Deferred.when(this.api("Workspace.get", [{
				objects: [path],
				metadata_only: metadataOnly
			}]), function(results){
				if(!results || !results[0] || !results[0][0] || !results[0][0][0] || !results[0][0][0][4]){
					throw new Error("Object not found: ");
				}
				// console.log("results[0]", results[0]);
				var meta = {
					name: results[0][0][0][0],
					type: results[0][0][0][1],
					path: results[0][0][0][2],
					creation_time: results[0][0][0][3],
					id: results[0][0][0][4],
					owner_id: results[0][0][0][5],
					size: results[0][0][0][6],
					userMeta: results[0][0][0][7],
					autoMeta: results[0][0][0][8],
					user_permissions: results[0][0][0][9],
					global_permission: results[0][0][0][10],
					link_reference: results[0][0][0][11]
				};
				if(metadataOnly){
					return meta;
				}

				var res = {
					metadata: meta,
					data: results[0][0][1]
				};
				// console.log("getObjects() res", res);
				return res;
			});

		},
		copy: function(paths, dest){
			var _self = this;

			// copy contents into folders of same name, but whatever parent path is choosen
			var srcDestPaths = paths.map(function(path){
				return [path, dest + '/' + path.slice(path.lastIndexOf('/')+1)]
			})

			// if copying to workspace level, need to create the folders first
			// see latter of: https://github.com/PATRIC3/Workspace/issues/53
			if(dest.split('/').length < 3){
				var newWSPaths = paths.map(function(path){
					return [dest + '/' + path.slice(path.lastIndexOf('/')+1) + '/', "Directory"];
				})

				var prom = this.api("Workspace.create", [{objects: newWSPaths }]);
			}

			Topic.publish("/Notification", {
				message: "<span class='default'>Copying " + paths.length + " items...</span>"
			});

			return Deferred.when(prom, function(res){

				return Deferred.when(_self.api("Workspace.copy", [{
					objects: srcDestPaths,
					recursive: true,
					move: false
				}]),
				function(res){
					Topic.publish("/refreshWorkspace", {});
					Topic.publish("/Notification", {
						message: "Copied contents of "+ paths.length + (paths.length > 1 ? " items" : 'item'),
						type: "message"
					});
					return res;
				}, function(err){
					Topic.publish("/Notification", {
						message: "Copy failed",
						type: "error"
					});
				})
			})
		},

		move: function(paths, dest){
			var self = this;

			self.omitSpecialFolders(paths, 'move')

			var srcDestPaths = paths.map(function(path){
				return [path, dest + '/' + path.slice(path.lastIndexOf('/')+1)]
			})

			// if moving to workspace level, need to create the folders first
			// see latter of: https://github.com/PATRIC3/Workspace/issues/53
			if(dest.split('/').length < 3){
				var newWSPaths = paths.map(function(path){
					return [dest + '/' + path.slice(path.lastIndexOf('/')+1) + '/', "Directory"];
				})

				var prom = this.api("Workspace.create", [{objects: newWSPaths }]);
			}

			Topic.publish("/Notification", {
				message: "<span class='default'>Moving " + paths.length + " items...</span>"
			});

			return Deferred.when(prom, function(res){
				return Deferred.when(self.api("Workspace.copy", [{
					objects: srcDestPaths,
					recursive: true,
					move: true
				}]),
				function(res){
					Topic.publish("/refreshWorkspace", {});
					Topic.publish("/Notification", {
						message: "Moved contents of "+ paths.length + (paths.length > 1 ? " items" : 'item'),
						type: "message"
					});
					return res;
				})
			})
		},


		rename: function(path, newName){
			var self = this;

			self.omitSpecialFolders([path], 'rename');

			if(path.split('/').length <= 3) {
				return self.renameWorkspace(path, newName)
			}

			// ensure path doesn't already exist
			var newPath = path.slice(0, path.lastIndexOf('/'))+'/'+newName;
			return Deferred.when(this.getObjects(newPath, true),
				function(response){
					throw Error("The name " + newName + " already exists!  Please pick a unique name.")
				}, function(err){

					return Deferred.when(_self.api("Workspace.copy", [{
						objects: [[path, newPath]],
						recursive: true,
						move: true
					}],
					function(res){
						Topic.publish("/refreshWorkspace", {});
						Topic.publish("/Notification", {message: "File renamed", type: "message"});
						return res;
					}))
				})
		},

		renameWorkspace: function(path, newName){
			var self = this;

			self.omitSpecialFolders([path], 'rename');

			var newPath = path.slice(0, path.lastIndexOf('/'))+'/'+newName;

			if (path == newPath) {
				throw Error("The name " + newName + " already exists!  Please pick a unique name.")
			}

			return Deferred.when(this.api("Workspace.create", [{objects: [[newPath, "Directory"]] }]), function(response){
				return Deferred.when(self.api("Workspace.copy", [{
						objects: [[path, newPath]],
						recursive: true,
						move: true
					}],
					function(res){
						Topic.publish("/refreshWorkspace", {});
						Topic.publish("/Notification", {message: "File renamed", type: "message"});
						return res;
					}))
			 })
		},

		getObjects: function(paths, metadataOnly){
			if(!paths){
				throw new Error("Invalid Path(s) to delete");
			}
			if(!(paths instanceof Array)){
				paths = [paths];
			}
			paths = paths.map(function(p){
				return decodeURIComponent(p);
			});
			return Deferred.when(this.api("Workspace.get", [{
				objects: paths,
				metadata_only: metadataOnly
			}]), function(results){
				// console.log("results[0]", results[0]);
				var objs = results[0];
				var fin = [];
				var defs = objs.map(function(obj){
					// console.log("obj: ", obj);
					var meta = {
						name: obj[0][0],
						type: obj[0][1],
						path: obj[0][2],
						creation_time: obj[0][3],
						id: obj[0][4],
						owner_id: obj[0][5],
						size: obj[0][6],
						userMeta: obj[0][7],
						autoMeta: obj[0][8],
						user_permissions: obj[0][9],
						global_permission: obj[0][10],
						link_reference: obj[0][11]
					};
					if(metadataOnly){
						fin.push(meta);
						return true
					}

					if(!meta.link_reference){
						var res = {
							metadata: meta,
							data: obj[1]
						};
						fin.push(res);
						return true;
					}else{

						var headers = {
							"X-Requested-With": null
						};
						if(window.App.authorizationToken){
							headers.Authorization = "OAuth " + window.App.authorizationToken;
						}

						var d = xhr.get(meta.link_reference + "?download", {
							headers: headers
						});

						return Deferred.when(d, function(data){
							fin.push({
								metadata: meta,
								data: data
							});
							return true;
						}, function(err){
							console.error("Error Retrieving data object from shock :", err, meta.link_reference);
						});
					}
				});

				return Deferred.when(All(defs), function(){
					return fin;
				});
			});

		},

		getFolderContents: function(path, showHidden, recursive, filterPublic){
			var _self = this;
			return Deferred.when(this.api("Workspace.ls", [{
					paths: [path],
					includeSubDirs: false,
					recursive: recursive ? true : false
				}]), function(results){

					if(!results[0] || !results[0][path]){
						return [];
					}
					var res = results[0][path];

					res = res.map(function(r){
						return _self.metaListToObj(r);
					}).filter(function(r){
						if(!showHidden && r.name.charAt(0) == "."){
							return false;
						}

						return true;
					});

					// if getting "public" workspaces, filter out writeable and owner workspaces
					if(filterPublic){
						res = res.filter(function(r){
							if(r.global_permission == 'w') return false;
							else if(r.global_permission == 'n') return false;
							return true;
						})
					}

					return res;
				},

				function(err){
					//console.log("Error Loading Workspace:", err);
					_self.showError(err);
				})
		},

		listSharedWithUser: function(path){
			var _self = this;
			return Deferred.when(this.api("Workspace.ls", [{
					paths: ['/']
				}]), function(results){
					var allWS = results[0]['/'];

					// transform to human friendly
					allWS = allWS.map(function(r){ return _self.metaListToObj(r); })

					// filter out public and owner's folders (silly, I know)
					var sharedWithUser = allWS.filter(function(r){
						if(r.global_permission !== 'n') return false;
						else if(r.user_permission == 'o' && r.global_permission == 'n') return false;
						return true;
					})


					return sharedWithUser;
				},

				function(err){
					_self.showError(err);
				})
		},

		setPermissions: function(path, permissions){
			var _self = this;
			return Deferred.when(this.api("Workspace.set_permissions", [{
				path: path,
				permissions: permissions

			}]), function(res) {
				return res;
			},

			function(err){
				//console.log("Error Loading Workspace:", err);
				_self.showError(err);
			})
		},

		setPublicPermission: function(path, permission){
			var _self = this;
			return Deferred.when(this.api("Workspace.set_permissions", [{
				path: path,
				new_global_permission: permission
			}]), function(res) {
				return res;
			},

			function(err){
				//console.log("Error Loading Workspace:", err);
				_self.showError(err);
			})
		},

		listPermissions: function(paths){
			var _self = this;
			return Deferred.when(this.api("Workspace.list_permissions", [{
				objects: Array.isArray(paths) ? paths : [paths]
			}]), function(res) {
				return Array.isArray(paths) ? res[0] : res[0][paths];
			},

			function(err){
				//console.log("Error Loading Workspace:", err);
				_self.showError(err);
			})
		},

		metaListToObj: function(list){
			return {
				id: list[4],
				path: list[2] + list[0],
				name: list[0],
				type: list[1],
				creation_time: list[3],
				link_reference: list[11],
				owner_id: list[5],
				size: list[6],
				userMeta: list[7],
				autoMeta: list[8],
				user_permission: list[9],
				global_permission: list[10],
				timestamp: Date.parse(list[3])
			}
		},

		errorDetailsBtn: function(){

			var btn = new Button({
				label: "Details",
				//disabled: true,
				onClick: function(){
					new Dialog({
						title: "Group Comparison",
						style: "width: 1250px !important; height: 750px !important;",
						onHide: function(){
							dlg.destroy()
						}
					}).startup()
					dlg.show()
				}
			})

			return btn;
		},

		omitSpecialFolders: function(paths, operation){
			paths = Array.isArray(paths) ? paths : [paths];

			//  regect home workspaces (must check for anybody's home)
			var isHome = paths.filter(function(p){
				var parts = p.split('/');
				return parts.length == 3 && parts[2] == 'home'
			}).length;

			if(isHome) {
				throw new Error("Your <i>home</i> workspace is a special workspace which cannot be "+operation+"d.");
			}

			// also reject these home folders
			var unacceptedFolders = [
				"Genome Groups",
				"Feature Groups",
				"Experiments",
				"Experiment Groups"
			];

			var unacceptedPaths = paths.filter(function(p){
				if(p.split('/')[2] == 'home' && unacceptedFolders.indexOf(p.split('/')[3]) != -1) return true;
			});

			if(unacceptedPaths.length) {
				throw new Error(
					"You cannot "+operation+" any of the following special folders:<br><br>"+
					'<i>' + unacceptedFolders.join('<br>') + '</i>'
				);
			}
		},

		_userWorkspacesSetter: function(val){
			Topic.publish("/userWorkspaces", val);
			this.userWorkspaces = val;
		},

		_currentWorkspaceGetter: function(){
			if(!this.currentWorkspace){
				this.currentWorkspace = Deferred.when(this.get('userWorkspaces'), lang.hitch(this, function(cws){
					if(!cws || cws.length < 1){
						throw Error("No User Workspaces found when attempting to get the Current Workspace for user.");
					}
					this.currentWorkspace = cws[0];
					return cws[0];
				}))
			}
			return this.currentWorkspace;
		},
		_currentWorkspaceSetter: function(val){
			this.currentWorkspace = val;
		},

		_currentPathGetter: function(){
			if(!this.currentPath){
				this.currentPath = Deferred.when(this.get('currentWorkspace'), lang.hitch(this, function(cws){
					this.currentPath = cws.path;
					return cws.path;
				}))

			}

			return this.currentPath;
		},
		_currentPathSetter: function(val){
			this.currentPath = val;
		},

		//Todo(nc): generic error
		showError: function(e){

		},

		init: function(apiUrl, token, userId){
			if(!apiUrl || !token || !userId){
				console.log("Unable to initialize workspace manager. Args: ", arguments);
				return;
			}

			this.token = token;
			this.apiUrl = apiUrl;
			this.api = RPC(apiUrl, token);
			this.userId = userId;
			if(userId && token){
				Deferred.when(this.get("currentPath"), function(cwsp){
					// console.log("Current Workspace Path: ", cwsp)
				});
			}else{
				this.currentPath = "/";
				this.currentWorkspace = "/NOWORKSPACE";
			}

		}
	}))();

	return WorkspaceManager;
});
