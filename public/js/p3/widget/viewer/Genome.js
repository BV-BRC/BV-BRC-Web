define([
	"dojo/_base/declare", "./TabViewerBase", "dojo/on","dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "../GenomeOverview",
	"dojo/request", "dojo/_base/lang", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer"/*,"JBrowse/Browser"*/, "../InteractionsContainer"
], function(declare, TabViewerBase, on,Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, GenomeOverview,
			xhr, lang, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer/*, JBrowser*/, InteractionsContainer) {
	return declare([TabViewerBase], {
		"baseClass": "GenomeGroup",
		"disabled": false,
		"query": null,
		containerType: "genome_group",
		genome_id: "",
		apiServiceUrl: window.App.dataAPI,

		_setGenome_idAttr: function(id) {
			// console.log("_setGenome_IDAttr: ", id, this.genome_id);
			if (!id) { return; }
			this.state=this.state || {};
			// if (id == this.genome_id){
			// 	console.log("ID Unchanged. Skip Set of Genome Viewer");
			// 	return;
			// }
			this.genome_id = id;
			this.state.genome_id = id;
			// console.log("GET Genome : ", this.apiServiceUrl + "/genome/" + id)

			xhr.get(this.apiServiceUrl + "/genome/" + id, {
				headers: {
					accept: "application/json",
    	            'X-Requested-With': null,
        	        'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(genome) {
				this.set("genome", genome)
			}));

			var gidQueryState = lang.mixin({},this.state, {search: "eq(genome_id," + id + ")"})
			if (this.features){
				this.features.set("state", gidQueryState);
			}

			if (this.specialtyGenes){
				this.specialtyGenes.set("state", gidQueryState);
			}


			if (this.pathways){
				var x = 
				// console.log("Set Pathways State: ", lang.mixin({},this.state, {genome_ids: id?[id]:[]}) )
				this.pathways.set("state", lang.mixin({},this.state, {genome_ids: id?[id]:[]}));
			}
		},

		_setGenomeAttr: function(genome){
			// console.log("Set Genome Attr: ", genome)
			var state = this.state || {};

			state.genome=genome;

			this.viewHeader.set("content", genome.taxon_lineage_names.slice(1).join("&nbsp;&raquo;&nbsp;"));
			this.overview.set("state", state)

			this._set("genome", genome);

			this.resize();
	
		},

		createOverviewPanel: function(state){
			return new GenomeOverview({title: "Overview", style: "overflow:auto;",id: this.viewer.id + "_" + "overview", state: this.state});
		},

		onSetState: function(attr,oldVal,state){
			// console.log("viewer/Genome onSetState()", state);

			var parts = this.state.pathname.split("/");
			this.set("genome_id", parts[parts.length-1]);

			if (!state){
				// console.log("No State to set: ", state)
				return;
			}

			if (state.hashParams &&  state.hashParams.view_tab){
				// console.log("    Look for Tab (this." + state.hashParams.view_tab + "): ", state.hashParams.view_tab);

				if (this[state.hashParams.view_tab]) {

					var vt = this[state.hashParams.view_tab];
					// console.log("     View Tab: ", vt);
					vt.set("visible", true);
					this.viewer.selectChild(vt);
				}else{
					// console.log("No view-tab supplied in State Object");
				}
			}
			// console.log("viewer/Genome onSetState() after set genome_id")
		},

		postCreate: function() {
			if (!this.state) { this.state = {}};

			this.inherited(arguments);

			this.overview = this.createOverviewPanel(this.state);
			this.phylogeny = new ContentPane({content: "Phylogeny", title: "Phylogeny",id: this.viewer.id + "_" + "phylogeny"});
			this.features = new FeatureGridContainer({title: "Features", id: this.viewer.id + "_" + "features",state: lang.mixin({},this.state, {search: "?eq(genome_id," + this.genome_id + ")"})});
			this.specialtyGenes = new SpecialtyGeneGridContainer({title: "Specialty Genes", id: this.viewer.id + "_" + "specialtyGenes",state: this.state});
			this.pathways = new PathwaysContainer({apiServer: this.apiServiceUrl, title: "Pathways", id: this.viewer.id + "_" + "pathways",state: lang.mixin({},this.state, {genome_ids: [this.genome_id]})});
			this.proteinFamilies = new ProteinFamiliesContainer({title: "Protein Families", id: this.viewer.id + "_" + "proteinFamilies",state: this.state});
			this.transcriptomics = new TranscriptomicsContainer({title: "Transcriptomics", id: this.viewer.id + "_" + "transcriptomics",state: this.state});
			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.phylogeny);
			this.viewer.addChild(this.features);
			this.viewer.addChild(this.specialtyGenes);
			this.viewer.addChild(this.pathways);
			this.viewer.addChild(this.proteinFamilies);
			this.viewer.addChild(this.transcriptomics);
		}

	});
});
