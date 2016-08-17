define("p3/widget/AMRPanelSummary", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/dom-class",
	"./SummaryWidget"

], function(declare, lang,
			on, domClass,
			SummaryWidget){

	return declare([SummaryWidget], {
		templateString: '<div class="SummaryWidget"><div class="tableNode" data-dojo-attach-point="tableNode"></div></div>',
		dataModel: "genome_amr",
		query: "",
		view: "table",
		baseQuery: "",
		columns: [
			{label: "Antibiotic", field: "antibiotic"},
			{label: "Resistant Phenotype", field: "resistant_phenotype"},
			{
				label: "Measurement",
				children: [
					{label: "Sign", field: "measurement_sign"},
					{label: "Value", field: "measurement_value"},
					{label: "Units", field: "measurement_unit"}
				]
			},
			{
				label: "Laboratory typing",
				children: [
					{label: "Method", field: "laboratory_typing_method"},
					{label: "Platform", field: "laboratory_typing_platform"},
					{label: "Vendor", field: "vendor"},
					{label: "Version", field: "laboratory_typing_method_version"}
				]
			},
			{label: "Testing standard", field: "testing_standard"}
		],
		processData: function(data){

			if(!data || data.response.numFound == 0){
				// hide this section
				domClass.add(this.domNode.parentNode, "hidden");
				return;
			}

			// make section visible
			domClass.remove(this.domNode.parentNode, "hidden");

			this._tableData = data.response.docs;

			this.set('data', data.response.docs);
		},

		render_table: function(){
			this.inherited(arguments);

			this.grid.refresh();
			this.grid.renderArray(this._tableData);
		}
	})
});