define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"./PageGrid", "./formatter", "../store/PathwayJsonRest", "dojo/aspect",
	"dojo/_base/Deferred","./GridSelector"
], function(declare, BorderContainer, on,
			domClass, ContentPane, domConstruct,
			Grid, formatter, Store, aspect,
			Deferred,selector){

	var store = new Store({});

	return declare([Grid], {
		constructor: function(){
			this.queryOptions = {sort: [{attribute: "pathway_id"}]};
		},
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataAPI,
		store: store,
		dataModel: "pathway",
		primaryKey: "id",
		selectionModel: "extended",
		deselectOnRefresh: true,
		columns: {
			"Selection Checkboxes": selector({}),
			pathway_id: {label: 'Pathway ID', field: 'pathway_id'},
			pathway_name: {label: 'Pathway Name', field: 'pathway_name'},
			pathway_class: {label: 'Pathway Class', field: 'pathway_class'},
			gene: {label: 'Gene', field: 'gene'},
			product: {label: 'Product', field: 'product'},
			ecnum: {label: 'EC Number', field: 'ec_number', hidden: false},
			genome_count: {label: 'Uniq Genomes Count', field: 'genome_count'},
			gene_count: {label: 'Uniq Genes Count', field: 'gene_count'},
			genome_ec: {label: 'Uniq EC Count', field: 'genome_ec'},
			ec_cons: {label: 'EC Conseveration', field: 'ec_cons'},
			gene_cons: {label: 'Gene Conservation', field: 'gene_cons'}
		},
		_setTotalRows: function(rows){
			this.totalRows = rows;
			console.log("Total Rows: ", rows);
			if(this.controlButton){
				console.log("this.controlButton: ", this.controlButton);
				if(!this._originalTitle){
					this._originalTitle = this.controlButton.get('label');
				}
				this.controlButton.set('label', this._originalTitle + " (" + rows + ")");

				console.log(this.controlButton);
			}
		},

		startup: function(){
			var _self = this;

			aspect.before(_self, 'renderArray', function(results){
				Deferred.when(results.total || results.length, function(x){
					_self.set("totalRows", x);
				});
			});

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
