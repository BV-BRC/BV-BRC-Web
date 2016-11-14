define("p3/widget/viewer/GenomeGroup", [
	"dojo/_base/declare", "./_GenomeList", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "dijit/layout/TabContainer", "../GenomeListOverview",
	"dojo/request", "dojo/_base/lang"
], function(declare, GenomeList, on, Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, Overview,
			xhr, lang){
	return declare([GenomeList], {
		params: null,
		apiServiceUrl: window.App.dataAPI,
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
