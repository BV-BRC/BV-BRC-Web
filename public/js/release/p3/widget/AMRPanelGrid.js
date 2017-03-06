define("p3/widget/AMRPanelGrid", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on",
	"dijit/layout/BorderContainer",
	"../store/AMRJsonRest",
	"./PageGrid", "./GridSelector"
], function(declare, lang,
			on,
			BorderContainer,
			Store,
			Grid, selector){

	var store = new Store({});

	return declare([Grid], {
		region: "center",
		query: (this.query || ""),
		store: store,
		columns: {
			"Selection Checkboxes": selector({unhidable: true}),
			genome_name: {label: "Genome Name", field: "genome_name", hidden: true},
			antibiotic: {label: "Antibiotic", field: "antibiotic"},
			phenotype: {label: "Resistant Phenotype", field: "resistant_phenotype"},
			m_sign: {label: "Measurement Sign", field: "measurement_sign"},
			m_value: {label: "Measurement Value", field: "measurement_value"},
			m_unit: {label: "Measurement Units", field: "measurement_unit"},
			l_method: {label: "Lab typing Method", field: "laboratory_typing_method"},
			l_pltform: {label: "Lab typing Platform", field: "laboratory_typing_platform"},
			l_vendor: {label: "Lab typing Vendor", field: "vendor"},
			l_version: {label: "Lab typing Version", field: "laboratory_typing_method_version"},
			test_standard: {label: "Testing standard", field: "testing_standard"},
			test_year: {label: "Testing standard year", field: "testing_standard_year", hidden: true},
			source: {label: "Source", field: "source", hidden: true}
		},
		startup: function(){
			var _self = this;
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
				// console.log("dgrid-deselect");
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
	})
});