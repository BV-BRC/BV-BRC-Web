define("cid/widget/TranscriptomicsViewer", [
	"dojo/_base/declare","dijit/layout/TabContainer","dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane",
	"./FilterPanel","dojo/topic","./PatricTool","dojo/store/JsonRest",
	"./TranscriptomicsExperimentsGrid", "./TranscriptomicsComparisonGrid"
], function(
	declare, TabContainer, on,
	domClass,ContentPane,
	FilterPanel,Topic,PatricTool,Store,
	ExperimentsGrid,ComparisonGrid
){


	return declare([TabContainer,PatricTool], {
		"class": "ProteinFamilyViewer",
		query: "",
		apiServer:"",
		startup: function(){
			if (this._started) { return; }
			this.inherited(arguments);
			this._started=true;
		},

		_setApiServerAttr: function(server){
			console.log("_setapiServerAttr: ", server);
				this.apiServer = server;
				if (this.experimentsstore) {
					delete this.experimentsstore;
				}

				if (this.comparisonstore) {
					delete this.comparisonstore;
				}
				if (this.genestore) {
					delete this.genestore;
				}
	
	
				this.experimentsstore=this.createStore("genexp-experiments");
				if (this.ExperimentsGrid) { this.ExperimentsGrid.set('store', this.experimentsstore, this.buildQuery("genexp-experiments")); }


				this.comparisonstore=this.createStore("genexp-sample");
				if (this.ComparisonGrid) { this.ComparisonGrid.set('store', this.comparisonstore, this.buildQuery("genexp-sample")); }

		},

                _setActiveFilterAttr: function(filter){
                        console.log("Set Active Filter: ", filter, "started:", this._started);
                        this.activeFilter = filter;

			if (!this.ExperimentsGrid) {
				this.ExperimentsGrid= new ExperimentsGrid({title: "Experiments",store:this.experimentsstore, query:this.buildQuery('genexp-experiments'), idProperty:"rownum"});
				this.addChild(this.ExperimentsGrid);
			}

			if (!this.ComparisonGrid) {
				this.ComparisonGrid= new ComparisonGrid({title: "Comparisons",store:this.comparisonstore, query:this.buildQuery('genexp-sample'), idProperty:"rownum"});
				this.addChild(this.ComparisonGrid);
			}
	
			if (this.refresh) { this.refresh() };
                },

                buildQuery: function(table, extra){
			if (table=="genexp-experiments") { 
				 var q = "?" + (this.activeFilter?( "in(gid,query(genomesummary,and(" + this.activeFilter +",limit(Infinity),values(genome_info_id))))" ):"") + (this.extra||"");
				console.log("Built Query: ", q);
			}else if (table=="genexp-sample") { 
				 var q = "?" + (this.activeFilter?( "in(gid,query(genomesummary,and(" + this.activeFilter +",limit(Infinity),values(genome_info_id))))" ):"") + (this.extra||"");
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
				this.ProteinFamilyGrid.set("query", this.buildQuery("genome"), " target: ", this.store);	
			}
		}	

	});
});
