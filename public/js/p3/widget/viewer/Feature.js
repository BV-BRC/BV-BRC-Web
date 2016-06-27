define([
	"dojo/_base/declare", "./TabViewerBase", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "../FeatureOverview",
	"dojo/request", "dojo/_base/lang",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer",
	"../GeneExpressionContainer", "../CorrelatedGenesContainer", "../../util/PathJoin",
	"../GenomeBrowser"
], function(declare, TabViewerBase, on, Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, FeatureOverview,
			xhr, lang,
			ActionBar, ContainerActionBar, PathwaysContainer,
			GeneExpressionContainer, CorrelatedGenesContainer, PathJoin,
			GenomeBrowser){
	return declare([TabViewerBase], {
		"baseClass": "FeatureGroup",
		"disabled": false,
		"query": null,
		containerType: "feature_group",
		feature_id: "",
		apiServiceUrl: window.App.dataAPI,

		_setFeature_idAttr: function(id){

			if(!id){
				return;
			}

			if (this.feature_id == id){
				return;
			}

			var state = this.state = this.state || {};
			this.feature_id = id;
			this.state.feature_id = id;

			xhr.get(PathJoin(this.apiServiceUrl, "genome_feature", id), {
				headers: {
					accept: "application/json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(feature){
				this.set("feature", feature)
			}));

		},

		setActivePanelState:function(){
			var activeQueryState;

			if (this.state.feature_id){
				activeQueryState = lang.mixin({}, this.state, {search: "eq(feature_id," + this.state.feature_id + ")"});
			}
			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";
			var activeTab = this[active];

			// console.log("Active Tab in Feature: ", active, activeTab);
			switch(active){
				// case "overview":
				// case "correlatedGenes":
				// 	break;
				// //case "pathways":
				//	activeTab.set("state", state);
				//	break;
				case "overview":
				case "transcriptomics":
				case "correlatedGenes":
					if (this.state && this.state.feature){
						// console.log("Set Feature Dependent States", JSON.stringify(this.state,null,4));
						activeTab.set("state", lang.mixin({},this.state));
					}
					
					break;
				default:
					if (activeQueryState){
						// console.log("Set Active Query State");
						activeTab.set("state", activeQueryState);
					}
					break;
			}
		},

		onSetState: function(attr, oldState, state){
			var parts = this.state.pathname.split("/");
			this.set("feature_id", parts[parts.length - 1]);
			state.feature_id = parts[parts.length - 1];

			if(!state){
				return;
			}

			if (state && state.feature_id && !state.feature){
				console.log("No state.feature.  state.feature_id: ", state.feature_id);
				if (oldState && oldState.feature_id){
					console.log("oldState.feature_id: ", oldState.feature_id)
					
					if ((state.feature_id == oldState.feature_id)){
						if (oldState.feature || this.feature){
							console.log("oldState Feature: ", oldState.feature||this.feature);
							this.state.feature = state.feature = oldState.feature || this.feature;
						}else{
							console.log("oldState missing Featture");
						}
					}
				}
			}

			if(state.hashParams && state.hashParams.view_tab){

				if(this[state.hashParams.view_tab]){
					var vt = this[state.hashParams.view_tab];
					vt.set("visible", true);
					this.viewer.selectChild(vt);
				}else{
					console.log("No view-tab supplied in State Object");
				}
			}

			this.setActivePanelState();
		},

		buildHeaderContent: function(feature){
			// TODO: implement
			return feature.feature_id;
		},

		_setFeatureAttr: function(feature){
			console.log("_setFeatureAttr: ", feature);
			var state = this.state || {};

			this.feature = this.state.feature = feature;

			//this.viewHeader.set("content", this.buildHeaderContent(feature));

			this.setActivePanelState();
			this.resize();
		},

		createOverviewPanel: function(){
			return new FeatureOverview({
				content: "Overview",
				title: "Overview",
				id: this.viewer.id + "_" + "overview",
				state: this.state
			});
		},
		postCreate: function(){
			if(!this.state){
				this.state = {};
			}

			this.inherited(arguments);

			this.overview = this.createOverviewPanel();
			this.genomeBrowser = new GenomeBrowser({
				title: "Genome Browser",
				id: this.viewer.id + "_genomeBrowser",
				content: "Genome Browser",
				state: lang.mixin({}, this.state)
			});
			// this.compareRegionViewer=new ContentPane({title: "Compare Region Viewer", id: this.viewer.id + "_compareRegionViewer", content: "CompareRegionViewer"})
			// this.pathways=new ContentPane({title: "Pathways", id: this.viewer.id + "_pathways", content: "Pathways"});
			/*
			this.transcriptomics = new ContentPane({
				title: "Transcriptomics",
				id: this.viewer.id + "_transcriptomics",
				content: "Transcriptomics"
			});
			*/
			this.transcriptomics = new GeneExpressionContainer({
				title: "Transcriptomics",
				id: this.viewer.id + "_transcriptomics",
				state: this.state
			});
			this.correlatedGenes = new CorrelatedGenesContainer({
				title: "Correlated Genes",
				id: this.viewer.id + "_correlatedGenes"
			});

			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.genomeBrowser);
			// this.viewer.addChild(this.compareRegionViewer);
			this.viewer.addChild(this.transcriptomics);
			this.viewer.addChild(this.correlatedGenes);
		}
	});
});
