define("p3/store/SpecialtyGeneJsonRest", [
	"dojo/_base/declare",
	"./P3JsonRest"
], function(declare,
			Store){
	return declare([Store], {
		dataModel: "sp_gene",
		idProperty: "id",
		facetFields: []
	});
});

