define([
	"dojo/_base/declare","dijit/layout/BorderContainer","dojo/on",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"../PageGrid","../formatter"
], function(
	declare, BorderContainer, on,
	domClass,ContentPane,domConstruct,
	Grid,formatter
){
	return declare([BorderContainer], {
		"baseClass": "GenomeList",
		"disabled":false,
		"query": null,
		_setQueryAttr: function(query){
			this.query = query;
			if (this.viewer){
				this.viewer.set("query", query);
			}
		},
		startup: function(){
			if (this._started) {return;}
			this.viewHeader = new ContentPane({content: "GenomeList Viewer", region: "top"});
			this.viewer = new Grid({
				region: "center",
				query: (this.query||""),
				apiToken: window.App.authorizationToken,
				apiServer: window.App.dataAPI,
				dataModel: "genome",
				columns: {
					id: {label: "Genome ID", field: "genome_id", hidden:true},
					commonName: {label: "Name", field: "common_name", hidden:true},
					genomeName: {label: "Genome Name", field: "genome_name", hidden:true},
					organismName: {label: "Organism Name", field: "organism_name"},
					genomeStatus: {label: "Genome Status", field: "genome_status"},
					isolationCountry: {label: "Isolation Country", field: "isolation_country"},
					host_name: {label: "Host Name", field: "host_name"},
					disease: {label: "Disease", field: "disease"},
					collectionDate: {label: "Collection Date", field: "collection_date", formatter: formatter.dateOnly},
					completionDate: {label: "Completion Date", field: "completion_date", formatter: formatter.dateOnly},
					patricCDS: {label: "PATRIC CDS", field: "patric_cds"},
					plasmids: {label: "Plasmids", field: "plasmids",hidden:true},
					sequences: {label: "Sequences", field: "sequences",hidden:true},
					gc_content: {label: "GC Content", field: "gc_content",hidden:true},
					genome_length: {label: "Length", field: "genome_length",hidden:true}

					// "plasmids","contigs","sequences","common_name","owner","genome_id","genome_status","patric_cds","gc_content",
					// "refseq_cds","genome_name","genome_length","public","brc1_cds","p2_genome_id","chromosomes","taxon_id","taxon_lineage_ids","taxon_lineage_names",
					// "phylum","order","genus","species","kingdom","class","family","_version_","date_inserted","date_modified"
				}
			});
			this.addChild(this.viewHeader);
			this.addChild(this.viewer);
			this.inherited(arguments);
			this.viewer.refresh();
		}
	});
});
