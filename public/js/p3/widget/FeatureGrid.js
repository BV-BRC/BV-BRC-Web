define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"./PageGrid", "./formatter", "../store/GenomeFeatureJsonRest", "./GridSelector"
], function(declare, BorderContainer, on,
			domClass, ContentPane, domConstruct,
			Grid, formatter, Store, selector){

	var store = new Store({});

	return declare([Grid], {
		constructor: function(){
			this.queryOptions = {
				sort: [{attribute: "genome_name", descending: false}, {
					attribute: "strand",
					descending: false
				}, {attribute: "start", descending: false}]
			};
			// console.log("this.queryOptions: ", this.queryOptions);
		},
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataAPI,
		dataModel: "genome_feature",
		primaryKey: "feature_id",
		deselectOnRefresh: true,
		selectAllFields: ["patric_id","genome_id","genome_name","refseq_locus_tag"],
		store: store,
		columns: {
			"Selection Checkboxes": selector({}),
			genome_name: {label: "Genome Name", field: "genome_name", hidden: false},
			accession: {label: "Accession", field: "accession", hidden: true},
			patric_id: {label: "PATRIC ID", field: "patric_id", hidden: false},
			refseq_locus_tag: {label: "RefSeq Locus Tag", field: "refseq_locus_tag", hidden: false},
			alt_locus_tag: {label: "Alt Locus Tag", field: "alt_locus_tag", hidden: true},
			feature_id: {label: "Feature ID", field: "feature_id", hidden: true},
			annotation: {label: "Annotation", field: "annotation", hidden: true},
			feature_type: {label: "Feature Type", field: "feature_type", hidden: true},
			start: {label: "Start", field: "start", hidden: true},
			end: {label: "END", field: "end", hidden: true},
			na_length: {label: "NA Length", field: "na_length", hidden: true},
			strand: {label: "Strand", field: "strand", hidden: true},
			protein_id: {label: "Protein ID", field: "protein_id", hidden: true},
			figfam: {label: "FIGfam", field: "figfam_id", hidden: true},
			plfam: {label: "PATRIC Local family", field: "plfam_id"},
			pgfam: {label: "PATRIC Global family", field: "pgfam_id"},
			aa_length: {label: "AA Length", field: "aa_length", hidden: true},
			gene: {label: "Gene Symbol", field: "gene", hidden: false},
			product: {label: "Product", field: "product", hidden: false}
		},

//		queryOptions: {
//			sort: [{ attribute: "genome_name", descending: true }]
//		},

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

			this.refresh();
		}
	});
});
