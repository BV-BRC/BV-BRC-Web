define([
	"dojo/_base/declare", "./GridContainer", "dojo/on",
	"./SubSystemsMemoryGrid", "dijit/popup", "dojo/topic",
	"dijit/TooltipDialog", "./FilterContainerActionBar", "FileSaver",
	"dojo/_base/lang", "dojo/dom-construct", "./PerspectiveToolTip"

], function(declare, GridContainer, on,
			SubSystemsGrid, popup, Topic,
			TooltipDialog, ContainerActionBar, saveAs,
			lang, domConstruct, PerspectiveToolTipDialog){

	var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div><hr><div class="wsActionTooltip" rel="dna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloaddna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloadprotein"> ';
	var viewFASTATT = new TooltipDialog({
		content: vfc, onMouseLeave: function(){
			popup.close(viewFASTATT);
		}
	});

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';
	var downloadTT = new TooltipDialog({
		content: dfc, onMouseLeave: function(){
			popup.close(downloadTT);
		}
	});

	on(downloadTT.domNode, "div:click", lang.hitch(function(evt){
		var rel = evt.target.attributes.rel.value;
		var data = downloadTT.get("data");
		var headers = downloadTT.get("headers");
		var filename = downloadTT.get("filename");
		// console.log(data, headers);

		var DELIMITER, ext;
		if(rel === 'text/csv'){
			DELIMITER = ',';
			ext = 'csv';
		}else{
			DELIMITER = '\t';
			ext = 'txt';
		}

		var content = data.map(function(d){
			return d.join(DELIMITER);
		});

		saveAs(new Blob([headers.join(DELIMITER) + '\n' + content.join('\n')], {type: rel}), filename + '.' + ext);

		popup.close(downloadTT);
	}));

	return declare([GridContainer], {
		gridCtor: SubSystemsGrid,
		containerType: "subsystem_data",
		// defaultFilter: "eq(annotation,%22PATRIC%22)",
		// facetFields: ["annotation"],
		enableFilterPanel: true,
		apiServer: window.App.dataServiceURL,
		store: null,
		visible: true,
		dataModel: "subsystem",
		type: "subsystem",
		primaryKey: "id",
		maxDownloadSize: 25000,
		typeMap: {
			"subsystems": "subsystem_id",
			"role_id": "role_id",
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

					downloadTT.set("content", dfc);

					var data = this.grid.store.query("", {});
					var headers, content = [], filename;

					switch(this.type){

						case "subsystems":
							headers = [
									"Class", 
									"Subclass", 
									"Subsystem Id", 
									"Subsystem Name", 
									"Role ID", 
									"Role Name", 
									"Active",  
									"Patric ID", 
									"Gene", 
									"Product"
								]

							data.forEach(function(row){
								content.push([
									row.class, 
									JSON.stringify(row.subclass), 
									row.subsystem_id, 
									JSON.stringify(row.subsystem_name), 
									row.role_id,
									row.role_name, 
									row.active,
									row.patric_id, 
									row.gene,
									row.product	
								]);
							});
							filename = "PATRIC_subsystems";
							break;

						case "genes":
							headers = [
									"Class", 
									"Subclass", 
									"Subsystem Id", 
									"Subsystem Name", 
									"Role ID", 
									"Role Name", 
									"Active",  
									"Patric ID", 
									"Gene", 
									"Product"
								]

							data.forEach(function(row){
								content.push([
									row.class, 
									JSON.stringify(row.subclass), 
									row.subsystem_id, 
									JSON.stringify(row.subsystem_name), 
									row.role_id,
									row.role_name, 
									row.active,
									row.patric_id, 
									row.gene,
									row.product	
								]);
							});
							filename = "PATRIC_subsystems";
							break;
	
						default:
							break;
					}

					downloadTT.set("data", content);
					downloadTT.set("headers", headers);
					downloadTT.set("filename", filename);

					popup.open({
						popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
						around: this.containerActionBar._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				true
			]
		]),
		selectionActions: GridContainer.prototype.selectionActions.concat([
			[
				"ViewFeatureItem",
				"MultiButton fa icon-selection-Feature fa-2x",
				{
					label: "FEATURE",
					validTypes: ["genome_feature"],
					multiple: false,
					tooltip: "Switch to Feature View. Press and Hold for more options.",
					validContainerTypes: ["subsystem_data"],
					pressAndHold: function(selection, button, opts, evt){
						console.log("PressAndHold");
						console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "Feature",
								perspectiveUrl: "/view/Feature/" + selection[0].feature_id
							}),
							around: button,
							orient: ["below"]
						});
					}
				},
				function(selection, container){
					// console.log(selection, container);
					if(container.type !== "gene"){
						return;
					}
					var sel = selection[0];
					Topic.publish("/navigate", {href: "/view/Feature/" + sel.feature_id + "#view_tab=overview"});
				},
				false
			],
			[
				"ViewSubsystemMap",
				"fa icon-map-o fa-2x",
				{
					label: "Map",
					multiple: false,
					validTypes: ["*"],
					tooltip: "View SubsystemMap",
					validContainerTypes: ["subsystem_data"]
				},
				function(selection){
					// console.log(selection, this.type, this.state);
					var url = {annotation: 'PATRIC'};

					if(this.state.hasOwnProperty('taxon_id')){
						url['taxon_id'] = this.state.taxon_id;
					}else if(this.state.hasOwnProperty('genome')){
						url['genome_id'] = this.state.genome.genome_id;
					}
					if(this.state.hasOwnProperty('genome_ids')){
						url['genome_ids'] = this.state.genome_ids;
					}

					switch(this.type){
						case "subsystems":
							url['subsystem_id'] = selection[0].pathway_id;
							break;
						case "role_id":
							url['subsystem_id'] = selection[0].pathway_id;
							url['role_id'] = selection[0].ec_number;
							break;
						case "gene":
							url['subsystem_id'] = selection[0].pathway_id;
							url['feature_id'] = selection[0].feature_id;
							break;
						default:
							break;
					}
					var params = Object.keys(url).map(function(p){
						return p + "=" + url[p]
					}).join("&");
					// console.log(params);
					Topic.publish("/navigate", {href: "/view/PathwayMap/?" + params, target: "blank"});
				},
				false
			]
		]),
		onSetState: function(attr, oldState, state){
			if(!state){
				console.log("!state in grid container; return;")
				return;
			}
			var q = [];
			var _self = this;
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
					this.set('state', lang.mixin({}, state, {hashParams: lang.mixin({}, state.hashParams)}));
					return;
				}else if(oldState && oldState.hashParams && oldState.hashParams.filter){
					// console.log("       Found oldState with hashparams.filter, using");
					state.hashParams.filter = oldState.hashParams.filter;
					// this.set('state', state);
					this.set('state', lang.mixin({}, state, {hashParams: lang.mixin({}, state.hashParams)}));
					return;
				}else if(this.defaultFilter){
					state.hashParams.filter = this.defaultFilter;
					// this.set('state', state);
					this.set('state', lang.mixin({}, state, {hashParams: lang.mixin({}, state.hashParams)}));
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
				this.set('state', lang.mixin({}, state, {hashParams: lang.mixin({}, state.hashParams)}));
				return;
			}
			// console.log(" Has Filter Panel?", !!this.filterPanel);

			if(this.enableFilterPanel && this.filterPanel){
				// console.log("    FilterPanel Found (in GridContainer): ", state);
				this.filterPanel.set("state", state);
			}
			// console.log("setState query: ",q.join("&"), " state: ", state)
			// this.set("query", q.join("&"));

			if(this.grid){
				this.grid.set("state", lang.mixin({}, state, {hashParams: lang.mixin({}, state.hashParams)}));
			}

		}
	});
});
