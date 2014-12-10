define("cid/widget/GeneGrid", [
	"dojo/_base/declare","./Grid","dojo/on",
	"dojo/dom-class"
], function(
	declare, Grid, on,
	domClass
){
	return declare([Grid], {
		"class": "FeatureGrid",
		constructor: function(){
			this.columns={ 
				"genomeName": {
					label: "Genome Name",
					className: "genomeNameColumn",
					field: "genomeName",
					sortable: true
				},
				"locusTag": {
					label: "Locus Tag",
					className: "idColumn locusTagColumn",
					field: "locusTag",
					sortable: true
				},
				"refseqLocusTag": {
					label: "RefSeq Locus Tag",
					className: "idColumn locusTagColumn",
					field: "refseqLocusTag",
					sortable: true
				},
				"geneSymbol": {
					label: "Gene Symbol",
					className: "idColumn geneSymbolColumn",
					field: "geneSymbol",
					sortable: true
				},
				"description": {
					label: "Product Description",
					className: "descriptionColumn",
					field: "description",
					sortable: true
				}
			}
		}
	});
});
