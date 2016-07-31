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
		perspectiveLabel: "Taxon View",
		perspectiveIconClass: "icon-perspective-Taxonomy",
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

			this.watch("taxonomy", lang.hitch(this, "onSetTaxonomy"));
		},

		_setTaxon_idAttr: function(id){
			// console.log("*** SET TAXON ID ", id);
			if (id && this.taxon_id==id ){
				//console.log("Taxon ID Already set, skip");
				return;
			}
			this.taxon_id = id;

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
			// console.log("onSetTaxonomy: ", taxonomy);
			this.queryNode.innerHTML = this.buildHeaderContent(taxonomy);

			this.taxonomy = this.state.taxonomy=taxonomy;
			// this.set('state', lang.mixin({},this.state,{taxonomy:taxonomy}));
			this.setActivePanelState();
			// this.overview.set('taxonomy', taxonomy);
		},
		onSetQuery: function(attr, oldVal, newVal){
			//prevent default action
		},
		onSetState: function(attr, oldState, state){
			//console.log("Taxonomy onSetState", JSON.stringify(state, null, 4));
			oldState = oldState || {};
			if(!state){
				throw Error("No State Set");
				// return;
			}

			var parts = state.pathname.split("/");


			state.taxon_id = parts[parts.length - 1]
			this.set('taxon_id', state.taxon_id);
	
			// this.set("taxon_id", parts[parts.length - 1]);
			var s = "eq(taxon_lineage_ids," + state.taxon_id + ")";
			state.search = state.search.replace(s,"");
			if(state.search){
				console.log("GENERATE ENGLISH QUERY for ", state.search, s);
				this.filteredTaxon = QueryToEnglish(state.search.replace(s, ""));
				var sx = [s];
				if (state.search && state.search!=s) { sx.push(state.search) }
				state.search = sx.join("&").replace("&&","&");
				if (this.taxonomy){
					this.queryNode.innerHTML = this.buildHeaderContent(this.taxonomy);
				}

			}else{
				// console.log("USE state.search: ", s);
				state.search = s;
				this.filteredTaxon = false;
				if (this.taxonomy){
					this.queryNode.innerHTML = this.buildHeaderContent(this.taxonomy);
				}
			}

			if (!state.taxonomy && state.taxon_id){
				// console.log("No state.taxonomy.  state.taxon_id: ", state.taxon_id);
				if (oldState && oldState.taxon_id){
					console.log("oldState.taxon_id: ", oldState.taxon_id)
					
					if ((state.taxon_id == oldState.taxon_id)){
						if (oldState.taxonomy || this.taxonomy){
							console.log("oldState Taxonomy: ", oldState.taxonomy||this.taxonomy);
							state.taxonomy = oldState.taxonomy || this.taxonomy;
						}else{
							console.log("oldState missing Taxonomy");
						}
					}
				}
			}

			if(!state.genome_ids){
				 // console.log("	NO Genome_IDS: old: ", oldState.search, " new: ", state.search);
				if(state.search == oldState.search){
					// console.log("		Same Search")
					// console.log("		OLD Genome_IDS: ", oldState.genome_ids);
					this.set("state", lang.mixin({}, state, {genome_ids: oldState.genome_ids, referenceGenomes:oldState.referenceGenomes||[]}));
					return;
				}else{
					this.set("query", state.search);
				}
			}else if(state.search != oldState.search){
				this.set("query", state.search);
			}

			if(!state.hashParams){
				if(oldState.hashParams && oldState.hashParams.view_tab){
					state.hashParams = {"view_tab": oldState.hashParams.view_tab}
				}else{
					state.hashParams = {"view_tab": this.defaultTab}
				}
			}
			// console.log("    Check for Hash Params: ", state.hashParams);
			if(state.hashParams){
				if(!state.hashParams.view_tab){
					state.hashParams.view_tab = this.defaultTab;
				}

				// console.log("Looking for Active Tab: ", state.hashParams.view_tab);

				if(this[state.hashParams.view_tab]){
					var vt = this[state.hashParams.view_tab];
					// console.log("Found View Tab")
					vt.set("visible", true);
					// console.log("Select View Tab")
					this.viewer.selectChild(vt);
				}
			}

			this.setActivePanelState();
		},

		setActivePanelState: function(){

			// console.log("Taxonomy setActivePanelState: ", JSON.stringify(this.state,null,4))

			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";

			var activeTab = this[active];

			if(!activeTab){
				console.warn("ACTIVE TAB NOT FOUND: ", active);
				return;
			}
			switch(active){
				case "overview":
					if (this.state && this.state.genome_ids){
						activeTab.set('state', lang.mixin({}, this.state,{search: "in(genome_id,(" + this.state.genome_ids.join(",") + "))", hashParams: lang.mixin({},this.state.hashParams)}));
					}
					break;
				case "taxontree":
					// activeTab.set('query',"eq(taxon_id," + this.state.taxon_id + ")")
					activeTab.set('state', lang.mixin({}, this.state, {search: "eq(taxon_id," + encodeURIComponent(this.state.taxon_id) + ")", hashParams: lang.mixin({},this.state.hashParams)}));
					break;
				case "phylogeny":
				case "genomes":
					activeTab.set("state", lang.mixin({},this.state));
					break;
				default:
					var activeQueryState;
					var prop = "genome_id";
					if (active == "transcriptomics"){ prop = "genome_ids"; }
					var activeMax = activeTab.maxGenomeCount || this.maxGenomesPerList;
					console.log("ACTIVE MAX: ", activeMax);
					var autoFilterMessage;
					if(this.state && this.state.genome_ids){
						//console.log("Found Genome_IDS in state object");
						if (this.state.genome_ids.length <= activeMax){
							console.log("USING ALL GENOME_IDS. count: ", this.state.genome_ids.length);
							activeQueryState = lang.mixin({}, this.state, {search: "in(" + prop + ",(" + this.state.genome_ids.join(",") + "))",hashParams: lang.mixin({},this.state.hashParams)});
						} else if (this.state.referenceGenomes && this.state.referenceGenomes.length<=activeMax){
							var ids = this.state.referenceGenomes.map(function(x){ return x.genome_id })
							console.log("USING ALL REFERENCE AND REP GENOMES. Count: ", ids.length);
							autoFilterMessage = "This tab has been filtered to view data limited to Reference and Representative Genomes in your view.";
							activeQueryState = lang.mixin({}, this.state, {genome_ids:ids, autoFilterMessage: autoFilterMessage, search: "in(" + prop + ",(" + ids.join(",") + "))",hashParams: lang.mixin({},this.state.hashParams)});
						} else if (this.state.referenceGenomes) {
							var referenceOnly = this.state.referenceGenomes.filter(function(x){ return x.reference_genome=="Reference"}).map(function(x){ return x.genome_id })
							console.log("USING ONLY REFERENCE GENOMES. Count: " +  referenceOnly.length);
							if (referenceOnly.length<=activeMax){
								autoFilterMessage = "This tab has been filtered to view data limited to Reference Genomes in your view.";
								activeQueryState = lang.mixin({}, this.state, {genome_ids:referenceOnly,autoFilterMessage: autoFilterMessage, search: "in(" + prop + ",(" + referenceOnly.join(",") + "))",hashParams: lang.mixin({},this.state.hashParams)});
							}else if (!referenceOnly || referenceOnly.length<1){
								autoFilterMessage = "There are too many genomes in your view.  This tab will not show any data";
								activeQueryState = lang.mixin({}, this.state, {genome_ids:[],referenceGenomsautoFilterMessage: autoFilterMessage, search: "",hashParams: lang.mixin({},this.state.hashParams)});
							}
						}
						// console.log("gidQueryState: ", gidQueryState);
						// console.log("Active Query State: ", activeQueryState);

					}


					if (activeQueryState && active=="proteinFamilies"){
						activeQueryState.search="";
					}


					if(activeQueryState){
						console.log("Active Query State: ", activeQueryState);

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

			return out.join("&nbsp;&raquo;&nbsp;");
		},

		createOverviewPanel: function(){
			return new TaxonomyOverview({
				title: "Overview",
				id: this.viewer.id + "_" + "overview"
			});
		},

		onSetAnchor: function(evt){
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

			//console.log(" NavigateTo: ", l);
			Topic.publish("/navigate", {href: l});
		}
	});
});
