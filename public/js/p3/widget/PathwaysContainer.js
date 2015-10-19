define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/lang",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/StackContainer", "dijit/layout/TabController",
	"./PathwaysGridContainer", "dijit/layout/ContentPane", "./GridContainer", "dijit/TooltipDialog",
	"./ItemDetailPanel", "dojo/topic", "dijit/form/ToggleButton"
], function(declare, BorderContainer, on, lang,
			ActionBar, ContainerActionBar, TabContainer, StackController,
			PathwaysGrid, ContentPane, GridContainer, TooltipDialog,
			ItemDetailPanel, Topic, TabButton){

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

	return declare([BorderContainer], {
		gutters: false,
		params: null,
		_setParamsAttr: function(params){
			this.params = params;
			if(this._started && this.pathwaysGrid){
				var changed = false;
				var checkParams = ["genome_id", "annotation", "pathway_id"];

				checkParams.forEach(function(cp){
					if(params[cp] != this.params[cp]){
						changed = true;
						this.params[cp] = params[cp];
					}
				}, this);

				if(changed){
					this.pathwaysGrid.set("params", params);
				}
			}
		},

		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;
			console.log("PathwaysContainer Visible");
			if(this.pathwaysGrid){
				this.pathwaysGrid.set('visible', true);
				if(!this.pathwaysGrid._hasBeenViewed){
					this.pathwaysGrid.set("params", this.params);
					this.pathwaysGrid._hasBeenViewed = true;
				}
			}
		},

		startup: function(){
			if(this._started){
				return;
			}

			this.tabContainer = new TabContainer({region: "center", id: this.id + "_TabContainer"});
			var tabController = new StackController({
				containerId: this.id + "_TabContainer",
				region: "top",
				"class": "TextTabButtons"
			});

			this.pathwaysGrid = new PathwaysGrid({
				title: "Pathways",
				content: "Pathways Grid",
				params: this.params,
				query: {}
			});

			if(this.params){
				this.set("params", this.params);
			}

			this.ecNumbersGrid = new ContentPane({title: "EC Numbers", content: "EC Numbers Grid"});
			this.genesGrid = new ContentPane({title: "Genes", content: "Genes Grid"});

			this.addChild(tabController);
			this.addChild(this.tabContainer);
			this.tabContainer.addChild(this.pathwaysGrid);
			this.tabContainer.addChild(this.ecNumbersGrid);
			this.tabContainer.addChild(this.genesGrid);

			this.inherited(arguments);
		}
	});
});

