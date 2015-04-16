define("p3/widget/WorkspaceManager", [
	"dojo/_base/declare","dijit/layout/BorderContainer","dojo/on",
	"dojo/dom-class","dojo/request","dojo/_base/lang",
	"dojo/dom-construct","./Button","dojo/dnd/Target","dojo/topic",
	"dojo/aspect","dijit/Dialog","dijit/registry","./WorkspaceGroupButton",
	"dijit/layout/ContentPane","./ActionTabContainer",
	"./WorkspaceBrowser","./WorkspaceGroups","./WorkspaceJobs",
	"./WorkspaceGlobalController", "./WorkspaceController",
	"./WorkspaceItemDetail"
], function(
	declare, BorderContainer, on,
	domClass,xhr,lang,
	domConstruct,Button,Target,Topic,
	aspect,Dialog,Registry,WorkspaceGroupButton,
	ContentPane,TabContainer,
	WorkspaceBrowser,WorkspaceGroups,WorkspaceJobs,
	WorkspaceGlobalController,WorkspaceController,
	WorkspaceItemDetail
){
	return declare([BorderContainer], {
		"workspaceServer": "",
		"currentWorkspace": "",
		gutters:false,
		liveSplitters: true,
		design: "headline",
		style: "margin:-1px;padding:0px;",
		path: "/",
		startup: function(){
			if (this._started){ return; }
			this.inherited(arguments);

//			this.wsGlobal = new WorkspaceGlobalController({path: this.path, region: "top", splitter:false, style: "border:0px;margin:-1px;margin-top:-4px;margin-left:-4px;margin-right:-4px;background:#efefef"});
//			this.wsController = new WorkspaceController({content:"Workspace Controller", region: "bottom", splitter:false});
			//this.workspaceBrowserTabs = new TabContainer({region: "center"});
			this.workspaceBrowser = new WorkspaceBrowser({title: "Explorer", path: this.path, region: "center"});
		
			//this.workspaceGroups = new WorkspaceGroups({content: "Groups", title: "Groups"})
			//this.workspaceJobs = new WorkspaceJobs({content: "Jobs", title: "Jobs"})
			//this.workspaceBrowserTabs.addChild(this.workspaceBrowser);
			//this.workspaceBrowserTabs.addChild(this.workspaceGroups);
			//this.workspaceBrowserTabs.addChild(this.workspaceJobs);
			
			//this.workspaceDetail = new WorkspaceItemDetail({content: "Workspace Detail", region: "right", splitter: true,style: "width:250px;min-width:150px;margin:-1px"})

//			this.addChild(this.wsGlobal)
			//this.addChild(this.workspaceBrowserTabs);
			this.addChild(this.workspaceBrowser);
			// this.addChild(this.workspaceDetail);	
//			this.addChild(this.wsController);

		
		},


		_setPathAttr: function(val){
			this.path = val;
			console.log("Workspace Manager Set Path: ", this.path, "started: ", this._started);
			if (this._started){
				console.log("Workspace Manager Set Path: ", this.path)

//				this.wsGlobal.set('path',val);
				this.workspaceBrowser.set("path", val)
			}
		}
	
	});
});
