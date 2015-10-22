define([
	"dojo/_base/declare", "./GridContainer",
	"./SequenceGrid", "dijit/popup",
	"dijit/TooltipDialog","./FacetFilterPanel",
	"dojo/_base/lang","dojo/on"
], function(declare, GridContainer,
			Grid, popup,
			TooltipDialog,FacetFilterPanel,
			lang,on) {


	return declare([GridContainer], {
		facetFields: [],
		maxGenomeCount: 5000,
		dataModel: "genome_sequence",
		gridCtor: Grid
	});
});
