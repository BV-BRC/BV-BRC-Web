define("p3/widget/D3SingleGeneViewer", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom", "dojo/dom-class", "dojo/dom-construct", "dojo/dom-style",
	"d3/d3"
], function(declare, lang,
			dom, domClass, domConstruct, domStyle,
			d3){

	return declare([], {
		constructor: function(target){
			this.node = domConstruct.place('<div class="chart"></div>', target, "only");

			this.nodeWidth = parseInt(domStyle.get(this.node, "width"));

			this.canvas = d3.select(".chart")
				.insert("svg", ":first-child")
				.attr("preserveAspectRatio", "xMidYMid meet")
				.attr("viewBox", "-5 0 " + (this.nodeWidth - 10) + " 70");

			this.canvas.insert("defs")
				.append("marker")
				.attr("id", "markerArrow")
				.attr("markerWidth", "10")
				.attr("markerHeight", "10")
				.attr("refX", "2")
				.attr("refY", "6")
				.attr("orient", "auto")
				.append("path")
				.attr("d", "M2,2 L2,11 L10,6 L2,2")
				.attr("style", "fill: #4f81bd;");

			if(d3.select("div.tooltip")[0][0]){
				this.tooltipLayer = d3.select("div.tooltip");
			}else{
				this.tooltipLayer = d3.select("body").append("div")
					.attr("class", "tooltip")
					.style("opacity", 0);
			}
		},
		render: function(data){
			var self = this;

			var totalRange = data.lastEndPosition - data.firstStartPosition;
			var pinStart = data.pinStart;

			this.x_scale = d3.scale.linear().range([0, self.nodeWidth]).domain([0, totalRange]);

			this.canvas.selectAll("g")
				.data(data.features)
				.enter()
				.append("rect")
				.attr("y", 50)
				.attr("x", function(d){
					return self.x_scale(d.start - data.firstStartPosition)
				})
				.attr("width", function(d){
					return self.x_scale(d.na_length)
				})
				.attr("height", 15)
				.attr("fill", function(d){
					return (d.start === pinStart) ? '#E53935' : '#1976D2';
				})
				.on("mouseover", function(d){
					self.tooltipLayer.transition()
						.duration(200)
						.style("opacity", .95);

					var content = [];
					content.push('PATRIC ID: ' + d.patric_id);
					(d.gene) ? content.push('Gene: ' + d.gene) : {};
					content.push("Feature type: " + d.feature_type);
					content.push("Strand: " + d.strand);
					content.push("Location: " + d.start + "..." + d.end);

					self.tooltipLayer.html(content.join("<br/>"))
						.style("left", d3.event.pageX + "px")
						.style("top", d3.event.pageY + "px")
				})
				.on("mouseout", function(){
					self.tooltipLayer.transition()
						.duration(500)
						.style("opacity", 0)
				})
			;

			this.canvas.selectAll("path")
				.data(data.features)
				.enter()
				.append("path")
				.attr("d", function(d){
					var ret = [];
					var start, end;

					if(d.strand === '+'){
						start = self.x_scale(d.start - data.firstStartPosition);
						end = self.x_scale(d.end - data.firstStartPosition) - 8;
					}else{
						start = self.x_scale(d.end - data.firstStartPosition);
						end = self.x_scale(d.start - data.firstStartPosition) + 8;
					}

					ret.push('M' + start + ',45');
					ret.push('L' + end + ',45');

					return ret.join(' ');
				})
				.attr("style", "stroke: #6666ff; stroke-width: 1px; fill: #4f81bd; marker-end: url(#markerArrow);");

			this.canvas.selectAll("text")
				.data(data.features)
				.enter()
				.append("text")
				.text(function(d){
					return d.gene
				})
				.attr("y", 40)
				.attr("x", function(d){
					return self.x_scale(d.start - data.firstStartPosition)
				});
		}
	});
});