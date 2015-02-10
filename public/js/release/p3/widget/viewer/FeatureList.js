define("p3/widget/viewer/FeatureList", [
	"dojo/_base/declare","dijit/layout/BorderContainer","dojo/on",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"../PageGrid","../formatter"
], function(
	declare, BorderContainer, on,
	domClass,ContentPane,domConstruct,
	Grid,formatter
){
	return declare([BorderContainer], {
		"baseClass": "FeatureList",
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
			this.viewHeader = new ContentPane({content: "FeatureList Viewer", region: "top"});
			this.viewer = new Grid({
				region: "center",
				query: (this.query||""),
				apiToken: window.App.authorizationToken,
				apiServer: window.App.dataAPI,
				dataModel: "genome_feature",
				columns: {
					genome_name: {label: "Genome Name", field: "genome_name", hidden: false},
					seed_id: {label: "SEED ID", field: "seed_id", hidden: false},
					alt_locus_tag: {label: "Alt Locus Tag", field: "alt_locus_tag", hidden: false},
					product: {label: "Product", field: "product", hidden: false},
					location: {label: "Location", field: "location", hidden: true},
					gene_id: {label: "Gene ID", field: "gene_id", hidden: true},
					accession: {label: "Accession", field: "accession", hidden: true},
					start: {label: "Start", field: "start", hidden: true},
					feature_id: {label: "Feature ID", field: "feature_id", hidden: true},
					sequence_id: {label: "Sequence ID", field: "sequence_id", hidden: true},
					annotation: {label: "Annotation", field: "annotation", hidden: true},
					genome_id: {label: "Genome ID", field: "genome_id", hidden: true},
					gi: {label: "GI", field: "gi", hidden: true},
					p2_feature_id: {label: "P2 Feature ID", field: "p2_feature_id", hidden: true},
					pos_group: {label: "POS Group", field: "pos_group", hidden: true},
					na_length: {label: "NA Length", field: "na_length", hidden: true},
					strand: {label: "Strand", field: "strand", hidden: true},
					segments: {label: "Segments", field: "segments", hidden: true},
					feature_type: {label: "Feature Type", field: "feature_type", hidden: true},
					taxon_id: {label: "Taxon ID", field: "taxon_id", hidden: true},
					end: {label: "END", field: "end", hidden: true}
				}
			});
			this.addChild(this.viewHeader);
			this.addChild(this.viewer);
			this.inherited(arguments);
			this.viewer.refresh();
		}
	});
});
