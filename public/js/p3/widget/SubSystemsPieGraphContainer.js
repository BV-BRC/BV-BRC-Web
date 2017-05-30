define.amd.jQuery = true;
define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", 
	"dojo/query", "dojo/request", "dojo/dom-construct", "dojo/dom-style", 
	"dojo/dom-class", "./FilterContainerActionBar",
	"./GridContainer", "./SubSystemsPieChartMemoryGrid"
], function(declare, lang, on, Topic, 
			query, request, domConstruct, domStyle, 
			domClass, ContainerActionBar,
			GridContainer, SubSystemsPieChartGrid){

	return declare([GridContainer], {
		gridCtor: SubSystemsPieChartGrid,
		containerType: "subsystems_overview_data",
		facetFields: ["subsystem_class"],
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
			// this.containerActionBar = this.filterPanel = new ContainerActionBar({
			// 	region: "top",
			// 	layoutPriority: 7,
			// 	splitter: true,
			// 	"className": "BrowserHeader",
			// 	dataModel: this.dataModel,
			// 	facetFields: this.facetFields,
			// 	currentContainerWidget: this,
			// 	_setQueryAttr: function(query){
			// 		var p = _self.typeMap[_self.type];
			// 		query = query + "&limit(25000)&group((field," + p + "),(format,simple),(ngroups,true),(limit,1),(facet,true))";
			// 		this._set("query", query);
			// 		this.getFacets(query).then(lang.hitch(this, function(facets){
			// 			if(!facets){
			// 				return;
			// 			}

			// 			Object.keys(facets).forEach(function(cat){
			// 				// console.log("Facet Category: ", cat);
			// 				if(this._ffWidgets[cat]){
			// 					// console.log("this.state: ", this.state);
			// 					var selected = this.state.selected;
			// 					// console.log(" Set Facet Widget Data", facets[cat], " _selected: ", this._ffWidgets[cat].selected)
			// 					this._ffWidgets[cat].set('data', facets[cat], selected);
			// 				}else{
			// 					// console.log("Missing ffWidget for : ", cat);
			// 				}
			// 			}, this);

			// 		}));

			// 	}
			// });
		},

		containerActions: GridContainer.prototype.containerActions.concat([]),

		selectionActions: GridContainer.prototype.selectionActions.concat([]),

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

	})
});