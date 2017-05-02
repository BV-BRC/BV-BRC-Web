define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"./PageGrid", "./formatter", "../store/SubSystemJsonRest", "dojo/aspect",
	"dojo/_base/Deferred", "./GridSelector"
], function(declare, BorderContainer, on,
			domClass, ContentPane, domConstruct,
			Grid, formatter, Store, aspect,
			Deferred, selector){

	var store = new Store({});

	return declare([Grid], {
		constructor: function(){
			this.queryOptions = {sort: [{attribute: "subsystem_id"}]};
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
		fullSelectAll: false,
		columns: {
			"Selection Checkboxes": selector({unhidable: true}),
			subsystem_id: {label: 'Subsystem ID', field: 'subsystem_id'},
			subsystem_name: {label: 'Subsystem Name', field: 'subsystem_name'},
			gene: {label: 'Gene', field: 'gene'},
			product: {label: 'Product', field: 'product'},
			role_id: {label: 'Role ID', field: 'role_id', hidden: false},
			role_name:  {label: 'Role Name', field: 'role_name', hidden: false},
			active: {label: 'Active', field: 'active'},
			genome_id: {label: 'Genome ID', field: 'genome_id'},
			genome_name: {label: 'Genome Name', field: 'genome_name'},
			taxon_id: {label: 'Taxon ID', field: 'taxon_id'},
			class: {label: 'Class', field: 'class'},
			subclass: {label: 'SubClass', field: 'subclass'}
		},
		_setTotalRows: function(rows){
			this.totalRows = rows;

			if(this.controlButton){
				if(!this._originalTitle){
					this._originalTitle = this.controlButton.get('label');
				}
				this.controlButton.set('label', this._originalTitle + " (" + rows + ")");
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
				// console.log("dblclick row:", row)
				on.emit(_self.domNode, "ItemDblClick", {
					item_path: row.data.path,
					item: row.data,
					bubbles: true,
					cancelable: true
				});
				// console.log('after emit');
			});

			this.on("dgrid-select", function(evt){
				// console.log('dgrid-select: ', evt);
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
				// console.log("dgrid-select");
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
