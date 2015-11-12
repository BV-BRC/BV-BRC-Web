define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/lang",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/StackContainer", "dijit/layout/TabController",
	"./ProteinFamiliesGridContainer", "./ProteinFamiliesFilterGrid", "./ProteinFamiliesHeatmapContainer",
	"dijit/layout/ContentPane", "dojo/topic", "dijit/form/RadioButton", "dojo/dom-construct"
], function(declare, BorderContainer, on, lang,
			ActionBar, ContainerActionBar, TabContainer, StackController,
			ProteinFamiliesGridContainer, ProteinFamiliesFilterGrid, ProteinFamiliesHeatmapContainer,
			ContentPane, Topic, RadioButton, domConstruct){

	return declare([BorderContainer], {
		gutters: false,
		state: null,
		maxGenomeCount: 5000,
		apiServer: window.App.dataServiceURL,
		onSetState: function(attr, oldVal, state){
			//console.log("ProteinFamiliesContainer set STATE.  genome_ids: ", state.genome_ids, " state: ", state);
			if(this.proteinFamiliesGrid){
				this.proteinFamiliesGrid.set('state', state);
			}

			if(this.filterPanelGrid){
				this.filterPanelGrid.set('state', state);
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
			if(this.heatmap){
				this.heatmap.set('visible', true);
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

			var familyTypePanel = new ContentPane({
				region: "top"
			});
			// plfam
			var rb_plfam = new RadioButton({
				name: "familyType",
				value: "plfam"
			});
			rb_plfam.on("click", function(){
				Topic.publish("ProteinFamilies", "familyType", "plfam")
			});
			var label_plfam = domConstruct.create("label", {innerHTML: " PATRIC genus-specific families (PLfams)"});
			domConstruct.place(rb_plfam.domNode, familyTypePanel.containerNode, "last");
			domConstruct.place(label_plfam, familyTypePanel.containerNode, "last");

			// pgfam
			var rb_pgfam = new RadioButton({
				name: "familyType",
				value: "pgfam"
			});
			rb_pgfam.on("click", function(){
				Topic.publish("ProteinFamilies", "familyType", "pgfam")
			});
			var label_pgfam = domConstruct.create("label", {innerHTML: " PATRIC cross-genus families (PGfams)"});
			domConstruct.place(rb_pgfam.domNode, familyTypePanel.containerNode, "last");
			domConstruct.place(label_pgfam, familyTypePanel.containerNode, "last");

			// figfam
			var rb_figfam = new RadioButton({
				name: "familyType",
				value: "figfam",
				checked: true
			});
			rb_figfam.on("click", function(){
				Topic.publish("ProteinFamilies", "familyType", "figfam")
			});
			var label_figfam = domConstruct.create("label", {innerHTML: " FIGFam"});
			domConstruct.place(rb_figfam.domNode, familyTypePanel.containerNode, "last");
			domConstruct.place(label_figfam, familyTypePanel.containerNode, "last");

			filterPanel.addChild(familyTypePanel);

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

			this.heatmap = new ProteinFamiliesHeatmapContainer({
				title: "Heatmap",
				content: "heatmap",
				dataGridContainer: this.proteinFamiliesGrid,
				filterGrid: this.filterPanelGrid
			});

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