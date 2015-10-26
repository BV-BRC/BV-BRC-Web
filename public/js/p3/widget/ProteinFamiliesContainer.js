define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/lang",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/StackContainer", "dijit/layout/TabController",
	"./ProteinFamiliesGridContainer", "./ProteinFamiliesFilterGrid", "dijit/layout/ContentPane", "dojo/topic"
], function(declare, BorderContainer, on, lang,
			ActionBar, ContainerActionBar, TabContainer, StackController,
			ProteinFamiliesGridContainer, ProteinFamiliesFilterGrid, ContentPane, Topic){

	return declare([BorderContainer], {
		gutters: false,
		state: null,
		maxGenomeCount: 5000,
		apiServer: window.App.dataServiceURL,
		onSetState: function(attr, oldVal, state){
			console.log("ProteinFamiliesContainer set STATE.  genome_ids: ", state.genome_ids, " state: ", state);
			if(this.proteinFamiliesGrid){
				console.log("Set ProteinFamiliesGrid State: ", state);
				this.proteinFamiliesGrid.set('state', state);
			}
			if(this.filterPanelGrid){
				this.filterPanelGrid.set('query', 'in(genome_id,(' + state.genome_ids + '))');
			}
			this._set('state', state);
		},

		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}
			if(this.proteinFamiliesGrid){
				this.proteinFamiliesGrid.set('visible', true);
			}
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}

			var filterPanel = new ContentPane({
				region: "left",
				title: "filter",
				content: "Filter By",
				style: "width:400px; overflow:auto;",
				splitter: true
			});

			this.filterPanelGrid = new ProteinFamiliesFilterGrid({
				state: this.state
			});
			filterPanel.addChild(this.filterPanelGrid);

			this.tabContainer = new TabContainer({region: "center", id: this.id + "_TabContainer"});

			var tabController = new StackController({
				containerId: this.id + "_TabContainer",
				region: "top",
				"class": "TextTabButtons"
			});

			this.proteinFamiliesGrid = new ProteinFamiliesGridContainer({
				title: "Table",
				content: "Protein Families Table",
				state: this.state,
				apiServer: this.apiServer
			});

			this.heatmap = new ContentPane({title: "Heatmap", content: "Heatmap"});

			this.watch("state", lang.hitch(this, "onSetState"));

			this.tabContainer.addChild(this.proteinFamiliesGrid);
			this.tabContainer.addChild(this.heatmap);
			this.addChild(tabController);
			this.addChild(this.tabContainer);
			this.addChild(filterPanel);

			this.inherited(arguments);
			this._firstView = true;
		}
	});
});