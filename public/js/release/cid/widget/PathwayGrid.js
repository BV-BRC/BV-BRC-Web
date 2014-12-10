define("cid/widget/PathwayGrid", [
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
				"pathwayId": {
					label: "Pathway ID",
					className: "genomeNameColumn",
					field: "pathway_id",
					sortable: true
				},
				"pathwayName": {
					label: "Pathway Name",
					className: "idColumn locusTagColumn",
					field: "pathway_name",
					sortable: true
				},
				"pathwayClass": {
					label: "Pathway Class",
					className: "idColumn locusTagColumn",
					field: "pathway_class",
					sortable: true
				},
				"annotation": {
					label: "Annotation",
					className: "idColumn geneSymbolColumn",
					field: "annotation",
					sortable: true
				},
				"uniqueGenomeCount": {
					label: "Unique Genome Count",
					className: "",
					field: "description",
					sortable: true
				},
				"uniqueGeneCount": {
					label: "Unique Gene Count",
					className: "",
					field: "locusTag",
					sortable: true
				},
				"uniqueECCount": {
					label: "Unique EC Count",
					className: "idColumn locusTagColumn",
					field: "refseqLocusTag",
					sortable: true
				},
				"ecConversation": {
					label: "EC Conservation",
					className: "idColumn geneSymbolColumn",
					field: "geneSymbol",
					sortable: true
				},
				"geneConservation": {
					label: "Gene Conservation",
					className: "descriptionColumn",
					field: "description",
					sortable: true
				}

			}
		}
	});
});
