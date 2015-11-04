require({cache:{
'url:p3/widget/templates/IDMapping.html':"<div>\n\t<table class=\"idMappingTable\" style=\"width:300px\">\n\t<tbody>\n\t\t<tr><th class=\"idMappingHeader\">PATRIC Identifiers</th><th class=\"idMappingHeader\" >REFSEQ Identifiers</th></tr>\n\t\t<tr><td rel=\"seed_id\">SEED ID</td><td rel=\"refseq_locus_tag\">RefSeq Locus Tag</td></tr>\n\t\t<tr><td rel=\"feature_id\" >PATRIC ID</td><td rel=\"protein_id\">RefSeq</td></tr>\n\t\t<tr><td rel=\"alt_locus_tag\">Alt Locus Tag</td><td rel=\"gene_id\">Gene ID</td></tr>\n\t\t<tr><td></td><td rel=\"gi\">GI</td></tr>\n\t\t<tr><th class=\"idMappingHeader\" colspan=\"2\">Other Identifiers</th></tr>\n\t\t<tr><td rel=\"Allergome\">Allergome</td><td rel=\"BioCyc\">BioCyc</td></tr>\n\t\t<tr><td rel=\"DIP\">DIP</td><td rel=\"DisProt\">DisProt</td></tr>\n\t\t<tr><td rel=\"DrugBank\">DrugBank</td><td rel=\"ECO2DBASE\">ECO2DBASE</td></tr>\n\t\t<tr><td rel=\"EMBL\">EMBL</td><td rel=\"EMBL-CDS\">EMBL-CDS</td></tr>\n\t\t<tr><td rel=\"EchoBase\">EchoBASE</td><td rel='EcoGene'>EcoGene</td></tr>\n\t\t<tr><td rel=\"EnsemblGenome\">EnsemblGenome</td><td rel=\"EnsemblGenome_PRO\">EnsemblGenome_PRO</td></tr>\n\t\t<tr><td rel=\"EnsemblGenome_TRS\">EnsemblGenome_TRS</td><td rel=\"GeneTree\">GeneTree</td></tr>\n\t\t<tr><td rel=\"GenoList\">GenoList</td><td rel=\"GenomeReviews\">GenomeReviews</td></tr>\n\t\t<tr><td rel=\"HOGENOM\">HOGENOM</td><td rel=\"HSSP\">HSSP</td></tr>\n\t\t<tr><td rel=\"KEGG\">KEGG</td><td rel=\"LegioList\">LegioList</td></tr>\n\t\t<tr><td rel=\"Leproma\">Leproma</td><td rel=\"MEROPS\">MEROPS</td></tr>\n\t\t<tr><td rel=\"MINT\">MINT</td><td rel=\"NMPDR\">NMPDR</td></tr>\n\t\t<tr><td rel=\"OMA\">OMA</td><td rel=\"OrthoDB\">OrthoDB</td></tr>\n\t\t<tr><td rel=\"PDB\">PDB</td><td rel=\"PeroxiBase\">PeroxiBase</td></tr>\n\t\t<tr><td rel=\"PptaseDB\">PptaseDB</td><td rel=\"ProtClustDB\">ProtClustDB</td></tr>\n\t\t<tr><td rel=\"PsuedoCAP\">PseudoCAP</td><td rel=\"REBASE\">REBASE</td></tr>\n\t\t<tr><td rel=\"Reactome\">Reactome</td><td rel=\"RefSeq_NT\">RefSeq_NT</td></tr>\n\t\t<tr><td rel=\"TCDB\">TCDB</td><td rel=\"TIGR\">TIGR</td></tr>\n\t\t<tr><td rel=\"TubercuList\">TubercuList</td><td rel=\"UniParc\">UniParc</td></tr>\n\t\t<tr><td rel=\"UniProtKB-Accession\">UnitProtKB-Accesssion</td><td rel=\"UniRef100\">UniRef100</td></tr>\n\t\t<tr><td rel=\"UniProtKB-ID\">UnitProtKB-ID</td><td rel=\"UniRef100\">UniRef100</td></tr>\n\t\t<tr><td rel=\"UniRef50\">UniRef50</td><td rel=\"UniRef90\">UniRef90</td></tr>\n\t\t<tr><td rel=\"World-2DPAGE\">World-2DPAGE</td><td rel=\"eggNOG\">eggNOG</td></tr>\n\t</tbody>\n\t</table>\n</div>\n"}});
define("p3/widget/GridContainer", [
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar", "./FilterContainerActionBar", "dojo/_base/lang", "./ItemDetailPanel",
	"dojo/topic", "dojo/query", "dijit/layout/ContentPane","dojo/text!./templates/IDMapping.html",
	"dijit/Dialog","dijit/popup","dijit/TooltipDialog"
], function(declare, BorderContainer, on,
			ActionBar, ContainerActionBar, lang, ItemDetailPanel,
			Topic, query, ContentPane,IDMappingTemplate,
			Dialog,popup,TooltipDialog){

	var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><divi class="wsActionTooltip" rel="protein">View FASTA Proteins</div>'
	var viewFASTATT = new TooltipDialog({
		content: vfc, onMouseLeave: function() {
			popup.close(viewFASTATT);
		}
	});


	var idMappingTTDialog =  new TooltipDialog({content: IDMappingTemplate, onMouseLeave: function(){ popup.close(idMappingTTDialog); }})

	on(idMappingTTDialog.domNode, "TD:click", function(evt){
		var rel = evt.target.attributes.rel.value;
		console.log("REL: ", rel);
		var selection = self.actionPanel.get('selection')
		console.log("selection: ", selection);
		var ids = selection.map(function(d){ return d['feature_id']; });

		console.log("ID MAP ", ids)
		// xhr.post("/view/idmap, {
		// 	data: {
		// 		keyword: ids.join(","),
		// 		from: "feature_id",
		// 		fromGroup: "PATRIC",
		// 		to: rel,
		// 		toGroup: (["seed_id","feature_id","alt_locus_tag","refseq_locus_tag","protein_id","gene_id","gi"].indexOf(rel) > -1)?"PATRIC":"Other",
		// 		sraction: 'save_params'	
		// 	}
		// }).then(function(results){
		// 	document.location = "/portal/portal/patric/IDMapping?cType=taxon&cId=131567&dm=result&pk=" + results;
		// });
		popup.close(idMappingTTDialog);
	});




	return declare([BorderContainer], {
		gutters: false,
		gridCtor: null,
		query: "",
		filter: "",
		state: null,
		dataModel: "",
		hashParams: null,
		design: "headline",
		facetFields: [],
		enableFilterPanel: true,
		apiServer: window.App.dataServiceURL,
		constructor: function(){
			this._firstView = false;
		},

		postCreate: function(){
			this.inherited(arguments);
			this.watch("state", lang.hitch(this, "onSetState"));
		},

		// startup: function(){
		// 	this.inherited(arguments);
		// 	// this.onSetState("state","", this.state);
		// },

		onSetState: function(attr, oldState, state){
			console.log("GridContainer onSetState: ", state);
			if(!state){
				// console.log("!state in grid container; return;")
				return;
			}
			var q = [];

			if(state.search){
				q.push(state.search);
			}

			if(state.hashParams){
				if(state.hashParams.filter){
					q.push(state.hashParams.filter)
				}
			}
			// console.log(" Has Filter Panel?", !!this.filterPanel);

			if(this.enableFilterPanel && this.filterPanel){
				// console.log("    FilterPanel found");
				this.filterPanel.set("state", state);
			}
			// console.log("setState query: ",q.join("&"), " state: ", state)
			this.set("query", q.join("&"));

		},
		_setQueryAttr: function(query){
			//console.log(this.id," GridContainer setQuery: ", query, " hasGrid?", !!this.grid, " hasFilter? ", !!this.filter );
			//console.log("    Query: ", query, "this.query: ", this.query)
			if(query == this.query){
				//console.log("  Not Skipping Query Update (unchanged)");
				// return;
			}

			this.query = query;
			// this.query = query || "?keyword(*)"
			// console.log("Query Set: ", query);

			if(this.grid){
				// console.log("    " + this.id + " Found Grid.")
				// if (query != this.grid.query){
				this.grid.set("query", query);
				//}
			}
			else{
				// console.log("No Grid Yet");
			}
		},

		_setApiServer: function(server){
			this._set("apiServer", server);
			if(this.grid){
				this.grid.set("apiServer", server);
			}
		},

		visible: false,
		_setVisibleAttr: function(visible){
			// console.log("GridContainer setVisible: ", visible)
			this.visible = visible;
			if(this.visible && !this._firstView){
				// console.log("Trigger First View: ", this.id)
				this.onFirstView();
			}
		},
		containerActions: [],
		selectionActions: [
			[
				"ToggleItemDetail",
				"fa fa-info-circle fa-2x", {
				label: "DETAIL",
				persistent: true,
				validTypes: ["*"],
				tooltip: "Toggle Selection Detail"
			},
				function(selection){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					var children = this.getChildren();
					// console.log("Children: ", children);
					if(children.some(function(child){
							return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
						}, this)){
						// console.log("Remove Item Detail Panel");
						this.removeChild(this.itemDetailPanel);
					}
					else{
						// console.log("Re-add child: ", this.itemDetailPanel);
						this.addChild(this.itemDetailPanel);
					}
				},
				true
			],
			[
				"ViewFASTA",
				"fa icon-fasta fa-2x",
				{
					label: "FASTA",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					tooltip: "View FASTA Data",
					tooltipDialog: viewFASTATT,
					validContainerTypes: ["sequence_data","feature_data","spgene_data"]
				},
				function(selection){
					popup.open({
						popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
						around: this.selectionActionBar._actions.ViewFASTA.button,
						orient: ["below"]
					});
				},
				false
			]

			,[
				"ViewGenomeItem",
				"MultiButton fa icon-genome fa-2x", 
				{
					label: "GENOME",
					validTypes:["*"],
					multiple: false,
					tooltip: "View Genome",
					validContainerTypes: ["sequence_data","feature_data","spgene_data","genome_data"]
				},
				function(selection){
					var sel = selection[0];
					console.log("sel: ", sel)
					console.log("Nav to: ", "/view/Genome/" + sel.genome_id);
					Topic.publish("/navigate", {href: "/view/Genome/" + sel.genome_id});
				}, 
				false
			],[
				"MultipleSeqAlignment",
				"fa icon-alignment fa-2x",
				{
					label:"MSA",ignoreDataType:true,min:2, multiple: true,validTypes:["*"],tooltip: "Multiple Sequence Alignment",
					validContainerTypes: ["sequence_data","feature_data","spgene_data"]
				}, 
				function(selection){
					var selection = self.actionPanel.get('selection')
					var ids = selection.map(function(d){ return d['feature_id']; });
						console.log("OPEN MSA VIEWER");
				},
				false
			],[
				"idmapping",
				"fa icon-exchange fa-2x",
				{label:"ID MAP",ignoreDataType:true,multiple: true,validTypes:["*"],tooltip: "ID Mapping", tooltipDialog:idMappingTTDialog, 
					validContainerTypes: ["sequence_data","feature_data","spgene_data"]
				},
				function(selection){

					console.log("TTDlg: ", idMappingTTDialog);
					console.log("this: ", this);
					popup.open({
						popup: idMappingTTDialog,
						// around: this._actions.idmapping.button,
						orient: ["below"]
					});
					console.log("popup idmapping", selection);
				}, 
				false
			],[
				"Pathway Summary",
				"fa icon-git-pull-request fa-2x",
				{label:"PATHWAY",ignoreDataType:true,multiple: true,validTypes:["*"], tooltip: "Pathway Summary",
					validContainerTypes: ["sequence_data","feature_data","spgene_data"]
				}, 
				function(selection){
					new Dialog({content: "IMPLEMENT ME!"}).show();
					// var selection = self.actionPanel.get('selection')
					// var ids = selection.map(function(d){ return d['feature_id']; });
					
				}, 
				false

			]
		],

		buildQuery: function(){
			var q = [];
			if(this.state){
				if(this.state.search){
					q.push(this.state.search);
				}
				if(this.state.hashParams && this.state.hashParams.filter){
					q.push(this.state.hashParams.filter);
				}
				if(q.length < 1){
					q = "";
				}
				else if(q.length == 1){
					q = q[0];
				}
				else{
					q = "and(" + q.join(",") + ")";
				}
			}else{
				q = ""
			}

			return q;
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}
			if(!this.gridCtor){
				console.error("Missing this.gridCtor in GridContainer");
				return;
			}

			this.grid = new this.gridCtor({
				region: "center",
				query: this.buildQuery(),
				state: this.state,
				apiServer: this.apiServer
			});

			if(this.enableFilterPanel){
				// console.log("Create FilterPanel: ", this.state);

				console.log("Create Container ActionBar with currentContainerWidget: ", this)

				this.containerActionBar = this.filterPanel = new ContainerActionBar({
					region: "top",
					layoutPriority: 7,
					splitter: true,
					"className": "BrowserHeader",
					dataModel: this.dataModel,
					facetFields: this.facetFields,
					state: this.state
				});

				// console.log("gridcontainer startup()", this.state)
				this.filterPanel.watch("filter", lang.hitch(this, function(attr, oldVal, newVal){
					// console.log("FILTER PANEL SET FILTER", arguments)
					// console.log("oldVal: ", oldVal, "newVal: ", newVal, "state.hashParams.filter: ", this.state.hashParams.filter)
					// console.log("setFilter Watch() callback", newVal);
					if((oldVal != newVal) && (newVal != this.state.hashParams.filter)){
						// console.log("Emit UpdateHash: ", newVal);
						on.emit(this.domNode, "UpdateHash", {
							bubbles: true,
							cancelable: true,
							hashProperty: "filter",
							value: newVal,
							oldValue: oldVal
						})
					}
				}));
			}



			this.selectionActionBar = new ActionBar({
				region: "right",
				layoutPriority: 4,
				style: "width:48px;text-align:center;",
				splitter: false,
				currentContainerWidget: this
			});

			this.itemDetailPanel = new ItemDetailPanel({
				region: "right",
				style: "width:250px",
				minSize: 150,
				splitter: true,
				layoutPriority: 3,
				containerWidget: this

			});

			if(this.containerActionBar){
				this.addChild(this.containerActionBar);
			}
			this.addChild(this.grid);
			this.addChild(this.selectionActionBar);
			this.addChild(this.itemDetailPanel);

			this.setupActions();
			this.listen();
			this.inherited(arguments);
			this._firstView = true;
		},

		listen: function(){
			this.grid.on("select", lang.hitch(this, function(evt){
				// console.log("Selected: ", evt);
				var sel = Object.keys(evt.selected).map(lang.hitch(this, function(rownum){
					// console.log("rownum: ", rownum);
					// console.log("Row: ", evt.grid.row(rownum).data);
					return evt.grid.row(rownum).data;
				}));
				// console.log("selection: ", sel);
				this.selectionActionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel);
			}));

			this.grid.on("deselect", lang.hitch(this, function(evt){

				if(!evt.selected){
					this.actionPanel.set("selection", []);
					this.itemDetailPanel.set("selection", []);
				}
				else{
					var sel = Object.keys(evt.selected).map(lang.hitch(this, function(rownum){
						// console.log("rownum: ", rownum);
						// console.log("Row: ", evt.grid.row(rownum).data);
						return evt.grid.row(rownum).data;
					}));
				}
				// console.log("selection: ", sel);
				this.selectionActionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel);
			}));

			on(this.domNode, "ToggleFilters", lang.hitch(this, function(evt){
				// console.log("toggleFilters");
				if(!this.filterPanel && this.getFilterPanel){
					this.filterPanel = this.getFilterPanel();
					this.filterPanel.region = "top";
					this.filterPanel.splitter = true;
					this.layoutPriority = 2;
					this.addChild(this.filterPanel);
				}
				else if(this.filterPanel){
					// console.log("this.filterPanel.minimized: ", this.filterPanel.minimized);
					if(this.filterPanel.minimized){
						this.filterPanel.minimized = false;
						this.filterPanel.resize({
							h: this.filterPanel.minSize + 150
						});
					}
					else{
						this.filterPanel.minimized = false;
						this.filterPanel.resize({
							h: this.filterPanel.minSize
						});
					}
					this.resize();
				}
			}));
		},

		setupActions: function(){
			if(this.containerActionBar){
				this.containerActions.forEach(function(a){
					this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
				}, this);
			}

			this.selectionActions.forEach(function(a){
				this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
			}, this);

		}
	});
});
