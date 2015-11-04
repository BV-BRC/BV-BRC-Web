require({cache:{
'url:p3/widget/templates/IDMapping.html':"<div>\n\t<table class=\"idMappingTable\" style=\"width:300px\">\n\t<tbody>\n\t\t<tr><th class=\"idMappingHeader\">PATRIC Identifiers</th><th class=\"idMappingHeader\" >REFSEQ Identifiers</th></tr>\n\t\t<tr><td rel=\"seed_id\">SEED ID</td><td rel=\"refseq_locus_tag\">RefSeq Locus Tag</td></tr>\n\t\t<tr><td rel=\"feature_id\" >PATRIC ID</td><td rel=\"protein_id\">RefSeq</td></tr>\n\t\t<tr><td rel=\"alt_locus_tag\">Alt Locus Tag</td><td rel=\"gene_id\">Gene ID</td></tr>\n\t\t<tr><td></td><td rel=\"gi\">GI</td></tr>\n\t\t<tr><th class=\"idMappingHeader\" colspan=\"2\">Other Identifiers</th></tr>\n\t\t<tr><td rel=\"Allergome\">Allergome</td><td rel=\"BioCyc\">BioCyc</td></tr>\n\t\t<tr><td rel=\"DIP\">DIP</td><td rel=\"DisProt\">DisProt</td></tr>\n\t\t<tr><td rel=\"DrugBank\">DrugBank</td><td rel=\"ECO2DBASE\">ECO2DBASE</td></tr>\n\t\t<tr><td rel=\"EMBL\">EMBL</td><td rel=\"EMBL-CDS\">EMBL-CDS</td></tr>\n\t\t<tr><td rel=\"EchoBase\">EchoBASE</td><td rel='EcoGene'>EcoGene</td></tr>\n\t\t<tr><td rel=\"EnsemblGenome\">EnsemblGenome</td><td rel=\"EnsemblGenome_PRO\">EnsemblGenome_PRO</td></tr>\n\t\t<tr><td rel=\"EnsemblGenome_TRS\">EnsemblGenome_TRS</td><td rel=\"GeneTree\">GeneTree</td></tr>\n\t\t<tr><td rel=\"GenoList\">GenoList</td><td rel=\"GenomeReviews\">GenomeReviews</td></tr>\n\t\t<tr><td rel=\"HOGENOM\">HOGENOM</td><td rel=\"HSSP\">HSSP</td></tr>\n\t\t<tr><td rel=\"KEGG\">KEGG</td><td rel=\"LegioList\">LegioList</td></tr>\n\t\t<tr><td rel=\"Leproma\">Leproma</td><td rel=\"MEROPS\">MEROPS</td></tr>\n\t\t<tr><td rel=\"MINT\">MINT</td><td rel=\"NMPDR\">NMPDR</td></tr>\n\t\t<tr><td rel=\"OMA\">OMA</td><td rel=\"OrthoDB\">OrthoDB</td></tr>\n\t\t<tr><td rel=\"PDB\">PDB</td><td rel=\"PeroxiBase\">PeroxiBase</td></tr>\n\t\t<tr><td rel=\"PptaseDB\">PptaseDB</td><td rel=\"ProtClustDB\">ProtClustDB</td></tr>\n\t\t<tr><td rel=\"PsuedoCAP\">PseudoCAP</td><td rel=\"REBASE\">REBASE</td></tr>\n\t\t<tr><td rel=\"Reactome\">Reactome</td><td rel=\"RefSeq_NT\">RefSeq_NT</td></tr>\n\t\t<tr><td rel=\"TCDB\">TCDB</td><td rel=\"TIGR\">TIGR</td></tr>\n\t\t<tr><td rel=\"TubercuList\">TubercuList</td><td rel=\"UniParc\">UniParc</td></tr>\n\t\t<tr><td rel=\"UniProtKB-Accession\">UnitProtKB-Accesssion</td><td rel=\"UniRef100\">UniRef100</td></tr>\n\t\t<tr><td rel=\"UniProtKB-ID\">UnitProtKB-ID</td><td rel=\"UniRef100\">UniRef100</td></tr>\n\t\t<tr><td rel=\"UniRef50\">UniRef50</td><td rel=\"UniRef90\">UniRef90</td></tr>\n\t\t<tr><td rel=\"World-2DPAGE\">World-2DPAGE</td><td rel=\"eggNOG\">eggNOG</td></tr>\n\t</tbody>\n\t</table>\n</div>\n"}});
define("p3/widget/ProteinFamiliesGridContainer", [
	"dojo/_base/declare", "./GridContainer", "dojo/on",
	"./ProteinFamiliesGrid", "dijit/popup", "dojo/topic",
	"dijit/TooltipDialog",
	"dojo/_base/lang","dojo/text!./templates/IDMapping.html",
	"dijit/Dialog","dijit/popup","dojo/on"

], function(declare, GridContainer, on,
			ProteinFamiliesGrid, popup, Topic,
			TooltipDialog,
			lang){

	var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div><hr><div class="wsActionTooltip" rel="dna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloaddna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloadprotein"> ';
	var viewFASTATT = new TooltipDialog({
		content: vfc, onMouseLeave: function(){
			popup.close(viewFASTATT);
		}
	});

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
	var downloadTT = new TooltipDialog({
		content: dfc, onMouseLeave: function(){
			popup.close(downloadTT);
		}
	});

	on(downloadTT.domNode, "div:click", function(evt){
		var rel = evt.target.attributes.rel.value;
		console.log("REL: ", rel);
		var selection = self.actionPanel.get('selection');
		var dataType = (self.actionPanel.currentContainerWidget.containerType == "genome_group") ? "genome" : "genome_feature";
		var currentQuery = self.actionPanel.currentContainerWidget.get('query');
		console.log("selection: ", selection);
		console.log("DownloadQuery: ", dataType, currentQuery);
		window.open("/api/" + dataType + "/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download");
		popup.close(downloadTT);
	});

	return declare([GridContainer], {
		gridCtor: ProteinFamiliesGrid,
		containerType: "proteinfamily_data",
		facetFields: [],
		enableFilterPanel: false,
		_setQueryAttr: function(query){
			//block default query handler for now.
		},
		_setStateAttr: function(state){
			this.inherited(arguments);
			if (!state) { return; }
			console.log("PathwaysGridContainer _setStateAttr: ", state);
			if(this.grid){
				console.log("   call set state on this.grid: ", this.grid);
				this.grid.set('state', state);
			}else{
				console.log("No Grid Yet (PathwaysGridContainer)");
			}

			this._set("state", state);
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
		selectionActions: GridContainer.prototype.selectionActions.concat([
			[
				"ViewFASTA",
				"fa icon-fasta fa-2x",
				{
					label: "FASTA",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					tooltip: "View FASTA Data",
					tooltipDialog: viewFASTATT
				},
				function(selection){
					popup.open({
						popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
						around: this.selectionActionBar._actions.ViewFASTA.button,
						orient: ["below"]
					});
				},
				false
			]

		])
	});
});
