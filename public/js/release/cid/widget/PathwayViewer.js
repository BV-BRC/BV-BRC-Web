define("cid/widget/PathwayViewer", [
	"dojo/_base/declare","dijit/layout/TabContainer","dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane",
	"./FilterPanel","dojo/topic","./PatricTool","dojo/store/JsonRest",
	"./PathwayGrid", "./ECNumberGrid","./GeneGrid"
], function(
	declare, TabContainer, on,
	domClass,ContentPane,
	FilterPanel,Topic,PatricTool,Store,
	PathwayGrid,ECNumberGrid,GeneGrid
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
				if (this.pathwaystore) {
					delete this.pathwaystore;
				}

				if (this.ecnumberstore) {
					delete this.ecnumberstore;
				}
				if (this.genestore) {
					delete this.genestore;
				}
	
	
				this.pathwaystore=this.createStore("pathway");
				if (this.PathwayGrid) { this.PathwayGrid.set('store', this.pathwaystore, this.buildQuery("pathway")); }


				this.ecnumberstore=this.createStore("ecnumber");
				if (this.ECNumberGrid) { this.ECNumberGrid.set('store', this.ecnumberstore, this.buildQuery("ecnumber")); }

		},

                _setActiveFilterAttr: function(filter){
                        console.log("Set Active Filter: ", filter, "started:", this._started);
                        this.activeFilter = filter;

			if (!this.PathwayGrid) {
				this.PathwayGrid= new PathwayGrid({title: "Pathways",store:this.pathwaystore, query:this.buildQuery('pathway'), idProperty:"rownum"});
				this.addChild(this.PathwayGrid);
			}

			if (!this.ECNumberGrid) {
				this.ECNumberGrid= new ECNumberGrid({title: "EC Numbers",store:this.ecnumberstore, query:this.buildQuery('ecnumber'), idProperty:"rownum"});
				this.addChild(this.ECNumberGrid);
			}
	
			if (this.refresh) { this.refresh() };
                },

                buildQuery: function(table, extra){
			if (table=="pathway") { 
				 var q = "?" + (this.activeFilter?( "in(gid,query(genomesummary,and(" + this.activeFilter +",limit(Infinity),values(genome_info_id))))" ):"") + (this.extra||"");
				console.log("Built Query: ", q);
			}else if (table=="ecnumber") { 
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
