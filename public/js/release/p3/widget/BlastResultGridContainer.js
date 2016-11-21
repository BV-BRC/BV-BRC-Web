define("p3/widget/BlastResultGridContainer", [
	"dojo/_base/declare", "dojo/_base/lang",
	"./GridContainer", "./BlastResultGrid"
], function(declare, lang,
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
		}
	});
});