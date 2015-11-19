define([
	"dojo/_base/declare", "./_GenomeList", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "dijit/layout/TabContainer", "../GenomeOverview",
	"dojo/request", "dojo/_base/lang", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer", "JBrowse/Browser", "../Phylogeny","../../util/PathJoin","../DataItemFormatter"
], function(declare, GenomeList, on,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, GenomeOverview,
			xhr, lang, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer, JBrowser, Phylogeny, PathJoin,DataItemFormatter){
	return declare([GenomeList], {
		params: null,
		taxon_id: "",
		apiServiceUrl: window.App.dataAPI,
		taxonomy: null,

		postCreate: function(){
			this.inherited(arguments);

			this.phylogeny = new Phylogeny({
				title: "Phylogeny",
				id: this.viewer.id + "_" + "phylogeny"
			});

			this.viewer.addChild(this.phylogeny,1)
			domConstruct.empty(this.queryNode);

			this.watch("taxonomy", lang.hitch(this, "onSetTaxonomy"));
		},
		
		_setTaxon_idAttr: function(id){
			this.taxon_id = id;

			var state = this.state || {};

			state.taxon_id = id;

			xhr.get(PathJoin(this.apiServiceUrl,"taxonomy", id), {
				headers: {
					accept: "application/json"
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(taxonomy){
				this.set("taxonomy", taxonomy);
			}));

		},

		onSetTaxonomy: function(attr, oldVal, taxonomy){
			this.queryNode.innerHTML = this.buildHeaderContent(taxonomy);

			this.overview.set('content',  DataItemFormatter(taxonomy, "taxonomy_data",{hideExtra:true}));
		},
		onSetQuery: function(attr, oldVal, newVal){
			//prevent default action
		},
		onSetState: function(attr, oldVal, state){

			if(!state){
				throw Error("No State Set");
				return;
			}

			var parts = state.pathname.split("/");

			this.set("taxon_id", parts[parts.length - 1]);

			state.search = "eq(taxon_lineage_ids," + this.taxon_id + ")";

			//console.log("GenomeList onSetState()");
			this.inherited(arguments);
			// this.set("query", "eq(taxon_lineage_ids," + this.taxon_id + ")");
			// //console.log("this.viewer: ", this.viewer.selectedChildWidget, " call set state: ", state);
			// var active = (state && state.hashParams && state.hashParams.view_tab) ? state.hashParams.view_tab : "overview";
			// var activeTab = this[active];
			// switch(active){
			// 	case "genomes":
			// 		activeTab.set("state", lang.mixin({}, this.state, {search: "eq(taxon_lineage_ids," + this.taxon_id + ")"}));
			// 		break;
			// }
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
				case "phylogeny":
				case "genomes":
					console.log("setting ",active," state: ", this.state);
					activeTab.set("state", this.state);
					break;
				case "proteinFamilies":
				case "pathways":
					console.log("SET ACTIVE TAB: ", active, " State to: ", lang.mixin({}, this.state, {search: ""}));
					activeTab.set("state", lang.mixin({}, this.state, {search: ""}));
					break;
				case "transcriptomics":
					activeTab.set("state", lang.mixin({}, this.state, {search: "in(genome_ids,(" + (this.state.genome_ids||[]).join(",") + "))"}))
					break;
				default:
					var activeQueryState;
					if (this.state && this.state.genome_ids){
						console.log("Found Genome_IDS in state object");
						var activeQueryState = lang.mixin({}, this.state, {search: "in(genome_id,(" + this.state.genome_ids.join(",") + "))"});
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

		buildHeaderContent: function(taxon){
			var taxon_lineage_names = taxon.lineage_names.slice(1);
			var taxon_lineage_ids = taxon.lineage_ids.slice(1);
			var out = taxon_lineage_names.map(function(id, idx){
				return '<a class="navigationLink" href="/view/Taxonomy/' + taxon_lineage_ids[idx] + '">' + id + '</a>';
			});
			return '<i class="fa icon-anchor fa-1x" style="font-size:1.2em;color:#76A72D;vertical-align:top;"></i>&nbsp;' + out.join("&nbsp;&raquo;&nbsp;");
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
