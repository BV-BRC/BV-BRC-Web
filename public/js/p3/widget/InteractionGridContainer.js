define([
	"dojo/_base/declare", "dojo/_base/lang",
	"./GridContainer", "./FacetFilterPanel", "./InteractionGrid"
], function(declare, lang,
	GridContainer, FacetFilterPanel, Grid){

	return declare([GridContainer], {
		gridCtor: Grid,
		containerType: "interaction_data",
		facetFields: ["method_name", "type_name", "is_hpi"],
		dataModel: "ppi",
		primaryKey: "interaction_id",
		constructor: function(options){
			this.topicId = options.topicId;

			// Topic.subscribe
		},
		buildQuery: function(){
			return "";
		},
		_setQueryAttr: function(){
			//
		},
		_setStateAttr: function(state){
			this.inherited(arguments);
			if(!state){
				return;
			}
			// console.log("InteractionGridContainer _setStateAttr", state.taxon_id);
			if(this.grid){
				this.grid.set('state', state);
			}

			this._set('state', state);
		},
		// createFilterPanel: function(){
		//
		// },
		containerActions: [],
		selectionActions: []
	});
});