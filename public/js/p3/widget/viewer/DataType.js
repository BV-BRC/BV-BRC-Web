define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/when", "dojo/request", "dojo/string", "dojo/topic",
	"dojo/dom-construct", "dojo/query", "dojo/dom-class",
	"dijit/layout/ContentPane", "dijit/_WidgetBase", "dijit/_TemplatedMixin",
	"d3/d3",
	"./Base", "../../util/PathJoin"
], function(declare, lang, when, request, String, Topic,
			domConstruct, domQuery, domClass,
			ContentPane, WidgetBase, Templated,
			d3,
			ViewerBase, PathJoin){

	var attributeTemplate = [
		"<a class='left right-align-text attribute-line' href='{attr.link}'>",
		"<span class='highlight-e'>{attr.data}</span>",
		"</a>",
		"<span class='left small'>{attr.description}</span>",
		"<div class='clear'></div>"
	].join("\n");

	var tooltipLayer = d3.select("body").append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);

	return declare([ViewerBase], {

		onSetState: function(attr, oldVal, state){
			// console.log("DataType view onSetState", state);

			if(!state){
				return;
			}

			var parts = state.pathname.split("/");
			var dataType = parts[parts.length - 1];

			if(!dataType) return;

			this.dataType = dataType;

			when(request.get(PathJoin(this.apiServiceUrl, "content/dlp/", dataType), {
				handleAs: "html"
			}), lang.hitch(this, function(content){

				this.template = content;
				this.viewer.set('content', content);

				when(request.get(PathJoin(this.apiServiceUrl, "content/dlp/", dataType + ".json"),{
					handleAs: "json"

				}), lang.hitch(this, function(data){

					this.set(dataType, data);
				}));
			}));
		},

		_buildPopularGenomeList: function(popularList){

			var popularListUl = ["<ul class='no-decoration genome-list tab-headers third'>"];

			popularList.forEach(function(genome, idx){
				popularListUl.push(lang.replace("<li><a data-genome-href='{0}' class='genome-link' href='#genome-tab{1}'>{2}</a><div class='arrow'></div></li>", [genome.link, (idx + 1), genome.popularName]));
			});
			popularListUl.push("</ul>");

			return popularListUl;
		},

		_activatePopularGenomeListTab: function(){
			var links = domQuery(".data-box.popular-box .genome-link");
			links.forEach(function(link){

				link.addEventListener('click', function(evt){
					var link = evt.srcElement.dataset.genomeHref;
					// console.log(evt, link);
					Topic.publish('/navigate', {href: link});
				});
				link.addEventListener('mouseover', function(evt){
					// console.log(evt);
					var targetTab = evt.srcElement.hash;

					domQuery(".data-box.popular-box .genome-list li").forEach(function(l){
						domClass.remove(l, "ui-state-active");
					});
					domClass.add(evt.srcElement.parentElement, "ui-state-active");

					domQuery(".genome-data").forEach(function(panel){
						if("#" + panel.id == targetTab){
							domClass.remove(panel, "hidden");
						}else{
							domClass.add(panel, "hidden");
						}
					});
				});
			});
		},

		_setAntibioticResistanceAttr: function(data){

			var popularList = data['popularGenomes']['popularList'];

			var popularTabList = this._buildAntibioticResistancePopularPanel(popularList);
			var popularListUl = this._buildPopularGenomeList(popularList);

			var tabDiv = domQuery(".data-box.popular-box div.group")[0];

			var popularTabNode = domConstruct.toDom(popularTabList.join(""));
			var popularListNode = domConstruct.toDom(popularListUl.join(""));

			domConstruct.place(popularTabNode, tabDiv);
			domConstruct.place(popularListNode, tabDiv);

			this._activatePopularGenomeListTab();
		},
		_buildAntibioticResistancePopularPanel: function(popularList){

			var template = [
				"<div class='genome-data right half group no-decoration hidden' id='genome-tab{0}'>",
				"<div class='far2x'>",
					"<div class='left left-align-text'>",
					"<h3>Antibiotic Resistance Genes:</h3>",
					"{1}",
					"</div>",
					"<div class='clear'></div>",
				"</div>",
				"<h3>Explore Genomic Features in </h3>",
					"<div class='three-quarter'>{2}</div>",
				"</div>"
			].join("\n");

			return popularList.map(function(genome, idx){

				var specialtyGenes = genome.specialtyGenes.map(function(spg){
					return lang.replace(attributeTemplate, {attr: spg});
				}).join("\n");

				var links = genome.links.map(function(link, i){

					if(i%2){ // odd
						return lang.replace("<a class='right' href='{0}'>{1}</a><br/>", [link.link, link.name]);
					}else{
						return lang.replace("<a class='left' href='{0}'>{1}</a>", [link.link, link.name]);
					}
				}).join("\n");

				return lang.replace(template, [(idx+1), specialtyGenes, links]);
			});
		},

		_setGenomicFeaturesAttr: function(data){

			var popularList = data['popularGenomes']['popularList'];

			var popularTabList = this._buildFeaturesPopularPanel(popularList);
			var popularListUl = this._buildPopularGenomeList(popularList);

			var tabDiv = domQuery(".data-box.popular-box div.group")[0];

			var popularTabNode = domConstruct.toDom(popularTabList.join(""));
			var popularListNode = domConstruct.toDom(popularListUl.join(""));

			domConstruct.place(popularTabNode, tabDiv);
			domConstruct.place(popularListNode, tabDiv);

			this._activatePopularGenomeListTab();
		},
		_buildFeaturesPopularPanel: function(popularList){

			var template = [
				"<div class='genome-data right two-third group no-decoration hidden' id='genome-tab{0}' style='width:563px;'>",
					"<div class='far2x'>",
						"<div class='left'>",
							"<h3>Features:</h3>",
								"{1}",
						"</div>",
						"<div class='left left-align-text' style='margin:0 15px'>",
							"<h3>Proteins by Attributes:</h3>",
								"{2}",
						"</div>",
						"<div class='left left-align-text'>",
							"<h3>Specialty Genes:</h3>",
								"{3}",
						"</div>",
						"<div class='clear'></div>",
					"</div>",
					"<h3>Explore Genomic Features in </h3>",
						"<div class='three-quarter'>{4}</div>",
				"</div>"].join("\n");

			return popularList.map(function(genome, idx){

				var featureTypes = genome.featureTypes.map(function(type){
					return lang.replace(attributeTemplate, {attr: type});
				}).join("\n");
				var proteinSummary = genome.proteinSummary.map(function(protein){
					return lang.replace(attributeTemplate, {attr: protein});
				}).join("\n");
				var specialtyGenes = genome.specialtyGenes.map(function(gene){
					return lang.replace(attributeTemplate, {attr: gene});
				}).join("\n");

				var links = genome.links.map(function(link, i){
					if(i%2){ // odd
						return lang.replace("<a class='right'href='{0}'>{1}</a><br/>", [link.link, link.name]);
					}else{
						return lang.replace("<a class='left' href='{0}'>{1}</a>", [link.link, link.name]);
					}
				}).join("\n");

				return lang.replace(template, [(idx + 1), featureTypes, proteinSummary, specialtyGenes, links]);
			})
		},

		_setGenomesAttr: function(data){

			var popularList = data['popularGenomes']['popularList'];

			var popularTabList = this._buildGenomesPopularPanel(popularList);
			var popularListUl = this._buildPopularGenomeList(popularList);

			var tabDiv = domQuery(".data-box.popular-box div.group")[0];

			var popularTabNode = domConstruct.toDom(popularTabList.join(""));
			var popularListNode = domConstruct.toDom(popularListUl.join(""));

			domConstruct.place(popularTabNode, tabDiv);
			domConstruct.place(popularListNode, tabDiv);

			this._activatePopularGenomeListTab();
			// render genome_status chart
			this._renderGenomeStatusChart(data['genomeStatus']);
			// render genome_count chart
			this._renderGenomeNumbersChart(data['numberGenomes']);
			// render top5 charts
			this._renderGenomeTopChart('dlp-genomes-chart-tab1', data['top5_1']['data']);
			this._renderGenomeTopChart('dlp-genomes-chart-tab2', data['top5_2']['data']);
			// handle tabs
			var tabs = domQuery(".tabbed .tab-headers.inline li span");
			tabs.forEach(function(tab){
				tab.addEventListener('click', function(evt){

					// console.log(evt);
					var targetTab = evt.srcElement.dataset.href;

					domQuery(".tabbed .tab-headers.inline li").forEach(function(l){
						domClass.remove(l, "ui-state-active");
					});
					domClass.add(evt.srcElement.parentElement, "ui-state-active");

					["#dlp-genomes-chart-tab1", "#dlp-genomes-chart-tab2"].forEach(function(div){
						if(div == targetTab){
							domClass.remove(domQuery(div)[0], "hidden");
						}else{
							domClass.add(domQuery(div)[0], "hidden");
						}
					});
				})
			})
		},

		_buildGenomesPopularPanel: function(popularList){

			var template = ["<div class='genome-data right half group no-decoration hidden' id='genome-tab{0}'>",
					"{1}",
					"{2}",
				"<div class='clear'></div>",
				"<p><a class='double-arrow-link' href='{3}'>View This Genome in Genome Browser</a></p>",
				"</div>"].join("\n");

			var metadataTemplate = ["<table class='no-decoration basic far2x'>",
				"<tr>",
					"<th class='italic' width='25%' scope='row'>Genome Status: </th>",
					"<td width='25%'>&nbsp;{metadata.genome_status}</td>",
					"<th class='italic' width='25%' scope='row'>Isolation Country: </th>",
					"<td width='25%'>&nbsp;{metadata.isolation_country}</td>",
				"</tr>",
				"<tr>",
					"<th class='italic' scope='row'>Genomic Sequences: </th>",
					"<td>1 Chromosome</td>",
					"<th class='italic' scope='row'>Host Name: </th>",
					"<td>&nbsp;{metadata.host_name}</td>",
				"</tr>",
				"<tr>",
					"<th class='italic' scope='row'>Genome Length: </th>",
					"<td>&nbsp;{metadata.genome_length} bp</td>",
					"<th class='italic' scope='row'>Disease: </th>",
					"<td>&nbsp;{metadata.disease}</td>",
				"</tr>",
				"<tr>",
					"<th class='italic' scope='row'>Completion Date: </th>",
					"<td>&nbsp;{metadata.completion_date}</td>",
					"<th class='italic' scope='row'>Collection Date: </th>",
					"<td>&nbsp;{metadata.collection_date}</td>",
				"</tr>",
				"</table>"].join("\n");

			var dataTypeTemplate = ["<div class='column'>",
				"<a class='genome-data-item clear' href='{dataType.features.link}'>",
				"<div class='genome-data-icon feature left'></div>",
				"<h3 class='down2x close highlight-e'>{dataType.features.data}</h3>",
				"<p class='small'>Features</p>",
				"</a>",
				"<a class='genome-data-item clear' href='{dataType.experiments.link}'>",
				"<div class='genome-data-icon experiment left'></div>",
				"<h3 class='down2x close highlight-e'>{dataType.experiments.data}</h3>",
				"<p class='small'>Transcriptomic Experiments</p>",
				"</a>",
				"</div>",
				"<div class='column'>",
				"<a class='genome-data-item clear' href='{dataType.pathways.link}'>",
				"<div class='genome-data-icon pathway left'></div>",
				"<h3 class='down2x close highlight-e'>{dataType.pathways.data}</h3>",
				"<p class='small'>Pathways</p>",
				"</a>",
				"<a class='genome-data-item clear' href='{dataType.proteinfamily.link}'>",
				"<div class='genome-data-icon proteinfamily left'></div>",
				"<h3 class='down2x close highlight-e'>{dataType.proteinfamily.data}</h3>",
				"<p class='small'>Protein Families</p>",
				"</a>",
				"</div>"].join("\n");

			return popularList.map(function(genome, idx){

				var meta = lang.replace(metadataTemplate, genome);
				var dataType = lang.replace(dataTypeTemplate, genome);

				return lang.replace(template, [(idx + 1), meta, dataType, genome.gb_link]);
			})
		},

		_renderGenomeStatusChart: function(data){

			var chartCanvas = d3.select("#dlp-genomes-genomeStatus .chart")
				.append("div").attr("class", "chartContainer")
				.style("height", "272px")
				.append("div")
				.attr("class", "chartCanvas group").style("width", "100%");

			var dataset = data['data'];

			var x_scale = d3.scale.linear().range([0, 272]).domain([
				0, d3.sum(dataset, function(d, i) {
					return d.value;
				})
			]);
			var self = this;
			var chart = chartCanvas.selectAll("div").data(dataset).enter();

			chart.append("div").attr("class", function(d, i) {
				return "gsc_bar " + d['m_label'];
			}).style("height", function(d, i) {
				return x_scale(d.value) + "px";
			}).on("click", function(d) {
				var url;
				switch(d.label){
					case "Whole Genome Shotgun":
						url = "/view/Taxonomy/2#view_tab=genomes&filter=eq(genome_status,WGS)";
						break;
					case "Complete":
						url = "/view/Taxonomy/2#view_tab=genomes&filter=eq(genome_status,Complete)";
						break;
					default:
						url = "/view/Taxonomy/2#view_tab=genomes&filter=eq(genome_status,Plasmid)";
						break;
				}
				Topic.publish("/navigate", {href: url});
			}).on("mouseover", function(d) {
				tooltipLayer.transition()
					.duration(200)
					.style("opacity", .95);

				tooltipLayer.html(d.label)
					.style("left", d3.event.pageX + "px")
					.style("top", d3.event.pageY + "px");
			}).on("mouseout", function() {
				tooltipLayer.transition()
					.duration(500)
					.style("opacity", 0);
			});

			var bars = chartCanvas.selectAll(".gsc_bar").data(dataset);

			bars.append("span").attr("class", "value").text(function(d, i) {
				return d.reported;
			});

			bars.append("span").attr("class", "reportedLabel").text(function(d, i) {
				return d.label;
			});
		},

		_renderGenomeNumbersChart: function(data){

			var dataset = data['data'];

			var yearLables = [];
			dataset.forEach(function(d, i) {
				yearLables.push(d.year);
			});

			var chart = d3.select("#dlp-genomes-numberGenomes .chart")
				.insert("svg", ":first-child")
				.attr("class", "svgChartContainer")
				.attr("width", 288)
				.attr("height", 272);

			var canvas = chart.append("g")
				.attr("class", "svgChartCanvas")
				.attr("width", 232)
				.attr("height", 241)
				.attr("transform", "translate(50,6)");

			var drawTarget = {
				chart: chart,
				canvas: canvas,
				canvas_size: {
					height: 241,
					width: 232
				},
				margins: [6, 6, 25, 50]
			};

			var chartheight = drawTarget.canvas_size.height;
			var chartwidth = drawTarget.canvas_size.width;

			var maxGenomes = d3.max(dataset, function(d, i) {
				return d3.max([d.complete, d.wgs]);
			});

			var genome_scale = d3.scale.linear().domain([0, (maxGenomes+500)]).range([chartheight, 0]);
			var year_scale = d3.scale.ordinal().domain(yearLables).rangeBands([0, chartwidth]);

			var genome_axis = d3.svg.axis().scale(genome_scale).orient("left").tickSubdivide(1).tickSize(-chartwidth).tickPadding(15);
			var year_axis = d3.svg.axis().scale(year_scale).orient("bottom").tickSize(0).tickPadding(10).tickFormat(d3.format("d"));

			// add Background
			canvas.append("rect").attr("class", "chart-background")
				.attr("width", chartwidth + 4).attr("height", chartheight + 4).attr("transform", "translate(-2,-2)");

			canvas.append("g").attr("class", "y axis").call(genome_axis);
			canvas.append("g").attr("class", "x axis").call(year_axis);
			canvas.select(".x.axis").attr("transform", "translate(0," + chartheight + ")");

			var datagroups = canvas.selectAll("datapoints").data(dataset);

			offset = (year_scale.rangeBand())/2;
			var lineSeries1 = d3.svg.line().x(function(d, i) {
				//return year_scale(d.year);
				return year_scale.rangeBand() * i + offset;
			}).y(function(d) {
				return genome_scale(d.wgs);
			});

			var lineSeries2 = d3.svg.line().x(function(d, i) {
				//return year_scale(d.year);
				return year_scale.rangeBand() * i + offset;
			}).y(function(d) {
				return genome_scale(d.complete);
			});
			canvas.append("path").attr("d", lineSeries1(dataset)).attr("class", "total line");
			canvas.append("path").attr("d", lineSeries2(dataset)).attr("class", "sequenced line");

			// Now add the rectangles for each data point for both lines.
			datagroups.enter().append("g").attr("class", "datapoints");

			// WGS
			canvas.selectAll(".datapoints").data(dataset)
				.append("rect")
				.attr("class", "point-total").attr("x", function(d, i) {
				return year_scale.rangeBand() * i + offset - 3;
			}).attr("y", function(d, i) {
				return genome_scale(d.wgs) - 3;
			}).attr("width", "6")
			.attr("height", "6")
			.on("click", function(d, i) {
				var url = "/view/Taxonomy/2#view_tab=genomes&filter=and(eq(genome_status,WGS),lt(completion_date," + (d.year + 1) + "-01-01T00%3A00%3A00Z))";

				Topic.publish("/navigate", {href: url});
			}).on("mouseover", function(d, i, meta) {
				tooltipLayer.transition()
					.duration(200)
					.style("opacity", .95);

				tooltipLayer.html("WGS: " + d.wgs)
					.style("left", d3.event.pageX + "px")
					.style("top", d3.event.pageY + "px");
			}).on("mouseout", function(d, i) {
				tooltipLayer.transition()
					.duration(500)
					.style("opacity", 0);
			});

			// complete
			canvas.selectAll(".datapoints").data(dataset)
				.append("rect")
				.attr("class", "point-sequenced")
				.attr("x", function(d, i) {
					return year_scale.rangeBand() * i + offset - 3;
			}).attr("y", function(d, i) {
				return genome_scale(d.complete) - 3;
			}).attr("width", "6").attr("height", "6")
			.on("click", function(d, i) {
				var url = "/view/Taxonomy/2#view_tab=genomes&filter=and(eq(genome_status,Complete),lt(completion_date," + (d.year + 1) + "-01-01T00%3A00%3A00Z))";

				Topic.publish("/navigate", {href: url});
			}).on("mouseover", function(d, i) {
				tooltipLayer.transition()
					.duration(200)
					.style("opacity", .95);

				tooltipLayer.html("Complete: " + d.complete)
					.style("left", d3.event.pageX + "px")
					.style("top", d3.event.pageY + "px");
			}).on("mouseout", function(d, i) {
				tooltipLayer.transition()
					.duration(500)
					.style("opacity", 0);
			});
		},

		_renderGenomeTopChart: function(target, data){

			var breakstr = "M 0 6 L 6 0 L 12 6 L 18 0 L 24 6 L 30 0 L 36 6 L 42 0 L 48 6 L 54 0";
			breakstr += "L 54 28 L 48 22 L 42 28 L 36 22 L 30 28 L 24 22 L 18 28 L 12 22 L 6 28 L 0 22 Z";
			var chart = d3.select("#" + target + " .chart")
				.insert("svg", ":first-child")
				.attr("class", "svgChartContainer")
				.attr("width", 288)
				.attr("height", 232);

			var canvas = chart.append("g")
				.attr("class", "svgChartCanvas")
				.attr("width", 288)
				.attr("height", 266)
				.attr("transform", "translate(0,22)");

			var chartheight = 266; //this.drawtarget.canvas_size.height;
			var chartwidth = 288; //this.drawtarget.canvas_size.width;
			var upperBound = d3.max(data, function(d, i) {
				return d.reported || d.value;
			});
			var yScale = d3.scale.linear().range([0, chartheight]).domain([0, upperBound]);
			var xScale = d3.scale.linear().range([0, chartwidth]).domain([0, data.length]);
			var bars = canvas.selectAll("g.bar").data(data);
			bars.enter().append("g").attr("class", function(d, i) {
				return "bar " + d.m_label;
			});
			// add rect bar
			bars.append("rect").attr("class", function(d, i) {
				return "bar-" + i;
			}).attr("height", function(d, i) {
				var val;
				val = d.reported || d.value;
				return yScale(val);
			}).attr("width", Math.floor(xScale(.8))).attr("x", function(d, i) {
				return (i * xScale(1)) + xScale(.1);
			}).attr("y", function(d, i) {
				var val;
				val = d.reported || d.value;
				return chartheight - yScale(val);
			}).on("click", function(d, i) {
				var url = "/view/Taxonomy/2#view_tab=genomes&filter=";

				if(target === "dlp-genomes-chart-tab1"){
					url += "eq(host_name," + encodeURIComponent(d.label) + ")";
				}else{
					url += "eq(isolation_country," + encodeURIComponent(d.label) + ")";
				}
				Topic.publish("/navigate", {href: url});

			}).on("mouseover", function(d, i) {
				tooltipLayer.transition()
					.duration(200)
					.style("opacity", .95);

				tooltipLayer.html(d.label)
					.style("left", d3.event.pageX + "px")
					.style("top", d3.event.pageY + "px");
			}).on("mouseout", function(d, i) {
				tooltipLayer.transition()
					.duration(500)
					.style("opacity", 0);
			});
			// add text
			bars.append("text").attr("class", function(d, i) {
				return "label label-" + i;
			}).attr("x", function(d, i) {
				return (i * xScale(1)) + xScale(.5);
			}).attr("y", function(d, i) {
				var val;
				val = d.reported || d.value;
				return chartheight - yScale(val) - 6;
			}).attr("text-anchor", "middle").text(function(d) {
				return d.value;
			}).on("click", function(d, i) {
				var url = "/view/Taxonomy/2#view_tab=genomes&filter=";

				if(target === "dlp-genomes-chart-tab1"){
					url += "eq(host_name," + encodeURIComponent(d.label) + ")";
				}else{
					url += "eq(isolation_country," + encodeURIComponent(d.label) + ")";
				}
				Topic.publish("/navigate", {href: url});
			}).on("mouseover", function(d, i) {
				tooltipLayer.transition()
					.duration(200)
					.style("opacity", .95);

				tooltipLayer.html(d.label)
					.style("left", d3.event.pageX + "px")
					.style("top", d3.event.pageY + "px");
			}).on("mouseout", function(d, i) {
				tooltipLayer.transition()
					.duration(500)
					.style("opacity", 0);
			});
			// add icon
/*			bars.select(function(d) {
				if (d.icon != null) {
					return this;
				} else {
					return null;
				}
			}).append("image").attr("xlink:href", function(d) {
				return d.icon;
			}).attr("class", "icon").attr("preserveAspectRatio", "xMinYMax").attr("height", function(d, i) {
				var val;
				val = d.reported || d.value;
				return yScale(val);
			}).attr("width", Math.floor(xScale(.7))).attr("x", function(d, i) {
				//return (i * xScale(1)) + xScale(.1);
				return (i * xScale(1)) + xScale(.1) + 3;
			}).attr("y", function(d, i) {
				var val;
				val = d.reported || d.value;
				//return chartheight - yScale(val);
				return chartheight - yScale(val) + 3;
			}).on("click", function(d, i) {
				var meta;
				meta = {
					"clickTarget": this,
					"chartTarget": self.p.target
				};
				if (self.p.clickHandler != null) {
					return self.p.clickHandler(d, i, meta);
				}
			}).on("mouseover", function(d, i) {
				var meta;
				meta = {
					"clickTarget": this,
					"chartTarget": self.p.target
				};
				if (self.p.mouseoverHandler != null) {
					return self.p.mouseoverHandler(d, i, meta);
				}
			}).on("mouseout", function(d, i) {
				var meta;
				meta = {
					"clickTarget": this,
					"chartTarget": self.p.target
				};
				if (self.p.mouseoutHandler != null) {
					return self.p.mouseoutHandler(d, i, meta);
				}
			});*/
			// add sawtooth
			bars.select(function(d) {
				if ((d.reported != null) && d.reported !== d.value) {
					return this;
				} else {
					return null;
				}
			}).append("path").attr("d", breakstr).attr("class", "sawtooth").attr("transform", function(d, i) {
				var scaleFactor, xpos, ypos;
				xpos = (i * xScale(1)) + xScale(.1);
				ypos = chartheight - yScale(d.reported / 2) - 14;
				scaleFactor = xScale(.8) / 54;
				return "translate(" + xpos + "," + ypos + ") scale(" + scaleFactor + ")";
			});
		},

		_setPathwaysAttr: function(data){

			var popularList = data['popularGenomes']['popularList'];

			var popularTabList = this._buildPathwaysPopularPanel(popularList);
			var popularListUl = this._buildPopularGenomeList(popularList);

			var tabDiv = domQuery(".data-box.popular-box div.group")[0];

			var popularTabNode = domConstruct.toDom(popularTabList.join(""));
			var popularListNode = domConstruct.toDom(popularListUl.join(""));

			domConstruct.place(popularTabNode, tabDiv);
			domConstruct.place(popularListNode, tabDiv);

			this._activatePopularGenomeListTab();
		},

		_buildPathwaysPopularPanel: function(popularList){

			var template = [
				"<div class='genome-data right half group no-decoration hidden' id='genome-tab{0}'>",
					"<div class='far'>",
					"<h3>Summary of Top 10 Pathways:</h3>",
					"<table class='basic no-decoration far2x'>",
					"<tr>",
						"<th scope='column'>EC numbers</th>",
						"<th scope='column'>Genes</th>",
						"<th scope='column'>Pathway Name</th>",
					"</tr>",
					"{1}",
					"</table>",
					"<a class='double-arrow-link' href='{2}'>View All Pathways in This Genome</a>",
					"</div>",
				"</div>"
			].join("\n");

			var pathwayTableTemplate = [
				"<tr>",
					"<td class='center-text'><a href='{p.ec_link}'>{p.ec_count}</a></td>",
					"<td class='center-text'><a href='{p.gene_link}'>{p.gene_count}</a></td>",
					"<td><a href='{p.name_link}'>{p.name}</a></td>",
				"</tr>"
			].join("\n");

			return popularList.map(function(genome, idx){

				var pathwayTable = genome.popularData.map(function(p){
					return lang.replace(pathwayTableTemplate, {p: p});
				}).join("\n");

				return lang.replace(template, [(idx + 1), pathwayTable, genome.link]);
			})
		},

		_setProteinFamiliesAttr: function(data){

		},

		_setSpecialtyGenesAttr: function(data){

			var popularList = data['popularGenomes']['popularList'];

			var popularTabList = this._buildSpecialtyGenesPopularPanel(popularList);
			var popularListUl = this._buildPopularGenomeList(popularList);

			var tabDiv = domQuery(".data-box.popular-box div.group")[0];

			var popularTabNode = domConstruct.toDom(popularTabList.join(""));
			var popularListNode = domConstruct.toDom(popularListUl.join(""));

			domConstruct.place(popularTabNode, tabDiv);
			domConstruct.place(popularListNode, tabDiv);

			this._activatePopularGenomeListTab();
		},

		_buildSpecialtyGenesPopularPanel: function(popularList){

			var template = [
				"<div class='genome-data right half group no-decoration hidden' id='genome-tab{0}'>",
					"<div class='far2x'>",
						"<div class='left left-align-text'>",
							"<h3>Specialty Genes:</h3>",
								"{1}",
							"<div class='clear'></div>",
						"</div>",
						"<div class='clear'></div>",
					"</div>",
					"<h3>Explore Genomic Features in </h3>",
					"<div class='three-quarter'>{2}</div>",
				"</div>"
			].join("\n");

			return popularList.map(function(genome, idx){

				var specialtyGenes = genome.specialtyGenes.map(function(spg){
					return lang.replace(attributeTemplate, {attr: spg});
				}).join("\n");

				var links = genome.links.map(function(link, i){
					if(i%2){ // odd
						return lang.replace("<a class='right' href='{0}'>{1}</a><br/>", [link.link, link.name]);
					}else{
						return lang.replace("<a class='left' href='{0}'>{1}</a>", [link.link, link.name]);
					}
				}).join("\n");

				return lang.replace(template, [(idx + 1), specialtyGenes, links]);
			})
		},

		_setTranscriptomicsAttr: function(data){

			// select genomes
			var popularList = data['popularGenomes']['popularList'];

			console.log(this.viewer, data);
		},

		postCreate: function(){
			if(!this.state){
				this.state = {};
			}

			this.inherited(arguments);

			this.viewer = new ContentPane({
				region: "center",
				content: ""
			});

			this.addChild(this.viewer);
		}
	});
});
