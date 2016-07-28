define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic",
	"dijit/popup", "dijit/TooltipDialog",
	"./ProteinFamiliesGrid", "./GridContainer"
], function(declare, lang, on, Topic,
			popup, TooltipDialog,
			ProteinFamiliesGrid, GridContainer){

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
		gridCtor: ProteinFamiliesGrid,
		containerType: "proteinfamily_data",
		facetFields: [],
		enableFilterPanel: false,
		maxGenomeCount: 500,
		constructor: function(){
			var self = this;
			Topic.subscribe("ProteinFamilies", lang.hitch(self, function(){
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "updatePfState":
						self.pfState = value;
						break;
					default:
						break;
				}
			}));
		},
		buildQuery: function(){
			return "";
		},
		_setQueryAttr: function(query){
			//block default query handler for now.
		},
		_setStateAttr: function(state){
			this.inherited(arguments);
			if(!state){
				return;
			}
			// console.log("ProteinFamiliesGridContainer _setStateAttr: ", state);
			if(this.grid){
				// console.log("   call set state on this.grid: ", this.grid);
				Topic.publish("ProteinFamilies", "showLoadingMask");
				this.grid.set('state', state);
			}else{
				// console.log("No Grid Yet (ProteinFamiliesGridContainer)");
			}

			this._set("state", state);
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
					// TODO: pass selection and implement detail
					console.log(selection);
					popup.open({
						popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
						around: this.selectionActionBar._actions.ViewFASTA.button,
						orient: ["below"]
					});
				},
				false
			], [
				"ViewProteinFamiliesMembers",
				"fa icon-group fa-2x",
				{
					label: "Members",
					multiple: true,
					validTypes: ["*"],
					tooltip: "View Family Members",
					validContainerTypes: ["proteinfamily_data"]
				},
				function(selection){

					var query = "?and(in(genome_id,(" + this.pfState.genomeIds.join(',') + ")),in(" + this.pfState.familyType + "_id,(" + selection.map(function(sel){
							return sel.family_id;
						}).join(',') + ")))";

					window.open("/view/FeatureList/" + query + "#view_tab=features");
					// Topic.publish("ProteinFamilies", "showMembersGrid", query);
				},
				false
			]

		])
	});
});
