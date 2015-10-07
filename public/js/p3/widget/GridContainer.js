define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar","./ContainerActionBar","dojo/_base/lang","./ItemDetailPanel",
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
			console.log("GridContainer " + this.id + " set child hash view: ", this.hashParams);
			console.log("  params:", params);
			this.set("filter", params?params.filter:"");
		},

		_setQueryAttr: function(query){
			console.log("GridContainer setQuery: ", query)
			if(this.query==query) { return; }

			this.query = query;
			console.log("Query Set: ", query);
			if (this.grid) {
				console.log("Found Grid")
				if (this.query && this.filterPanel){
					this.filterPanel.set("query");
				}

				if (this.filter){
					console.log("Found Filter: ", this.filter);
					query = (query||"") + "&" + this.filter;
				}

				if (this.facetFields && (this.facetFields.length > 0) && !this.filter){
					console.log("Found Facet Fields: ", this.facetFields)
					query = query +  "&facet(" + this.facetFields.map(function(f) { return "(field," + encodeURIComponent(f) + ")"; }) + ",(mincount,1))"; 
				}

				console.log("Set Grid Query: ", query);
				this.grid.set("query", query,this.filter?{showFacets:true}:{});
			}
		},

		_setFilterAttr: function(filter){
			if (filter==this.filter){return;}

			this.filter = filter;
			var query = this.query;

			if (this.grid) {
				if (this.filter && this.filterPanel){
					this.set("filter", this.filterPanel)
				}

				if (this.filter){
					query = query + "&" + this.filter;
				}

				if (this.facetFields && (this.facetFields.length > 0)&& !this.filter){
					query = query +  "&facet(" + this.facetFields.map(function(f) { return "(field," + encodeURIComponent(f) + ")"; }) + ",(mincount,1))"; 
				}
				console.log(this.id, " PerformQuery: ", query);
				this.grid.set("query", query,this.filter?{showFacets:false}:{});
			}
		},

		visible: false,
		_setVisibleAttr: function(visible){
			console.log("SET VISIBLE: ", visible);
			this.visible = visible;
			if (this.visible && !this._firstView){
					console.log("Trigger First View: ", this.id)
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
                                        console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);
         
                                        var children = this.getChildren();
                                        console.log("Children: ", children);
                                        if (children.some(function(child){
                                                return this.itemDetailPanel && (child.id==this.itemDetailPanel.id);
                                        }, this)){
                                                console.log("Remove Item Detail Panel");
                                                this.removeChild(this.itemDetailPanel);
                                        }else{
                                                console.log("Re-add child: ", this.itemDetailPanel);
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
			this.grid = new this.gridCtor({region: "center",query: this.query});
	
			this.containerActionBar = new ContainerActionBar({region: "top",layoutPriority: 7, splitter:false, "className": "BrowserHeader"});
			this.selectionActionBar= new ActionBar({region: "right",layoutPriority:4, style:"width:48px;text-align:center;",splitter:false});
			this.itemDetailPanel = new ItemDetailPanel({region: "right", style: "width:300px", splitter: false, layoutPriority:3});

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
				console.log("Selected: ", evt);
				var sel = Object.keys(evt.selected).map(lang.hitch(this,function(rownum){
					console.log("rownum: ", rownum);
					console.log("Row: ", evt.grid.row(rownum).data);
					return evt.grid.row(rownum).data;
				}));
				console.log("selection: ", sel);
				this.selectionActionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel);
			}));	

			this.grid.on("deselect", lang.hitch(this,function(evt){

				if (!evt.selected) { 
					this.actionPanel.set("selection", []); 
					this.itemDetailPanel.set("selection", []);
				}else{
					var sel = Object.keys(evt.selected).map(lang.hitch(this,function(rownum){
						console.log("rownum: ", rownum);
						console.log("Row: ", evt.grid.row(rownum).data);
						return evt.grid.row(rownum).data;
					}));
				}
				console.log("selection: ", sel);
				this.selectionActionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel);
			}));

			on(this.domNode, "ToggleFilters",lang.hitch(this,function(evt){
				console.log("toggleFilters");
				if (!this.filterPanel && this.getFilterPanel){
					this.filterPanel = this.getFilterPanel()
					this.filterPanel.region="top"
					this.filterPanel.splitter=true;
					this.layoutPriority = 2;
					this.addChild(this.filterPanel);
				}else if (this.filterPanel){
					var children = this.getChildren();
					if (children.some(function(child){
						return this.filterPanel && (child.id==this.filterPanel.id);
					},this)){
							this.removeChild(this.filterPanel)
					}else{
						this.addChild(this.filterPanel);						
					}
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

