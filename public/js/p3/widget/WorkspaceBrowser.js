define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/query",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct", "dojo/dom-attr",
	"./WorkspaceExplorerView", "dojo/topic", "./ItemDetailPanel",
	"./ActionBar", "dojo/_base/Deferred", "../WorkspaceManager", "dojo/_base/lang",
	"./Confirmation", "./SelectionToGroup", "dijit/Dialog", "dijit/TooltipDialog",
	"dijit/popup", "dojo/text!./templates/IDMapping.html", "dojo/request", "dijit/form/Select",
	"./ContainerActionBar", "./GroupExplore", "./GenomeGrid", "./PerspectiveToolTip", "../widget/UserSelector",
	"dijit/form/Button", "./formatter", "dijit/form/TextBox", "dojo/NodeList-traverse"

], function(
	declare, BorderContainer, on, query,
	domClass, ContentPane, domConstruct, domAttr,
	WorkspaceExplorerView, Topic, ItemDetailPanel,
	ActionBar, Deferred, WorkspaceManager, lang,
	Confirmation, SelectionToGroup, Dialog, TooltipDialog,
	popup, IDMappingTemplate, xhr, Select,
	ContainerActionBar, GroupExplore, GenomeGrid, PerspectiveToolTipDialog, UserSelector,
	Button, Formatter, TextBox){
	return declare([BorderContainer], {
		baseClass: "WorkspaceBrowser",
		disabled: false,
		path: "/",
		gutters: false,
		navigableTypes: ["parentfolder", "folder", "job_result", "experiment_group", "experiment", "unspecified", "contigs", "reads", "model"],
		design: "sidebar",
		splitter: false,
		startup: function(){
			if(this._started){
				return;
			}

			this.actionPanel = new ActionBar({
				splitter: false,
				region: "right",
				layoutPriority: 2,
				style: "width: 57px; text-align: center;"
			});

			this.browserHeader = new ContainerActionBar({
				region: "top",
				className: "BrowserHeader",
				path: this.path,
				layoutPriority: 3
			});

			var self = this;
			this.actionPanel.addAction("ToggleItemDetail", "fa icon-chevron-circle-right fa-2x", {
				label: "HIDE",
				persistent: true,
				validTypes: ["*"],
				tooltip: "Toggle Selection Detail"
			}, function(selection){
				if(self.getChildren().some(function(child){
						return child === self.itemDetailPanel
					})){
					self.removeChild(self.itemDetailPanel);
				}else{
					self.addChild(self.itemDetailPanel);
				}
			}, true);

			// show / hide item detail panel button
			var hideBtn = query('[rel="ToggleItemDetail"]', this.actionPanel.domNode)[0];
			on(hideBtn, "click", function(e){
				var icon = query('.fa', hideBtn)[0],
					text = query('.ActionButtonText', hideBtn)[0];

				domClass.toggle(icon, "icon-chevron-circle-right");
				domClass.toggle(icon, "icon-chevron-circle-left");

				if(domClass.contains(icon, "icon-chevron-circle-left"))
					domAttr.set(text, "textContent", "SHOW");
				else
					domAttr.set(text, "textContent", "HIDE");
			})

			this.actionPanel.addAction("ViewGenomeGroup", "MultiButton fa icon-selection-GenomeList fa-2x", {
				label: "VIEW",
				validTypes: ["genome_group"],
				multiple: false,
				tooltip: "Switch to the Genome Group View.",
				pressAndHold: function(selection, button, opts, evt){

					popup.open({
						popup: new PerspectiveToolTipDialog({
							perspective: "GenomeGroup",
							perspectiveUrl: "/view/GenomeGroup/" + selection[0].path
						}),
						around: button,
						orient: ["below"]
					});
				}
			}, function(selection){
				if(selection.length == 1){
					Topic.publish("/navigate", {href: "/view/GenomeGroup" + selection[0].path});
				}else{
					var q = selection.map(function(sel){
						return "in(genome_id,GenomeGroup(" + encodeURIComponent(sel.path) + "))"
					});
					q = "or(" + q.join(",") + ")";
					Topic.publish("/navigate", {href: "/view/GenomeList/?" + q});
				}
			}, false);

			this.actionPanel.addAction("ViewGenomeGroups", "MultiButton fa icon-selection-GenomeList fa-2x", {
				label: "VIEW",
				validTypes: ["genome_group"],
				multiple: true,
				min: 2,
				tooltip: "Switch to the Genome List View.",
				pressAndHold: function(selection, button, opts, evt){

					var q = selection.map(function(sel){
						return "in(genome_id,GenomeGroup(" + encodeURIComponent(sel.path) + "))"
					});
					q = "or(" + q.join(",") + ")";
					popup.open({
						popup: new PerspectiveToolTipDialog({
							perspective: "GenomeList",
							perspectiveUrl: "/view/GenomeList/" + q
						}),
						around: button,
						orient: ["below"]
					});
				}
			}, function(selection){
				if(selection.length == 1){
					Topic.publish("/navigate", {href: "/view/GenomeGroup" + selection[0].path});
				}else{
					var q = selection.map(function(sel){
						return "in(genome_id,GenomeGroup(" + encodeURIComponent(sel.path) + "))"
					});
					q = "or(" + q.join(",") + ")";
					Topic.publish("/navigate", {href: "/view/GenomeList/?" + q});
				}
			}, false);

			this.actionPanel.addAction("ViewGenomeItem", "MultiButton fa icon-selection-Genome fa-2x", {
				label: "GENOME",
				validTypes: ["*"],
				validContainerTypes: ["genome_group"],
				multiple: false,
				tooltip: "View Genome. Press and Hold for more options.",
				pressAndHold: function(selection, button, opts, evt){

					popup.open({
						popup: new PerspectiveToolTipDialog({perspectiveUrl: "/view/Genome/" + selection[0].genome_id}),
						around: button,
						orient: ["below"]
					});
				}
			}, function(selection){

				var sel = selection[0];
				Topic.publish("/navigate", {href: "/view/Genome/" + sel.genome_id});
			}, false);

			this.actionPanel.addAction("ViewFeatureGroup", "MultiButton fa icon-selection-FeatureList fa-2x", {
				label: "VIEW",
				validTypes: ["feature_group"],
				multiple: false,
				tooltip: "Switch to the Feature Group View.",
				pressAndHold: function(selection, button, opts, evt){

					popup.open({
						popup: new PerspectiveToolTipDialog({
							perspective: "FeatureGroup",
							perspectiveUrl: "/view/FeatureGroup/" + selection[0].path
						}),
						around: button,
						orient: ["below"]
					});
				}
			}, function(selection){
				if(selection.length == 1){
					Topic.publish("/navigate", {href: "/view/FeatureGroup" + selection[0].path});
				}else{
					var q = selection.map(function(sel){
						return "in(feature_id,FeatureGroup(" + encodeURIComponent(sel.path) + "))"
					});
					q = "or(" + q.join(",") + ")";

					Topic.publish("/navigate", {href: "/view/FeatureList/?" + q});
				}
			});

			this.actionPanel.addAction("ViewFeatureGroups", "MultiButton fa icon-selection-FeatureList fa-2x", {
				label: "VIEW",
				validTypes: ["feature_group"],
				multiple: true,
				min: 2,
				tooltip: "Switch to the Feature List View.",
				pressAndHold: function(selection, button, opts, evt){

					var q = selection.map(function(sel){
						return "in(feature_id,FeatureGroup(" + encodeURIComponent(sel.path) + "))"
					});
					q = "or(" + q.join(",") + ")";
					popup.open({
						popup: new PerspectiveToolTipDialog({
							perspective: "FeatureList",
							perspectiveUrl: "/view/FeatureList/" + q
						}),
						around: button,
						orient: ["below"]
					});
				}
			}, function(selection){
				if(selection.length == 1){
					Topic.publish("/navigate", {href: "/view/FeatureGroup" + selection[0].path});
				}else{
					var q = selection.map(function(sel){
						return "in(feature_id,FeatureGroup(" + encodeURIComponent(sel.path) + "))"
					});
					q = "or(" + q.join(",") + ")";

					Topic.publish("/navigate", {href: "/view/FeatureList/?" + q});
				}
			});

			this.actionPanel.addAction("ViewFeatureGroupItem", "MultiButton fa icon-selection-Feature fa-2x", {
				validTypes: ["*"],
				label: "FEATURE",
				validContainerTypes: ["feature_group"],
				multiple: false,
				tooltip: "View Feature. Press and Hold for more options.",
				pressAndHold: function(selection, button, opts, evt){

					popup.open({
						popup: new PerspectiveToolTipDialog({
							perspective: "Feature",
							perspectiveUrl: "/view/Feature/" + selection[0].feature_id
						}),
						around: button,
						orient: ["below"]
					});
				}
			}, function(selection){

				var sel = selection[0];
				Topic.publish("/navigate", {href: "/view/Feature/" + sel.feature_id});
			}, false);

			this.actionPanel.addAction("ViewGenomeFromFeature", "MultiButton fa icon-selection-Genome fa-2x", {
				label: "GENOME",
				validTypes: ["*"],
				validContainerTypes: ["feature_group"],
				multiple: false,
				tooltip: "View Genome. Press and Hold for more options.",
				pressAndHold: function(selection, button, opts, evt){
					// console.log("PressAndHold");
					// console.log("Selection: ", selection, selection[0])
					popup.open({
						popup: new PerspectiveToolTipDialog({perspectiveUrl: "/view/Genome/" + selection[0].genome_id}),
						around: button,
						orient: ["below"]
					});
				}
			}, function(selection){

				var sel = selection[0];
				Topic.publish("/navigate", {href: "/view/Genome/" + sel.genome_id});
			}, false);

			this.actionPanel.addAction("DownloadItem", "fa icon-download fa-2x", {
				label: "DWNLD",
				multiple: false,
				validTypes: WorkspaceManager.downloadTypes,
				tooltip: "Download"
			}, function(selection){
				// console.log("Download Item Action", selection);
				WorkspaceManager.downloadFile(selection[0].path);
			}, false);

			var dfc = '<div>Download Table As...</div>'+
					  '<div class="wsActionTooltip" rel="text/tsv">Text</div>'+
					  '<div class="wsActionTooltip" rel="text/csv">CSV</div>'+
					  '<div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
			var downloadTT = new TooltipDialog({
				content: dfc, onMouseLeave: function(){
					popup.close(downloadTT);
				}
			});

			on(downloadTT.domNode, "div:click", function(evt){
				var rel = evt.target.attributes.rel.value;
				// console.log("REL: ", rel);
				var selection = self.actionPanel.get('selection');
				var dataType = (self.actionPanel.currentContainerWidget.containerType == "genome_group") ? "genome" : "genome_feature";
				var currentQuery = self.actionPanel.currentContainerWidget.get('query');

				window.open("/api/" + dataType + "/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download=true");
				popup.close(downloadTT);
			});

			this.browserHeader.addAction("DownloadTable", "fa icon-download fa-2x", {
				label: "DWNLD",
				multiple: false,
				validTypes: ["genome_group", "feature_group"],
				tooltip: "Download Table",
				tooltipDialog: downloadTT
			}, function(selection){
				// console.log("Download Table", selection);
				popup.open({
					popup: this._actions.DownloadTable.options.tooltipDialog,
					around: this._actions.DownloadTable.button,
					orient: ["below"]
				});

			}, false);

			var downloadTTSelect = new TooltipDialog({
				content: dfc, onMouseLeave: function(){
					popup.close(downloadTTSelect);
				}
			});

			on(downloadTTSelect.domNode, "div:click", function(evt){
				if (!('rel' in evt.target.attributes)) return;

				var rel = evt.target.attributes.rel.value;

				var selection = self.actionPanel.get('selection');
				var type = selection[0].type;
				var dataType = type === "genome_group" ? "genome" : "genome_feature";
				var currentQuery = self.getQuery(selection[0]);

				var urlStr = "/api/" + dataType + "/" + currentQuery + "&http_authorization=" +
					encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download=true";

				// cursorMark requires a sort on an unique key
				urlStr += type === "genome_group" ? '&sort(+genome_id)' : '&sort(+feature_id)';

				window.open(urlStr);
				popup.close(downloadTT);
			});

			this.actionPanel.addAction("SelectDownloadTable", "fa icon-download fa-2x", {
				label: "DWNLD",
				multiple: false,
				validTypes: ["genome_group", "feature_group"],
				tooltip: "Download Selection",
				tooltipDialog: downloadTTSelect
			}, function(selection){
				// console.log("Download Table", selection);
				if(selection.length == 1){
					popup.open({
						popup: this._actions.SelectDownloadTable.options.tooltipDialog,
						around: this._actions.SelectDownloadTable.button,
						orient: ["below"]
					});
				}

			}, false);

			var dtsfc = '<div>Download Job Results:</div><div class="wsActionTooltip" rel="circos.svg">SVG Image</div><div class="wsActionTooltip" rel="genome_comparison.txt">Genome Comparison Table</div>';
			var downloadTTSelectFile = new TooltipDialog({
				content: dtsfc, onMouseLeave: function(){
					popup.close(downloadTTSelect);
				}
			});

			this.browserHeader.addAction("SelectDownloadSeqComparison", "fa icon-download fa-2x", {
				label: "DWNLD",
				multiple: false,
				validTypes: ["GenomeComparison"],
				tooltip: "Download Results",
				tooltipDialog: downloadTTSelectFile
			}, lang.hitch(this.browserHeader, function(selection){
				// console.log("Download Table", selection);
				// console.log("this._actions: ", this._actions);
				this._actions.SelectDownloadSeqComparison.selection = selection[0];
				if(selection.length == 1){
					popup.open({
						popup: this._actions.SelectDownloadSeqComparison.options.tooltipDialog,
						around: this._actions.SelectDownloadSeqComparison.button,
						orient: ["below"]
					});
				}
			}), false);

			on(downloadTTSelectFile.domNode, "div:click", lang.hitch(this.browserHeader, function(evt){
				var rel = evt.target.attributes.rel.value;
//				console.log("REL: ", rel);
//				console.log("SELECTION: ", this._actions.SelectDownloadSeqComparison.selection);
				var outputFiles = this._actions.SelectDownloadSeqComparison.selection.autoMeta.output_files;
				outputFiles.some(function(t){
					var fname = t[0];
					if(fname.indexOf(rel) >= 0){
						// console.log("DOWNLOAD: ", fname);
						WorkspaceManager.downloadFile(fname);
						return true;
					}
					return false;
				});
				popup.close(downloadTTSelectFile);
			}));

			this.browserHeader.addAction("ViewAnnotatedGenome", "fa icon-eye fa-2x", {
				label: "VIEW",
				multiple: false,
				validTypes: ["GenomeAnnotation"],
				tooltip: "View Annotated Genome"
			}, function(selection){
				// console.log("View Genome Annotation: ", selection[0]);
				var gid = self.actionPanel.currentContainerWidget.getGenomeId();
				Topic.publish("/navigate", {href: "/view/Genome/" + gid});

			}, false);

			this.browserHeader.addAction("ViewModel", "fa icon-eye fa-2x", {
				label: "VIEW",
				multiple: false,
				validTypes: ["model"],
				tooltip: "View Model @ ModelSEED.org"
			}, function(selection){
				var path = self.actionPanel.currentContainerWidget.getModelPath();
				var url = "http://modelseed.theseed.org/#/model" + path + "?login=patric";
				window.open(url, "_blank");
			}, false);

			this.browserHeader.addAction("ViewAnnotatedGenomeCDS", "fa icon-genome-features-cds fa-2x", {
				label: "CDS",
				multiple: false,
				validTypes: ["GenomeAnnotation"],
				tooltip: "View CDS for Annotated Genome"
			}, function(selection){
				// console.log("View Genome Annotation: ", selection[0]);
				var gid = self.actionPanel.currentContainerWidget.getGenomeId();
				Topic.publish("/navigate", {href: "/view/Genome/" + gid + "#view_tab=features&filter=and(eq(feature_type,CDS),eq(annotation,PATRIC))"});
			}, false);

			this.browserHeader.addAction("ViewAnnotatedGenomeBrowser", "fa icon-genome-browser fa-2x", {
				label: "BROWSER",
				multiple: false,
				validTypes: ["GenomeAnnotation"],
				tooltip: "View Annotated Genome in Genome Browser"
			}, function(selection){
				// console.log("View Genome Annotation: ", selection[0]);
				var gid = self.actionPanel.currentContainerWidget.getGenomeId();
				Topic.publish("/navigate", {href: "/view/Genome/" + gid + "#view_tab=browser"});

			}, false);

			this.browserHeader.addAction("Upload", "fa icon-upload fa-2x", {
				label: "UPLOAD",
				multiple: true,
				validTypes: ["folder"],
				tooltip: "Upload to Folder"
			}, function(selection){
				// console.log("UPLOAD TO: ", selection[0].path + selection[0].name);
				Topic.publish("/openDialog", {type: "Upload", params: selection[0].path + selection[0].name});
			}, self.path.split('/').length > 3);

			var addFolderBtn = this.browserHeader.addAction("CreateFolder", "fa icon-folder-plus fa-2x", {
				label: "ADD FOLDER",
				validTypes: ["folder"],
				tooltip: "Create Folder"
			}, function(sel){
				console.log('selection', sel)

				// selection may not be set if top level.
				var path = sel ? sel[0].path + sel[0].name : '/' + window.App.user.id;
				Topic.publish("/openDialog", {
					type: "CreateFolder",
					params: path
				});
			}, self.path.split('/').length > 3);

			var addFolderBtn = this.browserHeader.addAction("CreateWorkspace", "fa icon-hdd-o fa-2x", {
				label: "ADD WORKSPACE",
				validTypes: ["folder"],
				tooltip: "Create Workspace"
			}, function(sel){

				Topic.publish("/openDialog", {
					type: "CreateWorkspace",
				});
			},  self.path.split('/').length < 3);


			//addFolderBtnaddFolderBtn.innerHTML = "NEW WORKSPACE";

			var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div>';
			var viewFASTATT = new TooltipDialog({
				content: vfc, onMouseLeave: function(){
					popup.close(viewFASTATT);
				}
			});

			on(viewFASTATT.domNode, "div:click", function(evt){
				var rel = evt.target.attributes.rel.value;
				// console.log("REL: ", rel);
				var selection = self.actionPanel.get('selection');
				// console.log("selection: ", selection);
				popup.close(viewFASTATT);
				var idType = "feature_id";

				var ids = selection.map(function(d){
					return d['feature_id'];
				});

				Topic.publish("/navigate", {href: "/view/FASTA/" + rel + "/?in(" + idType + ",(" + ids.map(encodeURIComponent).join(",") + "))"});
			});

			this.actionPanel.addAction("ViewFASTA", "fa icon-fasta fa-2x", {
				label: "FASTA",
				ignoreDataType: true,
				multiple: true,
				validTypes: ["*"],
				validContainerTypes: ["feature_group"],
				tooltip: "View FASTA Data",
				tooltipDialog: viewFASTATT
			}, function(selection){
				popup.open({
					popup: this._actions.ViewFASTA.options.tooltipDialog,
					around: this._actions.ViewFASTA.button,
					orient: ["below"]
				});
				// console.log("popup viewFASTA", selection);

			}, false);

			this.actionPanel.addAction("MultipleSeqAlignment", "fa icon-alignment fa-2x", {
				label: "MSA",
				ignoreDataType: true,
				multiple: true,
				min: 2,
				validTypes: ["*"],
				validContainerTypes: ["feature_group"],
				tooltip: "Multiple Sequence Alignment"
			}, function(selection){
				var selection = self.actionPanel.get('selection');
				var ids = selection.map(function(d){
					return d['feature_id'];
				});

				xhr.post("/portal/portal/patric/FIGfam/FIGfamWindow?action=b&cacheability=PAGE", {
					data: {
						featureIds: ids.join(","),
						callType: 'toAligner'
					}
				}).then(function(results){
					Topic.publish("/navigate", {href: "/portal/portal/patric/MSA?cType=&cId=&pk=" + results});
				});

			}, false);

			var idMappingTTDialog = new TooltipDialog({
				content: IDMappingTemplate, onMouseLeave: function(){
					popup.close(idMappingTTDialog);
				}
			});

			on(idMappingTTDialog.domNode, "TD:click", function(evt){
				var rel = evt.target.attributes.rel.value;
				// console.log("REL: ", rel);
				var selection = self.actionPanel.get('selection');
				// console.log("selection: ", selection);
				var ids = selection.map(function(d){
					return d['feature_id'];
				});

				xhr.post("/portal/portal/patric/IDMapping/IDMappingWindow?action=b&cacheability=PAGE", {
					data: {
						keyword: ids.join(","),
						from: "feature_id",
						fromGroup: "PATRIC",
						to: rel,
						toGroup: (["seed_id", "feature_id", "alt_locus_tag", "refseq_locus_tag", "protein_id", "gene_id", "gi"].indexOf(rel) > -1) ? "PATRIC" : "Other",
						sraction: 'save_params'
					}
				}).then(function(results){
					Topic.publish("/navigate", {href: "/portal/portal/patric/IDMapping?cType=taxon&cId=131567&dm=result&pk=" + results});
				});
				popup.close(idMappingTTDialog);
			});

			this.actionPanel.addAction("idmapping", "fa icon-exchange fa-2x", {
				label: "ID MAP",
				ignoreDataType: true,
				multiple: true,
				validTypes: ["*"],
				validContainerTypes: ["feature_group"],
				tooltip: "ID Mapping",
				tooltipDialog: idMappingTTDialog
			}, function(selection){

				// console.log("TTDlg: ", this._actions.idmapping.options.tooltipDialog);
				// console.log("this: ", this);
				popup.open({
					popup: this._actions.idmapping.options.tooltipDialog,
					around: this._actions.idmapping.button,
					orient: ["below"]
				});
				// console.log("popup idmapping", selection);
			}, false);

			this.actionPanel.addAction("Pathway Summary", "fa icon-git-pull-request fa-2x", {
				label: "PATHWAY",
				ignoreDataType: true,
				multiple: true,
				validTypes: ["*"],
				validContainerTypes: ["feature_group"],
				tooltip: "Pathway Summary"
			}, function(selection){

				var selection = self.actionPanel.get('selection');
				var ids = selection.map(function(d){
					return d['feature_id'];
				});

				xhr.post("/portal/portal/patric/TranscriptomicsEnrichment/TranscriptomicsEnrichmentWindow?action=b&cacheability=PAGE", {
					data: {
						feature_id: ids.join(","),
						callType: 'saveParams'
					}
				}).then(function(results){
					Topic.publish("/navigate", {href: "/portal/portal/patric/TranscriptomicsEnrichment?cType=taxon&cId=131567&pk=" + results});
				});

			}, false);
/* */
			this.actionPanel.addAction("ExperimentGeneList", "fa icon-list-unordered fa-2x", {
				label: "GENES", multiple: true, validTypes: ["DifferentialExpression"],
				tooltip: "View Gene List"
			}, function(selection){
				// console.log("View Gene List", selection);
				var url = "/view/TranscriptomicsExperiment/?&wsExpId=" + selection.map(function(s){
						return s.path;
					});
				Topic.publish("/navigate", {href: url});
			}, false);

			this.actionPanel.addAction("ExperimentGeneList3", "fa icon-list-unordered fa-2x", {
				label: "GENES",
				multiple: true,
				validTypes: ["*"],
				validContainerTypes: ["experiment"],
				tooltip: "View Experiment Gene List"
			}, function(selection){
				// console.log("this.currentContainerType: ", this.currentContainerType, this);
				// console.log("View Gene List", selection);
				var expPath = this.currentContainerWidget.get('path');
				var url = "/view/TranscriptomicsExperiment/?&wsExpId=" + expPath + "&wsComparisonId=" + selection.map(function(s){
						return s.pid;
					});
				Topic.publish("/navigate", {href: url});
			}, false);

			this.actionPanel.addAction("ExperimentGeneList2", "fa icon-list-unordered fa-2x", {
				label: "GENES",
				multiple: true,
				allowMultiTypes: true,
				validContainerTypes: ["experiment_group"],
				validTypes: ["*"],
				tooltip: "View Experiment Group Gene List"
			}, function(selection){
				// console.log("View Gene List2", selection);
				var eids = [];
				var wsExps = [];
				selection.forEach(function(s){
					if(s.path){
						wsExps.push(s.path);
					}else if(s.eid){
						eids.push(s.eid);
					}

				});
				var url = "/view/TranscriptomicsExperiment/?";
				if(eids && eids.length > 0){
					url = url + "in(eid,(" + eids.join(",") + "))";
				}
				if(wsExps && wsExps.length > 0){
					url = url + "&wsExpId=" + wsExps.join(",");
				}

				Topic.publish("/navigate", {href: url});
			}, false);

			this.actionPanel.addAction("RemoveItem", "fa icon-x fa-2x", {
				label: "REMOVE",
				ignoreDataType: true,
				multiple: true,
				validTypes: ["*"],
				validContainerTypes: ["genome_group", "feature_group"],
				tooltip: "Remove Selection from Group"
			}, function(selection){
				// console.log("Remove Items from Group", selection);
				// console.log("currentContainerWidget: ", this.currentContainerWidget);

				var idType = (this.currentContainerWidget.containerType == "genome_group") ? "genome_id" : "feature_id";
				var type = (idType == "genome_id") ? "genome" : "genome feature";
				var objs = selection.map(function(s){
					// console.log('s: ', s, s.data);
					return s[idType];
				});

				var conf = "Are you sure you want to remove " + objs.length + " " + type +
					((objs.length > 1) ? "s" : "") +
					" from this group?";
				var _self = this;
				var dlg = new Confirmation({
					content: conf,
					onConfirm: function(evt){
						// console.log("remove items from group, ", objs, _self.currentContainerWidget.get('path'));
						Deferred.when(WorkspaceManager.removeFromGroup(_self.currentContainerWidget.get('path'), idType, objs), function(){
							if(_self.currentContainerWidget && _self.currentContainerWidget.refresh){
								_self.currentContainerWidget.refresh();
							}else{
								console.log("No current container Widget or no refresh() on it");
							}
						});
					}
				});
				dlg.startup();
				dlg.show();

			}, false);

			this.actionPanel.addAction("SplitItems", "fa icon-split fa-2x", {
				label: "SPLIT",
				ignoreDataType: true,
				multiple: true,
				validTypes: ["*"],
				validContainerTypes: ["genome_group", "feature_group", "experiment_group"],
				tooltip: "Copy selection to a new or existing group"
			}, function(selection, containerWidget){
				// console.log("Add Items to Group", selection);
				var dlg = new Dialog({title: "Copy Selection to Group"});
				var stg = new SelectionToGroup({
					selection: selection,
					type: containerWidget.containerType,
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
			}, false);

			this.actionPanel.addAction("GroupExplore", "fa icon-venn_circles fa-2x", {
					label: "VennDiag",
					ignoreDataType: false,
					allowMultiTypes: false,
					min: 2,
					max: 3,
					multiple: true,
					validTypes: ["genome_group", "feature_group", "experiment_group"],
					tooltip: "Select two or three groups to compare"
				}, function(selection, containerWidget){

					var dlg = new Dialog({
						title: "Group Comparison",
						style: "width: 1250px !important; height: 750px !important;",
						onHide: function(){
							dlg.destroy()
						}
					});
					var bc = new BorderContainer({});
					domConstruct.place(bc.domNode, dlg.containerNode);
					var stg = new GroupExplore({
						selection: selection,
						type: containerWidget.containerType,
						path: containerWidget.get("path"),
						containerNode: dlg.containerNode
					});
					bc.addChild(stg);
					dlg.startup();
					dlg.show();
				},
				false);

			this.actionPanel.addAction("DeleteItem", "fa icon-trash fa-2x", {
				label: "DELETE",
				allowMultiTypes: true,
				multiple: true,
				validTypes: ["genome_group", "feature_group", "experiment_group", "job_result", "unspecified", "contigs", "reads", "diffexp_input_data", "diffexp_input_metadata", "DifferentialExpression", "GenomeAssembly", "GenomeAnnotation", "RNASeq", "feature_protein_fasta"],
				tooltip: "Delete Selection"
			}, function(selection){
				var objs = selection.map(function(s){
					// console.log('s: ', s, s.data);
					return s.path || s.data.path;
				});
				var conf = "Are you sure you want to delete" +
					((objs.length > 1) ? " these objects" : " this object") +
					" from your workspace?"

				var dlg = new Confirmation({
					content: conf,
					onConfirm: function(evt){
						WorkspaceManager.deleteObject(objs, true, false);
					}
				});
				dlg.startup();
				dlg.show();
			}, false);

			this.actionPanel.addAction("DeleteFolder", "fa icon-trash fa-2x", {
				label: "DELETE",
				allowMultiTypes: false,
				multiple: true,
				validTypes: ["folder"],
				tooltip: "Delete Folder"
			}, function(selection){
				var objs = selection.map(function(s){
					console.log('s: ', s, s.data);
					return s.path || s.data.path;
				});
				var conf = "Are you sure you want to delete" +
					((objs.length > 1) ? " these folders" : " this folder") +
					" and its contents from your workspace?"

				var dlg = new Confirmation({
					content: conf,
					onConfirm: function(evt){
						WorkspaceManager.deleteObject(objs, true, true);
					}
				})
				dlg.startup()
				dlg.show();

			}, false);


			this.actionPanel.addAction("ShareFolder", "fa icon-user-plus fa-2x", {
				label: "SHARE",
				allowMultiTypes: false,
				multiple: true,
				validTypes: ["folder"],
				tooltip: "Share Folder",
			}, function(selection){
				//console.log('The selection', selection)

				// get folder selected
				var folderPath = selection.map(function(s){
					return s.path || s.data.path;
				})[0];

				self.userPermDialog(folderPath, selection)

			}, false);

			this.actionPanel.addAction("Rename", "fa icon-pencil-square-o fa-2x", {
				label: "RENAME",
				allowMultiTypes: false,
				multiple: false,
				validTypes: ["*"],
				tooltip: "Rename folders or objects",
			}, function(selection){
				//console.log('The selection', selection)

				var path = selection.map(function(s){
					return s.path || s.data.path;
				})[0];

				self.renameDialog(path)

			}, false);


			this.itemDetailPanel = new ItemDetailPanel({
				region: "right",
				style: "width: 300px",
				splitter: true,
				layoutPriority: 1
			})
			this.itemDetailPanel.startup();
			this.addChild(this.actionPanel);
			this.addChild(this.itemDetailPanel);
			this.addChild(this.browserHeader);

			this.inherited(arguments);

		},

		renameDialog: function(path){
			var self = this;
			var conf = '';

			var currentName = path.slice(path.lastIndexOf('/')+1);
			var nameInput = new TextBox({
				name: "name",
				value: currentName,
				style: { width: '500px'},
				placeHolder: "Enter your new name..."
			});

			//domConstruct.place(nameInput, conf);

			var dlg = new Confirmation({
				title: "Rename <i>"+path+'</i>',
				content: nameInput.domNode,
				okLabel: 'Rename',
				closeOnOK: false,
				style: { width: '600px' },
				onConfirm: function(evt){
					var _self = this;

					console.log(nameInput.get('value'), path.slice(path.lastIndexOf('/')+1))
					if (path.slice(path.lastIndexOf('/')+1) == nameInput.get('value'))
						var d = new Dialog({
							content: "Please pick a new name.",
							title: "Oh no!",
							style: "width: 250px !important;"
						}).show();

					var prom = WorkspaceManager.rename(path, nameInput.get('value'))
					Deferred.when(prom, function(res){
						console.log('renamed the FIlE!')
						Topic.publish("/refreshWorkspace", {});
						Topic.publish("/Notification", {message: "File renamed", type: "message"});

						self.actionPanel.set("selection", []);
						self.itemDetailPanel.set('selection', []);
						_self.hideAndDestroy();
					}, function(error){
						console.log('DID NOT RENaME FILE', error)

						var d = new Dialog({
							content: error.toString(),
							title: "Oh no!",
							style: "width: 250px !important;"
						}).show();
					})


				}
			})
			dlg.startup()
			dlg.show();
		},

		userPermDialog: function(folderPath, selection){
			var self = this;
			// data model for user permissions
			var userPerms = [];

			// build user permission form
			var conf = domConstruct.toDom('<div class="userPermForm">')

			var currentUsers = domConstruct.toDom(
				'<table class="currentUsers p3basic striped">'+
					'<thead>'+
						'<th>User Name'+
						'<th>Permission'+
					'<tbody>'
			);

			// user's permission
			var userSelector = new UserSelector({
				name: "user",
				//style: { maxHeight: '200px' }
			})


			// user's permission
			var permSelect = new Select({
				name: "perm",
				style: { width: '100px', margin: '0 10px' },
				options: [
					{
						label: "Can view",
						value: "r",
						selected: true
					},{
						label: "Can edit",
						value: "w",
					}
				]
			})

			// add user button.
			// Note: on click the user is added server side.
			var addUserBtn = new Button({
				label: "Add User",
				//disabled: true,
				onClick: function(){
					var userId = userSelector.getSelected();
						perm = permSelect.attr('value')

					console.log('user/perm', userId, perm, folderPath)

					if (!userId.length) return;

					var prom = WorkspaceManager.setPermissions(folderPath, [[userId, perm]]);
					Deferred.when(prom, lang.hitch(this, function(result) {
						console.log('userId perm', userId, perm)
						dojo.place(
							'<tr>'+
								'<td data-user="'+userId+'">'+userId+
								'<td data-perm="'+perm+'">'+Formatter.permissionMap(perm)+
								'<td style="width: 1px;"><i class="fa icon-trash fa-2x">',
							query('tbody', currentUsers)[0]
						);

						reinitDeleteEvents();

						// reset filter select
						userSelector.reset();
					}))
				}
			});

			domConstruct.place(currentUsers, conf, "first")
			domConstruct.place(userSelector.domNode, conf)
			domConstruct.place(permSelect.domNode, conf, "last")
			domConstruct.place(addUserBtn.domNode, conf, "last")

			// open form in dialog
			var dlg = new Confirmation({
				title: "Edit Sharing",
				okLabel: "Done",
				cancelLabel: false,
				content: conf,
				style: { width: '700px'},
				onConfirm: function(evt){
					Topic.publish('/refreshWorkspace')
				}
			})

			// create current permission table
			var prom = WorkspaceManager.listPermissions(folderPath);
			Deferred.when(prom, function(perms){
				console.log('permission', perms, query('tbody', currentUsers))
				perms.forEach(function(perm){
					if(perm[0] == 'global_permission') return;

					userPerms.push({
						user: perm[0],
						permission: perm[1]
					})


					dojo.place(
						'<tr>'+
							'<td data-user="'+perm[0]+'">'+perm[0]+
							'<td data-perm="'+perm[1]+'">'+Formatter.permissionMap(perm[1])+
							'<td style="width: 1px;"><i class="fa icon-trash fa-2x">',
						query('tbody', currentUsers)[0]
					);
				})

				if(!perms.length) {
					dojo.place('<tr>Folder not shared...', query('tbody', currentUsers)[0])
				}

				// event for deleting users
				reinitDeleteEvents();
			})


			function reinitDeleteEvents(){
				query('tbody .icon-trash', currentUsers).on('click', function(){
					var _self = this;
					var userRow = query('tr [data-user="'+userId+'"]').parents('tr'),
						userId = dojo.attr(query('tr [data-user]', userRow[0])[0], 'data-user')
						//perm = dojo.attr(query('[data-perm]', userRow)[0], 'data-perm');

					console.log('userId', userId )

					var prom = WorkspaceManager.setPermissions(folderPath, [[userId, 'n']]);
					Deferred.when(prom, lang.hitch(this, function(result){
						console.log('user Row', userRow)
						console.log('deleted user!', userId)
						domConstruct.destroy(query('tr [data-user="'+userId+'"]').parents('tr')[0])
					}, function(err){
						var parts = err.split("_ERROR_");
						var d = new Dialog({
							content: parts[1] || parts[0],
							title: "Error deleting user: "+userId,
							style: "width: 250px !important;"
						}).show();
					}))
				})

			}

			dlg.startup()
			dlg.show();
		},

		_setPathAttr: function(val){
			// console.log("WorkspaceBrowser setPath()", val)
			this.path = decodeURIComponent(val);
			var parts = this.path.split("/").filter(function(x){
				return x != "";
			}).map(function(c){
				return decodeURIComponent(c)
			});
			var workspace = parts[0] + "/" + parts[1];
			var obj;

			if(parts[0] == 'public') {
				if (parts.length == 1){
					obj = {metadata: {type: "folder"}, type: "folder", path: "/", isPublic: true}
				}else{
					var val = '/' + val.split('/').slice(2).join('/');
					obj = WorkspaceManager.getObject(val, true)
				}
			}else if(!parts[1]){
				obj = {metadata: {type: "folder"}, type: "folder", path: "/" + window.App.user.id, isWorkspace: true}
			}else{
				//if(val[val.length - 1] == "/"){
				//	ws = ws.substr(0, ws.length - 1)
				//}
				obj = WorkspaceManager.getObject(val, true)
			}
			Deferred.when(obj, lang.hitch(this, function(obj){

				if(this.browserHeader){
					this.browserHeader.set("selection", [obj]);
				}
				var panelCtor;
				var params = {path: this.path, region: "center"}

				switch(obj.type){
					case "folder":
						panelCtor = WorkspaceExplorerView;
						break;
					case "genome_group":
						panelCtor = window.App.getConstructor("p3/widget/viewer/WSGenomeGroup");
						params.query = "?&in(genome_id,GenomeGroup(" + encodeURIComponent(this.path).replace("(", "%28").replace(")", "%29") + "))";
						break;
					case "feature_group":
						panelCtor = window.App.getConstructor("p3/widget/viewer/WSFeatureList");
						params.query = "?&in(feature_id,FeatureGroup(" + encodeURIComponent(this.path) + "))";
						break;
					case "model":
						panelCtor = window.App.getConstructor("p3/widget/viewer/Model");
						params.data = obj;
						break;
					case "job_result":
						var d = "p3/widget/viewer/JobResult";
						// console.log("job_result object: ", obj);
						if(obj && obj.autoMeta && obj.autoMeta.app){
							var id = obj.autoMeta.app.id || obj.autoMeta.app;
							switch(id){
								case "DifferentialExpression":
									// console.log("Using Experiement Viewer");
									d = "p3/widget/viewer/Experiment";
									break;
								case "GenomeComparison":
									// console.log("SeqComparison Viewer");
									d = "p3/widget/viewer/SeqComparison";
									break;
								case "GenomeAnnotation":
									// console.log("GenomeAnnotation Viewer");
									d = "p3/widget/viewer/GenomeAnnotation";
									break;
							}
						}
						// console.log("LOAD VIEWER: ", d, params);
						panelCtor = window.App.getConstructor(d);
						params.data = obj;
						//params.query="?&in(feature_id,FeatureGroup("+encodeURIComponent(this.path)+"))";
						break;
					case "experiment_group":
						panelCtor = window.App.getConstructor("p3/widget/viewer/ExperimentGroup");
						params.data = obj;
						break;
					default:
						panelCtor = window.App.getConstructor("p3/widget/viewer/File");
						params.file = {metadata: obj};
					// console.log("FileViewer Ctor params: ", params);
				}

				Deferred.when(panelCtor, lang.hitch(this, function(Panel){
					// console.log("ActivePanel instanceof Panel: ", this.activePanel instanceof Panel);
					if(!this.activePanel || !(this.activePanel instanceof Panel)){
						if(this.activePanel){
							this.removeChild(this.activePanel);
						}
						// console.log("Creeate New Active Panel");
						var newPanel = new Panel(params);
						var hideTimer;

						if (this.actionPanel) {
							this.actionPanel.set("currentContainerWidget", newPanel);
							this.itemDetailPanel.set("containerWidget", newPanel);
						}

						if(newPanel.on){
							newPanel.on("select", lang.hitch(this, function(evt){
								var sel = Object.keys(evt.selected).map(lang.hitch(this, function(rownum){
									//console.log("Row: ", evt.grid.row(rownum).data);
									return evt.grid.row(rownum).data;
								}));

								if(hideTimer){
									clearTimeout(hideTimer);
								}
								if(sel.length > 0){
									this.addChild(this.actionPanel);
								}

								this.actionPanel.set("selection", sel);
								this.itemDetailPanel.set('selection', sel);
							}));

							newPanel.on("deselect", lang.hitch(this, function(evt){

								if(!evt.selected){
									this.actionPanel.set("selection", []);
									this.itemDetailPanel.set("selection", []);
								}else{
									var sel = Object.keys(evt.selected).map(lang.hitch(this, function(rownum){
										// console.log("rownum: ", rownum);
										// console.log("Row: ", evt.grid.row(rownum).data);
										return evt.grid.row(rownum).data;
									}));
								}
								// console.log("selection: ", sel);
								this.actionPanel.set("selection", sel);
								this.itemDetailPanel.set('selection', sel);
							}));

							newPanel.on("ItemDblClick", lang.hitch(this, function(evt){
								// console.log("ItemDblClick: ", evt);
								if(evt.item && evt.item.type && (this.navigableTypes.indexOf(evt.item.type) >= 0)){
									Topic.publish("/navigate", {href: "/workspace" + evt.item_path})
									this.actionPanel.set("selection", []);
									this.itemDetailPanel.set("selection", []);
									// console.log("SHOW LOADING STATUS SOMEHOW");
									newPanel.clearSelection();
								}else{
									console.log("non-navigable type, todo: show info panel when dblclick");
								}

							}));
						}

						this.addChild(newPanel);
						this.activePanel = newPanel;
					}else{
						this.activePanel.set('path', this.path);
						if(this.activePaneal && 'clearSelection' in this.activePaneal){
							this.activePanel.clearSelection();
						}
					}

					var parts = this.path.split("/").filter(function(x){
						return x != "";
					}).map(function(c){
						return decodeURIComponent(c)
					});
					var workspace = parts[0] + "/" + parts[1];
					// console.log("Publish to ActiveWorkspace:", workspace, val)
					WorkspaceManager.set("currentPath", val);
//					Topic.publish("/ActiveWorkspace",{workspace: workspace, path:val});

					// console.log("Set Browser Heade	 Path: ", this.path);
					if (this.browserHeader)
						this.browserHeader.set("path", this.path);
				}));

			}), lang.hitch(this, function(err){
				var parts = err.split("_ERROR_");
				var m = parts[1] || parts[0];
				var d = new Dialog({
					content: m,
					title: "Error Loading Workspace",
					style: "width: 250px !important;"
				});
				d.show();
			}));
		},

		getQuery: function(obj){
			var query = "";
			switch(obj.type){
				case "genome_group":
					query = "?&in(genome_id,GenomeGroup(" + encodeURIComponent(obj.path).replace("(", "%28").replace(")", "%29") + "))";
					break;
				case "feature_group":
					query = "?&in(feature_id,FeatureGroup(" + encodeURIComponent(obj.path) + "))";
					break;
			}
			return query;
		},

		refresh: function(){
			if(this.activePanel instanceof WorkspaceExplorerView){
				this.explorer.refreshWorkspace()
			}
		},

		getMenuButtons: function(){
			this.buttons = [];
			return this.buttons;

		}
	});
});
