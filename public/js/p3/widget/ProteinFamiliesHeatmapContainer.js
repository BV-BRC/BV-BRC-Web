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
		containerActions: [
			[
				"Flip Axis",
				"fa icon-rotate-left fa-2x",
				{label:"Flip Axis",multiple: false,validTypes:["*"]},
				function(selection){
					// TODO: implement
				},
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
				id: 'ProteinFamilySorter',
				name: 'ProteinFamilySorter'
			};
			var target = document.getElementById("flashTarget");
			// binding flash functions
			window.flashReady = lang.hitch(this, "flashReady");
			window.flashRequestsData = lang.hitch(this, "flashRequestsData");
			//["flashReady", "flashRequestsData"].forEach(function(item){
			//	window[item] = lang.hitch(this, item);
			//});
			swfobject.embedSWF('/js/p3/resources/HeatmapViewer.swf', target, '100%', '100%', 19, '/js/swfobject/lib/expressInstall.swf', flashVars, params, attributes);
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
		flashReady: function(flashObjectID){
			var target = document.getElementById(flashObjectID);
			target.refreshData(); // this triggers flashRequestsData callback
			//console.log("flashReady is called", flashObjectID, target);
		},
		flashRequestsData: function(flashObjectID){
			//console.log("flashRequestData is called", flashObjectID);
			var filterData = this.filterGrid.store.data;
			//console.warn(filterData);
			var dataStore = this.dataGridContainer.grid.store;
			//console.log(dataStore);
			var currentData = dataStore.getHeatmapData(filterData);
			//console.log(currentData);
			return currentData;
		}
	});
});
