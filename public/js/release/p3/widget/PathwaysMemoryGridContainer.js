define("p3/widget/PathwaysMemoryGridContainer", [
	"dojo/_base/declare", "./GridContainer", "dojo/on",
	"./PathwaysMemoryGrid", "dijit/popup", "dojo/topic",
	"dijit/TooltipDialog","./FilterContainerActionBar",
	"dojo/_base/lang"

], function(declare, GridContainer, on,
			PathwaysGrid, popup, Topic,
			TooltipDialog, ContainerActionBar,
			lang){

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
		gridCtor: PathwaysGrid,
		containerType: "pathway_data",
		defaultFilter: "eq(annotation,%22PATRIC%22)",
		facetFields: ["annotation", "feature_type"],
		enableFilterPanel: false,
		apiServer: window.App.dataServiceURL,
		store: null,
		visible: true,
		dataModel: "pathway",
		type: "pathway",
		typeMap: {
			"pathway": "pathway_id",
			"ec_number": "ec_number",
			"gene": "gene"
		},
		_setQueryAttr: function(query){
			// override _setQueryAttr since we're going to build query inside PathwayMemoryStore
		},

		buildQuery: function(){
			return "";
		},

		_setStoreAttr: function(store){
			if ( this.grid ) {
				this.grid.store = store;
			}
			this._set('store', store);
		},

		createFilterPanel: function(){
				// console.log("Create Container ActionBar with currentContainerWidget: ", this)
				var _self=this;
				this.containerActionBar = this.filterPanel = new ContainerActionBar({
					region: "top",
					layoutPriority: 7,
					splitter: true,
					"className": "BrowserHeader",
					dataModel: this.dataModel,
					facetFields: this.facetFields,
					state: this.state,
					currentContainerWidget: this,
					_setQueryAttr: function(query){
						// console.log("_setQueryAttr: ", query)
						var p = _self.typeMap[_self.type];
						query = query + "&limit(25000)&group((field," + p + "),(format,simple),(ngroups,true),(limit,1),(facet,true))"
						console.log("FILTERCONTAINERACTION BAR OVERRIDE QUERY: ", query)
						this._set("query", query)
						this.getFacets(query).then(lang.hitch(this, function(facets){
							// console.log("_setQuery got facets: ", facets)
							if (!facets) { console.log("No Facets Returned"); return; }

							Object.keys(facets).forEach(function(cat){
								 // console.log("Facet Category: ", cat);
								if (this._ffWidgets[cat]){
									// console.log("this.state: ", this.state);
									var selected = this.state.selected;
									 // console.log(" Set Facet Widget Data", facets[cat], " _selected: ", this._ffWidgets[cat].selected)
									this._ffWidgets[cat].set('data', facets[cat], selected);
								}else{
									 // console.log("Missing ffWidget for : ", cat);
								}
							},this);

						}));

					}
				});

				// console.log("gridcontainer startup()", this.state)
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
				true,
				"left"
			]
		]),

		_setStateAttr: function(state){
			this.inherited(arguments);
			if (!state) { return; }
			console.log("PathwaysMemoryGridContainer _setStateAttr: ", state);
			if(this.grid){
				// console.log("   call set state on this.grid: ", this.grid);
				this.grid.set('state', state);

			}else{
				console.log("No Grid Yet (PathwaysGridContainer)");
			}

			this._set("state", state);
		}
	});
});
