define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom", "dojo/dom-class", "dojo/dom-construct", "dojo/query!css3", "dojo/dom-style",
	"d3/d3",
	"dojo/text!./templates/D3StackedBarChart.html"
], function(declare, lang,
			dom, domClass, domConstruct, domQuery, domStyle,
			d3,
			Template){

	return declare([], {
		data: null,
		templateString: Template,

		init: function(target, className, margin){
			target = (typeof target == "string") ? d3.select(target)[0][0] : target;

			this.node = domConstruct.place(this.templateString, target, "only");

			this.currentSort = "label";
			this.ascendSort = true;
			this.normalize = false;

			this.margin = margin = lang.mixin({top: 10, right: 0, bottom: 0, left: 40}, margin);

			var container = domQuery(".chart", this.node)[0];

			var containerWidth = domStyle.get(container, "width");
			var containerHeight = domStyle.get(container, "height");

			this.canvasWidth = containerWidth - margin.right - margin.left;
			this.canvasHeight = containerHeight - margin.top - margin.bottom;

			// console.log(containerWidth, containerHeight, this.canvasWidth, this.canvasHeight);

			if(className){
				d3.select(".chart-wrapper").attr("class", "chart-wrapper " + className);
			}

			this.chart = d3.select(".chart")
				.insert("svg", ":first-child")
				.attr("class", "svgChartContainer")
				.attr("width", containerWidth)
				.attr("height", containerHeight);

			this.canvas = this.chart.append("g")
				.attr("class", "svgChartCanvas")
				.attr("width", this.canvasWidth)
				.attr("height", this.canvasHeight)
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			if(d3.select("div.tooltip")[0][0]){
				this.tooltipLayer = d3.select("div.tooltip");
			}else{
				this.tooltipLayer = d3.select("body").append("div")
					.attr("class", "tooltip")
					.style("opacity", 0);
			}
		},

		render: function(data){
			if(this.data !== data){
				this.data = data;
			}else{
				return;
			}

			// remove existing bars and yAxis
			d3.select("g.y").remove();
			d3.selectAll("g.bar").remove();

			// reset scale params
			this.normalize = domQuery(".chart-wrapper nav .scale .active")[0].className.split(" ")[0] === "normalize" || false;

			this.maxValue = (this.normalize) ? 100 : this.data.map(function(d){
				return d.total || 0
			}).reduce(function(a, b){
				return Math.max(a, b)
			});

			// reset sort condition
			var sortToggle = domQuery(".chart-wrapper nav .sort li");
			sortToggle.removeClass("active");
			domClass.add(domQuery(".chart-wrapper nav .sort .label")[0], "active");

			// axis
			this.pf_y_scale = d3.scale.linear().range([0, this.canvasHeight]).domain([this.maxValue, 0]);
			this.pf_x_scale = d3.scale.linear().range([0, this.canvasWidth]).domain([0, this.data.length]);

			// draw bars
			this.canvas.selectAll("g.bar").data(this.data).enter().append("g").attr("class", "bar");
			this.bars = this.canvas.selectAll("g.bar").data(this.data);

			var self = this;

			this.full_barWidth = self.pf_x_scale(1);
			this.drawn_barWidth = this.full_barWidth * .525;
			this.center_correction = (this.full_barWidth - this.drawn_barWidth) / 2;

			this.yAxis = d3.svg.axis()
				.scale(this.pf_y_scale)
				.orient("left")
				.tickFormat(d3.format(",.0d"))
				.tickPadding(0).tickSize(0);

			this.chart.append("g")
				.attr("transform", lang.replace('translate({0},{1})', [this.margin.left, this.margin.top]))
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
						return Math.round(self.canvasHeight - self.barHeight(d['dist'][index], d.total) - ancestorHeight);
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

						arguments[1] = index;
						var content = (d.tooltip) ? d.tooltip.apply(this, arguments) : lang.replace('{label} ({count})', d);

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
				.attr("y", Math.round(this.canvasHeight - 11))
				.attr("x", function(d, i){
					return self.textPosition(i)
				})
				.attr("transform", function(d, i){
					var y = Math.round(self.canvasHeight - 11);
					var x = self.textPosition(i);
					return lang.replace('rotate(270, {0}, {1})', [x, y]);
				})
				.attr("dy", ".35em");

		},

		update: function(data){

			if(typeof data == "string"){
				data = JSON.parse(data);
			}

			if(this.canvas.select("g.bars").selectAll("rect").length === 0){
				this.render(data);
				return;
			}

			this.data = data;

			this.maxValue = (this.normalize) ? 100 : this.data.map(function(d){
				return d.total || 0
			}).reduce(function(a, b){
				return Math.max(a, b)
			});
			// console.log("maxValue: ", this.maxValue, "data length: ", this.data.length);

			var self = this;

			// update axis
			this.pf_y_scale.domain([this.maxValue, 0]);
			this.pf_x_scale.domain([0, this.data.length]);

			this.yAxis.scale(this.pf_y_scale);
			// this.xAxis.scale(this.pf_x_scale);
			this.full_barWidth = self.pf_x_scale(1);
			this.drawn_barWidth = this.full_barWidth * .525;
			this.center_correction = (this.full_barWidth - this.drawn_barWidth) / 2;

			this.chart.select("g.y").transition().duration(600).call(this.yAxis);
			// this.chart.select("g.x").transition().duration(600).call(this.xAxis);

			// update bars
			var series = [];
			for(var index = 0; index < this.seriesSize; index++){
				series.push(index);
			}
			series.forEach(function(index){
				self.bars.select(lang.replace('rect.block-{0}', [index]))
					.transition().duration(600)
					.attr("y", function(d, i){
						if(data[i] != undefined){
							var ancestorHeight = self.barHeight(d3.sum(data[i]['dist'].slice(0, index)), data[i].total);
							return Math.round(self.canvasHeight - self.barHeight(data[i]['dist'][index], data[i].total) - ancestorHeight);
						}else{
							return 0;
						}
					})
					.attr("x", function(d, i){
						return self.barPosition(i)
					})
					.attr("width", function(d, i){
						return self.barWidth();
					})
					.attr("height", function(d, i){
						return (data[i] != undefined) ? Math.round(self.barHeight(data[i]['dist'][index], data[i].total)) : 0;
					});
			});

			this.bars.select("text").transition().duration(600)
				.delay(function(d, i){
					return 10 * i
				})
				.attr("x", function(d, i){
					return self.textPosition(i)
				})
				.attr("transform", function(d, i){
					var y = Math.round(self.canvasHeight - 11);
					var x = self.pf_x_scale(i) + self.pf_x_scale(1) / 2;
					return lang.replace('rotate(270, {0}, {1})', [x, y]);
				})
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
				return this.canvasHeight - this.pf_y_scale((value / total) * 100);
			}else{
				return this.canvasHeight - this.pf_y_scale(value);
			}
		},
		scale: function(){

			this.maxValue = (this.normalize) ? 100 : this.data.map(function(d){
				return d.total || 0
			}).reduce(function(a, b){
				return Math.max(a, b)
			});

			var self = this;

			// update axis
			this.pf_y_scale.domain([this.maxValue, 0]);
			this.yAxis.scale(this.pf_y_scale);
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
						return Math.round(self.canvasHeight - self.barHeight(d['dist'][index], d.total) - ancestorHeight);
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
					var y = Math.round(self.canvasHeight - 11);
					var x = self.pf_x_scale(i) + self.pf_x_scale(1) / 2;
					return lang.replace('rotate(270, {0}, {1})', [x, y]);
				})

		},

		renderNav: function(html){

			domConstruct.place(html, domQuery(".chart-wrapper nav")[0], "only");

			var self = this;
			var scaleToggle = domQuery(".chart-wrapper nav .scale li");
			var sortToggle = domQuery(".chart-wrapper nav .sort li");

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

		renderLegend: function(title, legend){

			d3.select("p.legend").select("label").text(title);

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
			var canvasWidth = chartWidth - this.margin.right - this.margin.left;

			this.canvasWidth = canvasWidth;

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
					var y = Math.round(self.canvasHeight - 11);
					var x = self.pf_x_scale(i) + self.pf_x_scale(1) / 2;
					return lang.replace('rotate(270, {0}, {1})', [x, y]);
				})
		}
	})
});