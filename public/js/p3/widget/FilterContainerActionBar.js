define([
	"dojo/_base/declare", "./ContainerActionBar", "dojo/_base/lang",
	"dojo/dom-construct", "dojo/dom-geometry", "dojo/dom-style", "dojo/dom-class",
	"dijit/form/TextBox", "./FacetFilter", "dojo/request", "dojo/on",
	"rql/parser", "./FilteredValueButton", "dojo/query", "dojo/_base/Deferred",
	"dijit/focus", "../util/PathJoin"
], function(declare, ContainerActionBar, lang,
			domConstruct, domGeometry, domStyle, domClass,
			Textbox, FacetFilter, xhr, on,
			RQLParser, FilteredValueButton, Query, Deferred,
			focusUtil, PathJoin){

	function parseFacetCounts(facets){
		var out = {};

		Object.keys(facets).forEach(function(cat){
			var data = facets[cat];
			if(!out[cat]){
				out[cat] = []
			}
			var i = 0;
			while(i < data.length - 1){
				out[cat].push({label: data[i], value: data[i], count: data[i + 1]})
				i = i + 2;
			}
		});
		return out;
	}

	function parseQuery(filter){
		try{
			var _parsed = RQLParser.parse(filter)
		}catch(err){
			console.log("Unable To Parse Query: ", filter);
			return;
		}

		var _self = this;

		var parsed = {
			parsed: _parsed,
			selected: [],
			byCategory: {},
			keywords: []
		};

		function walk(term){
			// console.log("Walk: ", term.name, " Args: ", term.args);
			switch(term.name){
				case "and":
				case "or":
					term.args.forEach(function(t){
						walk(t);
					});
					break;
				case "eq":
					var f = decodeURIComponent(term.args[0]);
					var v = decodeURIComponent(term.args[1]);
					parsed.selected.push({field: f, value: v});
					if(!parsed.byCategory[f]){
						parsed.byCategory[f] = [v];
					}else{
						parsed.byCategory[f].push(v);
					}
					break;
				case "keyword":
					parsed.keywords.push(term.args[0]);
					break;
				default:
				// console.log("Skipping Unused term: ", term.name, term.args);
			}
		}

		walk(_parsed);

		return parsed;

	}

	return declare([ContainerActionBar], {
		style: "height: 52px; margin:0px; padding:0px; overflow: hidden;",
		minimized: true,
		minSize: 52,
		absoluteMinSize: 52,
		query: "",
		state: null,
		filter: "",
		facetFields: null,
		dataModel: "",
		apiServer: window.App.dataAPI,
		authorizationToken: window.App.authorizationToken,
		enableAnchorButton: false,
		constructor: function(){
			this._ffWidgets = {};
			this._ffValueButtons = {};
			this._filter = {};
			this.minimized = true;
		},
		_setStateAttr: function(state){
			// console.log("FilterContainerActionBar setStateAttr oldState ",JSON.stringify(this.state,null,4));
			// console.log("FilterContainerActionBar setStateAttr newState ",JSON.stringify(state,null,4));
			state = state || {};
			this._set("state", state);
			// console.log("_setStateAttr query: ", state.search, this.query);
			// console.log("_after _setStateAttr: ", state);
		},
		onSetState: function(attr, oldState, state){
			// console.log("FilterContainerActionBar onSetState: ", JSON.stringify(state,null,4))
			if(!state){
				return;
			}
			state.search = (state.search && (state.search.charAt(0) == "?")) ? state.search.substr(1) : (state.search || "");
			// console.log("FilterContainerActionBar onSetState() ", state);

			if(oldState){
				// console.log("    OLD: ", oldState.search, " Filter: ", (oldState.hashParams?oldState.hashParams.filter:null));
			}else{
				// console.log("    OLD: No State");
			}
			// console.log("    NEW: ", state.search, " Filter: ", (state.hashParams?state.hashParams.filter:null));

			var ov, nv;
			if(oldState){
				ov = oldState.search;
				if(oldState.hashParams && oldState.hashParams.filter){
					ov = ov + oldState.hashParams.filter;
				}
			}

			if(state){
				nv = state.search;
				if(state.hashParams && state.hashParams.filter){
					nv = nv + state.hashParams.filter;
				}
			}

			if(ov != nv){
				this._refresh();
			}
		},

		_refresh: function(){
			// console.log("Refresh FilterContainerActionBar");
			var parsedQuery = {};
			var parsedFilter = {};
			var state = this.get('state') || {};

			// console.log("Refresh State: ", state);

			if(state.search){
				// console.log("state.search: ", state.search)
				parsedQuery = parseQuery(state.search);

			}

			if(state && state.hashParams && state.hashParams.filter){
				// console.log("_refresh() state.hashParams.filter: ", state.hashParams.filter);
				if(state.hashParams.filter != "false"){
					parsedFilter = parseQuery(state.hashParams.filter)
					this._filter = {};
				}

				// console.log("parsedFilter: ", parsedFilter);
				// console.log("CALL _set(filter): ", state.hashParams.filter)
				this._set("filter", state.hashParams.filter);
			}
			// console.log("Parsed Query: ", parsedQuery);
			// console.log("Parsed Filter: ", parsedFilter);

			this.keywordSearch.set('value', (parsedFilter && parsedFilter.keywords && parsedFilter.keywords.length > 0) ? parsedFilter.keywords.join(" ") : "");
			on(this.keywordSearch.domNode, "keypress", lang.hitch(this, function(evt){
				var code = evt.charCode || evt.keyCode;
				// console.log("Keypress: ", code);
				if(code == 13){
					focusUtil.curNode && focusUtil.curNode.blur();
				}
			}));

			this.set("query", state.search);

			// console.log("_refresh() parsedFilter.selected: ", parsedFilter.selected);

			// for each of the facet widgets, get updated facet counts and update the content.
			var toClear = []
			Object.keys(this._ffWidgets).forEach(function(category){
				// console.log("Category: ", category)
				this._ffWidgets[category].clearSelection();
				this._updateFilteredCounts(category, parsedFilter ? parsedFilter.byCategory : false, parsedFilter ? parsedFilter.keywords : [])
			}, this);

			// for each of the selected items in the filter, toggle the item on in  ffWidgets
			if(parsedFilter && parsedFilter.selected){
				parsedFilter.selected.forEach(function(sel){
					// console.log("_setSelected FilterContaienrActionBar: ", sel)
					if(sel.field && !this._filter[sel.field]){
						this._filter[sel.field] = [];
					}
					var qval = "eq(" + sel.field + "," + encodeURIComponent(sel.value) + ")";
					if(this._filter[sel.field].indexOf(qval) < 0){
						this._filter[sel.field].push("eq(" + sel.field + "," + encodeURIComponent(sel.value) + ")");
					}

					if(this._ffWidgets[sel.field]){
						// console.log("toggle field: ", sel.value, " on ", sel.field);
						this._ffWidgets[sel.field].toggle(sel.value, true);
					}else{
						// console.log("Selected: ", sel, "  Missing ffWidget: ", this._ffWidgets);
						// this._ffWidgets[sel.field].toggle(sel.value,false);
					}
				}, this)
			}else{
				// console.log("DELETE _ffWidgets")
				Object.keys(this._ffWidgets).forEach(function(cat){
					this._ffWidgets[cat].clearSelection();
				}, this)
			}

			// build/toggle the top level selected filter buttons
			if(parsedFilter && parsedFilter.byCategory){
				Object.keys(parsedFilter.byCategory).forEach(function(cat){
					// console.log("Looking for ffValueButton[" + cat + "]");
					if(!this._ffValueButtons[cat]){
						// console.log("Create ffValueButton: ", cat, parsedFilter.byCategory[cat]);
						var ffv = this._ffValueButtons[cat] = new FilteredValueButton({
							category: cat,
							selected: parsedFilter.byCategory[cat]
						});
						// console.log("ffv: ", ffv, " smallContentNode: ", this.smallContentNode);
						domConstruct.place(ffv.domNode, this.centerButtons, "last")
						ffv.startup();
					}else{
						// console.log("Found ffValueButton. Set Selected");
						this._ffValueButtons[cat].set('selected', parsedFilter.byCategory[cat])
					}
				}, this)

				Object.keys(this._ffValueButtons).forEach(function(cat){
					if(!parsedFilter || !parsedFilter.byCategory[cat]){
						var b = this._ffValueButtons[cat];
						b.destroy();
						delete this._ffValueButtons[cat];
					}
				}, this)

			}else{
				// console.log("DELETE __ffValueButtons")
				Object.keys(this._ffValueButtons).forEach(function(cat){
					var b = this._ffValueButtons[cat];
					b.destroy();
					delete this._ffValueButtons[cat];
				}, this)
			}

		},

		setButtonText: function(action, text){
			// console.log("setButtonText: ", action, text)
			var textNode = this._actions[action].textNode;
			// console.log("textNode: ", textNode);
			textNode.innerHTML = text;
		},
		postCreate: function(){
			this.inherited(arguments);

			domConstruct.destroy(this.pathContainer);
			this.smallContentNode = domConstruct.create("div", {
				"class": "minFilterView",
				style: {margin: "2px"}
			}, this.domNode)
			var table = this.smallContentNode = domConstruct.create("table", {
				style: {
					"border-collapse": "collapse",
					margin: "0px",
					"padding": "0px",
					background: "#fff"
				}
			}, this.smallContentNode);

			var tr = domConstruct.create("tr", {}, table);
			this.leftButtons = domConstruct.create("td", {
				style: {
					"width": "1px",
					"text-align": "left",
					padding: "4px",
					"white-space": "nowrap",
					background: "#fff"
				}
			}, tr);
			this.containerNode = this.actionButtonContainer = this.centerButtons = domConstruct.create("td", {
				style: {
					"border": "0px",
					"border-left": "2px solid #aaa",
					"text-align": "left",
					padding: "4px",
					background: "#fff"
				}
			}, tr);
			this.rightButtons = domConstruct.create("td", {
				style: {
					"text-align": "right",
					padding: "4px",
					background: "#fff",
					width: "1px",
					"white-space": "nowrap"
				}
			}, tr);

			var _self = this;
			var setAnchor = function(){
				var q = _self.query;
				// console.log("Anchor: ", this.state)
				if(_self.state && _self.state.hashParams && _self.state.hashParams.filter){

					on.emit(this.domNode, "SetAnchor", {
						bubbles: true,
						cancelable: true,
						filter: _self.state.hashParams.filter
					})
				}else{
					// console.log("No Filters to set new anchor");
				}
			};

			function toggleFilters(){
				// console.log("Toggle the Filters Panel", _self.domNode);
				on.emit(_self.currentContainerWidget.domNode, "ToggleFilters", {});
			}

			this.addAction("ToggleFilters", "fa icon-filter fa-2x", {
				style: {"font-size": ".5em"},
				label: "FILTERS",
				validType: ["*"],
				tooltip: "Toggle the filter display"
			}, toggleFilters, true, this.rightButtons);

			this.watch("minimized", lang.hitch(this, function(attr, oldVal, minimized){
				//console.log("FilterContainerActionBar minimized: ", minimized)
				if(this.minimized){
					this.setButtonText("ToggleFilters", "FILTERS")
				}else{
					this.setButtonText("ToggleFilters", "HIDE")
				}
			}));

			if(this.enableAnchorButton){
				this.addAction("AnchorCurrentFilters", "fa icon-selection-Filter fa-2x", {
					style: {"font-size": ".5em"},
					label: "APPLY",
					validType: ["*"],
					tooltip: "Apply the active filters to update your current view"
				}, setAnchor, true, this.rightButtons);
			}

			this.fullViewContentNode = this.fullViewNode = domConstruct.create("div", {
				"class": "FullFilterView",
				style: {
					"white-space": "nowrap",
					"vertical-align": "top",
					margin: "0px",
					"margin-top": "5px",
					background: "#333",
					"padding": "0px",
					"overflow-y": "hidden",
					"overflow-x": "auto"
				}
			}, this.domNode)

			// this keeps the user from accidentally going 'back' with a left swipe while horizontally scrolling
			on(this.fullViewNode, "mousewheel", function(event){
				var maxX = this.scrollWidth - this.offsetWidth;
				var maxY = this.scrollHeight - this.offsetHeight;

				if(((this.scrollLeft + event.deltaX) < 0) || ((this.scrollLeft + event.deltaX) > maxX)){
					event.preventDefault();
					// manually take care of the scroll
					this.scrollLeft = Math.max(0, Math.min(maxX, this.scrollLeft + event.deltaX));
					if(domClass.contains(event.target, "FacetValue")){
						this.scrollTop = 0; //Math.max(0, Math.min(maxY, this.scrollTop + event.deltaY));
					}
				}
			})

			var keywordSearchBox = domConstruct.create("div", {
				style: {
					display: "inline-block",
					"vertical-align": "top",
					"margin-top": "4px",
					"margin-left": "2px"
				}
			}, this.centerButtons)
			var ktop = domConstruct.create("div", {}, keywordSearchBox)
			var kbot = domConstruct.create("div", {
				style: {
					"vertical-align": "top",
					padding: "0px",
					"margin-top": "4px",
					"font-size": ".75em",
					"color": "#333", //"#34698e",
					"text-align": "left"
				}
			}, keywordSearchBox)
			var label = domConstruct.create("span", {innerHTML: "KEYWORDS", style: {}}, kbot);
			var clear = domConstruct.create("i", {
				"class": "dijitHidden fa icon-x fa-1x",
				style: {"vertical-align": "bottom", "font-size": "14px", "margin-left": "4px"},
				innerHTML: ""
			}, kbot);

			on(clear, "click", lang.hitch(this, function(){
				this.keywordSearch.set('value', '');
			}));

			this.keywordSearch = Textbox({style: "width: 300px;"})

			this.keywordSearch.on("change", lang.hitch(this, function(val){

				if(val){
					domClass.remove(clear, "dijitHidden");
				}else{
					domClass.add(clear, "dijitHidden");
				}
				on.emit(this.keywordSearch.domNode, "UpdateFilterCategory", {
					bubbles: true,
					cancelable: true,
					category: "keywords",
					value: val
				});
			}));
			domConstruct.place(this.keywordSearch.domNode, ktop, "last");
			this.watch("state", lang.hitch(this, "onSetState"));

			on(this.domNode, "UpdateFilterCategory", lang.hitch(this, function(evt){
				// console.log("UpdateFilterCategory: ", evt);
				if(evt.category == "keywords"){
					if(evt.value && (evt.value.charAt(0) == '"')){
						this._filterKeywords = [evt.value]
					}else{
						var val = evt.value.split(" ").map(function(x){
							return x;
						})
						this._filterKeywords = val;
					}
				}else{
					// console.log("Updating Category Filters: ", evt.category);
					if(evt.filter){
						// console.log("Fount evt.filter.  Set this._filter[" + evt.category + "]", evt.filter);
						this._filter[evt.category] = evt.filter;
					}else{
						// console.log("Delete Filter for category: ", evt.category, this._filter[evt.category]);
						delete this._filter[evt.category];
						if(this._ffWidgets[evt.category]){
							// console.log("toggle field: ", sel.value, " on ", sel.field);
							this._ffWidgets[evt.category].clearSelection();
							if(this._ffValueButtons[evt.category]){
								this._ffValueButtons[evt.category].destroy();
								delete this._ffValueButtons[evt.category];
							}
						}
					}
				}

				var cats = Object.keys(this._filter).filter(function(cat){
					// console.log("Checking for cat: ", cat);
					return this._filter[cat].length > 0
				}, this);
				// console.log("Categories: ", cats);

				// Object.keys(this._filter).forEach(function(key){
				// 		if (this._filter[key] && (this._filter[key].length<1)){
				// 			delete this._filter[key];
				// 		}
				// },this)
				// console.log("this._filterKeywords: ", this._filterKeywords, typeof this._filterKeywords);
				var fkws = [];
				if(this._filterKeywords){
					this._filterKeywords.forEach(function(fk){
						if(fk){
							fkws.push('keyword(' + encodeURIComponent(fk) + ")")
						}
					}, this);
				}

				// console.log("fkws: ", fkws);


				if(fkws.length < 1){
					fkws = false;
				}else if(fkws.length == 1){
					fkws = fkws[0];
				}else{
					fkws = "and(" + fkws.join(",") + ")"
				}

				var filter = "";
				// console.log("Facet Categories: ", cats);
				if(cats.length < 1){
					// console.log("UpdateFilterCategory Set Filter to empty. fkws: ", fkws)
					if(fkws){
						filter = fkws
					}
				}else if(cats.length == 1){
					// console.log("UpdateFilterCategory  set filter to ", this._filter[cats[0]], fkws)
					if(fkws){
						// console.log("Build Filter with Keywords")
						// console.log("Filter: ","and("+ this._filter[cats[0]] + "," + fkws + ")")
						filter = "and(" + this._filter[cats[0]] + "," + fkws + ")";
					}else{
						if (this._filter[cats[0]] instanceof Array){
							filter = "or(" + this._filter[cats[0]].join(",") + ")";
						}else{
							filter = this._filter[cats[0]];
						}
					}
				}else{
					// console.log("UpdateFilterCategory set filter to ", "and(" + cats.map(function(c){ return this._filter[c] },this).join(",") +")")
					var inner = cats.map(function(c){
						// console.log(" Returning _filter[c]:", c,  this._filter[c])
						if (this._filter[c] instanceof Array){
							return "or(" + this._filter[c].join(",") + ")"
						}else{
							return this._filter[c]
						}
					}, this).join(",");

					// console.log("inner: ", inner);

					if(this._filterKeywords){
						filter = "and(" + inner + "," + fkws + ")"
					}else{
						filter = "and(" + inner + ")"
					}
				}

				if(!filter){
					filter = "false"
				}
				// console.log("Set Filter: ", filter)
				this.set("filter", filter);

			}));

		},

		_setFilterAttr: function(filter){
			// console.log("FilterContainerActionBar setFilterAttr: ", filter, " Cur: ", this.filter);
			this._set("filter", filter)
		},

		_updateFilteredCounts: function(category, selectionMap, keywords){
			// console.log("_updateFilteredCounts for: ", category,selectionMap,"keywords: ", keywords, " Filter: ", (this.state && this.state.hashParams)?this.state.hashParams.filter:"None.", "query: ", this.query);
			// console.log("\tcategory: ", category);
			selectionMap = selectionMap || {};
			var cats = Object.keys(selectionMap);
			// console.log("Selection Map Cats: ", cats);
			var w = this._ffWidgets[category];

			if(!w){
				throw Error("No FacetFilter found for " + category);
			}
			var scats = cats.filter(function(c){
				if(c != category){
					return true;
				}
			});

			// console.log("scats: ", scats)
			var ffilter = [];

			if(keywords){
				keywords.forEach(function(k){
					ffilter.push("keyword(" + encodeURIComponent(k) + ")")
				});
			}

			scats.forEach(function(cat){
				if(selectionMap[cat]){
					if(selectionMap[cat].length == 1){
						ffilter.push("eq(" + encodeURIComponent(cat) + "," + encodeURIComponent(selectionMap[cat][0]) + ")");
					}else if(selectionMap[cat].length > 1){
						ffilter.push("or(" + selectionMap[cat].map(function(c){
								return "eq(" + encodeURIComponent(cat) + "," + encodeURIComponent(c) + ")"
							}).join(",") + ")")
					}
				}
			}, this);

			if(ffilter.length < 1){
				ffilter = "";
			}else if(ffilter.length == 1){
				ffilter = ffilter[0]
			}else{
				ffilter = "and(" + ffilter.join(",") + ")";
			}

			var q = [];

			if(this.query){
				q.push((this.query && (this.query.charAt(0) == "?")) ? this.query.substr(1) : this.query);
			}
			if(ffilter){
				q.push(ffilter);
			}

			if(q.length == 1){
				q = q[0];
			}else if(q.length > 1){
				q = "and(" + q.join(",") + ")";
			}

			// console.log("Internal Query: ", q);
			this.getFacets("?" + q, [category]).then(lang.hitch(this, function(r){
				// console.log("Facet Results: ",r);
				if(!r){
					return;
				}
				w.set("data", r[category]);
			}));
			// console.log(" Facet Query: ", ffilter)
		},

		updateFacets: function(selected){
			// console.log("updateFacets(selected)", selected);

			this.set("selected", selected)
		},

		_setSelectedAttr: function(selected){
			// console.log("FilterContainerActionBar setSelected: ", selected)
			if(!selected || (selected.length < 1)){
				// console.log("Clear selected");
				Object.keys(this._ffValueButtons).forEach(function(b){
					this._ffValueButtons[b].destroy();
					delete this._ffValueButtons[b];
				}, this);
				//clear selected facets;
			}else{
				var byCat = {};

				selected.forEach(function(sel){
					// console.log("_setSelected FilterContaienrActionBar: ", selected)
					if(this._ffWidgets[sel.field]){
						// console.log("toggle field: ", sel.value, " on ", sel.field);
						this._ffWidgets[sel.field].toggle(sel.value, true);
					}
					if(!byCat[sel.field]){
						byCat[sel.field] = [sel.value]
					}else{
						byCat[sel.field].push(sel.value);
					}
					// console.log("Check for ValueButton: ", this._ffValueButtons[sel.field + ":" + sel.value])
					// if (!this._ffValueButtons[sel.field + ":" + sel.value]){
					// 	// console.log("Did Not Find Widget: " + sel.field + ":" + sel.value)
					// 	var ffv = this._ffValueButtons[sel.field + ":" + sel.value] = new FilteredValueButton({category: sel.field, value: sel.value});
					// 	domConstruct.place(ffv.domNode,this.smallContentNode, "last")
					// }
				}, this)

				Object.keys(byCat).forEach(function(cat){
					if(!this._ffValueButtons[cat]){
						var ffv = this._ffValueButtons[cat] = new FilteredValueButton({
							category: cat,
							selected: byCat[cat]
						});
						domConstruct.place(ffv.domNode, this.centerButtons, "last")
					}else{
						this._ffValueButtons[cat].set('selected', byCat[cat])
					}
				}, this)

				// var msel = selected.map(function(sel){
				// 	return sel.field + ":" + sel.value;
				// },this)

				// Object.keys(this._ffValueButtons).filter(function(b){
				// 	if (msel.indexOf(b)>=0){
				// 		return false;
				// 	}
				// 	return true;
				// }).forEach(function(b){
				// 	this._ffValueButtons[b].destroy();
				// 	delete this._ffValueButtons[b];
				// },this);
			}
		},
		_setFacetFieldsAttr: function(fields){
			this.facetFields = fields;
			// console.log("Set Facet Fields: ", fields);
			if(!this._started){
				return;
			}

			// removed the sorting here to allow us to specify the order on the categories appear on the filter panel. This is particular important for the Genome List page
			// fields.sort().forEach(lang.hitch(this, function(f){
			fields.forEach(lang.hitch(this, function(f){
				// console.log("Field: ",f)
				this.addCategory(f);
			}))
		},
		addCategory: function(name, values){
			// console.log("Add Category: ", name, values)
			var cs = [];
			if(this.selected){
				cs = this.selected.filter(function(sel){
					if(sel.field == name){
						return true;
					}
					return false;
				}, this);
			}

			var f = this._ffWidgets[name] = new FacetFilter({category: name, data: values || undefined, selected: cs});
			domConstruct.place(f.domNode, this.fullViewContentNode, "last")
		},

		_setQueryAttr: function(query){
			// console.log("_setQueryAttr: ", query)
			if(!query){
				return;
			}
			if(query == this.query){
				return;
			}
			this._set("query", query)
			this.getFacets(query).then(lang.hitch(this, function(facets){
				// console.log("_setQuery got facets: ", facets)
				if(!facets){
					// console.log("No Facets Returned");
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

			}, function(err){
				// console.log("Error Getting Facets: ", err);
			}));

		},

		getFacets: function(query, facetFields){
			// console.log("getFacets: ", query);
			if(!query || query == "?"){
				var def = new Deferred();
				def.resolve(false);
				return def.promise;
			}
			// var d; d=new Deferred(); d.resolve({}); return d.promise;

			// console.log("getFacets: ", query, facetFields);
			if(!this._facetReqIndex){
				this._facetReqIndex = 0;
			}
			var idx = this._facetReqIndex += 1;
			var facetFields = facetFields || this.facetFields;

			var f = "&facet(" + facetFields.map(function(field){
					return "(field," + field + ")"
				}).join(",") + ",(mincount,1))";
			var q = query; // || "?keyword(*)"
			// console.log(idx, " dataModel: ", this.dataModel)
			// console.log(idx, " q: ", query);
			// console.log(idx, " Facets: ", f);

			//var url = this.apiServer + "/" + this.dataModel + "/" + q + "&limit(1)" + f;
			var q = ((q && q.charAt && (q.charAt(0) == "?")) ? q.substr(1) : q) + "&limit(1)" + f;
			// console.log("ID: ", this.id, " Facet Request Index: ", idx, " URL Length: ", url.length)

			// console.log("Facet Query: ", q)
			var fr = xhr(PathJoin(this.apiServer, this.dataModel) + "/", {
				method: "POST",
				handleAs: "json",
				data: q,
				"headers": {
					"accept": "application/solr+json",
					"content-type": "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				}
			});

			return fr.then(lang.hitch(this, function(response, res){
				// console.log("RESPONSE: ",response,  res, res.facet_counts)
				if(res && res.facet_counts && res.facet_counts.facet_fields){
					// console.log("Have Facet Fields: ", res.facet_counts.facet_fields);
					return parseFacetCounts(res.facet_counts.facet_fields)
				}
				// console.log("Missing Facet Data In Response.  Index: ", idx," Url: ", url, " Response: ", res);
				// console.log("Missing data for facet query: ", q)
				throw("Missing Facet Data In Response");
				return;

			}, function(err){
				console.error("XHR Error with Facet Request  " + idx + ". There was an error retreiving facets from: " + url);
				return err;
			}))
		},
		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			this._started = true;
			this.set("facetFields", this.facetFields);
			//this.set("facets", this.facets);
			//this.set("selected", this.selected);
			if(this.state){
				this.onSetState('state', "", this.state);
			}

			if(this.currentContainerWidget){
				this.currentContainerWidget.resize();
			}
		},
		resize: function(changeSize, resultSize){
			var node = this.domNode;

			// set margin box size, unless it wasn't specified, in which case use current size
			if(changeSize){

				domGeometry.setMarginBox(node, changeSize);
			}

			// If either height or width wasn't specified by the user, then query node for it.
			// But note that setting the margin box and then immediately querying dimensions may return
			// inaccurate results, so try not to depend on it.

			var mb = resultSize || {};
			lang.mixin(mb, changeSize || {});       // changeSize overrides resultSize
			if(!("h" in mb) || !("w" in mb)){

				mb = lang.mixin(domGeometry.getMarginBox(node), mb);    // just use domGeometry.marginBox() to fill in missing values
			}

			if(this.smallContentNode){
				var headerMB = domGeometry.getMarginBox(this.smallContentNode);
				// console.log("Header MB: ", headerMB);
				this.minSize = Math.max(headerMB.h, this.absoluteMinSize);
			}else{
				this.minSize = this.absoluteMinSize;
			}

			// console.log("THIS RESIZE: ", this);
			// console.log("mb.h: ", mb.h, " MinSize: ", this.minSize);
			if(mb.h && mb.h > this.minSize){
				domGeometry.setMarginBox(this.fullViewNode, {w: mb.w, h: mb.h - this.minSize})
			}

			if(mb.h <= Math.max(this.minSize, this.absoluteMinSize)){
				this.set("minimized", true);
			}else{
				this.set("minimized", false);
			}

			// Compute and save the size of my border box and content box
			// (w/out calling domGeometry.getContentBox() since that may fail if size was recently set)
			var cs = domStyle.getComputedStyle(node);
			var me = domGeometry.getMarginExtents(node, cs);
			var be = domGeometry.getBorderExtents(node, cs);
			var bb = (this._borderBox = {
				w: mb.w - (me.w + be.w),
				h: mb.h - (me.h + be.h)
			});
			var pe = domGeometry.getPadExtents(node, cs);
			this._contentBox = {
				l: domStyle.toPixelValue(node, cs.paddingLeft),
				t: domStyle.toPixelValue(node, cs.paddingTop),
				w: bb.w - pe.w,
				h: bb.h - pe.h
			};

			Object.keys(this._ffWidgets).forEach(function(name){
				this._ffWidgets[name].resize({h: mb.h - this.absoluteMinSize - 7});
			}, this);

		},
		addAction: function(name, classes, opts, fn, enabled, target){
			// console.log("ADD ACTION '" + name + "' TO TARGET: ", target)
			if(target && typeof target == 'string'){
				if(target == "left"){
					target = this.leftButtons;
				}else if(target == "right"){
					target = this.rightButtons;
				}
			}

			// console.log("Add Action: ", name, classes, opts,enabled);
			target = target || this.leftButtons;
			var wrapper = domConstruct.create("div", {
				"class": (enabled ? "" : "dijitHidden ") + "ActionButtonWrapper",
				rel: name
			});
			var b = domConstruct.create("div", {'className': "ActionButton " + classes}, wrapper);

			if(opts && opts.label){
				var t = domConstruct.create("div", {innerHTML: opts.label, "class": "ActionButtonText"}, wrapper);
			}

			domConstruct.place(wrapper, target, "last");

			this._actions[name] = {
				options: opts,
				action: fn,
				button: wrapper,
				textNode: t
			};

		}

	});
});
