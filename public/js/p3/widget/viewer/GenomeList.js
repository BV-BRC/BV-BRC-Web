define([
	"dojo/_base/declare", "dijit/layout/ContentPane", "./_GenomeList", "../GenomeListOverview"
], function(declare, ContentPane, GenomeList, Overview){
	return declare([GenomeList], {
		defaultTab: "genomes",
		createOverviewPanel: function(){
			return new Overview({
				content: "Genome List Overview",
				title: "Overview",
				id: this.viewer.id + "_" + "overview"
			})
		}
	});
});
