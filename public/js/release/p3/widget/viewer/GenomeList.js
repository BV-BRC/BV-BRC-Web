define("p3/widget/viewer/GenomeList", [
	"dojo/_base/declare","dijit/layout/BorderContainer","dojo/on",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"../PageGrid"
], function(
	declare, BorderContainer, on,
	domClass,ContentPane,domConstruct,
	Grid
){
	return declare([BorderContainer], {
		"baseClass": "GenomeList",
		"disabled":false,
		"path": "/",
		startup: function(){
			if (this._started) {return;}
			this.viewHeader = new ContentPane({content: "GenomeList Viewer", region: "top"});
			this.viewer = new Grid({
				region: "center",
				query: "",
				apiServer: window.App.dataAPI,
				dataModel: "genome",
				columns: {
					id: {label: "Genome ID", field: "genome_id"},
					commonName: {label: "Name", field: "common_name"},
					genomeName: {label: "Genome Name", field: "genome_name", hidden:true},
					plasmids: {label: "Plasmids", field: "plasmids"},
					sequences: {label: "Sequences", field: "sequences"},
					gc_content: {label: "GC Content", field: "gc_content"},
					genome_length: {label: "Length", field: "genome_length"}

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
