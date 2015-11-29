define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/dom-construct",
	"./ActionBar", "./FilterContainerActionBar", "dojo/_base/lang", "./ItemDetailPanel", "./SelectionToGroup",
	"dojo/topic", "dojo/query", "dijit/layout/ContentPane","dojo/text!./templates/IDMapping.html",
	"dijit/Dialog","dijit/popup","dijit/TooltipDialog"
], function(declare, BorderContainer, on, domConstruct,
			ActionBar, ContainerActionBar, lang, ItemDetailPanel, SelectionToGroup,
			Topic, query, ContentPane,IDMappingTemplate,
			Dialog,popup,TooltipDialog){

	var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><divi class="wsActionTooltip" rel="protein">View FASTA Proteins</div>'
	var viewFASTATT = new TooltipDialog({
		content: vfc, onMouseLeave: function() {
			popup.close(viewFASTATT);
		}
	});

	var downloadTT = new TooltipDialog({
		content: vfc, onMouseLeave: function(){
			popup.close(downloadTT);
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
		class: "GridContainer",
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
		defaultFilter: "",
		store: null,
		apiServer: window.App.dataServiceURL,
		queryOptions: null,
		columns:null,

		_setColumnsAttr: function(columns){
			if (this.grid){ 
				this.grid.set('columns', columns)
			}
			this._set('columns', columns); 
		},

		_getColumnsAttr: function(columns){
			if (this.grid){ return this.grid.get('columns'); } 
			return this.columns || {};
		},

		constructor: function(){
			this._firstView = false;
			console.log("GRIDCONTAINER CTOR() ", arguments)
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
			console.log("GridContainer onSetState: ", state, " oldState:", oldState);
			if(!state){
				// console.log("!state in grid container; return;")
				return;
			}
			var q = [];

			if(state.search){
				q.push(state.search);
			}

			if (state.hashParams && state.hashParams.filter && state.hashParams.filter=="false"){
				// filter set to false, no filtering
				
			}else if(state.hashParams){
				console.log("   Found state.hashParams");
				if(state.hashParams.filter){
					console.log("       Found state.hashParams.filter, using");
					q.push(state.hashParams.filter)
				}else if (!oldState && this.defaultFilter){
					console.log("       No original state, using default Filter");
					state.hashParams.filter = this.defaultFilter;
					this.set('state', state);
					return;
				}else if (oldState && oldState.hashParams && oldState.hashParams.filter){
					console.log("       Found oldState with hashparams.filter, using");
					state.hashParams.filter = oldState.hashParams.filter;
					this.set('state',state);
					return;
				}else if (this.defaultFilter){
					state.hashParams.filter = this.defaultFilter;
					this.set('state', state);
					return;
				}else{
					console.log("    hmmm shouldn't get here if we have defaultFilter:", this.defaultFilter)

				}
			}else{
				state.hashParams={}
				if (!oldState && this.defaultFilter){
					state.hashParams.filter = this.defaultFilter;
				}else if (oldState && oldState.hashParams && oldState.hashParams.filter){
					state.hashParams.filter = oldState.hashParams.filter
				}
				this.set('state', state);
				return;
			}
			// console.log(" Has Filter Panel?", !!this.filterPanel);

			if(this.enableFilterPanel && this.filterPanel){
				//console.log("    FilterPanel found");
				this.filterPanel.set("state", state);
			}
			// console.log("setState query: ",q.join("&"), " state: ", state)
			this.set("query", q.join("&"));

		},
		_setQueryAttr: function(query){
			//console.log(this.id," GridContainer setQuery: ", query, " hasGrid?", !!this.grid, " hasFilter? ", !!this.filter );
			//console.log("    Query: ", query, "this.query: ", this.query)
			// if(query == this.query){
				//console.log("  Not Skipping Query Update (unchanged)");
				// return;
			// }

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
			console.log("GridContainer setVisible: ", visible)
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
			],[
				"ViewFeatureItem",
				"MultiButton fa icon-eye2 fa-2x", 
				{
					label: "VIEW",
					validTypes:["*"],
					multiple: false,
					tooltip: "View Feature",
					validContainerTypes: ["feature_data"]
				},
				function(selection){
					var sel = selection[0];
					Topic.publish("/navigate", {href: "/view/Feature/" + sel.feature_id});
				}, 
				false	
			],[
				"ViewSpgeneItem",
				"MultiButton fa icon-eye2 fa-2x", 
				{
					label: "VIEW",
					validTypes:["*"],
					multiple: false,
					tooltip: "View Specialty Gene",
					validContainerTypes: ["spgene_data"]
				},
				function(selection){
					var sel = selection[0];
					//Topic.publish("/navigate", {href: "/view/Feature/" + sel.feature_id});
					console.log("View SP GENE: ", sel)
					Topic.publish("/navigate", {href: "/view/SpecialtyGene/" + sel.patric_id});
				}, 
				false	
			],[			
				"ViewGenomeItemFromGenome",
				"MultiButton fa icon-eye2 fa-2x", 
				{
					label: "GENOME",
					validTypes:["*"],
					multiple: false,
					tooltip: "View Genome",
					validContainerTypes: ["genome_data"]
				},
				function(selection){
					var sel = selection[0];
					console.log("sel: ", sel)
					console.log("Nav to: ", "/view/Genome/" + sel.genome_id);
					Topic.publish("/navigate", {href: "/view/Genome/" + sel.genome_id});
				}, 
				false
			],[			
				"ViewGenomeItem",
				"MultiButton fa icon-genome fa-2x", 
				{
					label: "GENOME",
					validTypes:["*"],
					multiple: false,
					tooltip: "View Genome",
					validContainerTypes: ["sequence_data","feature_data","spgene_data","sequence_data"]
				},
				function(selection){
					var sel = selection[0];
					console.log("sel: ", sel)
					console.log("Nav to: ", "/view/Genome/" + sel.genome_id);
					Topic.publish("/navigate", {href: "/view/Genome/" + sel.genome_id});
				}, 
				false
			],[
				"ViewCDSFeatures",
				"MultiButton fa icon-genome-features-cds fa-2x",
				{
					label: "CDS",
					validTypes:["*"],
					multiple: false,
					tooltip: "View CDS Features",
					validContainerTypes: ["genome_data"]
				},
				function(selection){
					console.log("selection: ", selection);
					var sel = selection[0];
					Topic.publish("/navigate", {href: "/view/Genome/"+ sel.genome_id + "#view_tab=features&filter=eq(feature_type,CDS)"});
				},
				false
			],[
				"ViewCDSFeaturesSeq",
				"MultiButton fa icon-genome-features-cds fa-2x",
				{
					label: "CDS",
					validTypes:["*"],
					multiple: false,
					tooltip: "View CDS Features",
					validContainerTypes: ["sequence_data"]
				},
				function(selection){
					console.log("selection: ", selection);
					var sel = selection[0];
					Topic.publish("/navigate", {href: "/view/FeatureList/?eq(accession,"+ sel.accession + ")#view_tab=sequences&filter=eq(feature_type,CDS)"});
				},
				false
			],[	
				"ViewGenomeBrowser",
				"MultiButton fa icon-genome_browser fa-2x",
				{					
					label: "BROWSER",
					validTypes:["*"],
					multiple: false,
					tooltip: "Open Genome Browser",
					validContainerTypes: ["genome_data"]
				},
				function(selection){
					console.log("selection: ", selection);
					var sel = selection[0];
					Topic.publish("/navigate", {href: "/view/Genome/"+ sel.genome_id + "#view_tab=browser"});
				}, 
				false
			],[	
				"ViewGenomeBrowserSeq",
				"MultiButton fa icon-genome_browser fa-2x",
				{					
					label: "BROWSER",
					validTypes:["*"],
					multiple: false,
					tooltip: "Open Genome Browser",
					validContainerTypes: ["sequence_data"]
				},
				function(selection){
					console.log("selection: ", selection);
					var sel = selection[0];
					Topic.publish("/navigate", {href: "/view/Genome/"+ sel.genome_id + "#view_tab=browser"});
				}, 
				false
			],[						
				"ViewFASTA",
				"fa icon-fasta fa-2x",
				{
					label: "FASTA",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					tooltip: "View FASTA Data",
					tooltipDialog: viewFASTATT,
					validContainerTypes: ["genome_data", "sequence_data","feature_data","spgene_data","pathway_data"]
				},
				function(selection){
					popup.open({
						popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
						around: this.selectionActionBar._actions.ViewFASTA.button,
						orient: ["below"]
					});
				},
				false
			],[
				"MultipleSeqAlignment",
				"fa icon-alignment fa-2x",
				{
					label:"MSA",ignoreDataType:true, multiple: true,validTypes:["*"],tooltip: "Multiple Sequence Alignment",
					validContainerTypes: ["proteinfamily_data","pathway_data"]
				}, 
				function(selection){
					var selection = self.actionPanel.get('selection')
					var ids = selection.map(function(d){ return d['feature_id']; });
						console.log("OPEN MSA VIEWER");
				},
				false
			],[
				"MultipleSeqAlignmentFeatures",
				"fa icon-alignment fa-2x",
				{
					label:"MSA",ignoreDataType:true,min:2, multiple: true,validTypes:["*"],tooltip: "Multiple Sequence Alignment",
					validContainerTypes: ["feature_data","spgene_data"]
				}, 
				function(selection){
					var selection = self.actionPanel.get('selection')
					var ids = selection.map(function(d){ return d['feature_id']; });
						console.log("OPEN MSA VIEWER");
				},
				false
			],[
				"idmappingFeatures",
				"fa icon-exchange fa-2x",
				{label:"ID MAP",ignoreDataType:true,min:2, multiple: true,validTypes:["*"],tooltip: "ID Mapping", tooltipDialog:idMappingTTDialog, 
					validContainerTypes: ["feature_data","spgene_data"]
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
				"idmapping",
				"fa icon-exchange fa-2x",
				{label:"ID MAP",ignoreDataType:true,multiple: true,validTypes:["*"],tooltip: "ID Mapping", tooltipDialog:idMappingTTDialog, 
					validContainerTypes: ["proteinfamily_data","pathway_data"]
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
				"ExperimentGeneList",
				"fa icon-list-unordered fa-2x",
				{label: "GENES", multiple: true, validTypes: ["*"], validContainerTypes: ["transcriptomics_experiment_data", "transcriptomics_sample_data"], tooltip: "View Experiment Gene List"}, 
				function(selection){
					console.log("this.currentContainerType: ", this.currentContainerType, this);
					console.log("View Gene List", selection);
					new Dialog({content: "IMPLEMENT ME!"}).show();
				}, 
				false
			],[			
				"PathwaySummary",
				"fa icon-git-pull-request fa-2x",
				{label:"PATHWAY",ignoreDataType:true,multiple: true,validTypes:["*"], tooltip: "Pathway Summary",
					validContainerTypes: ["feature_data","spgene_data","proteinfamily_data","pathway_data"]
				}, 
				function(selection){
					new Dialog({content: "IMPLEMENT ME!"}).show();
					// var selection = self.actionPanel.get('selection')
					// var ids = selection.map(function(d){ return d['feature_id']; });
					
				}, 
				false

			],[
				"AddGroup", 
				"fa icon-folder-open2 fa-2x", 
				{
					label:"ADD GROUP",
					ignoreDataType:true,
					multiple: true, 
					validTypes:["*"],
					tooltip: "Copy selection to a new or existing group", 
					validContainerTypes:["genome_data","feature_data", "spgene_data","proteinfamily_data", "transcriptomics_experiment_data", "transcriptomics_sample_data","pathway_data"]
				},
				function(selection, containerWidget){
					console.log("Add Items to Group", selection);
					var dlg = new Dialog({title:"Copy Selection to Group"});
					var stg = new SelectionToGroup({selection: selection, type: containerWidget.containerType,path: containerWidget.get("path")});
					on(dlg.domNode, "dialogAction", function(evt){
						dlg.hide();
						setTimeout(function(){
							dlg.destroy();
						},2000);
					});
					domConstruct.place(stg.domNode, dlg.containerNode,"first");
					stg.startup();
					dlg.startup();
					dlg.show();						
				},
				false
			],[
				"DownloadTable",
				"fa fa-download fa-2x",
				{
					label:"DOWNLOAD",
					multiple: true,
					validTypes:["*"],
					tooltip: "Download Table", 
					tooltipDialog: downloadTT, 
					validContainerTypes:["genome_data","sequence_data","feature_data", "spgene_data","proteinfamily_data", "transcriptomics_experiment_data", "transcriptomics_sample_data","pathway_data"]
				}, 
				function(selection){	
					popup.open({
						popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
						around: this.containerActionBar._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				false
			],[
				"ViewTaxon",
				"fa icon-eye2 fa fa-2x",
				{
					label:"VIEW",
					multiple: false,
					validTypes:["*"],
					tooltip: "View Selected Taxonomy", 
					tooltipDialog: downloadTT, 
					validContainerTypes:["taxonomy_data"]
				}, 
				function(selection){	
					var sel = selection[0];
					Topic.publish("/navigate", {href:"/view/Taxonomy/" + sel.taxon_id})
				},
				false
			],[
				"ViewTaxonGenomes",
				"fa icon-genome fa fa-2x",
				{
					label:"GENOMES",
					multiple: false,
					validTypes:["*"],
					tooltip: "View Genome List", 
					tooltipDialog: downloadTT, 
					validContainerTypes:["taxonomy_data"]
				}, 
				function(selection){	
					var sel = selection[0];
					Topic.publish("/navigate", {href:"/view/Taxonomy/" + sel.taxon_id + "#view_tab=genomes"})
				},
				false
			],[
				"ViewTaxonGenomeFeatures",
				"fa icon-genome-features-cds fa fa-2x",
				{
					label:"CDS",
					multiple: false,
					validTypes:["*"],
					tooltip: "View Genome List", 
					tooltipDialog: downloadTT, 
					validContainerTypes:["taxonomy_data"]
				}, 
				function(selection){	
					var sel = selection[0];
					Topic.publish("/navigate", {href:"/view/Taxonomy/" + sel.taxon_id + "#view_tab=features&filter=eq(feature_type,CDS)"})
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

		createFilterPanel: function(){
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
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}
			if(!this.gridCtor){
				console.error("Missing this.gridCtor in GridContainer");
				return;
			}

			var o = {
				region: "center",
				query: this.buildQuery(),
				state: this.state,
				apiServer: this.apiServer,
				visible: true
			}

			if (this.columns){
				o.columns = this.columns;
			}

			if (this.queryOptions){
				o.queryOptions = this.queryOptions;
			}

			console.log("GridContainer onFirstView create Grid: ", o)

			if (this.store){ o.store = this.store }
			this.grid = new this.gridCtor(o);

			if(this.enableFilterPanel){
				// console.log("Create FilterPanel: ", this.state);

				this.createFilterPanel();
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

		},
		startup: function(){
			console.log("GridContainer Startup()  isVisible: ", this.visible);
			if (this._started){ return; }
			if (this.visible){ this.onFirstView() }
			if (this.state){ this.set('state', this.state)}
			this.inherited(arguments)
		}
	});
});
