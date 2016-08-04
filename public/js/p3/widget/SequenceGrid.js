define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"./PageGrid", "./formatter", "../store/SequenceJsonRest", "./GridSelector"
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
		dataModel: "genome_sequence",
		primaryKey: "sequence_id",
		deselectOnRefresh: true,
		columns: {
			"Selection Checkboxes": selector({}),
			sequence_id: {label: "Sequence ID", field: "sequence_id", hidden: true},
			genome_name: {label: "Genome Name", field: "genome_name", hidden: false},
			accession: {label: "Accession", field: "accession", hidden: false},
			length: {label: "Length (bp)", field: "length", hidden: false},
			gc_content: {label: "GC Content %", field: "gc_content", hidden: false},
			sequence_type: {label: "Sequence Type", field: "sequence_type", hidden: false},
			topology: {label: "Topology", field: "topology", hidden: false},
			description: {label: "Description", field: "description", hidden: false}
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
