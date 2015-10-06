define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar","./ContainerActionBar","dojo/_base/lang","./ItemDetailPanel",
	"dojo/topic","dojo/query"
], function(
	declare,BorderContainer,on,
	ActionBar, ContainerActionBar,lang,ItemDetailPanel,
	Topic,query

){

	return declare([BorderContainer], {
		gutters: false,
		gridCtor: null,
		query: null,
		filter: null,
		hashParams: null,
		style: "margin-left:15px;",
		facetFields: [],
		_setHashParamsAttr: function(params){
			this.hashParams = params;
			console.log("GridContainer " + this.id + " set child hash view: ", this.hashParams);
			console.log("  params:", params);
			this.set("filter", params?params.filter:"");
		},

		_setQueryAttr: function(query){
			this.query = query;

			if (this.grid) {
				if (this.filter){
					query = (query||"") + "&fq(" + this.filter + ")";
				}

				if (this.facetFields && !this.filter){
					query = query +  "&facet(" + this.facetFields.map(function(f) { return "(field," + f + ")"; }) + ",(mincount,1))"; 
				}
				this.grid.set("query", query,this.filter?{showFacets:true}:{});
			}
		},

		_setFilterAttr: function(filter){
			console.log("SET FILTER:" , filter)
			this.filter = filter;
			var query = this.query;

			if (this.grid) {
				if (this.filter){
					query = query + this.filter;
				}

				if (this.facetFields && !this.filter){
					query = query +  "&facet(" + this.facetFields.map(function(f) { return "(field," + f + ")"; }) + ",(mincount,1))"; 
				}
				console.log("PerformQuery: ", query);
				this.grid.set("query", query,this.filter?{showFacets:false}:{});
			}
		},

		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;
			if (this.visible && this.getFilterPanel){
				var fp = this.getFilterPanel();
				if (fp){
					Topic.publish("/overlay/left", {action: "set", panel: fp});
					return;
				}
			}
			
			Topic.publish("/overlay/left", {action: "hide"});
			
		},
		containerActions: [],
		selectionActions: [
			[
                                "ToggleItemDetail",
                                "fa fa-info-circle fa-2x",
                                {label: "DETAIL", persistent: true, validTypes: ["*"],tooltip: "Toggle Selection Detail"},
                                function(selection){
                                        console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);
                                        console.log("children(): ", this.getChildren());

                                        var children = this.getChildren();

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
		startup: function(){
			if (this._started) { return; }
			if (!this.gridCtor) {
				console.error("Missing this.gridCtor in GridContainer");
				return;
			}
			this.grid = new this.gridCtor({region: "center"});
			this.containerActionBar = new ContainerActionBar({region: "top",splitter:false, "className": "BrowserHeader"});
			this.selectionActionBar= new ActionBar({region: "right",layoutPriority:2, style:"width:48px;text-align:center;",splitter:false});
			this.itemDetailPanel = new ItemDetailPanel({region: "right", style: "width:300px", splitter: false, layoutPriority:1});
			this.addChild(this.containerActionBar);
			this.addChild(this.grid);
			this.addChild(this.selectionActionBar);
			this.addChild(this.itemDetailPanel);

			this.setupActions();
			this.listen();
			this.inherited(arguments);
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

