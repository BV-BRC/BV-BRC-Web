define([
	"dojo/_base/declare",
	"dojo/topic","dojo/on","dojo/dom","dojo/dom-class","dojo/dom-attr","dojo/dom-construct",
	"dijit/registry","dojo/request",
	"dojo/_base/Deferred",
	"dojo/store/JsonRest",
	"dojo/ready","./app","../router",
	"dojo/window","../widget/Drawer","dijit/layout/ContentPane",
	"../jsonrpc", "../panels"
],function(
	declare,
	Topic,on,dom,domClass,domAttr,domConstruct,
	Registry,xhr,
	Deferred,
	JsonRest,
	Ready,App,
	Router,Window,
	Drawer,ContentPane,
	RPC, Panels
) {
	return declare([App], {
		panels: Panels,
		startup: function(){
			var _self=this;
			Router.register("\/workspace(\/.*)", function(params, oldPath, newPath, state){
				console.log("Workspace URL Callback", params.newPath);
				var newState = {href: params.newPath}
				for (var prop in params.state){
					newState[prop]=params.state[prop]
				}
		
				var path = params.params[0] || "/"
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
			if (this.workspaceAPI){
				this.api.workspace = RPC(this.workspaceAPI, this.authorizationToken);
			}
			if (this.serviceAPI){
				this.api.service = RPC(this.serviceAPI, "OAuth " + this.authorizationToken);
			}
	
			// console.log("go()")
			// setTimeout(function(){
			// 	Router.go("/workspace/dmachi/foo/bar");

			// },2000);

			this.leftDrawer = new Drawer({topic: "/overlay/left"}).placeAt(document.body);
			this.leftDrawer.startup();
			console.log("leftDrawer", this.leftDrawer)
			// setTimeout(function(){
			// 	Topic.publish("/overlay/left", {action: "set", panel: ContentPane});
			// }, 1000);

			this.rightDrawer = new Drawer({topic: "/overlay/right", "class":"RightDrawer"}).placeAt(document.body);
			this.rightDrawer.startup();
			// setTimeout(function(){
			// 	Topic.publish("/overlay/right", {action: "set", panel: ContentPane});
			// }, 1000);



			this.inherited(arguments);
		}

	});
});
