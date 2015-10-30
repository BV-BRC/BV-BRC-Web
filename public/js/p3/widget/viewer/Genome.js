define([
	"dojo/_base/declare", "./TabViewerBase", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "../GenomeOverview",
	"dojo/request", "dojo/_base/lang", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer", "../InteractionsContainer", "../Phylogeny", "../GenomeBrowser",
	"../SequenceGridContainer"
], function(declare, TabViewerBase, on, Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, GenomeOverview,
			xhr, lang, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer, InteractionsContainer, Phylogeny, GenomeBrowser,
			SequenceGridContainer
){
	return declare([TabViewerBase], {
		"baseClass": "GenomeGroup",
		"disabled": false,
		"query": null,
		containerType: "genome_group",
		genome_id: "", 
		apiServiceUrl: window.App.dataAPI,

		_setGenome_idAttr: function(id){
			//console.log("_setGenome_IDAttr: ", id, this.genome_id, this.state);
			if(!id){
				return;
			}
			var state = this.state = this.state || {};
			this.genome_id = id;
			this.state.genome_ids = [id];

			xhr.get(this.apiServiceUrl + "/genome/" + id, {
				headers: {
					accept: "application/json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(genome){
				this.set("genome", genome)
			}));
			var activeQueryState = lang.mixin({}, this.state, {search: "eq(genome_id," + id + ")"});
			var active = (state && state.hashParams && state.hashParams.view_tab) ? state.hashParams.view_tab : "overview";
			var activeTab = this[active];

			switch(active){
				case "overview":
					break;
				case "proteinFamilies":
				case "pathways":
					activeTab.set("state", this.state);
					break;
				default:
					activeTab.set("state", activeQueryState);
					break;
			}
		},

		buildHeaderContent: function(genome){
			var taxon_lineage_names = genome.taxon_lineage_names.slice(1);
			var taxon_lineage_ids = genome.taxon_lineage_ids.slice(1);
			var out = taxon_lineage_names.map(function(id, idx){
				return '<a href="/view/Taxonomy/' + taxon_lineage_ids[idx] + '">' + id + '</a>';
			});
			return out.join("&nbsp;&raquo;&nbsp;");
		},

		_setGenomeAttr: function(genome){
			var state = this.state || {};

			state.genome = genome;

			this.viewHeader.set("content", this.buildHeaderContent(genome));

			var active = (state && state.hashParams && state.hashParams.view_tab) ? state.hashParams.view_tab : "overview";
			var activeTab = this[active];

			switch(active){
				case "overview":
					activeTab.set("state", state);
					break;
				default:
					break;
			}

			this._set("genome", genome);

			this.resize();
		},

		createOverviewPanel: function(){
			return new GenomeOverview({
				title: "Overview",
				style: "overflow:auto;",
				id: this.viewer.id + "_" + "overview",
				state: this.state
			});
		},

		onSetState: function(attr, oldVal, state){

			var parts = this.state.pathname.split("/");
			this.set("genome_id", parts[parts.length - 1]);

			if(!state){
				return;
			}

			if(state.hashParams && state.hashParams.view_tab){

				if(this[state.hashParams.view_tab]){
					var vt = this[state.hashParams.view_tab];
					vt.set("visible", true);
					this.viewer.selectChild(vt);
				}else{
					// console.log("No view-tab supplied in State Object");
				}
			}
			// console.log("viewer/Genome onSetState() after set genome_id")
		},

		postCreate: function(){
			if(!this.state){
				this.state = {};
			}

			this.inherited(arguments);

			this.overview = this.createOverviewPanel();
			this.phylogeny = new Phylogeny({
				title: "Phylogeny",
				id: this.viewer.id + "_" + "phylogeny"
			});

			this.sequences = new SequenceGridContainer({
				title: "Sequences",
				id: this.viewer.id + "_" + "sequences",
				state: lang.mixin({}, this.state, {search: "?eq(genome_id," + this.genome_id + ")"})
			});


			this.features = new FeatureGridContainer({
				title: "Features",
				id: this.viewer.id + "_" + "features",
				state: lang.mixin({}, this.state, {search: "?eq(genome_id," + this.genome_id + ")"})
			});

			this.browser = new GenomeBrowser({
				title: "Browser",
				id: this.viewer.id + "_" + "browser",
				state: lang.mixin({}, this.state)
			});

			this.circular = new CircularViewerContainer({
				title: "Circular Viewer",
				id: this.viewer.id + "_" + "circular",
				state: lang.mixin({}, this.state)
			});

			this.specialtyGenes = new SpecialtyGeneGridContainer({
				title: "Specialty Genes",
				id: this.viewer.id + "_" + "specialtyGenes",
				state: this.state
			});
			this.pathways = new PathwaysContainer({
				apiServer: this.apiServiceUrl,
				title: "Pathways",
				id: this.viewer.id + "_" + "pathways",
				state: this.state
			});
			this.proteinFamilies = new ProteinFamiliesContainer({
				title: "Protein Families",
				id: this.viewer.id + "_" + "proteinFamilies",
				state: this.state
			});
			this.transcriptomics = new TranscriptomicsContainer({
				title: "Transcriptomics",
				id: this.viewer.id + "_" + "transcriptomics",
				state: this.state
			});
			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.phylogeny);
			this.viewer.addChild(this.browser);
			this.viewer.addChild(this.circular);
			this.viewer.addChild(this.sequences);
			this.viewer.addChild(this.features);
			this.viewer.addChild(this.specialtyGenes);
			this.viewer.addChild(this.pathways);
			this.viewer.addChild(this.proteinFamilies);
			this.viewer.addChild(this.transcriptomics);
		}
	});
});
