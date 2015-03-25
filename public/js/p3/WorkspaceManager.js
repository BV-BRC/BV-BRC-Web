define([
	"dojo/request", "dojo/_base/declare","dojo/_base/lang", 
	"dojo/_base/Deferred","dojo/topic","./jsonrpc", "dojo/Stateful"
],function(
	xhr,declare,lang,
	Deferred,Topic,RPC,Stateful
){

	var WorkspaceManager = (declare([Stateful], {
		userWorkspaces: null,
		currentWorkspace: null,
		currentPath: null,
		token: "",
		apiUrl: "",
		userId: "",
		getDefaultFolder: function(type){
			switch(type) {
				case "genome_group":	
					return "/" + [this.userId,"home","Genome Groups"].join("/");
				case "feature_group":	
					return "/" + [this.userId,"home","Feature Groups"].join("/");
	
				default:
					return "/" + [this.userId,"home"].join("/");
			}
		},
		_userWorkspacesGetter: function(){
			if (this.userWorkspaces && this.userWorkspaces.length>0){
				return this.userWorkspaces;
			}

			var p = "/" + this.userId + "/";
			this.userWorkspaces =Deferred.when(this.api("Workspace.ls", [{
				paths: [p],
				includeSubDirs: false,
				Recursive: false
			}]), lang.hitch(this, function(results) {
					var res;
					if (!results[0] || !results[0][p]) {
						res = []
					}else{
						res = results[0][p].map(function(r) {
							return {
								id: r[4],
								path: r[2] + r[0],
								name: r[0],
								type: r[1],
								creation_time: r[3],
								link_reference: r[11],
								owner_id: r[5],
								size: r[6],
								userMeta: r[7],
								autoMeta: r[8],
								user_permission: r[9],
								global_permission: r[10]
							}
						})
					}


					if (res.length>0){
						this.set("userWorkspaces", res);
						Topic.publish("/refreshWorkspace",{});
						return res;
					}


					return Deferred.when(this.createWorkspace("home"), lang.hitch(this,function(hws){
						this.userWorkspaces=[hws];
						return [hws];
					}, function(err){
						console.log("Error Creating User's home workspace: ", err);
//						console.error("Unable to create user's 'home' workspace: ", err);
						return [];
					}));
			}));
			return this.userWorkspaces;
		},

		create: function(obj, createUploadNode,overwrite){
			var _self=this;
			console.log("WorkspaceManager.create(): ", obj);
			if (obj.path.charAt(obj.path.length-1)!="/") {
				obj.path = obj.path + "/";	
			}
			console.log("Workspace.create: ", obj.path, obj.path+obj.name, "Overwrite: ", overwrite);
			return Deferred.when(this.api("Workspace.create",[{objects:[[(obj.path+obj.name),(obj.type||"unspecified"),obj.userMeta||{},(obj.content||"")]],createUploadNodes:createUploadNode,overwrite:overwrite}]), function(results){
                                        var res;
					console.log("Create Results: ", results);	
                                        if (!results[0][0] || !results[0][0]) {
                                                throw new Error("Error Creating Object");
                                        }else{
                                                var r = results[0][0];
                                                var out = {
                                                        id: r[4],
                                                        path: r[2] + r[0],
                                                        name: r[0],
                                                        type: r[1],
                                                        creation_time: r[3],
                                                        link_reference: r[11],
                                                        owner_id: r[5],
                                                        size: r[6],
                                                        userMeta: r[7],
                                                        autoMeta: r[8],
                                                        user_permission: r[9],
                                                        global_permission: r[10]
                                                }
                                		Topic.publish("/refreshWorkspace",{});
                                                return out;
                                        }
			});
		},

		updateObject: function(meta, data){
			return this.create({
				path: meta.path,
				type: meta.type,
				name: meta.name,
				meta: meta.userMeta||{},
				content: JSON.stringify(data)
			},false,true);
		},

		addToGroup: function(groupPath, idType, ids){
			var _self=this;
			return Deferred.when(this.getObject(groupPath), function(res){
				if (typeof res.data == "string") {
					res.data = JSON.parse(res.data);
				}
				if (res && res.data && res.data.id_list){
					if (res.data.id_list[idType]){
						res.data.id_list[idType] = res.data.id_list[idType].concat(ids);
					}else{
						res.data.id_list[idType] = ids;	
					}
					return _self.updateObject(res.metadata,res.data)
				}
				return new Error("Unable to append to group.  Group structure incomplete");	
			});
		},

		removeFromGroup: function(groupPath, idType, ids){
			var _self=this;
			return Deferred.when(this.getObject(groupPath), function(res){
				if (typeof res.data == "string") {
					res.data = JSON.parse(res.data);
				}
				console.log("Data: ",res.data);	
				if (res && res.data && res.data.id_list && res.data.id_list[idType]){
					console.log("Group Length Before: ", res.data.id_list[idType].length, res.data.id_list[idType]);
					res.data.id_list[idType] = res.data.id_list[idType].filter(function(id){
						return !(ids.indexOf(id)>=0);
					});
					console.log("Group Length After: ", res.data.id_list[idType].length, res.data.id_list[idType]);
					return _self.updateObject(res.metadata,res.data)
				}
				return new Error("Unable to remove from group.  Group structure incomplete");	
			});
		},

		createGroup: function(name, type, path, idType, ids){
			var group = {
				name: name,
				id_list: {}
			}
			group.id_list[idType] = ids;

			console.log("Creating Group: ", group);
			return this.create({
				path: path,
				name: name,
				type: type,
				userMeta: {},
				content: group
			})
			
		},

		createFolder: function(paths){
			if (!paths){
				throw new Error("Invalid Path(s) to delete");
			}
			if (!(paths instanceof Array)){
				paths = [paths];
			}
			var objs = paths.map(function(p){ return [p,"Directory"] })
			return Deferred.when(this.api("Workspace.create",[{objects:objs}]),lang.hitch(this,function(results){
					var res;

					if (!results[0][0] || !results[0][0]) {
						throw new Error("Error Creating Folder");
					}else{
						var r = results[0][0];
						var out = {
							id: r[4],
							path: r[2] + r[0],
							name: r[0],
							type: r[1],
							creation_time: r[3],
							link_reference: r[11],
							owner_id: r[5],
							size: r[6],
							userMeta: r[7],
							autoMeta: r[8],
							user_permission: r[9],
							global_permission: r[10]
						}
						return out;
					}
				Topic.publish("/refreshWorkspace",{});
			}));
		},
		updateMetadata: function(path, userMeta, type){
			var data = [path, userMeta||{}, type||undefined];
			return Deferred.when(this.api("Workspace.update_metadata", [{objects:[data]}]), function(){
				Topic.publish("/refreshWorkspace",{});
			});
		},
	
		updateAutoMetadata: function(paths){
			if (!(paths instanceof Array)){
				paths = [paths];
			}
			return Deferred.when(this.api("Workspace.update_auto_meta", [{objects:paths}]), function(){
				Topic.publish("/refreshWorkspace",{});
			});
		},
		deleteFolder: function(paths, force){
			if (!paths){
				throw new Error("Invalid Path(s) to delete");
			}
			if (!(paths instanceof Array)){
				paths = [paths];
			}
			if (paths.indexOf("home")>=0){
				throw new Error("Cannot delete your 'home' Workspace");
			}
			return Deferred.when(window.App.api.workspace("Workspace.delete",[{objects: paths,deleteDirectories: true,force:force }]), function(results){
				Topic.publish("/refreshWorkspace",{});
			});
		},

		deleteObject: function(paths, deleteFolders, force){
			if (!paths){
				throw new Error("Invalid Path(s) to delete");
			}
			if (!(paths instanceof Array)){
				paths = [paths];
			}
			if (paths.indexOf("home")>=0){
				throw new Error("Cannot delete your 'home' Workspace");
			}

			return Deferred.when(window.App.api.workspace("Workspace.delete",[{objects: paths,force:force, deleteDirectories: deleteFolders }]), function(results){
				Topic.publish("/refreshWorkspace",{});
			});
		},


		createWorkspace: function(name){
			//console.log("Create workspace ", name, "userId", this.userId); //' for user ', this.userId, " PATH:", "/"+this.userId+"/");
			return Deferred.when(this.createFolder("/" + this.userId + "/"+name+"/"), lang.hitch(this,function(workspace){
				if (name=="home"){
					return Deferred.when(this.createFolder([workspace.path + "/Genome Groups", workspace.path+"/Feature Groups", workspace.path+"/Experiments"]),function(){
						return workspace	
					})
				}
			}));
		},

		getObjectsByType: function(types, showHidden){
			types= (types instanceof Array)?types:[types];
			//console.log("Get ObjectsByType: ", types);

			return Deferred.when(this.get("currentWorkspace"), lang.hitch(this,function(current){
				//console.log("current: ", current, current.path);
				var path = current.path;
				return Deferred.when(this.api("Workspace.ls",[{
					paths: [current.path],
					excludeDirectories: false,
					excludeObjects: false,
					recursive: true
				}]), function(results){
					//console.log("getObjectsByType Results: ", results);
					if (!results[0] || !results[0][path]) {
						return [];
					}
					var res = results[0][path];
		
					//console.log("array res", res);
	
					res = res.map(function(r) {
						//console.log("r: ", r);
						return {
							id: r[4],
							path: r[2] + r[0],
							name: r[0],
							type: r[1],
							creation_time: r[3],
							link_reference: r[11],
							owner_id: r[5],
							size: r[6],
							userMeta: r[7],
							autoMeta: r[8],
							user_permission: r[9],
							global_permission: r[10]
						}
					}).filter(function(r){
						if (r.path.split("/").some(function(p){
							return p.charAt(0)==".";
						})) { return false; }

						return (types.indexOf(r.type)>=0);
					})/*.filter(function(r){
						if (!showHidden && r.name.charAt(0)=="."){ return false };
						return true;
					})*/

					//console.log("Final getObjectsByType()", res)
					return res;
				})
			}));
		},

		downloadFile: function(path){
			return Deferred.when(this.api("Workspace.get_download_url", [{objects: [path]}]), function(urls){
				console.log("download Urls: ", urls);
				window.open(urls[0],"Download");
			});	
		},

		getObject: function(path,metadataOnly){
			if (!path){
				throw new Error("Invalid Path(s) to delete");
			}
			path = decodeURIComponent(path);
			console.log('getObjects: ', path, "metadata_only:", metadataOnly)
			return Deferred.when(this.api("Workspace.get",[{objects: [path], metadata_only:metadataOnly}]), function(results){
				if (!results || !results[0] || !results[0][0] || !results[0][0][0] || !results[0][0][0][4]) {
					throw new Error("Object not found: ");
				}
				console.log("results[0]", results[0])
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
				}
				if (metadataOnly) { return meta; } 

				var res = {
					metadata: meta,
					data: results[0][0][1]
				}
				console.log("getObjects() res", res);
				return res;
			});

		},

	
		getObjects: function(paths,metadataOnly){
			if (!paths){
				throw new Error("Invalid Path(s) to delete");
			}
			if (!(paths instanceof Array)){
				paths = [paths];
			}
			paths = paths.map(function(p){ return decodeURIComponent(p); })
			console.log('getObjects: ', paths, "metadata_only:", metadataOnly)
			return Deferred.when(this.api("Workspace.get",[{objects: paths, metadata_only:metadataOnly}]), function(results){
				console.log("results[0]", results[0])
				var objs = results[0];
				return objs.map(function(obj) {
					console.log("obj: ", obj);
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
					}
					if (metadataOnly) { return meta; } 
	
					var res = {
						metadata: meta,
						data: obj[1]
					}
					console.log("getObjects() res", res);
					return res;
				});
			});

		},

		getFolderContents: function(path,showHidden) {
			return Deferred.when(this.api("Workspace.ls", [{
					paths: [path],
					includeSubDirs: false,
					Recursive: false
				}]), function(results) {
					//console.log("path: ", path);

					if (!results[0] || !results[0][path]) {
						return [];
					}
					var res = results[0][path];
		
					//console.log("array res", res);

					res = res.map(function(r) {
						return {
							id: r[4],
							path: r[2] + r[0],
							name: r[0],
							type: r[1],
							creation_time: r[3],
							link_reference: r[11],
							owner_id: r[5],
							size: r[6],
							userMeta: r[7],
							autoMeta: r[8],
							user_permission: r[9],
							global_permission: r[10]
						}
					}).filter(function(r){
						if (!showHidden && r.name.charAt(0)=="."){ return false };
						return true;
					})
					//console.log("Final getFolderContents()", res)
					return res;
				},

				function(err) {
					//console.log("Error Loading Workspace:", err);
					_self.showError(err);
				})
		},

		_userWorkspacesSetter: function(val){
			this.userWorkspaces = val;
		},

		_currentWorkspaceGetter: function(){
			if (!this.currentWorkspace) {
				this.currentWorkspace = Deferred.when(this.get('userWorkspaces'),lang.hitch(this,function(cws){
					if (!cws || cws.length<1){
						throw Error("No User Workspaces found when attempting to get the Current Workspace for user.");
					}
					this.currentWorkspace=cws[0];
					return cws[0];
				}))
			}
			return this.currentWorkspace;
		},
		_currentWorkspaceSetter: function(val){
			this.currentWorkspace = val;
		},

		_currentPathGetter: function(){
			if (!this.currentPath){
				this.currentPath = Deferred.when(this.get('currentWorkspace'),lang.hitch(this,function(cws){
					this.currentPath=cws.path;
					return cws.path;
				}))
			
			}

			return this.currentPath;
		},
		_currentPathSetter: function(val){
			this.currentPath = val;
		},

		init: function(apiUrl, token, userId){
			if (!apiUrl || !token || !userId){
				console.log("Unable to initialize workspace manager. Args: ", arguments);
				return;
			}

			this.token = token;
			this.apiUrl = apiUrl
			this.api = RPC(apiUrl, token);
			this.userId = userId; 
			Deferred.when(this.get("currentPath"), function(cwsp){ console.log("Current Workspace Path: ", cwsp) });
		
		}
	}))()

	return WorkspaceManager;
});

