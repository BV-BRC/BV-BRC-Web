define([
	"dojo/_base/declare", "dojo/_base/lang",
	"./TabViewerBase",
	"../AntibioticOverview", "../AMRPanelGridContainer", "../FeatureGridContainer", "../SpecialtyGeneGridContainer",
	"../../util/QueryToEnglish"
], function(declare, lang,
			TabViewerBase,
			AntibioticOverview, AMRPanelGridContainer, FeatureGridContainer, SpecialtyGeneGridContainer,
			QueryToEnglish){

	return declare([TabViewerBase], {

		perspectiveLabel: "Antibiotic View",
		// perspectiveIconClass: "",

		onSetState: function(attr, oldVal, state){

			if(!state){
				return;
			}

			if(!state.search){
				this.queryNode.innerHTML = "Error";
				this.totalCountNode.innerHTML = "";
			}

			// bypass setting attribute and invoke tabs with state
			this.buildHeaderContent(state.search);

			if(state.hashParams && state.hashParams.view_tab){
				if(this[state.hashParams.view_tab]){
					var vt = this[state.hashParams.view_tab];

					vt.set("visible", true);
					this.viewer.selectChild(vt);
				}else{
					// console.log("No view-tab supplied in State Object");
				}
			}

			this.setActivePanelState();
		},

		setActivePanelState: function(){
			var activeQueryState;

			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";
			var activeTab = this[active];

			switch(active){
				case "overview":
					activeTab.set("state", lang.mixin({}, this.state));
					break;
				case "amr":
					activeTab.set("state", lang.mixin({}, this.state, {
						search: this.state.search.replace("antibiotic_name", "antibiotic")
					}));
					break;
				case "features":
				case "specialtyGenes":
					var antibioticName = this.state.search.split(",")[1].split(")")[0];
					activeTab.set("state", lang.mixin({}, this.state, {
						search: "keyword(" + antibioticName + ")"
					}));
					break;
				default:
					if(activeQueryState){
						activeTab.set("state", activeQueryState);
					}else{
						console.error("Missing Active Query State for: ", active);
					}
					break;
			}
		},

		buildHeaderContent: function(search){

			this.queryNode.innerHTML = QueryToEnglish(search);
			this.totalCountNode.innerHTML = "";
		},

		postCreate: function(){
			if(!this.state){
				this.state = {}
			}

			this.inherited(arguments); // creates this.viewer

			this.overview = new AntibioticOverview({
				title: "Overview",
				id: this.viewer.id + "_" + "overview"
			});

			this.amr = new AMRPanelGridContainer({
				title: "AMR Phenotypes",
				id: this.viewer.id + "_" + "amr"
			});

			this.features = new FeatureGridContainer({
				title: "Features",
				id: this.viewer.id + "_" + "features",
				defaultFilter: "eq(feature_type,%22classifier_predicted_region%22)"
			});

			this.specialtyGenes = new SpecialtyGeneGridContainer({
				title: "Specialty Genes",
				id: this.viewer.id + "_" + "specialtyGenes"
			});

			this.viewer.addChild(this.overview);
			this.viewer.addChild(this.amr);
			this.viewer.addChild(this.features);
			this.viewer.addChild(this.specialtyGenes);
		}
	})
});