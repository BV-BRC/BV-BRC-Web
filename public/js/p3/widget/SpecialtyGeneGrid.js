define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"./PageGrid", "./formatter", "../store/SpecialtyGeneJsonRest", "./GridSelector"
], function(declare, BorderContainer, on,
			domClass, ContentPane, domConstruct,
			Grid, formatter, Store, selector){

	var store = new Store({});

	return declare([Grid], {
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataAPI,
		store: store,
		dataModel: "sp_gene",
		primaryKey: "id",
		deselectOnRefresh: true,
		columns: {
			"Selection Checkboxes": selector({}),
			id: {label: "ID", field: "id", hidden: true},
			evidence: {label: "Evidence", field: "evidence", hidden: false},
			property: {label: "Property", field: "property", hidden: false},
			source: {label: "Source", field: "source", hidden: false},
			patric_id: {label: "PATRIC ID", field: "patric_id", hidden: false},
			refseq_locus_tag: {label: "RefSeq Locus Tag", field: "refseq_locus_tag", hidden: false},
			alt_locus_tag: {label: "Alt Locus Tag", field: "alt_locus_tag", hidden: false},
			source_id: {label: "Source ID", field: "source_id", hidden: false},
			gene: {label: "Gene", field: "gene", hidden: false},
			product: {label: "Product", field: "product", hidden: false},
			pubmed: {label: "Pubmed", field: "pubmed", hidden: false},
			identity: {label: "Identity", field: "identity", hidden: false},
			evalue: {label: "E-value", field: "e_value", hidden: false}
		},
		startup: function(){
			var _self = this;
			this.on(".dgrid-content .dgrid-row:dblclick", function(evt){
				var row = _self.row(evt);
				console.log("dblclick row:", row)
				on.emit(_self.domNode, "ItemDblClick", {
					item_path: row.data.path,
					item: row.data,
					bubbles: true,
					cancelable: true
				});
				console.log('after emit');
			});

			this.on("dgrid-select", function(evt){
				console.log('dgrid-select: ', evt);
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
				console.log("dgrid-select");
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
			this.refresh();
		}
	});
});
