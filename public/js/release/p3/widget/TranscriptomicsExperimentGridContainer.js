define("p3/widget/TranscriptomicsExperimentGridContainer", [
	"dojo/_base/declare", "./GridContainer",
	"./TranscriptomicsExperimentGrid", "dijit/popup",
	"dijit/TooltipDialog", "./FacetFilterPanel",
	"dojo/_base/lang", "dojo/on", "dojo/dom-construct"
], function(declare, GridContainer,
			Grid, popup,
			TooltipDialog, FacetFilterPanel,
			lang, on, domConstruct){

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
	var downloadTT = new TooltipDialog({
		content: dfc, onMouseLeave: function(){
			popup.close(downloadTT);
		}
	});

	return declare([GridContainer], {
		gridCtor: Grid,
		containerType: "transcriptomics_experiment_data",
		facetFields: ["organism", "strain", "mutant", "condition", "timeseries"],
		maxGenomeCount: 5000,
		dataModel: "transcriptomics_experiment",
		getFilterPanel: function(opts){
		},
		primaryKey: "eid",
		maxDownloadSize: 10000,
		query: "&keyword(*)",
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
				function(){
					var _self = this;

					var grid, dataType, sort;
					if(_self.tabContainer.selectedChildWidget.title == 'Experiments'){
						grid = _self.experimentsGrid;
						dataType = "transcriptomics_experiment";
						sort = "&sort(+eid)";
					}else{
						grid = _self.comparisonsGrid;
						dataType = "transcriptomics_sample";
						sort = "&sort(+pid)";
					}

					if(!grid){
						console.log("Grid Not Defined");
						return;
					}

					// console.log("_self.grid: ", _self.grid);
					var totalRows = grid.totalRows;
					// console.log("TOTAL ROWS: ", totalRows);
					if(totalRows > _self.maxDownloadSize){
						downloadTT.set('content', "This table exceeds the maximum download size of " + _self.maxDownloadSize);
					}else{
						downloadTT.set("content", dfc);

						on(downloadTT.domNode, "div:click", function(evt){
							var rel = evt.target.attributes.rel.value;
							var currentQuery = "in(eid,(" + _self.eids.join(",") + "))";
							var query = currentQuery + sort + "&limit(10000)";

							var baseUrl = (window.App.dataServiceURL ? (window.App.dataServiceURL) : "");
							if(baseUrl.charAt(-1) !== "/"){
								baseUrl = baseUrl + "/";
							}
							baseUrl = baseUrl + dataType + "/?";

							if(window.App.authorizationToken){
								baseUrl = baseUrl + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken)
							}

							baseUrl = baseUrl + "&http_accept=" + rel + "&http_download=true";
							// console.log(baseUrl, query);
							var form = domConstruct.create("form", {
								style: "display: none;",
								id: "downloadForm",
								enctype: 'application/x-www-form-urlencoded',
								name: "downloadForm",
								method: "post",
								action: baseUrl
							}, _self.domNode);
							domConstruct.create('input', {
								type: "hidden",
								value: encodeURIComponent(query),
								name: "rql"
							}, form);
							form.submit();

							popup.close(downloadTT);
						});
					}

					popup.open({
						popup: this.filterPanel._actions.DownloadTable.options.tooltipDialog,
						around: this.filterPanel._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				true
			]
		])
	});
});
