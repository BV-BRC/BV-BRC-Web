define("p3/widget/Phylogeny", [
	"dojo/_base/declare", "phyloview/PhyloTree", "phyloview/TreeNavSVG",
	"dijit/_WidgetBase", "dojo/request", "dojo/dom-construct", "dojo/_base/lang",
	"dojo/dom-geometry", "dojo/dom-style", "d3/d3", "../util/PathJoin",
	"dijit/form/DropDownButton", "dijit/DropDownMenu", "dijit/form/Button",
	"dijit/MenuItem", "dijit/TooltipDialog", "dijit/popup", "./SelectionToGroup",
	"dijit/Dialog", "./ItemDetailPanel", "dojo/query", "FileSaver",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/BorderContainer",
	"dijit/layout/ContentPane", "dojo/dom-class", "dojo/on", "dojo/topic"
], function(declare, PhyloTree, TreeNavSVG,
			WidgetBase, request, domConstruct,
			lang, domGeometry, domStyle, d3, PathJoin,
			DropDownButton, DropDownMenu,
			Button, MenuItem, TooltipDialog, popup,
			SelectionToGroup, Dialog, ItemDetailPanel, query, saveAs,
			ActionBar, ContainerActionBar, BorderContainer,
			ContentPane, domClass, on, Topic){

	var infoMenu = new TooltipDialog({
		content: "<div> Create groups and download sequences by making a selection in the tree on the left.</div>",
		onMouseLeave: function(){
			popup.close(infoMenu);
		}
	});

	var idMenu = new TooltipDialog({
		content: "",
		onMouseLeave: function(){
			popup.close(idMenu);
		}
	});

	var snapMenu = new TooltipDialog({
		content: "",
		onMouseLeave: function(){
			popup.close(snapMenu);
		}
	});

	return declare([BorderContainer], {
		"baseClass": "Phylogeny",
		type: "rectangular",
		state: null,
		taxon_id: null,
		newick: null,
		labels: null,
		jsonTree: null,
		tree: null,
		apiServer: window.App.dataAPI,
		phylogram: true,
		containerType: "genome_data",
		selection: null,
		tooltip: 'The "Phylogeny" tab provides order or genus level phylogenetic tree, constructed using core protein families',
		startup: function(){
			this.containerPane = new ContentPane({region: "center"});//domConstruct.create("div", {id: this.id + "_canvas"}, this.domNode);
			this.containerActionBar = new ContainerActionBar({
				region: "top",
				splitter: false,
				content: "",
				style: "height: 42px; margin:0px;padding:0px; overflow: hidden; vertical-align:middle;",
				"className": "TextTabButtons"
			});
			this.selectionActionBar = new ActionBar({
				region: "right",
				layoutPriority: 4,
				style: "width:56px;text-align:center;",
				splitter: false,
				currentContainerWidget: this
			});
			this.itemDetailPanel = new ItemDetailPanel({
				region: "right",
				style: "width:300px",
				splitter: true,
				layoutPriority: 1,
				containerWidget: this
			});
			this.addChild(this.containerActionBar);
			this.addChild(this.selectionActionBar);
			this.addChild(this.containerPane);
			// this.addChild(this.itemDetailPanel);
			this.itemDetailPanel.startup();

			var menuDiv = domConstruct.create("div", {style: "display: inline-block"}, this.containerActionBar.pathContainer);
			this.treeHeader = domConstruct.create("div", {style: "margin-left: 20px; display: inline-block"}, this.containerActionBar.pathContainer);
			var typeMenuDom = domConstruct.create("div", {}, menuDiv);
			var typeMenu = new DropDownMenu({style: "display: none;"});
			typeMenu.addChild(new MenuItem({
				label: "phylogram", onClick: lang.hitch(this, function(){
					this.setTreeType("phylogram")
				})
			}));
			typeMenu.addChild(new MenuItem({
				label: "cladogram", onClick: lang.hitch(this, function(){
					this.setTreeType("cladogram")
				})
			}));
			typeMenu.startup();
			this.typeButton = new DropDownButton({
				name: "typeButton",
				label: this.phylogram ? "phylogram" : "cladogram",
				dropDown: typeMenu
			}, typeMenuDom);
			this.typeButton.startup();
			this.setupActions();
			on(idMenu.domNode, "click", lang.hitch(this, function(evt){
				var rel = evt.target.attributes.rel.value;
				var sel = idMenu.selection;
				delete idMenu.selection;

				this.tree.selectLabels(rel);
				popup.close(idMenu);
			}));

			on(snapMenu.domNode, "click", lang.hitch(this, function(evt){
				var rel = evt.target.attributes.rel ? evt.target.attributes.rel.value : null;
				var sel = snapMenu.selection;
				delete snapMenu.selection;
				if(rel == "tree-svg"){
					// console.log("this...",this);
					// console.log("this.tree.svgContainer[0]...",this.tree.svgContainer[0]);
					// console.log("this.tree.svgContainer[0][0].outerHTML...",this.tree.svgContainer[0][0].outerHTML);
					// console.log("[query(svg)[0]...",query("svg")[0]);
					// saveAs(new Blob([query("svg")[0].outerHTML]), "PATRIC_phylogeny_tree.svg"); // there are multiple svg images from other tabs that may affect this
					saveAs(new Blob([this.tree.svgContainer[0][0].outerHTML]), "PATRIC_phylogeny_tree.svg");
				}
				else if(rel == "tree-newick"){
					saveAs(new Blob([this.newick]), "PATRIC_phylogeny_tree.nwk");
				}
				popup.close(snapMenu);
			}));
			//this.typeButton = domConstruct.create("input",{type:"button",value:"phylogram"},menuDiv);
			//this.supportButton = domConstruct.create("input", {type: "button", value: "show support"}, menuDiv);
			//this.groupButton = domConstruct.create("input", {type: "button", value: "create genome group"}, menuDiv);
			//this.imageButton = domConstruct.create("input", {type: "button", value: "save image"}, menuDiv);
			this.treeDiv = domConstruct.create("div", {id: this.id + "tree-container"}, this.containerPane.domNode);
			this.watch("state", lang.hitch(this, "onSetState"));
			this.watch("taxon_id", lang.hitch(this, "onSetTaxonId"))
			this.watch("newick", lang.hitch(this, "processTree"))
			this.watch("selection", lang.hitch(this, "onSelection"));

		},

		noData: function(){
			domClass.add(this.typeButton.domNode, "dijitHidden");
			this.treeDiv.innerHTML = "There is no tree currently available";
		},

		onSelection: function(){

			var cur = this.selection.map(lang.hitch(this, function(selected){
				return {"genome_id": selected.id}
			}));

			this.selectionActionBar.set("selection", cur);

			if(cur.length == 1){
				request.get(PathJoin(this.apiServer, "genome", cur[0].genome_id), {
					headers: {
						accept: "application/json"
					},
					handleAs: "json"
				}).then(lang.hitch(this, function(record){
					this.itemDetailPanel.set('selection', [record]);
				}));
			}
			else{
				this.itemDetailPanel.set('selection', cur);
			}
		},

		onSetState: function(attr, oldVal, state){
			//this.treeDiv.innerHTML= "Loading...";
			console.log("Phylogeny onSetState: ", state);
			if(!state){
				return;
			}

			if(state.taxon_id){
				this.set('taxon_id', state.taxon_id)
			}else if(state.genome){
				this.set("taxon_id", state.genome.taxon_id);
			}else if(state.taxonomy){
				this.set("taxon_id", state.taxonomy.taxon_id);
			}
		},

		onSetTaxonId: function(attr, oldVal, taxonId){
			request.get(PathJoin(this.apiServer, "taxonomy", taxonId), {
				headers: {accept: "application/newick+json"},
				handleAs: "json"
			}).then(lang.hitch(this, function(treeDat){
				// console.log("Set Newick");
                this.processTreeData(treeDat);
			}), lang.hitch(this, function(err){
				this.noData();
				console.log("Error Retreiving newick for Taxon: ", err)
			}));
		},

        processTreeData: function(treeDat){
            if(!treeDat.tree){
                console.log("No newick+json in Request Response");
                return;
            }
            if(treeDat.labels){
                this.set('labels', treeDat.labels);
            }
            if(treeDat.info){
                headerParts = [];
                if(treeDat.info.taxon_name && treeDat.info.taxon_name != "unknown"){
                    headerParts.push(treeDat.info.taxon_name);
                }
                if(treeDat.info.taxon_rank && treeDat.info.taxon_rank != "unknown"){
                    headerParts.push(treeDat.info.taxon_rank + " level tree");
                }
                if(treeDat.info.count){
                    headerParts.push("(" + String(treeDat.info.count) + " genomes)");
                }
                this.treeHeader.innerHTML = headerParts.join(" ");
            }

            this.set('newick', treeDat.tree);
        },

		processTree: function(){
			if(!this.newick){
				console.log("No Newick File To Render")
				return;
			}
			domClass.remove(this.typeButton.domNode, "dijitHidden");
			if(!this.tree){

				this.tree = new TreeNavSVG({
					selectionTarget: this
				});
				this.tree.d3Tree("#" + this.id + "tree-container", {
					colorGenus: true,
					phylogram: this.phylogram,
					fontSize: 10
				});
			}

			var idMenuDivs = [];
			if(this.labels){
				this.tree.setTree(this.newick, this.labels, "Organism Names");
				idMenuDivs.push('<div class="wsActionTooltip" rel="' + "Organism Names" + '">' + "Organism Names" + '</div>');
				idMenuDivs.push('<div class="wsActionTooltip" rel="' + "Default ID" + '">' + "Genome ID" + '</div>');
			}
			else{
				this.tree.setTree(this.newick);
				idMenuDivs.push('<div class="wsActionTooltip" rel="' + "Default ID" + '">' + "Genome ID" + '</div>');
			}
			idMenu.set("content", idMenuDivs.join(""));
			this.tree.startup();
		},

		setTreeType: function(treeType){
			if(this.phylogram && treeType == "cladogram"){
				this.togglePhylo();
			}
			else if((!this.phylogram) && treeType == "phylogram"){
				this.togglePhylo();
			}
		},

		togglePhylo: function(){
			this.phylogram = !this.phylogram;
			this.tree.setPhylogram(this.phylogram);
			this.typeButton.set("label", this.phylogram ? "phylogram" : "cladogram");
		},

		updateTree: function(){
			if(!this.tree){
				console.log("No tree to update")
				return;
			}
			//this.tree.update();
		},

		renderTree: function(){
			if(!this.newick){
				console.log("No Newick File To Render")
				return;
			}
			console.log("D3: ", d3);
		},

		onFirstView: function(){
			this.updateTree();
		},

		selectionActions: [
			[
				"ToggleItemDetail",
				"fa icon-chevron-circle-left fa-2x",
				{
					label: "DETAILS",
					persistent: true,
					validTypes: ["*"],
					tooltip: "Toggle Details Pane"
				},
				function(selection, container, button){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					var children = this.getChildren();
					// console.log("Children: ", children);
					if(children.some(function(child){
							return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
						}, this)){
						// console.log("Remove Item Detail Panel");
						this.removeChild(this.itemDetailPanel);
						console.log("Button Node: ", button)

						query(".ActionButtonText", button).forEach(function(node){
							node.innerHTML = "DETAILS";
						})

						query(".ActionButton", button).forEach(function(node){
							console.log("ActionButtonNode: ", node)
							domClass.remove(node, "icon-chevron-circle-right");
							domClass.add(node, "icon-chevron-circle-left");
						})
					}
					else{
						// console.log("Re-add child: ", this.itemDetailPanel);
						this.addChild(this.itemDetailPanel);

						query(".ActionButtonText", button).forEach(function(node){
							node.innerHTML = "HIDE";
						})

						query(".ActionButton", button).forEach(function(node){
							console.log("ActionButtonNode: ", node)
							domClass.remove(node, "icon-chevron-circle-left");
							domClass.add(node, "icon-chevron-circle-right");
						})
					}
				},
				true
			],
			[
				"IDSelection",
				"fa icon-pencil-square fa-2x",
				{
					label: "ID TYPE",
					persistent: true,
					validTypes: ["*"],
					validContainerTypes: ["*"],
					tooltip: "Set ID Type",
					tooltipDialog: idMenu,
					ignoreDataType: true
				},
				function(selection){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					idMenu.selection = selection;
					// console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
					popup.open({
						popup: this.selectionActionBar._actions.IDSelection.options.tooltipDialog,
						around: this.selectionActionBar._actions.IDSelection.button,
						orient: ["below"]
					});
				},
				true
			], [
				"ViewGenomeItemFromGenome",
				"MultiButton fa icon-selection-Genome fa-2x",
				{
					label: "GENOME",
					validTypes: ["*"],
					multiple: false,
					tooltip: "Switch to Genome View. Press and Hold for more options.",
					validContainerTypes: ["genome_data"],
					pressAndHold: function(selection, button, opts, evt){
						console.log("PressAndHold");
						console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({perspectiveUrl: "/view/Genome/" + selection[0].genome_id}),
							around: button,
							orient: ["below"]
						});

					}
				},
				function(selection){
					var sel = selection[0];
					// console.log("sel: ", sel)
					// console.log("Nav to: ", "/view/Genome/" + sel.genome_id);
					Topic.publish("/navigate", {
						href: "/view/Genome/" + sel.genome_id,
						target: "blank"
					});
				},
				false
			],
			[
				"ViewGenomeItems",
				"MultiButton fa icon-selection-GenomeList fa-2x",
				{
					label: "GENOMES",
					validTypes: ["*"],
					multiple: true,
					min: 2,
					max: 1000,
					tooltip: "Switch to Genome List View. Press and Hold for more options.",
					ignoreDataType: true,
					validContainerTypes: ["genome_data", "sequence_data", "feature_data", "spgene_data", "sequence_data"],
					pressAndHold: function(selection, button, opts, evt){
						var map = {};
						selection.forEach(function(sel){
							if(!map[sel.genome_id]){
								map[sel.genome_id] = true
							}
						})
						var genome_ids = Object.keys(map);
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "GenomeList",
								perspectiveUrl: "/view/GenomeList/?in(genome_id,(" + genome_ids.join(",") + "))"
							}),
							around: button,
							orient: ["below"]
						});

					}
				},
				function(selection){
					var map = {};
					selection.forEach(function(sel){
						if(!map[sel.genome_id]){
							map[sel.genome_id] = true
						}
					})
					var genome_ids = Object.keys(map);
					Topic.publish("/navigate", {href: "/view/GenomeList/?in(genome_id,(" + genome_ids.join(",") + "))"});
				},
				false
			],
			[
				"AddGroup",
				"fa icon-object-group fa-2x",
				{
					label: "GROUP",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					tooltip: "Add selection to a new or existing group",
					validContainerTypes: ["*"]
				},
				function(selection, containerWidget){
					// console.log("Add Items to Group", selection);
					var dlg = new Dialog({title: "Add selected items to group"});
					var type = "genome_group";

					if(!type){
						console.error("Missing type for AddGroup")
						return;
					}
					var stg = new SelectionToGroup({
						selection: selection,
						type: type,
						idType: "genome_id",
						path: null //set by type
					});
					on(dlg.domNode, "dialogAction", function(evt){
						dlg.hide();
						setTimeout(function(){
							dlg.destroy();
						}, 2000);
					});
					domConstruct.place(stg.domNode, dlg.containerNode, "first");
					stg.startup();
					dlg.startup();
					dlg.show();
				},
				false
			], [
				"Snapshot",
				"fa icon-download fa-2x",
				{
					label: "DWNLD",
					persistent: true,
					validTypes: ["*"],
					validContainerTypes: ["*"],
					tooltip: "Save an image",
					tooltipDialog: snapMenu,
					ignoreDataType: true
				},
				function(selection){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					var snapMenuDivs = [];
					snapMenuDivs.push('<div class="wsActionTooltip" rel="tree-svg">' + "Tree svg" + '</div>');
					snapMenuDivs.push('<div class="wsActionTooltip" rel="tree-newick">' + "Tree newick" + '</div>');

					snapMenu.set("content", snapMenuDivs.join(""));
					snapMenu.selection = selection;
					// console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
					popup.open({
						popup: this.selectionActionBar._actions.Snapshot.options.tooltipDialog,
						around: this.selectionActionBar._actions.Snapshot.button,
						orient: ["below"]
					});
				},
				true
			]
		],

		setupActions: function(){
			if(this.containerActionBar && this.containerActions){
				this.containerActions.forEach(function(a){
					this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
				}, this);
			}

			this.selectionActions.forEach(function(a){
				this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
			}, this);

		}

	});
});
