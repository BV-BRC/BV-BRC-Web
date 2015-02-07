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

			console.log("Call Workspace.ls()");
			var p = "/" + this.userId + "/";
			return Deferred.when(this.api("Workspace.ls", [{
				paths: [p],
				includeSubDirs: false,
				Recursive: false
			}]), lang.hitch(this, function(results) {
					console.log("Workspace.ls() results", results);
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

					console.log("RES.len", res.length);

					if (res.length>0){
						console.log("USER WORKSPACES" , res);
						this.set("userWorkspaces", res);
						Topic.publish("/refreshWorkspace",{});
						return res;
					}

					console.log("No User Workspaces, create a home workspace");

					return Deferred.when(this.createWorkspace("home"), lang.hitch(this,function(hws){
						console.log("Got New Home Workspace: ",hws)
						this.set("userWorkspaces",[hws]);
						return [hws];
					}, function(err){
						console.log("Error Creating User's home workspace: ", err);
//						console.error("Unable to create user's 'home' workspace: ", err);
						return [];
					}));
			}));
		},

		createFolder: function(paths){
			console.log("createFolder: ", paths);
			if (!paths){
				throw new Error("Invalid Path(s) to delete");
			}
			if (!(paths instanceof Array)){
				paths = [paths];
			}
			var objs = paths.map(function(p){ return [p,"Directory"] })
			return Deferred.when(this.api("Workspace.create",[{objects:objs}]),lang.hitch(this,function(results){
					console.log("Workspace.create(folder) results",paths, results);
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
						console.log("out: ", out);
						return out;
					}
				console.log("RESULTS", results)
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
			console.log("Create workspace ", name, "userId", this.userId); //' for user ', this.userId, " PATH:", "/"+this.userId+"/");
			return Deferred.when(this.createFolder("/" + this.userId + "/"+name+"/"), lang.hitch(this,function(workspace){
				if (name=="home"){
					return Deferred.when(this.createFolder([workspace.path + "/Genome Groups", workspace.path+"/Feature Groups", workspace.path+"/Experiments"]),function(){
						return workspace	
					})
				}
			}));
		},

		getObjects: function(paths){
			if (!paths){
				throw new Error("Invalid Path(s) to delete");
			}
			if (!(paths instanceof Array)){
				paths = [paths];
			}

			return Deferred.when(this.api("Workspace.get",[{objects: paths}]), function(results){
				console.log("results[0]", results[0])
				var res = {
					metadata: results[0][0][0],
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
					console.log("path: ", path);

					if (!results[0] || !results[0][path]) {
						return [];
					}
					var res = results[0][path];
		
					console.log("array res", res);

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
					console.log("Final getFolderContents()", res)
					return res;
				},

				function(err) {
					console.log("Error Loading Workspace:", err);
					_self.showError(err);
				})
		},

		_userWorkspacesSetter: function(val){
			this.userWorkspaces = val;
		},

		_currentWorkspaceGetter: function(){
			if (this.currentWorkspace){
				console.log("CURRENT WORKSPACE: ", this.currentWorkspace)
				return this.currentWorkspace;
			}

			return Deferred.when(this.get('userWorkspaces'),lang.hitch(this,function(cws){
				if (!cws || cws.length<1){
					throw Error("No User Workspaces found when attempting to get the Current Workspace for user.");
				}
				this.set("currentWorkspace",cws[0]);
				return cws[0];
			}))
		},
		_currentWorkspaceSetter: function(val){
			this.currentWorkspace = val;
		},

		_currentPathGetter: function(){
			if (!this.currentPath){
				return Deferred.when(this.get('currentWorkspace'),lang.hitch(this,function(cws){
					this.set("currentPath",cws.path);
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

