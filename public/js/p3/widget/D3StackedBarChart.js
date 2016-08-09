define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom", "dojo/dom-class", "dojo/dom-construct", "dojo/query!css3", "dojo/dom-style", "dojo/on",
	"d3/d3",
	"dojo/text!./templates/D3StackedBarChart.html"
], function(declare, lang,
			dom, domClass, domConstruct, domQuery, domStyle, on,
			d3,
			Template){

	return declare([], {
		data: null,
		templateString: Template,

		constructor: function(target){
			this.node = domConstruct.place(this.templateString, target, "only");

			this.currentSort = "label";
			this.ascendSort = true;
			this.normalize = false;

			this.drawTargetParams = {
				target: this.node,
				margins: [10, 0, 0, 40]
			};
			var drawTarget = this.prepareSVGDrawTarget(this.drawTargetParams);
			this.chart = drawTarget.chart;
			this.canvas = drawTarget.canvas;
			this.canvasSize = drawTarget.canvas_size;

			var self = this;
			var scaleToggle = domQuery(".chart-wrapper .scale li");
			var sortToggle = domQuery(".chart-wrapper .sort li");

			// Set up the scale toggle
			if(scaleToggle != null){
				scaleToggle.on('click', function(evt){
					scaleToggle.removeClass("active");
					var target = evt.srcElement || evt.target;

					self.normalize = target.className == "normalize";
					domClass.add(target, "active");

					self.scale(function(){
						return self.sort();
					});
				});
			}

			// Set up the sort controls
			if(sortToggle != null){
				sortToggle.on('click', function(evt){
					sortToggle.removeClass("active");
					domClass.add(evt.srcElement || evt.target, "active");

					return self.sort();
				});
			}
		},

		processData: function(data){

			this.data = data.map(function(d, i){
				return {
					"index": i,
					"label": d.label,
					"total": parseInt(d.total),
					"dist": d.dist,
					"phenotypes": d.phenotypes
				}
			});
		},

		render: function(){

			// remove existing bars and yAxis
			d3.select("g.y").remove();
			d3.selectAll("g.bar").remove();

			// reset scale params
			this.normalize = domQuery(".chart-wrapper .scale .active")[0].className.split(" ")[0] === "normalize" || false;
			if(this.normalize){
				this.maxValue = 100;
			}else{
				this.maxValue = this.data.map(function(d){
					return d.total || 0
				}).reduce(function(a, b){
					return Math.max(a, b)
				});
			}

			// reset sort condition
			var sortToggle = domQuery(".chart-wrapper .sort li");
			sortToggle.removeClass("active");
			domClass.add(domQuery(".chart-wrapper .sort .label")[0], "active");

			// axis
			this.pf_y_scale = d3.scale.linear().range([0, this.canvasSize.height]).domain([this.maxValue, 0]);
			this.pf_x_scale = d3.scale.linear().range([0, this.canvasSize.width]).domain([0, this.data.length]);

			// draw bars
			this.canvas.selectAll("g.bar").data(this.data).enter().append("g").attr("class", "bar");
			this.bars = this.canvas.selectAll("g.bar").data(this.data);
			this.tooltipLayer = d3.select("body").append("div")
				.attr("class", "tooltip")
				.style("opacity", 0);

			var self = this;

			this.full_barWidth = self.pf_x_scale(1);
			this.drawn_barWidth = this.full_barWidth * .525;
			this.center_correction = (this.full_barWidth - this.drawn_barWidth) / 2;

			this.yAxis = d3.svg.axis()
				.scale(this.pf_y_scale)
				.orient("left")
				.tickPadding(0).tickSize(0);

			this.chart.append("g")
				.attr("transform", lang.replace('translate({0},{1})', [this.drawTargetParams.margins[3], this.drawTargetParams.margins[0]]))
				.call(this.yAxis)
				.attr("class", "y axis");

			this.seriesSize = this.data.map(function(d){
				return d['dist'].length
			})
				.reduce(function(a, b){
					return Math.max(a, b)
				});
			var series = [];
			for(var index = 0; index < this.seriesSize; index++){
				series.push(index);
			}
			series.forEach(function(index){

				self.bars.append("rect")
					.attr("class", "block-" + index)
					.attr("y", function(d){
						var ancestorHeight = self.barHeight(d3.sum(d['dist'].slice(0, index)), d.total);
						return Math.round(self.canvasSize.height - self.barHeight(d['dist'][index], d.total) - ancestorHeight);
					})
					.attr("x", function(d, i){
						return self.barPosition(i)
					})
					.attr("width", function(){
						return self.barWidth()
					})
					.attr("height", function(d){
						return Math.round(self.barHeight(d['dist'][index], d.total))
					})
					//.on("click", {})
					.on("mouseover", function(d){
						self.tooltipLayer.transition()
							.duration(200)
							.style("opacity", .95);
						// console.log(d);
						var content = lang.replace('Antibiotic: {0}<br/>Phenotype: {1}<br/>Count: {2}', [d.label, d.phenotypes[index], d['dist'][index]]);
						self.tooltipLayer.html(content)
							.style("left", d3.event.pageX + "px")
							.style("top", d3.event.pageY + "px")
					})
					.on("mouseout", function(){
						self.tooltipLayer.transition()
							.duration(500)
							.style("opacity", 0)
					});
			});

			// Place the text. We have a little height adjustment on the dy
			// to make sure text is centered in the block rather than set
			// along the baseline.

			this.bars.append("text").text(function(d){
				return d.label
			})
				.attr("y", Math.round(this.canvasSize.height - 11))
				.attr("x", function(d, i){
					return self.textPosition(i)
				})
				.attr("transform", function(d, i){
					var y = Math.round(self.canvasSize.height - 11);
					var x = self.textPosition(i);
					return lang.replace('rotate(270, {0}, {1})', [x, y]);
				})
				.attr("dy", ".35em");

		},

		textPosition: function(index){
			return Math.floor((this.full_barWidth * index) + this.drawn_barWidth);
		},
		barPosition: function(index){
			return Math.floor(this.full_barWidth * index + this.center_correction);
		},
		barWidth: function(){
			return Math.floor(this.drawn_barWidth);
		},
		barHeight: function(value, total){
			if(this.normalize){
				return this.canvasSize.height - this.pf_y_scale((value / total) * 100);
			}else{
				return this.canvasSize.height - this.pf_y_scale(value);
			}
		},
		scale: function(){

			if(this.normalize){
				this.maxValue = 100;
			}else{
				this.maxValue = this.data.map(function(d){
					return d.total || 0
				})
					.reduce(function(a, b){
						return Math.max(a, b)
					});
			}
			var self = this;

			// update axis
			this.pf_y_scale = d3.scale.linear().range([0, this.canvasSize.height]).domain([this.maxValue, 0]);
			this.yAxis = d3.svg.axis().scale(this.pf_y_scale).orient("left").tickPadding(0).tickSize(0);
			this.chart.select("g.y").transition().duration(600).call(this.yAxis);

			// update bars
			var series = [];
			for(var index = 0; index < this.seriesSize; index++){
				series.push(index);
			}
			series.forEach(function(index){
				self.bars.select(lang.replace('rect.block-{0}', [index]))
					.transition().duration(600)
					.attr("y", function(d){
						var ancestorHeight = self.barHeight(d3.sum(d['dist'].slice(0, index)), d.total);
						return Math.round(self.canvasSize.height - self.barHeight(d['dist'][index], d.total) - ancestorHeight);
					})
					.attr("height", function(d){
						return Math.round(self.barHeight(d['dist'][index], d.total))
					});
			});
		},
		sort: function(){
			var self = this;

			var sortCriteria = domQuery(".chart-wrapper .sort .active")[0].className.split(" ")[0];

			if(sortCriteria === this.currentSort){
				this.ascendSort = !this.ascendSort;
			}else{
				this.currentSort = sortCriteria;
			}

			if(this.currentSort === "label"){
				this.bars.sort(function(a, b){
					var orderCode = 0;
					if(a.label < b.label){
						orderCode = -1;
					}else if(a.label > b.label){
						orderCode = 1;
					}

					if(!self.ascendSort){
						orderCode = orderCode * -1;
					}
					return orderCode;
				});
			}else if(this.currentSort === "value"){
				this.bars.sort(function(a, b){
					var aValue = self.barHeight(a['dist'][0], a.total);
					var bValue = self.barHeight(b['dist'][0], b.total);

					var orderCode = aValue - bValue;
					if(!self.ascendSort){
						orderCode = orderCode * -1;
					}
					return orderCode;
				})
			}

			for(var index = 0; index < this.seriesSize; index++){
				this.bars.select(lang.replace('rect.block-{0}', [index]))
					.transition().duration(600)
					.delay(function(d, i){
						return 10 * i
					})
					.attr("x", function(d, i){
						return self.barPosition(i)
					});
			}

			this.bars.select("text").transition().duration(600)
				.delay(function(d, i){
					return 10 * i
				})
				.attr("x", function(d, i){
					return self.textPosition(i)
				})
				.attr("transform", function(d, i){
					var y = Math.round(self.canvasSize.height - 11);
					var x = self.pf_x_scale(i) + self.pf_x_scale(1) / 2;
					return lang.replace('rotate(270, {0}, {1})', [x, y]);
				})

		},

		renderLegend: function(legend){
			d3.select("p.legend").selectAll("svg")
				.data(legend)
				.insert("circle")
				.attr("cx", 8).attr("cy", 8).attr("r", 8)
				.attr("class", function(d, i){
					return "bar" + i + "-sample"
				});

			d3.select("p.legend").selectAll("span")
				.data(legend)
				.text(function(d){
					return d
				});
		},
		prepareSVGDrawTarget: function(params){

			var chartSize = params.size || this.getContainerSize(params.target);
			var chartMargin = params.margins || [0, 0, 0, 0];

			var canvasSize = {
				width: chartSize.width - chartMargin[1] - chartMargin[3],
				height: chartSize.height - chartMargin[0] - chartMargin[2]
			};

			var chart = d3.select(".chart")
				.insert("svg", ":first-child")
				.attr("class", "svgChartContainer")
				.attr("width", chartSize.width)
				.attr("height", chartSize.height);

			var canvas = chart.append("g")
				.attr("class", "svgChartCanvas")
				.attr("width", canvasSize.width)
				.attr("height", canvasSize.height)
				.attr("transform", "translate(" + chartMargin[3] + "," + chartMargin[0] + ")");

			return {
				"chart": chart,
				"canvas": canvas,
				"canvas_size": canvasSize,
				"chart_size": chartSize
			};
		},
		getContainerSize: function(){
			var container = domQuery(".chart", this.node)[0] || null;

			if(container){
				return {
					width: domStyle.get(container, "width"),
					height: domStyle.get(container, "height")
				};
			}else{
				console.error("Cannot find chart Dom Node");
				return {
					width: 0,
					height: 0
				};
			}
		},
		resize: function(){
			var self = this;
			clearTimeout(this.resizer);

			this.resizer = setTimeout(function(){
				self.doResize()
			}, 300);
		},
		doResize: function(){
			var container = domQuery(".chart", this.node)[0] || null;

			var chartWidth = domStyle.get(container, "width");
			var canvasWidth = chartWidth - this.drawTargetParams.margins[1] - this.drawTargetParams.margins[3];

			this.canvasSize.width = canvasWidth;

			// console.log("resize canvasWidth: ", canvasWidth);

			this.pf_x_scale.range([0, canvasWidth]);

			// update chart and canvas width
			this.chart.attr("width", chartWidth);
			this.canvas.attr("width", canvasWidth);

			// update bars
			this.full_barWidth = this.pf_x_scale(1);
			this.drawn_barWidth = this.full_barWidth * .525;
			this.center_correction = (this.full_barWidth - this.drawn_barWidth) / 2;

			var self = this;
			for(var index = 0; index < this.seriesSize; index++){
				this.bars.select(lang.replace('rect.block-{0}', [index]))
					.transition()
					.attr("width", function(){
						return self.barWidth()
					})
					.attr("x", function(d, i){
						return self.barPosition(i)
					});
			}

			this.bars.select("text")
				.transition()
				.attr("x", function(d, i){
					return self.textPosition(i)
				})
				.attr("transform", function(d, i){
					var y = Math.round(self.canvasSize.height - 11);
					var x = self.pf_x_scale(i) + self.pf_x_scale(1) / 2;
					return lang.replace('rotate(270, {0}, {1})', [x, y]);
				})
		}
	})
});