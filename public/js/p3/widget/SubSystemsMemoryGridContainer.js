define([
	"dojo/_base/declare", "./GridContainer", "dojo/on",
	"./SubSystemsMemoryGrid", "dijit/popup", "dojo/topic", "dojo/request", "dojo/when",
	"dijit/TooltipDialog", "./FilterContainerActionBar", "FileSaver", "../util/PathJoin", 
	"dojo/_base/lang", "dojo/dom-construct", "./PerspectiveToolTip"

], function(declare, GridContainer, on,
			SubSystemsGrid, popup, Topic, request, when,
			TooltipDialog, ContainerActionBar, saveAs, PathJoin,
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
		//defaultFilter: "",
		//facetFields: ["annotation"],
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
			"genes": "feature_id"
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
									"Genome Count",
									"Gene Count",
									"Role Count",
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
									row.genome_count,
									row.gene_count,
									row.role_count,
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
					validTypes: ["*"],
					multiple: true,
					max: 10,
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

					console.log("foo");

					///container.state.genome_ids

					var query = "and(in(genome_id,(" + container.state.genome_ids.join(',') + ")),in(subsystem_id,(" + selection.map(function(s){
						return s.subsystem_id;
					}).join(',') + ")))&select(feature_id)&limit(25000)";

					when(request.post(PathJoin(window.App.dataAPI, '/subsystem/'), {
						handleAs: 'json',
						headers: {
							'Accept': "application/json",
							'Content-Type': "application/rqlquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': (window.App.authorizationToken || "")
						},
						data: query
					}), function(featureIds){
						Topic.publish("/navigate", {href: "/view/FeatureList/?in(feature_id,(" + featureIds.map(function(x){
							return x.feature_id;
						}).join(",") + "))#view_tab=features", target: "blank"});
					});
				},
				false
			],

			// BEGIN PathwaySummary -----------------------------------------------------

			[
				"PathwaySummary",
				"fa icon-git-pull-request fa-2x",
				{
					label: "PTHWY",
					ignoreDataType: true,
					multiple: true,
					max: 5000,
					validTypes: ["subsystems_gene"],
					tooltip: "Pathway Summary",
					validContainerTypes: ["subsystem_data"]
				},
				function(selection, containerWidget){

					// console.warn(containerWidget.containerType, containerWidget.type, containerWidget);
					var ids = [];
					switch(containerWidget.containerType){
						case "subsystem_data":
							var familyIds = selection.map(function(d){
								return d['family_id']
							});
							var genomeIds = containerWidget.state.genome_ids;
							var familyIdName = containerWidget.pfState.familyType + "_id";

							when(request.post(this.apiServer + '/genome_feature/', {
								handleAs: 'json',
								headers: {
									'Accept': "application/json",
									'Content-Type': "application/rqlquery+x-www-form-urlencoded",
									'X-Requested-With': null,
									'Authorization': (window.App.authorizationToken || "")
								},
								data: "and(in(" + familyIdName + ",(" + familyIds.join(",") + ")),in(genome_id,(" + genomeIds.join(",") + ")))&select(feature_id)&limit(25000)"
							}), function(response){
								ids = response.map(function(d){
									return d['feature_id']
								});
								Topic.publish("/navigate", {
									href: "/view/PathwaySummary/?features=" + ids.join(','),
									target: "blank"
								});
							});

							return;
							break;
						
						default:
							// feature_data or spgene_data
							ids = selection.map(function(sel){
								return sel['feature_id']
							});
							break;
					}

					Topic.publish("/navigate", {



						href: "/view/PathwaySummary/?features=" + featureIds.map(function(x){
							return x.feature_id;
						}).join(",");
						target: "blank"
					});
				},
				false

			],

			// END PathwaySummary -----------------------------------------------------
			// BEGIN ViewGenomeItem -----------------------------------------------------

			[
				"ViewGenomeItem",
				"MultiButton fa icon-selection-Genome fa-2x",
				{
					label: "GENOME",
					validTypes: ["subsystems_gene"],
					multiple: false,
					tooltip: "Switch to Genome View. Press and Hold for more options.",
					ignoreDataType: true,
					validContainerTypes: ["subsystem_data"],
					pressAndHold: function(selection, button, opts, evt){
						console.log("PressAndHold");
						console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({perspectiveUrl: "/view/Genome/" + selection[0].genome_id}),
							around: button,
							orient: ["below"]
						});

					}
				},
				function(selection){
					var sel = selection[0];
					// console.log("sel: ", sel)
					// console.log("Nav to: ", "/view/Genome/" + sel.genome_id);
					Topic.publish("/navigate", {href: "/view/Genome/" + sel.genome_id});
				},
				false
			],

			// END ViewGenomeItem -----------------------------------------------------
			// BEGIN ViewFASTA -----------------------------------------------------

			[
				"ViewFASTA",
				"fa icon-fasta fa-2x",
				{
					label: "FASTA",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["subsystems_gene"],
					max: 5000,
					tooltip: "View FASTA Data",
					tooltipDialog: viewFASTATT,
					validContainerTypes: ["subsystem_data"]
				},
				function(selection){
					// console.log("view FASTA")
					viewFASTATT.selection = selection;
					// console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
					popup.open({
						popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
						around: this.selectionActionBar._actions.ViewFASTA.button,
						orient: ["below"]
					});
				},
				false
			]

			// END ViewFASTA -----------------------------------------------------



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
