define("p3/widget/GenomeGridContainer", [
	"dojo/_base/declare", "./GridContainer","dojo/on",
	"./GenomeGrid","dijit/popup","dojo/_base/lang",
	"dijit/TooltipDialog","./FacetFilterPanel","dojo/topic"

], function(
	declare, GridContainer,on,
	GenomeGrid,popup,lang,
	TooltipDialog,FacetFilterPanel,Topic
){

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>'
	var downloadTT=  new TooltipDialog({content: dfc, onMouseLeave: function(){ popup.close(downloadTT); }})

	on(downloadTT.domNode, "div:click", function(evt){
		var rel = evt.target.attributes.rel.value;
		console.log("REL: ", rel);
		var selection = self.actionPanel.get('selection')
		var dataType=(self.actionPanel.currentContainerWidget.containerType=="genome_group")?"genome":"genome_feature"
		var currentQuery = self.actionPanel.currentContainerWidget.get('query');
		console.log("selection: ", selection);
		console.log("DownloadQuery: ", dataType, currentQuery );
		window.open("/api/" + dataType + "/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download");		
		popup.close(downloadTT);
	});

	return declare([GridContainer],{
		gridCtor: GenomeGrid,
		containerType: "genome_data",
		facetFields: ["public","genome_status","reference_genome","antimicrobial_resistance","antimicrobial_resistance_evidence","isolation_country","host_name","disease","collection_date"],
		getFilterPanel: function(opts){ return; },
		dataModel: "genome",
		enableAnchorButton: true,
		containerActions: GridContainer.prototype.containerActions.concat([
			[
				"DownloadTable",
				"fa fa-download fa-2x",
				{label:"DOWNLOAD",multiple: false,validTypes:["*"],tooltip: "Download Table", tooltipDialog:downloadTT}, 
				function(selection){	
					popup.open({
						popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
						around: this.containerActionBar._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				true,
				"left"
			]
			// ,[
			// 	"ToggleFilters",
			// 	"fa icon-filter fa-2x",
			// 	{label:"FILTERS",multiple: false,validTypes:["*"],tooltip: "Toggle the visibility of the available filters"}, 
			// 	function(selection){	
			// 		console.log("Toggle the Filters Panel");
			// 		on.emit(this.domNode,"ToggleFilters",{});
			// 	},
			// 	true
			// ]
		])
	});
});
