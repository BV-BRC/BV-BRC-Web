define.amd.jQuery = true;
define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/topic", "dojo/query", "dojo/dom-construct", "dojo/dom-style",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dijit/popup", "dijit/TooltipDialog",
	"cytoscape-panzoom/cytoscape-panzoom", "cytoscape-context-menus/cytoscape-context-menus",
	"cytoscape-cola/cytoscape-cola", "cytoscape-dagre/cytoscape-dagre", /*"cytoscape-cose-bilkent/cytoscape-cose-bilkent",*/
	"./ContainerActionBar", "./InteractionOps", "FileSaver"
], function(declare, lang,
			on, Topic, query, domConstruct, domStyle,
			BorderContainer, ContentPane, popup, TooltipDialog,
			cyPanzoom, cyContextMenus,
			cyCola, cyDagre, /*cyCose,*/
			ContainerActionBar, InteractionOps, saveAs){

	var panelSubGraph = ['<div class="wsActionTooltip" rel="5">5 or More Nodes</div>', '<div class="wsActionTooltip" rel="10">10 or More Nodes</div>', '<div class="wsActionTooltip" rel="20">20 or More Nodes</div>', '<div class="wsActionTooltip" rel="max">Largest Subgraph</div>'].join("\n");

	var ttSubGraph = new TooltipDialog({
		content: panelSubGraph,
		onMouseLeave: function(){
			popup.close(ttSubGraph);
		}
	});

	var panelHubProtein = ['<div class="wsActionTooltip" rel="3">3 or More Neighbors</div>', '<div class="wsActionTooltip" rel="4">4 or More Neighbors</div>', '<div class="wsActionTooltip" rel="5">5 or More Neighbors</div>', '<div class="wsActionTooltip" rel="10">10 or More Neighbors</div>', '<div class="wsActionTooltip" rel="max">Most Connected Hub</div>'].join("\n");

	var ttHubProtein = new TooltipDialog({
		content: panelHubProtein,
		onMouseLeave: function(){
			popup.close(ttHubProtein);
		}
	});

	var panelLayouts = ['<div class="wsActionTooltip" rel="cola">COLA</div>', '<div class="wsActionTooltip" rel="cose-bilkent">COSE Bilkent</div>', '<div class="wsActionTooltip" rel="dagre">Dagre</div>', '<div class="wsActionTooltip" rel="grid">Grid</div>', '<div class="wsActionTooltip" rel="random">Random</div>', '<div class="wsActionTooltip" rel="concentric">Concentric</div>', '<div class="wsActionTooltip" rel="circle">Circle</div>'].join("\n");

	var ttLayouts = new TooltipDialog({
		content: panelLayouts,
		onMouseLeave: function(){
			popup.close(ttLayouts);
		}
	});

	// register modules
	if(typeof cytoscape('core', 'panzoom') !== 'function'){
		cyPanzoom(cytoscape, $);
	}

	return declare([BorderContainer], {
		gutters: false,
		visible: false,
		containerActions: [
			[
				"Legend",
				"fa icon-bars fa-2x",
				{
					label: "Legend",
					multiple: false,
					validType: ["*"]
				},
				function(){
					console.log("legend");
				},
				true
			], [
				"Export",
				"fa icon-print fa-2x",
				{
					label: "Export",
					multiple: false,
					validType: ["*"]
				},
				function(){
					// TODO: later change to svg
					// https://github.com/cytoscape/cytoscape.js/issues/639
					function fixBinary(bin){
						var length = bin.length;
						var buf = new ArrayBuffer(length);
						var arr = new Uint8Array(buf);
						for(var i = 0; i < length; i++){
							arr[i] = bin.charCodeAt(i);
						}
						return buf;
					}

					var png64 = this.cy.png({full: true, scale: 1.0}).split(',')[1];
					var binary = fixBinary(atob(png64));
					saveAs(new Blob([binary], {type: 'image/png'}), "PATRIC_interaction.png");
				},
				true
			], [
				"SubGraph",
				"fa icon-subtree fa-2x",
				{
					label: "Sub-Graph",
					multiple: false,
					validType: ["*"],
					tooltipDialog: ttSubGraph
				},
				function(){

					on(ttSubGraph.domNode, "click", lang.hitch(this, function(evt){
						var rel = evt.target.attributes.rel.value;
						var cy = this.cy;

						cy.elements().unselect();

						var selected = getSubGraphs(cy, rel);
						// console.log("selected: ", selected.length);
						cy.collection(selected).select();
					}));

					popup.open({
						popup: this.containerActionBar._actions.SubGraph.options.tooltipDialog,
						around: this.containerActionBar._actions.SubGraph.button,
						orient: ["below"]
					});
				},
				true
			], [
				"HubProtein",
				"fa icon-hub fa-2x",
				{
					label: "Hub Protein",
					multiple: false,
					validType: ["*"],
					tooltipDialog: ttHubProtein
				},
				function(){

					on(ttHubProtein.domNode, "click", lang.hitch(this, function(evt){
						var rel = evt.target.attributes.rel.value;
						var cy = this.cy;

						cy.elements().unselect();

						var selected = getHubs(cy, rel);
						// console.log("selected: ", selected.length);
						cy.collection(selected).select();
					}));

					popup.open({
						popup: this.containerActionBar._actions.HubProtein.options.tooltipDialog,
						around: this.containerActionBar._actions.HubProtein.button,
						orient: ["below"]
					});
				},
				true
			], [
				"Layouts",
				"fa icon-layout fa-2x",
				{
					label: "Layout",
					multiple: false,
					validType: ["*"],
					tooltipDialog: ttLayouts
				},
				function(){
					on(ttLayouts.domNode, "click", lang.hitch(this, function(evt){
						var rel = evt.target.attributes.rel.value;
						var cy = this.cy;

						switch(rel){
							case "cola":
								cy.layout({name: 'cola', userConstIter: 1});
								break;
							default:
								cy.layout({name: rel});
								break;
						}
					}));

					popup.open({
						popup: this.containerActionBar._actions.Layouts.options.tooltipDialog,
						around: this.containerActionBar._actions.Layouts.button,
						orient: ["below"]
					});
				},
				true
			]
		],
		constructor: function(options){

			this.topicId = options.topicId;
			Topic.subscribe(this.topicId, lang.hitch(this, function(){
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "updateGraphData":
						this.updateGraph(value);
						break;
					default:
						break;
				}
			}));
		},

		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();

				var cy = this.cy = cytoscape({
					container: document.getElementById('cy'),
					boxSelectionEnabled: true,
					style: [
						{
							selector: 'node',
							style: {
								label: 'data(name)',
								'text-opacity': 0.8,
								'text-valign': 'center',
								'text-halign': 'center',
								'font-size': 10,
								width: 40,
								height: 40,
								// border
								'border-color': '#424242',
								'border-width': 2,
								'border-opacity': 0.8,
								// background
								'background-color': '#99CCFF'
							}
						}, {
							selector: 'node:selected',
							style: {
								'border-color': '#BBBB55',
								'shadow-color': '#FFAB00',
								'shadow-blur': 30,
								'shadow-opacity': 1
							}
						}, {
							selector: 'edge',
							style: {
								width: 4,
								'line-color': '#555555',
								'curve-style': 'bezier'
							}
						}, {
							selector: 'edge:selected',
							style: {
								'line-color': '#BBBB55',
								'shadow-color': '#FFAB00', // a700
								'shadow-blur': 30,
								'shadow-opacity': 1
							}
						}, {
							selector: 'edge.typeA',
							style: {
								'line-color': '#3F51B5' // indigo 500
							}
						}, {
							selector: 'edge.typeB',
							style: {
								'line-color': '#009688', // teal 500
								'line-style': 'dotted'
							}
						}, {
							selector: 'edge.typeC',
							style: {
								'line-color': '#FF5722', // deep orange 500
								'line-style': 'dashed',
								'opacity': 0.6
							}
						}
					]
				});

				// cy.panzoom();

				cy.contextMenus({
					menuItems: [{
						// 	id: 'highlight',
						// 	title: 'highlight',
						// 	selector: 'node',
						// 	onClickFunction: function(event){
						// 		console.log(event);
						// 	},
						// 	hasTrailingDivider: true
						// }, {
						id: 'selectNeighborhood',
						title: 'select Neighborhood',
						selector: 'node',
						onClickFunction: function(evt){
							cy.nodes().unselect();

							var rootNode = evt.cyTarget;
							rootNode.neighborhood().select();
						}
					}, {
						id: 'selectSubgraph',
						title: 'select Connected Sub-graph',
						selector: 'node',
						onClickFunction: function(evt){
							cy.nodes().unselect();

							var rootNode = evt.cyTarget;
							var visitedArr = [rootNode];
							cy.elements().bfs({
								roots: rootNode,
								visit: function(i, depth, v, e, u){
									visitedArr.push(v); // include node
									visitedArr.push(e); // include edge
								},
								directed: false
							});

							cy.collection(visitedArr).select();
						}
					}]
				});

				var tooltipDiv = query("div.tooltip");
				if(tooltipDiv.length == 0){
					// this.tooltipLayer = domConstruct.place('<div class="tooltip" style="opacity: 0"></div>', query("body")[0], "last");
					this.tooltipLayer = domConstruct.create("div", {
						"class": "tooltip",
						style: {opacity: 0}
					}, query("body")[0], "last");
				}else{
					this.tooltipLayer = tooltipDiv[0];
				}

				var self = this;

				cy.on('mouseover', 'node, edge', function(evt){
					// cy.on('tap', 'node, edge', function(evt){
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
			}
		},
		onFirstView: function(){
			if(this._firstView){
				return;
			}

			// action buttons
			this.containerActionBar = new ContainerActionBar({
				baseClass: "BrowserHeader",
				region: "top"
			});
			this.containerActions.forEach(function(a){
				this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
			}, this);
			this.addChild(this.containerActionBar);

			this.addChild(new ContentPane({
				region: "center",
				id: "cy",
				// content: "<div id='cy'></div>",
				style: "padding:0"
			}));

			this.inherited(arguments);
			this._firstView = true;
		},
		updateGraph: function(data){
			if(data.length == 0){
				return;
			}
			var cy = this.cy;

			cy.batch(function(){
				data.forEach(function(d){
					var i_a = d.patric_id_a;
					var i_b = d.patric_id_b;

					if(cy.getElementById(i_a).empty()){
						cy.add(createInteractorCyEle(d, 'a'));
					}
					if(cy.getElementById(i_b).empty()){
						cy.add(createInteractorCyEle(d, 'b'));
					}

					var edgeClass;
					switch(d['method']){
						case "experimental interaction detection":
							edgeClass = "typeA";
							break;
						case "predictive text mining":
							edgeClass = "typeB";
							break;
						case "inference":
							edgeClass = "typeC";
							break;
						default:
							edgeClass = "";
							break;
					}

					cy.add({
						data: {
							id: d['interaction_id'],
							source: i_a,
							target: i_b,
							type_name: d['type'],
							method_name: d['method']
						},
						classes: edgeClass
					})
				});
			});

			// cy.layout({name: 'circle'});
			cy.layout({name: 'cola', userConstIter: 1});
		}
	})
});