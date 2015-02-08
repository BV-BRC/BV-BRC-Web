define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dojo/dom-construct", "./WorkspaceGrid",
	"dojo/_base/Deferred", "dojo/dom-geometry","../JobManager",
	"dojo/topic",'../WorkspaceManager'
], function(
	declare, WidgetBase, on,
	domClass, domConstr, WorkspaceGrid,
	Deferred, domGeometry,JobManager,
	Topic,WorkspaceManager
) {
	return declare([WorkspaceGrid], {
		"disabled": false,
		path: "/",

		listWorkspaceContents: function(ws) {
			var _self = this;
			if (ws[ws.length - 1] == "/") {
				ws = ws.substr(0, ws.length - 1)
			}
			if (!ws) { ws = "/" }

			return Deferred.when(WorkspaceManager.getFolderContents(ws),function(res){ return res; }, function(err) {
					console.log("Error Loading Workspace:", err);
					_self.showError(err);
				})
		},

		showError: function(err) {
			var n = domConstr.create("div", {
				style: {
					position: "relative",
					zIndex: 999,
					padding: "10px",
					margin: "auto",
					"margin-top": "300px",
					width: "30%",
					border: "2px solid #aaa",
					"border-radius": "4px",
					"text-align": "center",
					color: "red",
					"font-size": "1.2em"
				},
				innerHTML: err
			}, this.domNode);
	
		},

		postCreate: function() {
			this.inherited(arguments);
		},

		render: function(val, items) {
			this.refresh();
			this.renderArray(items);
			// this.refresh();	
		},

		refreshWorkspace: function(){
			var _self=this;
			this.listWorkspaceContents(this.path).then(function(contents) {
				_self.render(_self.path, contents);
			})


		},

		startup: function() {
			if (this._started) {
				return;
			}
			this.inherited(arguments);
			domClass.add(this.domNode, "WorkspaceExplorerView");

			var _self = this;

			this.listWorkspaceContents(this.path).then(function(contents) {
				_self.render(_self.path, contents);
			})

			Topic.subscribe("/refreshWorkspace", function(msg){
				_self.refreshWorkspace();
			});



			Topic.subscribe("/Jobs", function(msg){
				// if (msg.type=="JobStatus") {
				// 	console.log("JobStatus MSG: ", msg.job);
				// }else if (msg.type=="JobStatusChanged") {
				// 	console.log("Job Status Changed From ", msg.oldStatus, " to ", msg.status);
				// }
			});

		},

		_setPath: function(val) {
			this.path = val;
			var _self = this;
			//console.log("WorkspaceExplorerView setPath", val)
			if (this._started) {
				this.listWorkspaceContents(this.path).then(function(contents) {
			//		console.log("Workspace Contents", contents);
					_self.render(_self.path, contents);
				});
			}
		}
	});
});
