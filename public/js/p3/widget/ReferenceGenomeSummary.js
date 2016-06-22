define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom-class", "dojo/dom-construct", "dojo/on", "dojo/request",
	"dojo/fx/easing",
	"dijit/_WidgetBase",
	"dojox/charting/Chart2D", "./PATRICTheme", "dojox/charting/action2d/MoveSlice", "dojox/charting/plot2d/Pie", "dojox/charting/action2d/Tooltip",
	"dojox/charting/plot2d/Bars", "./SummaryWidget"

], function(declare, lang,
			domClass, domConstruct, on, xhr,
			easing,
			WidgetBase,
			Chart2D, Theme, MoveSlice, Pie, ChartTooltip,
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

			if(!res || !res.facet_counts || !res.facet_counts.facet_fields || !res.facet_counts.facet_fields.reference_genome){
				console.error("INVALID SUMMARY DATA");
				return;
			}

			this._tableData = res.response.docs;
			var d = res.facet_counts.facet_fields.reference_genome; // now key-value pair

			var data = [];
			Object.keys(d).forEach(function(key){
				data.push({text: key + " (" + d[key] + ")", x: key, y: d[key]});
			});

			this.set('data', data);
		},

		render_chart: function(){

			if(!this.chart){

				this.DonutChart = declare(Pie, {
					render: function(dim, offsets){
						this.inherited(arguments);

						var rx = (dim.width - offsets.l - offsets.r) / 2,
							ry = (dim.height - offsets.t - offsets.b) / 2,
							r = Math.min(rx, ry) / 2;
						var circle = {
							cx: offsets.l + rx,
							cy: offsets.t + ry,
							r: "30px"
						};
						var s = this.group;

						s.createCircle(circle).setFill("#fff").setStroke("#fff");
					}
				});

				this.chart = new Chart2D(this.chartNode)
					.setTheme(Theme)
					.addPlot("default", {
						type: this.DonutChart,
						radius: 70,
						stroke: "black",
						label: true,
						labelStyle: "columns"
					});

				this.chart.addSeries('x', this.data);
				this.chart.render();
			}else{

				this.chart.updateSeries('x', this.data);
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