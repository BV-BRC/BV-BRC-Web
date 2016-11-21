define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/topic",
	"./GridContainer", "./BlastResultGrid"
], function(declare, lang,
			Topic,
			GridContainer, BlastResultGrid){

	return declare([GridContainer], {
		gridCtor: BlastResultGrid,
		containerType: "",
		enableFilterPanel: false,
		visible: true,
		store: null,

		buildQuery: function(){
		},
		_setQueryAttr: function(q){
		},

		_setStoreAttr: function(store){
			if(this.grid){
				this.grid.store = store;
			}
			this._set('store', store);
		},

		onSetState: function(attr, oldState, state){
			if(!state){
				return;
			}

			if(this.grid){
				this.grid.set('state', state);
			}
		},
		selectionActions: GridContainer.prototype.selectionActions.concat([
			[
				"GenomeBrowser",
				"fa icon-genome-browser fa-2x",
				{
					label: "Browser",
					multiple: false,
					validTypes: ["*"],
					validContainerTypes: ["sequence_data"],
					tooltip: "View in Genome Browser"
				},
				function(selection){

					var target = selection[0];
					var hit_from = target.detail.hsps[0].hit_from;
					var hit_to = target.detail.hsps[0].hit_to;

					var hash = lang.replace("#view_tab=browser&loc={0}:{1}..{2}&highlight={0}:{3}..{4}&tracks=refseqs,PATRICGenes,RefSeqGenes", [target.accession, Math.min(hit_from, hit_from - 200), Math.max(hit_to, hit_to + 200), hit_from, hit_to]);

					Topic.publish("/navigate", {
						href: "/view/Genome/" + target.genome_id + hash,
						target: "blank"
					});
				},
				false
			]
		])
	});
});