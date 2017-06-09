define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/lang",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/StackContainer", "dijit/layout/TabController",
	"dijit/layout/ContentPane", "dijit/TooltipDialog",
	"./FilterContainerActionBar", "./GenomeGridContainer", "./GridContainer", "./SequenceGridContainer"
], function(declare, BorderContainer, on, lang,
			ActionBar, ContainerActionBar, TabContainer, StackController,
			ContentPane, TooltipDialog,
			FilterContainerActionBar, GenomeGridContainer, GridContainer, SequenceGridContainer){
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
		window.open("/api/" + dataType + "/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download=true");
		popup.close(downloadTT);
	});

	return declare([BorderContainer], {
		gutters: false,
		state: null,
		apiServer: window.App.dataServiceURL,
		_setStateAttr: function(val){
			console.log("GenomeContainer onSetStateAttr: ", val)
			this._set("state", val ? lang.mixin({}, val) : val);
			console.log("After internal set")
		},

		onSetState: function(attr, oldVal, state){
			console.log("GenomeContainer set STATE.  genome_ids: ", state.genome_ids, " state: ", state);

			var q = [];

			if(this.filterPanel){
				console.log("SET FILTERPANEL STATE: ", state)
				this.filterPanel.set("state", state);
			}

			if(this.genomesGrid){
				//console.log("Set PathwaysGrid State: ", state);
				this.genomesGrid.set('state', state);
			}

			if(state.genome_ids){
				if(!this.sequencesGrid){
					console.log("genomesGrid: ", this.genomesGrid);
					this.sequencesGrid = new SequenceGridContainer({
						title: "Sequences",
						state: lang.mixin({}, this.state, {search: "in(genome_id,(" + this.state.genome_ids.join(",") + "))"}),
						visible: true,
						enableFilterPanel: false
					});
					this.tabContainer.addChild(this.sequencesGrid);
				}else{
					this.sequencesGrid.set('state', lang.mixin({}, this.state, {search: "in(genome_id,(" + this.state.genome_ids.join(",") + "))"}))
				}
			}

			console.log("call _set(state) ", state);

		},

		visible: false,
		_setVisibleAttr: function(visible){
			this.visible = visible;

			if(this.visible && !this._firstView){
				if(this._started){
					this.onFirstView();
				}
			}
			if(this.genomesGrid){
				this.genomesGrid.set("visible", true)
			}
		},

		facetFields: GenomeGridContainer.prototype.facetFields,

		containerActions: GenomeGridContainer.prototype.containerActions,

		postCreate: function(){
			console.log("GENOME CONTAINER POSTCREATE");
			this.inherited(arguments);
			this.watch("state", lang.hitch(this, "onSetState"));
		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			this.set("visible", this.visible);
			this._started = true;
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

			console.log("Create FilterPanel state: ", this.state);

			this.filterPanel = new FilterContainerActionBar({
				region: "top",
				splitter: true,
				layoutPriority: 7,
				style: "height: 48px;",
				facetFields: this.facetFields,
				state: this.state,
				"className": "BrowserHeader",
				dataModel: "genome"
			})

			this.genomesGrid = new GenomeGridContainer({
				title: "Genomes",
				state: this.state,
				visible: true,
				enableFilterPanel: false
			});

			console.log("Check # of Genomes: ", this.state.genome_ids ? this.state.genome_ids.length : "None")
			if(this.state && this.state.genome_ids){
				console.log("onFirstView create GenomesGrid: ", this.sequencesGrid);
				this.sequencesGrid = new SequenceGridContainer({
					title: "Sequences",
					state: lang.mixin({}, this.state, {search: "in(genome_id,(" + this.state.genome_ids.join(",") + "))"}),
					visible: true,
					enableFilterPanel: false
				});
				this.tabContainer.addChild(this.sequencesGrid);
			}

			this.addChild(tabController);
			this.addChild(this.filterPanel);
			this.addChild(this.tabContainer);
			this.tabContainer.addChild(this.genomesGrid);
			this.setupActions();
			this.listen();

			this.inherited(arguments);
			this._firstView = true;
		},

		listen: function(){
			on(this.domNode, "ToggleFilters", lang.hitch(this, function(evt){
				// console.log("toggleFilters");
				if(!this.filterPanel && this.getFilterPanel){
					this.filterPanel = this.getFilterPanel()
					this.filterPanel.region = "top"
					this.filterPanel.splitter = true;
					this.layoutPriority = 2;
					this.addChild(this.filterPanel);
				}
				else if(this.filterPanel){
					// console.log("this.filterPanel.minimized: ", this.filterPanel.minimized);
					if(this.filterPanel.minimized){
						this.filterPanel.minimized = false;
						this.filterPanel.resize({
							h: this.filterPanel.minSize + 150
						});
					}
					else{
						this.filterPanel.minimized = false;
						this.filterPanel.resize({
							h: this.filterPanel.minSize
						});
					}
					this.resize();
				}
			}));

			this.filterPanel.watch("filter", lang.hitch(this, function(attr, oldVal, newVal){
				// console.log("FILTER PANEL SET FILTER", arguments)
				// console.log("oldVal: ", oldVal, "newVal: ", newVal, "state.hashParams.filter: ", this.state.hashParams.filter)
				// console.log("setFilter Watch() callback", newVal);
				if((oldVal != newVal) && (newVal != this.state.hashParams.filter)){
					// console.log("Emit UpdateHash: ", newVal);
					on.emit(this.domNode, "UpdateHash", {
						bubbles: true,
						cancelable: true,
						hashProperty: "filter",
						value: newVal,
						oldValue: oldVal
					})
				}
			}));

		},

		setupActions: function(){
			if(this.filterPanel){
				this.containerActions.forEach(function(a){
					this.filterPanel.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
				}, this);
			}

		}
	});
});

