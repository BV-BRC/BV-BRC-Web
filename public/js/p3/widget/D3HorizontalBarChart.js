define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom", "dojo/dom-class", "dojo/dom-construct", "dojo/dom-style",
	"d3/d3"
], function(declare, lang,
			dom, domClass, domConstruct, domStyle,
			d3){

	return declare([], {
		constructor: function(target){
			this.node = domConstruct.place('<div class="chart"></div>', target, "only");

			this.nodeWidth = domStyle.get(this.node, "width");
			this.nodeHeight = 250;
			this.margin = {top: 0, right: 10, bottom: 20, left: 250};

			this.canvas = d3.select(".chart")
				.insert("svg", ":first-child")
				.attr("width", this.nodeWidth)
				.attr("height", this.nodeHeight);

			this.tooltipLayer = d3.select("body").append("div")
				.attr("class", "tooltip")
				.style("opacity", 0);
		},
		/*
			expect data:[{label: [string], tooltip: [string or func], count: [number]},,,]
			// will use '{label} ({count})' if tooltip is omitted.
		 */
		render: function(data){
			var self = this;

			var maxValue = data.map(function(d){
				return d.count;
			})
				.reduce(function(a, b){
					return Math.max(a, b);
				});
			var label = data.map(function(d){
				return d.label;
			});

			this.y_scale = d3.scale.ordinal()
				.rangeRoundBands([self.margin.top, (self.nodeHeight - self.margin.top - self.margin.bottom)], .3, 0)
				.domain(label);
			this.y_scale_range = this.y_scale.range();
			// console.log(this.y_scale.rangeBand(), this.y_scale_range);

			this.x_scale = d3.scale.linear()
				.range([0, (self.nodeWidth - self.margin.right - self.margin.left)])
				.domain([0, maxValue]);

			this.yAxis = d3.svg.axis()
				.scale(this.y_scale)
				.orient("left")
				.tickFormat(function(d) {
					return (d.length > 32) ? d.substr(0, 32) + '...' : d;
				})
				.tickPadding(2).tickSize(1);

			this.xAxis = d3.svg.axis()
				.scale(this.x_scale)
				.orient("bottom")
				.tickFormat(d3.format(",.0d"))
				.tickPadding(2).tickSize(1);

			this.canvas.append("g")
				.attr("transform", lang.replace("translate({0}, {1})", [self.margin.left, self.margin.top]))
				.call(this.yAxis)
				.attr("class", "y axis");

			this.canvas.append("g")
				.attr("transform", lang.replace("translate({0}, {1})", [self.margin.left, self.nodeHeight - self.margin.bottom]))
				.call(this.xAxis)
				.attr("class", "x axis");

			this.canvas.append("g")
				.selectAll("rect")
				.data(data)
				.enter()
				.append("rect")
				.attr("x", function(){
					return self.x_scale(0) + self.margin.left;
				})
				.attr("y", function(d, i){
					return self.y_scale_range[i] + self.margin.top;
				})
				.attr("width", function(d){
					return self.x_scale(d.count)
				})
				.attr("height", self.y_scale.rangeBand())
				.attr("fill", '#1976D2')
				.on("mouseover", function(d){
					self.tooltipLayer.transition()
						.duration(200)
						.style("opacity", .95);

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
		}
	});
});