define("p3/widget/viewer/TabViewerBase", [
	"dojo/_base/declare", "./Base", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "../GenomeOverview",
	"dojo/request", "dojo/_base/lang", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer" /*,"JBrowse/Browser"*/ , "../InteractionsContainer"
], function(declare, ViewerBase, on, Topic,
	domClass, ContentPane, domConstruct,
	formatter, TabContainer, GenomeOverview,
	xhr, lang, FeatureGridContainer, SpecialtyGeneGridContainer,
	ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
	DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
	TranscriptomicsContainer /*, JBrowser*/ , InteractionsContainer) {
	return declare([ViewerBase], {
		"query": null,
		genome_id: "",
		apiServiceUrl: window.App.dataAPI,

		onSetState: function(attr, oldState, state) {
			if (!state) {
				return;
			}

			this.setActivePanelState();

			if (state.hashParams && state.hashParams.view_tab) {
				if (this[state.hashParams.view_tab]) {
					var vt = this[state.hashParams.view_tab];
					vt.set("visible", true);
					this.viewer.selectChild(vt);
				}
				else {
					console.log("No view-tab supplied in State Object");
				}
			}
		},

		postCreate: function() {
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