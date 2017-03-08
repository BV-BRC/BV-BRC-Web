define([
	"dojo/_base/declare", "./TabViewerBase", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../PageGrid", "../formatter", "../PathwaysGridContainer", "../SequenceGridContainer",
	"../../util/PathJoin", "dojo/request", "dojo/_base/lang"
], function(declare, TabViewerBase, on, Topic,
			domClass, ContentPane, domConstruct,
			Grid, formatter, PathwayGridContainer, SequenceGridContainer,
			PathJoin, xhr, lang){
	// NOTE: called from global search (see widget/GlobalSearch.js)
	// but currently disabled
	return declare([TabViewerBase], {
		"baseClass": "PathwayList",
		"disabled": false,
		"containerType": "feature_data",
		"query": null,
		total_pathways: 0,
		warningContent: 'Your query returned too many results for detailed analysis.',
		_setQueryAttr: function(query){
			// console.log(this.id, " _setQueryAttr: ", query, this);

			this._set("query", query);
			if(!this._started){
				return;
			}
		},

		onSetState: function(attr, oldVal, state){
			// console.log("GenomeList onSetState()  OLD: ", oldVal, " NEW: ", state);

			this.set("query", state.search);

			// //console.log("this.viewer: ", this.viewer.selectedChildWidget, " call set state: ", state);
			var active = (state && state.hashParams && state.hashParams.view_tab) ? state.hashParams.view_tab : "overview";
			if(active == "pathways"){
				this.setActivePanelState();
			}

			this.inherited(arguments);
		},

		onSetQuery: function(attr, oldVal, newVal){
			this.overview.set("content", '<div style="margin:4px;">Pathway List Query: ' + decodeURIComponent(newVal) + "</div>");
			this.queryNode.innerHTML = '<i class="fa icon-anchor fa-1x" style="font-size:1.2em;color:#76A72D;vertical-align:top;"></i>&nbsp;Pathway Query:&nbsp;' + decodeURIComponent(newVal);
		},

		setActivePanelState: function(){

			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";
			// console.log("Active: ", active, "state: ", this.state);

			var activeTab = this[active];

			if(!activeTab){
				console.log("ACTIVE TAB NOT FOUND: ", active);
				return;
			}

			switch(active){
				case "overview":
					activeTab.set("state", this.state);
					break;
				case "pathways":
					var search = this.state.search + "&group((field,pathway_id),(format,simple),(ngroups,true),(limit,1),(facet,true))" +
						"&json(facet," + encodeURIComponent(JSON.stringify({
							stat: {
								field: {
									field: "pathway_id",
									limit: -1,
									facet: {
										genome_count: "unique(genome_id)",
										gene_count: "unique(feature_id)",
										ec_count: "unique(ec_number)",
										genome_ec: "unique(genome_ec)"
									}
								}
							}
						})) + ")";

					// console.log("PATHWAY LIST SEARCH: ", search);
					activeTab.set("state", lang.mixin({}, this.state, {
						search: search
					}));
					break;
				case "ecnumbers":
					var search = this.state.search + "&group((field,ec_number),(format,simple),(ngroups,true),(limit,1),(facet,true))" +
						"&json(facet," + encodeURIComponent(JSON.stringify({
							stat: {
								field: {
									field: "ec_number",
									limit: -1,
									facet: {
										genome_count: "unique(genome_id)",
										gene_count: "unique(feature_id)",
										ec_count: "unique(ec_number)",
										genome_ec: "unique(genome_ec)"
									}
								}
							}
						})) + ")";

					// console.log("PATHWAY LIST SEARCH: ", search);
					activeTab.set("state", lang.mixin({}, this.state, {
						search: search
					}));
					break;
				case "genes":
					var search = this.state.search + "&group((field,gene),(format,simple),(ngroups,true),(limit,1),(facet,true))" +
						"&json(facet," + encodeURIComponent(JSON.stringify({
							stat: {
								field: {
									field: "gene",
									limit: -1,
									facet: {
										genome_count: "unique(genome_id)",
										gene_count: "unique(feature_id)",
										ec_count: "unique(ec_number)",
										genome_ec: "unique(genome_ec)"
									}
								}
							}
						})) + ")";

					// console.log("PATHWAY LIST SEARCH: ", search);
					activeTab.set("state", lang.mixin({}, this.state, {
						search: search
					}));
					break;
				default:
					var activeQueryState;
					if(this.state && this.state.genome_ids){
						// console.log("Found Genome_IDS in state object");
						activeQueryState = lang.mixin({}, this.state, {search: "in(genome_id,(" + this.state.genome_ids.join(",") + "))"});
						// console.log("gidQueryState: ", gidQueryState);
						// console.log("Active Query State: ", activeQueryState);
					}

					if(activeQueryState){
						activeTab.set("state", activeQueryState);
					}else{
						console.warn("MISSING activeQueryState for PANEL: " + active);
					}
					break;
			}
			// console.log("Set Active State COMPLETE");
		},

		onSetPathwayIds: function(attr, oldVal, genome_ids){
			// console.log("onSetGenomeIds: ", genome_ids, this.feature_ids, this.state.feature_ids);
			this.state.feature_ids = feature_ids;
			this.setActivePanelState();
		},

		createOverviewPanel: function(state){
			return new ContentPane({
				content: "Overview",
				title: "Overview",
				id: this.viewer.id + "_" + "overview",
				state: this.state
			});
		},

		postCreate: function(){
			this.inherited(arguments);

			this.watch("query", lang.hitch(this, "onSetQuery"));
			this.watch("total_pathways", lang.hitch(this, "onSetTotalPathways"));

			this.overview = this.createOverviewPanel(this.state);
			this.totalCountNode = domConstruct.create("span", {innerHTML: "( loading... )"});
			this.queryNode = domConstruct.create("span", {innerHTML: " Pathway List Query:  "});

			domConstruct.place(this.queryNode, this.viewHeader.containerNode, "last");
			domConstruct.place(this.totalCountNode, this.viewHeader.containerNode, "last");

			this.pathways = new PathwayGridContainer({
				title: "Pathways",
				id: this.viewer.id + "_" + "pathways",
				disabled: false,
				primaryKey: "pathway_id",
			});

			this.ecnumbers = new PathwayGridContainer({
				title: "EC Numbers",
				id: this.viewer.id + "_" + "ecnumbers",
				disabled: false,
				primaryKey: "ec_number"
			});

			this.genes = new PathwayGridContainer({
				title: "Genes",
				id: this.viewer.id + "_" + "genes",
				disabled: false,
				primaryKey: "gene"
			});

			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.pathways);
			this.viewer.addChild(this.ecnumbers);
			this.viewer.addChild(this.genes);
		},
		onSetTotalPathways: function(attr, oldVal, newVal){
			// console.log("ON SET TOTAL GENOMES: ", newVal);
			this.totalCountNode.innerHTML = " ( " + newVal + " Pathways ) ";
		},
		hideWarning: function(){
			if(this.warningPanel){
				this.removeChild(this.warningPanel);
			}
		},

		showWarning: function(msg){
			if(!this.warningPanel){
				this.warningPanel = new ContentPane({
					style: "margin:0px; padding: 0px;margin-top: -10px;",
					content: '<div class="WarningBanner">' + this.warningContent + "</div>",
					region: "top",
					layoutPriority: 3
				});
			}
			this.addChild(this.warningPanel);
		},
		onSetAnchor: function(evt){
			// console.log("onSetAnchor: ", evt, evt.filter);
			evt.stopPropagation();
			evt.preventDefault();

			var parts = [];
			if(this.query){
				var q = (this.query.charAt(0) == "?") ? this.query.substr(1) : this.query;
				if(q != "keyword(*)"){
					parts.push(q);
				}
			}
			if(evt.filter){
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
