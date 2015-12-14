define([
	"dojo/_base/declare", "dijit/layout/ContentPane", "dijit/layout/BorderContainer", "dojo/on",
	"./ContainerActionBar", "dijit/popup", "dojo/topic", "dojo/dom-construct",
	"dijit/TooltipDialog", "dijit/Dialog",
	"dojo/_base/lang", "swfobject/swfobject", "dojo/request", "../util/PathJoin", "dijit/form/Button"

], function(declare, ContentPane, BorderContainer, on,
			ContainerActionBar, popup, Topic, domConstruct,
			TooltipDialog, Dialog,
			lang, swfobject, request, PathJoin, Button){

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
	var downloadTT = new TooltipDialog({
		content: dfc, onMouseLeave: function(){
			popup.close(downloadTT);
		}
	});

	return declare([BorderContainer], {
		gutters: false,
		state: null,
		visible: false,
		dataGridContainer: null,
		pfState: null,
		flashDom: null,
		containerActions: [
			[
				"Flip Axis",
				"fa icon-rotate-left fa-2x",
				{label: "Flip Axis", multiple: false, validTypes: ["*"]},
				"flipAxises",
				true
			],
			[
				"Cluster",
				"fa icon-make-group fa-2x",
				{label: "Cluster", multiple: false, validTypes: ["*"]},
				function(selection){
					// TODO: implement
				},
				true
			],
			[
				"Advanced Clustering",
				"fa icon-make-group fa-2x",
				{label: "Advanced Clustering", multiple: false, validTypes: ["*"]},
				function(selection){
					// TODO: implement
				},
				true
			]
		],
		constructor: function(options){
			this.dataGridContainer = options.dataGridContainer;
			this.pfState = options.pfState;
			this.dialog = new Dialog({});

			var self = this;
			// subscribe
			Topic.subscribe("ProteinFamiliesHeatmap", function(){
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "refresh":
						self.flashReady();
						break;
					default:
						break;
				}
			});
		},
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
				this.initializeFlash();
			}
		},
		initializeFlash: function(){
			var flashVars = {
				showLog: false,
				startColor: '0x6666ff',
				endColor: '0x00ff00'
			};
			var params = {
				quality: 'high',
				bgcolor: "#ffffff",
				allowscriptaccess: 'sameDomain',
				allowfullscreen: false,
				wmode: 'transparent'
			};
			var attributes = {
				id: 'ProteinFamilyHeatMap',
				name: 'ProteinFamilyHeatMap'
			};
			var target = document.getElementById("flashTarget");
			// binding flash functions
			window.flashReady = lang.hitch(this, "flashReady");
			window.flashRequestsData = lang.hitch(this, "flashRequestsData");
			window.flashCellClicked = lang.hitch(this, "flashCellClicked");
			window.flashCellsSelected = lang.hitch(this, "flashCellsSelected");
			//["flashReady", "flashRequestsData"].forEach(function(item){
			//	window[item] = lang.hitch(this, item);
			//});
			swfobject.embedSWF('/js/p3/resources/HeatmapViewer.swf', target, '100%', '100%', 19, '/js/swfobject/lib/expressInstall.swf', flashVars, params, attributes);
			this.flashDom = document.getElementById("ProteinFamilyHeatMap");
		},
		onFirstView: function(){
			if(this._firstView){
				return;
			}

			// action buttons for heatmap viewer
			this.containerActionBar = new ContainerActionBar({
				region: "top"
			});
			this.containerActions.forEach(function(a){
				this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
			}, this);
			this.addChild(this.containerActionBar);

			//TODO: add legend
			this.addChild(new ContentPane({
				region: "center",
				content: "<div id='flashTarget'></div>",
				style: "padding:0"
			}));

			this.inherited(arguments);
			this._firstView = true;
		},
		// flash interface functions
		flashReady: function(flashObjectID){
			var target = document.getElementById(flashObjectID) || this.flashDom;
			//console.log("flashReady is called", flashObjectID, target);
			if(typeof(target.refreshData) == "function"){
				this._prepareHeatmapData();
				target.refreshData(); // this triggers flashRequestsData callback
			}
		},
		flashRequestsData: function(){
			//console.log("flashRequestsData is called");
			return this.currentData;
		},
		_prepareHeatmapData: function(){
			//console.log("_prepareHeatmapData is called");
			var dataStore = this.dataGridContainer.grid.store;
			//console.log("dataStore: ", dataStore);
			this.currentData = dataStore.getHeatmapData(this.pfState);
			//console.log("currentData: ", this.currentData);
		},
		flashCellClicked: function(flashObjectID, colID, rowID){
			//console.log("flashCellClicked is called ", colID, rowID);
			var originalAxis = this._checkAxis(colID, rowID);

			var familyId = originalAxis.columnIds;
			var genomeId = originalAxis.rowIds;

			var query = "?and(eq(" + this.pfState.familyType + "_id," + familyId + "),eq(genome_id," + genomeId + "))";

			request.get(PathJoin(window.App.dataServiceURL, "genome_feature", query), {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				}
			}).then(lang.hitch(this, function(features){
				this.dialog.set('content', this._buildPanelCellClicked(colID, rowID, familyId, genomeId, features));
				var actionBar = this._buildPanelButtons(colID, rowID, features);
				domConstruct.place(actionBar, this.dialog.containerNode, "last");

				this.dialog.show();
			}));

		},
		flashCellsSelected: function(flashObjectID, colIDs, rowIDs){
			// TODO: implement this
			//console.log("flashCellsSelected is called", colIDs, rowIDs);
			var originalAxis = this._checkAxis(colIDs, rowIDs);

			var familyIds = originalAxis.columnIds;
			var genomeIds = originalAxis.rowIds;
			var membersCount = this._countMembers(colIDs, rowIDs);

			var text = [];
			text.push('<b>Genomes Selected:</b> ' + genomeIds.length);
			text.push('<b>Family Selected:</b> ' + familyIds.length);
			text.push('<b>Members:</b> ' + membersCount);

			this.dialog.set('content', text.join('<br/>'));
			this.dialog.show();
		},
		_buildPanelCellClicked: function(colID, rowID, familyId, genomeId, features){
			//console.log("_buildPanelCellClicked is called.", colID, rowID, familyId, genomeId);
			var gfs = this.pfState.genomeFilterStatus;
			var genomeName = gfs[genomeId].getGenomeName();
			var index = gfs[genomeId].getIndex();
			var description = '', memberCount = 0;

			this.currentData.columns.forEach(function(col){
				if(col.colID === colID){
					//console.log("col", col);
					description = col.colLabel;
					memberCount = parseInt(col.distribution.substr(2 * index, 2), 16);
				}
			});

			var text = [];
			text.push('<b>Genome:</b> ' + genomeName);
			text.push('<b>Product:</b> ' + description);
			text.push('<b>Family ID:</b> ' + familyId);
			text.push('<b>Members:</b> ' + memberCount);
			features.forEach(function(feature){
				var featureLink = '<a href="/view/Feature/' + feature.feature_id + '">' + feature.patric_id + '</a>';
				if(feature.refseq_locus_tag != undefined){
					featureLink += ", " + feature.refseq_locus_tag;
				}
				if(feature.alt_locus_tag != undefined){
					featureLink += ", " + feature.alt_locus_tag;
				}
				text.push(featureLink);
			});

			return text.join("<br>");
		},
		_buildPanelButtons: function(colIDs, rowIDs, features){
			var _self = this;
			var actionBar = domConstruct.create("div", {
				"class": "dijitDialogPaneActionBar"
			});

			var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
			var downloadTT = new TooltipDialog({
				content: dfc, onMouseLeave: function(){
					_self.dialog.close(downloadTT);
				}
			});

			var btnDownloadHeatmap = new Button({
				label: 'Download Heatmap Data'
			});
			var btnDownloadProteins = new Button({
				label: 'Download Proteins'
			});
			on(downloadTT.domNode, "click", function(evt){
				var rel = evt.target.attributes.rel.value;
				console.log("REL: ", rel);
				var selection = "";
				var dataType = "genome_feature";
				var currentQuery = "";//self.actionPanel.currentContainerWidget.get('query');
				console.log("selection: ", selection);
				console.log("DownloadQuery: ", dataType, currentQuery);
				window.open("/api/" + dataType + "/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download");
				_self.dialog.close(downloadTT);
			});

			var btnShowDetails = new Button({
				label: 'Show Proteins'
			});
			var btnAddToWorkspace = new Button({
				label: 'Add Proteins to Group'
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
		_countMembers: function(colIDs, rowIDs){
			var columns = this.currentData.columns;
			var rows = this.currentData.rows;

			var rowPositions = [];
			var count = 0;

			//console.log(columns, rows);
			rows.forEach(function(row){
				rowIDs.forEach(function(rowID){
					if(rowID === row.rowID){
						rowPositions.push(row.order * 2);
					}
				})
			});
			//console.log(rowPositions);

			columns.forEach(function(col){
				colIDs.forEach(function(colID){
					if(colID === col.colID){
						rowPositions.forEach(function(pos){
							//console.log(colID, col.distribution, parseInt(col.distribution.substr(pos, 2), 16));
							count += parseInt(col.distribution.substr(pos, 2), 16);
						});
					}
				});
			});

			return count;
		},
		_checkAxis: function(columnIds, rowIds){
			var originalAxis = {};

			if(this.pfState.heatmapAxis === "Transposed"){
				originalAxis.columnIds = rowIds;
				originalAxis.rowIds = columnIds;
			}else{
				originalAxis.columnIds = columnIds;
				originalAxis.rowIds = rowIds;
			}
			return originalAxis;
		},
		flipAxises: function(){
			var currentData = this.currentData;
			var flippedDistribution = new Array(currentData.rows.length);
			currentData.rows.forEach(function(row, rowIdx){
				var distribution = [];
				currentData.columns.forEach(function(col){
					distribution.push(col.distribution.charAt(rowIdx * 2) + col.distribution.charAt(rowIdx * 2 + 1));
				});
				flippedDistribution[rowIdx] = distribution.join("");
			});

			// create new rows
			var newRows = [];
			currentData.columns.forEach(function(col, colID){
				newRows.push(new Row(colID, col.colID, col.colLabel, col.labelColor, col.bgColor, col.meta));
			});
			// create new columns
			var newColumns = [];
			currentData.rows.forEach(function(row, rowID){
				newColumns.push(new Column(rowID, row.rowID, row.rowLabel, flippedDistribution[rowID], row.labelColor, row.bgColor, row.meta))
			});

			this.currentData = {
				'rows': newRows,
				'columns': newColumns,
				'colTrunc': currentData.rowTrunc,
				'rowTrunc': currentData.colTrunc,
				'colLabel': currentData.rowLabel,
				'rowLabel': currentData.colLabel,
				'offset': 1,
				'digits': 2,
				'countLabel': 'Members',
				'negativeBit': false,
				'cellLabelField': '',
				'cellLabelsOverrideCount': false,
				'beforeCellLabel': '',
				'afterCellLabel': ''
			};

			// flip internal flag
			if(this.pfState.heatmapAxis === ""){
				this.pfState.heatmapAxis = "Transposed";
			}else{
				this.pfState.heatmapAxis = "";
			}

			// send message to flash to refresh data reading
			this.flashDom.refreshData();
		}

	});
});
