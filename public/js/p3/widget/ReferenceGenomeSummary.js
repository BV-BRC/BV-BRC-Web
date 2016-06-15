define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom-class", "dojo/dom-construct", "dojo/on", "dojo/request",
	"dojo/fx/easing",
	"dijit/_WidgetBase",
	"dojox/charting/Chart2D", "./PATRICTheme", "dojox/charting/action2d/MoveSlice", "dojox/charting/action2d/Tooltip",
	"dojox/charting/plot2d/Bars", "./SummaryWidget"

], function(declare, lang,
			domClass, domConstruct, on, xhr,
			easing,
			WidgetBase,
			Chart2D, Theme, MoveSlice, ChartTooltip,
			Bars, SummaryWidget){

	return declare([SummaryWidget], {
		dataModel: "genome",
		query: "",
		view: "table",
		baseQuery: "&eq(reference_genome,*)&select(reference_genome,genome_name,genome_id)&limit(25000)&facet((field,reference_genome),(mincount,1))&json(nl,map)",
		columns: [
			{label: "Type", field: "reference_genome"},
			{label: "Genome Name", field: "genome_name", renderCell: function(obj, val, node){
				node.innerHTML = '<a href="/view/Genome/' + obj.genome_id + '" target=_blank">' + val + '</a>';
			}}
		],
		processData: function(res){
			var chartLabels = this._chartLabels = [];

			if(!res || !res.facet_counts || !res.facet_counts.facet_fields || !res.facet_counts.facet_fields.reference_genome){
				console.error("INVALID SUMMARY DATA");
				return;
			}

			this._tableData = res.response.docs;
			var d = res.facet_counts.facet_fields.reference_genome; // now key-value pair

			var data = {};
			Object.keys(d).forEach(function(key){
				data[key] = [{source: key, x: 1, y: d[key]}];
			});

			// console.log(data);
			this.set('data', data);
		},

		render_chart: function(){

			if(!this.chart){
				this.chart = new Chart2D(this.chartNode)
					.setTheme(Theme)
					.addPlot("default", {
						type: "ClusteredColumns",
						markers: true,
						gap: 3,
						label: true,
						labelStyle: "outside",
						animate: {duration: 1000, easing: easing.linear}
					})
					.addAxis("x", {
						majorLabels: false,
						minorTicks: false,
						minorLabels: false,
						microTicks: false,
						labels: this._chartLabels
					})
					.addAxis("y", {
						vertical: true,
						majorTicks: false,
						natural: true,
						minorTicks: false
					});
					// .addSeries("source", this.data);

				Object.keys(this.data).forEach(lang.hitch(this, function(key){
					this.chart.addSeries(key, this.data[key]);
				}));

				new ChartTooltip(this.chart, "default", {
					text: function(o){
						var d = o.run.data[o.index];
						return d.source + " (" + d.y + ")"
					}
				});

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