define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-construct",
	"dijit/layout/BorderContainer", "dijit/layout/StackContainer", "dijit/layout/TabController", "dijit/layout/ContentPane",
	"dijit/form/RadioButton", "dijit/form/Textarea", "dijit/form/TextBox", "dijit/form/Button",
	"./ActionBar", "./ContainerActionBar",
	"./TranscriptomicsGeneGridContainer", "./TranscriptomicsGeneFilterGrid", "./TranscriptomicsGeneHeatmapContainer",
], function(declare, lang, on, Topic, domConstruct,
			BorderContainer, TabContainer, StackController, ContentPane,
			RadioButton, TextArea, TextBox, Button,
			ActionBar, ContainerActionBar,
			MainGridContainer, FilterGrid, HeatmapContainer){

	return declare([BorderContainer], {
		id: "TGContainer",
		gutters: false,
		state: null,
		tgState: null,
		apiServer: window.App.dataServiceURL,
		constructor: function(){
			var self = this;

			Topic.subscribe("TranscriptomicsGene", lang.hitch(self, function(){
				// console.log("TranscriptomicsGeneContainer:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "updateTgState":
						self.tgState = value;
						break;
					default:
						break;
				}
			}));
		},
		onSetState: function(attr, oldVal, state){
			//console.log("ProteinFamiliesContainer set STATE.  genome_ids: ", state.genome_ids, " state: ", state);
			if(this.mainGridContainer){
				this.mainGridContainer.set('state', state);
			}
			this._set('state', state);
		},

		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}
			if(this.mainGridContainer){
				this.mainGridContainer.set('visible', true);
			}
			if(this.heatmapContainer){
				this.heatmapContainer.set('visible', true);
			}
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}

			var filterPanel = this._buildFilterPanel();

			this.tabContainer = new TabContainer({region: "center", id: this.id + "_TabContainer"});

			var tabController = new StackController({
				containerId: this.id + "_TabContainer",
				region: "top",
				"class": "TextTabButtons"
			});

			this.mainGridContainer = new MainGridContainer({
				title: "Table",
				content: "Transcriptomics Gene Table",
				state: this.state,
				apiServer: this.apiServer
			});

			this.heatmapContainer = new HeatmapContainer({
				title: "Heatmap",
				content: "Heatmap"
			});

			this.watch("state", lang.hitch(this, "onSetState"));

			this.tabContainer.addChild(this.mainGridContainer);
			this.tabContainer.addChild(this.heatmapContainer);
			this.addChild(tabController);
			this.addChild(this.tabContainer);
			this.addChild(filterPanel);

			this.inherited(arguments);
			this._firstView = true;
		},
		_buildFilterPanel: function(){

			var filterPanel = new ContentPane({
				region: "left",
				title: "filter",
				content: "Filter By",
				style: "width:380px; overflow:auto",
				splitter: true
			});

			// genome list grid
			var filterGrid = new FilterGrid({
				state: this.state
			});
			filterPanel.addChild(filterGrid);

			return filterPanel;
		}
	});
});