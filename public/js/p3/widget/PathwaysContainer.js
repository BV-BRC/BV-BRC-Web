define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/lang",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/StackContainer", "dijit/layout/TabController",
	"./PathwaysMemoryGridContainer", "dijit/layout/ContentPane", "./GridContainer", "dijit/TooltipDialog",
	"../store/PathwayMemoryStore"
], function(declare, BorderContainer, on, lang,
			ActionBar, ContainerActionBar, TabContainer, StackController,
			PathwaysGridContainer, ContentPane, GridContainer, TooltipDialog,
			PathwayMemoryStore
){
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

	return declare([BorderContainer], {
		gutters: false,
		state: null,
		maxGenomeCount: 5000,
		apiServer: window.App.dataServiceURL,
		defaultFilter: "eq(annotation,%22PATRIC%22)",


		postCreate: function(){
			this.inherited(arguments);
			this.watch("state", lang.hitch(this, "onSetState"));
		},

		onSetState: function(attr, oldVal, state){
			// console.log("PathwaysContainer set STATE.  genome_ids: ", state.genome_ids, " state: ", state);

			if (!state) { return; };

			if(this.pathwaysGrid){
				//console.log("Set PathwaysGrid State: ", state);
				this.pathwayStore.set('state', state)
				this.pathwaysGrid.set('state', state);
			}

			if(this.ecNumbersGrid){
				//console.log("Set PathwaysGrid State: ", state);
				this.ecNumberStore.set('state', state)
				this.ecNumbersGrid.set('state', state);
			}

			if(this.genesGrid){
				//console.log("Set PathwaysGrid State: ", state);
				this.geneStore.set('state', state)
				this.genesGrid.set('state', state);
			}

			// console.log("call _set(state) ", state);

			// this._set("state", state);
		},

		visible: false,
		_setVisibleAttr: function(visible){

			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
				
				if(this.pathwaysGrid){
					this.pathwaysGrid.set("visible", true)
				}

				if(this.ecNumbersGrid){
					this.ecNumbersGrid.set("visible", true)
				}

				if(this.genesGrid){
					this.genesGrid.set("visible", true)
				}
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

			var pathwayStore = this.pathwayStore =  new PathwayMemoryStore({type: "pathway", state: this.state});
			var ecNumberStore = this.ecNumberStore = new PathwayMemoryStore({type: "ecnumber", state: this.state});
			var geneStore = this.geneStore = new PathwayMemoryStore({type: "genes", state: this.state});

			this.pathwaysGrid = new PathwaysGridContainer({
				title: "Pathways",
				type: "pathway",
				state: this.state,
				apiServer: this.apiServer,
				defaultFilter: this.defaultFilter,
				store: pathwayStore,
				facetFields: ["annotation","pathway_class","pathway_name","ec_number","gene"],
				queryOptions: {
					sort: [{attribute: "pathway_id"}]
				},
				enableFilterPanel: true,
				visible: true
			});

			this.ecNumbersGrid = new PathwaysGridContainer({
				title: "EC Numbers",
				type: "ec_number",
				state: this.state,
				apiServer: this.apiServer,
				defaultFilter: this.defaultFilter,
				facetFields: ["annotation","pathway_class","pathway_name","ec_number","gene"],
				columns: lang.mixin({},this.pathwaysGrid.get('columns'),{ecnumber: {label: 'EC Number', field: 'ec_number'},annotation: {label: 'Annotation', field: 'annotation'}}),
				store: ecNumberStore,
				enableFilterPanel: true,
				queryOptions: {
					sort: [{attribute: "ec_number"}]
				},
			});

			this.genesGrid = new PathwaysGridContainer({
				title: "Genes",
				type: "gene",
				state: this.state,
				apiServer: this.apiServer,
				defaultFilter: this.defaultFilter,
				facetFields: ["annotation","pathway_class","pathway_name","ec_number","gene"],
				columns: lang.mixin({},this.ecNumbersGrid.get('columns'),{gene: {label: 'Gene', field: 'gene'},ecnumber: {label: 'EC Number', field: 'ec_number'},annotation: {label: 'Annotation', field: 'annotation'}}),
				store: geneStore,
				enableFilterPanel: true,
				queryOptions: {
					sort: [{attribute: "gene"}]
				},
			});

			this.watch("state", lang.hitch(this, "onSetState"));

			this.addChild(tabController);
			this.addChild(this.tabContainer);
			this.tabContainer.addChild(this.pathwaysGrid);
			this.tabContainer.addChild(this.ecNumbersGrid);
			this.tabContainer.addChild(this.genesGrid);

			this._firstView = true;
		}

	})
});

