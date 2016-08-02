define("p3/widget/D3HorizontalBarChart", [
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
			this.margin = [10, 10, 20, 10];

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
			var total = data.length;

			this.y_scale = d3.scale.linear()
				.range([0, (self.nodeHeight - self.margin[0] - self.margin[2])])
				.domain([0, total]);
			this.x_scale = d3.scale.linear()
				.range([0, (self.nodeWidth - self.margin[1] - self.margin[3])])
				.domain([0, maxValue]);

			this.yAxis = d3.svg.axis()
				.scale(this.y_scale)
				.orient("left")
				.tickPadding(2).tickSize(1);

			this.xAxis = d3.svg.axis()
				.scale(this.x_scale)
				.orient("bottom")
				.tickFormat(d3.format(",.0d"))
				.tickPadding(2).tickSize(1);


			// this.canvas.append("g")
			// 	.attr("transform", "translate(10, 10)")
			// 	.call(this.yAxis)
			// 	.attr("class", "y axis");

			this.canvas.append("g")
				.attr("transform", "translate(10, 230)")
				.call(this.xAxis)
				.attr("class", "x axis");


			this.canvas.append("g")
				.selectAll("rect")
				.data(data)
				.enter()
				.append("rect")
				.attr("x", function(){
					return self.x_scale(0) + self.margin[3];
				})
				.attr("y", function(d, i){
					return self.y_scale(i) + self.margin[0] + 1;
				})
				.attr("width", function(d){
					return self.x_scale(d.count)
				})
				.attr("height", ((self.nodeHeight - self.margin[0] - self.margin[2]) / total - 12 ))
				.attr("fill", '#1976D2')
				.on("mouseover", function(d){
					self.tooltipLayer.transition()
						.duration(200)
						.style("opacity", .95);

					var content = (d.tooltip)? d.tooltip.apply(this, arguments): lang.replace('{label} ({count})', d);

					self.tooltipLayer.html(content)
						.style("left", d3.event.pageX + "px")
						.style("top", d3.event.pageY + "px")
				})
				.on("mouseout", function(){
					self.tooltipLayer.transition()
						.duration(500)
						.style("opacity", 0)
				});

			this.canvas.append("g")
				.selectAll("text")
				.data(data)
				.enter()
				.append("text")
				.text(function(d){
					return d.label
				})
				.attr("x", function(d){
					return self.x_scale(0) + self.margin[3] + 20;
				})
				.attr("y", function(d, i){
					return self.y_scale(i) + self.margin[0];
				});
		}
	});
});