define("p3/widget/PathwaySummaryGridContainer", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-construct",
	"dijit/Dialog", "dijit/popup", "dijit/TooltipDialog", "./SelectionToGroup",
	"./PathwaySummaryGrid", "./GridContainer", "./PerspectiveToolTip"
], function(declare, lang, on, Topic, domConstruct,
			Dialog, popup, TooltipDialog, SelectionToGroup,
			PathwaySummaryGrid, GridContainer, PerspectiveToolTipDialog){

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
	var downloadTT = new TooltipDialog({
		content: dfc, onMouseLeave: function(){
			popup.close(downloadTT);
		}
	});

	on(downloadTT.domNode, "div:click", function(evt){
		var rel = evt.target.attributes.rel.value;
		var self = this;
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
		gridCtor: PathwaySummaryGrid,
		containerType: "pathway_summary_data",
		facetFields: [],
		enableFilterPanel: false,

		buildQuery: function(){
			// prevent further filtering. DO NOT DELETE
		},
		_setQueryAttr: function(query){
			//block default query handler for now.
		},
		_setStateAttr: function(state){
			this.inherited(arguments);
			if(!state){
				return;
			}
			// console.log("PathwaySummaryGridContainer _setStateAttr: ", state);
			if(this.grid){
				// console.log("   call set state on this.grid: ", this.grid);
				this.grid.set('state', state);
			}else{
				console.log("No Grid Yet (PathwaySummaryGridContainer)");
			}

			this._set("state", state);
		},

		selectionActions: GridContainer.prototype.selectionActions.concat([
			[
				"ViewPathwayMap",
				"fa icon-map-o fa-2x",
				{
					label: "Map",
					multiple: false,
					validTypes: ["*"],
					tooltip: "View PathwayMap",
					validContainerTypes: ["pathway_summary_data"]
				},
				function(selection){
					// console.log(selection, this.state);

					var url = {annotation: 'PATRIC'};

					url['pathway_id'] = selection[0].pathway_id;
					url['feature_id'] = selection[0].feature_ids;
					url['genome_ids'] = selection[0].genome_ids;

					var params = Object.keys(url).map(function(p){
						return p + "=" + url[p]
					}).join("&");
					// console.log(params);
					Topic.publish("/navigate", {href: "/view/PathwayMap/?" + params, target: "blank"});
				},
				false
			], [
				"ViewFeatureItems",
				"MultiButton fa icon-selection-FeatureList fa-2x",
				{
					label: "FEATURES",
					validTypes: ["*"],
					multiple: true,
					//min: 1,
					max: 5000,
					tooltip: "Switch to Feature List View. Press and Hold for more options.",
					validContainerTypes: ["pathway_summary_data"],
					pressAndHold: function(selection, button, opts, evt){
						console.log("PressAndHold");
						console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "FeatureList",
								perspectiveUrl: "/view/FeatureList/?in(feature_id,(" + selection.map(function(x){
									return x.feature_ids;
								}).join(",") + "))"
							}),
							around: button,
							orient: ["below"]
						});

					}
				},
				function(selection){
					var ids = selection.map(function(d){
						return d['feature_ids'];
					});
					Topic.publish("/navigate", {href: "/view/FeatureList/?in(feature_id,(" + ids.join(",") + "))"});
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
					max: 10000,
					tooltip: "Copy selection to a new or existing feature group",
					validContainerTypes: ["pathway_summary_data"],
				},
				function(selection, containerWidget){
					// console.log("Add Items to Group", selection);
					var dlg = new Dialog({title: "Copy Selection to Group"});
					var type = "feature_group";
					var ids = selection.map(function(d){
						return d['feature_ids'];
					});
					//construct an array, each element is an object with "feature_id" as property
					var features = [];
					ids.forEach(function(s){
					  s.forEach(function(d){
							features.push({feature_id: d});
						})
				  });
					//remove duplicate features
					var feature_map = {};
					features.forEach(function(feature){
            feature_map[feature.feature_id] = true;
          });
					var features_filtered = Object.keys(feature_map).map(function(feature){
            return {feature_id: feature}
          });
					var stg = new SelectionToGroup({
						selection: features_filtered,
						type: type,
						path: containerWidget.get("path")
					});
					on(dlg.domNode, "dialogAction", function(evt){
						dlg.hide();
						setTimeout(function(){
							dlg.destroy();
						}, 2000);
					});
					domConstruct.place(stg.domNode, dlg.containerNode, "first");
					stg.startup();
					dlg.startup();
					dlg.show();
				},
				false
			]
		]),

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
					popup.open({
						popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
						around: this.containerActionBar._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				true
			]
		])
	});
});
