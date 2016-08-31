define("p3/widget/PathwaysMemoryGridContainer", [
	"dojo/_base/declare", "./GridContainer", "dojo/on",
	"./PathwaysMemoryGrid", "dijit/popup", "dojo/topic",
	"dijit/TooltipDialog", "./FilterContainerActionBar",
	"dojo/_base/lang","dojo/dom-construct"

], function(declare, GridContainer, on,
			PathwaysGrid, popup, Topic,
			TooltipDialog, ContainerActionBar,
			lang,domConstruct){

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
		facetFields: ["annotation"],
		enableFilterPanel: true,
		apiServer: window.App.dataServiceURL,
		store: null,
		visible: true,
		dataModel: "pathway",
		type: "pathway",
		primaryKey: "id",
		maxDownloadSize: 25000,
		typeMap: {
			"pathway": "pathway_id",
			"ec_number": "ec_number",
			"gene": "feature_id"
		},
		_setQueryAttr: function(query){
			// override _setQueryAttr since we're going to build query inside PathwayMemoryStore
		},

		buildQuery: function(){
			return "";
		},

		_setStoreAttr: function(store){
			if(this.grid){
				this.grid.store = store;
			}
			this._set('store', store);
		},

		createFilterPanel: function(){
			// console.log("Create Container ActionBar with currentContainerWidget: ", this)
			var _self = this;
			this.containerActionBar = this.filterPanel = new ContainerActionBar({
				region: "top",
				layoutPriority: 7,
				splitter: true,
				"className": "BrowserHeader",
				dataModel: this.dataModel,
				facetFields: this.facetFields,
				currentContainerWidget: this,
				_setQueryAttr: function(query){
					var p = _self.typeMap[_self.type];
					query = query + "&limit(25000)&group((field," + p + "),(format,simple),(ngroups,true),(limit,1),(facet,true))";
					this._set("query", query);
					this.getFacets(query).then(lang.hitch(this, function(facets){
						if(!facets){
							return;
						}

						Object.keys(facets).forEach(function(cat){
							// console.log("Facet Category: ", cat);
							if(this._ffWidgets[cat]){
								// console.log("this.state: ", this.state);
								var selected = this.state.selected;
								// console.log(" Set Facet Widget Data", facets[cat], " _selected: ", this._ffWidgets[cat].selected)
								this._ffWidgets[cat].set('data', facets[cat], selected);
							}else{
								// console.log("Missing ffWidget for : ", cat);
							}
						}, this);

					}));

				}
			});

			// console.log("gridcontainer startup()", this.state)
			this.filterPanel.watch("filter", lang.hitch(this, function(attr, oldVal, newVal){
				// console.log("FILTER PANEL SET FILTER", arguments)
				// console.log("oldVal: ", oldVal, "newVal: ", newVal, "state.hashParams.filter: ", this.state.hashParams.filter)
				// console.log("setFilter Watch() callback", newVal);
				if((oldVal != newVal) && (this.state && this.state.hashParams && (newVal != this.state.hashParams.filter))){
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
		/*	[
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
					var _self=this;

					var totalRows =_self.grid.totalRows;
						console.log("TOTAL ROWS: ", totalRows);
					if (totalRows > _self.maxDownloadSize){
						downloadTT.set('content',"This table exceeds the maximum download size of " + _self.maxDownloadSize);
					}else{
						downloadTT.set("content", dfc);

						on(downloadTT.domNode, "div:click", function(evt){
							var rel = evt.target.attributes.rel.value;
							var dataType=_self.dataModel;
							var currentQuery = _self.grid.get('query');

							console.log("DownloadQuery: ", currentQuery);
							var query =  currentQuery + "&sort(+" + _self.primaryKey + ")&limit(" + _self.maxDownloadSize + ")";
				
			                var baseUrl = (window.App.dataServiceURL ? (window.App.dataServiceURL) : "") 
	                        if(baseUrl.charAt(-1) !== "/"){
	                             baseUrl = baseUrl + "/";
	                        }
	                        baseUrl = baseUrl + dataType + "/?";

							if (window.App.authorizationToken){
								baseUrl = baseUrl + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken)
							}
				
							baseUrl = baseUrl + "&http_accept=" + rel + "&http_download=true";
	                        var form = domConstruct.create("form",{style: "display: none;", id: "downloadForm", enctype: 'application/x-www-form-urlencoded', name:"downloadForm",method:"post", action: baseUrl },_self.domNode);
	                        domConstruct.create('input', {type: "hidden", value: encodeURIComponent(query), name: "rql"},form);
	                        form.submit();			

							//window.open(url);
							popup.close(downloadTT);
						});
					}

					popup.open({
						popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
						around: this.containerActionBar._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				true,
				"left"
			]*/
		]),
		selectionActions: GridContainer.prototype.selectionActions.concat([
			[
				"ViewPathwayMap",
				"fa icon-map-o fa-2x",
				{
					label: "Map",
					multiple: false,
					validTypes: ["*"],
					tooltip: "View PathwayMap",
					validContainerTypes: ["pathway_data"]
				},
				function(selection){
					// console.log(selection, this.type, this.state);
					var url = {annotation: 'PATRIC'};

					if(this.state.hasOwnProperty('taxon_id')){
						url['taxon_id'] = this.state.taxon_id;
					}else if(this.state.hasOwnProperty('genome')){
						url['genome_id'] = this.state.genome.genome_id;
					}else if(this.state.hasOwnProperty('genome_ids')){
						url['genome_ids'] = this.state.genome_ids;
					}

					switch(this.type){
						case "pathway":
							url['pathway_id'] = selection[0].pathway_id;
							break;
						case "ec_number":
							url['pathway_id'] = selection[0].pathway_id;
							url['ec_number'] = selection[0].ec_number;
							break;
						case "gene":
							url['pathway_id'] = selection[0].pathway_id;
							url['feature_id'] = selection[0].feature_id;
							break;
						default:
							break;
					}
					var params = Object.keys(url).map(function(p){
						return p + "=" + url[p]
					}).join("&");
					// console.log(params);
					Topic.publish("/navigate", {href: "/view/PathwayMap/" + params});
				},
				false
			]
		]),
		onSetState: function(attr,oldState,state){
			if(!state){
				console.log("!state in grid container; return;")
				return;
			}
			var q = [];
			var _self=this;
			if(state.search){
				q.push(state.search);
			}

			if(state.hashParams && state.hashParams.filter && state.hashParams.filter == "false"){
				//console.log("filter set to false, no filtering");

			}else if(state.hashParams){
				// console.log("   Found state.hashParams");
				if(state.hashParams.filter){
					// console.log("       Found state.hashParams.filter, using");
					q.push(state.hashParams.filter)
				}else if(!oldState && this.defaultFilter){
					// console.log("       No original state, using default Filter");
					state.hashParams.filter = this.defaultFilter;
					this.set('state', lang.mixin({},state, {hashParams: lang.mixin({}, state.hashParams)}));
					return;
				}else if(oldState && oldState.hashParams && oldState.hashParams.filter){
					// console.log("       Found oldState with hashparams.filter, using");
					state.hashParams.filter = oldState.hashParams.filter;
					// this.set('state', state);
					this.set('state', lang.mixin({},state, {hashParams: lang.mixin({}, state.hashParams)}));
					return;
				}else if(this.defaultFilter){
					state.hashParams.filter = this.defaultFilter;
					// this.set('state', state);
					this.set('state', lang.mixin({},state, {hashParams: lang.mixin({}, state.hashParams)}));
					return;
				}else{
					// console.log("    hmmm shouldn't get here if we have defaultFilter:", this.defaultFilter)

				}
			}else{
				state.hashParams = {}
				if(!oldState && this.defaultFilter){
					state.hashParams.filter = this.defaultFilter;
				}else if(oldState && oldState.hashParams && oldState.hashParams.filter){
					state.hashParams.filter = oldState.hashParams.filter
				}
				// this.set('state', state);
				this.set('state', lang.mixin({},state, {hashParams: lang.mixin({}, state.hashParams)}));
				return;
			}
			// console.log(" Has Filter Panel?", !!this.filterPanel);

			if(this.enableFilterPanel && this.filterPanel){
				// console.log("    FilterPanel Found (in GridContainer): ", state);
				this.filterPanel.set("state", state);
			}
			// console.log("setState query: ",q.join("&"), " state: ", state)
			// this.set("query", q.join("&"));

			if (this.grid){
				this.grid.set("state",lang.mixin({},state, {hashParams: lang.mixin({}, state.hashParams)}));
			}

		}
	});
});
