define([
	"dojo/_base/declare",
	"dojo/topic", "dojo/on", "dojo/dom", "dojo/dom-class", "dojo/dom-attr", "dojo/dom-construct", "dojo/query",
	"dijit/registry", "dojo/request", "dojo/_base/lang",
	"dojo/_base/Deferred",
	"dojo/store/JsonRest", "dojox/widget/Toaster",
	"dojo/ready", "./app", "../router",
	"dojo/window", "../widget/Drawer", "dijit/layout/ContentPane",
	"../jsonrpc", "../panels", "../WorkspaceManager", "dojo/keys",
	"dijit/Dialog", "../util/PathJoin"
], function(declare,
			Topic, on, dom, domClass, domAttr, domConstruct, domQuery,
			Registry, xhr, lang,
			Deferred,
			JsonRest, Toaster,
			Ready, App,
			Router, Window,
			Drawer, ContentPane,
			RPC, Panels, WorkspaceManager, Keys,
			Dialog, PathJoin){
	return declare([App], {
		panels: Panels,
		activeWorkspace: null,
		activeWorkspacePath: "/",
		publicApps: ["BLAST", "ProteinFamily", "ComparativePathway"],
		startup: function(){
			var _self = this;

			on(document.body, "keypress", function(evt){
				var charOrCode = evt.charCode || evt.keyCode;
				// console.log("keypress: ", charOrCode, evt.ctrlKey, evt.shiftKey);

				if((charOrCode == 4) && evt.ctrlKey && evt.shiftKey){
					if(!this._devDlg){
						this._devDlg = new Dialog({
							title: "Debugging Panel",
							content: '<div data-dojo-type="p3/widget/DeveloperPanel" style="width:250px;height:450px"></div>'
						});
					}
					// console.log("Dialog: ", this._devDlg);
					if(this._devDlg.open){
						this._devDlg.hide();
					}else{
						this._devDlg.show();
					}
				}
			});

			// listening document.title change event
			var titleEl = document.getElementsByTagName("title")[0];
			var docEl = document.documentElement;

			if(docEl && docEl.addEventListener){
				docEl.addEventListener("DOMSubtreeModified", function(evt){
					var t = evt.target;
					if(t === titleEl || (t.parentNode && t.parentNode === titleEl)){
						onDocumentTitleChanged();
					}
				}, false);
			}else{
				document.onpropertychange = function(){
					if(window.event.propertyName == "title"){
						onDocumentTitleChanged();
					}
				};
			}

			var onDocumentTitleChanged = function(){
				// var meta = document.getElementsByTagName("meta[name='Keyword']");
				var meta = domQuery("meta[name='Keywords']")[0];
				if(meta){
					meta.content = "PATRIC," + (document.title).replace("::", ",");
				}
				if(window.ga){
					// console.log("document title changed to", document.title);
					ga('set', 'title', document.title);
					ga('send', 'pageview');
				}
			};

			/*
			Router.register("\/$", function(params, oldPath, newPath, state){
				console.log("HOME route", params.newPath);
				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
				newState.widgetClass="dijit/layout/ContentPane";
				newState.requireAuth=false;
				console.log("Navigate to ", newState);
				_self.navigate(newState);
			});
			*/

			Router.register("/remote", function(params, oldPath, newPath, state){
				console.log("REMOTE WINDOW, WAIT FOR /navigate message");
				window.postMessage("RemoteReady", "*");
			});

			Router.register("\/job(\/.*)", function(params, oldPath, newPath, state){
				// console.log("Workspace URL Callback", params.newPath);
				var newState = {href: params.newPath};
				for(var prop in params.state){
					newState[prop] = params.state[prop]
				}

				var path = params.params[0] || "/";
				newState.widgetClass = "p3/widget/JobManager";
				newState.value = path;
				newState.set = "path";
				newState.requireAuth = true;
				newState.pageTitle = 'PATRIC Jobs';
				// console.log("Navigate to ", newState);
				_self.navigate(newState);
			});

			Router.register("\/search/(.*)", function(params, oldPath, newPath, state){
				// console.log("Search Route: ", arguments);
				var newState = getState(params, oldPath);
				newState.widgetClass = "p3/widget/AdvancedSearch";
				newState.requireAuth = false;
				// console.log("Navigate to ", newState);
				_self.navigate(newState);
			});

			Router.register("\/uploads(\/.*)", function(params, oldPath, newPath, state){
				// console.log("Upload URL Callback", params.newPath);
				var newState = {href: params.newPath}
				for(var prop in params.state){
					newState[prop] = params.state[prop]
				}

				var path = params.params[0] || "/";
				newState.widgetClass = "p3/widget/UploadManager";
				newState.value = path;
				newState.set = "path";
				newState.requireAuth = true;
				// console.log("Navigate to ", newState);
				_self.navigate(newState);
			});

			Router.register("\/content(\/.*)", function(params, oldPath, newPath, state){
				// console.log("Upload URL Callback", params.newPath);
				var newState = {href: params.newPath}
				for(var prop in params.state){
					newState[prop] = params.state[prop]
				}

				var path = params.params[0] || "/";
				newState.widgetClass = "dijit/layout/ContentPane";
				newState.style = "padding:0";
				newState.value = PathJoin(_self.dataAPI, "content", path);
				newState.set = "href";
				newState.requireAuth = false;
				newState.pageTitle = 'PATRIC';
				// console.log("Navigate to ", newState);
				_self.navigate(newState);
			});

			Router.register("\/help(\/.*)", function(params, oldPath, newPath, state){
				// console.log("Upload URL Callback", params.newPath);
				var newState = {href: params.newPath}
				for(var prop in params.state){
					newState[prop] = params.state[prop]
				}

				var path = params.params[0] || "/";
				newState.widgetClass = "dijit/layout/ContentPane";
				newState.style = "padding:0";
				newState.value = /*_self.dataAPI +*/ "/public/help/" + path;
				newState.set = "href";
				newState.requireAuth = false;
				newState.pageTitle = 'PATRIC';
				// console.log("Navigate to ", newState);
				_self.navigate(newState);
			});


			Router.register("\/workspace(\/.*)", function(params, oldPath, newPath, state){
				// console.log("Workspace URL Callback", params.newPath);
				var newState = {href: params.newPath}
				for(var prop in params.state){
					newState[prop] = params.state[prop]
				}

				var path = params.params[0] || ("/" + _self.user.id + "/home/");
				var parts = path.split("/");
				if(parts.length < 3){
					path = ("/" + _self.user.id + "/home/");
				}
				newState.widgetClass = "p3/widget/WorkspaceManager";
				newState.value = path;
				newState.set = "path";
				newState.requireAuth = false;
				newState.pageTitle = "PATRIC Workspace";
				// console.log("Navigate to ", newState);
				_self.navigate(newState);
			});

			function getState(params, path){
				var parser = document.createElement("a");
				parser.href = path;
				var newState = params.state || {};

				newState.href = path;
				newState.prev = params.oldPath;
				// console.log("parser getState: ", parser);
				if(newState.search){

				}else if(parser.search){
					newState.search = (parser.search.charAt(0) == "?") ? parser.search.substr(1) : parser.search
				}else{
					newState.search = "";
				}

				// console.log("New State Search: ", newState.search);
				newState.hash = parser.hash;
				newState.pathname = parser.pathname

				if(newState.hash){
					newState.hash = (newState.hash.charAt(0) == "#") ? newState.hash.substr(1) : newState.hash;
					// console.log("PARSE HASH: ", newState.hash)
					newState.hashParams = newState.hashParams || {};

					var hps = newState.hash.split("&");
					hps.forEach(function(t){
						var tup = t.split("=");
						if(tup[0] && tup[1]){
							newState.hashParams[tup[0]] = tup[1];
						}
					});
					// console.log("newState.hashParams: ", newState.hashParams)
				}
				return newState;
			}

			Router.register("\/view(\/.*)", function(params, path){
				// console.log("'/view/' Route Handler.  Params: ", params, " \n PATH: ", path, arguments);
				var newState = getState(params, path);

				// console.log("newState from getState in /view/: ", JSON.stringify(newState,null,4));

				var parts = newState.pathname.split("/")
				parts.shift();
				var type = parts.shift();

				newState.widgetClass = "p3/widget/viewer/" + type;
				// console.log("'/view/' New Navigation State: ", JSON.stringify(newState,null,4));
				_self.navigate(newState);
			});

			Router.register("\/app(\/.*)", function(params, path){
				// console.log("view URL Callback", arguments);

				var parts = path.split("/")
				parts.shift();
				var type = parts.shift();
				if(parts.length > 0){
					viewerParams = parts.join("/");
				}else{
					viewerParams = "";
				}
				// console.log("Parts:", parts, type, viewerParams)

				var newState = {href: params.newPath};
				for(var prop in params.state){
					newState[prop] = params.state[prop]
				}

				// console.log("Parts:", parts, type, path)
				newState.widgetClass = "p3/widget/app/" + type;
				newState.value = viewerParams;
				newState.set = "params";
				newState.requireAuth = true;

				if(_self.publicApps.indexOf(type) >= 0){
					newState.requireAuth = false;
				}

				// console.log("Navigate to ", newState);
				_self.navigate(newState);
			});

			if(!this.api){
				this.api = {}
			}

			if(this.workspaceAPI){
				WorkspaceManager.init(this.workspaceAPI, this.authorizationToken || "", this.user ? this.user.id : "");
				this.api.workspace = RPC(this.workspaceAPI, this.authorizationToken || "");
			}

			if(this.serviceAPI){
				// console.log("Setup API Service @ ", this.serviceAPI);
				this.api.service = RPC(this.serviceAPI, this.authorizationToken || "");
			}

			if(this.dataAPI){
				if(this.dataAPI.charAt(-1) != "/"){
					this.dataAPI = this.dataAPI + "/";
				}
				this.api.data = RPC(this.dataAPI, this.authorizationToken);
			}
			/*
			Topic.subscribe("/ActiveWorkspace", function(as){
				console.log("SET App.activeWorkspace",as)
				_self.activeWorkspace=as.workspace;
				_self.activeWorkspacePath=as.path;
			});
			*/
			// console.log("go()")
			// setTimeout(function(){
			// 	Router.go("/workspace/dmachi/foo/bar");

			// },2000);

			this.toaster = new Toaster({positionDirection: "tl-down", messageTopic: "/Notification", duration: 3000});
			// this.leftDrawer = new Drawer({title: '', handleContent: '<i  class="fa fa-3x icon-filter">', topic: "/overlay/left"}).placeAt(document.body);
			// this.leftDrawer.startup();

			//this.rightDrawer = new Drawer({topic: "/overlay/right", "class":"RightDrawer"}).placeAt(document.body);
			//this.rightDrawer.startup();
			// setTimeout(function(){
			// 	Topic.publish("/overlay/right", {action: "set", panel: ContentPane});
			// }, 1000);

			if(this.user && this.user.id){
				domAttr.set("YourWorkspaceLink", 'href', '/workspace/' + this.user.id)
				var n = dom.byId("signedInAs");
				if(n){
					n.innerHTML = this.user.id.replace("@patricbrc.org", "");
				}
			}
			Topic.subscribe("/userWorkspaces", lang.hitch(this, "updateUserWorkspaceList"));

			this.inherited(arguments);
		},

		updateUserWorkspaceList: function(data){
			// console.log("updateUserWorkspaceList: ", data);
			var wsNode = dom.byId("YourWorkspaces");
			domConstruct.empty("YourWorkspaces");
			// console.log("Your Workspaces Node: ", wsNode);
			data.forEach(function(ws){
				// console.log("Create Link for Workspace: ", ws.path);

				var d = domConstruct.create("div", {style: {"padding-left": "12px"}}, wsNode);
				if(ws.name == "home"){
					domConstruct.create("i", {
						"class": "fa icon-caret-down fa-1x noHoverIcon",
						style: {"margin-right": "4px"}
					}, d);
				}
				domConstruct.create("a", {
					'class': 'navigationLink',
					href: "/workspace" + ws.path,
					innerHTML: ws.name
				}, d);

				if(ws.name == "home"){
					domConstruct.create("br", {}, d);

					domConstruct.create("a", {
						'class': 'navigationLink',
						"style": {"padding-left": "16px"},
						href: "/workspace" + ws.path + "/Genome%20Groups",
						innerHTML: "Genome Groups"
					}, d)

					domConstruct.create("br", {}, d);

					domConstruct.create("a", {
						'class': 'navigationLink',
						"style": {"padding-left": "16px"},
						href: "/workspace" + ws.path + "/Feature%20Groups",
						innerHTML: "Feature Groups"
					}, d)

					domConstruct.create("br", {}, d);

					domConstruct.create("a", {
						'class': 'navigationLink',
						"style": {"padding-left": "16px"},
						href: "/workspace" + ws.path + "/Experiment%20Groups",
						innerHTML: "Experiment Groups"
					}, d)

				}
			})
		},

		search_all_header: function(){
			var node = dom.byId("global_search_keyword");
			var keywords = node.value;
			if(!keywords || keywords == "*"){
				console.log("No Search Keywords Provided");
				return;
			}

			console.log("Keywords: ", keywords);
			xhr.post("/portal/portal/patric/GenomicFeature/GenomicFeatureWindow?action=b&cacheability=PAGE", {
				data: {
					sraction: "save_params",
					keyword: encodeURIComponent(keywords)
				}
			}).then(function(results){
				document.location = "/portal/portal/patric/GlobalSearch?cType=taxon&cId=131567&dm=&pk=" + results;
			});
		}

	});
});
