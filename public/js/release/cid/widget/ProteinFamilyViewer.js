define("cid/widget/ProteinFamilyViewer", [
	"dojo/_base/declare","dijit/layout/TabContainer","dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane",
	"./FilterPanel","dojo/topic","./PatricTool","dojo/store/JsonRest",
	"./ProteinFamilyGrid", "./Heatmap"
], function(
	declare, TabContainer, on,
	domClass,ContentPane,
	FilterPanel,Topic,PatricTool,Store,
	ProteinFamilyGrid, Heatmap
){


	return declare([TabContainer,PatricTool], {
		"class": "ProteinFamilyViewer",
		query: "",
		apiServer:"",
		dataModel: "figfam",
		startup: function(){
			if (this._started) { return; }
			this.inherited(arguments);
			this._started=true;
		},

		_setApiServerAttr: function(server){
			console.log("_setapiServerAttr: ", server);
				this.apiServer = server;
				if (this.figfamstore) {
					delete this.figfamstore;
				}
	
				this.figfamstore=this.createStore("figfam");
				if (this.ProteinFamilyGrid) { this.ProteinFamilyGrid.set('store', this.figfamstore, this.buildQuery("figfam")); }


		},

                _setActiveFilterAttr: function(filter){
                        console.log("Set Active Filter: ", filter, "started:", this._started);
                        this.activeFilter = filter;
//                        if (this._started) {
				var query = this.buildQuery("figfam");

				if (!this.ProteinFamilyGrid) {
					this.ProteinFamilyGrid= new ProteinFamilyGrid({title: "Protein Families",store:this.figfamstore, query:query, idProperty:"rownum"});
					this.addChild(this.ProteinFamilyGrid);
				}
				if (this.refresh) { this.refresh() };
 //                       }
                },

                buildQuery: function(table, extra){
			if (table=="figfam") { 
				var q = "?" + (this.activeFilter?( "in(gid,query(genomesummary,and(" + this.activeFilter +",limit(Infinity),values(genome_info_id))))" ):"")
				console.log("Built Query: ", q);
			}			
			return q;
                },

		createStore: function(dataModel){
			console.log("Create Store for ", dataModel, " at ", this.apiServer);
			var store = new Store({target: this.apiServer + "/" + dataModel + "/",idProperty:"rownum", headers:{
				"accept": "application/json",
				"content-type": "application/json",
				'X-Requested-With':null
			}});
			console.log("store: ", store);
			return store;
		},

		getFilterPanel: function(){
			console.log("getFilterPanel()");
			return FilterPanel;
		},

		refresh: function(){
			if (!this._started) { return; }
			if (this.ProteinFamilyGrid) {
				this.ProteinFamilyGrid.set("query", this.buildQuery("figfam"), " target: ", this.store);	
			}
		}	

	});
});
