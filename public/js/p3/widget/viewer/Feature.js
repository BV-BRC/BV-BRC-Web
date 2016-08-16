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
		perspectiveLabel: "Feature View",
		perspectiveIconClass: "icon-perspective-Feature",

		_setFeature_idAttr: function(id){

			if(!id){
				return;
			}

			if(this.feature_id == id){
				return;
			}

			this.state = this.state || {};
			this.feature_id = id;
			this.state.feature_id = id;

			if (id.match(/^fig/)){
				id = "?eq(patric_id," + id + ")&limit(1)";
			}

			// TODO: implement redirection here

			// console.log("Get Feature: ", id);
			xhr.get(PathJoin(this.apiServiceUrl, "genome_feature", id), {
				headers: {
					accept: "application/json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(feature){
				if (feature instanceof Array){
					this.set("feature", feature[0])
				}else{
					this.set("feature", feature)
				}
			}));
		},

		setActivePanelState: function(){
			var activeQueryState;
			if (!this._started){ console.log("Feature Viewer not started"); return; }

			if(this.state.feature_id){
				activeQueryState = lang.mixin({}, this.state, {search: "eq(feature_id," + this.state.feature_id + ")"});
			}
			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";
			var activeTab = this[active];

			switch(active){
				//case "pathways":
				//	activeTab.set("state", state);
				//	break;
				case "overview":
				case "correlatedGenes":
					if(this.state && this.state.feature){
						activeTab.set("state", lang.mixin({}, this.state));
					}
					break;
				default:
					if(activeQueryState){
						activeTab.set("state", activeQueryState);
					}
					break;
			}
		},

		onSetState: function(attr, oldState, state){
			var parts = this.state.pathname.split("/");
			this.set("feature_id", parts[parts.length - 1]);
			state.feature_id = parts[parts.length - 1];

			if(state && state.feature_id && !state.feature){
				if(oldState && oldState.feature_id){
					if((state.feature_id == oldState.feature_id)){
						if(oldState.feature || this.feature){
							this.state.feature = state.feature = oldState.feature || this.feature;
						}else{
							console.log("oldState missing Featture");
						}
					}
				}
			}

			this.setActivePanelState();
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
			var content = [];
			if(feature.hasOwnProperty('patric_id')){
				content.push(feature.patric_id);
			}
			if(feature.hasOwnProperty('refseq_locus_tag')){
				content.push(feature.refseq_locus_tag);
			}
			if(feature.hasOwnProperty('gene')){
				content.push(feature.gene);
			}
			if(feature.hasOwnProperty('product')){
				content.push(feature.product);
			}

			return content.map(function(d){ return '<span><b>' + d + '</b></span>';}).join(' <span class="pipe">|</span> ');
		},

		_setFeatureAttr: function(feature){

			this.feature = this.state.feature = feature;

			this.queryNode.innerHTML = this.buildHeaderContent(feature);
			domConstruct.empty(this.totalCountNode);

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

			this.transcriptomics = new GeneExpressionContainer({
				title: "Transcriptomics",
				id: this.viewer.id + "_transcriptomics"
			});
			this.correlatedGenes = new CorrelatedGenesContainer({
				title: "Correlated Genes",
				id: this.viewer.id + "_correlatedGenes"
			});

			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.genomeBrowser);
			this.viewer.addChild(this.transcriptomics);
			this.viewer.addChild(this.correlatedGenes);
		}
	});
});
