define("p3/widget/SubsystemMapContainer", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-construct",
	"dijit/layout/BorderContainer", "dijit/layout/StackContainer", "dijit/layout/TabController", "dijit/layout/ContentPane",
	"dijit/form/RadioButton", "dijit/form/Textarea", "dijit/form/TextBox", "dijit/form/Button", "dijit/form/Select",
	"./ActionBar", "./ContainerActionBar",
	"./SubsystemMapHeatmapContainer"
], function(declare, lang, on, Topic, domConstruct,
			BorderContainer, TabContainer, StackController, ContentPane,
			RadioButton, TextArea, TextBox, Button, Select,
			ActionBar, ContainerActionBar,
			HeatmapContainer){

	return declare([BorderContainer], {
		gutters: false,
		state: null,
		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}
			if(this.mainMapContainer){
				this.mainMapContainer.set('visible', true);
			}
			if(this.heatmapContainer){
				this.heatmapContainer.set('visible', true);
			}
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}

			this.tabContainer = new TabContainer({region: "center", id: this.id + "_TabContainer"});

			var tabController = new StackController({
				containerId: this.id + "_TabContainer",
				region: "top",
				"class": "TextTabButtons"
			});

			this.heatmapContainer = new HeatmapContainer({
				title: "Subsystem Heatmap",
				content: "Subsystem Heatmap", 
				state: this.state,
				apiServer: this.apiServer
			});

			this.tabContainer.addChild(this.heatmapContainer);
			this.addChild(tabController);
			this.addChild(this.tabContainer);

			this.inherited(arguments);
			this._firstView = true;
		}
	});
});