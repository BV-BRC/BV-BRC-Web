define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic",
	"dijit/popup", "dijit/TooltipDialog",
	"./PathwaySummaryGrid", "./GridContainer"
], function(declare, lang, on, Topic,
			popup, TooltipDialog,
			PathwaySummaryGrid, GridContainer){

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
	var downloadTT = new TooltipDialog({
		content: dfc, onMouseLeave: function(){
			popup.close(downloadTT);
		}
	});

	on(downloadTT.domNode, "div:click", function(evt){
		var rel = evt.target.attributes.rel.value;
		var self = this;
		// console.log("REL: ", rel);
		var selection = self.actionPanel.get('selection');
		var dataType = (self.actionPanel.currentContainerWidget.containerType == "genome_group") ? "genome" : "genome_feature";
		var currentQuery = self.actionPanel.currentContainerWidget.get('query');
		// console.log("selection: ", selection);
		// console.log("DownloadQuery: ", dataType, currentQuery);
		window.open("/api/" + dataType + "/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download");
		popup.close(downloadTT);
	});

	return declare([GridContainer], {
		gridCtor: PathwaySummaryGrid,
		containerType: "pathway_summary_data",
		facetFields: [],
		enableFilterPanel: false,

		buildQuery: function(){
			// prevent further filtering. DO NOT DELETE
		},
		_setQueryAttr: function(query){
			//block default query handler for now.
		},
		_setStateAttr: function(state){
			this.inherited(arguments);
			if(!state){
				return;
			}
			// console.log("PathwaySummaryGridContainer _setStateAttr: ", state);
			if(this.grid){
				// console.log("   call set state on this.grid: ", this.grid);
				this.grid.set('state', state);
			}else{
				console.log("No Grid Yet (PathwaySummaryGridContainer)");
			}

			this._set("state", state);
		},

		selectionActions: GridContainer.prototype.selectionActions.concat([
			[
				"ViewPathwayMap",
				"fa icon-map-o fa-2x",
				{
					label: "Map",
					multiple: false,
					validTypes: ["*"],
					tooltip: "View PathwayMap",
					validContainerTypes: ["pathway_summary_data"]
				},
				function(selection){
					// console.log(selection, this.state);

					var url = {annotation: 'PATRIC'};

					url['pathway_id'] = selection[0].pathway_id;
					url['feature_id'] = selection[0].feature_ids;
					url['genome_ids'] = selection[0].genome_ids;

					var params = Object.keys(url).map(function(p){
						return p + "=" + url[p]
					}).join("&");
					// console.log(params);
					Topic.publish("/navigate", {href: "/view/PathwayMap/" + params});
				},
				false
			]
		]),

		containerActions: GridContainer.prototype.containerActions.concat([
			[
				"DownloadTable",
				"fa icon-download fa-2x",
				{
					label: "DOWNLOAD",
					multiple: false,
					validTypes: ["*"],
					tooltip: "Download Table",
					tooltipDialog: downloadTT
				},
				function(selection){
					popup.open({
						popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
						around: this.containerActionBar._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				true
			]
		])
	});
});
