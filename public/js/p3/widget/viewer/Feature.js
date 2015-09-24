define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "dijit/layout/TabContainer", "../FeatureOverview",
	"dojo/request", "dojo/_base/lang", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer"/*,"JBrowse/Browser"*/, "../InteractionsContainer"
], function(declare, BorderContainer, on,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, FeatureOverview,
			xhr, lang, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer/*, JBrowser*/, InteractionsContainer) {
	return declare([BorderContainer], {
		baseClass: "FeatureGroup",
		disabled: false,
		query: null,
		containerType: "feature_group",
		params: null,
		feature_id: "",
		apiServiceUrl: window.App.dataAPI,
		_setParamsAttr: function(params) {
			this.set("feature_id", params);
		},
		_setFeature_idAttr: function(id) {
			this.feature_id = id;
			xhr.get(this.apiServiceUrl + "/genome_feature/" + id, {
				headers: {
					accept: "application/json"
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(feature) {
				this.feature = feature;
				console.log("Feature: ", feature);
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
			//this.viewHeader.set("content", this.genome.taxon_lineage_names.slice(1).join("&nbsp;&raquo;&nbsp;"));
			this.featureOverview.set('feature', this.feature);
			//this.features.set("query", "?eq(genome_id," + this.genome.genome_id + ")");
			//this.specialtyGenes.set("query", "?eq(genome_id," + this.genome.genome_id + ")");
		},
		postCreate: function() {
			//if (this._started) {return;}
			this.inherited(arguments);
			this.viewHeader = new ContentPane({content: "Feature", region: "top"});
			this.viewer = new TabContainer({region: "center"});
			this.featureOverview = new FeatureOverview({title: "Overview", style: "overflow:auto;"});
			//var gbContentPane = new ContentPane({
			//	title: "Genome Browser",
			//	content: '<div id="' + this.id + "_jbrowse" + '"></div>'
			//});
			this.pathways = new PathwaysContainer({title: "Pathways"});
			this.transcriptomics = new TranscriptomicsContainer({title: "Transcriptomics"});
			//this.interactions = new InteractionsContainer({title: "Interactions"});
			//this.literature = new PublicationGridContainer({content: "Literature", title: "Literature"});
			this.viewer.addChild(this.featureOverview);
			//this.viewer.addChild(gbContentPane);
			this.viewer.addChild(this.pathways);
			this.viewer.addChild(this.transcriptomics);
			//this.viewer.addChild(this.interactions);
			//this.viewer.addChild(this.literature);
			this.addChild(this.viewHeader);
			this.addChild(this.viewer);
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
			if(this.feature){
				this.refresh();
			}
		}
	});
});
