define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar","./ContainerActionBar","dojo/_base/lang","./ItemDetailPanel"
], function(
	declare,BorderContainer,on,
	ActionBar, ContainerActionBar,lang,ItemDetailPanel

){

	return declare([BorderContainer], {
		gutters: false,
		gridCtor: null,
		query: null,
		_setQueryAttr: function(query){
			this.query = query;
			if (this.grid) {
				this.grid.set("query", query);
			}
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

