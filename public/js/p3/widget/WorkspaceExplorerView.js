define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dojo/dom-construct", "./WorkspaceGrid",
	"dojo/_base/Deferred", "dojo/dom-geometry"
], function(
	declare, WidgetBase, on,
	domClass, domConstr, WorkspaceGrid,
	Deferred, domGeometry
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
			return Deferred.when(window.App.api.workspace("Workspace.list_workspace_hierarchical_contents", [{
					directory: ws,
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
							id: r[0],
							name: r[1],
							type: r[2],
							creation_time: r[3],
							link_reference: r[4],
							owner_id: r[5],
							workspaceId: r[6],
							workspaceName: r[7],
							path: r[8],
							size: r[9],
							userMeta: r[10],
							autoMeta: r[11]
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