require({cache:{
'url:p3/widget/templates/IDMapping.html':"<div>\t\n\t<table class=\"idMappingTable\" style=\"width:315px;\">\n\t<tbody>\n\t\t<tr><th class=\"idMappingHeader\">PATRIC Identifiers</th><th class=\"idMappingHeader\" >REFSEQ Identifiers</th></tr>\n\t\t<tr><td rel=\"patric_id\">PATRIC ID</td><td rel=\"refseq_locus_tag\">RefSeq Locus Tag</td></tr>\n\t\t<tr><td rel=\"feature_id\" >Feature ID</td><td rel=\"protein_id\">RefSeq</td></tr>\n\t\t<tr><td rel=\"alt_locus_tag\">Alt Locus Tag</td><td rel=\"gene_id\">Gene ID</td></tr>\n\t\t<tr><td></td><td rel=\"gi\">GI</td></tr>\n\t</tbody>\n\t</table>\n\t<table class=\"idMappingTable\" style=\"width:315px;\">\n\t<tbody>\n\t\t<tr><th class=\"idMappingHeader\" colspan=\"3\">Other Identifiers</th></tr>\n\t\t<tr><td rel=\"Allergome\">Allergome</td><td rel=\"BioCyc\">BioCyc</td><td rel=\"DIP\">DIP</td></tr>\n\t\t<tr><td rel=\"DisProt\">DisProt</td><td rel=\"DrugBank\">DrugBank</td><td rel=\"ECO2DBASE\">ECO2DBASE</td></tr>\n\t\t<tr><td rel=\"EMBL\">EMBL</td><td rel=\"EMBL-CDS\">EMBL-CDS</td><td rel=\"EchoBase\">EchoBASE</td></tr>\n\t\t<tr><td rel='EcoGene'>EcoGene</td><td rel=\"EnsemblGenome\">EnsemblGenome</td><td rel=\"EnsemblGenome_PRO\">EnsemblGenome_PRO</td></tr>\n\t\t<tr><td rel=\"EnsemblGenome_TRS\">EnsemblGenome_TRS</td><td rel=\"GeneTree\">GeneTree</td><td rel=\"GenoList\">GenoList</td></tr>\n\t\t<tr><td rel=\"GenomeReviews\">GenomeReviews</td><td rel=\"HOGENOM\">HOGENOM</td><td rel=\"HSSP\">HSSP</td></tr>\n\t\t<tr><td rel=\"KEGG\">KEGG</td><td rel=\"LegioList\">LegioList</td><td rel=\"Leproma\">Leproma</td></tr>\n\t\t<tr><td rel=\"MEROPS\">MEROPS</td><td rel=\"MINT\">MINT</td><td rel=\"NMPDR\">NMPDR</td></tr>\n\t\t<tr><td rel=\"OMA\">OMA</td><td rel=\"OrthoDB\">OrthoDB</td><td rel=\"PDB\">PDB</td></tr>\n\t\t<tr><td rel=\"PeroxiBase\">PeroxiBase</td><td rel=\"PptaseDB\">PptaseDB</td><td rel=\"ProtClustDB\">ProtClustDB</td></tr>\n\t\t<tr><td rel=\"PsuedoCAP\">PseudoCAP</td><td rel=\"REBASE\">REBASE</td><td rel=\"Reactome\">Reactome</td></tr>\n\t\t<tr><td rel=\"RefSeq_NT\">RefSeq_NT</td><td rel=\"TCDB\">TCDB</td><td rel=\"TIGR\">TIGR</td></tr>\n\t\t<tr><td rel=\"TubercuList\">TubercuList</td><td rel=\"UniParc\">UniParc</td><td rel=\"UniProtKB-Accession\">UnitProtKB-Accesssion</td></tr>\n\t\t<tr><td rel=\"UniRef100\">UniRef100</td><td rel=\"UniProtKB-ID\">UnitProtKB-ID</td><td rel=\"UniRef100\">UniRef100</td></tr>\n\t\t<tr><td rel=\"UniRef50\">UniRef50</td><td rel=\"UniRef90\">UniRef90</td><td rel=\"World-2DPAGE\">World-2DPAGE</td></tr>\n\t\t<tr><td rel=\"eggNOG\">eggNOG</td></tr>\n\t</tbody>\n\t</table>\n</div>\n"}});
define("p3/widget/WorkspaceBrowser", [
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/query",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct", "dojo/dom-attr",
	"./WorkspaceExplorerView", "dojo/topic", "./ItemDetailPanel",
	"./ActionBar", "dojo/_base/Deferred", "../WorkspaceManager", "dojo/_base/lang",
	"./Confirmation", "./SelectionToGroup", "dijit/Dialog", "dijit/TooltipDialog",
	"dijit/popup", "dojo/text!./templates/IDMapping.html", "dojo/request", "dijit/form/Select", "dijit/form/CheckBox",
	"./ContainerActionBar", "./GroupExplore", "./PerspectiveToolTip", "../widget/UserSelector",
	"dijit/form/Button", "./formatter", "dijit/form/TextBox", "./WorkspaceObjectSelector",

	"dojo/NodeList-traverse"
], function(
	declare, BorderContainer, on, query,
	domClass, ContentPane, domConstruct, domAttr,
	WorkspaceExplorerView, Topic, ItemDetailPanel,
	ActionBar, Deferred, WorkspaceManager, lang,
	Confirmation, SelectionToGroup, Dialog, TooltipDialog,
	popup, IDMappingTemplate, xhr, Select, CheckBox,
	ContainerActionBar, GroupExplore, PerspectiveToolTipDialog, UserSelector,
	Button, Formatter, TextBox, WSObjectSelector){
	return declare([BorderContainer], {
		baseClass: "WorkspaceBrowser",
		disabled: false,
		path: "/",
		gutters: false,
		navigableTypes: ["parentfolder", "folder", "job_result", "experiment_group",
			"experiment", "unspecified", "contigs", "reads", "model", "txt", "html",
			"pdf", "string", "json", "csv", "diffexp_experiment",
			"diffexp_expression", "diffexp_mapping", "diffexp_sample",
			"diffexp_input_data", "diffexp_input_metadata", "svg", "gif", "png", "jpg"],
		design: "sidebar",
		splitter: false,
		startup: function(){
			var self = this;

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

			this.actionPanel.addAction("DownloadItem", "fa icon-download fa-2x", {
				label: "DWNLD",
				multiple: false,
				validTypes: WorkspaceManager.downloadTypes,
				tooltip: "Download"
			}, function(selection){
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
				var selection = self.actionPanel.get('selection');
				var dataType = (self.actionPanel.currentContainerWidget.containerType == "genome_group") ? "genome" : "genome_feature";
				var currentQuery = self.actionPanel.currentContainerWidget.get('query');

				window.open(window.App.dataServiceURL + "/" + dataType + "/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download=true");
				popup.close(downloadTT);
			});

			this.browserHeader.addAction("DownloadTable", "fa icon-download fa-2x", {
				label: "DWNLD",
				multiple: false,
				validTypes: ["genome_group", "feature_group"],
				tooltip: "Download Table",
				tooltipDialog: downloadTT
			}, function(selection){
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

				var urlStr = window.App.dataServiceURL + "/" + dataType + "/" + currentQuery + "&http_authorization=" +
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
				if(selection.length == 1){
					popup.open({
						popup: this._actions.SelectDownloadTable.options.tooltipDialog,
						around: this._actions.SelectDownloadTable.button,
						orient: ["below"]
					});
				}

			}, false);

			var dtsfc = '<div>Download Job Results:</div>'+
						'<div class="wsActionTooltip" rel="circos.svg">SVG Image</div>'+
						'<div class="wsActionTooltip" rel="genome_comparison.txt">Genome Comparison Table</div>';
			var downloadTTSelectFile = new TooltipDialog({
				content: dtsfc, onMouseLeave: function(){
					popup.close(downloadTTSelect);
				}
			});

			this.actionPanel.addAction("ViewItem", "fa icon-eye fa-2x", {
				label: "VIEW",
				multiple: false,
				validTypes: WorkspaceManager.viewableTypes,
				tooltip: "View in Browser"
			}, function(selection){
				console.log("[WorkspaceBrowser] View Item Action", selection);
				Topic.publish("/navigate", {href: "/workspace" + selection[0].path});
			}, false);

			this.browserHeader.addAction("ViewSeqComparison", "fa icon-eye fa-2x", {
				label: "VIEW",
				multiple: false,
				validTypes: ["GenomeComparison"],
				tooltip: "Toggle Summary View"
			}, function(selection){
				// console.log("View Genome Comparison: ", selection[0]);
				// console.log("currentContainerWidget: ", typeof self.actionPanel.currentContainerWidget);
				var cid = self.actionPanel.currentContainerWidget.getComparisonId();
				if (self.actionPanel.currentContainerWidget.isSummaryView()) {
					Topic.publish("/navigate", {href: "/workspace" + cid});
				} else {
					Topic.publish("/navigate", {href: "/workspace" + cid + "#summary"});
				}
			}, false);

			this.browserHeader.addAction("SelectDownloadSeqComparison", "fa icon-download fa-2x", {
				label: "DWNLD",
				multiple: false,
				validTypes: ["GenomeComparison"],
				tooltip: "Download Results",
				tooltipDialog: downloadTTSelectFile
			}, lang.hitch(this.browserHeader, function(selection){
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
				var outputFiles = this._actions.SelectDownloadSeqComparison.selection.autoMeta.output_files;
				outputFiles.some(function(t){
					var fname = t[0];
					if(fname.indexOf(rel) >= 0){
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
				validTypes: ["GenomeAnnotation", "GenomeAnnotationGenbank"],
				tooltip: "View Annotated Genome"
			}, function(selection){
				var gid = self.actionPanel.currentContainerWidget.getGenomeId();
				Topic.publish("/navigate", {href: "/view/Genome/" + gid});

			}, false);

			this.browserHeader.addAction("ViewModel", "fa icon-eye fa-2x", {
				label: 'VIEW <i class="icon-external-link"></i>',
				multiple: false,
				validTypes: ["model"],
				tooltip: 'View Model @ ModelSEED.org'
			}, function(selection){
				var path = self.actionPanel.currentContainerWidget.getModelPath();

				// adjust path for legacy modelseed
				var parts = path.split('/');
				var isLegacy = parts[1] == 'models';
				path = parts.slice(0, -1).join('/') + '/' + (isLegacy ? '' : '.') + parts.slice(-1)[0];

				var url = "http://modelseed.theseed.org/#/model" + path + "?login=patric";
				window.open(url, "_blank");
			}, false);

			this.browserHeader.addAction("ViewAnnotatedGenomeCDS", "fa icon-genome-features-cds fa-2x", {
				label: "CDS",
				multiple: false,
				validTypes: ["GenomeAnnotation", "GenomeAnnotationGenbank"],
				tooltip: "View CDS for Annotated Genome"
			}, function(selection){
				var gid = self.actionPanel.currentContainerWidget.getGenomeId();
				Topic.publish("/navigate", {
					href: "/view/Genome/" + gid + "#view_tab=features&filter=and(eq(feature_type,CDS),eq(annotation,PATRIC))"
				});
			}, false);

			this.browserHeader.addAction("ViewAnnotatedGenomeBrowser", "fa icon-genome-browser fa-2x", {
				label: "BROWSER",
				multiple: false,
				validTypes: ["GenomeAnnotation", "GenomeAnnotationGenbank"],
				tooltip: "View Annotated Genome in Genome Browser"
			}, function(selection){
				var gid = self.actionPanel.currentContainerWidget.getGenomeId();
				Topic.publish("/navigate", {href: "/view/Genome/" + gid + "#view_tab=browser"});

			}, false);

			this.browserHeader.addAction("Upload", "fa icon-upload fa-2x", {
				label: "UPLOAD",
				multiple: true,
				validTypes: ["folder"],
				tooltip: "Upload to Folder"
			}, function(selection){
				Topic.publish("/openDialog", {type: "Upload", params: selection[0].path + selection[0].name});
			}, false);

			this.browserHeader.addAction("CreateFolder", "fa icon-folder-plus fa-2x", {
				label: "ADD FOLDER",
				validTypes: ["folder"],
				tooltip: "Create Folder"
			}, function(sel){
				// selection may not be set if top level.
				var path = sel ? sel[0].path + sel[0].name : '/' + window.App.user.id;
				Topic.publish("/openDialog", {
					type: "CreateFolder",
					params: path
				});
			}, self.path.split('/').length > 3);

			this.browserHeader.addAction("ShowHidden", (window.App.showHiddenFiles ? "fa icon-eye-slash" : "fa icon-eye") , {
				label: "SHOW HIDDEN",
				multiple: true,
				validTypes: ["folder"],
				tooltip: "Show hidden folders/files"
			}, function(selection){
				window.App.showHiddenFiles = !window.App.showHiddenFiles;
				self.activePanel.set('showHiddenFiles', window.App.showHiddenFiles);

				// change icon/text based on state
				var icon = query('[rel="ShowHidden"] .fa', this.domNode)[0],
					text = query('[rel="ShowHidden"] .ActionButtonText', this.domNode)[0];

				domClass.toggle(icon, "icon-eye-slash");
				domClass.toggle(icon, "icon-eye");

				if(window.App.showHiddenFiles)
					domAttr.set(text, "textContent", "HIDE HIDDEN");
				else
					domAttr.set(text, "textContent", "SHOW HIDDEN");
			}, false);

			var addWSBtn = this.browserHeader.addAction("CreateWorkspace", "fa icon-add-workspace fa-2x", {
				label: "NEW WS",
				validTypes: ["folder"],
				tooltip: "Create Workspace"
			}, function(sel){

				Topic.publish("/openDialog", {
					type: "CreateWorkspace"
				});
			},  self.path.split('/').length < 3);

            this.browserHeader.addAction("ViewTree", "fa icon-tree2 fa-2x", {
				label: "VIEW",
				multiple: false,
				validTypes: ["PhylogeneticTree"],
				tooltip: "View Tree"
			}, function(selection){
				// console.log("View Experiment: ", selection[0]);
				var expPath = this.get('path');
				Topic.publish("/navigate", {href: "/view/PhylogeneticTree/?&labelSearch=true&idType=genome_id&labelType=genome_name&wsTreeFolder=" + expPath});

			}, false);


			this.actionPanel.addAction("ViewNwk", "fa icon-tree2 fa-2x", {
				label: "VIEW",
				multiple: false,
				validTypes: ["nwk"],
				tooltip: "View Tree"
			}, function(selection){
				// console.log("View Experiment: ", selection[0]);
				var path = selection.map(function(obj){ return obj.path });
				Topic.publish("/navigate", {href: "/view/PhylogeneticTree/?&labelSearch=true&idType=genome_id&labelType=genome_name&wsTreeFile=" + path[0]});
			}, false);


			this.browserHeader.addAction("ViewExperimentSummary", "fa icon-eye fa-2x", {
				label: "VIEW",
				multiple: false,
				validTypes: ["DifferentialExpression"],
				tooltip: "Toggle Summary View"
			}, function(selection){
				console.log("View Experiment Summary: ", selection[0]);
				var eid = self.actionPanel.currentContainerWidget.getExperimentId();
				if (self.actionPanel.currentContainerWidget.isSummaryView()) {
					Topic.publish("/navigate", {href: "/workspace" + eid});
				} else {
					Topic.publish("/navigate", {href: "/workspace" + eid + "#summary"});
				}
			}, false);

			this.browserHeader.addAction("ViewExperiment", "fa icon-selection-Experiment fa-2x", {
				label: "EXPRMNT",
				multiple: false,
				validTypes: ["DifferentialExpression"],
				tooltip: "View Experiment"
			}, function(selection){
				// console.log("View Experiment: ", selection[0]);
				var eid = self.actionPanel.currentContainerWidget.getExperimentId();
				Topic.publish("/navigate", {href: "/view/TranscriptomicsExperiment/?&wsExpId=" + eid});

			}, false);



			this.browserHeader.addAction("ViewTracks", "fa icon-genome-browser fa-2x", {
				label: "BROWSER",
				multiple: false,
				validTypes: ["RNASeq", "TnSeq", "Variation"],
				tooltip: "View tracks in genome browser."
			}, function(selection){
				console.log("View Tracks: ", selection[0]);
				var genomeId = self.actionPanel.currentContainerWidget.getGenomeId();
				var urlQueryParams = self.actionPanel.currentContainerWidget.getJBrowseURLQueryParams();
				Topic.publish("/navigate", {href: "/view/Genome/"+genomeId+"#"+urlQueryParams});

			}, false);

/* */
			this.actionPanel.addAction("ExperimentGeneList", "fa icon-list-unordered fa-2x", {
				label: "GENES", multiple: true, validTypes: ["DifferentialExpression"],
				tooltip: "View Gene List"
			}, function(selection){
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


			this.actionPanel.addAction("SplitItems", "fa icon-split fa-2x", {
				label: "SPLIT",
				ignoreDataType: true,
				multiple: true,
				validTypes: ["*"],
				validContainerTypes: ["experiment_group"],
				tooltip: "Add selection to a new or existing group"
			}, function(selection, containerWidget){
				// console.log("Add Items to Group", selection);
				var dlg = new Dialog({title: "Add selected items to group"});
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

			/* Assuming we want to allow deletion of all types for now
			this.actionPanel.addAction("DeleteItem", "fa icon-trash-o fa-2x", {
				label: "DELETE",
				allowMultiTypes: true,
				multiple: true,
				validTypes: [
					"genome_group", "feature_group", "experiment_group", "job_result",
					"unspecified", "contigs", "reads", "diffexp_input_data", "diffexp_input_metadata",
					"DifferentialExpression", "GenomeAssembly", "GenomeAnnotation", "RNASeq", "feature_protein_fasta"
				],
				tooltip: "Delete Selection"
			}, function(selection){
				var objs = selection.map(function(s){
					return s.path || s.data.path;
				});
				var conf = "Are you sure you want to delete" +
					((objs.length > 1) ? " these objects" : " this object") +
					" from your workspace?"

				var dlg = new Confirmation({
					content: conf,
					onConfirm: function(evt){
						var prom = WorkspaceManager.deleteObject(objs, true, false);
						Deferred.when(prom, function(){
							self.activePanel.clearSelection();
						}, function(e){
							console.log('e', e)
						})
					}
				});
				dlg.startup();
				dlg.show();
			}, false);
			*/

			this.actionPanel.addAction("Delete", "fa icon-trash-o fa-2x", {
				label: "DELETE",
				allowMultiTypes: true,
				multiple: true,
				validTypes: ["*"],
				tooltip: "Delete Folder"
			}, function(selection){
				var objs = selection.map(function(o){ return o.path; }),
					types = selection.map(function(o){ return o.type; });

				// omit special any folders
				try{
					WorkspaceManager.omitSpecialFolders(objs, 'delete');
				}catch(e){
					new Dialog({
						content: e.toString(),
						title: "Sorry, you can't delete that...",
						style: "width: 250px !important;"
					}).show();
					return;
				}

				var isWorkspace = self.path.split('/').length < 3;
				var conf = "Are you sure you want to delete " +
					(objs.length > 1 ? "these" : "this") +
					(isWorkspace ? ' workspace' : ' folder') +
					(objs.length > 1 ? "s" : "") +
					" and its contents?"

				var dlg = new Confirmation({
					content: conf,
					onConfirm: function(evt){
						var prom = WorkspaceManager.deleteObjects(objs, true, true, types);
						Deferred.when(prom, function(){
							self.activePanel.clearSelection();
						})
					}
				})
				dlg.startup()
				dlg.show();

			}, false);


			this.actionPanel.addAction("ShareFolder", "fa icon-user-plus fa-2x", {
				label: "SHARE",
				allowMultiTypes: false,
				multiple: false,
				validTypes: ["folder"],
				tooltip: "Share Folder"
			}, function(selection){
				self.userPermDialog(selection[0])
			}, false);

			this.actionPanel.addAction("Rename", "fa icon-pencil-square-o fa-2x", {
				label: "RENAME",
				validTypes: ["*"],
				tooltip: "Rename the selected item"
			}, function(sel){
				var path = sel[0].path,
					isJob = sel[0].type === 'job_result';

				// omit special any folders
				try{
					WorkspaceManager.omitSpecialFolders(path, 'rename');
				}catch(e){
					new Dialog({
						content: e.toString(),
						title: "Sorry, you can't rename that...",
						style: "width: 250px;"
					}).show();
					return;
				}

				try{
					self.renameDialog(path, isJob)
				}catch(e){
					var d = new Dialog({
						content: e.toString(),
						title: "Sorry, you can't rename that...",
						style: "width: 250px;"
					}).show();
				}
			}, false);

			this.actionPanel.addAction("Copy", "fa icon-files-o fa-2x", {
				label: "COPY",
				allowMultiTypes: true,
				multiple: true,
				validTypes: ["*"],
				tooltip: "Copy selected objects"
			}, function(selection){
				var paths = selection.map(function(obj){ return obj.path }),
					types = selection.map(function(obj){ return obj.type });

				// open object selector to get destination
				var objSelector = new WSObjectSelector({
					allowUpload: false,
					autoSelectParent: true,
					onlyWritable: true,
					selectionText: 'Destination'
				});
				objSelector.set('type', ['folder']);
				objSelector.title = "Copy contents of " + selection.length +
									(selection.length ? " items" : " item") +
									" to...";

				// always set to user's root
				objSelector.set('path', '/'+window.App.user.id);

				// on selection, do the copy
				objSelector.onSelection = function(destPath){
					// only allow folders to be copied to top level
					var fileCount = selection.filter(function(o){ return o.type != 'folder' }).length
					if(fileCount && destPath.split('/').length == 2){
						new Dialog({
							content: "Sorry, you cannot copy objects to the top level, <i>"+destPath+"</i>",
							title: "Sorry!",
							style: "width: 250px;"
						}).show();
						return;
					}

					var prom = WorkspaceManager.copy(paths, destPath, types);
					Deferred.when(prom, function(){
						self.activePanel.clearSelection();
					}, function(e){
						Topic.publish("/Notification", {
							message: "Copy failed",
							type: "error"
						});
						var msg = /_ERROR_(.*)_ERROR_/g.exec(e)[1];

						if(msg.indexOf('overwrite flag is not set') != -1){
							var re = /object (.+) and overwrite/g;
							msg = "Can not overwrite " + re.exec(msg)[1];
						}

						new Dialog({
							content: msg,
							title: "Copy failed"
						}).show();
					})
				}

				objSelector.openChooser();
			}, false);


			this.actionPanel.addAction("Move", "fa icon-arrow-right fa-2x", {
				label: "MOVE",
				allowMultiTypes: true,
				multiple: true,
				validTypes: ["*"],
				tooltip: "Move selected objects"
			}, function(selection){
				var paths = selection.map(function(obj){ return obj.path }),
					types = selection.map(function(obj){ return obj.type });

				// omit special any folders
				try{
					WorkspaceManager.omitSpecialFolders(paths, 'move');
				}catch(e){
					new Dialog({
						content: e.toString(),
						title: "Sorry, you can't move that...",
						style: "width: 250px;"
					}).show();
					return;
				}

				// open object selector to get destination
				var objSelector = new WSObjectSelector({
					allowUpload: false,
					autoSelectParent: true,
					onlyWritable: true,
					selectionText: 'Destination'
				});
				objSelector.set('type', ['folder']);
				objSelector.title = "Move contents of " + selection.length +
									(selection.length ? " items" : " item") +
									" to...";

				// always set to user's root
				objSelector.set('path', '/'+window.App.user.id);

				objSelector.onSelection = function(destPath){
					// only allow folders to be copied to top level
					var fileCount = selection.filter(function(o){ return o.type != 'folder' }).length
					if(fileCount && destPath.split('/').length == 2){
						new Dialog({
							content: "Sorry, you cannot move objects to the top level, <i>"+destPath+"</i>",
							title: "Sorry!",
							style: "width: 250px;"
						}).show();
						return;
					}

					var prom = WorkspaceManager.move(paths, destPath, types);
					Deferred.when(prom, function(){
						self.activePanel.clearSelection();
					}, function(e){
						var msg = /_ERROR_(.*)_ERROR_/g.exec(e)[1];

						if(msg.indexOf('overwrite flag is not set') != -1){
							msg = "Can not overwrite " + msg.split(' ')[2]
						}

						new Dialog({
							title: "Move failed",
							content: msg,
							style: "width: 250px;"
						}).show();
					})
				}

				objSelector.openChooser();
			}, false);

			// listen for opening user permisssion dialog
			Topic.subscribe('/openUserPerms', function(selection){
				self.userPermDialog(selection);
			})


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

		renameDialog: function(path, isJob){
			var self = this;
			var conf = '';

			var currentName = path.slice(path.lastIndexOf('/')+1);
			var nameInput = new TextBox({
				name: "name",
				value: currentName,
				style: { width: '400px'},
				placeHolder: "Enter your new name..."
			});

			var dlg = new Confirmation({
				title: "Rename <i>"+path+'</i>',
				content: nameInput.domNode,
				okLabel: 'Rename',
				closeOnOK: false,
				style: { width: '500px' },
				onConfirm: function(evt){
					var _self = this;

					try{
						var prom;
						var newName = nameInput.get('value');
						if(path.split('/').length <= 3) {
							prom =  WorkspaceManager.renameWorkspace(path, newName)
						}else{
							prom = WorkspaceManager.rename(path, nameInput.get('value'), isJob)
						}

						Deferred.when(prom, function(res){
							Topic.publish("/refreshWorkspace", {});
							Topic.publish("/Notification", {message: "File renamed", type: "message"});

							self.actionPanel.set("selection", []);
							self.itemDetailPanel.set('selection', []);
							_self.hideAndDestroy();
						}, function(error){
							new Dialog({
								content:  "The name <i>" + newName + "</i> already exists!  Please pick a unique name.",
								title: "Sorry!",
								style: "width: 400px;"
							}).show();
						})
					}catch(error){
						new Dialog({
							content: error.toString(),
							title: "Sorry!",
							style: "width: 400px !important;"
						}).show();
					}
				}
			})

			dlg.startup()
			dlg.show();
		},

		userPermDialog: function(selection){
			var self = this;

			var folderPath = selection.path;

			/**
			 * Data model and data model helpers
			 */
			var userPerms = [];

			function rmUser(userId){
				userPerms = userPerms.filter(function(perm){ return userId != perm.user });
			}

			function addUser(userId, perm){
				var alreadyExists = findUser(userId);
				if(alreadyExists) return false;

				userPerms.push({
					user: userId,
					permission: perm
				});

				return true;
			}

			function findUser(userId){
				return userPerms.find(function(perm){ return userId == perm.user });
			}


			/**
			 * Build the form and events
			 */
			var ownerId = Formatter.baseUsername(selection.owner_id);

			var form = domConstruct.toDom('<div class="userPermForm">')
			domConstruct.place(
				'<h4 style="margin-bottom: 5px;">'+
					'Share with Specific Users'+
				'</h4>'
			, form);
			var currentUsers = domConstruct.toDom(
				'<table class="currentUsers p3basic striped" style="margin-bottom: 10px;">'+
					'<thead>'+
						'<tr>'+
							'<th>User Name'+
							'<th>Permission'+
							'<th>&nbsp;'+
					'<tbody>'+
						'<tr>'+
							'<td><i>'+ selection.owner_id.split('@')[0] + ' ' + (ownerId == 'me' ? '(me)': '')+'</i>'+
							'<td>Owner'+
							'<td>&nbsp;'
			);

			// user search box
			var userSelector = new UserSelector({name: "user"});

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
						value: "w"
					}
				]
			})

			// add user's permission button
			// Note: on click, the user is added server side.
			var addUserBtn = new Button({
				label: '<i class="icon-plus"></i> Add User',
				//disabled: true,
				onClick: function(){
					var userId = userSelector.getSelected();
						perm = permSelect.attr('value')

					if (!userId) return;

					// don't add already existing users
					if(findUser(userId)) return;

					var prom = WorkspaceManager.setPermissions(folderPath, [[userId, perm]]);
					Deferred.when(prom, lang.hitch(this, function(result) {
						//console.log('adding user to dom', userId, perm)
						dojo.place(
							'<tr>'+
								'<td data-user="'+userId+'">'+Formatter.baseUsername(userId)+
								'<td data-perm="'+perm+'">'+Formatter.permissionMap(perm)+
								'<td style="width: 1px;"><i class="fa icon-trash-o fa-2x">',
							query('tbody', currentUsers)[0]
						);

						reinitDeleteEvents();

						// reset filter select
						userSelector.reset();
					}))
				}
			});

			domConstruct.place(currentUsers, form)
			domConstruct.place(userSelector.domNode, form)
			domConstruct.place(permSelect.domNode, form, "last")
			domConstruct.place(addUserBtn.domNode, form, "last")

			// open form in dialog
			var dlg = new Confirmation({
				title: "Edit Sharing",
				okLabel: "Done",
				cancelLabel: false,
				content: form,
				style: { width: '500px'},
				onConfirm: function(evt){
					this.hideAndDestroy();
					Topic.publish('/refreshWorkspace');

					// refresh list in detail panel
					self.activePanel.clearSelection();
				},
				onCancel: function() {	// also do updates on close checkbox
					this.hideAndDestroy();
					Topic.publish('/refreshWorkspace');

					// refresh list in detail panel
					self.activePanel.clearSelection();
				}
			})

			/*
		     * list current permissions
			 */
			var prom = WorkspaceManager.listPermissions(folderPath);
			Deferred.when(prom, function(perms){

				// add global permission toggle
				var globalPerm = perms.filter(function(perm){ return perm[0] == 'global_permission' })[0][1]
				var isPublic = globalPerm != 'n';

				var checkBox = domConstruct.toDom('<div class="publicCheckBox">');
				var cb = new CheckBox({
					id: "publicCB",
					name: "checkBox",
					value: "isPublic",
					checked: isPublic,
					onChange: function(e){
						var prom = WorkspaceManager.setPublicPermission(folderPath, isPublic ? 'n' : 'r');
						Deferred.when(prom, function(res){
						}, function(e){
							alert('oh no, something has went wrong!')
						})
					}
				})
				cb.placeAt(checkBox);
				checkBox.appendChild(domConstruct.create('label', {
					'for': 'publicCB',
					'innerHTML': " Publicly Readable"
				}))

				domConstruct.place(checkBox, form, 'first');
				domConstruct.place(
					'<h4 style="margin-bottom: 5px;">'+
						'Share with Everybody'+
					'</h4>',
				form, 'first');

				// user perms
				perms.forEach(function(perm){
					// server sometimes returns 'none' permissions, so ignore them.
					if(perm[0] == 'global_permission' || perm[1] == 'n') return;

					userPerms.push({
						user: perm[0],
						permission: perm[1]
					})

					dojo.place(
						'<tr>'+
							'<td data-user="'+perm[0]+'">'+Formatter.baseUsername(perm[0])+
							'<td data-perm="'+perm[1]+'">'+Formatter.permissionMap(perm[1])+
							'<td style="width: 1px;"><i class="fa icon-trash-o fa-2x">',
						query('tbody', currentUsers)[0]
					);
				})

				// event for deleting users
				reinitDeleteEvents();
			})


			function reinitDeleteEvents(){
				query('tbody .icon-trash-o', currentUsers).on('click', function(){
					var _self = this;
					var userRow = query(this).parents('tr')[0],
						userId = dojo.attr(query('[data-user]', userRow)[0], 'data-user');

					var prom = WorkspaceManager.setPermissions(folderPath, [[userId, 'n']]);
					Deferred.when(prom, lang.hitch(this, function(result){
						domConstruct.destroy(userRow)

						rmUser(userId);
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

			// extract extra URL parameters
			var components = val.split("#");
			val = components[0];
			this.path = decodeURIComponent(val);
			var uriParams = [];
			if (components[1]) {
				uriParams = decodeURIComponent(components[1]);
			}
			//console.log("[WorkspaceBrowser] uriParams:",uriParams)

			var parts = this.path.split("/").filter(function(x){
				return x != "";
			}).map(function(c){
				return decodeURIComponent(c)
			});
			//console.log("[WorkspaceBrowser] parts:",parts)
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
									if (uriParams === "summary") {
										d = "p3/widget/viewer/Experiment"
									} else {
										d = "p3/widget/viewer/DifferentialExpression";
									}
									break;
								case "GenomeComparison":
									if (uriParams === "summary") {
										d = "p3/widget/viewer/SeqComparison"
									} else {
										d = "p3/widget/viewer/GenomeComparison";
									}
									break;
								case "GenomeAnnotation":
								case "GenomeAnnotationGenbank":
									d = "p3/widget/viewer/GenomeAnnotation";
									break;
                case "Variation":
								case "RNASeq":
								case "TnSeq":
										d = "p3/widget/viewer/Seq";
										break;
							}
						}
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
										return evt.grid.row(rownum).data;
									}));
								}

								this.actionPanel.set("selection", sel);
								this.itemDetailPanel.set('selection', sel);
							}));

							newPanel.on("ItemDblClick", lang.hitch(this, function(evt){
								if(evt.item && evt.item.type && (this.navigableTypes.indexOf(evt.item.type) >= 0)){
									Topic.publish("/navigate", {href: "/workspace" + evt.item_path})
									this.actionPanel.set("selection", []);
									this.itemDetailPanel.set("selection", []);
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

					// don't set current path in workspace manager for now
					// WorkspaceManager.set("currentPath", val);


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
