define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-construct",
	"dijit/layout/BorderContainer", "dijit/layout/StackContainer", "dijit/layout/TabController", "dijit/layout/ContentPane",
	"dijit/form/RadioButton", "dijit/form/Textarea", "dijit/form/TextBox", "dijit/form/Button", "dijit/form/Select",
	"./ActionBar", "./ContainerActionBar",
	"./TranscriptomicsGeneGridContainer", "./TranscriptomicsGeneFilterGrid", "./TranscriptomicsGeneHeatmapContainer"
], function(declare, lang, on, Topic, domConstruct,
			BorderContainer, TabContainer, StackController, ContentPane,
			RadioButton, TextArea, TextBox, Button, Select,
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
			// console.log("ProteinFamiliesContainer set STATE.  genome_ids: ", state.genome_ids, " state: ", state);
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
				style: "width:283px; overflow:auto",
				splitter: true
			});

			var filterGridDescriptor = new ContentPane({
				style: 'padding: 0',
				content: '<div class="tgFilterOptions"><div><img src="/public/js/p3/resources/images/expression_data_up.png" alt="Up regulate" title="Up regulate"></div><div><img src="/public/js/p3/resources/images/expression_data_down.png" alt="Down regulate" title="Down regulate"></div><div><img src="/public/js/p3/resources/images/expression_data_mixed.png" alt="Don\'t care" title="Don\'t care"></div></div>'
			});
			filterPanel.addChild(filterGridDescriptor);

			// genome list grid
			var filterGrid = new FilterGrid({
				"class": "tgFilterGrid",
				state: this.state
			});
			filterPanel.addChild(filterGrid);

			// other filter items
			var otherFilterPanel = new ContentPane({
				region: "bottom"
			});

			// var select_genome_filter = new Select({
			// 	name: "selectGenomeFilter",
			// 	options:[{}],
			// 	style: "width: 250px; margin: 5px 0"
			// });
			// var label_select_genome_filter = domConstruct.create("label", {innerHTML: "Filer by Genome: "});
			// domConstruct.place(label_select_genome_filter, otherFilterPanel.containerNode, "last");
			// domConstruct.place(select_genome_filter.domNode, otherFilterPanel.containerNode, "last");
			// domConstruct.place("<br>", otherFilterPanel.containerNode, "last");

			var select_log_ratio = new Select({
				name: "selectLogRatio",
				options: [{value: 0, label: "0"}, {value: 0.5, label: "0.5"}, {value: 1, label: "1"},
					{value: 1.5, label: "1.5"}, {value: 2, label: "2"}, {value: 2.5, label: "2.5"},
					{value: 3, label: "3"}
				],
				style: "width: 80px; margin: 5px 0"
			});
			var label_select_log_ratio = domConstruct.create("label", {innerHTML: "Filter by |Log Ratio|: "});
			domConstruct.place(label_select_log_ratio, otherFilterPanel.containerNode, "last");
			domConstruct.place(select_log_ratio.domNode, otherFilterPanel.containerNode, "last");
			domConstruct.place("<br>", otherFilterPanel.containerNode, "last");

			var select_z_score = new Select({
				name: "selectZScore",
				options: [{value: 0, label: "0"}, {value: 0.5, label: "0.5"}, {value: 1, label: "1"},
					{value: 1.5, label: "1.5"}, {value: 2, label: "2"}, {value: 2.5, label: "2.5"},
					{value: 3, label: "3"}
				],
				style: "width: 80px; margin: 5px 0"
			});
			var label_select_z_score = domConstruct.create("label", {innerHTML: "Filter by |Z-score|: "});
			domConstruct.place(label_select_z_score, otherFilterPanel.containerNode, "last");
			domConstruct.place(select_z_score.domNode, otherFilterPanel.containerNode, "last");
			domConstruct.place("<br>", otherFilterPanel.containerNode, "last");

			var defaultFilterValue = {
				upFold: 0,
				downFold: 0,
				upZscore: 0,
				downZscore: 0
			};

			var btn_submit = new Button({
				label: "Filter",
				onClick: lang.hitch(this, function(){

					var filter = {};

					var lr = parseFloat(select_log_ratio.get('value'));
					var zs = parseFloat(select_z_score.get('value'));

					!isNaN(lr) ? (filter.upFold = lr, filter.downFold = -lr) : {};
					!isNaN(zs) ? (filter.upZscore = zs, filter.downZscore = -zs) : {};

					this.tgState = lang.mixin(this.tgState, defaultFilterValue, filter);
					Topic.publish("TranscriptomicsGene", "applyConditionFilter", this.tgState);
				})
			});
			domConstruct.place(btn_submit.domNode, otherFilterPanel.containerNode, "last");

			filterPanel.addChild(otherFilterPanel);

			return filterPanel;
		}
	});
});