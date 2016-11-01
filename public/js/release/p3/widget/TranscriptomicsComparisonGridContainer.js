define("p3/widget/TranscriptomicsComparisonGridContainer", [
	"dojo/_base/declare", "./GridContainer",
	"./TranscriptomicsComparisonGrid"
], function(declare, GridContainer,
			Grid){

	return declare([GridContainer], {
		gridCtor: Grid,
		containerType: "transcriptomics_sample_data",
		facetFields: [],
		maxGenomeCount: 5000,
		dataModel: "transcriptomics_sample",
		getFilterPanel: function(opts){
		},
		query: "&keyword(*)",
		containerActions: GridContainer.prototype.containerActions.concat([
		])
	});
});
