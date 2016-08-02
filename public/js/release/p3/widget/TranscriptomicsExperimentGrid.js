define("p3/widget/TranscriptomicsExperimentGrid", [
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"./PageGrid", "./formatter", "../store/TranscriptomicsExperimentJsonRest", "./GridSelector"
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
		dataModel: "transcriptomics_experiment",
		primaryKey: "eid",
		deselectOnRefresh: true,
		columns: {
			"Selection Checkboxes": selector({}),
			eid: {label: "Experiment ID", field: "eid", hidden: true},
			title: {label: "Title", field: "title", hidden: false},
			samples: {label: "Comparisons", field: "samples", hidden: false},
			genes: {label: "Genes", field: "genes", hidden: false},
			pubmed: {label: "PubMed", field: "pmid", hidden: false},
			// linkout: {label: "Link Out", field: "", hidden: false},
			organism: {label: "Organism", field: "organism", hidden: false},
			strain: {label: "Strain", field: "strain", hidden: false},
			geneMod: {label: "Gene Modification", field: "mutant", hidden: false},
			expCond: {label: "Experimental Condition", field: "condition", hidden: false},
			timeSeries: {label: "Time Series", field: "timeseries", hidden: false},
			releaseDate: {label: "Release Date", field: "release_date", hidden: false},
			author: {label: "Author", field: "author", hidden: true},
			pi: {label: "PI", field: "pi", hidden: true},
			institution: {label: "Institution", field: "institution", hidden: true}
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
