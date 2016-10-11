define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/dom-construct",
	"dojo/request", "dojo/when", "dojo/dom-class",
	"./ActionBar", "./FilterContainerActionBar", "dojo/_base/lang", "./ItemDetailPanel", "./SelectionToGroup",
	"dojo/topic", "dojo/query", "dijit/layout/ContentPane", "dojo/text!./templates/IDMapping.html",
	"dijit/Dialog", "dijit/popup", "dijit/TooltipDialog", "./DownloadTooltipDialog", "./PerspectiveToolTip"
], function(declare, BorderContainer, on, domConstruct,
			request, when, domClass,
			ActionBar, ContainerActionBar, lang, ItemDetailPanel, SelectionToGroup,
			Topic, query, ContentPane, IDMappingTemplate,
			Dialog, popup, TooltipDialog, DownloadTooltipDialog, PerspectiveToolTipDialog){

	var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div>';
	var viewFASTATT = new TooltipDialog({
		content: vfc, onMouseLeave: function(){
			popup.close(viewFASTATT);
		}
	});

	on(viewFASTATT.domNode, "click", function(evt){
		var rel = evt.target.attributes.rel.value;
		var sel = viewFASTATT.selection;
		delete viewFASTATT.selection;
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

		Topic.publish("/navigate", {href: "/view/FASTA/" + rel + "/?in(" + idType + ",(" + ids.map(encodeURIComponent).join(",") + "))"});
	});

	var downloadSelectionTT = new DownloadTooltipDialog({});
	downloadSelectionTT.startup();

	var idMappingTTDialog = new TooltipDialog({
		style: "overflow: visible;",
		content: IDMappingTemplate,
		onMouseLeave: function(){
			popup.close(idMappingTTDialog);
		}
	});

	on(idMappingTTDialog.domNode, "TD:click", function(evt){
		var rel = evt.target.attributes.rel.value;
		var selection = idMappingTTDialog.selection;
		delete idMappingTTDialog.selection;

		var toIdGroup = (["patric_id", "feature_id", "alt_locus_tag", "refseq_locus_tag", "protein_id", "gene_id", "gi"].indexOf(rel) > -1) ? "PATRIC" : "Other";

		Topic.publish("/navigate", {href: "/view/IDMapping/fromId=feature_id&fromIdGroup=PATRIC&fromIdValue=" + selection + "&toId=" + rel + "&toIdGroup=" + toIdGroup});
		popup.close(idMappingTTDialog);
	});

	return declare([BorderContainer], {
		"class": "GridContainer",
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
		columns: null,
		enableAnchorButton: false,
		showAutoFilterMessage: true,

		_setColumnsAttr: function(columns){
			if(this.grid){
				this.grid.set('columns', columns)
			}
			this._set('columns', columns);
		},

		_getColumnsAttr: function(columns){
			if(this.grid){
				return this.grid.get('columns');
			}
			return this.columns || {};
		},

		constructor: function(){
			this._firstView = false;
		},

		postCreate: function(){
			this.inherited(arguments);
			this.watch("state", lang.hitch(this, "onSetState"));
		},

		onSetState: function(attr, oldState, state){
			//console.log("GridContainer onSetState: ", state, " oldState:", oldState);
			if(!state){
				//console.log("!state in grid container; return;")
				return;
			}
			var q = [];

			if(state.search){
				q.push(state.search);
			}

			// reset filters to default state if search is different
			if(oldState && (state.search != oldState.search)){
				oldState = {};
			}

			if(state.hashParams && state.hashParams.filter && state.hashParams.filter == "false"){
				// console.log("Filters Disabled By FALSE")
			}else if(state.hashParams){
				if(state.hashParams.filter){
					// console.log("Using Filter from Hash Params: ", state.hashParams.filter);
					q.push(state.hashParams.filter)
				}else if(!oldState && this.defaultFilter){
					// console.log("Using Default Filter as Hash Params Filter", this.defaultFilter)
					state.hashParams.filter = this.defaultFilter;
					this.set('state', lang.mixin({}, state));
					return;
				}else if(oldState && oldState.hashParams && oldState.hashParams.filter){
					// console.log("Using oldState HashParams Filter", oldState.hashParams.filter)
					state.hashParams.filter = oldState.hashParams.filter;
					this.set('state', lang.mixin({}, state));
					return;
				}else if(this.defaultFilter){
					// console.log("Fallthrough to default Filter: ", this.defaultFilter);
					state.hashParams.filter = this.defaultFilter;
					this.set('state', lang.mixin({}, state));
					return;
				}else{
					// console.log("    hmmm shouldn't get here if we have defaultFilter:", this.defaultFilter)

				}

				if (state.hashParams.defaultSort){
					var sp = state.hashParams.defaultSort.split(",");
					var sort = sp.map(function(s){
						var r = {}
						if (s.charAt(0)=="+"){
							r.descending = false;
							r.attribute = s.substr(1);
						}else if (s.charAt(0)=="-"){
							r.descending = true;
							r.attribute = s.substr(1);
						}else{
							r.attribute=s;
						}
						return r;
					})

					this.set('queryOptions', {sort: sort});

					if (this.grid){
						console.log("Set Default Sort: ", sort);
						this.grid.set('sort', sort);
					}
				}


			}else{
				state.hashParams = {}
				if(!oldState && this.defaultFilter){
					// console.log("No OldState or Provided Filters, use default: ", this.defaultFilter)
					state.hashParams.filter = this.defaultFilter;
				}else if(oldState && oldState.hashParams && oldState.hashParams.filter){
					// console.log("Fall through to oldState hashparams filter");
					state.hashParams.filter = oldState.hashParams.filter
				}
				this.set('state', lang.mixin({}, state));
				return;
			}

			if(this.enableFilterPanel && this.filterPanel){
				// console.log("GridContainer call filterPanel set state: ", state.hashParams.filter, state)
				this.filterPanel.set("state", lang.mixin({}, state, {hashParams: lang.mixin({}, state.hashParams)}));
			}

			if(this.showAutoFilterMessage && state.autoFilterMessage){
				var msg = '<table><tr style="background: #f9ff85;"><td><div class="WarningBanner">' + state.autoFilterMessage + "&nbsp;<i class='fa-1x icon-question-circle-o DialogButton' rel='help:GenomesLimit' /></div></td><td style='width:30px;'><i style='font-weight:400;color:#333;cursor:pointer;' class='fa-1x icon-cancel-circle close closeWarningBanner' style='color:#333;font-weight:200;'></td></tr></table>";
				// var msg = state.autoFilterMessage;
				if(!this.messagePanel){
					this.messagePanel = new ContentPane({
						"class": "WarningPanel",
						region: "top",
						content: msg
					});

					var _self = this;
					on(this.messagePanel.domNode, ".closeWarningBanner:click", function(evt){
						if(_self.messagePanel){
							_self.removeChild(_self.messagePanel);
						}
					});
				}else{
					this.messagePanel.set("content", msg);
				}
				this.addChild(this.messagePanel);
			}else{
				if(this.messagePanel){
					this.removeChild(this.messagePanel)
				}
			}

			this.set("query", q.join("&"));

		},
		_setQueryAttr: function(query){

			if(query == this.query){
				// console.log("  Skipping Query Update (unchanged)");
				return;
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
			// console.log("GridContainer setVisible: ", visible);
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
				"fa icon-chevron-circle-right fa-2x",
				{
					label: "HIDE",
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
							node.innerHTML = "SHOW";
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
			], [
				"DownloadSelection",
				"fa icon-download fa-2x",
				{
					label: "DWNLD",
					multiple: true,
					validTypes: ["*"],
					ignoreDataType: true,
					tooltip: "Download Selection",
					max: 5000,
					tooltipDialog: downloadSelectionTT,
					validContainerTypes: ["genome_data", "sequence_data", "feature_data", "spgene_data", "transcriptomics_experiment_data", "transcriptomics_sample_data", "pathway_data", "transcriptomics_gene_data", "gene_expression_data"]
				},
				function(selection, container){
					console.log("this.currentContainerType: ", this.containerType);
					console.log("GridContainer selection: ", selection);
					console.log("   ARGS: ", arguments);

					this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.set("selection", selection);
					this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.set("containerType", this.containerType);
					if(container && container.grid){
						this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.set("grid", container.grid);
					}

					this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.timeout(3500);

					setTimeout(lang.hitch(this, function(){
						popup.open({
							popup: this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog,
							around: this.selectionActionBar._actions.DownloadSelection.button,
							orient: ["below"]
						});
					}), 10);

				},
				false
			], [
				"ViewFeatureItem",
				"MultiButton fa icon-selection-Feature fa-2x",
				{
					label: "FEATURE",
					validTypes: ["*"],
					multiple: false,
					tooltip: "Switch to Feature View. Press and Hold for more options.",
					validContainerTypes: ["feature_data", "transcriptomics_gene_data"],
					pressAndHold: function(selection, button, opts, evt){
						console.log("PressAndHold");
						console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "Feature",
								perspectiveUrl: "/view/Feature/" + selection[0].feature_id
							}),
							around: button,
							orient: ["below"]
						});
					}
				},
				function(selection){
					var sel = selection[0];
					Topic.publish("/navigate", {href: "/view/Feature/" + sel.feature_id + "#view_tab=overview"});
				},
				false
			],
			[
				"ViewFeatureItems",
				"MultiButton fa icon-selection-FeatureList fa-2x",
				{
					label: "FEATURES",
					validTypes: ["*"],
					multiple: true,
					min: 2,
					max: 5000,
					tooltip: "Switch to Feature List View. Press and Hold for more options.",
					validContainerTypes: ["feature_data", "transcriptomics_gene_data", "spgene_data"],
					pressAndHold: function(selection, button, opts, evt){
						console.log("PressAndHold");
						console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "FeatureList",
								perspectiveUrl: "/view/FeatureList/?in(feature_id,(" + selection.map(function(x){
									return x.feature_id;
								}).join(",") + "))"
							}),
							around: button,
							orient: ["below"]
						});

					}
				},
				function(selection){
					var sel = selection[0];
					Topic.publish("/navigate", {
						href: "/view/FeatureList/?in(feature_id,(" + selection.map(function(x){
							return x.feature_id;
						}).join(",") + "))"
					});
				},
				false
			],

			[
				"ViewSpgeneItem",
				"MultiButton fa icon-selection-Feature fa-2x",
				{
					label: "FEATURE",
					validTypes: ["*"],
					multiple: false,
					tooltip: "Switch to Feature View. Press and Hold for more options.",
					validContainerTypes: ["spgene_data"],
					pressAndHold: function(selection, button, opts, evt){
						console.log("PressAndHold");
						console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "Feature",
								perspectiveUrl: "/view/Feature/" + selection[0].feature_id
							}),
							around: button,
							orient: ["below"]
						});
					}
				},
				function(selection){
					var sel = selection[0];
					Topic.publish("/navigate", {href: "/view/Feature/" + sel.feature_id});
					// console.log("View SP GENE: ", sel)
					//Topic.publish("/navigate", {href: "/view/SpecialtyGene/" + sel.patric_id});
				},
				false
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
					Topic.publish("/navigate", {href: "/view/Genome/" + sel.genome_id});
				},
				false
			],

			[
				"ViewGenomeItem",
				"MultiButton fa icon-selection-Genome fa-2x",
				{
					label: "GENOME",
					validTypes: ["*"],
					multiple: false,
					tooltip: "Switch to Genome View. Press and Hold for more options.",
					ignoreDataType: true,
					validContainerTypes: ["sequence_data", "feature_data", "spgene_data", "sequence_data"],
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
					Topic.publish("/navigate", {href: "/view/Genome/" + sel.genome_id});
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
				"ViewCDSFeaturesSeq",
				"MultiButton fa icon-selection-FeatureList fa-2x",
				{
					label: "FEATURES",
					validTypes: ["*"],
					multiple: false,
					tooltip: "Switch to Feature List View. Press and Hold for more options.",
					validContainerTypes: ["sequence_data"],
					pressAndHold: function(selection, button, opts, evt){
						// console.log("PressAndHold");
						// console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "FeatureList",
								perspectiveUrl: "/view/FeatureList/?and(eq(annotation,PATRIC),eq(feature_type,CDS),eq(sequence_id," + selection[0].sequence_id + "))"
							}),
							around: button,
							orient: ["below"]
						});
					}
				},
				function(selection){
					// console.log("selection: ", selection);
					var sel = selection[0];
					Topic.publish("/navigate", {href: "/view/FeatureList/?and(eq(annotation,PATRIC),eq(sequence_id," + sel.sequence_id + "),eq(feature_type,CDS))"});
				},
				false
			],
			[
				"ViewFASTA",
				"fa icon-fasta fa-2x",
				{
					label: "FASTA",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					max: 5000,
					tooltip: "View FASTA Data",
					tooltipDialog: viewFASTATT,
					validContainerTypes: ["feature_data", "spgene_data", "transcriptomics_gene_data"]
				},
				function(selection){
					// console.log("view FASTA")
					viewFASTATT.selection = selection;
					// console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
					popup.open({
						popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
						around: this.selectionActionBar._actions.ViewFASTA.button,
						orient: ["below"]
					});
				},
				false
			], [
				"MultipleSeqAlignmentFeatures",
				"fa icon-alignment fa-2x",
				{
					label: "MSA",
					ignoreDataType: true,
					min: 2,
					multiple: true,
					max: 200,
					validTypes: ["*"],
					tooltip: "Multiple Sequence Alignment",
					validContainerTypes: ["feature_data", "spgene_data", "proteinfamily_data", "pathway_data", "transcriptomics_gene_data"]
				},
				function(selection){
					// console.log("MSA Selection: ", selection);
					var ids = selection.map(function(d){
						return d['feature_id'];
					});
					// console.log("OPEN MSA VIEWER");
					Topic.publish("/navigate", {href: "/view/MSA/?in(feature_id,(" + ids.map(encodeURIComponent).join(",") + "))"});

				},
				false
			], [
				"idmapping",
				"fa icon-exchange fa-2x",
				{
					label: "ID MAP",
					ignoreDataType: true,
					min: 1,
					multiple: true,
					max: 1000,
					validTypes: ["*"],
					tooltip: "ID Mapping",
					tooltipDialog: idMappingTTDialog,
					validContainerTypes: ["feature_data", "spgene_data", "transcriptomics_gene_data", "proteinfamily_data", "pathway_data"]
				},
				function(selection, containerWidget){

					var self = this;
					var ids = [];
					switch(containerWidget.containerType){
						case "proteinfamily_data":
							var familyIds = selection.map(function(d){
								return d['family_id']
							});
							var genomeIds = containerWidget.state.genome_ids;
							var familyIdName = containerWidget.pfState.familyType + "_id";

							when(request.post(this.apiServer + '/genome_feature/', {
								handleAs: 'json',
								headers: {
									'Accept': "application/json",
									'Content-Type': "application/rqlquery+x-www-form-urlencoded",
									'X-Requested-With': null,
									'Authorization': (window.App.authorizationToken || "")
								},
								data: "and(in(" + familyIdName + ",(" + familyIds.join(",") + ")),in(genome_id,(" + genomeIds.join(",") + ")))&select(feature_id)&limit(25000)"
							}), function(response){
								ids = response.map(function(d){
									return d['feature_id']
								});
								idMappingTTDialog.selection = ids.join(",");
								popup.open({
									popup: idMappingTTDialog,
									around: self.selectionActionBar._actions.idmapping.button,
									orient: ["before-centered"]
								});
							});

							return;
							break;
						case "pathway_data":
							var queryContext = containerWidget.grid.store.state.search;
							switch(containerWidget.type){
								case "pathway":
									var pathway_ids = selection.map(function(d){
										return d['pathway_id']
									});

									when(request.post(this.apiServer + '/pathway/', {
										handleAs: 'json',
										headers: {
											'Accept': "application/json",
											'Content-Type': "application/rqlquery+x-www-form-urlencoded",
											'X-Requested-With': null,
											'Authorization': (window.App.authorizationToken || "")
										},
										data: "and(in(pathway_id,(" + pathway_ids.join(",") + "))," + queryContext + ")&select(feature_id)&limit(25000)"
									}), function(response){
										ids = response.map(function(d){
											return d['feature_id']
										});

										idMappingTTDialog.selection = ids.join(",");
										popup.open({
											popup: idMappingTTDialog,
											around: self.selectionActionBar._actions.idmapping.button,
											orient: ["before-centered"]
										});
									});
									return;
									break;
								case "ec_number":
									var ec_numbers = selection.map(function(d){
										return d['ec_number']
									});

									when(request.post(this.apiServer + '/pathway/', {
										handleAs: 'json',
										headers: {
											'Accept': "application/json",
											'Content-Type': "application/rqlquery+x-www-form-urlencoded",
											'X-Requested-With': null,
											'Authorization': (window.App.authorizationToken || "")
										},
										data: "and(in(ec_number,(" + ec_numbers.join(",") + "))," + queryContext + ")&select(feature_id)&limit(25000)"
									}), function(response){
										ids = response.map(function(d){
											return d['feature_id']
										});

										idMappingTTDialog.selection = ids.join(",");
										popup.open({
											popup: idMappingTTDialog,
											around: self.selectionActionBar._actions.idmapping.button,
											orient: ["before-centered"]
										});
									});

									return;
									break;
								case "gene":
									ids = selection.map(function(d){
										return d['feature_id']
									});
									break;
								default:
									return;
									break;
							}
							break;
						default:
							ids = selection.map(function(d){
								return d['feature_id'];
							});
							break;
					}

					idMappingTTDialog.selection = ids.join(",");
					popup.open({
						popup: idMappingTTDialog,
						around: this.selectionActionBar._actions.idmapping.button,
						orient: ["before-centered"]
					});
				},
				false
			], [
				"ExperimentComparison",
				"fa icon-selection-Experiment fa-2x",
				{
					label: "EXPRMNT",
					multiple: false,
					validTypes: ["*"],
					validContainerTypes: ["transcriptomics_experiment_data"],
					tooltip: "View Experiment"
				},
				function(selection){
					// console.log("this.currentContainerType: ", this.currentContainerType, this);
					// console.log("View Gene List", selection);
					var experimentIdList = selection.map(function(exp){
						return exp.eid;
					});
					Topic.publish("/navigate", {
						href: "/view/ExperimentComparison/" + experimentIdList + "#view_tab=overview",
						target: "blank"
					});
				},
				false
			], [
				"TranscriptomicsExperimentList",
				"fa icon-selection-ExperimentList fa-2x",
				{
					label: "EXPRMNTS",
					multiple: true,
					min: 2,
					max: 5000,
					validTypes: ["*"],
					validContainerTypes: ["transcriptomics_experiment_data"],
					tooltip: "View Experiment List"
				},
				function(selection){
					// console.log("this.currentContainerType: ", this.currentContainerType, this);
					// console.log("View Gene List", selection);
					var experimentIdList = selection.map(function(exp){
						return exp.eid;
					});

					Topic.publish("/navigate", {
						href: "/view/TranscriptomicsExperimentList/?in(eid,(" + experimentIdList.join(',') + "))#view_tab=experiments",
						target: "blank"
					});
				},
				false
			], [
				"ExperimentGeneList",
				"fa icon-list-unordered fa-2x",
				{
					label: "GENES",
					multiple: true,
					validTypes: ["*"],
					max: 5000,
					validContainerTypes: ["transcriptomics_experiment_data", "transcriptomics_sample_data"],
					tooltip: "View Experiment Gene List"
				},
				function(selection){
					// console.log("this.currentContainerType: ", this.currentContainerType, this);
					// console.log("View Gene List", selection);
					var experimentIdList = selection.map(function(exp){
						return exp.eid;
					});
					if(experimentIdList.length == 1){
						Topic.publish("/navigate", {
							href: "/view/TranscriptomicsExperiment/?eq(eid,(" + experimentIdList + "))",
							target: "blank"
						});
					}else{
						Topic.publish("/navigate", {
							href: "/view/TranscriptomicsExperiment/?in(eid,(" + experimentIdList.join(',') + "))",
							target: "blank"
						});
					}
				},
				false
			], [
				"PathwaySummary",
				"fa icon-git-pull-request fa-2x",
				{
					label: "PTHWY",
					ignoreDataType: true,
					multiple: true,
					max: 200,
					validTypes: ["*"],
					tooltip: "Pathway Summary",
					validContainerTypes: ["feature_data", "spgene_data", "transcriptomics_gene_data", "proteinfamily_data", "pathway_data"]
				},
				function(selection, containerWidget){

					// console.warn(containerWidget.containerType, containerWidget.type, containerWidget);
					var ids = [];
					switch(containerWidget.containerType){
						case "proteinfamily_data":
							var familyIds = selection.map(function(d){
								return d['family_id']
							});
							var genomeIds = containerWidget.state.genome_ids;
							var familyIdName = containerWidget.pfState.familyType + "_id";

							when(request.post(this.apiServer + '/genome_feature/', {
								handleAs: 'json',
								headers: {
									'Accept': "application/json",
									'Content-Type': "application/rqlquery+x-www-form-urlencoded",
									'X-Requested-With': null,
									'Authorization': (window.App.authorizationToken || "")
								},
								data: "and(in(" + familyIdName + ",(" + familyIds.join(",") + ")),in(genome_id,(" + genomeIds.join(",") + ")))&select(feature_id)&limit(25000)"
							}), function(response){
								ids = response.map(function(d){
									return d['feature_id']
								});
								Topic.publish("/navigate", {
									href: "/view/PathwaySummary/?pathways=" + ids.join(','),
									target: "blank"
								});
							});

							return;
							break;
						case "pathway_data":

							var queryContext = containerWidget.grid.store.state.search;
							if(containerWidget.grid.store.state.hashParams.filter != "false"){
								queryContext += "&" + containerWidget.grid.store.state.hashParams.filter;
							}

							switch(containerWidget.type){
								case "pathway":
									var pathway_ids = selection.map(function(d){
										return d['pathway_id']
									});

									when(request.post(this.apiServer + '/pathway/', {
										handleAs: 'json',
										headers: {
											'Accept': "application/json",
											'Content-Type': "application/rqlquery+x-www-form-urlencoded",
											'X-Requested-With': null,
											'Authorization': (window.App.authorizationToken || "")
										},
										data: "and(in(pathway_id,(" + pathway_ids.join(",") + "))," + queryContext + ")&select(feature_id)&limit(25000)"
									}), function(response){
										ids = response.map(function(d){
											return d['feature_id']
										});
										Topic.publish("/navigate", {
											href: "/view/PathwaySummary/?features=" + ids.join(','),
											target: "blank"
										});
									});
									return;
									break;
								case "ec_number":
									var ec_numbers = selection.map(function(d){
										return d['ec_number']
									});

									when(request.post(this.apiServer + '/pathway/', {
										handleAs: 'json',
										headers: {
											'Accept': "application/json",
											'Content-Type': "application/rqlquery+x-www-form-urlencoded",
											'X-Requested-With': null,
											'Authorization': (window.App.authorizationToken || "")
										},
										data: "and(in(ec_number,(" + ec_numbers.join(",") + "))," + queryContext + ")&select(feature_id)&limit(25000)"
									}), function(response){
										ids = response.map(function(d){
											return d['feature_id']
										});
										Topic.publish("/navigate", {
											href: "/view/PathwaySummary/?features=" + ids.join(','),
											target: "blank"
										});
									});

									return;
									break;
								case "gene":
									ids = selection.map(function(d){
										return d['feature_id']
									});
									break;
								default:
									return;
									break;
							}
							break;
						default:
							// feature_data or spgene_data
							ids = selection.map(function(sel){
								return sel['feature_id']
							});
							break;
					}

					Topic.publish("/navigate", {
						href: "/view/PathwaySummary/?features=" + ids.join(','),
						target: "blank"
					});
				},
				false

			], [
				"AddGroup",
				"fa icon-object-group fa-2x",
				{
					label: "GROUP",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					requireAuth: true,
					max: 10000,
					tooltip: "Copy selection to a new or existing group",
					validContainerTypes: ["genome_data", "feature_data", "transcriptomics_experiment_data", "transcriptomics_gene_data"]
				},
				function(selection, containerWidget){
					// console.log("Add Items to Group", selection);
					var dlg = new Dialog({title: "Copy Selection to Group"});
					var type;

					if(!containerWidget){
						// console.log("Container Widget not setup for addGroup");
						return;
					}

					if(containerWidget.containerType == "genome_data"){
						type = "genome_group";
					}else if(containerWidget.containerType == "feature_data" || containerWidget.containerType == "transcriptomics_gene_data"){
						type = "feature_group";
					}else if(containerWidget.containerType == "transcriptomics_experiment_data"){
						type = "experiment_group";
					}

					if(!type){
						console.error("Missing type for AddGroup")
						return;
					}
					var stg = new SelectionToGroup({
						selection: selection,
						type: type,
						path: containerWidget.get("path")
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
				"ViewTaxon",
				"fa icon-selection-Taxonomy fa-2x",
				{
					label: "TAXONOMY",
					multiple: false,
					validTypes: ["*"],
					tooltip: "Switch to Taxonomy View. Press and Hold for more options.",
					validContainerTypes: ["taxonomy_data", "taxon_data"],
					pressAndHold: function(selection, button, opts, evt){
						// console.log("PressAndHold");
						// console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "Taxonomy",
								perspectiveUrl: "/view/Taxonomy/" + selection[0].taxon_id
							}),
							around: button,
							orient: ["below"]
						});
					}
				},
				function(selection){
					var sel = selection[0];
					Topic.publish("/navigate", {href: "/view/Taxonomy/" + sel.taxon_id + "#view_tab=overview"})
				},
				false
			],
			[
				"ViewGenomesFromTaxons",
				"fa icon-selection-GenomeList fa-2x",
				{
					label: "GENOMES",
					multiple: true,
					min: 2,
					validTypes: ["*"],
					tooltip: "Switch to Genome List View. Press and Hold for more options.",
					tooltipDialog: downloadSelectionTT,
					validContainerTypes: ["taxonomy_data", "taxon_data"],
					pressAndHold: function(selection, button, opts, evt){
						var map = {};
						selection.forEach(function(sel){
							if(!map[sel.taxon_id]){
								map[sel.taxon_id] = true
							}
						})
						var taxonIds = Object.keys(map);
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "GenomeList",
								perspectiveUrl: "/view/GenomeList/?in(taxon_lineage_ids,(" + taxonIds.join(",") + "))"
							}),
							around: button,
							orient: ["below"]
						});
					}
				},
				function(selection){
					var map = {};
					selection.forEach(function(sel){
						if(!map[sel.taxon_id]){
							map[sel.taxon_id] = true
						}
					})
					var taxonIds = Object.keys(map);
					Topic.publish("/navigate", {href: "/view/GenomeList/?in(taxon_lineage_ids,(" + taxonIds.join(",") + "))#view_tab=overview"})
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
			// console.log("Create Container ActionBar with currentContainerWidget: ", this)

			this.containerActionBar = this.filterPanel = new ContainerActionBar({
				region: "top",
				layoutPriority: 7,
				splitter: true,
				"className": "BrowserHeader",
				dataModel: this.dataModel,
				facetFields: this.facetFields,
				state: lang.mixin({}, this.state),
				enableAnchorButton: this.enableAnchorButton,
				currentContainerWidget: this
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
			var state;
			if(this.state){
				state = lang.mixin({}, this.state, {hashParams: lang.mixin({}, this.state.hashParams)});
			}

			var o = {
				region: "center",
				query: this.buildQuery(),
				state: state,
				apiServer: this.apiServer,
				visible: true
			};

			if(this.columns){
				o.columns = this.columns;
			}

			if(this.queryOptions){
				o.queryOptions = this.queryOptions;
			}

			if(this.store){
				o.store = this.store
			}
			this.grid = new this.gridCtor(o);

			if(this.enableFilterPanel){
				// console.log("Create FilterPanel: ", this.state);

				this.createFilterPanel();
			}

			this.selectionActionBar = new ActionBar({
				region: "right",
				layoutPriority: 4,
				style: "width:56px;text-align:center;",
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
				this.containerActionBar.set("currentContainer", this);
			}
			this.addChild(this.grid);
			this.addChild(this.selectionActionBar);
			this.addChild(this.itemDetailPanel);

			this.setupActions();
			this.listen();
			this.inherited(arguments);
			this._firstView = true;
		},

		getAllSelection: function(query){
			console.log("getAll Query: ", query);
		},

		listen: function(){
			this.grid.on("select", lang.hitch(this, function(evt){
				// console.log("Selected: ", evt);
				// if (evt.grid.allSelected){
				// 	console.log("All Items Selected");
				// 	this.getAllSelection(evt.grid.query);
				// }else{
				var sel = Object.keys(evt.selected).map(lang.hitch(this, function(rownum){
					// console.log("rownum: ", rownum);
					// console.log("Row: ", evt.grid.row(rownum).data);
					var row = evt.grid.row(rownum);
					// console.log("Row: ", rownum)
					if(row.data){
						return row.data;
					}else{
						// console.log("No Row: ", rownum)
						return this.grid._unloadedData[rownum];
						// var data = {};
						// // console.log("_self.grid.primaryKey", this.grid.primaryKey);
						// data[this.grid.primaryKey]=rownum;
						// // console.log("    DATA: ", data)
						// return data;
					}
				}), this);

				// console.log("GridContainer SEL: ", sel)
				// console.log("selection: ", sel);
				this.selectionActionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel);
				// }
			}));

			this.grid.on("deselect", lang.hitch(this, function(evt){
				var sel = [];
				if(!evt.selected){
					this.actionPanel.set("selection", []);
					this.itemDetailPanel.set("selection", []);
				}
				else{
					sel = Object.keys(evt.selected).map(lang.hitch(this, function(rownum){
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
						this.filterPanel.set("minimized", false);
						this.filterPanel.resize({
							h: this.filterPanel.minSize + 150
						});
					}
					else{
						this.filterPanel.set("minimized", true);
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
			if(this.visible){
				this.onFirstView()
			}
			if(this.state){
				this.set('state', lang.mixin({}, this.state, {hashParams: lang.mixin({}, this.state.hashParams)}));
			}
			this.inherited(arguments)
		}
	});
});
