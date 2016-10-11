define([
	"dojo/_base/declare", "./TabViewerBase", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../PageGrid", "../formatter", "../FeatureGridContainer", "../SequenceGridContainer",
	"../GenomeGridContainer", "../../util/PathJoin", "dojo/request", "dojo/_base/lang", "../FeatureListOverview",
	"../../util/QueryToEnglish"
], function(declare, TabViewerBase, on, Topic,
			domClass, ContentPane, domConstruct,
			Grid, formatter, FeatureGridContainer, SequenceGridContainer,
			GenomeGridContainer, PathJoin, xhr, lang, Overview,
			QueryToEnglish){
	return declare([TabViewerBase], {
		"baseClass": "FeatureList",
		"disabled": false,
		"containerType": "feature_data",
		"query": null,
		paramsMap: "query",
		total_features: 0,
		warningContent: 'Your query returned too many results for detailed analysis.',
		perspectiveLabel: "Feature List View",
		perspectiveIconClass: "icon-selection-FeatureList",
		_setQueryAttr: function(query){

			this._set("query", query);
			if(!this._started){
				return;
			}

			var _self = this;

			xhr.post(PathJoin(this.apiServiceUrl, "genome_feature/"), {
				headers: {
					accept: "application/solr+json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json",
				date: query + "&limit(1)"
			}).then(function(res){

				if(res && res.response && res.response.docs){
					var features = res.response.docs;
					if(features){
						_self._set("total_features", res.response.numFound);
					}
				}else{
					console.log("Invalid Response for: ", url);
				}
			}, function(err){
				console.error("Error Retreiving Features: ", err);
			});

		},

		onSetState: function(attr, oldVal, state){
			// console.log("GenomeList onSetState()  OLD: ", oldVal, " NEW: ", state);

			this.set("query", state.search);

			var active = (state && state.hashParams && state.hashParams.view_tab) ? state.hashParams.view_tab : "overview";
			if(active == "features"){
				this.setActivePanelState();
			}

			this.inherited(arguments);
		},

		onSetQuery: function(attr, oldVal, newVal){
			var qe = QueryToEnglish(newVal);
			// this.overview.set("content", '<div style="margin:4px;">Feature List Query: ' + qe + "</div>");

			this.queryNode.innerHTML = qe;
		},

		setActivePanelState: function(){

			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";

			var activeTab = this[active];

			if(!activeTab){
				return;
			}

			switch(active){
				case "features":
					activeTab.set("state", lang.mixin({},this.state));
					break;
				default:
					var activeQueryState;
					if(this.state && this.state.genome_ids){
						activeQueryState = lang.mixin({}, this.state, {search: "in(genome_id,(" + this.state.genome_ids.join(",") + "))"});
					}

					if(activeQueryState){
						activeTab.set("state", activeQueryState);
					}else{
						console.warn("MISSING activeQueryState for PANEL: " + active);
					}
					break;
			}
			console.log(active, this.state);
			if(activeTab){
				var pageTitle = "Feature List " + activeTab.title;
				// console.log("Feature List: ", pageTitle);
				if(window.document.title !== pageTitle){
					window.document.title = pageTitle;
				}
			}
		},

		onSetFeatureIds: function(attr, oldVal, genome_ids){
			// console.log("onSetGenomeIds: ", genome_ids, this.feature_ids, this.state.feature_ids);
			this.state.feature_ids = feature_ids;
			this.setActivePanelState();
		},

		createOverviewPanel: function(state){
			return new Overview({
				content: "Overview",
				title: "Feature List Overview",
				id: this.viewer.id + "_" + "overview",
				state: this.state
			});
		},

		postCreate: function(){
			this.inherited(arguments);

			this.watch("query", lang.hitch(this, "onSetQuery"));
			this.watch("total_features", lang.hitch(this, "onSetTotalFeatures"));

			this.overview = this.createOverviewPanel(this.state);

			this.features = new FeatureGridContainer({
				title: "Features",
				id: this.viewer.id + "_" + "features",
				tooltip: 'Features tab contains a list of all features (e.g., CDS, rRNA, tRNA, etc.) associated with a given Phylum, Class, Order, Family, Genus, Species or Genome.',
				disabled: false
			});

			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.features);
		},
		onSetTotalFeatures: function(attr, oldVal, newVal){
			this.totalCountNode.innerHTML = " ( " + newVal + " Genome Features ) ";
		},
		hideWarning: function(){
			if(this.warningPanel){
				this.removeChild(this.warningPanel);
			}
		},

		showWarning: function(msg){
			if(!this.warningPanel){
				this.warningPanel = new ContentPane({
					style: "margin:0px; padding: 0px; margin-top: -10px;",
					content: '<div class="WarningBanner">' + this.warningContent + "</div>",
					region: "top",
					layoutPriority: 3
				});
			}
			this.addChild(this.warningPanel);
		},
		onSetAnchor: function(evt){

			evt.stopPropagation();
			evt.preventDefault();

			var parts = [];
			var q;
			if(this.query){
				q = (this.query.charAt(0) == "?") ? this.query.substr(1) : this.query;
				if(q != "keyword(*)"){
					parts.push(q);
				}
			}
			if(evt.filter && evt.filter != "false"){
				parts.push(evt.filter);
			}

			// console.log("parts: ", parts);

			if(parts.length > 1){
				q = "?and(" + parts.join(",") + ")";
			}else if(parts.length == 1){
				q = "?" + parts[0];
			}else{
				q = "";
			}

			// console.log("SetAnchor to: ", q);
			var hp;
			if(this.hashParams && this.hashParams.view_tab){
				hp = {view_tab: this.hashParams.view_tab};
			}else{
				hp = {};
			}
			l = window.location.pathname + q + "#" + Object.keys(hp).map(function(key){
					return key + "=" + hp[key];
				}, this).join("&");
			// console.log("NavigateTo: ", l);
			Topic.publish("/navigate", {href: l});
		}
	});
});
