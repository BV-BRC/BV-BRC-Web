define("p3/widget/viewer/_GenomeList", [
	"dojo/_base/declare", "./TabViewerBase", "dojo/on", "dojo/_base/lang",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct", "dojo/topic",
	"../formatter", "dijit/layout/TabContainer", "../GenomeOverview",
	"dojo/request", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../ActionBar", "../ContainerActionBar", "../PathwaysContainer", "../ProteinFamiliesContainer",
	"../DiseaseContainer", "../PublicationGridContainer", "../CircularViewerContainer",
	"../TranscriptomicsContainer", "../InteractionsContainer", "../GenomeGridContainer",
	"../SequenceGridContainer", "../../util/PathJoin", "../../util/QueryToEnglish","dijit/Dialog"
], function(declare, TabViewerBase, on, lang,
			domClass, ContentPane, domConstruct, Topic,
			formatter, TabContainer, GenomeOverview,
			xhr, FeatureGridContainer, SpecialtyGeneGridContainer,
			ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
			DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
			TranscriptomicsContainer, InteractionsContainer, GenomeGridContainer,
			SequenceGridContainer, PathJoin, QueryToEnglish, Dialog){
	return declare([TabViewerBase], {
		paramsMap: "query",
		maxGenomesPerList: 10000,
		maxReferenceGenomes: 500,
		totalGenomes: 0,
		defaultTab: "overview",
		perspectiveLabel: "Genome List View",
		perspectiveIconClass: "icon-selection-GenomeList",

		showQuickstartKey: "hideQuickstart",

		warningContent: 'Some tabs below have been disabled due to the number of genomes in your current view.  To enable them, on the "Genomes" Tab below, use the SHOW FILTERS button ( <i class="fa icon-filter fa-1x" style="color:#333"></i> ) or the keywords input box to filter Genomes. When you are satisfied, click APPLY ( <i class="fa icon-apply-perspective-filter fa-1x" style="color:#333"></i> ) to restablish the page context.',
		_setQueryAttr: function(query){
			if (!query) { console.log("GENOME LIST SKIP EMPTY QUERY: ");  return; }
			if (query && (query == this.query)){
				return;
			}
			// console.log("GenomeList SetQuery: ", query, this);

			this._set("query", query);
			// if(!this._started){
			// 	return;
			// }

			var _self = this;
			// console.log('genomeList setQuery - this.query: ', this.query);

			var url = PathJoin(this.apiServiceUrl, "genome", "?" + (this.query) + "&select(genome_id)&limit(" + this.maxGenomesPerList+1 + ")");

			xhr.post(PathJoin(this.apiServiceUrl, "genome"),{
				headers: {
					accept: "application/solr+json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json",
				'Content-Type': "application/rqlquery+x-www-form-urlencoded",
				data: (this.query) + "&select(genome_id)&limit(" + this.maxGenomesPerList+1 + ")"

			}).then(function(res){
				//console.log(" URL: ", url);
				// console.log("Get GenomeList Res: ", res);
				if(res && res.response && res.response.docs){
					var genomes = res.response.docs;
					if(genomes){
						_self._set("total_genomes", res.response.numFound);
						var genome_ids = genomes.map(function(o){
							return o.genome_id;
						});
						_self._set("genome_ids", genome_ids)
					}
				}else{
					console.warn("Invalid Response for: ", url);
				}
			}, function(err){
				console.error("Error Retreiving Genomes: ", err)
			});

		},

		getReferenceAndRepresentativeGenomes: function(){
			// console.log("GET REFERENCE AND REPRESENTATIVE GENOMES")
			var query = this.get('query');

			var _self = this;
			// console.log('genomeList setQuery - this.query: ', this.query);

			// var url = PathJoin(this.apiServiceUrl, "genome", "?" + (this.query) + "&or(eq(reference_genome,Representative),eq(reference_genome,Reference))&select(genome_id,reference_genome)&limit(" + this.maxGenomesPerList + ")");

			xhr.post(PathJoin(this.apiServiceUrl, "genome"), {
				headers: {
					accept: "application/solr+json",
					'X-Requested-With': null,
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json",
				data: (this.query) + "&or(eq(reference_genome,Representative),eq(reference_genome,Reference))&select(genome_id,reference_genome)&limit(" + this.maxGenomesPerList + ")"
			}).then(function(res){
				//console.log(" URL: ", url);
				// console.log("Get GenomeList Res: ", res);
				if(res && res.response && res.response.docs){
					var genomes = res.response.docs;
					_self._set("referenceGenomes", genomes);
				}else{
					console.warn("Invalid Response for: ", url);
				}
			}, function(err){
				console.error("Error Retreiving Reference/Representative Genomes: ", err)
			});

		},

		onSetState: function(attr, oldVal, state){
			 //console.log("GenomeList onSetState()  OLD: ", oldVal, " NEW: ", state);
			this.inherited(arguments);
			if(!state.genome_ids){
				 //console.log("	NO Genome_IDS: old: ", oldVal.search, " new: ", state.search);
				if(state.search == oldVal.search){
					//console.log("		Same Search")
					//console.log("		OLD Genome_IDS: ", oldVal.genome_ids);
					//console.log("INTERNAL STATE UPDATE")
					this.set("state", lang.mixin({}, state, {genome_ids: oldVal.genome_ids, referenceGenomes:oldVal.referenceGenomes||[]}));
					return;
				}else{
					this.set("query", state.search);
				}
			}else if(state.search != oldVal.search){
				// console.log("SET QUERY: ", state.search);
				this.set("query", state.search);
			}


			// this.inherited(arguments);

			// //console.log("this.viewer: ", this.viewer.selectedChildWidget, " call set state: ", state);
			var active = (state && state.hashParams && state.hashParams.view_tab) ? state.hashParams.view_tab : this.defaultTab;

			this.setActivePanelState();
		},

		onSetQuery: function(attr, oldVal, newVal){

			var content = QueryToEnglish(newVal);
			// console.log("English Content: ", content);
			this.overview.set("content", '<div style="margin:4px;"><span class="queryModel">Genomes</span> ' + content /*decodeURIComponent(newVal)*/ + "</div>");
			// this.viewHeader.set("content", '<div style="margin:4px;">Genome List Query: ' + decodeURIComponent(newVal) + ' </div>')
			this.queryNode.innerHTML = '<span class="queryModel">Genomes</span>  ' + content;
		},

		setActivePanelState: function(){
			console.log("setActivePanelState()");
			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : this.defaultTab;
			// console.log("Active: ", active, "state: ", JSON.stringify(this.state));

			var activeTab = this[active];

			if(!activeTab){
				console.log("ACTIVE TAB NOT FOUND: ", active);
				return;
			}
			switch(active){
				case "genomes":
					activeTab.set("state", lang.mixin({}, this.state, {hashParams: lang.mixin({},this.state.hashParams)}));
					break;
				default:
					var activeQueryState;
					var prop = "genome_id";
					if (active == "transcriptomics"){ prop = "genome_ids"; }
					var activeMax = activeTab.maxGenomeCount || this.maxGenomesPerList;

					console.log("ActiveTab.maxGenomeCount: ", activeTab.maxGenomeCount);
					console.log("ACTIVE MAX: ", activeMax);
					var autoFilterMessage;
					if(this.state && this.state.genome_ids){
						console.log("Found Genome_IDS in state object. count: ", this.state.genome_ids.length);
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
							if (!referenceOnly || referenceOnly.length<1 || referenceOnly.length > activeMax){
								autoFilterMessage = "There are too many genomes in your view.  This tab will not show any data";
								activeQueryState = lang.mixin({}, this.state, {genome_ids:[],autoFilterMessage: autoFilterMessage, search: "",hashParams: lang.mixin({},this.state.hashParams)});
							}else if (referenceOnly.length<=activeMax){
								autoFilterMessage = "This tab has been filtered to view data limited to Reference Genomes in your view.";
								activeQueryState = lang.mixin({}, this.state, {genome_ids:referenceOnly,autoFilterMessage: autoFilterMessage, search: "in(" + prop + ",(" + referenceOnly.join(",") + "))",hashParams: lang.mixin({},this.state.hashParams)});
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

		onSetGenomeIds: function(attr, oldVal, genome_ids){
			// console.log("onSetGenomeIds: ", genome_ids, this.genome_ids, this.state.genome_ids);
			// this.set("state", lang.mixin({},this.state, {genome_ids: genome_ids}));
			this.state.genome_ids = genome_ids;
			this.setActivePanelState();
		},

		onSetReferenceGenomes: function(attr, oldVal, referenceGenomes){
			// console.log("onSetReferenceGenomes: ", referenceGenomes);
			// this.set("state", lang.mixin({},this.state, {genome_ids: genome_ids}));


			this.state.referenceGenomes = referenceGenomes;
			this.setActivePanelState();
		},

		createOverviewPanel: function(state){
			return new ContentPane({
				content: "Overview",
				title: "Genome List Overview",
				id: this.viewer.id + "_" + "overview",
				state: this.state
			});
		},

		postCreate: function(){
			this.inherited(arguments);

			this.watch("query", lang.hitch(this, "onSetQuery"));
			this.watch("genome_ids", lang.hitch(this, "onSetGenomeIds"));
			this.watch("referenceGenomes", lang.hitch(this, "onSetReferenceGenomes"));
			this.watch("total_genomes", lang.hitch(this, "onSetTotalGenomes"));

			this.overview = this.createOverviewPanel(this.state);
			// this.totalCountNode = domConstruct.create("span", {innerHTML: "( loading... )"});
			// this.queryNode = domConstruct.create("span", {});

			// domConstruct.place(this.queryNode, this.viewHeader.containerNode, "last");
			// domConstruct.place(this.totalCountNode, this.viewHeader.containerNode, "last");


			// headerContent = domConstruct.create("div",{"class":"PerspectiveHeader", style:"padding:0px;"});
			// domConstruct.place(headerContent, this.viewHeader.containerNode, "last");

			// domConstruct.create("i", {"class": "fa PerspectiveIcon " + this.perspectiveIconClass},headerContent);
			// this.perspectiveTypeNode = domConstruct.create("span",{"class": "PerspectiveType", innerHTML: this.perspectiveLabel},headerContent)
			// domConstruct.create("br",{},headerContent);
			// this.queryNode = domConstruct.create("span",{"class": "PerspectiveQuery"},headerContent)
			// this.totalCountNode = domConstruct.create("span", {"class": "PerspectiveTotalCount", innerHTML: "( loading... )"},headerContent);;


			this.genomes = new GenomeGridContainer({
				title: "Genomes",
				id: this.viewer.id + "_" + "genomes",
				state: this.state,
				disable: false
			});
			this.sequences = new SequenceGridContainer({
				title: "Sequences",
				id: this.viewer.id + "_" + "sequences",
				state: this.state,
				disable: false
			});
			this.features = new FeatureGridContainer({
				title: "Features",
				id: this.viewer.id + "_" + "features",
				disabled: false
			});
			this.specialtyGenes = new SpecialtyGeneGridContainer({
				title: "Specialty Genes",
				id: this.viewer.id + "_" + "specialtyGenes",
				disabled: false,
				state: this.state
			});
			this.pathways = new PathwaysContainer({
				title: "Pathways",
				id: this.viewer.id + "_" + "pathways",
				disabled: false
			});
			this.proteinFamilies = new ProteinFamiliesContainer({
				title: "Protein Families",
				id: this.viewer.id + "_" + "proteinFamilies",
				disabled: false
			});
			this.transcriptomics = new TranscriptomicsContainer({
				title: "Transcriptomics",
				id: this.viewer.id + "_" + "transcriptomics",
				disabled: false,
				state: this.state
			});

			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.genomes);
			this.viewer.addChild(this.sequences);
			this.viewer.addChild(this.features);
			this.viewer.addChild(this.specialtyGenes);
			this.viewer.addChild(this.proteinFamilies);
			this.viewer.addChild(this.pathways);
			this.viewer.addChild(this.transcriptomics);

			// on(this.domNode, "SetAnchor", lang.hitch(this, function(evt){
			// 		evt.stopPropagation();
			// 		console.log(this.id, " Call onSetAnchor " , this);
			// 		this.onSetAnchor(evt);
			// }));
			if (localStorage){
				var gs = localStorage.getItem(this.showQuickstartKey);
				if (gs){
					gs=JSON.parse(gs);
				}
				if (!gs){

					var dlg = new Dialog({title: "PATRIC Quickstart", content: '<video autoplay="true" src="/public/video/P3_QUICKSTART_V2.mp4" controls="controls" width="945"></video>'})
					dlg.show();
					localStorage.setItem(this.showQuickstartKey,true);
				}

			}
		},
		onSetTotalGenomes: function(attr, oldVal, newVal){
			// console.log("ON SET TOTAL GENOMES: ", newVal);
			this.totalCountNode.innerHTML = " ( " + newVal + " Genomes ) ";

			if (newVal>500){

				this.getReferenceAndRepresentativeGenomes();
			}

			// var hasDisabled = false;
			// var disabledTabs={};
			// this.viewer.getChildren().forEach(function(child){
			// 	if(child.maxGenomeCount && ((newVal > this.maxGenomesPerList) || (newVal > child.maxGenomeCount))){
			// 		// console.log("\t\tDisable Child: ", child.id);
			// 		hasDisabled = true;
			// 		child.set("disabled", true);
			// 	}else{
			// 		child.set("disabled", false);
			// 	}
			// }, this);

			// if(hasDisabled){
			// 	this.showWarning();
			// }else{
			// 	this.hideWarning();
			// }
		},
		hideWarning: function(){
			if(this.warningPanel){
				this.removeChild(this.warningPanel);
			}
		},

		showWarning: function(msg){
			if(!this.warningPanel){
				var c = this.warningContent.replace("{{maxGenomesPerList}}", this.maxGenomesPerList);
				this.warningPanel = new ContentPane({
					style: "margin:0px; padding: 0px;margin-top: -10px;margin:4px;margin-bottom: 0px;background: #f9ff85;margin-top: 0px;padding:4px;border:0px solid #aaa;border-radius:4px;font-weight:200;",
					content: '<table><tr style="background: #f9ff85;"><td><div class="WarningBanner" style="background: #f9ff85;text-align:left;margin:4px;margin-bottom: 0px;margin-top: 0px;padding:4px;border:0px solid #aaa;border-radius:4px;">' + c + "</div></td><td style='width:30px;'><i style='font-weight:400;color:#333;cursor:pointer;' class='fa-2x icon-cancel-circle close' style='color:#333;font-weight:200;'></td></tr></table>",
					region: "top",
					layoutPriority: 3
				});

				var _self=this;
				on(this.warningPanel, ".close:click", function(){
					_self.removeChild(_self.warningPanel);
				})

			}
			this.addChild(this.warningPanel);
		},
		onSetAnchor: function(evt){
			// console.log("onSetAnchor: ", evt, evt.filter);
			evt.stopPropagation();
			evt.preventDefault();
			var f = evt.filter;
			var parts = [];
			var q;
			if(this.query){
				q = (this.query.charAt(0) == "?") ? this.query.substr(1) : this.query;
				if(q != "keyword(*)"){
					parts.push(q)
				}
			}
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
			// console.log("NavigateTo: ", l);
			Topic.publish("/navigate", {href: l});
		}
	});
});
