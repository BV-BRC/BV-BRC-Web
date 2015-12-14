define("p3/widget/viewer/GenomeGroup", [
	"dojo/_base/declare", "./_GenomeList", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "dijit/layout/TabContainer", "../GenomeOverview",
	"dojo/request", "dojo/_base/lang", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer", "JBrowse/Browser", "../Phylogeny","../../util/PathJoin","../DataItemFormatter",
	"../TaxonomyTreeGridContainer"
], function(declare, GenomeList, on,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, GenomeOverview,
			xhr, lang, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer, JBrowser, Phylogeny, PathJoin,DataItemFormatter,
			TaxonomyTreeGrid
){
	return declare([GenomeList], {
		params: null,
		taxon_id: "",
		apiServiceUrl: window.App.dataAPI,
		taxonomy: null,
		groupPath: null,
		
		onSetQuery: function(attr, oldVal, newVal){
			//prevent default action
		},

		_setGroupPathAttr: function(GroupPath){
			console.log("onSetGroupPath: ", GroupPath);
			this._set("groupPath", GroupPath);
			this.queryNode.innerHTML = this.buildHeaderContent();
		},

		onSetState: function(attr, oldVal, state){

			if(!state){
				throw Error("No State Set");
				return;
			}

			var parts = "/" + state.pathname.split("/").slice(2).map(decodeURIComponent).join("/")


			console.log("Parts: ", parts, " pathname: ", state.pathname, " state: ", state);
	
			this.set("groupPath", parts);
			console.log("GROUP PATH: ", parts)

			state.search = "in(genome_id,GenomeGroup(" + encodeURIComponent(parts) + "))";
			console.log("state.search: ", state.search);
			this.inherited(arguments);
		},

		setActivePanelState: function(){

			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";
			console.log("Active: ", active, "state: ", this.state);

			var activeTab = this[active];



			if (!activeTab){
				console.log("ACTIVE TAB NOT FOUND: ", active);
				return;
			}
			switch(active){
				case "transcriptomics":
					var gpath = encodeURIComponent("/" + this.groupPath);

					activeTab.set("state", lang.mixin({}, this.state, {search: "in(genome_ids,GenomeGroup(" + gpath  + "))"}))
					break;
				default:
					var activeQueryState;
					if (this.state && this.state.genome_ids){
						console.log("Found Genome_IDS in state object");
						//var activeQueryState = lang.mixin({}, this.state, {search: "in(genome_id,GenomeGroup(" + this.groupPath + "))"});
						activeQueryState = this.state;
						// console.log("gidQueryState: ", gidQueryState);
						console.log("Active Query State: ", activeQueryState);

					}

					if (activeQueryState){
						activeTab.set("state", activeQueryState);
					}else{
						console.warn("MISSING activeQueryState for PANEL: " + active);
					}
					break;
			}
			console.log("Set Active State COMPLETE");
		},

		buildHeaderContent: function(){
			console.log("buildHeaderContent()")
			return '<i class="fa icon-anchor fa-1x" style="font-size:1.2em;color:#76A72D;vertical-align:top;"></i>&nbsp;Genome Group: ' + this.groupPath;
		},

		createOverviewPanel: function(){
			return new ContentPane({
				content: "Taxonomy Overview",
				title: "Overview",
				id: this.viewer.id + "_" + "overview"
			});
		}
	});
});
