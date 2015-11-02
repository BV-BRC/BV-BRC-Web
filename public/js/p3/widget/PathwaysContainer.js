define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/lang",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/StackContainer", "dijit/layout/TabController",
	"./PathwaysGridContainer", "dijit/layout/ContentPane", "./GridContainer", "dijit/TooltipDialog"
], function(declare, BorderContainer, on, lang,
			ActionBar, ContainerActionBar, TabContainer, StackController,
			PathwaysGridContainer, ContentPane, GridContainer, TooltipDialog){
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
		state: null,
		maxGenomeCount: 5000,
		apiServer: window.App.dataServiceURL,
		onSetState: function(attr, oldVal, state){
			console.log("PathwaysContainer set STATE.  genome_ids: ", state.genome_ids, " state: ", state);

			if (!state) { return; };

			if(this.pathwaysGrid){
				//console.log("Set PathwaysGrid State: ", state);
				this.pathwaysGrid.set('state', state);
			}

			console.log("call _set(state) ", state);

			this._set("state", state);
		},

		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}
			if(this.pathwaysGrid){
				this.pathwaysGrid.set("visible", true)
			}
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}
			//console.log("PathwaysContainer onFirstView()");
			this.tabContainer = new TabContainer({region: "center", id: this.id + "_TabContainer"});

			var tabController = new StackController({
				containerId: this.id + "_TabContainer",
				region: "top",
				"class": "TextTabButtons"
			});

			//console.log("PathwayContainer Create Pathways Grid.  State: ", this.state, "API Server: ", this.apiServer);
			this.pathwaysGrid = new PathwaysGridContainer({
				title: "Pathways",
				content: "Pathways Grid",
				state: this.state,
				apiServer: this.apiServer
			});

			this.ecNumbersGrid = new ContentPane({title: "EC Numbers", content: "EC Numbers Grid", state: this.state});
			this.genesGrid = new ContentPane({title: "Genes", content: "Genes Grid", state: this.state});

			this.watch("state", lang.hitch(this, "onSetState"));

			this.addChild(tabController);
			this.addChild(this.tabContainer);
			this.tabContainer.addChild(this.pathwaysGrid);
			this.tabContainer.addChild(this.ecNumbersGrid);
			this.tabContainer.addChild(this.genesGrid);

			this.inherited(arguments);
			this._firstView = true;
		}
	});
});

