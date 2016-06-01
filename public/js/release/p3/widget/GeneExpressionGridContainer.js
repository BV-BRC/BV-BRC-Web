define("p3/widget/GeneExpressionGridContainer", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic",
	"dijit/popup", "dijit/TooltipDialog",
	"./GeneExpressionGrid", "./GridContainer"
], function(declare, lang, on, Topic,
			popup, TooltipDialog,
			GeneExpressionGrid, GridContainer){

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
		gridCtor: GeneExpressionGrid,
		containerType: "gene_expression_data",
		facetFields: [],
		enableFilterPanel: false,
		constructor: function(){
			var self = this;
			Topic.subscribe("GeneExpression", lang.hitch(self, function(){
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "updateTgState":
						self.tgState = value;
						break;
					default:
						break;
				}
			}));
		//console.log("GeneExpressionGridContainer constructor: self ", self);
		//console.log("GeneExpressionGridContainer constructor: state ", self.state);
		//console.log("GeneExpressionGridContainer constructor: title ", self.title);
		//console.log("GeneExpressionGridContainer constructor: content ", self.content);
		},
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
			var self = this;
			console.log("GeneExpressionGridContainer _setStateAttr: state", state);
			//console.log("GeneExpressionGridContainer _setStateAttr: this.state", this.state);
			if(this.grid){
				console.log("   call set state on this.grid: ", this.grid);
				this.grid.set('state', state);
			}else{
				console.log("No Grid Yet (GeneExpressionGridContainer), this is ", self);
			}

			this._set("state", state);
			//console.log("GeneExpressionGridContainer this._set: ", this.state);
			//console.log("set state (GeneExpressionGridContainer), this= ", self);
			//console.log("set state (GeneExpressionGridContainer), self.grid= ", self.grid);
		},

		startup: function(){
			//console.log("GeneExpressionGridContainer startup()");
			if (this._started) { return; }
			this.inherited(arguments);
			this._set("state", this.get("state"));
			console.log("GeneExpressionGridContainer startup(), arguments, state", arguments, this.get("state"));
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
		])
	});
});
