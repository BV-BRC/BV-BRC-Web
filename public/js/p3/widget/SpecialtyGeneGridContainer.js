define([
	"dojo/_base/declare", "./GridContainer",
	"./SpecialtyGeneGrid", "dijit/popup",
	"dijit/TooltipDialog","dijit/layout/ContentPane"
], function(declare, GridContainer,
			Grid, popup,
			TooltipDialog,ContentPane) {

	var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><divi class="wsActionTooltip" rel="protein">View FASTA Proteins</div>'
	var viewFASTATT = new TooltipDialog({
		content: vfc, onMouseLeave: function() {
			popup.close(viewFASTATT);
		}
	});

	return declare([GridContainer], {
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
				function(selection) {
					popup.open({
						popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
						around: this.selectionActionBar._actions.ViewFASTA.button,
						orient: ["below"]
					});
				},
				false
			]
		]),
		gridCtor: Grid,
		getFilterPanel: function(){
			if (!this.filterPanel) { 
				this.filterPanel = new ContentPane({style: "color:#fff;", content: "Specialty Gene Filter/Facets Go Here"});
			}
			return this.filterPanel 
		},
	});
});
