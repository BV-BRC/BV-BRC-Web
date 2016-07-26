define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom", "dojo/dom-class", "dojo/dom-construct",
	"d3/d3"
], function(declare, lang,
			dom, domClass, domConstruct,
			d3){

	return declare([], {
		constructor: function(target){
			this.node = domConstruct.place('<div class="chart"></div>', target, "only");

			this.canvas = d3.select(".chart")
				.insert("svg", ":first-child")
				.attr("width", 700)
				.attr("height", 100);

			// this.canvas.append('<defs><marker id="markerArrow" markerWidth="13" markerHeight="13" refX="2" refY="6" orient="auto"><path d="M2,2 L2,11 L10,6 L2,2" style="fill: #000000;" /></marker></defs>');
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

			// this.canvas = chart.append("g")
			// 	.attr("width", 600)
			// 	.attr("height", 150);
			// transform?

			this.tooltipLayer = d3.select("body").append("div")
				.attr("class", "tooltip")
				.style("opacity", 0);
		},
		render: function(data){
			var firstStartPosition = Math.max(998355,999472);
			var lastEndPosition = Math.min(1008355, 1008180);
			var totalRange = lastEndPosition - firstStartPosition;

			this.x_scale = d3.scale.linear().range([0, 690]).domain([0, totalRange]);

			this.canvas.selectAll("g")
				.data(data)
				.enter()
				.append("rect")
				.attr("y", 50)
				.attr("x", d => this.x_scale(d.start - firstStartPosition))
				.attr("width", d => this.x_scale(d.na_length))
				.attr("height", 15)
				.attr("fill", '#4f81bd')
				.on("mouseover", d=>{
					this.tooltipLayer.transition()
						.duration(200)
						.style("opacity", .95);
					var content = [];
					content.push('PATRIC ID: ' + d.patric_id);
					(d.gene)? content.push('gene: ' + d.gene): {};
					content.push("feature type: " + d.feature_type);
					content.push("strand: " + d.strand);
					content.push("location: " + d.start + "..." + d.end);

					this.tooltipLayer.html(content.join("<br/>"))
						.style("left", d3.event.pageX + "px")
						.style("top", (d3.event.pageY - 28) + "px")
				})
				.on("mouseout", () => this.tooltipLayer.transition()
					.duration(500)
					.style("opacity", 0)
				)
			;

			this.canvas.selectAll("path")
				.data(data)
				.enter()
				.append("path")
				.attr("d", d =>{
					var ret = [];
					var start, end;

					if(d.strand === '+'){
						start = this.x_scale(d.start - firstStartPosition);
						end = this.x_scale(d.end - firstStartPosition) - 8;
					}else{
						start = this.x_scale(d.end - firstStartPosition);
						end = this.x_scale(d.start - firstStartPosition) + 8;
					}

					ret.push('M' + start + ',45');
					ret.push('L' + end + ',45');

					return ret.join(' ');
				})
				.attr("style", "stroke: #6666ff; stroke-width: 1px; fill: #4f81bd; marker-end: url(#markerArrow);");

			this.canvas.selectAll("text")
				.data(data)
				.enter()
				.append("text")
				.text(d => d.gene)
				.attr("y", 40)
				.attr("x", d => this.x_scale(d.start - firstStartPosition));
		}
	});
});