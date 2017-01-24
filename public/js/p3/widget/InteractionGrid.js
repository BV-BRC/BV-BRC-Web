define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/on", "dojo/topic", "dojo/aspect",
	"./PageGrid", "./formatter", "../store/InteractionMemoryStore", "./GridSelector"
], function(declare, lang, Deferred,
			on, Topic, aspect,
			PageGrid, formatter, Store, selector){

	return declare([PageGrid], {
		region: "center",
		query: (this.query || ""),
		store: null,
		columns: {
			"Selection Checkboxes": selector({unhidable: true}),
			feature_id_a: {label: "Feature ID A", field: "feature_id_a", hidden:true},
			patric_id_a: {label: "PATRIC ID A", field: "patric_id_a"},
			refseq_locus_tag_a: {label: "RefSeq Locus Tag A", field: "refseq_locus_tag_a"},
			gene_a: {label: "Gene A", field: "gene_a"},
			product_a: {label: "Product A", field: "product_a"},

			feature_id_b: {label: "Feature ID B", field: "feature_id_b", hidden:true},
			patric_id_b: {label: "PATRIC ID B", field: "patric_id_b"},
			refseq_locus_tag_b: {label: "RefSeq Locus Tag B", field: "refseq_locus_tag_b"},
			gene_b: {label: "Gene B", field: "gene_b"},
			product_b: {label: "Product B", field: "product_b"},

			type: {label: "Interaction Type", field: "type"},
			method: {label: "Detection Method", field: "method"},
			litref: {label: "Pubmed", field: "pmid"},
			score: {label: "Score", field: "score", hidden: true}
		},
		constructor: function(options, parent){

			this.topicId = parent.topicId;
			// Topic.subscribe

		},
		startup: function(){
			var _self = this;

			this.on(".dgrid-content .dgrid-row:dblclick", function(evt){
				var row = _self.row(evt);

				on.emit(_self.domNode, "ItemDblClick", {
					item_path: row.data.path,
					item: row.data,
					bubbles: true,
					cancelable: true
				});
			});

			this.on("dgrid-select", function(evt){
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				};
				on.emit(_self.domNode, "select", newEvt);
			});
			this.on("dgrid-deselect", function(evt){
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				};
				on.emit(_self.domNode, "deselect", newEvt);
			});
			this.inherited(arguments);
			// this.refresh();
		},
		// _setQuery: function(query){
		// 	if(!query){
		// 		return;
		// 	}
		// 	console.log("Interaction Grid _setQuery", query);
		//
		// 	var state = this.state = lang.mixin({}, this.state, {
		// 		query: query
		// 	})
		//
		// 	if(!this.store){
		// 		this.set('store', this.createStore(this.apiServer, this.apiToken, state));
		// 	}else{
		// 		this.store.set('state', state);
		// 		this.refresh();
		// 	}
		// },
		_setState: function(state){
			// console.log("Interaction Grid _setState", state);
			if(!this.store){
				this.set('store', this.createStore(this.apiServer, this.apiToken, state));
			}else{
				this.store.set('state', state);
				this.refresh();
			}
		},
		_selectAll: function(){
			this._unloadedData = {};

			return Deferred.when(this.store.data.map(function(d){
				this._unloadedData[d['interaction_id']] = d;
				return d['interaction_id'];
			}, this));
		},
		createStore: function(server, token, state){
			var store = new Store({
				token: window.App.authorizationToken,
				apiServer: window.App.dataServiceURL,
				topicId: this.topicId,
				state: state
			});
			store.watch('refresh', lang.hitch(this, "refresh"));

			return store;
		}
	})
});