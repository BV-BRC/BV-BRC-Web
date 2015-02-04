define([
	"dojo/request", "dojo/_base/declare","dojo/_base/lang", 
	"dojo/_base/Deferred","dojo/topic","./jsonrpc"
],function(
	xhr,declare,lang,
	Deferred,Topic,RPC
){

	var WorkspaceManager = (declare([], {
		constructor: function(){
			this.userWorkspaces=[];	
		},
		token: "",
		apiUrl: "",
		userId: "",
		init: function(apiUrl, token, userId){
			this.token = token;
			this.apiUrl = apiUrl
			this.api = RPC(apiUrl, token);

			if (userId) { 
				this.userId = userId; 
				this.getCurrentWorkspacePath();
			}
		},
		getCurrentWorkspacePath: function(){
				
		}
	}))()

	return WorkspaceManager;
});

