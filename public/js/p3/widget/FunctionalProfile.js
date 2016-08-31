define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom-class", "dojo/dom-construct", "dojo/on", "dojo/request",
	"./SummaryWidget", "../util/PathJoin", "./D3HorizontalBarChart"

], function(declare, lang,
			domClass, domConstruct, on, xhr,
			SummaryWidget, PathJoin, D3HorizontalBarChart){

	return declare([SummaryWidget], {
		dataModel: "genome_feature",
		query: "",
		baseQuery: "&limit(1)&facet((field,product),(mincount,1),(sort,count),(limit,10))&json(nl,map)",
		columns: [
			{label: "Function", field: "label"},
			{
				label: "Genes", field: "count"
			}
		],
		processData: function(res){

			if(!res || !res.facet_counts || !res.facet_counts.facet_fields || !res.facet_counts.facet_fields.product){
				console.error("INVALID SUMMARY DATA");
				return;
			}

			var self = this;
			var d = res.facet_counts.facet_fields.product; // now key-value pair
			var data = Object.keys(d).map(function(key){
				return {label:key, count: d[key]}
			});

			self.set('data', data);
		},

		postCreate: function(){
			this.inherited(arguments);

			on(window, "resize", lang.hitch(this, "resize"));
		},
		resize: function(){
			if(this.chart){
				this.chart.resize();
			}
			this.inherited(arguments);
		},

		render_chart: function(){

			if(!this.chart){
				this.chart = new D3HorizontalBarChart();
				this.chart.init(this.chartNode, "fnProfile");
				this.chart.render(this.data);
			}else{

				this.chart.update(this.data);
			}
		},

		render_table: function(){
			this.inherited(arguments);

			this.grid.refresh();
			this.grid.renderArray(this.data);
			this.grid.sort([{attribute: "count", descending: true}]);
		}
	})
});