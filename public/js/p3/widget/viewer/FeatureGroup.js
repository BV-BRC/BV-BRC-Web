define([
	"dojo/_base/declare", "./_FeatureList", "dojo/on","./TabViewerBase",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "dijit/layout/TabContainer", "../FeatureListOverview",
	"dojo/request", "dojo/_base/lang","../GroupFeatureGridContainer"
], function(declare, FeatureList, on,TabViewerBase,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, Overview,
			xhr, lang, GroupFeatureGridContainer){
	return declare([FeatureList], {
		params: null,
		apiServiceUrl: window.App.dataAPI,
		groupPath: null,
		perspectiveLabel: "Feature Group View",
		perspectiveIconClass: "icon-selection-FeatureList",
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

			if(activeTab){
				var pageTitle = "Feature Group " + activeTab.title;
				// console.log("Feature Group: ", pageTitle);
				if(window.document.title !== pageTitle){
					window.document.title = pageTitle;
				}
			}
		},

		buildHeaderContent: function(){
			return (this.groupPath).split('Feature Groups/')[1];
		},

		createOverviewPanel: function(){
			return new Overview({
				content: "Feature Group Overview",
				title: "Overview",
				isFeatureGroup: true,
				id: this.viewer.id + "_" + "overview"
			});
		},

                postCreate: function(){
			TabViewerBase.prototype.postCreate.call(this,arguments);
                        this.watch("query", lang.hitch(this, "onSetQuery"));
                        this.watch("total_features", lang.hitch(this, "onSetTotalFeatures"));

                        this.overview = this.createOverviewPanel(this.state);

                        this.features = new GroupFeatureGridContainer({
                                title: "Features",
                                id: this.viewer.id + "_" + "features",
                                tooltip: 'Features tab contains a list of all features (e.g., CDS, rRNA, tRNA, etc.) associated with a given Phylum, Class, Order, Family, Genus, Species or Genome.',
                                disabled: false,
                                onRefresh: lang.hitch(this,function(){
                                	console.log("Refreshed Feature Grid....")
                                	this.set("query", this.state.search, true);
                                })
                        });

                        this.viewer.addChild(this.overview);
                        this.viewer.addChild(this.features);
                },
	});
});
