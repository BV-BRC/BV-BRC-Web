define("cid/widget/DiseaseViewer", [
	"dojo/_base/declare","dijit/layout/TabContainer","dojo/on",
	"dojo/dom-class", "./DiseaseMap", "./DiseasePathogenVis","./DiseaseSummary"
], function(
	declare, TabContainer, on,
	domClass,DiseaseMap,DiseasePathogenVis,DiseaseSummary
){
	return declare([TabContainer], {
		"class": "ProteinFamilyViewer",
		postCreate: function(){
			this.inherited(arguments);

			this.diseaseSummary= new DiseaseSummary({title: "Summary"});
			this.addChild(this.diseaseSummary);
			this.diseasePathogenVis= new DiseasePathogenVis({title: "Disease-Pathogen Visualization"});
			this.addChild(this.diseasePathogenVis);
			this.diseaseMap= new DiseaseMap({title: "Disease Map"});
			this.addChild(this.diseaseMap);
		}

	});
});
