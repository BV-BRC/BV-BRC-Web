define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/lang",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/StackContainer", "dijit/layout/TabController",
	"./CorrelatedGenesGridContainer", "dijit/layout/ContentPane", "./GridContainer", "dijit/TooltipDialog"
], function(declare, BorderContainer, on, lang,
			ActionBar, ContainerActionBar, TabContainer, StackController,
			CorrelatedGenesGridContainer, ContentPane, GridContainer, TooltipDialog){
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
		tooltip: 'The "Correlated Genes" tab shows list of genes from the same genome with correlated expression profiles',
		gutters: false,
		state: null,
		maxGenomeCount: 5000,
		apiServer: window.App.dataServiceURL,

		onSetState: function(attr, oldVal, state){
			// console.log("CorrelatedGenesContainer set STATE.  feature_id: ", state.feature_id, " state: ", state);

			if(!state){
				return;
			}

			if(this.correlatedGenesGrid){
				this.correlatedGenesGrid.set('state', state);
			}

			// console.log("call _set(state) ", state);

			// this._set("state", state);
		},

		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}
			// if(this.correlatedGenesGrid){
			// 	this.correlatedGenesGrid.set("visible", true)
			// }
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}

			this.correlatedGenesGrid = new CorrelatedGenesGridContainer({
				region: "center",
				title: "Correlated Genes",
				content: "Correlated Genes Grid",
				visible: true,
				apiServer: this.apiServer
			});

			this.watch("state", lang.hitch(this, "onSetState"));

			this.addChild(this.correlatedGenesGrid);

			this.inherited(arguments);
			this._firstView = true;
		}
	});
});

