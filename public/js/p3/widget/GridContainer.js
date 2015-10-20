define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar", "./FilterContainerActionBar", "dojo/_base/lang", "./ItemDetailPanel",
	"dojo/topic", "dojo/query", "dijit/layout/ContentPane"
], function(
	declare, BorderContainer, on,
	ActionBar, ContainerActionBar, lang, ItemDetailPanel,
	Topic, query, ContentPane

) {

	return declare([BorderContainer], {
		gutters: false,
		gridCtor: null,
		query: "",
		filter: "",
		state: null,
		dataModel: "",
		hashParams: null,
		design: "headline",
		facetFields: [],
		enableFilterPanel: true,
		apiServer: window.App.dataServiceURL,
		constructor: function() {
			this._firstView = false;
		},

		postCreate: function() {
			this.inherited(arguments);
			this.watch("state", lang.hitch(this, "onSetState"));
		},

		// startup: function(){
		// 	this.inherited(arguments);
		// 	// this.onSetState("state","", this.state);
		// },

		onSetState: function(attr, oldState, state) {
			// console.log("GridContainer onSetState: ", state)
			if (!state) {
				// console.log("!state in grid container; return;")
				return;
			}
			var q = [];

			if (state.search) {
				q.push(state.search);
			}

			if (state.hashParams) {
				if (state.hashParams.filter) {
					q.push(state.hashParams.filter)
				}
			}
			// console.log(" Has Filter Panel?", !!this.filterPanel);

			if (this.filterPanel) {
				// console.log("    FilterPanel found");
				this.filterPanel.set("state", state);
			}
			// console.log("setState query: ",q.join("&"), " state: ", state)
			this.set("query", q.join("&"));

		},
		_setQueryAttr: function(query) {
			// console.log(this.id," GridContainer setQuery: ", query, " hasGrid?", !!this.grid, " hasFilter? ", !!this.filter );
			// console.log("    Query: ", query, "this.query: ", this.query)
			if (query == this.query) {
				console.log("   Skipping Query Update (unchanged)");
				return;
			}
			this.query = query;
			// this.query = query || "?keyword(*)"
			// console.log("Query Set: ", query);

			if (this.grid) {
				// console.log("    " + this.id + " Found Grid.")
				// if (query != this.grid.query){
				this.grid.set("query", query);
				//}
			}
			else {
				// console.log("No Grid Yet");
			}
		},

		_setApiServer: function(server) {
			this._set("apiServer", server);
			if (this.grid) {
				this.grid.set("apiServer", server);
			}
		},

		visible: false,
		_setVisibleAttr: function(visible) {
			// console.log("GridContainer setVisible: ", visible)
			this.visible = visible;
			if (this.visible && !this._firstView) {
				// console.log("Trigger First View: ", this.id)
				this.onFirstView();
			}
		},
		containerActions: [],
		selectionActions: [
			[
				"ToggleItemDetail",
				"fa fa-info-circle fa-2x", {
					label: "DETAIL",
					persistent: true,
					validTypes: ["*"],
					tooltip: "Toggle Selection Detail"
				},
				function(selection) {
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					var children = this.getChildren();
					// console.log("Children: ", children);
					if (children.some(function(child) {
							return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
						}, this)) {
						// console.log("Remove Item Detail Panel");
						this.removeChild(this.itemDetailPanel);
					}
					else {
						// console.log("Re-add child: ", this.itemDetailPanel);
						this.addChild(this.itemDetailPanel);
					}
				},
				true
			]

		],
		onFirstView: function() {
			if (this._firstView) {
				return;
			}
			if (!this.gridCtor) {
				console.error("Missing this.gridCtor in GridContainer");
				return;
			}
			if (this.enableFilterPanel) {
				// console.log("Create FilterPanel: ", this.state);

				this.containerActionBar = this.filterPanel = new ContainerActionBar({
					region: "top",
					layoutPriority: 7,
					splitter: true,
					"className": "BrowserHeader",
					dataModel: this.dataModel,
					facetFields: this.facetFields,
					state: this.state
				});

				// console.log("gridcontainer startup()", this.state)
				this.filterPanel.watch("filter", lang.hitch(this, function(attr, oldVal, newVal) {
					// console.log("FILTER PANEL SET FILTER", arguments)
					// console.log("oldVal: ", oldVal, "newVal: ", newVal, "state.hashParams.filter: ", this.state.hashParams.filter)
					// console.log("setFilter Watch() callback", newVal);
					if ((oldVal != newVal) && (newVal != this.state.hashParams.filter)) {
						// console.log("Emit UpdateHash: ", newVal);
						on.emit(this.domNode, "UpdateHash", {
							bubbles: true,
							cancelable: true,
							hashProperty: "filter",
							value: newVal,
							oldValue: oldVal
						})
					}
				}));
			}

			// console.log("This.query firstView: ", this.query);
			// console.log("this.filter: firstView: ", this.filter);
			// console.log("Create Grid firstView   Query:  ", this.query, " State: ",this.state)

			// To Avoid creating an initial grid with a query of "" (which sends an unneeded request), create a starting query if we can to pass to the new grid
			var q = []
			if (this.state) {
				if (this.state.search) {
					q.push(this.state.search);
				}
				if (this.state.hashParams && this.state.hashParams.filter) {
					q.push(this.state.hashParams.filter);
				}
				if (q.length < 1) {
					q = "";
				}
				else if (q.length == 1) {
					q = q[0];
				}
				else {
					q = "and(" + q.join(",") + ")";
				}
			}
			else {
				q = ""
			}

			// console.log("GridContainer create grid", this.state, q)
			// console.log("GridContainer API Server: ", this.apiServer)
			this.grid = new this.gridCtor({
				region: "center",
				query: q,
				state: this.state,
				apiServer: this.apiServer
			});

			this.selectionActionBar = new ActionBar({
				region: "right",
				layoutPriority: 4,
				style: "width:48px;text-align:center;",
				splitter: false
			});
			this.itemDetailPanel = new ItemDetailPanel({
				region: "right",
				style: "width:250px",
				minSize: 150,
				splitter: true,
				layoutPriority: 3
			});

			if (this.containerActionBar) {
				this.addChild(this.containerActionBar);
			}
			this.addChild(this.grid);
			this.addChild(this.selectionActionBar);
			this.addChild(this.itemDetailPanel);

			this.setupActions();
			this.listen();
			this.inherited(arguments);
			this._firstView = true;
		},

		listen: function() {
			this.grid.on("select", lang.hitch(this, function(evt) {
				// console.log("Selected: ", evt);
				var sel = Object.keys(evt.selected).map(lang.hitch(this, function(rownum) {
					// console.log("rownum: ", rownum);
					// console.log("Row: ", evt.grid.row(rownum).data);
					return evt.grid.row(rownum).data;
				}));
				// console.log("selection: ", sel);
				this.selectionActionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel);
			}));

			this.grid.on("deselect", lang.hitch(this, function(evt) {

				if (!evt.selected) {
					this.actionPanel.set("selection", []);
					this.itemDetailPanel.set("selection", []);
				}
				else {
					var sel = Object.keys(evt.selected).map(lang.hitch(this, function(rownum) {
						// console.log("rownum: ", rownum);
						// console.log("Row: ", evt.grid.row(rownum).data);
						return evt.grid.row(rownum).data;
					}));
				}
				// console.log("selection: ", sel);
				this.selectionActionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel);
			}));



			on(this.domNode, "ToggleFilters", lang.hitch(this, function(evt) {
				// console.log("toggleFilters");
				if (!this.filterPanel && this.getFilterPanel) {
					this.filterPanel = this.getFilterPanel()
					this.filterPanel.region = "top"
					this.filterPanel.splitter = true;
					this.layoutPriority = 2;
					this.addChild(this.filterPanel);
				}
				else if (this.filterPanel) {
					// console.log("this.filterPanel.minimized: ", this.filterPanel.minimized);
					if (this.filterPanel.minimized) {
						this.filterPanel.minimized = false;
						this.filterPanel.resize({
							h: this.filterPanel.minSize + 150
						});
					}
					else {
						this.filterPanel.minimized = false;
						this.filterPanel.resize({
							h: this.filterPanel.minSize
						});
					}
					this.resize();
				}
			}));
		},

		setupActions: function() {
			if (this.containerActionBar) {
				this.containerActions.forEach(function(a) {
					this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
				}, this);
			}

			this.selectionActions.forEach(function(a) {
				this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
			}, this);

		}
	});
});