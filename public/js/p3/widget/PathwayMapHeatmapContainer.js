define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/topic", "dojo/dom-construct", "dojo/dom", "dojo/query", "dojo/when", "dojo/request",
	"dijit/layout/ContentPane", "dijit/layout/BorderContainer", "dijit/TooltipDialog", "dijit/Dialog", "dijit/popup",
	"dijit/TitlePane", "dijit/registry", "dijit/form/Form", "dijit/form/RadioButton", "dijit/form/Select", "dijit/form/Button",
	"./ContainerActionBar", "./HeatmapContainer", "../util/PathJoin", "../store/PathwayMapMemoryStore"

], function(declare, lang,
			on, Topic, domConstruct, dom, Query, when, request,
			ContentPane, BorderContainer, TooltipDialog, Dialog, popup,
			TitlePane, registry, Form, RadioButton, Select, Button,
			ContainerActionBar, HeatmapContainer, PathJoin, Store){

	return declare([BorderContainer, HeatmapContainer], {
		gutters: false,
		state: null,
		visible: false,
		pmState: null,
		store: null,
		containerActions: [
			[
				"Flip Axis",
				"fa icon-rotate-left fa-2x",
				{label: "Flip Axis", multiple: false, validTypes: ["*"]},
				function(){
					// flip internal flag
					if(this.pmState.heatmapAxis === ""){
						this.pmState.heatmapAxis = "Transposed";
					}else{
						this.pmState.heatmapAxis = "";
					}

					Topic.publish("PathwayMap", "refreshHeatmap");
				},
				true
			]
		],
		constructor: function(){
			this.dialog = new Dialog({});

			var self = this;
			// subscribe
			Topic.subscribe("PathwayMap", lang.hitch(self, function(){
				// console.log("PathwayMapHeatmapContainer:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "updatePmState":
						self.pmState = value;
						break;
					case "refreshHeatmap":
						Topic.publish("PathwayMap", "requestHeatmapData", self.pmState);
						break;
					case "updateHeatmapData":
						self.currentData = value;
						if(typeof(self.flashDom.refreshData) == "function"){
							self.flashDom.refreshData();
							// Topic.publish("PathwayMap", "hideLoadingMask");
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
				this.initializeFlash('PathwayMapHeatMap');
			}
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
		flashReady: function(){
			if(typeof(this.flashDom.refreshData) == "function"){
				Topic.publish("PathwayMap", "refreshHeatmap");
			}
		},
		flashCellClicked: function(flashObjectID, colID, rowID){
			//console.log("flashCellClicked is called ", colID, rowID);
			var isTransposed = (this.pmState.heatmapAxis === 'Transposed');
			var originalAxis = this._getOriginalAxis(isTransposed, colID, rowID);

			var ecNumber = originalAxis.columnIds;
			var genomeId = originalAxis.rowIds;

			var query = "?and(eq(ec_number," + ecNumber + "),eq(genome_id," + genomeId + "),eq(annotation,PATRIC))";

			request.get(PathJoin(window.App.dataServiceURL, "pathway", query), {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				}
			}).then(lang.hitch(this, function(features){
				this.dialog.set('content', this._buildPanelCellClicked(isTransposed, ecNumber, genomeId, features));
				var actionBar = this._buildPanelButtons(colID, rowID, ecNumber, genomeId, features);
				domConstruct.place(actionBar, this.dialog.containerNode, "last");

				this.dialog.show();
			}));

		},
		flashCellsSelected: function(flashObjectID, colIDs, rowIDs){
			//console.log("flashCellsSelected is called", colIDs, rowIDs);
			if(rowIDs.length == 0) return;
			var isTransposed = (this.pmState.heatmapAxis === 'Transposed');
			var originalAxis = this._getOriginalAxis(isTransposed, colIDs, rowIDs);

			var ecNumbers = originalAxis.columnIds;
			var genomeIds = originalAxis.rowIds;

			var query = "and(in(ec_number,(" + ecNumbers + ")),in(genome_id,(" + genomeIds + ")),eq(annotation,PATRIC))&limit(25000,0)";

			request.post(PathJoin(window.App.dataServiceURL, "pathway"), {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || '')
				},
				data: query
			}).then(lang.hitch(this, function(response){

				// dedupe features
				var featureSet = {};
				response.forEach(function(d){
					if(!featureSet.hasOwnProperty(d.feature_id)){
						featureSet[d.feature_id] = true;
					}
				});
				var features = Object.keys(featureSet);

				this.dialog.set('content', this._buildPanelCellsSelected(isTransposed, ecNumbers, genomeIds, features));
				var actionBar = this._buildPanelButtons(colIDs, rowIDs, ecNumbers, genomeIds, features);
				domConstruct.place(actionBar, this.dialog.containerNode, "last");

				this.dialog.show();
			}));
		},
		_buildPanelCellClicked: function(isTransposed, ecNumber, genomeId, features){

			var gfs = this.pmState.genomeFilterStatus;

			var genomeName = gfs[genomeId].getLabel();
			var description = '', memberCount = 0, index = 0;

			if(isTransposed){
				// rows: families, columns: genomes
				this.currentData.rows.forEach(function(row, idx){
					if(row.rowID === ecNumber){
						description = row.rowLabel;
						index = idx;
					}
				});
				this.currentData.columns.forEach(function(col){
					if(col.colID === genomeId){
						memberCount = parseInt(col.distribution.substr(2 * index, 2), 16);
					}
				})
			}else{
				index = gfs[genomeId].getIndex();
				this.currentData.columns.forEach(function(col){
					if(col.colID === ecNumber){
						description = col.colLabel;
						memberCount = parseInt(col.distribution.substr(2 * index, 2), 16);
					}
				});
			}

			var text = [];
			text.push('<b>Genome:</b> ' + genomeName);
			text.push('<b>Product:</b> ' + description);
			text.push('<b>EC Number:</b> ' + ecNumber);
			text.push('<b>Members:</b> ' + memberCount);
			// features.forEach(function(feature){
			// 	var featureLink = '<a href="/view/Feature/' + feature.feature_id + '" target="_blank">' + feature.patric_id + '</a>';
			// 	if(feature.refseq_locus_tag !== undefined){
			// 		featureLink += ", " + feature.refseq_locus_tag;
			// 	}
			// 	if(feature.alt_locus_tag !== undefined){
			// 		featureLink += ", " + feature.alt_locus_tag;
			// 	}
			// 	text.push(featureLink);
			// });

			return text.join("<br>");
		},
		_buildPanelCellsSelected: function(isTransposed, ecNumbers, genomeIds, features){

			//var membersCount = this._countMembers(colIDs, rowIDs);

			var text = [];
			text.push('<b>Genomes Selected:</b> ' + genomeIds.length);
			text.push('<b>EC Selected:</b> ' + ecNumbers.length);
			text.push('<b>Members:</b> ' + features.length);

			return text.join("<br>");
		},
		_buildPanelButtons: function(colIDs, rowIDs, ecNumbers, genomeIds, features){
			var _self = this;
			var featureIds = (typeof(features[0]) === 'string')? features.join(',') : features.map(function(d){ return d.feature_id;}).join(',');

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
							var val = parseInt(_self.currentData.columns[colIdx].distribution.substr(idx * 2, 2), 16);
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
				label: 'Download Proteins',
				disabled: (featureIds.length === 0)
			});
			on(downloadPT.domNode, "click", function(e){
				if(e.target.attributes.rel === undefined)return;
				var rel = e.target.attributes.rel.value;
				var currentQuery = "?in(feature_id,(" + featureIds + "))";

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
				label: 'Show Proteins',
				disabled: (featureIds.length === 0)
			});
			on(btnShowDetails.domNode, "click", function(){
				Topic.publish("/navigate", {href: "/view/FeatureList/?in(feature_id,(" + featureIds + "))", target: "blank"});
			});

			var btnAddToWorkspace = new Button({
				label: 'Add Proteins to Group',
				disabled: (featureIds.length === 0)
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
		}
	});
});
