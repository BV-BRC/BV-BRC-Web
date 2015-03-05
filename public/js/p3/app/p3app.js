define([
	"dojo/_base/declare",
	"dojo/topic","dojo/on","dojo/dom","dojo/dom-class","dojo/dom-attr","dojo/dom-construct",
	"dijit/registry","dojo/request",
	"dojo/_base/Deferred",
	"dojo/store/JsonRest",
	"dojo/ready","./app","../router",
	"dojo/window","../widget/Drawer","dijit/layout/ContentPane",
	"../jsonrpc", "../panels","../WorkspaceManager","dojo/keys",
	"dijit/Dialog"
],function(
	declare,
	Topic,on,dom,domClass,domAttr,domConstruct,
	Registry,xhr,
	Deferred,
	JsonRest,
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
				console.log("keypress: ", charOrCode, evt.ctrlKey, evt.shiftKey);
			
				if ((charOrCode==4) && evt.ctrlKey && evt.shiftKey){
					if (!this._devDlg) {
						this._devDlg = new Dialog({title: "Debugging Panel", content:'<div data-dojo-type="p3/widget/DeveloperPanel" style="width:250px;height:450px"></div>'});
					}
					console.log("Dialog: ", this._devDlg);
					if (this._devDlg.open){
						this._devDlg.hide();
					}else{
						this._devDlg.show();
					}
				}	
			});
	
			Router.register("\/job(\/.*)", function(params, oldPath, newPath, state){
				console.log("Workspace URL Callback", params.newPath);
				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
				var path = params.params[0] || "/"
				newState.widgetClass="p3/widget/JobManager";
				newState.value=path;
				newState.set= "path";
				console.log("Navigate to ", newState);
				_self.navigate(newState);
			});

			Router.register("\/uploads(\/.*)", function(params, oldPath, newPath, state){
				console.log("Upload URL Callback", params.newPath);
				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
				var path = params.params[0] || "/"
				newState.widgetClass="p3/widget/UploadManager";
				newState.value=path;
				newState.set= "path";
				console.log("Navigate to ", newState);
				_self.navigate(newState);
			});



			Router.register("\/workspace(\/.*)", function(params, oldPath, newPath, state){
				console.log("Workspace URL Callback", params.newPath);
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
				console.log("Navigate to ", newState);
				_self.navigate(newState);
			});
			Router.register("\/view(\/.*)", function(params, path){
				console.log("view URL Callback", arguments);
				
				var parts = path.split("/")
				parts.shift();
				var type = parts.shift();
				if (parts.length>0){
					viewerParams = parts.join("/");
				}else{
					viewerParams="";
				}
				console.log("Parts:", parts, type, viewerParams)

				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
			
				console.log("Parts:", parts, type, path)
				newState.widgetClass="p3/widget/viewer/" + type;
				newState.value=viewerParams;
				newState.set= "params";
				console.log("Navigate to ", newState);
				_self.navigate(newState);
			});
			Router.register("\/app(\/.*)", function(params, path){
				console.log("view URL Callback", arguments);
				
				var parts = path.split("/")
				parts.shift();
				var type = parts.shift();
				if (parts.length>0){
					viewerParams = parts.join("/");
				}else{
					viewerParams="";
				}
				console.log("Parts:", parts, type, viewerParams)

				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
			
				console.log("Parts:", parts, type, path)
				newState.widgetClass="p3/widget/app/" + type;
				newState.value=viewerParams;
				newState.set= "params";
				console.log("Navigate to ", newState);
				_self.navigate(newState);
			});

			if (!this.api) { this.api={}}

			if (this.workspaceAPI && this.user){
				WorkspaceManager.init(this.workspaceAPI, this.authorizationToken, this.user?this.user.id:"");				
				this.api.workspace = RPC(this.workspaceAPI, this.authorizationToken);
			}

			if (this.serviceAPI && this.user){
				console.log("Setup API Service @ ", this.serviceAPI);
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

			//this.leftDrawer = new Drawer({topic: "/overlay/left"}).placeAt(document.body);
			//this.leftDrawer.startup();
			//console.log("leftDrawer", this.leftDrawer)
			// setTimeout(function(){
			// 	Topic.publish("/overlay/left", {action: "set", panel: ContentPane});
			// }, 1000);

			//this.rightDrawer = new Drawer({topic: "/overlay/right", "class":"RightDrawer"}).placeAt(document.body);
			//this.rightDrawer.startup();
			// setTimeout(function(){
			// 	Topic.publish("/overlay/right", {action: "set", panel: ContentPane});
			// }, 1000);



			this.inherited(arguments);
		}

	});
});
