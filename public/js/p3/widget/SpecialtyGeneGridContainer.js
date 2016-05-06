define([
	"dojo/_base/declare", "./GridContainer",
	"./SpecialtyGeneGrid", "dijit/popup",
	"dijit/TooltipDialog", "./FacetFilterPanel",
	"dojo/_base/lang", "dojo/on"
], function(declare, GridContainer,
			Grid, popup,
			TooltipDialog, FacetFilterPanel,
			lang, on){

	var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><divi class="wsActionTooltip" rel="protein">View FASTA Proteins</div>'
	var viewFASTATT = new TooltipDialog({
		content: vfc, onMouseLeave: function(){
			popup.close(viewFASTATT);
		}
	});

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>'
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
		// console.log("selection: ", selection);
		// console.log("DownloadQuery: ", dataType, currentQuery );
		window.open("/api/" + dataType + "/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download");
		popup.close(downloadTT);
	});

	return declare([GridContainer], {
		containerType: "spgene_data",
		facetFields: ["property", "source", "evidence"],
		maxGenomeCount: 5000,
		dataModel: "sp_gene",
		getFilterPanel: function(opts){
		},
		containerActions: GridContainer.prototype.containerActions.concat([
			[
				"DownloadTable",
				"fa fa-download fa-2x",
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
		]),
		gridCtor: Grid

	});
});
