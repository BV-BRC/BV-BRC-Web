define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on",
	"dijit/popup", "dijit/TooltipDialog",
	"FileSaver",
	"./GridContainer", "./FacetFilterPanel", "./InteractionGrid"
], function(declare, lang,
			on,
			popup, TooltipDialog,
			saveAs,
			GridContainer, FacetFilterPanel, Grid){

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';

	var downloadTT = new TooltipDialog({
		content: dfc, onMouseLeave: function(){
			popup.close(downloadTT);
		}
	});

	return declare([GridContainer], {
		gridCtor: Grid,
		containerType: "interaction_data",
		facetFields: ["category", "detection_method", "interaction_type", "source_db", "genome_name_a", "genome_name_b"],
		dataModel: "ppi",
		defaultFilter: "eq(detection_method,%22experimental%20interaction%20detection%22)",
		constructor: function(options){
			this.topicId = options.topicId;

			// Topic.subscribe
		},
		buildQuery: function(){
			return "";
		},
		_setQueryAttr: function(){
			//
		},
		_setStateAttr: function(state){
			this.inherited(arguments);
			if(!state){
				return;
			}
			// console.log("InteractionGridContainer _setStateAttr", state.taxon_id);
			if(this.grid){
				this.grid.set('state', state);
			}

			this._set('state', state);
		},
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

					downloadTT.set("content", dfc);

					on(downloadTT.domNode, "div:click", lang.hitch(this, function(evt){
						var rel = evt.target.attributes.rel.value;
						var DELIMITER, ext;
						if(rel === 'text/csv'){
							DELIMITER = ',';
							ext = 'csv';
						}else{
							DELIMITER = '\t';
							ext = 'txt';
						}

						var data = this.grid.store.query("", {sort: this.grid.store.sort});

						var headers = ["Interactor A", "Interactor Desc A", "Genome ID", "Genome Name", "Feature ID", "RefSeq Locus Tag", "Gene", "Interactor B", "Interactor Desc B", "Genome ID", "Genome Name", "Feature ID", "RefSeq Locus Tag", "Gene", "Category", "Interaction Type", "Detection Method", "Pubmed", "Score"];
						var content = [];
						data.forEach(function(row){
							content.push([row.interactor_a, '"' + row.interactor_desc_a + '"', row.genome_id_a, row.genome_name_a, row.feature_id_a, row.refseq_locus_tag_a, row.gene_a, row.interactor_b, '"' + row.interactor_desc_b + '"', row.genome_id_b, row.genome_name_b, row.feature_id_b, row.refseq_locus_tag_b, row.gene_b, row.category, row.interaction_type, row.detection_method, row.pmid, row.score].join(DELIMITER));
						})

						saveAs(new Blob([headers.join(DELIMITER) + '\n' + content.join('\n')], {type: rel}), 'PATRIC_interactions.' + ext);

						popup.close(downloadTT);
					}));

					popup.open({
						popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
						around: this.containerActionBar._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				true
			]
		]),
		selectionActions: GridContainer.prototype.selectionActions.concat([])
	});
});