define([
	"dojo/_base/declare", "dojo/_base/xhr", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/aspect", "dojo/request", "dojo/on", "dojo/dom-class", "dojo/dom-construct",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane",
	"./Grid", "./formatter", "../store/GenomeFeatureJsonRest",
	"dgrid/selector"
], function(declare, xhr, lang, Deferred,
			aspect, request, on, domClass, domConstruct,
			BorderContainer, ContentPane,
			Grid, formatter, Store,
			selector){

	var store = new Store({});

	return declare([Grid], {
		constructor: function(){
			this.queryOptions = {
				sort: [{attribute: "genome_name", descending: false}, {
					attribute: "strand",
					descending: false
				}, {attribute: "start", descending: false}]
			};
			// console.warn("this.queryOptions: ", this.queryOptions);
		},
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataAPI,
		dataModel: "genome_feature",
		primaryKey: "feature_id",
		deselectOnRefresh: true,
		store: store,
		columns: {
			"Selection Checkboxes": selector({}),
			genome_name: {label: "Genome Name", field: "genome_name", hidden: false},
			accession: {label: "Accession", field: "accession", hidden: true},
			patric_id: {label: "PATRIC ID", field: "patric_id", hidden: false},
			refseq_locus_tag: {label: "RefSeq Locus Tag", field: "refseq_locus_tag", hidden: false},
			alt_locus_tag: {label: "Alt Locus Tag", field: "alt_locus_tag", hidden: false},
			gene: {label: "Gene Symbol", field: "gene", hidden: false},
// genome browser
			annotation: {label: "Annotation", field: "annotation", hidden: true},
			feature_type: {label: "Feature Type", field: "feature_type", hidden: true},
			start: {label: "Start", field: "start", hidden: true},
			end: {label: "End", field: "end", hidden: true},
			na_length: {label: "Length(NT)", field: "na_length", hidden: true},
			strand: {label: "Strand", field: "strand", hidden: true},
			figfam_id: {label: "FIGfam ID", field: "figfam_id", hidden: false},
			protein_id: {label: "Protein ID", field: "protein_id", hidden: true},
			aa_length: {label: "Length(AA)", field: "aa_length", hidden: true},
			product: {label: "Product", field: "product", hidden: false}
		},
		startup: function(){
			var _self = this;

			this.on(".dgrid-content .dgrid-row:dblclick", function(evt){
				var row = _self.row(evt);
				//console.log("dblclick row:", row);
				on.emit(_self.domNode, "ItemDblClick", {
					item_path: row.data.path,
					item: row.data,
					bubbles: true,
					cancelable: true
				});
				console.log('after emit');
			});

			this.on("dgrid-select", function(evt){
				//console.log('dgrid-select: ', evt);
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
				//console.log("dgrid-deselect");
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				};
				on.emit(_self.domNode, "deselect", newEvt);
			});

			// aspect.before(_self, 'renderArray', function(results){
			// 	Deferred.when(results.total, function(x){
			// 		_self.set("totalRows", x);
			// 	});
			// });

			this.inherited(arguments);
			// this._started = true;
			// this.refresh();
		}
	});
});
