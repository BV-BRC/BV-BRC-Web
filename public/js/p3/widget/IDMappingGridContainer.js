define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic",
	"dijit/popup", "dijit/TooltipDialog",
	"./IDMappingGrid", "./GridContainer"
], function(declare, lang, on, Topic,
			popup, TooltipDialog,
			IDMappingGrid, GridContainer){

	return declare([GridContainer], {
		gridCtor: IDMappingGrid,
		containerType: "feature_data",
		facetFields: [],
		enableFilterPanel: false,

		buildQuery: function(){
			// prevent further filtering. DO NOT DELETE
		},
		_setQueryAttr: function(query){
			//block default query handler for now.
		},
		onSetState: function(state){
			// block default behavior
		},
		_setStateAttr: function(state){
			this.inherited(arguments);
			if(!state){
				return;
			}
			// console.log("PathwaySummaryGridContainer _setStateAttr: ", state);
			if(this.grid){
				// console.log("   call set state on this.grid: ", this.grid);
				this.grid.set('state', state);
			}else{
				console.log("No Grid Yet (PathwaySummaryGridContainer)");
			}

			this._set("state", state);
		}
	});
});
