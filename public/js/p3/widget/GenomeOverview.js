define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_Templated", "dojo/text!./templates/GenomeOverview.html",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "dojox/charting/themes/ThreeD", "dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct"

], function (declare, WidgetBase, on,
			 domClass, Templated, Template,
			 xhr, lang, Chart2D, Theme, MoveSlice,
			 ChartTooltip, domConstruct) {
	return declare([WidgetBase, Templated], {
		baseClass: "GenomeOverview",
		disabled: false,
		templateString: Template,
		apiServiceUrl: window.App.dataAPI,
		genome: null,
		genomeFeatureSummary: null,
		"_setGenomeAttr": function (genome) {
			this.genome = genome;
			console.log("Set Genome", genome);

			this.getSummaryData();

			if(this._started){
				this.refresh();
			}
		},
		"_setGenomeFeatureSummaryAttr": function (summary) {
			domConstruct.empty(this.gfDataNode);
			var table = domConstruct.create("table", {}, this.gfDataNode);
			var tbody = domConstruct.create("tbody", {}, table);

			var htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("td", {}, htr);
			domConstruct.create("td", {innerHTML: "PATRIC"}, htr);
			domConstruct.create("td", {innerHTML: "RefSeq"}, htr);

			Object.keys(summary).forEach(function (prop) {
				var tr = domConstruct.create('tr', {}, tbody);
				domConstruct.create("td", {innerHTML: prop}, tr);
				domConstruct.create("td", {innerHTML: summary[prop]}, tr);
				domConstruct.create("td", {innerHTML: 0}, tr);
			});

			/*
			 if (!this.gfPieChart) {
			 this.gfPieChart = new Chart2D(this.gfPieChartNode);
			 this.gfPieChart.setTheme(Theme);

			 this.gfPieChart.addPlot("default", {
			 type: "Columns",
			 radius: 75,
			 labels: true,
			 labelOffset: -30
			 });
			 this.gfPieChart.addSeries("default", gfData);
			 new MoveSlice(this.gfPieChart,"default");
			 new ChartTooltip(this.gfPieChart,"default");
			 }

			 this.gfPieChart.render();
			 */
		},

		"_setProteinFeatureSummaryAttr": function (summary) {
			var gfData = [];
			Object.keys(summary).forEach(function (prop) {
				gfData.push({text: prop, x: 0, y: summary[prop]});
			});
			console.log("GF DATA: ", gfData);

			if(!this.pfPieChart){
				this.pfPieChart = new Chart2D(this.pfPieChartNode);
				this.pfPieChart.setTheme(Theme);

				this.pfPieChart.addPlot("default", {
					type: "Pie",
					radius: 75,
					labels: true,
					labelOffset: -30
				});
				this.pfPieChart.addSeries("default", gfData);
				new MoveSlice(this.pfPieChart, "default");
				new ChartTooltip(this.pfPieChart, "default");
			}

			this.pfPieChart.render();
		},
		"_setSpecialtyGeneSummaryAttr": function (summary) {
			domConstruct.empty(this.sgDataNode);
			var table = domConstruct.create("table", {}, this.sgDataNode);
			var tbody = domConstruct.create("tbody", {}, table);

			var htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("td", {}, htr);
			domConstruct.create("td", {innerHTML: "Source"}, htr);
			domConstruct.create("td", {innerHTML: "Genes"}, htr);

			Object.keys(summary).forEach(function (prop) {
				var tr = domConstruct.create('tr', {}, tbody);
				var property_source = prop.split(':');
				domConstruct.create("td", {innerHTML: property_source[0]}, tr);
				domConstruct.create("td", {innerHTML: property_source[1]}, tr);
				domConstruct.create("td", {innerHTML: summary[prop]}, tr);
			});
		},

		getSummaryData: function () {
			// getting genome feature summary
			xhr.get(this.apiServiceUrl + "/genome_feature/?eq(genome_id," + this.genome.genome_id + ")&limit(1)&facet((field,feature_type),(mincount,1))&http_accept=application/solr+json", {
				handleAs: "json",
				headers: {"accept": "application/solr+json"}
			}).then(lang.hitch(this, function (data) {
				console.log("Data: ", data);
				var genomeSummary = {};
				var idx = 0;
				while(idx < data.facet_counts.facet_fields.feature_type.length - 1){
					genomeSummary[data.facet_counts.facet_fields.feature_type[idx]] = data.facet_counts.facet_fields.feature_type[idx + 1];
					idx += 2;
				}
				console.log("Genome Summary: ", genomeSummary);
				this.set("genomeFeatureSummary", genomeSummary);
			}));

			xhr.get(this.apiServiceUrl + "/sp_gene/?eq(genome_id," + this.genome.genome_id + ")&limit(1)&facet((field,property_source),(mincount,1),(sort,index))&http_accept=application/solr+json", {
				handleAs: "json",
				headers: {"accept": "application/solr+json"}
			})
				.then(lang.hitch(this, function (data) {
					console.log("Data: ", data);
					var spSummary = {};
					var idx = 0;
					while(idx < data.facet_counts.facet_fields.property_source.length - 1){
						spSummary[data.facet_counts.facet_fields.property_source[idx]] = data.facet_counts.facet_fields.property_source[idx + 1];
						idx += 2;
					}
					console.log("Specialty Gene Summary: ", spSummary);
					this.set("specialtyGeneSummary", spSummary);
				}));

		},
		refresh: function () {
			if(this.genome && this.genome.genome_id){
				Object.keys(this.genome).forEach(lang.hitch(this, function (prop) {
					if(this[prop + "Node"]){
						this[prop + "Node"].innerHTML = this.genome[prop];
					}
				}));

				this.genomeSummary.innerHTML = "Length: " + this.genome.genome_length + "bp, Chromosomes: " + this.genome.chromosomes + ", Plasmids: " + this.genome.plasmids + ", Contigs: " + this.genome.contigs;
			}else{
				console.log("Invalid Genome: ", this.genome);
			}
		},
		startup: function () {
			if(this._started){
				return;
			}
			this.inherited(arguments);
			this.refresh();
		}

	});
});
