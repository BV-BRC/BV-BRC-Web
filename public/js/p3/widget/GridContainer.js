define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar","./FilterContainerActionBar","dojo/_base/lang","./ItemDetailPanel",
	"dojo/topic","dojo/query", "dijit/layout/ContentPane"
], function(
	declare,BorderContainer,on,
	ActionBar, ContainerActionBar,lang,ItemDetailPanel,
	Topic,query,ContentPane

){

	return declare([BorderContainer], {
		gutters: false,
		gridCtor: null,
		query: null,
		filter: null,
		hashParams: null,
		design: "headline",
		facetFields: [],
		constructor: function(){
			this._firstView=false;
		},
		_setHashParamsAttr: function(params){
			this.hashParams = params;
			// console.log("GridContainer " + this.id + " set child hash view: ", this.hashParams);
			// console.log("  params:", params);
			this.set("filter", params?params.filter:"");
		},

		_setQueryAttr: function(query){
			// console.log(this.id," GridContainer setQuery: ", query, " hasGrid?", !!this.grid, " hasFilter? ", !!this.filter );
			if (query == this.query) { console.log("   Skipping Query Update (unchanged)"); }
			this.query = query;
			// this.query = query || "?keyword(*)"
			// console.log("Query Set: ", query);
			if (this.filterPanel){
				// console.log('   Set FilterPanel Query', this.query)
				this.filterPanel.set("query", this.query);
			}

			if (this.grid) {
				// console.log("    " + this.id + " Found Grid")
				var q = this.query;

				if (this.filter){
					// console.log("    Found Filter: ", this.filter);
					q = (q||"?") + "&" + this.filter;
				}

				// if (this.facetFields && (this.facetFields.length > 0) && !this.filter){
				//  	console.log("     Found Facet Fields: ", this.facetFields)
				//  	query = query +  "&facet(" + this.facetFields.map(function(f) { return "(field," + encodeURIComponent(f) + ")"; }) + ",(mincount,1))"; 
				// }

				// console.log("Set Grid Query: ", q);
				this.grid.set("query", q);
			}else{
				console.log("No Grid Yet.")
			}
		},

		_setFilterAttr: function(filter){
			// console.log(this.id, " GridContainer setFilter: ", filter)
			if (filter==this.filter){console.log("   Skipping Filter update (unchanged)"); return;}
			// console.log("  Updating Filter: ", filter)

			this.filter = filter;

			var query = this.query;

			if (this.filter && this.filterPanel){
				// console.log("Set Filter Panel 'filter': ", this.filter);
				this.filterPanel.set("filter", this.filter)
			}

			if (this.grid) {
					// console.log("    " + this.id + " Found Grid (in setFilter)")
				if (this.filter){
					query = (query||"?") + "&" + this.filter;
				}

				// if (this.facetFields && (this.facetFields.length > 0)&& !this.filter){
				// 	query = query +  "&facet(" + this.facetFields.map(function(f) { return "(field," + encodeURIComponent(f) + ")"; }) + ",(mincount,1))"; 
				// }
				// console.log(this.id, " set grid query: ", query);
				this.grid.set("query", query);
			}else{
				// console.log("No Grid Yet for setFilter()");
			}
		},

		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;
			if (this.visible && !this._firstView){
					// console.log("Trigger First View: ", this.id)
					this.onFirstView();
			}

			// if (this.visible && this.getFilterPanel){
			// 	var fp = this.getFilterPanel();
			// 	if (fp){
			// 		Topic.publish("/overlay/left", {action: "set", panel: fp});
			// 		return;
			// 	}
			// }
			
			// Topic.publish("/overlay/left", {action: "hide"});
			
		},
		containerActions: [],
		selectionActions: [
			[
                                "ToggleItemDetail",
                                "fa fa-info-circle fa-2x",
                                {label: "DETAIL", persistent: true, validTypes: ["*"],tooltip: "Toggle Selection Detail"},
                                function(selection){
                                        // console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);
         
                                        var children = this.getChildren();
                                        // console.log("Children: ", children);
                                        if (children.some(function(child){
                                                return this.itemDetailPanel && (child.id==this.itemDetailPanel.id);
                                        }, this)){
                                                // console.log("Remove Item Detail Panel");
                                                this.removeChild(this.itemDetailPanel);
                                        }else{
                                                // console.log("Re-add child: ", this.itemDetailPanel);
                                                this.addChild(this.itemDetailPanel);
                                        }
                                },
                                true
                        ]

		],
		onFirstView: function(){
			if (this._firstView) { return; }
			if (!this.gridCtor) {
				console.error("Missing this.gridCtor in GridContainer");
				return;
			}
			// console.log("This.query firstView: ", this.query);
			// console.log("this.filter: firstView: ", this.filter);
			this.grid = new this.gridCtor({region: "center",query: this.query});
	
			this.containerActionBar = this.filterPanel = new ContainerActionBar({region: "top",layoutPriority: 7, splitter:true, "className": "BrowserHeader",dataModel: this.grid.dataModel,facetFields: this.facetFields, query: this.query, filter: this.filter});
			this.selectionActionBar= new ActionBar({region: "right",layoutPriority:4, style:"width:48px;text-align:center;",splitter:false});
			this.itemDetailPanel = new ItemDetailPanel({region: "right", style: "width:250px", minSize:150, splitter: true, layoutPriority:3});

			this.addChild(this.containerActionBar);
			this.addChild(this.grid);
			this.addChild(this.selectionActionBar);
			this.addChild(this.itemDetailPanel);
	
			this.setupActions();
			this.listen();
			this.inherited(arguments);
			this._firstView=true;
		},

		listen: function(){
			this.grid.on("select", lang.hitch(this,function(evt){
				// console.log("Selected: ", evt);
				var sel = Object.keys(evt.selected).map(lang.hitch(this,function(rownum){
					// console.log("rownum: ", rownum);
					// console.log("Row: ", evt.grid.row(rownum).data);
					return evt.grid.row(rownum).data;
				}));
				// console.log("selection: ", sel);
				this.selectionActionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel);
			}));	

			this.grid.on("deselect", lang.hitch(this,function(evt){

				if (!evt.selected) { 
					this.actionPanel.set("selection", []); 
					this.itemDetailPanel.set("selection", []);
				}else{
					var sel = Object.keys(evt.selected).map(lang.hitch(this,function(rownum){
						// console.log("rownum: ", rownum);
						// console.log("Row: ", evt.grid.row(rownum).data);
						return evt.grid.row(rownum).data;
					}));
				}
				// console.log("selection: ", sel);
				this.selectionActionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel);
			}));

			this.filterPanel.watch("filter", lang.hitch(this, function(attr,oldVal,newVal){
				// console.log("setFilter Watch() callback", newVal);
				on.emit(this.domNode, "UpdateHash", {bubbles: true, cancelable: true, hashProperty: "filter", value: newVal, oldValue: oldVal} )
			}));

			on(this.domNode, "ToggleFilters",lang.hitch(this,function(evt){
				// console.log("toggleFilters");
				if (!this.filterPanel && this.getFilterPanel){
					this.filterPanel = this.getFilterPanel()
					this.filterPanel.region="top"
					this.filterPanel.splitter=true;
					this.layoutPriority = 2;
					this.addChild(this.filterPanel);
				} else if (this.filterPanel){
					// console.log("this.filterPanel.minimized: ", this.filterPanel.minimized);
					if (this.filterPanel.minimized) {
						this.filterPanel.minimized=false;
						this.filterPanel.resize({h:240});
					}else{
						this.filterPanel.minimized=false;
						this.filterPanel.resize({h:55});
					}
					this.resize();
				}
			}));
		/*
			this.grid.on("ItemDblClick", lang.hitch(this,function(evt){
				console.log("ItemDblClick: ", evt);
				if (evt.item && evt.item.type && (this.navigableTypes.indexOf(evt.item.type)>=0)){
					this.actionPanel.set("selection", []);
					this.itemDetailPanel.set("selection", []);
					console.log("SHOW LOADING STATUS SOMEHOW");	
					newPanel.clearSelection();
				}else{
					console.log("non-navigable type, todo: show info panel when dblclick");
				}

			}));
		*/
		},

		setupActions: function(){
			this.containerActions.forEach(function(a){
				this.containerActionBar.addAction(a[0],a[1],a[2],lang.hitch(this,a[3]),a[4]);
			}, this);

			this.selectionActions.forEach(function(a){
				this.selectionActionBar.addAction(a[0],a[1],a[2],lang.hitch(this,a[3]),a[4]);
			}, this);
	
		}
	});
});

