define("p3/widget/viewer/GenomeList", [
	"dojo/_base/declare",
	"dijit/layout/ContentPane",
	"./_GenomeList", "../GenomeListOverview"
], function(declare,
			ContentPane,
			GenomeList, GenomeListOverview){

	return declare([GenomeList], {
		defaultTab: "genomes",
		createOverviewPanel: function(){
			return new GenomeListOverview({
				content: "Genome List Overview",
				title: "Overview",
				id: this.viewer.id + "_" + "overview"
			})
		}
	});
});
