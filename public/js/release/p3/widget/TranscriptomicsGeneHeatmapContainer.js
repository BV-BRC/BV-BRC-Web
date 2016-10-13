define("p3/widget/TranscriptomicsGeneHeatmapContainer", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/topic", "dojo/dom-construct", "dojo/dom", "dojo/query", "dojo/when", "dojo/request",
	"dijit/layout/ContentPane", "dijit/layout/BorderContainer", "dijit/TooltipDialog", "dijit/Dialog", "dijit/popup",
	"dijit/TitlePane", "dijit/registry", "dijit/form/Form", "dijit/form/RadioButton", "dijit/form/Select", "dijit/form/Button",
	"./ContainerActionBar", "./HeatmapContainer", "./SelectionToGroup", "../util/PathJoin", "../store/HeatmapDataTypes"

], function(declare, lang,
			on, Topic, domConstruct, dom, Query, when, request,
			ContentPane, BorderContainer, TooltipDialog, Dialog, popup,
			TitlePane, registry, Form, RadioButton, Select, Button,
			ContainerActionBar, HeatmapContainer, SelectionToGroup, PathJoin){

	return declare([BorderContainer, HeatmapContainer], {
		gutters: false,
		state: null,
		visible: false,
		tgState: null,
		containerActions: [
			[
				"Flip Axis",
				"fa icon-rotate-left fa-2x",
				{label: "Flip Axis", multiple: false, validTypes: ["*"]},
				function(){
					// flip internal flag
					if(this.tgState.heatmapAxis === ""){
						this.tgState.heatmapAxis = "Transposed";
					}else{
						this.tgState.heatmapAxis = "";
					}

					Topic.publish("TranscriptomicsGene", "refreshHeatmap");
				},
				true
			],
			[
				"Heatmap Color",
				"fa icon-delicious fa-2x",
				{label: "Color", multiple: false, validTypes: ["*"]},
				function(){
					if(this.containerActionBar._actions['Heatmap Color'].options.tooltipDialog == null){
						this.tooltip_color_theme = new TooltipDialog({
							content: this._buildPanelColorTheme()
						});
						this.containerActionBar._actions['Heatmap Color'].options.tooltipDialog = this.tooltip_color_theme;
					}

					if(this.isPopupOpen){
						this.isPopupOpen = false;
						popup.close();
					}else{
						popup.open({
							parent: this,
							popup: this.containerActionBar._actions['Heatmap Color'].options.tooltipDialog,
							around: this.containerActionBar._actions['Heatmap Color'].button,
							orient: ["below"]
						});
						this.isPopupOpen = true;
					}
				},
				true
			],
			[
				"Cluster",
				"fa icon-cluster fa-2x",
				{label: "Cluster", multiple: false, validTypes: ["*"]},
				"cluster",
				true
			],
			[
				"Advanced Clustering",
				"fa icon-cluster fa-2x",
				{label: "Advanced", multiple: false, validTypes: ["*"]},
				function(){
					var self = this;

					this.dialog.set('content', this._buildPanelAdvancedClustering());

					// building action bar
					var actionBar = domConstruct.create("div", {
						"class": "dijitDialogPaneActionBar"
					});
					var btnSubmit = new Button({
						label: 'Submit',
						onClick: function(){
							var param = {};
							var f = registry.byId("advancedClusterParams").value;

							param.g = (f['cluster_by'] === 3 || f['cluster_by'] === 1) ? f['algorithm'] : 0;
							param.e = (f['cluster_by'] === 3 || f['cluster_by'] === 2) ? f['algorithm'] : 0;
							param.m = f['type'];

							//console.log('advanced cluster param: ', param);
							self.cluster(param);
							self.dialog.hide();
						}
					});
					var btnCancel = new Button({
						label: 'Cancel',
						onClick: function(){
							self.dialog.hide();
						}
					});
					btnSubmit.placeAt(actionBar);
					btnCancel.placeAt(actionBar);

					domConstruct.place(actionBar, this.dialog.containerNode, "last");

					this.dialog.show();
				},
				true
			],
			[
				"Show Significant",
				"fa icon-filter fa-2x",
				{label: "Show", multiple: false, validTypes: ["*"]},
				function(){
					if(this.containerActionBar._actions['Show Significant'].options.tooltipDialog == null){
						this.tooltip_show_significant = new TooltipDialog({
							content: this._buildPanelShowSignificant()
						});
						this.containerActionBar._actions['Show Significant'].options.tooltipDialog = this.tooltip_show_significant;
					}

					if(this.isPopupOpen){
						this.isPopupOpen = false;
						popup.close();
					}else{

						popup.open({
							parent: this,
							popup: this.containerActionBar._actions['Show Significant'].options.tooltipDialog,
							around: this.containerActionBar._actions['Show Significant'].button,
							orient: ["below"]
						});
						this.isPopupOpen = true;
					}
				},
				true
			]
		],
		constructor: function(){
			this.dialog = new Dialog({});

			var self = this;
			// subscribe
			Topic.subscribe("TranscriptomicsGene", lang.hitch(self, function(){
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "updateTgState":
						self.tgState = value;
						break;
					case "refreshHeatmap":
						Topic.publish("TranscriptomicsGene", "requestHeatmapData", self.tgState);
						break;
					case "updateHeatmapData":
						self.currentData = value;
						if(typeof(self.flashDom.refreshData) == "function"){
							self.flashDom.refreshData();
						}
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
				this.initializeFlash('TranscriptomicsGeneHeatMap');
			}
		},
		onFirstView: function(){
			if(this._firstView){
				return;
			}

			// action buttons for heatmap viewer
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
				content: "<div id='flashTarget'></div>",
				style: "padding:0"
			}));

			this.inherited(arguments);
			this._firstView = true;
		},
		flashReady: function(){
			if(typeof(this.flashDom.refreshData) == "function"){
				Topic.publish("TranscriptomicsGene", "refreshHeatmap");
			}
		},
		flashCellClicked: function(flashObjectID, colID, rowID){
			//console.log("flashCellClicked is called ", colID, rowID);
			var isTransposed = (this.tgState.heatmapAxis === 'Transposed');
			var originalAxis = this._getOriginalAxis(isTransposed, colID, rowID);

			var geneId = originalAxis.columnIds;
			var comparisonId = originalAxis.rowIds;

			this.dialog.set('content', this._buildPanelCellClicked(isTransposed, geneId, comparisonId));
			var actionBar = this._buildPanelButtons(colID, rowID, geneId, comparisonId);
			domConstruct.place(actionBar, this.dialog.containerNode, "last");

			this.dialog.show();

		},
		flashCellsSelected: function(flashObjectID, colIDs, rowIDs){
			//console.log("flashCellsSelected is called", colIDs, rowIDs);
			if(rowIDs.length == 0) return;
			var isTransposed = (this.tgState.heatmapAxis === 'Transposed');
			var originalAxis = this._getOriginalAxis(isTransposed, colIDs, rowIDs);

			var geneIds = originalAxis.columnIds;
			var comparisonIds = originalAxis.rowIds;

			this.dialog.set('content', this._buildPanelCellsSelected(isTransposed, geneIds, comparisonIds));
			var actionBar = this._buildPanelButtons(colIDs, rowIDs, geneIds, comparisonIds);
			domConstruct.place(actionBar, this.dialog.containerNode, "last");

			this.dialog.show();
		},
		_buildPanelCellClicked: function(isTransposed, geneId, comparisonId){

			var gfs = this.tgState.comparisonFilterStatus;

			var comparisonName = gfs[comparisonId].getLabel();
			var description = '';

			if(isTransposed){
				// rows: genes, columns: comparisons
				this.currentData.rows.forEach(function(row){
					if(row.rowID === geneId){
						description = row.rowLabel;
					}
				});
			}else{
				this.currentData.columns.forEach(function(col){
					if(col.colID === geneId){
						description = col.colLabel;
					}
				});
			}

			var text = [];
			text.push('<b>Comparison:</b> ' + comparisonName);
			text.push('<b>Product:</b> ' + description);

			return text.join("<br>");
		},
		_buildPanelCellsSelected: function(isTransposed, geneIds, comparisonIds){

			var text = [];
			text.push('<b>Number of comparisons selected:</b> ' + comparisonIds.length);
			text.push('<b>Number of features selected:</b> ' + geneIds.length);

			return text.join("<br>");
		},
		_buildPanelAdvancedClustering: function(){

			if(registry.byId("advancedClusterParams") !== undefined){
				registry.byId("advancedClusterParams").destroyRecursive();
			}

			var form = new Form({
				id: 'advancedClusterParams'
			});

			var tp_dim = new TitlePane({
				title: "Cluster by"
			}).placeAt(form.containerNode);

			new RadioButton({
				checked: false,
				value: 2,
				name: "cluster_by",
				label: "Genes"
			}).placeAt(tp_dim.containerNode);
			domConstruct.place('<label>Genes</label><br/>', tp_dim.containerNode, "last");

			new RadioButton({
				checked: false,
				value: 1,
				name: "cluster_by",
				label: "Comparisons"
			}).placeAt(tp_dim.containerNode);
			domConstruct.place('<label>Comparisons</label><br/>', tp_dim.containerNode, "last");

			new RadioButton({
				checked: true,
				value: 3,
				name: "cluster_by",
				label: "Both"
			}).placeAt(tp_dim.containerNode);
			domConstruct.place('<label>Both</label>', tp_dim.containerNode, "last");

			var sel_algorithm = new Select({
				name: "algorithm",
				value: 2,
				options: [{
					value: 0, label: "No clustering"
				}, {
					value: 1, label: "Un-centered correlation"
				}, {
					value: 2, label: "Pearson correlation"
				}, {
					value: 3, label: "Un-centered correlation, absolute value"
				}, {
					value: 4, label: "Pearson correlation, absolute value"
				}, {
					value: 5, label: "Spearman rank correlation"
				}, {
					value: 6, label: "Kendall tau"
				}, {
					value: 7, label: "Euclidean distance"
				}, {
					value: 8, label: "City-block distance"
				}]
			});

			var sel_type = new Select({
				name: "type",
				value: 'a',
				options: [{
					value: "m", label: "Pairwise complete-linkage"
				}, {
					value: "s", label: "Pairwise single-linkage"
				}, {
					value: "c", label: "Pairwise centroid-linkage"
				}, {
					value: "a", label: "Pairwise average-linkage"
				}]
			});

			new TitlePane({
				title: "Clustering algorithm",
				content: sel_algorithm
			}).placeAt(form.containerNode);

			new TitlePane({
				title: "Clustering type",
				content: sel_type
			}).placeAt(form.containerNode);

			return form;
		},
		_buildPanelButtons: function(colIDs, rowIDs, geneIds, comparisonIds){
			var _self = this;
			var actionBar = domConstruct.create("div", {
				"class": "dijitDialogPaneActionBar"
			});

			var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
			var downloadHM = new TooltipDialog({
				content: dfc,
				onMouseLeave: function(){
					popup.close(downloadHM);
				}
			});
			var downloadPT = new TooltipDialog({
				content: dfc,
				onMouseLeave: function(){
					popup.close(downloadPT);
				}
			});

			var btnDownloadHeatmap = new Button({
				label: 'Download Heatmap Data'
			});
			on(downloadHM.domNode, "click", function(e){
				if(e.target.attributes.rel === undefined)return;
				var rel = e.target.attributes.rel.value;
				var DELIMITER;
				if(rel === 'text/csv'){
					DELIMITER = ',';
				}else{
					DELIMITER = '\t';
				}

				var colIndexes = [];
				_self.currentData.columns.forEach(function(col, idx){
					if(colIDs.indexOf(col.colID) > -1){
						colIndexes[colIDs.indexOf(col.colID)] = idx;
					}
				});

				var header = _self.currentData.rowLabel + "/" + _self.currentData.colLabel;
				colIndexes.forEach(function(colIdx){
					header += DELIMITER + _self.currentData.columns[colIdx].colLabel;
				});

				var data = [];
				_self.currentData.rows.forEach(function(row, idx){
					if(rowIDs.indexOf(row.rowID) > -1){
						var r = [];
						r.push(row.rowLabel);
						colIndexes.forEach(function(colIdx){
							var val = _self.currentData.columns[colIdx].meta.samples[row.rowID].log_ratio;
							r.push(val);
						});
						data[rowIDs.indexOf(row.rowID)] = r.join(DELIMITER);
					}
				});
				window.open('data:' + rel + ',' + encodeURIComponent(header + "\n" + data.join("\n")));
				// refer http://jsfiddle.net/a856P/51/ for further implementation
				popup.close(downloadHM);
			});
			on(btnDownloadHeatmap.domNode, "click", function(){
				popup.open({
					popup: downloadHM,
					around: btnDownloadHeatmap.domNode,
					orient: ["below"]
				});
			});

			var btnDownloadProteins = new Button({
				label: 'Download Genes'
			});
			on(downloadPT.domNode, "click", function(e){
				if(e.target.attributes.rel === undefined)return;
				var rel = e.target.attributes.rel.value;
				var currentQuery = "?in(feature_id,(" + geneIds + "))";

				window.open(window.App.dataServiceURL + "/genome_feature/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download");
				popup.close(downloadPT);
			});

			on(btnDownloadProteins.domNode, "click", function(){
				popup.open({
					popup: downloadPT,
					around: btnDownloadProteins.domNode,
					orient: ["below"]
				});
			});

			var btnShowDetails = new Button({
				label: 'Show Genes'
			});
			on(btnShowDetails.domNode, "click", function(){
				if(typeof(geneIds) == "object"){
					window.open("/view/FeatureList/?in(feature_id,(" + geneIds + "))");
				}else{
					window.open("/view/Feature/?eq(feature_id," + geneIds + ")");
				}
			});

			var btnAddToWorkspace = new Button({
				label: 'Add Proteins to Group',
				onClick: function(){
					var dlg = new Dialog({title: "Copy Selection to Group"});

					var stg = new SelectionToGroup({
						selection: geneIds,
						type: "feature_group",
						path: this.get("path")
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
				}
			});

			var btnCancel = new Button({
				label: 'Cancel',
				onClick: function(){
					_self.dialog.hide();
				}
			});

			btnDownloadHeatmap.placeAt(actionBar);
			btnDownloadProteins.placeAt(actionBar);
			btnShowDetails.placeAt(actionBar);
			btnAddToWorkspace.placeAt(actionBar);
			btnCancel.placeAt(actionBar);

			return actionBar;
		},
		_buildPanelColorTheme: function(){
			var self = this;
			var colorSelect = new Select({
				name: "colorTheme",
				options: [{value: 'rgb', label: '<i class="fa icon-arrow-up"></i> Red-Black-Green <i class="fa icon-arrow-down"></i>'},
					{value: 'rbw', label: '<i class="fa icon-arrow-up"></i> Red-White-Blue <i class="fa icon-arrow-down"></i>'}]
			});
			colorSelect.on('change', lang.hitch(self, function(scheme){
				self.currentData.colorStops = getColorStops(scheme, self.tgState.maxIntensity);
				self.flashDom.refreshData();
				popup.close();
			}));

			return colorSelect;
		},
		_buildPanelShowSignificant: function(){
			var self = this;
			var showSelect = new Select({
				name: "showSignificant",
				options: [{value: 'Y', label: 'Significant Genes'},
					{value: 'N', label: 'All Genes'}]
			});
			showSelect.on('change', lang.hitch(self, function(yesOrNo){
				self.tgState.significantGenes = yesOrNo;
				// Topic.publish("TranscriptomicsGene", "applyConditionFilter", self.tgState);
				// Topic.publish("TranscriptomicsGene", "updateTgState", self.tgState);
				Topic.publish("TranscriptomicsGene", "requestHeatmapData", self.tgState);
				popup.close();
			}));

			return showSelect;
		},
		_getOriginalAxis: function(isTransposed, columnIds, rowIds){
			var originalAxis = {};
			//console.log("_getOriginalAxis: ", isTransposed, columnIds, rowIds);

			if(isTransposed){
				originalAxis.columnIds = rowIds;
				originalAxis.rowIds = columnIds;
			}else{
				originalAxis.columnIds = columnIds;
				originalAxis.rowIds = rowIds;
			}
			return originalAxis;
		},
		cluster: function(param){

			// console.log("cluster is called", param);
			//this.set('loading', true);
			var p = param || {g: 2, e: 2, m: 'a'};
			var tgState = this.tgState;
			var isTransposed = tgState.heatmapAxis === 'Transposed';
			var data = this.exportCurrentData(isTransposed);

			console.log("clustering data set size: ", data.length);
			if(data.length > 1500000){
				new Dialog({
					title: "Notice",
					content: "The data set is too large to cluster. Please use filter panel to reduce the size",
					style: "width: 300px"
				}).show();
				return;
			}

			return when(window.App.api.data("cluster", [data, p]), lang.hitch(this, function(res){
				// console.log("Cluster Results: ", res);
				//this.set('loading', false);

				// DO NOT TRANSPOSE. clustering process is based on the corrected axises
				tgState.clusterRowOrder = res.rows;
				tgState.clusterColumnOrder = res.columns;

				Topic.publish("TranscriptomicsGene", "updateTgState", tgState);
				Topic.publish("TranscriptomicsGene", "updateFilterGridOrder", res.rows);
				Topic.publish("TranscriptomicsGene", "updateMainGridOrder", res.columns);

				// re-draw heatmap
				Topic.publish("TranscriptomicsGene", "refreshHeatmap");
			}), function(err){

				new Dialog({
					title: err.status,
					content: err.text
				}).show();
			});
		}
	});
});
