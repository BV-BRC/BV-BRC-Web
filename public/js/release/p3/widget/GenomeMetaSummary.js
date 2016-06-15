define("p3/widget/GenomeMetaSummary", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dojo/promise/all", "dojo/when",
	"dojo/dom-class", "./SummaryWidget", "dijit/layout/ContentPane",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "./PATRICTheme", "dojox/charting/action2d/MoveSlice", "dojox/charting/plot2d/Pie",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct", "../util/PathJoin", "dojo/fx/easing"

], function(declare, WidgetBase, on, All, when,
			domClass, SummaryWidget, ContentPane,
			xhr, lang, Chart2D, Theme, MoveSlice, Pie,
			ChartTooltip, domConstruct, PathJoin, easing){

	var categoryName = {"host_name": "Host Name", "disease": "Disease", "reference_genome": "Reference Genome", "genome_status": "Genome Status", "isolation_country": "Isolation Country"};

	return declare([SummaryWidget], {
		dataModel: "genome",
		query: "",
		baseQuery: "&limit(1)&json(nl,map)",
		columns: [{
			label: "Metadata Category",
			field: "category",
			renderCell: function(obj, val, node){
				node.innerHTML = categoryName[val];
			}
		}, {
			label: "",
			field: "value",
			renderCell: function(obj, val, node){
				node.innerHTML = val.map(function(d){
					return '<a href="#view_tab=genomes&filter=eq(' + obj.category + ',' + encodeURIComponent(d.split('(')[0]) + ')">' + d + '</a>';
				}).join("<br/>")
			}
		}],
		onSetQuery: function(attr, oldVal, query){

			var url = PathJoin(this.apiServiceUrl, this.dataModel) + "/";

			var defMetadata = when(xhr.post(url, {
				handleAs: "json",
				headers: this.headers,
				data: this.query + "&facet((field,host_name),(field,disease),(field,reference_genome),(field,genome_status),(field,isolation_country),(mincount,1),(limit,5))" + this.baseQuery
			}), function(response){
				return response.facet_counts.facet_fields;
			});

			// var defCompletion = when(xhr.post(url, {
			// 	handleAs: "json",
			// 	headers: this.headers,
			// 	data: this.query + "&facet((field,disease),(mincount,1),(limit,5))" + this.baseQuery
			// }), function(response){
			// 	return response.facet_counts.facet_ranges;
			// });

			return when(All([defMetadata]), lang.hitch(this, "processData"));
		},
		processData: function(results){

			this._tableData = Object.keys(results[0]).map(function(cat){
				var values = Object.keys(results[0][cat]).map(function(d){
					return d + "(" + results[0][cat][d] + ")";
				});
				return {category: cat, value: values}
			});
			// console.log(this._tableData);

			var data = {};
			Object.keys(results[0]).forEach(function(key){
				var m = results[0][key];
				data[key] = Object.keys(m).map(function(val){
					return {text: val, tooltip: val + " (" + m[val] + ")", x: val, y: m[val]};
				})
			});

			this.set('data', data);
		},

		render_chart: function(){

			if(!this.DonutChart){
				this.DonutChart = declare(Pie, {
					render: function(dim, offsets){
						this.inherited(arguments);

						var rx = (dim.width - offsets.l - offsets.r) / 2,
							ry = (dim.height - offsets.t - offsets.b) / 2,
							r = Math.min(rx, ry) / 2;
						var circle = {
							cx: offsets.l + rx,
							cy: offsets.t + ry,
							r: "20px"
						};
						var s = this.group;

						s.createCircle(circle).setFill("#fff").setStroke("#fff");
					}
				})
			}

			if(!this.host_chart){
				var cpHostNode = domConstruct.create("div", {class: "pie-chart-widget"});
				domConstruct.place(cpHostNode, this.chartNode, "last");

				this.host_chart = new Chart2D(cpHostNode, {
					title: "Host Name",
					titlePos: "bottom"
				})
					.setTheme(Theme)
					.addPlot("default", {
						type: this.DonutChart,
						radius: 70,
						stroke: "black",
						labelStyle: "columns"
					});
				new MoveSlice(this.host_chart, "default");
				new ChartTooltip(this.host_chart, "default");

				var cpDiseaseNode = domConstruct.create("div", {class: "pie-chart-widget"});
				domConstruct.place(cpDiseaseNode, this.chartNode, "last");

				this.disease_chart = new Chart2D(cpDiseaseNode, {
					title: "Disease",
					titlePos: "bottom"
				})
					.setTheme(Theme)
					.addPlot("default", {
						type: this.DonutChart,
						radius: 70,
						stroke: "black",
						labelStyle: "columns"
					});
				new MoveSlice(this.disease_chart, "default");
				new ChartTooltip(this.disease_chart, "default");

				var cpIsolationCountry = domConstruct.create("div", {class: "pie-chart-widget"});
				domConstruct.place(cpIsolationCountry, this.chartNode, "last");
				this.isolation_country_chart = new Chart2D(cpIsolationCountry, {
					title: "Isolation Country",
					titlePos: "bottom"
				})
					.setTheme(Theme)
					.addPlot("default", {
						type: this.DonutChart,
						radius: 70,
						stroke: "black",
						labelStyle: "columns"
					});
				new MoveSlice(this.isolation_country_chart, "default");
				new ChartTooltip(this.isolation_country_chart, "default");

				var cpGenomeStatus = domConstruct.create("div", {class: "pie-chart-widget"});
				domConstruct.place(cpGenomeStatus, this.chartNode, "last");
				this.genome_status_chart = new Chart2D(cpGenomeStatus, {
					title: "Genome Status",
					titlePos: "bottom"
				})
					.setTheme(Theme)
					.addPlot("default", {
						type: this.DonutChart,
						radius: 70,
						stroke: "black",
						labelStyle: "columns"
					});
				new MoveSlice(this.genome_status_chart, "default");
				new ChartTooltip(this.genome_status_chart, "default");

				Object.keys(this.data).forEach(lang.hitch(this, function(key){
					switch(key){
						case "host_name":
							this.host_chart.addSeries(key, this.data[key]);
							this.host_chart.render();
							break;
						case "disease":
							this.disease_chart.addSeries(key, this.data[key]);
							this.disease_chart.render();
							break;
						case "isolation_country":
							this.isolation_country_chart.addSeries(key, this.data[key]);
							this.isolation_country_chart.render();
							break;
						case "genome_status":
							this.genome_status_chart.addSeries(key, this.data[key]);
							this.genome_status_chart.render();
							break;
						default:
							break;
					}
				}));

			}else{

				Object.keys(this.data).forEach(lang.hitch(this, function(key){
					switch(key){
						case "host_name":
							this.host_chart.addSeries(key, this.data[key]);
							this.host_chart.render();
							break;
						case "disease":
							this.disease_chart.addSeries(key, this.data[key]);
							this.disease_chart.render();
							break;
						case "isolation_country":
							this.isolation_country_chart.addSeries(key, this.data[key]);
							this.isolation_country_chart.render();
							break;
						case "genome_status":
							this.genome_status_chart.addSeries(key, this.data[key]);
							this.genome_status_chart.render();
							break;
						default:
							break;
					}
				}));

			}
		},

		render_table: function(){
			this.inherited(arguments);

			this.grid.refresh();
			this.grid.renderArray(this._tableData);
		}
	})
});