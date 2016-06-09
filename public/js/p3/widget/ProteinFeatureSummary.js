define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dojo/promise/all", "dojo/when",
	"dojo/dom-class", "./SummaryWidget",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "dojox/charting/themes/WatersEdge", "dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct", "../util/PathJoin", "dojo/fx/easing"

], function(declare, WidgetBase, on, All, when,
			domClass, SummaryWidget,
			xhr, lang, Chart2D, Theme, MoveSlice,
			ChartTooltip, domConstruct, PathJoin, easing){
	var LOG10 = Math.log(10);

	var labels = ["Hypothetical proteins", "Proteins with functional assignments","Proteins with EC number assignments", "Proteins with GO assignments", "Proteins with Pathway assignments", "Proteins with PATRIC genus-specific family (PLfam) assignments", "Proteins with PATRIC cross-genus family (PGfam) assignments", "Proteins with FIGfam assignments"];

	return declare([SummaryWidget], {
		id: "GO_PFSummary",
		dataModel: "genome_feature",
		query: "",
		baseQuery: "&in(annotation,(PATRIC,RefSeq))&limit(1)&facet((field,annotation),(mincount,1))",
		columns: [{
			label: " ",
			field: "label"
		}, {
			label: "PATRIC",
			field: "PATRIC",
			renderCell: function(obj, val, node){
				node.innerHTML = obj.PATRIC ? ('<a href="#view_tab=features&filter=and(eq(feature_type,' + obj.feature_type + '),eq(annotation,PATRIC))">' + obj.PATRIC + "</a>") : "0"
			}
		}, {
			label: "RefSeq",
			field: "RefSeq",
			renderCell: function(obj, val, node){
				node.innerHTML = obj.RefSeq ? ('<a href="#view_tab=features&filter=and(eq(feature_type,' + obj.feature_type + '),eq(annotation,RefSeq))">' + obj.RefSeq + "</a>") : "0"
			}
		}],
		onSetQuery: function(attr, oldVal, query){

			// return xhr.post(PathJoin(this.apiServiceUrl, this.dataModel) + "/", {
			// 	handleAs: "json",
			// 	headers: this.headers,
			// 	data: this.query + this.baseQuery
			// }).then(lang.hitch(this, "processData"));

			var url = PathJoin(this.apiServiceUrl, this.dataModel) + "/";

			var defHypothetical = when(xhr.post(url, {
				handleAs: "json",
				headers: this.headers,
				data: this.query + "&and(eq(product,hypothetical+protein),eq(feature_type,CDS))" + this.baseQuery
			}), function(response){
				return response.facet_counts.facet_fields.annotation;
			});

			var defFunctional = when(xhr.post(url, {
				handleAs: "json",
				headers: this.headers,
				data: this.query + "&and(ne(product,hypothetical+protein),eq(feature_type,CDS))" + this.baseQuery
			}), function(response){
				return response.facet_counts.facet_fields.annotation;
			});

			var defECAssigned = when(xhr.post(url, {
				handleAs: "json",
				headers: this.headers,
				data: this.query + "&eq(ec,*)" + this.baseQuery
			}), function(response){
				return response.facet_counts.facet_fields.annotation;
			});

			var defGOAssigned = when(xhr.post(url, {
				handleAs: "json",
				headers: this.headers,
				data: this.query + "&eq(go,*)" + this.baseQuery
			}), function(response){
				return response.facet_counts.facet_fields.annotation;
			});

			var defPathwayAssigned = when(xhr.post(url, {
				handleAs: "json",
				headers: this.headers,
				data: this.query + "&eq(pathway,*)" + this.baseQuery
			}), function(response){
				return response.facet_counts.facet_fields.annotation;
			});

			var defPLfamAssigned = when(xhr.post(url, {
				handleAs: "json",
				headers: this.headers,
				data: this.query + "&eq(go,*)" + this.baseQuery
			}), function(response){
				return response.facet_counts.facet_fields.annotation;
			});

			var defPGfamAssigned = when(xhr.post(url, {
				handleAs: "json",
				headers: this.headers,
				data: this.query + "&eq(go,*)" + this.baseQuery
			}), function(response){
				return response.facet_counts.facet_fields.annotation;
			});

			var defFigfamAssigned = when(xhr.post(url, {
				handleAs: "json",
				headers: this.headers,
				data: this.query + "&eq(figfam_id,*)" + this.baseQuery
			}), function(response){
				return response.facet_counts.facet_fields.annotation;
			});

			return when(All([defHypothetical, defFunctional, defECAssigned, defGOAssigned, defPathwayAssigned, defPLfamAssigned, defPGfamAssigned, defFigfamAssigned]), lang.hitch(this, "processData"));
		},
		processData: function(results){
			// console.warn(results);

			// this._chartLabels = [];

			var data = results.map(function(row, idx){
				var item = {"label": labels[idx]};
				item[row[0]] = row[1];
				item[row[2]] = row[3];

				return item;
			});

			this._tableData = data;

			this.set('data', data);
		},

		render_chart: function(){
			// console.log("RENDER CHART")
			if(!this.chart){
				this.chart = new Chart2D(this.chartNode);
				this.chart.setTheme(Theme);

				this.chart.addPlot("default", {
					type: "Columns",
					markers: true,
					gap: 3,
					labels: true,
					// minBarSize: 5,
					labelStyle: "inside",
					//labelOffset: 20,
					// labelFunc: function(o){
					// 	return o.annotation;
					// },
					animate: {duration: 1000, easing: easing.linear}
				});

				this.chart.addAxis("x", {
					title: "Annotation",
					majorLabels: true,
					minorTicks: true,
					minorLabels: false,
					microTicks: false
				});

				this.chart.addAxis("y", {
					title: "",
					vertical: true,
					majorLabels: true,
					minorTicks: true,
					minorLabels: true,
					microTicks: true,
					natural: true,
					includeZero: true,
					labels: labels
				});

				// new ChartTooltip(this.chart, "default", {
				// 	text: function(o){
				// 		console.log("O: ", o);
				// 		var d = o.run.data[o.index];
				// 		return d.annotation + " " + d.text + "s (" + d.count + ")"
				// 	}
				// });

				console.log("Data to Render: ", this.data);

				Object.keys(this.data).forEach(lang.hitch(this, function(key){
					this.chart.addSeries(key, this.data[key]);
				}));

				// console.log("Render GF DATA", this.chart);
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
			// console.log("RenderArray: ", this._tableData);
			this.grid.refresh();
			this.grid.renderArray(this._tableData);
		}

	})
});