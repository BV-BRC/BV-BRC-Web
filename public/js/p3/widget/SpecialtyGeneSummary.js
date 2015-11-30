define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "./SummaryWidget",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "dojox/charting/themes/WatersEdge", "dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct","../util/PathJoin","dojo/fx/easing"

], function(declare, WidgetBase, on,
			domClass, SummaryWidget,
			xhr, lang, Chart2D, Theme, MoveSlice,
			ChartTooltip, domConstruct,PathJoin,easing) {
	return declare([SummaryWidget], {
			dataModel: "sp_gene",
			query: "",
			baseQuery: "&limit(1)&facet((field,source),(mincount,1))",
			columns: [
				{label: " ", field: "text", renderCell: function(obj,val,node){ node.innerHTML= ""}},
				{label: "Source", field: "text"},
				{label: "Genes", field: "y"}
			],
			processData: function(res){
				this._chartLabels=[];
				console.log("Data: ", res)
				if (!res || !res.facet_counts || !res.facet_counts.facet_fields || !res.facet_counts.facet_fields.source) { console.log("INVALID SUMMARY DATA"); return; }
				var d = res.facet_counts.facet_fields.source;
				var data = []
				var idx=0;
				for (var i=0;i<d.length;i+=2){
					data.push({text: d[i],x:idx, y: d[i+1]})
					this._chartLabels.push({value: idx,text: d[i]})
					idx++;
				}

				this._tableData = data;

				this.set('data', data);
			},

			render_chart: function(){
				console.log("RENDER CHART")
				if(!this.chart){
					this.chart = new Chart2D(this.chartNode);
					this.chart.setTheme(Theme);

					this.chart.addPlot("default", {
						type: "Columns",
						markers: true,
						gap: 5,
						labels: true,
						labelStyle: "outside",
						animate: { duration: 1000, easing: easing.linear} 
					});
					
					this.chart.addAxis("x", {
						majorLabels: true,
						minorTicks: false,
						minorLabels: true,
						microTicks: false,
						labels: this._chartLabels

					});

					this.chart.addAxis("y", { vertical: true, majorTicketStep: 4, title: "Gene Count"});

					new ChartTooltip(this.chart, "default", {
						text: function(o){
							console.log("O: ", o)
							var d = o.run.data[o.index];
							return d.text + " (" + d.y + ")"
						}
					});

					this.chart.addSeries("source",this.data);

					console.log("Render GF DATA", this.chart);
					this.chart.render();
				}else{

					this.chart.updateSeries("source",this.data);
					this.chart.render();
				}
			},

			render_table: function(){
				this.inherited(arguments);
				console.log("RenderArray: ", this._tableData);
				this.grid.refresh();
				this.grid.renderArray(this._tableData);
			}

	})
});