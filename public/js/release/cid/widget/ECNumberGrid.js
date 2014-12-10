define("cid/widget/ECNumberGrid", [
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
					field: "rownum",
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
					field: "geneSymbol",
					sortable: true
				},
				"ecNumber": {
					label: "EC Number",
					className: "",
					field: "ec_number",
					sortable: true
				},
				"description": {
					label: "Description",
					className: "descriptionColumn ",
					field: "locusTag",
					sortable: true
				},
				"genomeCount": {
					label: "Genome Count",
					className: "idColumn locusTagColumn",
					field: "genomeCount",
					sortable: true
				},
				"uniqueGeneCount": {
					label: "Unique Gene Count",
					className: "idColumn geneSymbolColumn",
					field: "uniqueGeneCount",
					sortable: true
				}
			}
		}
	});
});
