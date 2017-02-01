define("p3/widget/FeaturePPIViewer", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom-construct", "dojo/dom-style", "dojo/query",
	"dijit/layout/ContentPane",
	"cytoscape-cola/cytoscape-cola",
	"./InteractionOps"
], function(declare, lang,
			domConstruct, domStyle, query,
			ContentPane,
			cyCola,
			InteractionOps){

	// if(typeof cytoscape('core', 'cola') !== 'function'){
	// 	cyCola(cytoscape, cola);
	// }

	return declare([ContentPane], {
		region: "center",
		init: function(target){

			var cy = this.cy = cytoscape({
				container: target,
				style: [
					{
						selector: 'node',
						style: {
							label: 'data(gene)',
							'text-opacity': 0.8,
							'text-valign': 'top',
							'text-halign': 'right',
							'font-size': 10,
							'text-background-color': '#ffffff',
							'text-background-opacity': 0.8,
							width: 20,
							height: 20,
							'border-color': '#424242',
							'border-width': 1,
							'background-color': '#99CCFF'
						}
					}, {
						selector: 'node.center',
						style: {
							label: 'data(gene)',
							width: 30,
							height: 30,
							'font-size': 15,
							'background-color': '#F44336'
						}
					}, {
						selector: 'edge',
						style: {
							width: 4,
							'curve-style': 'bezier'
						}
					}, {
						selector: 'edge.typeA',
						style: {
							'line-color': '#3F51B5', // indigo 500
							'opacity': 0.8
						}
					}, {
						selector: 'edge.typeB',
						style: {
							'line-color': '#009688', // teal 500
							'line-style': 'dotted',
							'opacity': 0.8
						}
					}, {
						selector: 'edge.typeC',
						style: {
							'line-color': '#FF5722', // deep orange 500
							'line-style': 'dashed',
							'opacity': 0.6
						}
					}, {
						selector: 'edge.typeD',
						style: {
							'line-color': '#795548', // brown 500
							'opacity': 0.8
						}
					}
				]
			});

			var tooltipDiv = query("div.tooltip");
			if(tooltipDiv.length == 0){
				this.tooltipLayer = domConstruct.create("div", {
					"class": "tooltip",
					style: {opacity: 0}
				}, query("body")[0], "last");
			}else{
				this.tooltipLayer = tooltipDiv[0];
			}

			var self = this;

			cy.on('mouseover', 'node, edge', function(evt){
				var ele = evt.cyTarget;

				var content = [];
				if(ele.isNode()){
					ele.data('id') ? content.push("PATRIC ID: " + ele.data('id')) : {};
					ele.data('refseq_locus_tag') ? content.push("RefSeq Locus Tag: " + ele.data('refseq_locus_tag')) : {};
					ele.data('gene') ? content.push("Gene: " + ele.data('gene')) : {};
					ele.data('product') ? content.push("Product: " + ele.data('product')) : {};

				}else if(ele.isEdge()){
					content.push("Type: " + ele.data('type_name'));
					content.push("Method: " + ele.data('method_name'));
				}

				// console.log(evt, self.tooltipLayer);

				domStyle.set(self.tooltipLayer, "left", evt.originalEvent.x + "px");
				domStyle.set(self.tooltipLayer, "top", evt.originalEvent.y + "px");
				domStyle.set(self.tooltipLayer, "opacity", 0.95);
				self.tooltipLayer.innerHTML = content.join("<br>");

			});
			cy.on('mouseout', 'node, edge', function(evt){
				domStyle.set(self.tooltipLayer, "opacity", 0);
			})
		},
		render: function(data, patric_id){

			var cy = this.cy;
			cy.batch(function(){
				data.forEach(function(d){

					var i_a = d.patric_id_a;
					var i_b = d.patric_id_b;

					if(cy.getElementById(i_a).empty()){

						var node = createInteractorCyEle(d, 'a');
						if(i_a == patric_id){
							node.classes = "center";
						}
						cy.add(node);
					}
					if(cy.getElementById(i_b).empty()){
						var node = createInteractorCyEle(d, 'b');
						if(i_b == patric_id){
							node.classes = "center";
						}
						cy.add(node);
					}

					// console.log(d['method']);
					var edgeClass;
					switch(d['method']){
						case "interologs mapping":
							edgeClass = "typeA";
							break;
						case "inference":
							edgeClass = "typeB";
							break;
						case "phylogenetic profile":
							edgeClass = "typeC";
							break;
						case "gene neighbourhood":
							edgeClass = "typeD";
							break;
						default:
							edgeClass = "";
							break;
					}

					cy.add({
						data: {
							source: i_a,
							target: i_b,
							type_name: d['type'],
							method_name: d['method']
						},
						classes: edgeClass
					})
				})
			});

			// cy.layout({name: 'concentric'});
			// cy.layout({name: 'circle', padding: 5, radius: 1});
			cy.layout({name: 'cola'});
		}
	})
});