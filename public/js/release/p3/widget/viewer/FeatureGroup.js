define("p3/widget/viewer/FeatureGroup", [
	"dojo/_base/declare", "./_FeatureList", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "dijit/layout/TabContainer", "../FeatureListOverview",
	"dojo/request", "dojo/_base/lang"
], function(declare, FeatureList, on,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, Overview,
			xhr, lang){
	return declare([FeatureList], {
		params: null,
		apiServiceUrl: window.App.dataAPI,
		groupPath: null,
		perspectiveLabel: "Feature Group View",
		perspectiveIconClass: "icon-perspective-FeatureList",
		onSetQuery: function(attr, oldVal, newVal){
			//prevent default action
		},

		_setGroupPathAttr: function(GroupPath){
			this._set("groupPath", GroupPath);
			this.queryNode.innerHTML = this.buildHeaderContent();
		},

		onSetState: function(attr, oldVal, state){

			if(!state){
				throw Error("No State Set");
			}

			var parts = "/" + state.pathname.split("/").slice(2).map(decodeURIComponent).join("/");

			this.set("groupPath", parts);

			state.search = "in(feature_id,FeatureGroup(" + encodeURIComponent(parts) + "))";
			state.ws_path = parts;
			// console.log("state.search: ", state.search);
			this.inherited(arguments);

			this.setActivePanelState();
		},

		setActivePanelState: function(){

			var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : "overview";

			var activeTab = this[active];

			if(!activeTab){
				console.log("ACTIVE TAB NOT FOUND: ", active);
				return;
			}
			switch(active){
				// case "transcriptomics":
				// 	var groupPath = encodeURIComponent("/" + this.groupPath);
				//
				// 	activeTab.set("state", lang.mixin({}, this.state, {search: "in(feature_id,FeatureGroup(" + groupPath + "))"}));
				// 	break;
				default:
					var activeQueryState;
					// if(this.state && this.state.feature_ids){
					if(this.state){
						activeQueryState = this.state;
					}

					if(activeQueryState){
						activeTab.set("state", activeQueryState);
					}else{
						console.warn("MISSING activeQueryState for PANEL: " + active);
					}
					break;
			}
		},

		buildHeaderContent: function(){
			return this.groupPath;
		},

		createOverviewPanel: function(){
			return new Overview({
				content: "Feature Group Overview",
				title: "Overview",
				isFeatureGroup: true,
				id: this.viewer.id + "_" + "overview"
			});
		}
	});
});
