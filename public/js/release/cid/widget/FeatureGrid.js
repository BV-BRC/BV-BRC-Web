define("cid/widget/FeatureGrid", [
	"dojo/_base/declare","./Grid","dojo/on",
	"dojo/dom-class","./PatricTool","dojo/store/JsonRest",
	"./FilterPanel"

], function(
	declare, Grid, on,
	domClass,PatricTool,Store,
	FilterPanel
){
	return declare([Grid,PatricTool], {
		"class": "FeatureGrid",
		dataModel: "dnafeature",
		apiServer:"",
		constructor: function(){

			this.columns={ 
				"genomeName": {
					label: "Genome Name",
					className: "genomeNameColumn",
					field: "genome_name",
					sortable: true
				},
				"locusTag": {
					label: "Locus Tag",
					className: "idColumn locusTagColumn",
					field: "locus_tag",
					sortable: true
				},
				"refseqLocusTag": {
					label: "RefSeq Locus Tag",
					className: "idColumn locusTagColumn",
					field: "refseq_locus_tag",
					sortable: true
				},
				"geneSymbol": {
					label: "Gene Symbol",
					className: "idColumn geneSymbolColumn",
					field: "gene_symbol",
					sortable: true
				},
				"description": {
					label: "Product Description",
					className: "descriptionColumn",
					field: "description",
					sortable: true
				}
			}

		},

		_setApiServer: function(server){
			console.log("_setapiServerAttr: ", server);
			this.apiServer = server;
			this.set('store', this.createStore(this.dataModel), this.buildQuery());
		},

		startup: function(){
			if (this._started) { return; }
			this.store = this.createStore(this.dataModel);
			this.inherited(arguments);
			this._started=true;
		},
                _setActiveFilter: function(filter){
                        console.log("Set Active Filter: ", filter, "started:", this._started);
                        this.activeFilter = filter;
			this.set("query",this.buildQuery());
                },

                buildQuery: function(table, extra){
			var q = "?" + (this.activeFilter?( "in(gid,query(genomesummary,and(" + this.activeFilter +",limit(Infinity),values(genome_info_id))))" ):"") + (this.extra||""); 
			
			console.log("Feature Grid Query:" , q);
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
		}
	});
});
