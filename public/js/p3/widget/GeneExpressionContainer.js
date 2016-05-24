define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-construct",
	"dijit/layout/BorderContainer", "dijit/layout/StackContainer", "dijit/layout/TabController", "dijit/layout/ContentPane",
	"dijit/form/RadioButton", "dijit/form/Textarea", "dijit/form/TextBox", "dijit/form/Button", "dijit/form/Select",
	"./ActionBar", "./ContainerActionBar",
	"./GeneExpressionGridContainer", "./GeneExpressionChartContainer", "./GeneExpressionMetadataChartContainer"
], function(declare, lang, on, Topic, domConstruct,
			BorderContainer, TabContainer, StackController, ContentPane,
			RadioButton, TextArea, TextBox, Button, Select,
			ActionBar, ContainerActionBar,
			GeneExpressionGridContainer, GeneExpressionChartContainer, GeneExpressionMetadataChartContainer){

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
			if(this.GeneExpressionChartContainer){
				this.GeneExpressionChartContainer.set('state', state);
			}
			if(this.GeneExpressionMetadataChartContainer){
				this.GeneExpressionMetadataChartContainer.set('state', state);
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

			console.log("GeneExpressionGridContainer onFirstView: this", this);
			console.log("GeneExpressionGridContainer onFirstView after _buildFilterPanel(): this.tgState", this.tgState);

			// for charts
			var bc = new BorderContainer({
				region: "top",
				style: "height: 350px;"
			});

			console.log("Before creating GeneExpressionChartContainer", this);

			var chartContainer1 = new GeneExpressionChartContainer({
				region: "leading", style: "height: 300px; width: 500px; ", doLayout: false, id: this.id + "_chartContainer1",
				title: "Chart",
				content: "Gene Expression Chart",
				state: this.state,
				tgtate: this.tgState,
				apiServer: this.apiServer
			});

			chartContainer1.startup();


			var chartContainer2 = new GeneExpressionMetadataChartContainer({
				region: "leading", style: "height: 300px; width: 500px; ", doLayout: false, id: this.id + "_chartContainer2",
				title: "Chart",
				content: "Gene Expression Metadata Chart",
				state: this.state,
				tgtate: this.tgState,
				apiServer: this.apiServer
			});

			chartContainer2.startup();

			//console.log("onFirstView new GeneExpressionGridContainer state: ", this.state);
			//console.log(" onFirstView new GeneExpressionGridContainer this.apiServer: ", this.apiServer);

			// for data grid
			this.tabContainer = new TabContainer({region: "center", id: this.id + "_TabContainer"});

			var tabController1 = new StackController({
				containerId: this.id + "_chartTabContainer1",
				region: "top",
				"class": "TextTabButtons"
			});

			var tabController2 = new StackController({
				containerId: this.id + "_chartTabContainer2",
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
			this.addChild(bc);
			//bc.addChild(tabController1);
			bc.addChild(chartContainer1);
			//bc.addChild(tabController2);
			bc.addChild(chartContainer2);
			this.tabContainer.addChild(this.GeneExpressionGridContainer);
			this.addChild(this.tabContainer);

			this.inherited(arguments);
			this._firstView = true;
			//console.log("new GeneExpressionGridContainer arguments: ", arguments);
		},

		_buildFilterPanel: function(){

			// other filter items
			var otherFilterPanel = new ContentPane({
				region: "top"
			});


			//var keyword_label = domConstruct.create("label", {innerHTML: "Keyword "});
			var keyword_textbox = new TextBox({
				name: "keywordText",
				value: "",
				placeHolder: "keyword",
				style: "width: 200px; margin: 5px 0"
			});
			//domConstruct.place(keyword_label, otherFilterPanel.containerNode, "last");
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
			var label_select_log_ratio = domConstruct.create("label", {style: "margin-left: 10px;", innerHTML: " |Log Ratio|: "});
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
			var label_select_z_score = domConstruct.create("label", {style: "margin-left: 10px;", innerHTML: " |Z-score|: "});
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

			this.tgState = defaultFilterValue;
			var btn_submit = new Button({
				label: "Filter",
				style: "margin-left: 10px;",
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
					console.log("submit btn clicked: this.tgState", this.tgState);
				})
			});
			domConstruct.place(btn_submit.domNode, otherFilterPanel.containerNode, "last");

			var reset_submit = new Button({
				label: "Reset Filter",
				style: "margin-left: 10px;",
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
				style: "margin-left: 10px;",
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