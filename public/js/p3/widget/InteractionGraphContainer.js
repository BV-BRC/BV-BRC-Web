define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/topic",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dijit/popup", "dijit/TooltipDialog",
	"cytoscape/dist/cytoscape.min", "jquery", "cytoscape-panzoom", "cytoscape-context-menus",
	"webcola/WebCola/cola.min", "cytoscape-cola", "dagre/dist/dagre", "cytoscape-dagre", "cytoscape-cose",
	"./ContainerActionBar", "./InteractionOps", "FileSaver"
], function(declare, lang,
			on, Topic,
			BorderContainer, ContentPane, popup, TooltipDialog,
			cytoscape, $, cyPanzoom, cyContextMenus,
			cola, cyCola, dagre, cyDagre, cyCose,
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
	if(typeof cytoscape('core', 'context-menus') !== 'function'){
		cyContextMenus(cytoscape, $);
	}
	if(typeof cytoscape('core', 'cola') !== 'function'){
		cyCola(cytoscape, cola);
	}
	if(typeof cytoscape('core', 'dagre') !== 'function'){
		cyDagre(cytoscape, dagre);
	}
	if(typeof cytoscape('core', 'cose-bilkent') !== 'function'){
		cyCose(cytoscape);
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
								'border-color': '#666666',
								'border-width': 1,
								'border-opacity': 0.8,
								// background
								'background-color': '#99CCFF'
							}
						}, {
							selector: 'node:selected',
							style: {
								'border-color': '#BBBB55',
								'shadow-color': '#FFFF33',
								'shadow-blur': 30,
								'shadow-opacity': 1
							}
						}, {
							selector: 'edge',
							style: {
								width: 2,
								'background-color': '#555555',
								'curve-style': 'bezier'
							}
						}, {
							selector: 'edge:selected',
							style: {
								'line-color': '#BBBB55',
								'shadow-color': '#FFFF33',
								'shadow-blur': 12,
								'shadow-opacity': 1
							}
						}
					]
				});

				cy.panzoom();

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
					var i_a = d.interactor_a;
					var i_b = d.interactor_b;

					if(cy.getElementById(i_a).empty()){
						cy.add(createInteractorCyEle(d, 'a'));
					}
					if(cy.getElementById(i_b).empty()){
						cy.add(createInteractorCyEle(d, 'b'));
					}

					cy.add({
						data: {
							id: d['interaction_id'],
							source: i_a,
							target: i_b,
							type_name: d['type_name'],
							method_name: d['method_name']
						}
					})
				});
			});

			// cy.layout({name: 'circle'});
			cy.layout({name: 'cola', userConstIter: 1});
		}
	})
});