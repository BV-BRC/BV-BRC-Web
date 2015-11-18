define([
	"dojo/_base/declare", "dijit/layout/ContentPane", "dijit/layout/BorderContainer", "dojo/on",
	"./ContainerActionBar", "dijit/popup", "dojo/topic",
	"dijit/TooltipDialog",
	"dojo/_base/lang", "swfobject/swfobject"

], function(declare, ContentPane, BorderContainer, on,
			ContainerActionBar, popup, Topic,
			TooltipDialog,
			lang, swfobject){

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
		filterGrid: null,
		flashDom: null,
		containerActions: [
			[
				"Flip Axis",
				"fa icon-rotate-left fa-2x",
				{label:"Flip Axis",multiple: false,validTypes:["*"]},
				"flipAxises",
				true
			],
			[
				"Cluster",
				"fa icon-make-group fa-2x",
				{label:"Cluster",multiple: false,validTypes:["*"]},
				function(selection){
					// TODO: implement
				},
				true
			],
			[
				"Advanced Clustering",
				"fa icon-make-group fa-2x",
				{label:"Advanced Clustering",multiple: false,validTypes:["*"]},
				function(selection){
					// TODO: implement
				},
				true
			]
		],
		constructor: function(options){
			this.dataGridContainer = options.dataGridContainer;
			this.filterGrid = options.filterGrid;

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
			this.addChild(new ContentPane({region: "center", content: "<div id='flashTarget'></div>", style:"padding:0"}));

			this.inherited(arguments);
			this._firstView = true;
		},
		// flash interface functions
		flashReady: function(flashObjectID){
			var target = document.getElementById(flashObjectID) || this.flashDom;
			this._prepareHeatmapData();
			target.refreshData(); // this triggers flashRequestsData callback
			//console.log("flashReady is called", flashObjectID, target);
		},
		flashRequestsData: function(){
			return this.currentData;
		},
		_prepareHeatmapData: function(){
			var filterStore = this.filterGrid.store;
			//console.warn(filterStore);
			var dataStore = this.dataGridContainer.grid.store;
			//console.log(dataStore);
			this.currentData = dataStore.getHeatmapData(filterStore);
			//console.log(currentData);
		},
		flashCellClicked: function(flashObjectID, colID, rowID){
			// TODO: implement this
			console.log("flashCellClicked is called ", colID, rowID);
		},
		flashCellsSelected: function(flashObjectID, colIDs, rowIDs){
			// TODO: implement this
			console.log("flashCellsSelected is called", colIDs, rowIDs);
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

			// send message to flash to refresh data reading
			this.flashDom.refreshData();
		},

	});
});
