define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"./PageGrid", "./formatter","../store/PathwayJsonRest"
], function(declare, BorderContainer, on,
			domClass, ContentPane, domConstruct,
			Grid, formatter, Store) {

		var store = new Store({});

	return declare([Grid], {
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
                        pathway_id: {label: 'Pathway ID', field: 'pathway_id'},
                        pathway_name: {label: 'Pathway Name', field: 'pathway_name'},
                        pathway_class: {label: 'Pathway Class', field: 'pathway_class'},
                        annotation: {label: 'Annotation', field: 'annotation'},
                        gene: {label: 'Gene', field: 'gene'},
                        product: {label: 'Product', field: 'product'},
                        ecnum: {label: 'EC Number', field: 'ec_number'},
                        ecdesc: {label: 'EC Description', field: 'ec_description'}
                },

		startup: function() {
			var _self = this;
			this.on(".dgrid-content .dgrid-row:dblclick", function(evt) {
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

			this.on("dgrid-select", function(evt) {
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
			this.on("dgrid-deselect", function(evt) {
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
