define([
	"dojo/_base/declare",
	"dojo/topic","dojo/on","dojo/dom","dojo/dom-class","dojo/dom-attr","dojo/dom-construct",
	"dijit/registry","dojo/request",
	"dojo/_base/Deferred",
	"dojo/store/JsonRest","dojox/widget/Toaster",
	"dojo/ready","./app","../router",
	"dojo/window","../widget/Drawer","dijit/layout/ContentPane",
	"../jsonrpc", "../panels","../WorkspaceManager","dojo/keys",
	"dijit/Dialog"
],function(
	declare,
	Topic,on,dom,domClass,domAttr,domConstruct,
	Registry,xhr,
	Deferred,
	JsonRest,Toaster,
	Ready,App,
	Router,Window,
	Drawer,ContentPane,
	RPC, Panels, WorkspaceManager,Keys,
	Dialog
) {
	return declare([App], {
		panels: Panels,
		activeWorkspace: null,
		activeWorkspacePath: "/",
		startup: function(){
			var _self=this;

			on(document.body,"keypress", function(evt){
				var charOrCode = evt.charCode || evt.keyCode;
				// console.log("keypress: ", charOrCode, evt.ctrlKey, evt.shiftKey);
			
				if ((charOrCode==4) && evt.ctrlKey && evt.shiftKey){
					if (!this._devDlg) {
						this._devDlg = new Dialog({title: "Debugging Panel", content:'<div data-dojo-type="p3/widget/DeveloperPanel" style="width:250px;height:450px"></div>'});
					}
					// console.log("Dialog: ", this._devDlg);
					if (this._devDlg.open){
						this._devDlg.hide();
					}else{
						this._devDlg.show();
					}
				}	
			});

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
	
			Router.register("\/job(\/.*)", function(params, oldPath, newPath, state){
				// console.log("Workspace URL Callback", params.newPath);
				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
				var path = params.params[0] || "/"
				newState.widgetClass="p3/widget/JobManager";
				newState.value=path;
				newState.set= "path";
				newState.requireAuth=true;
				// console.log("Navigate to ", newState);
				_self.navigate(newState);
			});

			Router.register("\/search(\/.*)", function(params, oldPath, newPath, state){
				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
				var path = params.params[0] || "/"
				newState.widgetClass="p3/widget/AdvancedSearch";
				newState.value=path;
				newState.set= "path";
				newState.requireAuth=true;
				console.log("Navigate to ", newState);
				_self.navigate(newState);
			});



			Router.register("\/uploads(\/.*)", function(params, oldPath, newPath, state){
				// console.log("Upload URL Callback", params.newPath);
				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
				var path = params.params[0] || "/"
				newState.widgetClass="p3/widget/UploadManager";
				newState.value=path;
				newState.set= "path";
				newState.requireAuth=true;
				// console.log("Navigate to ", newState);
				_self.navigate(newState);
			});



			Router.register("\/workspace(\/.*)", function(params, oldPath, newPath, state){
				// console.log("Workspace URL Callback", params.newPath);
				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
				var path = params.params[0] || ("/"  + _self.user.id + "/home/");
				var parts = path.split("/");
				if (parts.length<3){
					path =  ("/"  + _self.user.id + "/home/");
				}
				newState.widgetClass="p3/widget/WorkspaceManager";
				newState.value=path;
				newState.set= "path";
				newState.requireAuth=true;
				// console.log("Navigate to ", newState);
				_self.navigate(newState);
			});

			Router.register("\/view(\/.*)", function(params, path){
				// console.log("view URL Callback", arguments,location);
				
				var parts = path.split("/")
				parts.shift();
				var type = parts.shift();
				if (parts.length>0){
					viewerParams = parts.join("/");
				}else{
					viewerParams="";
				}
				// console.log("Parts:", parts, type, viewerParams)

				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
				var hashParams={}

				var hps = location.hash.substr(1).split("&")
				hps.forEach(function(t){
					var tup = t.split("=")
					hashParams[tup[0]]=tup[1];
				})
				newState.hashParams = hashParams;
				// console.log("Parts:", parts, type, path)
				newState.widgetClass="p3/widget/viewer/" + type;
				newState.value=viewerParams.replace(location.hash,"");
				newState.set= "params";
				// console.log("Navigate to viewer ", newState);
				_self.navigate(newState);
			});

			Router.register("\/app(\/.*)", function(params, path){
				// console.log("view URL Callback", arguments);
				
				var parts = path.split("/")
				parts.shift();
				var type = parts.shift();
				if (parts.length>0){
					viewerParams = parts.join("/");
				}else{
					viewerParams="";
				}
				// console.log("Parts:", parts, type, viewerParams)

				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
			
				// console.log("Parts:", parts, type, path)
				newState.widgetClass="p3/widget/app/" + type;
				newState.value=viewerParams;
				newState.set= "params";
				newState.requireAuth=true;
				// console.log("Navigate to ", newState);
				_self.navigate(newState);
			});

			if (!this.api) { this.api={}}

			if (this.workspaceAPI && this.user){
				WorkspaceManager.init(this.workspaceAPI, this.authorizationToken, this.user?this.user.id:"");				
				this.api.workspace = RPC(this.workspaceAPI, this.authorizationToken);
			}

			if (this.serviceAPI && this.user){
				// console.log("Setup API Service @ ", this.serviceAPI);
				this.api.service = RPC(this.serviceAPI, this.authorizationToken);
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
			this.leftDrawer = new Drawer({title: '', handleContent: '<i  class="fa fa-3x icon-filter">', topic: "/overlay/left"}).placeAt(document.body);
			this.leftDrawer.startup();

			//this.rightDrawer = new Drawer({topic: "/overlay/right", "class":"RightDrawer"}).placeAt(document.body);
			//this.rightDrawer.startup();
			// setTimeout(function(){
			// 	Topic.publish("/overlay/right", {action: "set", panel: ContentPane});
			// }, 1000);



			this.inherited(arguments);
		},

		search_all_header: function(){
			var node = dom.byId("global_search_keyword");
			var keywords = node.value;
			if (!keywords || keywords=="*") {
				console.log("No Search Keywords Provided");
				return;
			}
			
			console.log("Keywords: ", keywords);
			xhr.post("/portal/portal/patric/GenomicFeature/GenomicFeatureWindow?action=b&cacheability=PAGE",{
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
