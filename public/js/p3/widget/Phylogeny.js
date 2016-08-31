define([
	"dojo/_base/declare", "phyloview/PhyloTree", "phyloview/TreeNavSVG",
	"dijit/_WidgetBase", "dojo/request", "dojo/dom-construct", "dojo/_base/lang",
	"dojo/dom-geometry", "dojo/dom-style", "d3/d3", "../util/PathJoin",
	"dijit/form/DropDownButton", "dijit/DropDownMenu", "dijit/form/Button",
	"dijit/MenuItem", "dijit/TooltipDialog", "dijit/popup", "./SelectionToGroup",
    "dijit/Dialog", "./ItemDetailPanel", "dojo/query", "FileSaver",
    "./ActionBar", "./FilterContainerActionBar", "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane", "dojo/dom-class", "dojo/on"
], function(declare, PhyloTree, TreeNavSVG,
			WidgetBase, request, domConstruct,
			lang, domGeometry, domStyle, d3, PathJoin,
			DropDownButton, DropDownMenu, 
            Button,	MenuItem, TooltipDialog, popup,
            SelectionToGroup, Dialog, ItemDetailPanel, query, saveAs,
            ActionBar, ContainerActionBar, BorderContainer,
            ContentPane, domClass, on){

        var infoMenu = new TooltipDialog({
            content: "<div> Create groups and download sequences by making a selection in the tree on the left.</div>",
            onMouseLeave:function(){
                popup.close(infoMenu);
            }
        });
		

        var idMenu = new TooltipDialog({
            content: "",
            onMouseLeave:function(){
                popup.close(idMenu);
            }
        });


        var snapMenu = new TooltipDialog({
            content: "",
            onMouseLeave:function(){
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
		selection: null,		

		startup: function(){
			this.containerPane = new ContentPane({region:"center"});//domConstruct.create("div", {id: this.id + "_canvas"}, this.domNode);
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
				layoutPriority: 1
			});
			this.addChild(this.selectionActionBar);
			this.addChild(this.containerPane);
			//this.addChild(this.itemDetailPanel);
            //this.itemDetailPanel.startup();

			var menuDiv = domConstruct.create("div", {}, this.containerPane.domNode);
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
                var rel = evt.target.attributes.rel ? evt.target.attributes.rel.value: null;
                var sel = snapMenu.selection;
                delete snapMenu.selection;
                if (rel == "tree-svg"){
                    saveAs(new Blob([query("svg")[0].outerHTML]), "patric_tree.svg");
                }
                else if (rel == "tree-newick"){
                    saveAs(new Blob([this.newick]), "patric_tree.nwk");
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

        onSelection: function(){

            var cur = this.selection.map(lang.hitch(this, function(selected){
                return {"genome_id":selected.id}
            }));
            this.selectionActionBar._setSelectionAttr(cur);
		},

		onSetState: function(attr, oldVal, state){
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
				console.log("Set Newick");
				if(!treeDat.tree){
					console.log("No newick+json in Request Response");
					return;
				}
                if(treeDat.labels){
                    this.set('labels', treeDat.labels);
                }
				this.set('newick', treeDat.tree);
			}), function(err){
				console.log("Error Retreiving newick for Taxon: ", err)
			});
		},

		processTree: function(){
			if(!this.newick){
				console.log("No Newick File To Render")
				return;
			}
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

            var idMenuDivs=[];
            if( this.labels){
			    this.tree.setTree(this.newick, this.labels, "Organism Names");
                idMenuDivs.push('<div class="wsActionTooltip" rel="'+"Organism Names"+'">'+"Organism Names"+'</div>');
                idMenuDivs.push('<div class="wsActionTooltip" rel="'+"Default ID"+'">'+"Genome ID"+'</div>');
            }
            else{
			    this.tree.setTree(this.newick);
                idMenuDivs.push('<div class="wsActionTooltip" rel="'+"Default ID"+'">'+"Genome ID"+'</div>');
            }
            idMenu.set("content",idMenuDivs.join(""));
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
                function(selection,container,button){
                        // console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

                        var children = this.getChildren();
                        // console.log("Children: ", children);
                        if(children.some(function(child){
                                        return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
                                }, this)){
                                // console.log("Remove Item Detail Panel");
                                this.removeChild(this.itemDetailPanel);
                                console.log("Button Node: ", button)

                                query(".ActionButtonText",button).forEach(function(node){
                                        node.innerHTML="DETAILS";
                                })

                                query(".ActionButton",button).forEach(function(node){
                                        console.log("ActionButtonNode: ",node)
                                        domClass.remove(node, "icon-chevron-circle-right");
                                        domClass.add(node, "icon-chevron-circle-left");
                                })
                        }
                        else{
                                // console.log("Re-add child: ", this.itemDetailPanel);
                                this.addChild(this.itemDetailPanel);

                                query(".ActionButtonText",button).forEach(function(node){
                                        node.innerHTML="HIDE";
                                })

                                query(".ActionButton",button).forEach(function(node){
                                        console.log("ActionButtonNode: ",node)
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
                    validContainerTypes:["*"],
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
			],
            [
				"AddGroup",
				"fa icon-object-group fa-2x",
				{
					label: "GROUP",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					tooltip: "Copy selection to a new or existing group",
                    validContainerTypes:["*"]
				},
				function(selection, containerWidget){
					// console.log("Add Items to Group", selection);
					var dlg = new Dialog({title: "Copy Selection to Group"});
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
                    validContainerTypes:["*"],
					tooltip: "Save an image",
                    tooltipDialog: snapMenu,
                    ignoreDataType: true
				},
				function(selection){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

                    var snapMenuDivs=[];
                    snapMenuDivs.push('<div class="wsActionTooltip" rel="tree-svg">'+"Tree svg"+'</div>');
                    snapMenuDivs.push('<div class="wsActionTooltip" rel="tree-newick">'+"Tree newick"+'</div>');


                    snapMenu.set("content",snapMenuDivs.join(""));
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
			if(this.containerActionBar){
				this.containerActions.forEach(function(a){
					this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
				}, this);
			}

			this.selectionActions.forEach(function(a){
				this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
			}, this);

		},


	});
});
