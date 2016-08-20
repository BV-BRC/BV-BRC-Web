define("p3/widget/SpecialtyGeneGridContainer", [
	"dojo/_base/declare", "./GridContainer",
	"./SpecialtyGeneGrid", "dijit/popup",
	"dijit/TooltipDialog", "./FacetFilterPanel",
	"dojo/_base/lang", "dojo/on","dojo/dom-construct"
], function(declare, GridContainer,
			Grid, popup,
			TooltipDialog, FacetFilterPanel,
			lang, on, domConstruct){

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

	return declare([GridContainer], {
		containerType: "spgene_data",
		facetFields: ["property", "source", "evidence"],
		maxGenomeCount: 10000,
		dataModel: "sp_gene",
		getFilterPanel: function(opts){
		},
		primaryKey: "id",
		maxDownloadSize: 250000,
		tooltip: 'The "Specialty Genes" tab contains a list of specialty genes (e.g., antimicrobial resistance genes, virulence factors, drug targets, and human homologs) for genomes associated with the current view',
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
					var _self=this;

					var totalRows =_self.grid.totalRows;
						console.log("TOTAL ROWS: ", totalRows);
					if (totalRows > _self.maxDownloadSize){
						downloadTT.set('content',"This table exceeds the maximum download size of " + _self.maxDownloadSize);
					}else{
						downloadTT.set("content", dfc);

						on(downloadTT.domNode, "div:click", function(evt){
							var rel = evt.target.attributes.rel.value;
							var dataType=_self.dataModel;
							var currentQuery = _self.grid.get('query');

							console.log("DownloadQuery: ", currentQuery);
							var query =  currentQuery + "&sort(+" + _self.primaryKey + ")&limit(" + _self.maxDownloadSize + ")";
				
			                var baseUrl = (window.App.dataServiceURL ? (window.App.dataServiceURL) : "") 
	                        if(baseUrl.charAt(-1) !== "/"){
	                             baseUrl = baseUrl + "/";
	                        }
	                        baseUrl = baseUrl + dataType + "/?";

							if (window.App.authorizationToken){
								baseUrl = baseUrl + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken)
							}
				
							baseUrl = baseUrl + "&http_accept=" + rel + "&http_download=true";

							console.log("DOWNLOAD QUERY: ", query, "DOWNLOAD URL: ", baseUrl);
	                        var form = domConstruct.create("form",{style: "display: none;", id: "downloadForm", enctype: 'application/x-www-form-urlencoded', name:"downloadForm",method:"post", action: baseUrl },_self.domNode);
	                        domConstruct.create('input', {type: "hidden", value: encodeURIComponent(query), name: "rql"},form);
	                        form.submit();			

							//window.open(url);
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
		gridCtor: Grid

	});
});
