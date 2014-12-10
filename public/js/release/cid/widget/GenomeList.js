define("cid/widget/GenomeList", [
	"dojo/_base/declare","dijit/layout/TabContainer","dojo/on",
	"dojo/dom-class", "./GenomeGrid", "./SequenceGrid","dijit/layout/ContentPane",
	"./FilterPanel","dojo/topic","./PatricTool","dojo/store/JsonRest"
], function(
	declare, TabContainer, on,
	domClass,GenomeGrid,SequenceGrid,ContentPane,
	FilterPanel,Topic,PatricTool,Store
){


	return declare([TabContainer,PatricTool], {
		"class": "GenomeList",
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
				if (this.genomestore) {
					delete this.genomestore;
				}

				if (this.sequencestore) {
					delete this.sequencestore;
				}
	
				this.genomestore=this.createStore("genomesummary");
				if (this.GenomeGrid) { this.GenomeGrid.set('store', this.genomestore, this.buildQuery("genome")); }

				this.sequencestore=this.createStore("sequenceinfo");
				if (this.SequenceGrid ) { this.SequenceGrid.set('store', this.sequencestore, this.buildQuery("sequenceinfo")); }

		},

                _setActiveFilterAttr: function(filter){
                        console.log("Set Active Filter: ", filter, "started:", this._started);
                        this.activeFilter = filter;
//                        if (this._started) {

				if (!this.GenomeGrid) {
					this.GenomeGrid= new GenomeGrid({title: "Genomes",store:this.genomestore, query:this.buildQuery("genome"), idProperty:"rownum"});
					this.addChild(this.GenomeGrid);
				}

				if (!this.SequenceGrid){
//					console.log("Create New Sequence Grid: ", SequenceGrid);
					this.SequenceGrid= new SequenceGrid({title: "Sequences",store:this.sequencestore, idProperty:"rownum", query:this.buildQuery("sequenceinfo")}); 
					this.addChild(this.SequenceGrid);
				}	
				if (this.refresh) { this.refresh() };
 //                       }
                },

                buildQuery: function(table, extra){
			if (table=="genome") { 
	                        var q = "?" + (this.activeFilter?( "" + this.activeFilter +"" ):"")   +  (this.query||"") + (this.extra||"");
				console.log("Built Query: ", q);
			}else if (table == "sequenceinfo"){
				console.log("this.activeFilter: ", this.activeFilter);
	                        var q = "?" + (this.activeFilter?( "in(gid,query(genomesummary,and(" + this.activeFilter +",limit(Infinity),values(genome_info_id))))" ):"") + (this.query||"") + (this.extra||""); 
				console.log("SequenceInfo Query : ", q);
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
			if (this.GenomeGrid) {
				this.GenomeGrid.set("query", this.buildQuery("genome"), " target: ", this.store);	
			}
			if (this.SequenceGrid) {
				this.SequenceGrid.set("query", this.buildQuery("sequenceinfo") );
			}
		}	

	});
});
