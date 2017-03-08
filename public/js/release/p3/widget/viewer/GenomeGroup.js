define("p3/widget/viewer/GenomeGroup", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/topic",
	"./TabViewerBase", "./_GenomeList",
	"../GenomeListOverview", "../GroupGenomeGridContainer", "../SequenceGridContainer",
	"../FeatureGridContainer", "../SpecialtyGeneGridContainer", "../ProteinFamiliesContainer",
	"../PathwaysContainer", "../TranscriptomicsContainer"

], function(declare, lang,
			Topic,
			TabViewerBase, GenomeList,
			Overview, GroupGenomeGridContainer, SequenceGridContainer,
			FeatureGridContainer, SpecialtyGeneGridContainer, ProteinFamiliesContainer,
			PathwaysContainer, TranscriptomicsContainer){

	return declare([GenomeList], {
		groupPath: null,
		perspectiveLabel: "Genome Group View",
		perspectiveIconClass: "icon-selection-GenomeList",
		onSetQuery: function(attr, oldVal, newVal){
			//prevent default action
		},

		_setGroupPathAttr: function(GroupPath){
			// console.log("onSetGroupPath: ", GroupPath);
			this._set("groupPath", GroupPath);
			this.queryNode.innerHTML = this.buildHeaderContent();
		},

		onSetState: function(attr, oldVal, state){

			if(!state){
				throw Error("No State Set");
			}

			var parts = "/" + state.pathname.split("/").slice(2).map(decodeURIComponent).join("/");

			// console.log("Parts: ", parts, " pathname: ", state.pathname, " state: ", state);

			this.set("groupPath", parts);
			// console.log("GROUP PATH: ", parts)

			state.search = "in(genome_id,GenomeGroup(" + encodeURIComponent(parts) + "))";
			state.ws_path = parts;
			// console.log("state.search: ", state.search);
			this.inherited(arguments);
		},

		setActivePanelState: function(){

			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";

			var activeTab = this[active];

			if(!activeTab){
				console.log("ACTIVE TAB NOT FOUND: ", active);
				return;
			}
			switch(active){
				case "transcriptomics":
					var groupPath = encodeURIComponent("/" + this.groupPath);

					activeTab.set("state", lang.mixin({}, this.state, {search: "in(genome_ids,GenomeGroup(" + groupPath + "))"}));
					break;

				default:
					var activeQueryState;
					if(this.state && this.state.genome_ids){
						activeQueryState = this.state;
					}

					if(activeQueryState && active == "proteinFamilies"){
						if(activeTab._firstView){
							Topic.publish(activeTab.topicId, "showMainGrid");
						}
					}

					if(activeQueryState){
						activeTab.set("state", activeQueryState);
					}else{
						console.warn("MISSING activeQueryState for PANEL: " + active);
					}
					break;
			}

			if(activeTab){
				var pageTitle = "Genome Group " + activeTab.title;
				// console.log("Genome Group setActivePanelState: ", pageTitle);
				if(window.document.title !== pageTitle){
					window.document.title = pageTitle;
				}
			}
		},

		postCreate: function(){
			TabViewerBase.prototype.postCreate.call(this, arguments);

			this.watch("query", lang.hitch(this, "onSetQuery"));
			this.watch("genome_ids", lang.hitch(this, "onSetGenomeIds"));
			this.watch("referenceGenomes", lang.hitch(this, "onSetReferenceGenomes"));
			this.watch("total_genomes", lang.hitch(this, "onSetTotalGenomes"));

			this.overview = this.createOverviewPanel();

			this.genomes = new GroupGenomeGridContainer({
				title: "Genomes",
				id: this.viewer.id + "_" + "genomes",
				state: this.state,
				disable: false,
				onRefresh: lang.hitch(this, function(){
					console.log("Refreshed Genome Grid....")
					this.set("query", this.state.search, true);
				})
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

			/*
			if(localStorage){
				var gs = localStorage.getItem(this.showQuickstartKey);
				if(gs){
					gs = JSON.parse(gs);
				}
				if(!gs){

					var dlg = new Dialog({
						title: "PATRIC Quickstart",
						content: '<video autoplay="true" src="/public/video/P3_QUICKSTART_V2.mp4" controls="controls" width="945"></video>'
					});
					dlg.show();
					localStorage.setItem(this.showQuickstartKey, true);
				}

			}*/
		},

		buildHeaderContent: function(){
			return (this.groupPath).split('Genome Groups/')[1];
		},

		createOverviewPanel: function(){
			return new Overview({
				content: "Genome Group Overview",
				title: "Overview",
				isGenomeGroup: true,
				id: this.viewer.id + "_" + "overview"
			});
		}
	});
});
