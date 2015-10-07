define([
	"dojo/_base/declare", "./Base", "dojo/on","dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "../GenomeOverview",
	"dojo/request", "dojo/_base/lang", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer"/*,"JBrowse/Browser"*/, "../InteractionsContainer"
], function(declare, ViewerBase, on,Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, GenomeOverview,
			xhr, lang, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer/*, JBrowser*/, InteractionsContainer) {
	return declare([ViewerBase], {
		"query": null,
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
					this[this.hashParams.view_tab].set("visible",true);

//					console.log("Select Child: ", this.hashParams.view_tab, this[this.hashParams.view_tab].id)
					console.log("Attempt to Select Child: ", this[this.hashParams.view_tab]);

					this[this.hashParams.view_tab].set("hashParams", this.hashParams);
					this.viewer.selectChild(this[this.hashParams.view_tab])
				}else{
					console.log("No Local view_tab widget yet: ", this.hashParams.view_tab);
					setTimeout(lang.hitch(this, function(){
						if (this[this.hashParams.view_tab]){
							this[this.hashParams.view_tab].set("visible",true);
							this.viewer.selectChild(this[this.hashParams.view_tab]);
						}
					}),1000)
				}
			}else{
				console.log("No view_tab in hashParams", this.hashParams);
			}

			// if (this.viewer.selectedChildWidget){
			// 	console.log("Set Children Hash Params", this.hashParams)
			// 	if (this.paramsMap && typeof this.paramsMap=="string"){
			// 		console.log("set ", this.paramsMap, " to ", this.params)
			// 		this.viewer.selectedChildWidget.set(this.paramsMap, this.params);
			// 	}

			// 	this.viewer.selectedChildWidget.set("hashParams", this.hashParams);
			// }
		},
	
		refresh: function(w) {
			
		},

		onUpdateHash: function(evt){
			if (evt.clearHash || (evt.hashProperty == "view_tab")){
				this.hashParams={}
			}

			this.inherited(arguments);
		},

		postCreate: function() {
			this.inherited(arguments);
			this.viewHeader = new ContentPane({content: "", region: "top"});
			this.viewer = new TabContainer({region: "center"});

			this.addChild(this.viewHeader);
			this.addChild(this.viewer);

		},

		startup: function() {
			if(this._started){ return; }
			this.inherited(arguments);
			this.set("hashParams", this.hashParams||{});
		}
	});
});
