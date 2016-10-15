define("p3/widget/ProteinFamiliesGridContainer", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/topic", "dojo/when", "dojo/request", "dojo/dom-construct",
	"dijit/popup", "dijit/TooltipDialog", "dijit/Dialog",
	"./ProteinFamiliesGrid", "./GridContainer", "./DownloadTooltipDialog", "../util/PathJoin", "./SelectionToGroup"
], function(declare, lang,
			on, Topic, when, request, domConstruct,
			popup, TooltipDialog, Dialog,
			ProteinFamiliesGrid, GridContainer, DownloadTooltipDialog, PathJoin, SelectionToGroup){

	var vfc = ['<div class="wsActionTooltip" rel="dna">View FASTA DNA</div>',
		'<div class="wsActionTooltip" rel="protein">View FASTA Proteins</div>'
	].join("\n");

	var viewFASTATT = new TooltipDialog({
		content: vfc, onMouseLeave: function(){
			popup.close(viewFASTATT);
		}
	});

	on(viewFASTATT.domNode, "click", function(evt){
		var rel = evt.target.attributes.rel.value;
		var sel = viewFASTATT.selection;
		delete viewFASTATT.selection;

		Topic.publish("/navigate", {href: "/view/FASTA/" + rel + "/" + sel});
	});

	var downloadSelectionTT = new DownloadTooltipDialog({});
	downloadSelectionTT.startup();

	return declare([GridContainer], {
		gridCtor: ProteinFamiliesGrid,
		containerType: "proteinfamily_data",
		facetFields: [],
		enableFilterPanel: false,
		maxGenomeCount: 500,
		showAutoFilterMessage: false,
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
/*
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
*/
		selectionActions: GridContainer.prototype.selectionActions.concat([
			[
				"DownloadSelection",
				"fa icon-download fa-2x",
				{
					label: "DWNLD",
					multiple: true,
					validTypes: ["*"],
					ignoreDataType: true,
					tooltip: "Download Selection",
					max: 5000,
					tooltipDialog: downloadSelectionTT,
					validContainerTypes: ["proteinfamily_data"]
				},
				function(selection){

					var query = "and(in(genome_id,(" + this.pfState.genomeIds.join(',') + ")),in(" + this.pfState.familyType + "_id,(" + selection.map(function(s){
							return s.family_id;
						}).join(',') + ")))&select(feature_id)&limit(25000)";

					var self = this;

					when(request.post(PathJoin(window.App.dataAPI, '/genome_feature/'), {
						handleAs: 'json',
						headers: {
							'Accept': "application/json",
							'Content-Type': "application/rqlquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': (window.App.authorizationToken || "")
						},
						data: query
					}), function(response){

						self.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.set("selection", response);
						self.selectionActionBar._actions.DownloadSelection.options.tooltipDialog.set("containerType", "feature_data");

						setTimeout(lang.hitch(self, function(){
							popup.open({
								popup: this.selectionActionBar._actions.DownloadSelection.options.tooltipDialog,
								around: this.selectionActionBar._actions.DownloadSelection.button,
								orient: ["below"]
							});
						}), 10);
					});
				},
				false
			],
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

					viewFASTATT.selection = "?and(in(genome_id,(" + this.pfState.genomeIds.join(',') + ")),in(" + this.pfState.familyType + "_id,(" + selection.map(function(s){
							return s.family_id;
						}).join(',') + ")))";

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
			], [
				"AddGroup",
				"fa icon-object-group fa-2x",
				{
					label: "GROUP",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					requireAuth: true,
					max: 100,
					tooltip: "Copy selection to a new or existing group",
					validContainerTypes: ["proteinfamily_data"]
				},
				function(selection){

					var query = "and(in(genome_id,(" + this.pfState.genomeIds.join(',') + ")),in(" + this.pfState.familyType + "_id,(" + selection.map(function(s){
							return s.family_id;
						}).join(',') + ")))&select(feature_id)&limit(25000)";

					when(request.post(PathJoin(window.App.dataAPI, '/genome_feature/'), {
						handleAs: 'json',
						headers: {
							'Accept': "application/json",
							'Content-Type': "application/rqlquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': (window.App.authorizationToken || "")
						},
						data: query
					}), function(featureIds){

						var dlg = new Dialog({title: "Copy Selection to Group"});
						var stg = new SelectionToGroup({
							selection: featureIds,
							type: "feature_group",
							path: ""
						});
						on(dlg.domNode, "dialogAction", function(){
							dlg.hide();
							setTimeout(function(){
								dlg.destroy();
							}, 2000);
						});
						domConstruct.place(stg.domNode, dlg.containerNode, "first");
						stg.startup();
						dlg.startup();
						dlg.show();
					});
				},
				false
			]

		])
	});
});
