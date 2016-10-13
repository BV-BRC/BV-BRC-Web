define("p3/widget/D3SingleGeneViewer", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom", "dojo/dom-class", "dojo/dom-construct", "dojo/dom-style", "dojo/topic",
	"d3/d3"
], function(declare, lang,
			dom, domClass, domConstruct, domStyle, Topic,
			d3){

	return declare([], {
		init: function(target){
			this.node = domConstruct.place('<div class="chart"></div>', target, "only");

			this.nodeWidth = parseInt(domStyle.get(this.node, "width"));

			this.canvas = d3.select(".chart")
				.insert("svg", ":first-child")
				.attr("preserveAspectRatio", "xMidYMid meet")
				.attr("viewBox", "-5 0 " + (this.nodeWidth - 10) + " 70");

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

			// allocate groups
			var groups = [];
			var overlapPadding = 100;
			groups.push({m: [], max: 0});

			data['features'].forEach(function(d){
				for(var gIdx = 0; gIdx < groups.length; gIdx++){
					var g = groups[gIdx];
					if(g.max === 0){
						// insert. init
						g.m.push(d);
						g.max = d.end + overlapPadding;
						break;
					}

					if(d.start <= g.max){
						// seek another group or create another group
						if(groups.length === gIdx + 1){
							groups.push({m: [], max: 0});
						}
					}
					else{
						// insert data in current group
						g.m.push(d);
						g.max = d.end + overlapPadding;
						break;
					}
				}
			});
			// console.log(data);
			// console.log(groups);

			groups.forEach(function(g, gIdx){
				// console.log(gIdx, g);

				self.canvas.append("g")
					.attr("transform", function(){
						return "translate(0, " + (30 + gIdx * 30) + ")";
					})
					.attr("class", "g" + gIdx)
					.selectAll("g")
					.data(g.m)
					.enter()
					.append("polyline")
					.attr("points", function(d){
						// console.log(d);
						var start, middle, end, length;

						if(d.strand == '+'){
							start = self.x_scale(d.start - data.firstStartPosition);
							length = self.x_scale(d.na_length);
							middle = start + length - 12;
							end = start + length;
						}else{
							start = self.x_scale(d.end - data.firstStartPosition);
							length = self.x_scale(d.na_length);
							middle = start - length + 12;
							end = start - length;
						}

						var pos = [];
						pos.push(start);
						pos.push(-6);
						pos.push(start);
						pos.push(6);
						pos.push(middle);
						pos.push(6);
						pos.push(middle);
						pos.push(11);
						pos.push(end);
						pos.push(0);
						pos.push(middle);
						pos.push(-11);
						pos.push(middle);
						pos.push(-6);
						pos.push(start);
						pos.push(-6);

						return pos.join(" ");
					})
					.attr("fill", function(d){
						return (d.start === pinStart) ? '#E53935' : '#1976D2';
					})
					.on("click", function(d){
						var url = "/view/Feature/" + d.feature_id + "#view_tab=overview";
						Topic.publish("/navigate", {href: url});
					})
					.on("mouseover", function(d){
						self.tooltipLayer.transition()
							.duration(200)
							.style("opacity", .95);

						var content = [];
						(d.patric_id) ? content.push('PATRIC ID: ' + d.patric_id) : {};
						(d.refseq_locus_tag) ? content.push('RefSeq Locus tag: ' + d.refseq_locus_tag) : {};
						(d.gene) ? content.push('Gene: ' + d.gene) : {};
						content.push("Product: " + d.product);
						content.push("Feature type: " + d.feature_type);
						content.push("Location: " + d.start + "..." + d.end + " (" + d.strand + ")");

						self.tooltipLayer.html(content.join("<br/>"))
							.style("left", d3.event.pageX + "px")
							.style("top", d3.event.pageY + "px")
					})
					.on("mouseout", function(){
						self.tooltipLayer.transition()
							.duration(500)
							.style("opacity", 0)
					});

				self.canvas.select("g.g" + gIdx)
					.selectAll("text")
					.data(g.m)
					.enter()
					.append("text")
					.text(function(d){
						return d.gene
					})
					.attr("y", -9)
					.attr("x", function(d){
						// console.log(self.x_scale(d.start - data.firstStartPosition + d.na_length / 2));
						return self.x_scale(d.start - data.firstStartPosition + d.na_length / 2) - 15;
					});

			});
		}
	});
});