define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/topic", "dojo/request",
	"dijit/layout/ContentPane",
	"./TabViewerBase",
	"../FeatureListOverview", "../FeatureGridContainer",
	"../../util/PathJoin", "../../util/QueryToEnglish"
], function(declare, lang,
			Topic, xhr,
			ContentPane,
			TabViewerBase,
			Overview, FeatureGridContainer,
			PathJoin, QueryToEnglish){

	return declare([TabViewerBase], {
		"baseClass": "FeatureList",
		"disabled": false,
		"containerType": "feature_data",
		"query": null,
		totalFeatures: 0,
		defaultTab: "features",
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
				data: query + "&limit(1)"
			}).then(function(res){
				// console.log("Got FeatureList Query Results: ", res)
				if(res && res.response && res.response.docs){
					var features = res.response.docs;
					if(features){
						_self._set("totalFeatures", res.response.numFound);
					}
				}else{
					console.log("Invalid Response for: ", query);
				}
			}, function(err){
				console.error("Error Retreiving Features: ", err);
			});

		},

		onSetState: function(attr, oldVal, state){
			this.inherited(arguments);
			this.set("query", state.search);

			this.setActivePanelState();

			this.inherited(arguments);
		},

		onSetQuery: function(attr, oldVal, newVal){
			var qe = QueryToEnglish(newVal);

			this.queryNode.innerHTML = ""; //Features: " + qe;
		},

		setActivePanelState: function(){
			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";

			var activeTab = this[active];

			if(!activeTab){
				return;
			}

			switch(active){
				case "overview":
				case "features":
					activeTab.set("state", this.state); //lang.mixin({},this.state));
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
			// console.log(active, this.state);
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

		postCreate: function(){
			this.inherited(arguments);

			this.watch("query", lang.hitch(this, "onSetQuery"));
			this.watch("totalFeatures", lang.hitch(this, "onSetTotalFeatures"));

			this.overview = new Overview({
				content: "Overview",
				title: "Feature List Overview",
				id: this.viewer.id + "_" + "overview"
			});

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
			this.totalCountNode.innerHTML = " ( " + newVal + " Genomic Features ) ";
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
