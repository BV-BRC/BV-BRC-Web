define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar","./ContainerActionBar","dijit/layout/StackContainer", "dijit/layout/TabController",
	"dijit/layout/ContentPane", "./TranscriptomicsExperimentGridContainer","dojo/topic","dojo/_base/lang",
	"./TranscriptomicsComparisonGridContainer"
], function(
	declare,BorderContainer,on,
	ActionBar, ContainerActionBar,TabContainer,StackController,
	ContentPane,TranscriptomicsExperimentGridContainer,Topic,lang,
	TranscriptomicsComparisonGridContainer
){

	return declare([BorderContainer], {
		gutters: false,
		query: null,
		maxGenomeCount: 5000,
		// _setQueryAttr: function(query){
		// 	this.query = query;
		// 	if (this.grid) {
		// 		this.grid.set("query", query);
		// 	}
		// },
		onSetState: function(attr, oldVal, state){
			console.log("PathwaysContainer set STATE.  genome_ids: ", state.genome_ids, " state: ", state);

			if(this.experimentsGrid){
				//console.log("Set PathwaysGrid State: ", state);
				this.experimentsGrid.set('state', state);
			}

			console.log("call _set(state) ", state);

			this._set("state", state);
		},
		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}
			if(this.experimentsGrid){
				this.experimentsGrid.set("visible", true)
			}
			if(this.comparisonsGrid){
				this.comparisonsGrid.set("visible", true)
			}
		},


		onFirstView: function(){
			if(this._firstView){
				return;
			} 

			this.tabContainer = new TabContainer({region:"center",id: this.id + "_TabContainer"});
			var tabController = new StackController({containerId: this.id + "_TabContainer", region: "top", "class": "TextTabButtons"})
			this.experimentsGrid = new TranscriptomicsExperimentGridContainer({title: "Experiments", state:lang.mixin({},this.state,{search:"&keyword(*)"})});
			this.comparisonsGrid= new TranscriptomicsComparisonGridContainer({title: "Comparisions",state:lang.mixin({},this.state,{search:"&keyword(*)"})});
			this.tabContainer.addChild(this.experimentsGrid);
			this.tabContainer.addChild(this.comparisonsGrid);
			
			this.addChild(tabController);
			this.addChild(this.tabContainer);
			this._firstView = true;
		}
	});
});

