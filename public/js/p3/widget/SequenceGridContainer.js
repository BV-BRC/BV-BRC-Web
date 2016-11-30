define([
	"dojo/_base/declare", "./GridContainer",
	"./SequenceGrid", "dijit/popup",
	"dijit/TooltipDialog", "./FacetFilterPanel",
	"dojo/_base/lang", "dojo/on", "dojo/dom-construct",
    "dojo/topic"
], function(declare, GridContainer,
			Grid, popup,
			TooltipDialog, FacetFilterPanel,
			lang, on, domConstruct,Topic){

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
	var downloadTT = new TooltipDialog({
		content: dfc, onMouseLeave: function(){
			popup.close(downloadTT);
		}
	});

	return declare([GridContainer], {
		containerType: "sequence_data",
		facetFields: ["sequence_type", "topology"],
		maxGenomeCount: 10000,
		dataModel: "genome_sequence",
		primaryKey: "sequence_id",
		maxDownloadSize: 25000,
		tooltip: 'The "Sequences" tab contains a list of genomic sequences (e.g. chromosomes, plasmids, contigs) for genomes associated with the current view',
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

					var totalRows = _self.grid.totalRows;
					// console.log("TOTAL ROWS: ", totalRows);
					if(totalRows > _self.maxDownloadSize){
						downloadTT.set('content', "This table exceeds the maximum download size of " + _self.maxDownloadSize);
					}else{
						downloadTT.set("content", dfc);

						on(downloadTT.domNode, "div:click", function(evt){
							var rel = evt.target.attributes.rel.value;
							var dataType = _self.dataModel;
							var currentQuery = _self.grid.get('query');

							// console.log("DownloadQuery: ", currentQuery);
							var query = currentQuery + "&sort(+" + _self.primaryKey + ")&limit(" + _self.maxDownloadSize + ")";

							var baseUrl = (window.App.dataServiceURL ? (window.App.dataServiceURL) : "");
							if(baseUrl.charAt(-1) !== "/"){
								baseUrl = baseUrl + "/";
							}
							baseUrl = baseUrl + dataType + "/?";

							if(window.App.authorizationToken){
								baseUrl = baseUrl + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken)
							}

							baseUrl = baseUrl + "&http_accept=" + rel + "&http_download=true";
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
						popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
						around: this.containerActionBar._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				true,
				"left"
			]
		]),
		selectionActions: GridContainer.prototype.selectionActions.concat([
			[
				"GenomeBrowser",
				"fa icon-genome-browser fa-2x",
				{
					label: "Browser",
					multiple: false,
					validTypes: ["*"],
					validContainerTypes: ["sequence_data"],
					tooltip: "View in Genome Browser"
				},
				function(selection){

					var target = selection[0];

					var hash = lang.replace("#view_tab=browser&loc={0}:{1}..{2}&tracks=refseqs,PATRICGenes,RefSeqGenes", [target.accession, 0, 10000]);

					Topic.publish("/navigate", {
						href: "/view/Genome/" + target.genome_id + hash
					});
				},
				false
			]
        ]),
		gridCtor: Grid
	});
});
