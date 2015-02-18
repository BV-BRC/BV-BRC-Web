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

		create: function(obj, createUploadNode){
			var _self=this;
			console.log("WorkspaceManager.create(): ", obj);
			return Deferred.when(this.api("Workspace.create",[{objects:[[(obj.path+"/"+obj.name),(obj.type||"unspecified"),obj.userMeta||{},(obj.content||"")]],createUploadNodes:createUploadNode}]), function(results){
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

		createGroup: function(name, type, path, idType, ids){
			var group = {
				name: name,
				id_list: {id_type: idType, ids: ids}	
			}
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

		deleteFolder: function(paths){
			if (!paths){
				throw new Error("Invalid Path(s) to delete");
			}
			if (!(paths instanceof Array)){
				paths = [paths];
			}
			if (paths.indexOf("home")>=0){
				throw new Error("Cannot delete your 'home' Workspace");
			}
			return Deferred.when(window.App.api.workspace("Workspace.delete",[{objects: paths,deleteDirectories: true }]), function(results){
				Topic.publish("/refreshWorkspace",{});
			});
		},

		deleteObject: function(paths, deleteFolders){
			if (!paths){
				throw new Error("Invalid Path(s) to delete");
			}
			if (!(paths instanceof Array)){
				paths = [paths];
			}
			if (paths.indexOf("home")>=0){
				throw new Error("Cannot delete your 'home' Workspace");
			}

			return Deferred.when(window.App.api.workspace("Workspace.delete",[{objects: paths,deleteDirectories: deleteFolders }]), function(results){
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

		getObjectsByType: function(types, ws){
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

		getObjects: function(paths){
			if (!paths){
				throw new Error("Invalid Path(s) to delete");
			}
			if (!(paths instanceof Array)){
				paths = [paths];
			}
			paths = paths.map(function(p){ return decodeURIComponent(p); })
			//console.log('getObjects: ', paths)
			return Deferred.when(this.api("Workspace.get",[{objects: paths}]), function(results){
				//console.log("results[0]", results[0])
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
				var res = {
					metadata: meta,
					data: results[0][0][1]
				}
				return res;
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

