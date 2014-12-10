define("cid/widget/TranscriptomicsComparisonGrid", [
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
				"title": {
					label: "Title",
					field: "title",
					sortable: true
				},
				"genes": {
					label: "Genes",
					field: "title",
					sortable: true
				},
				"significationGenesLR": {
					label: "Log Ratio - Significant Genes",
					field: "title",
					sortable: true
				},
				"significationGenesZS": {
					label: "Z Score - Significant Genes",
					field: "title",
					sortable: true
				},
				"pubmed": {
					label: "PubMed",
					field: "title",
					sortable: true
				},
				"linkout": {
					label: "Link Out",
					field: "title",
					sortable: true
				},
				"organism": {
					label: "Organism",
					field: "title",
					sortable: true
				},
				"strain": {
					label: "Strain",
					field: "title",
					sortable: true
				},
				"geneModification": {
					label: "Gene Modification",
					field: "title",
					sortable: true
				},
				"experimentalCondition": {
					label: "Experimental Condition",
					field: "title",
					sortable: true
				},
				"timepoint": {
					label: "Time Point",
					field: "title",
					sortable: true
				},
	
				"releaseDate": {
					label: "Release Date",
					field: "title",
					sortable: true
				}
			}

		}
	});
});
