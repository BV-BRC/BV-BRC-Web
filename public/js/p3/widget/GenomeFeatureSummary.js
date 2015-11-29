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
			dataModel: "genome_feature",
			query: "",
			baseQuery: "&limit(1)&facet((pivot,(annotation,feature_type)),(mincount,0))",
			columns: [
				{label: " ", field: "feature_type", renderCell: function(obj,val,node){ node.innerHTML= '<a href="#view_tab=features&filter=eq(feature_type,' + obj.feature_type + ')">' + obj.feature_type + "</a>"}},
				{label: "PATRIC", field: "PATRIC", renderCell: function(obj,val,node){ node.innerHTML=obj.PATRIC?('<a href="#view_tab=features&filter=and(eq(feature_type,' + obj.feature_type + '),eq(annotation,PATRIC))">' + obj.PATRIC + "</a>"):"0"}},
				{label: "RefSeq", field: "RefSeq", renderCell: function(obj,val,node){ node.innerHTML= obj.RefSeq?('<a href="#view_tab=features&filter=and(eq(feature_type,' + obj.feature_type + '),eq(annotation,RefSeq))">' + obj.RefSeq + "</a>"):"0"}}
			],
			processData: function(data){
				console.log("FACET PIVOTS: ",data.facet_counts.facet_pivot['annotation,feature_type'] )

				if (!data || !data.facet_counts || !data.facet_counts.facet_pivot || !data.facet_counts.facet_pivot['annotation,feature_type']) {console.log("INVALID SUMMARY DATA", data); return; }
				data = data.facet_counts.facet_pivot['annotation,feature_type']
				var gfData = {}
				this._chartLabels = []
				var byFeature={}

				var values={}
				console.log("SummarY: ", data)
		
				data.forEach(function(summary){
					summary.pivot.forEach(function(pv,idx){
						values[pv.value]=true;
						byFeature[pv.value]={feature_type: pv.value};
					});
				});

				var values = Object.keys(values);

				values.forEach(function(val,idx){
					this._chartLabels.push({text: val, value: idx})
				},this)

				data.forEach(function(summary){
					if (!gfData[summary.value]){ gfData[summary.value]=[]}

					values.forEach(function(val,idx){
						if (!summary.pivot.some(function(pv){
							if (pv.value==val){
								gfData[summary.value].push({text: pv.value, x:idx, y: pv.count, annotation: summary.value})
								byFeature[pv.value][summary.value]=pv.count
								return true;
							}
							return false;
						})){
							gfData[summary.value].push({text: val, y: 0, x: idx, annotation: summary.value});
						}
					})
				});

				this._tableData = Object.keys(byFeature).map(function(f){  return byFeature[f]; })

				this.set('data', gfData);
			},

			render_chart: function(){
				console.log("RENDER CHART")
				if(!this.chart){
					this.chart = new Chart2D(this.chartNode);
					this.chart.setTheme(Theme);

					this.chart.addPlot("default", {
						type: "ClusteredColumns",
						markers: true,
						gap: 5,
						labels: true,
						labelStyle: "inside",
						//labelOffset: 20,
						labelFunc: function(o){
							return o.annotation;
						},
						animate: { duration: 1000, easing: easing.linear} 
					});
					
					this.chart.addAxis("x", {
						majorLabels: true,
						minorTicks: false,
						minorLabels: true,
						microTicks: false,
						labels: this._chartLabels

					});

					this.chart.addAxis("y", { vertical: true, majorTicketStep: 4, title: "Feature Count"});

					new ChartTooltip(this.chart, "default", {
						text: function(o){
							console.log("O: ", o)
							var d = o.run.data[o.index];
							return d.annotation + " " + d.text + "s (" + d.y + ")"
						}
					});

					console.log("Data to Render: ",this.data)

					Object.keys(this.data).forEach(lang.hitch(this,function(key){
						this.chart.addSeries(key,this.data[key]);
					}));

					console.log("Render GF DATA", this.chart);
					this.chart.render();
				}else{

					Object.keys(this.data).forEach(lang.hitch(this,function(key){
						this.chart.updateSeries(key,this.data[key]);
					}));
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