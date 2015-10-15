define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar","./ContainerActionBar","dijit/layout/StackContainer", "dijit/layout/TabController",
	"dijit/layout/ContentPane","dojo/topic"
], function(
	declare,BorderContainer,on,
	ActionBar, ContainerActionBar,TabContainer,StackController,
	ContentPane,Topic
){

	return declare([BorderContainer], {
		gutters: false,
		query: null,
		maxGenomeCount: 5000,
		_setQueryAttr: function(query){
			this.query = query;
			if (this.grid) {
				this.grid.set("query", query);
			}
		},
		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;
			if (this.visible && this.getFilterPanel){
				var fp = this.getFilterPanel();
				if (fp){
					Topic.publish("/overlay/left", {action: "set", panel: fp});
					return;
				}
			}
			
			Topic.publish("/overlay/left", {action: "hide"});
			
		},
		startup: function(){
			if (this._started) { return; }
		
			this.tabContainer = new TabContainer({region:"center",id: this.id + "_TabContainer"});
			var tabController = new StackController({containerId: this.id + "_TabContainer", region: "top", "class": "TextTabButtons"})

			this.experimentsGrid = new ContentPane({title: "Experiments", content: "Experiments Tab"});
			this.comparisonsGrid= new ContentPane({title: "Comparisions", content: "Comparison Grid"});
			this.tabContainer.addChild(this.experimentsGrid);
			this.tabContainer.addChild(this.comparisonsGrid);

			this.addChild(tabController);
			this.addChild(this.tabContainer);
		
			this.inherited(arguments);
		}
	});
});

