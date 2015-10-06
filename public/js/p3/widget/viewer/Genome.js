define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on","dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "../GenomeOverview",
	"dojo/request", "dojo/_base/lang", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer"/*,"JBrowse/Browser"*/, "../InteractionsContainer"
], function(declare, BorderContainer, on,Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, GenomeOverview,
			xhr, lang, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer/*, JBrowser*/, InteractionsContainer) {
	return declare([BorderContainer], {
		"baseClass": "GenomeGroup",
		"disabled": false,
		"query": null,
		containerType: "genome_group",
		params: null,
		genome_id: "",
		apiServiceUrl: window.App.dataAPI,
		hashParams: null,

		_setHashParamsAttr: function(params){
			this.hashParams = params;
			console.log("SET HASH PARAMS: ", this.hashParams, "started: ", this._started);
			if (!this._started){ return; }

			if (this.hashParams.view_tab) {
				console.log("HASH PARAMS contain view_tab")
				if (this[this.hashParams.view_tab]) {
					console.log(this.id + " set child hash view: ", this.hashParams.view_tab);

//					console.log("Select Child: ", this.hashParams.view_tab, this[this.hashParams.view_tab].id)
					console.log("Attempt to Select Child: ", this[this.hashParams.view_tab]);
					this.viewer.selectChild(this[this.hashParams.view_tab])
				}else{
					console.log("No Local view_tab widget yet: ", this.hashParams.view_tab);
					setTimeout(lang.hitch(this, function(){
						if (this[this.hashParams.view_tab]){
							this.viewer.selectChild(this[this.hashParams.view_tab]);
						}
					}),1000)
				}
			}else{
				console.log("No view_tab in hashParams", this.hashParams);
			}

			if (this.viewer.selectedChildWidget){
				console.log("Set Children Hash Params", this.hashParams)
				this.viewer.selectedChildWidget.set("hashParams", this.hashParams);
			}
		},
		_setParamsAttr: function(params) {			
			this.set("genome_id", params);
		},
		_setGenome_idAttr: function(id) {
			if (id == this.genome_id){
				// console.log("Same ID, skip set");
				return;
			}
			this.genome_id = id;
			xhr.get(this.apiServiceUrl + "/genome/" + id, {
				headers: {
					accept: "application/json"
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(genome) {
				this.genome = genome;
				if(this._started){
					this.refresh();
				}
			}));
		},
		_setQueryAttr: function(query) {
			this.query = query;
			if(this.viewer){
				this.viewer.set("query", query);
			}
		},
		removeRows: function(ids) {
			ids.forEach(function(id) {
				var row = this.viewer.row(id);
				this.viewer.removeRow(row.element);
			}, this);
		},
		refresh: function() {
			this.viewHeader.set("content", this.genome.taxon_lineage_names.slice(1).join("&nbsp;&raquo;&nbsp;"));
			this.genomeOverview.set('genome', this.genome);
			this.features.set("query", "?eq(genome_id," + this.genome.genome_id + ")");
			this.specialtyGenes.set("query", "?eq(genome_id," + this.genome.genome_id + ")");
			this.pathways.set("query", "?eq(genome_id," + this.genome.genome_id + ")&eq(annotation,PATRIC)");
			this.pathways.set("params", {genome_id: this.genome.genome_id, annotation:'PATRIC'});
		},
		postCreate: function() {
			//if (this._started) {return;}
			this.inherited(arguments);
			this.viewHeader = new ContentPane({content: "Genome", region: "top"});
			this.viewer = new TabContainer({region: "center"});
			this.genomeOverview = new GenomeOverview({title: "Overview", style: "overflow:auto;",id: this.viewer.id + "_" + "genomeOverview"});
			this.phylogeny = new ContentPane({content: "Phylogeny", title: "Phylogeny",id: this.viewer.id + "_" + "phylogeny"});
			//var gbContentPane = new ContentPane({title: "Genome Browser", content: '<div id="' + this.viewer.id + "_jbrowse" + '"></div>'});
			//this.circularViewer = new CircularViewerContainer({title: "Circular Viewer"});

			this.features = new FeatureGridContainer({title: "Features", id: this.viewer.id + "_" + "features"});
			this.specialtyGenes = new SpecialtyGeneGridContainer({title: "Specialty Genes", id: this.viewer.id + "_" + "specialtyGenes"});
			this.pathways = new PathwaysContainer({title: "Pathways", id: this.viewer.id + "_" + "pathways"});
			this.proteinFamilies = new ProteinFamiliesContainer({title: "Protein Families", id: this.viewer.id + "_" + "proteinFamilies"});
			this.transcriptomics = new TranscriptomicsContainer({title: "Transcriptomics", id: this.viewer.id + "_" + "transcriptomics"});
			//this.interactions= new InteractionsContainer({title: "Interactions"});
			//this.diseases= new DiseaseContainer({title: "Diseases"});
			//this.literature= new PublicationGridContainer({content: "Literature", title: "Literature"});
			this.viewer.addChild(this.genomeOverview);
			this.viewer.addChild(this.phylogeny);
			//this.viewer.addChild(gbContentPane);
			//this.viewer.addChild(this.circularViewer);
			this.viewer.addChild(this.features);
			this.viewer.addChild(this.specialtyGenes);
			this.viewer.addChild(this.pathways);
			this.viewer.addChild(this.proteinFamilies);
			this.viewer.addChild(this.transcriptomics);
			//this.viewer.addChild(this.interactions);
			//this.viewer.addChild(this.diseases);
			//this.viewer.addChild(this.literature);
			this.addChild(this.viewHeader);
			this.addChild(this.viewer);

			on(this.domNode, "UpdateHash", lang.hitch(this, function(evt){
				console.log("UpdateHash Event: ", evt, this.hashParams);
				console.log("Current Location: ", window.location);
			
				if (evt.clearHash || (evt.hashProperty == "view_tab")){
					this.hashParams={}
				}
				this.hashParams[evt.hashProperty]=evt.value;
				location = window.location.pathname + window.location.search + "#" + Object.keys(this.hashParams).map(function(key){
					return key + "=" + this.hashParams[key]
				},this).join("&");

                Topic.publish("/navigate", {href: location});
			}))

		
//			this.genomeBrowser= new JBrowser({
//				title: "Genome Browser",
////				include: [],
////				css: [],
//				dataRoot: "/public/js/jbrowse.repo/sample_data/json/volvox",
//				nameUrl: "{dataRoot}/names/meta.json",
//				containerID: this.id + "_jbrowse",
//				updateBrowserURL:false,
//				stores: { url: { type: "JBrowse/Store/SeqFeature/FromConfig", features: [] } },
//			});
		},
		startup: function() {
			if(this._started){
				return;
			}
			this.inherited(arguments);

			this.set("hashParams", this.hashParams||{});

			if(this.genome){
				this.refresh();
			}
		}
	});
});
