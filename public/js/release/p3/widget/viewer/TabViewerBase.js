define("p3/widget/viewer/TabViewerBase", [
	"dojo/_base/declare", "./Base", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "../GenomeOverview",
	"dojo/request", "dojo/_base/lang", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer" /*,"JBrowse/Browser"*/, "../InteractionsContainer"
], function(declare, ViewerBase, on, Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, GenomeOverview,
			xhr, lang, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer /*, JBrowser*/, InteractionsContainer){
	return declare([ViewerBase], {
		"query": null,
		genome_id: "",
		apiServiceUrl: window.App.dataAPI,
		defaultTab: "overview",
		onSetState: function(attr, oldState, state){
			if(!state){
				return;
			}

			// console.log("    Cal setActivePanelState");
			if(!state.hashParams){
				if(oldState.hashParams && oldState.hashParams.view_tab){
					state.hashParams = {"view_tab": oldState.hashParams.view_tab}
				}else{
					state.hashParams = {"view_tab": this.defaultTab}
				}
			}
			// console.log("    Check for Hash Params: ", state.hashParams);
			if(state.hashParams){
				if(!state.hashParams.view_tab){
					state.hashParams.view_tab = this.defaultTab;
				}

				// console.log("Looking for Active Tab: ", state.hashParams.view_tab);

				if(this[state.hashParams.view_tab]){
					var vt = this[state.hashParams.view_tab];
					// console.log("Found View Tab")
					vt.set("visible", true);
					// console.log("Select View Tab")
					this.viewer.selectChild(vt);
				}else{
					console.log("No view-tab supplied in State Object");
				}
			}

		},

		setActivePanelState: function(){
		},

		postCreate: function(){
			this.inherited(arguments);
			this.viewHeader = new ContentPane({
				content: "",
				region: "top"
			});
			this.viewer = new TabContainer({
				region: "center"
			});

			this.addChild(this.viewHeader);
			this.addChild(this.viewer);

		}
	});
});
