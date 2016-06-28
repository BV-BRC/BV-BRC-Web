define("p3/widget/viewer/GenomeList", [
	"dojo/_base/declare", "dijit/layout/ContentPane", "./_GenomeList", "../GenomeListOverview"
], function(declare, ContentPane, GenomeList, Overview){
	return declare([GenomeList], {
		defaultTab: "genomes",
		onSetQuery: function(attr, oldVal, newVal){
			// prevent default action
		},
		setActivePanelState: function(){

			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";
			// console.log("Active: ", active, "state: ", this.state);

			var activeTab = this[active];

			if(!activeTab){
				console.error("ACTIVE TAB NOT FOUND: ", active);
				return;
			}
			switch(active){
				default:
					var activeQueryState;
					if(this.state && this.state.genome_ids){
						activeQueryState = this.state;
					}

					if(activeQueryState){
						activeTab.set("state", activeQueryState);
					}else{
						console.warn("MISSING activeQueryState for PANEL: " + active);
					}
					break;
			}
		},
		createOverviewPanel: function(){
			return new Overview({
				content: "Genome List Overview",
				title: "Overview",
				id: this.viewer.id + "_" + "overview"
			})
		}
	});
});
