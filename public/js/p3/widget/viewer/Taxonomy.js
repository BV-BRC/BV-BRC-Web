define([
	"dojo/_base/declare", "./_GenomeList", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "dijit/layout/TabContainer", "../GenomeOverview",
	"dojo/request", "dojo/_base/lang", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer", "../Phylogeny", "../../util/PathJoin", "../DataItemFormatter",
	"../TaxonomyTreeGridContainer", "../TaxonomyOverview", "dojo/topic", "../../util/QueryToEnglish"
], function(declare, GenomeList, on,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, GenomeOverview,
			xhr, lang, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer, Phylogeny, PathJoin, DataItemFormatter,
			TaxonomyTreeGrid, TaxonomyOverview, Topic, QueryToEnglish){
	return declare([GenomeList], {
		params: null,
		taxon_id: "",
		apiServiceUrl: window.App.dataAPI,
		taxonomy: null,

		postCreate: function(){
			this.inherited(arguments);

			this.phylogeny = new Phylogeny({
				title: "Phylogeny",
				id: this.viewer.id + "_" + "phylogeny",
				state: this.state
			});

			this.taxontree = new TaxonomyTreeGrid({
				title: "Taxonomy",
				id: this.viewer.id + "_" + "taxontree",
				state: this.state
				// query: (this.taxon_id)?("eq(taxon_id," + this.taxon_id + ")"):""
			});
			this.viewer.addChild(this.phylogeny, 1);
			this.viewer.addChild(this.taxontree, 2);
			domConstruct.empty(this.queryNode);

			this.watch("taxonomy", lang.hitch(this, "onSetTaxonomy"));
		},

		_setTaxon_idAttr: function(id){
			// console.log("*** SET TAXON ID ", id);
			this.taxon_id = id;

			var state = this.state || {};

			state.taxon_id = id;

			// if (id && this.taxontree){
			// 	console.log("set taxontree query: ", "eq(taxon_id," + id + ")");
			// 	this.taxontree.set('query',"eq(taxon_id," + id + ")")
			// }

			xhr.get(PathJoin(this.apiServiceUrl, "taxonomy", id), {
				headers: {
					accept: "application/json"
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(taxonomy){
				this.set("taxonomy", taxonomy);
			}));

		},

		onSetTaxonomy: function(attr, oldVal, taxonomy){
			this.queryNode.innerHTML = this.buildHeaderContent(taxonomy);

			this.overview.set('taxonomy', taxonomy);
		},
		onSetQuery: function(attr, oldVal, newVal){
			//prevent default action
		},
		onSetState: function(attr, oldVal, state){
			console.log("Taxonomy onSetState", JSON.stringify(state, null, 4));
			if(!state){
				throw Error("No State Set");
				// return;
			}

			var parts = state.pathname.split("/");

			this.set("taxon_id", parts[parts.length - 1]);
			var s = "eq(taxon_lineage_ids," + this.taxon_id + ")";

			if(state.search){
				console.log("GENERATE ENGLISH QUERY for ", state.search);
				this.filteredTaxon = QueryToEnglish(state.search.replace(s, ""));
				state.search = s + "&" + state.search;

			}else{
				state.search = s;
				this.filteredTaxon = false;
			}
			//console.log("GenomeList onSetState()");
			this.inherited(arguments);
			// this.set("query", "eq(taxon_lineage_ids," + this.taxon_id + ")");
			// //console.log("this.viewer: ", this.viewer.selectedChildWidget, " call set state: ", state);
			// var active = (state && state.hashParams && state.hashParams.view_tab) ? state.hashParams.view_tab : "overview";
			// var activeTab = this[active];
			// switch(active){
			// 	case "genomes":
			// 		activeTab.set("state", lang.mixin({}, this.state, {search: "eq(taxon_lineage_ids," + this.taxon_id + ")"}));
			// 		break;
			// }
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
				case "taxontree":
					// activeTab.set('query',"eq(taxon_id," + this.state.taxon_id + ")")
					activeTab.set('state', lang.mixin({}, this.state, {search: "eq(taxon_id," + encodeURIComponent(this.state.taxon_id) + ")"}));
					break;
				case "phylogeny":
				case "genomes":
					// console.log("setting ", active, " state: ", this.state);
					activeTab.set("state", this.state);
					break;
				case "proteinFamilies":
					// console.log("SET ACTIVE TAB: ", active, " State to: ", lang.mixin({}, this.state, {search: ""}));
					activeTab.set("state", lang.mixin({}, this.state, {search: ""}));
					break;
				case "transcriptomics":
					activeTab.set("state", lang.mixin({}, this.state, {search: "in(genome_ids,(" + (this.state.genome_ids || []).join(",") + "))"}));
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
			// console.log("Set Active State COMPLETE");
		},

		buildHeaderContent: function(taxon){
			var taxon_lineage_names = taxon.lineage_names.slice(1);
			var taxon_lineage_ids = taxon.lineage_ids.slice(1);
			var out = taxon_lineage_names.map(function(id, idx){
				return '<a class="navigationLink" href="/view/Taxonomy/' + taxon_lineage_ids[idx] + '">' + id + '</a>';
			});
			// console.log("buildHeaderContent filteredTaxon: ", this.filteredTaxon)

			if(this.filteredTaxon){
				out.push(this.filteredTaxon);
			}

			return '<i class="fa icon-anchor fa-1x" style="font-size:1.2em;color:#76A72D;vertical-align:top;"></i>&nbsp;' + out.join("&nbsp;&raquo;&nbsp;");
		},

		createOverviewPanel: function(){
			return new TaxonomyOverview({
				title: "Overview",
				id: this.viewer.id + "_" + "overview"
			});
		},

		onSetAnchor: function(evt){
			console.log("onSetAnchor: ", evt, evt.filter);
			evt.stopPropagation();
			evt.preventDefault();
			var f = evt.filter;
			var parts = [];

			// if(this.query){
			// 	var q = (this.query.charAt(0) == "?") ? this.query.substr(1) : this.query;
			// 	if(q != "keyword(*)"){
			// 		parts.push(q)
			// 	}
			// }

			if(evt.filter && evt.filter != "false"){
				parts.push(evt.filter)
			}

			// console.log("parts: ", parts);

			if(parts.length > 1){
				q = "?and(" + parts.join(",") + ")"
			}else if(parts.length == 1){
				q = "?" + parts[0]
			}else{
				q = "";
			}

			// console.log("SetAnchor to: ", q, "Current View: ", this.state.hashParams);
			var hp;

			if(this.state.hashParams && this.state.hashParams.view_tab){
				hp = {view_tab: this.state.hashParams.view_tab}
			}else{
				hp = {}
			}

			hp.filter = "false";

			// console.log("HP: ", JSON.stringify(hp));
			l = window.location.pathname + q + "#" + Object.keys(hp).map(function(key){
					return key + "=" + hp[key]
				}, this).join("&");

			console.log(" NavigateTo: ", l);
			Topic.publish("/navigate", {href: l});
		}
	});
});
