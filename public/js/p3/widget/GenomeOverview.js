define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_Templated", "dojo/text!./templates/GenomeOverview.html",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "dojox/charting/themes/ThreeD", "dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct"

], function(declare, WidgetBase, on,
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
		state: null,

		_setStateAttr: function(state){
			this._set("state", state);
			if (state.genome){
				this.set("genome", state.genome);
			}else{
				// console.log("Attempted to set genome without genome object in state");

			}
		},

		"_setGenomeAttr": function(genome) {
			this.genome = genome;
			// console.log("Set Genome", genome);
			this.createSummary(genome);
			this.getSummaryData();
		},
		"createSummary": function(genome) {

			domConstruct.empty(this.genomeSummaryNode);
			var table = domConstruct.create("table", {"class": "basic stripe far2x"}, this.genomeSummaryNode);
			var tbody = domConstruct.create("tbody", {}, table);

			var htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "Summary", colspan: 2, scope: "row", style: "width:30%"}, htr);
			domConstruct.create("td", {innerHTML: "Length: " + this.genome.genome_length + "bp, Chromosomes: " + this.genome.chromosomes + ", Plasmids: " + this.genome.plasmids + ", Contigs: " + this.genome.contigs}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "Organism Info", rowspan: 3, scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: "Genome ID"}, htr);
			domConstruct.create("td", {innerHTML: this.genome.genome_id}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("td", {innerHTML: "Genome Status"}, htr);
			domConstruct.create("td", {innerHTML: this.genome.genome_status}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("td", {innerHTML: "Antimicrobial Resistance"}, htr);
			domConstruct.create("td", {innerHTML: this.genome.antimicrobial_resistance || '&nbsp;'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "Isolation Info", rowspan: 2, scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: "Collection Date"}, htr);
			domConstruct.create("td", {innerHTML: this.genome.collection_date || '&nbsp;'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("td", {innerHTML: "Isolation Country"}, htr);
			domConstruct.create("td", {innerHTML: this.genome.isolation_country || '&nbsp;'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "Host Info", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: "Host Name"}, htr);
			domConstruct.create("td", {innerHTML: this.genome.host_name || '&nbsp;'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "Sequence Info", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: "Sequencing Status"}, htr);
			domConstruct.create("td", {innerHTML: this.genome.sequencing_status || '&nbsp;'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "Phenotype Info", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: "Disease"}, htr);
			domConstruct.create("td", {innerHTML: this.genome.disease || '&nbsp;'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "Project Info", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: "Completion Date"}, htr);
			domConstruct.create("td", {innerHTML: this.genome.completion_date || '&nbsp;'}, htr);
		},

		"_setProteinFeatureSummaryAttr": function(summary) {
			var gfData = [];
			Object.keys(summary).forEach(function(prop) {
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
		"_setSpecialtyGeneSummaryAttr": function(summary) {
			domConstruct.empty(this.specialtyGeneSummaryNode);
			var table = domConstruct.create("table", {"class": "basic stripe far2x"}, this.specialtyGeneSummaryNode);
			var tbody = domConstruct.create("tbody", {}, table);

			var htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("td", {}, htr);
			domConstruct.create("td", {innerHTML: "Source"}, htr);
			domConstruct.create("td", {innerHTML: "Genes"}, htr);

			Object.keys(summary).forEach(function(prop) {
				var tr = domConstruct.create('tr', {}, tbody);
				var property_source = prop.split(':');
				domConstruct.create("td", {innerHTML: property_source[0]}, tr);
				domConstruct.create("td", {innerHTML: property_source[1]}, tr);
				domConstruct.create("td", {innerHTML: summary[prop]}, tr);
			});
		},
		getSummaryData: function() {

			// specialty gene
			xhr.get(this.apiServiceUrl + "/sp_gene/?eq(genome_id," + this.genome.genome_id + ")&limit(1)&facet((field,property_source),(mincount,1),(sort,index))&http_accept=application/solr+json", {
				handleAs: "json",
				headers: {"accept": "application/solr+json"}
			}).then(lang.hitch(this, function(data) {
				var sgSummary = {};
				var idx = 0;
				while(idx < data.facet_counts.facet_fields.property_source.length - 1){
					sgSummary[data.facet_counts.facet_fields.property_source[idx]] = data.facet_counts.facet_fields.property_source[idx + 1];
					idx += 2;
				}
				//console.log("Specialty Gene Summary: ", sgSummary);
				this.set("specialtyGeneSummary", sgSummary);
			}));

		},

		startup: function() {
			if(this._started){
				return;
			}
			this.inherited(arguments);
		}
	});
});
