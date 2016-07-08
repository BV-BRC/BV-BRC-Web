define("p3/widget/AMRPanelMetaSummary", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "./SummaryWidget",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "./PATRICTheme", "dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct", "../util/PathJoin", "dojo/fx/easing"

], function(declare, WidgetBase, on,
			domClass, SummaryWidget,
			xhr, lang, Chart2D, Theme, MoveSlice,
			ChartTooltip, domConstruct, PathJoin, easing){

	return declare([SummaryWidget], {
		dataModel: "genome_amr",
		query: "",
		baseQuery: "&limit(1)&facet((pivot,(resistant_phenotype,antibiotic)),(pivot,(antibiotic,resistant_phenotype)),(mincount,1),(limit,-1))&json(nl,map)",
		columns: [{
			label: "Antibiotic",
			field: "antibiotic"
		}, {
			label: "Phenotype",
			field: "phenotype"
		}, {
			label: "Genome Count",
			field: "count"
		}],
		processData: function(data){

			if(!data || !data.facet_counts || !data.facet_counts.facet_pivot || !data.facet_counts.facet_pivot['resistant_phenotype,antibiotic']){
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
			var phenotype_data = data.facet_counts.facet_pivot['resistant_phenotype,antibiotic'];

			// build a antibiotic name index
			var antibiotics = {};
			var chartData = {};

			antibiotic_data.forEach(function(d, idx){
				antibiotics[d.value] = idx;
			});

			phenotype_data.forEach(function(current){
				chartData[current.value] = current.pivot.map(function(d){
					return {text: d.value, x: antibiotics[d.value], y: d.count, phenotype: current.value}
				});
			});

			// console.log(antibiotics, chartData);

			var tableData = [];
			antibiotic_data.forEach(function(d){
				var antibiotic = d.value;
				tableData = tableData.concat(d.pivot.map(function(d){
					return {antibiotic: antibiotic, phenotype: d.value, count: d.count};
				}));
			});
			// console.log(tableData);
			this._tableData = tableData;

			this.set('data', chartData);
		},

		render_chart: function(){

			if(!this.chart){
				this.chart = new Chart2D(this.chartNode)
					.setTheme(Theme)
					.addPlot("default", {
						type: "StackedColumns",
						markers: true,
						gap: 3,
						animate: {duration: 1000, easing: easing.linear}
					})
					.addAxis("x", {
						majorLabels: false,
						minorTicks: false,
						minorLabels: false,
						microTicks: false
					})
					.addAxis("y", {
						title: "Genomes",
						vertical: true,
						majorLabels: true,
						minorTicks: true,
						minorLabels: true,
						microTicks: true,
						natural: true,
						includeZero: true
					});

				new ChartTooltip(this.chart, "default", {
					text: function(o){
						var d = o.run.data[o.index];
						return "[" + d.phenotype + "] " + d.text + " (" + d.y + ")";
					}
				});

				Object.keys(this.data).forEach(lang.hitch(this, function(key){
					this.chart.addSeries(key, this.data[key]);
				}));

				this.chart.render();
			}else{

				Object.keys(this.data).forEach(lang.hitch(this, function(key){
					this.chart.updateSeries(key, this.data[key]);
				}));
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