define("p3/widget/WorkspaceExplorerView", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dojo/dom-construct", "./WorkspaceGrid",
	"dojo/_base/Deferred", "dojo/dom-geometry","../JobManager",
	"dojo/topic"
], function(
	declare, WidgetBase, on,
	domClass, domConstr, WorkspaceGrid,
	Deferred, domGeometry,JobManager,
	Topic
) {
	return declare([WorkspaceGrid], {
		"baseClass": "WorkspaceExplorerView",
		"disabled": false,
		path: "/",

		listWorkspaceContents: function(ws) {
			var _self = this;
			if (ws[ws.length - 1] == "/") {
				ws = ws.substr(0, ws.length - 1)
			}
			if (!ws) { ws = "/" }

			return Deferred.when(window.App.api.workspace("Workspace.ls", [{
					paths: [ws],
					includeSubDirs: false,
					Recursive: false
				}]), function(results) {
					console.log("Results: ", results)
					console.log("path: ", ws);
					if (!results[0] || !results[0][ws]) {
						return [];
					}
					return results[0][ws].map(function(r) {
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
				},
				function(err) {
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
				console.log("Workspace Contents", contents);
				_self.render(_self.path, contents);
			})


		},

		startup: function() {
			if (this._started) {
				return;
			}
			this.inherited(arguments);

			var _self = this;

			this.listWorkspaceContents(this.path).then(function(contents) {
				console.log("Workspace Contents", contents);
				_self.render(_self.path, contents);
			})

			Topic.subscribe("/Jobs", function(msg){
				if (msg.type=="JobStatus") {
					console.log("JobStatus MSG: ", msg.job);
				}else if (msg.type=="JobStatusChanged") {
					console.log("Job Status Changed From ", msg.oldStatus, " to ", msg.status);
				}
			});

		},

		_setPath: function(val) {
			this.path = val;
			var _self = this;
			console.log("WorkspaceExplorerView setPath", val)
			if (this._started) {
				this.listWorkspaceContents(this.path).then(function(contents) {
					console.log("Workspace Contents", contents);
					_self.render(_self.path, contents);
				});
			}
		}
	});
});
