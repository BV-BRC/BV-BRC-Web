define("p3/widget/GeneExpressionContainer", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-construct",
	"dijit/layout/BorderContainer", "dijit/layout/StackContainer", "dijit/layout/TabController", "dijit/layout/ContentPane",
	"dijit/form/RadioButton", "dijit/form/Textarea", "dijit/form/TextBox", "dijit/form/Button", "dijit/form/Select",
	"./ActionBar", "./ContainerActionBar",
	"./GeneExpressionGridContainer"
], function(declare, lang, on, Topic, domConstruct,
			BorderContainer, TabContainer, StackController, ContentPane,
			RadioButton, TextArea, TextBox, Button, Select,
			ActionBar, ContainerActionBar,
			GeneExpressionGridContainer){

	return declare([BorderContainer], {
		id: "GEContainer",
		gutters: false,
		state: null,
		tgState: null,
		apiServer: window.App.dataServiceURL,
		constructor: function(){
			var self = this;

			Topic.subscribe("GeneExpression", lang.hitch(self, function(){
				console.log("GeneExpression:", arguments);
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
			console.log("GeneExpressionGridContainer onSetState set state: ", state);
			if(this.GeneExpressionGridContainer){
				this.GeneExpressionGridContainer.set('state', state);
			}
			this._set('state', state);
		},

		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}
			if(this.GeneExpressionGridContainer){
				this.GeneExpressionGridContainer.set('visible', true);
			}
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}

			var filterPanel = this._buildFilterPanel();

			//console.log("onFirstView new GeneExpressionGridContainer state: ", this.state);
			//console.log(" onFirstView new GeneExpressionGridContainer this.apiServer: ", this.apiServer);

			this.tabContainer = new TabContainer({region: "center", id: this.id + "_TabContainer"});

			var tabController = new StackController({
				containerId: this.id + "_TabContainer",
				region: "top",
				"class": "TextTabButtons"
			});
			
			this.GeneExpressionGridContainer = new GeneExpressionGridContainer({
				title: "Table",
				content: "Gene Expression Table",
				state: this.state,
				apiServer: this.apiServer
			});

			console.log("onFirstView create GeneExpressionGrid: ", this.GeneExpressionGridContainer);

			this.watch("state", lang.hitch(this, "onSetState"));

			this.addChild(filterPanel);
			this.tabContainer.addChild(this.GeneExpressionGridContainer);
			//this.addChild(tabController);
			this.addChild(this.tabContainer);
			//this.addChild(this.GeneExpressionGridContainer);

			this.inherited(arguments);
			this._firstView = true;
			//console.log("new GeneExpressionGridContainer arguments: ", arguments);
		},
		_buildFilterPanel: function(){

			//var filterPanel = new ContentPane({
			//	region: "top",
			//	title: "filter",
			//	content: "Filter By",
			//	style: "height:200px; overflow:auto",
			//	splitter: true
			//});

			// genome list grid
			//var filterGrid = new FilterGrid({
			//	state: this.state
			//});
			//filterPanel.addChild(filterGrid);

			// other filter items
			var otherFilterPanel = new ContentPane({
				region: "top"
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

			var keyword_label = domConstruct.create("label", {innerHTML: "Keyword "});
			var keyword_textbox = new TextBox({
				name: "keywordText",
				value: "",
				style: "width: 120px"
			});
			domConstruct.place(keyword_label, otherFilterPanel.containerNode, "last");
			domConstruct.place(keyword_textbox.domNode, otherFilterPanel.containerNode, "last");


			var select_log_ratio = new Select({
				name: "selectLogRatio",
				id: "selectLogRatio",
				options: [{value: 0, label: "0"}, {value: 0.5, label: "0.5"}, {value: 1, label: "1"},
					{value: 1.5, label: "1.5"}, {value: 2, label: "2"}, {value: 2.5, label: "2.5"},
					{value: 3, label: "3"}
				],
				style: "width: 80px; margin: 5px 0"
			});
			var label_select_log_ratio = domConstruct.create("label", {innerHTML: "  |Log Ratio|: "});
			domConstruct.place(label_select_log_ratio, otherFilterPanel.containerNode, "last");
			domConstruct.place(select_log_ratio.domNode, otherFilterPanel.containerNode, "last");
			//domConstruct.place("<br>", otherFilterPanel.containerNode, "last");

			var select_z_score = new Select({
				name: "selectZScore",
				id: "selectZScore",
				options: [{value: 0, label: "0", selected: true }, {value: 0.5, label: "0.5"}, {value: 1, label: "1"},
					{value: 1.5, label: "1.5"}, {value: 2, label: "2"}, {value: 2.5, label: "2.5"},
					{value: 3, label: "3"}
				],
				style: "width: 80px; margin: 5px 0"
			});
			var label_select_z_score = domConstruct.create("label", {innerHTML: " |Z-score|: "});
			domConstruct.place(label_select_z_score, otherFilterPanel.containerNode, "last");
			domConstruct.place(select_z_score.domNode, otherFilterPanel.containerNode, "last");
			//domConstruct.place("<br>", otherFilterPanel.containerNode, "last");

			var defaultFilterValue = {
				upFold: 0,
				downFold: 0,
				upZscore: 0,
				downZscore: 0,
				keyword: ""
			};

			var btn_submit = new Button({
				label: "Filter",
				onClick: lang.hitch(this, function(){

					var filter = {
						upFold: 0,
						downFold: 0,
						upZscore: 0,
						downZscore: 0,
						keyword: ""
					};

					var lr = parseFloat(select_log_ratio.get('value'));
					var zs = parseFloat(select_z_score.get('value'));
					var keyword = keyword_textbox.get('value').trim();
					if(keyword){
						filter.keyword = keyword;
					}

					!isNaN(lr) ? (filter.upFold = lr, filter.downFold = -lr) : {};
					!isNaN(zs) ? (filter.upZscore = zs, filter.downZscore = -zs) : {};

					console.log("submit btn clicked: filter", filter);

					this.tgState = lang.mixin(this.tgState, defaultFilterValue, filter);
					Topic.publish("GeneExpression", "applyConditionFilter", this.tgState);					
				})
			});
			domConstruct.place(btn_submit.domNode, otherFilterPanel.containerNode, "last");

			var reset_submit = new Button({
				label: "Reset Filter",
				type: "reset",
				onClick: lang.hitch(this, function(){

					var filter = {
						upFold: 0,
						downFold: 0,
						upZscore: 0,
						downZscore: 0,
						keyword: ""
					};
					this.tgState = lang.mixin(this.tgState, defaultFilterValue, filter);
					Topic.publish("GeneExpression", "updateTgState", this.tgState);
					/*
					console.log("reset_submit btn clicked: select_z_score", select_z_score);
					for (var i = 0; i < select_log_ratio.options.length; i++) {
					    select_log_ratio.options[i].selected = select_log_ratio.options[i].defaultSelected;
					    select_z_score.options[i].selected = select_z_score.options[i].defaultSelected;
					}
					select_log_ratio.options[0].selected = "selected";
					select_z_score.options[0].selected = "selected";
					*/

					keyword_textbox.reset();
					select_log_ratio.reset();
					select_z_score.reset();

					//console.log("reset_submit btn clicked: select_log_ratio", select_log_ratio);
					//console.log("reset_submit btn clicked: select_z_score", select_z_score);
				})
			});
			domConstruct.place(reset_submit.domNode, otherFilterPanel.containerNode, "last");

			var all_submit = new Button({
				label: "Show All Comparisons",
				onClick: lang.hitch(this, function(){

					var filter = {
						upFold: 0,
						downFold: 0,
						upZscore: 0,
						downZscore: 0,
						keyword: ""
					};
					this.tgState = lang.mixin(this.tgState, defaultFilterValue, filter);
					Topic.publish("GeneExpression", "updateTgState", this.tgState);					

					//keyword_textbox.reset();
					//select_log_ratio.reset();
					//select_z_score.reset();
				})
			});
			domConstruct.place(all_submit.domNode, otherFilterPanel.containerNode, "last");

			//filterPanel.addChild(otherFilterPanel);

			return otherFilterPanel;
		}
	});
});