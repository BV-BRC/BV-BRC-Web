define("p3/widget/AMRPanelMetaSummary", [
	"dojo/_base/declare", "dijit/_WidgetBase",
	"dojo/on", "dojo/dom-class",
	"./SummaryWidget", "./D3StackedBarChart"

], function(declare, WidgetBase,
			on, domClass,
			SummaryWidget, D3StackedBarChart){

	var phenotypeDef = {
		"R": {index: 0, label: "Resistant"},
		"S": {index: 1, label: "Susceptible"},
		"I": {index: 2, label: "Intermediate"}
	};

	return declare([SummaryWidget], {
		dataModel: "genome_amr",
		query: "",
		baseQuery: "&in(resistant_phenotype,(R,S,I))&limit(1)&facet((pivot,(antibiotic,resistant_phenotype)),(mincount,1),(limit,-1))&json(nl,map)",
		columns: [{
			label: "Antibiotic",
			field: "antibiotic"
		}, {
			label: "Susceptible",
			field: "S"
		}, {
			label: "Intermediate",
			field: "I"
		}, {
			label: "Resistant",
			field: "R"
		}],
		processData: function(data){

			if(!data || !data.facet_counts || !data.facet_counts.facet_pivot || !data.facet_counts.facet_pivot['antibiotic,resistant_phenotype']){
				console.log("INVALID SUMMARY DATA", data);
				return;
			}

			// control based on data availability
			if(data.response.numFound === 0){
				domClass.add(this.domNode.parentNode, "hidden");
				return;
			}else{
				domClass.remove(this.domNode.parentNode, "hidden");
			}

			var antibiotic_data = data.facet_counts.facet_pivot['antibiotic,resistant_phenotype'];

			var chartData = [];
			var tableData = [];

			antibiotic_data.forEach(function(d){
				var antibiotic = d.value;
				if(d.pivot){
					// process table data
					var item = {antibiotic: antibiotic};
					d.pivot.forEach(function(phenotype){
						item[phenotype.value] = phenotype.count;
					});
					tableData.push(item);

					// process chart data
					var dist = [0, 0, 0];
					d.pivot.forEach(function(phenotype){
						if(phenotypeDef.hasOwnProperty(phenotype.value)){
							dist[phenotypeDef[phenotype.value].index] = phenotype.count;
						}
					});
					var total = dist.reduce(function(a, b){
						return a + b;
					});

					chartData.push({
						label: antibiotic,
						phenotypes: ["Resistant", "Susceptible", "Intermediate"],
						total: total,
						dist: dist
					});
				}
			});
			// console.log(chartData, tableData);
			this._tableData = tableData;

			this.set('data', chartData);
		},

		render_chart: function(){
			if(!this.chart){
				this.chart = new D3StackedBarChart(this.chartNode);
				domClass.add(this.chart.node, "amr");

				var legend = Object.keys(phenotypeDef)
					.map(function(key){
						return phenotypeDef[key].label;
					});
				this.chart.renderLegend(legend);
				this.chart.processData(this.data);
				this.chart.render();

			}else{
				this.chart.processData(this.data);
				this.chart.render();
			}
		},

		render_table: function(){
			this.inherited(arguments);

			this.grid.refresh();
			this.grid.renderArray(this._tableData);
		}
	})
});