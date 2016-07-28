define([
	"dojo/_base/declare", "./Base", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "dojo/_base/Deferred",
	"dojo/request", "dojo/_base/lang", "dojo/when",
	"../ActionBar", "../FilterContainerActionBar", "phyloview/PhyloTree",
	"d3/d3", "phyloview/TreeNavSVG", "../../util/PathJoin", "dijit/form/Button",
	"dijit/MenuItem", "dijit/TooltipDialog", "dijit/popup", "../SelectionToGroup",
    "dijit/Dialog", "../ItemDetailPanel", "dojo/query", "FileSaver"
], function(declare, Base, on, Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, Deferred,
			xhr, lang, when,
			ActionBar, ContainerActionBar, PhyloTree,
			d3, d3Tree, PathJoin, Button,
			MenuItem, TooltipDialog, popup,
            SelectionToGroup, Dialog, ItemDetailPanel, Query, saveAs){

        var schemes = [{
            name: "Zappo", id: "zappo"
        },
        {
            name: "Taylor",
            id: "taylor"
        },
        {
            name: "Hydrophobicity",
            id: "hydro"
        },
        {
            name: "Lesk",
            id: "lesk"
        },
        {
            name: "Cinema",
            id: "cinema"
        },
        {
            name: "MAE",
            id: "mae"
        },
        {
            name: "Clustal",
            id: "clustal"
        },
        {
            name: "Clustal2",
            id: "clustal2"
        },
        {
            name: "Turn",
            id: "turn"
        },
        {
            name: "Strand",
            id: "strand"
        },
        {
            name: "Buried",
            id: "buried"
        },
        {
            name: "Helix",
            id: "helix"
        },
        {
            name: "Nucleotide",
            id: "nucleotide"
        },
        {
            name: "Purine",
            id: "purine"
        },
        {
            name: "PID",
            id: "pid"
        },
        {
            name: "No color",
            id: "foo"
        }];

        //var noMenu = ["10_import", "15_ordering", "20_filter", "30_selection","40_vis", "70_extra", "90_help", "95_debug"];
        //noMenu.forEach(function(toRemove){delete defMenu.views[toRemove];});
        //m.addView("menu", defMenu);

        //this.typeButton = new Button({label:this.phylogram ? "cladogram" : "phylogram",onClick:lang.hitch(this, this.togglePhylo)}, this.typeButtonDom);
        var colorMenuDivs = [];

        schemes.forEach(lang.hitch(this, function(scheme){
            colorMenuDivs.push('<div class="wsActionTooltip"  rel="'+scheme.id+'">'+scheme.name+'</div>');
        }));

        var colorMenu = new TooltipDialog({
            content: colorMenuDivs.join(""),
            onMouseLeave:function(){
                popup.close(colorMenu);
            }
        });


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

	return declare([Base], {
		"baseClass": "Phylogeny",
		"disabled": false,
		"query": null,
		"loading": false,
		data: null,
		dataMap: {},
		tree: null,
		phylogram: false,
		maxSequences: 500,
        numSequences: 0,
        selection: null,
		onSetLoading: function(attr, oldVal, loading){
			if(loading){
				this.contentPane.set("content", "<div>Performing Multiple Sequence Alignment. Please Wait...</div>");
			}
		},
		checkSequenceCount: function(query){
			var q = query + "&limit(1)";
			var def = new Deferred();
			var url = PathJoin(this.apiServiceUrl, "genome_feature") + "/";
			console.log("CheckSeqCount URL: ", url);
			xhr.post(url, {
				data: q,
				headers: {
					"accept": "application/solr+json",
					"content-type": "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(res){
				console.log("Check Res: ", res.response.numFound)
				if(res && res.response && (typeof res.response.numFound != 'undefined') && (res.response.numFound < this.maxSequences)){
					console.log("  Amount OK")
                    this.numSequences = res.response.numFound;
					def.resolve(res.response.numFound);
					return;
				}
				console.log("   TOO Many Sequences");
				def.reject(res.response.numFound);
			}));

			return def.promise;
		},
		onSetState: function(attr, oldVal, state){
			console.log("MSA Viewer onSetState: ", state);
			if(state && state.search){
				when(this.checkSequenceCount(state.search), lang.hitch(this, function(count){
					console.log("CHECK SEQ COUNT ok: ", count)
					if(count < 2){
						this.showError("There must be at least two matching sequences for a query.  Your query found " + count + " sequences.");
					}else{
						this.doAlignment()
					}
				}), lang.hitch(this, function(count){
					this.showError("There are too many sequences in your query results (" + count + ").  Please reduce to below 500 Sequences.");
				}))
			}
		},

		showError: function(msg){
			this.contentPane.set('content', '<div style="background:red; color: #fff;">' + msg + "</div>");
		},
		onSetData: function(attr, oldVal, data){
			this.createDataMap();
			this.render();
		},

        onSelection: function(){

            var cur = this.selection.map(lang.hitch(this, function(selected){
                return this.dataMap[selected.id];
            }));
            this.selectionActionBar._setSelectionAttr(cur);
        },

		createDataMap: function(){
			var geneID = null;
			var clustal = ["CLUSTAL"];
            this.alt_labels={};
            this.dataMap["idType"]=null;
			this.data.alignment.split("\n").forEach(function(line){
				if(line.slice(0, 1) == ">"){
					var regex = /^>([^\s]+)\s+\[(.*?)\]/g;
					var match;
					var headerInfo = regex.exec(line);
                    var record ={sequence:[]};
					if(!(headerInfo[1] in this.dataMap)){
						geneID = headerInfo[1];
						clustal.push(geneID + "\t");
                        if (geneID.startsWith("fig|")){
                            record["patric_id"]=geneID;
                            if (this.dataMap["idType"] == null){
                                this.dataMap["idType"]="patric_id";
                            }

                        }
                        else {
                            record["feature_id"]=geneID;
                            if (this.dataMap["idType"] == null){
                                this.dataMap["idType"]="feature_id";
                            }
                        }
                        record["genome_name"]=this.data.map[headerInfo[2]];
                        record["genome_id"]=headerInfo[2];
						this.dataMap[geneID] = record;
                        this.alt_labels[geneID]=this.data.map[geneID]["genome_name"];
					}
				}
				else if(line.trim() != "" && geneID in this.dataMap){
					this.dataMap[geneID].sequence.push(line);
					clustal[clustal.length - 1] = clustal[clustal.length - 1] + line;
				}
				else{
					geneID = null;
				}
			}, this);
			this.dataMap.clustal = clustal.join("\n");
		},

		createViewerData: function(){
			results = {};
		},




		render: function(){
			this.contentPane.set("content", "");
			var menuDiv = domConstruct.create("div", {}, this.contentPane.containerNode);
			var combineDiv = domConstruct.create("table", {"style": {"width": "100%"}}, this.contentPane.containerNode);//domConstruct.create("div",{"style":{"width":"100%"}},this.contentPane.containerNode);
			var combineRow = domConstruct.create("tr", {}, combineDiv);
			var cell1 = domConstruct.create("td", {"width": "30%"}, combineRow);
			var cell2 = domConstruct.create("td", {"width": "70%"}, combineRow);
			var treeDiv = domConstruct.create("div", {id: this.id + "tree-container"}, cell1);
			treeDiv.setAttribute("style", "padding-top:106px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;");
			var msaDiv = domConstruct.create("div", {"style": {"width": "100%"}}, cell2);
			msaDiv.style.display = "inline-block";
			//msaDiv.style.width="64%";
			//msaDiv.style.overflowX="scroll";
			msaDiv.style.overflowY = "hidden";
			msaDiv.style.verticalAlign = "bottom";
			msaDiv.style.paddingBottom = "10px";

			//domConstruct.place(menuDiv,this.contentPane.containerNode,"last");
			//domConstruct.place(combineDiv,this.contentPane.containerNode,"last");
			//domConstruct.place(combineDiv,treeDiv,"last");
			//domConstruct.place(combineDiv,msaDiv,"last");
			//this.contentPane.set('content', "<pre>" + JSON.stringify(this.data,null,3) + "</pre>");
			var msa_models = {
				seqs: msa.io.clustal.parse(this.dataMap.clustal)
			};

			var opts = {};
			// set your custom properties
			// @see: https://github.com/greenify/biojs-vis-msa/tree/master/src/g
			opts.seqs = msa_models.seqs;
			opts.el = msaDiv;
			opts.bootstrapMenu = false;
			opts.vis = {
				conserv: false,
				overviewbox: false,
				seqlogo: true,
				sequences: true,
				labelName: false,
				labelId: false,
			};
			opts.conf = {
				dropImport: true,
				registerWheelCanvas: false,
				registerMouseHover: false,
				debug: true
			};
			opts.zoomer = {
				menuFontsize: "12px",
				autoResize: true,
				labelNameLength: 150,
				alignmentHeight: 14.04*this.numSequences,
				//alignmentWidth: msa_models.seqs[0].seq.length*15.1,
				residueFont: "12",
				rowHeight: 14.04
			};

			// init msa
			var m = new msa.msa(opts);

			this.tree = new d3Tree({selectionTarget:this});
			this.tree.d3Tree("#" + this.id + "tree-container", {phylogram: this.phylogram, fontSize: 12});
			this.tree.setTree(this.data.tree);
			//this.tree.setTree(this.data.tree);
            
            this.tree.addLabels(this.alt_labels, "Organism Names");
            var idMenuDivs=[];
            Object.keys(this.tree.labelLabels).forEach(lang.hitch(this, function(labelAlias){
                idMenuDivs.push('<div class="wsActionTooltip" rel="'+labelAlias+'">'+labelAlias+'</div>');
            }));
            idMenu.set("content",idMenuDivs.join(""));


            this.tree.startup();
            this.tree.selectLabels("Organism Names");
            this.tree.update();

			var menuOpts = {};
			menuOpts.el = menuDiv;
			//var msaDiv = document.getElementById('msaDiv');
			msaDiv.setAttribute("style", "white-space: nowrap;");
			menuOpts.msa = m;
			var defMenu = new msa.menu.defaultmenu(menuOpts);



            on(colorMenu.domNode, "click", function(evt){
                var rel = evt.target.attributes.rel.value;
                var sel = colorMenu.selection;
                delete colorMenu.selection;
                var idType;

                var ids = sel.map(function(d, idx){
                    if(!idType){
                        if(d['feature_id']){
                            idType = "feature_id";
                        }else if(d['patric_id']){
                            idType = "patric_id"
                        }else if(d['alt_locus_tag']){
                            idType = "alt_locus_tag";
                        }
                        // console.log("SET ID TYPE TO: ", idType)
                    }

                    return d[idType];
                });
                m.g.colorscheme.set("scheme", rel)
                popup.close(colorMenu);
            });


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
                if (rel == "msa"){ 
                    msa.utils.export.saveAsImg(m,"patric_msa.png");
                }
                else if (rel == "msa-txt"){
                    saveAs(new Blob([this.dataMap.clustal]), "msa_patric.txt");
                }
                else if (rel == "tree-svg"){
                    saveAs(new Blob([Query("svg")[0].outerHTML]), "msa_tree.svg");
                }
                else if (rel == "tree-newick"){
                    saveAs(new Blob([this.data.tree]), "msa_tree.nwk");
                }
                popup.close(snapMenu);
            }));


			//var groupButton = new DropDownButton({
			//	name: "groupButton",
			//	label: "Add Group",
			//	dropDown: groupMenu
			//}, idMenuDom).startup();
			
            //this.imageButton = domConstruct.create("input", {type: "button", value: "save image"}, menuDiv);
			m.render();
			//var msaDiv2=document.getElementsByClassName("biojs_msa_seqblock")[0];
			//var ctx = msaDiv2.getContext("2d");
			//ctx.fillStyle = "#FF0000";
			//ctx.fillRect(0,0,150,75);

			//m.el.parentElement.parentElement.parentElement.insertBefore(menuOpts.el, combineDiv);

			//m.el.parentElement.insertBefore(menuOpts.el, combineDiv);
			var initialHidden = 0;
			//var treeDiv2=document.getElementsByClassName("tnt_groupDiv");
			var treeHeight = parseInt(treeDiv.childNodes[0].getAttribute("height"));
			//var msaDiv=document.getElementsByClassName("biojs_msa_stage");
			//var msaDiv=document.getElementById("msaDiv");
			msaDiv.style.display = "inline-block";
			//msaDiv.style.width="64%";
			msaDiv.style.overflowX = "hidden";
			msaDiv.style.overflowY = "hidden";
			msaDiv.style.verticalAlign = "bottom";
			msaDiv.style.paddingBottom = "10px";
			msaDiv.style.height = (treeHeight + 115).toString() + "px";
			treeLoaded = true;
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
			//this.typeButton.set("label", this.phylogram ? "cladogram" : "phylogram");
		},

		doAlignment: function(){
			console.log("doAlignment()");
			this.set('loading', true);
			if(this.state && this.state.search){
				var q = this.state.search;

				console.log("RUN MSA Against: ", this.state.search)
				return when(window.App.api.data("multipleSequenceAlignment", [q]), lang.hitch(this, function(res){
					console.log("MSA Results: ", res);
					this.set('loading', false);
					this.set('data', res);
				}))
			}

		},
		postCreate: function(){
            this.inherited(arguments);
			this.contentPane = new ContentPane({"region": "center"});
			this.addChild(this.contentPane)
			this.selectionActionBar = new ActionBar({
				region: "right",
				layoutPriority: 4,
				style: "width:48px;text-align:center;",
				splitter: false,
				currentContainerWidget: this
			});
			this.addChild(this.selectionActionBar);
            this.setupActions();
		},


		selectionActions: [
			[
				"InfoButton",
				"fa icon-info-circle fa-2x",
				{
					label: "Info",
					persistent: true,
					validTypes: ["*"],
                    validContainerTypes:["*"],
					tooltip: "MSA Information",
                    tooltipDialog: infoMenu,
                    ignoreDataType: true
				},
				function(selection){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);
					// console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
					popup.open({
						popup: this.selectionActionBar._actions.InfoButton.options.tooltipDialog,
						around: this.selectionActionBar._actions.InfoButton.button,
						orient: ["below"]
					});
				},
				true
			],
			[
				"ColorSelection",
				"fa icon-paint-brush fa-2x",
				{
					label: "COLORS",
					persistent: true,
					validTypes: ["*"],
                    validContainerTypes:["*"],
					tooltip: "Selection Color",
                    tooltipDialog: colorMenu,
                    ignoreDataType: true
				},
				function(selection){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					colorMenu.selection = selection;
					// console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
					popup.open({
						popup: this.selectionActionBar._actions.ColorSelection.options.tooltipDialog,
						around: this.selectionActionBar._actions.ColorSelection.button,
						orient: ["below"]
					});
				},
				true
			],
		/*	[
				"IDSelection",
				"fa icon-pencil-square fa-2x",
				{
					label: "ID Type",
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
			],*/
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
					var type = "feature_data";

					if(!type){
						console.error("Missing type for AddGroup")
						return;
					}
					var stg = new SelectionToGroup({
						selection: selection,
						type: type,
                        inputType: "feature_data",
                        idType: this.dataMap.idType, 
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
                    snapMenuDivs.push('<div class="wsActionTooltip" rel="msa">MSA png</div>');
                    /*var encodedTree = window.btoa(unescape(encodeURIComponent(Query("svg")[0].outerHTML)));

                    var e = domConstruct.create("a", {
                        download: "MSATree.svg",
                        href: "data:image/svg+xml;base64,\n" + encodedTree,
                        style: {"text-decoration": "none", color: "black"},
                        innerHTML: "Tree svg",
                        alt: "ExportedMSATree.svg"
                    });

                    var clustalData = window.btoa(this.dataMap.clustal);
                    var clustalLink =domConstruct.create("a", {
                        download: "msa_patric.txt",
                        href: "data:text/plain;base64,\n" + clustalData,
                        style: {"text-decoration": "none", color: "black"},
                        innerHTML: "MSA txt",
                        alt: "export_msa.txt"
                    });

                    var treeData = window.btoa(this.data.tree);
                    var newickLink =domConstruct.create("a", {
                        download: "tree_newick.txt",
                        href: "data:text/plain;base64,\n" + treeData,
                        style: {"text-decoration": "none", color: "black"},
                        innerHTML: "Tree newick",
                        alt: "tree_newick.txt"
                    });*/
                    snapMenuDivs.push('<div class="wsActionTooltip" rel="msa-txt">'+"MSA txt"+'</div>');
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
		startup: function(){

			if(this._started){
				return;
			}

			this.watch("loading", lang.hitch(this, "onSetLoading"));
			this.watch("data", lang.hitch(this, "onSetData"));
			this.watch("selection", lang.hitch(this, "onSelection"));

			this.inherited(arguments);
		}
	})
});
