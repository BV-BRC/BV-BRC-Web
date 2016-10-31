define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic",
	"dijit/popup", "dijit/TooltipDialog",
	"./TranscriptomicsGeneGrid", "./GridContainer"
], function(declare, lang, on, Topic,
			popup, TooltipDialog,
			TranscriptomicsGeneGrid, GridContainer){

	return declare([GridContainer], {
		gridCtor: TranscriptomicsGeneGrid,
		containerType: "transcriptomics_gene_data",
		facetFields: [],
		enableFilterPanel: false,
		constructor: function(){
			var self = this;
			Topic.subscribe("TranscriptomicsGene", lang.hitch(self, function(){
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
		buildQuery: function(){
			// prevent further filtering. DO NOT DELETE
		},
		_setQueryAttr: function(query){
			//block default query handler for now.
		},
		_setStateAttr: function(state){
			this.inherited(arguments);
			if(!state){
				return;
			}
			// console.log("TranscriptomicsGeneGridContainer _setStateAttr: ", state);
			if(this.grid){
				// console.log("   call set state on this.grid: ", this.grid);
				this.grid.set('state', state);
			}else{
				// console.log("No Grid Yet (TranscriptomicsGeneGridContainer)");
			}

			this._set("state", state);
		}
	});
});
