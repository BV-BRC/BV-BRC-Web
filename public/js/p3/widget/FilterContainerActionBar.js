define([
	"dojo/_base/declare", "./ContainerActionBar", "dojo/_base/lang",
	"dojo/dom-construct", "dojo/dom-geometry", "dojo/dom-style","dojo/dom-class",
	"dijit/form/Textbox","./FacetFilter","dojo/request","dojo/on",
	"rql/parser","./FilteredValueButton","dojo/query","dojo/_base/Deferred"
], function(
	declare, ContainerActionBar,lang,
	domConstruct,domGeometry, domStyle,domClass,
	Textbox, FacetFilter,xhr,on,
	RQLParser,FilteredValueButton,Query,Deferred
){


    function parseFacetCounts(facets){
    	var out = {};

    	Object.keys(facets).forEach(function(cat){
    		var data = facets[cat];
    		if (!out[cat]) { out[cat]=[] }
    		var i = 0;
    		while(i<data.length-1) {
    			out[cat].push({label: data[i],value: data[i], count: data[i+1]})
    			i=i+2;
    		}
    	});
    	return out;
    }


	return declare([ContainerActionBar], {
		/* style: "height: 55px; margin-left:-1px; margin-right: 1px;overflow:hidden;", */
		style: "height: 48px; margin:0px;padding:0px; overflow: hidden;",
		minimized: true,
		minSize: 48,
		absoluteMinSize: 48,
		query: "",
		filter:"",
		facetFields:null,
		dataModel: "",
		apiServer: window.App.dataAPI,
		authorizationToken: window.App.authorizationToken,
		constructor: function(){
			this._ffWidgets={};
			this._ffValueButtons={};
			this._filter={};
			this.minimized=true;
		},
		postCreate: function(){
			// this.inherited(arguments);
			// domConstruct.destroy(this.pathContainer);
			//this.pathContainer = domConstruct.create("div", {style: {display: "inline-block","padding-top":"8px"}},this.domNode);		
			this.inherited(arguments);
			domConstruct.destroy(this.pathContainer);

			this.smallContentNode = domConstruct.create("div", {"class": "minFilterView"}, this.domNode);	
			// this.containerNode = domConstruct.create("span", {"class": "ActionButtonContainer"}, this.smallContentNode);		
			domConstruct.place(this.containerNode, this.smallContentNode, "first");

			this.fullViewNode = domConstruct.create("div", {"class": "FullFilterView", style: {"white-space": "nowrap","vertical-align": "top", margin:"0px", "margin-top":"5px",background: "#333","padding": "0px", "overflow-y": "hidden", "overflow-x": "auto"}}, this.domNode)
			this.fullViewContentNode = domConstruct.create("div", {style: {}},this.fullViewNode)

			// this keeps the user from accidentally going 'back' with a left swipe while horizontally scrolling
			on(this.fullViewNode, "mousewheel", function(event){
				var maxX = this.scrollWidth - this.offsetWidth;
  				var maxY = this.scrollHeight - this.offsetHeight;

  				if (((this.scrollLeft + event.deltaX) < 0) || ((this.scrollLeft + event.deltaX) > maxX)){
					event.preventDefault();
					// manually take care of the scroll
					this.scrollLeft = Math.max(0, Math.min(maxX, this.scrollLeft + event.deltaX));
					if (domClass.contains(event.target, "FacetValue")) { 
						this.scrollTop = 0; //Math.max(0, Math.min(maxY, this.scrollTop + event.deltaY));
					}	   				
  				}
			})

			var keywordSearchBox = domConstruct.create("div", {style: { display: "inline-block", "vertical-align":"top", "margin-top": "4px", "margin-left":"2px"}}, this.smallContentNode)
			var ktop = domConstruct.create("div", {}, keywordSearchBox)
			var kbot = domConstruct.create("div", {style: {"margin-top": "4px", "font-size": ".75em", "color":"#34698e", "text-align": "right"}}, keywordSearchBox)
			var label = domConstruct.create("span", {innerHTML: "KEYWORDS", style: {"float": "left"}}, kbot);
			var clear = domConstruct.create("span", {style: {"float": "right"},innerHTML: "CLEAR"}, kbot)
			this.keywordSearch = Textbox({style: "width: 300px;"})

			this.keywordSearch.on("change", lang.hitch(this, function(val){
				// console.log("Keyword Search Change", arguments)
				// console.log("this.keywordSearch.domNode", this.keywordSearch.domNode);
				// var val = val.split(" ").map(function(v) { return encodeURIComponent(v) })
				console.log("WOULD EMIT: keywords : ", val);
				on.emit(this.keywordSearch.domNode, "UpdateFilterCategory", {bubbles:true, cancelable: true, category: "keywords", value: val});
			}));
			domConstruct.place(this.keywordSearch.domNode, ktop, "last");


			// this.keywordSearch.startup();

			on(this.domNode, "UpdateFilterCategory", lang.hitch(this, function(evt){
					console.log("UpdateFilterCategory EVT: ", evt);

					if (evt.category == "keywords"){
							if (evt.value && (evt.value.charAt(0)=='"')){
								this._filterKeywords = [evt.value]
							}else{
								var val = evt.value.split(" ").map(function(x){ return x; })
								this._filterKeywords = val;
							}
					}else{
						if (evt.filter){
							this._filter[evt.category] = evt.filter;
						}else{
							delete this._filter[evt.category];
							if (this._ffWidgets[evt.category]){
								// console.log("toggle field: ", sel.value, " on ", sel.field);
								this._ffWidgets[evt.category].clearSelection();;	
							}
						}
					}

					var cats = Object.keys(this._filter).filter(function(cat){
							return this._filter[cat].length>0
					},this);
					// console.log("Categories: ", cats);


					// Object.keys(this._filter).forEach(function(key){
					// 		if (this._filter[key] && (this._filter[key].length<1)){
					// 			delete this._filter[key];
					// 		}
					// },this)
					console.log("this._filterKeywords: ", this._filterKeywords, typeof this._filterKeywords);
					var fkws = []
					if (this._filterKeywords){
						this._filterKeywords.forEach(function(fk){
							if (fk){
								fkws.push('keyword(' + encodeURIComponent(fk) + ")")
							}
						},this);
					}

					if (fkws.length<1){
						fkws=false;
					}else if (fkws.length==1){
						fkws = fkws[0];
					}else{
						fkws = "and(" + fkws.join(",") + ")"
					}

					if (cats.length < 1){
						console.log("UpdateFilterCategory Set Filter to empty")
						if (fkws){
							this.set('filter',fkws)
						}else{
							this.set('filter', "");
						}
					}else if (cats.length==1){
						console.log("UpdateFilterCategory  set filter to ", this._filter[cats[0]], fkws)
						if (fkws){
							console.log("Build Filter with Keywords")
							console.log("Filter: ","and("+ this._filter[cats[0]] + "," + fkws + ")")
							this.set("filter", "and("+ this._filter[cats[0]] + "," + fkws + ")" )
						}else{
							this.set("filter", this._filter[cats[0]]);
						}
					}else{
						// console.log("UpdateFilterCategory set filter to ", "and(" + cats.map(function(c){ return this._filter[c] },this).join(",") +")")
						var inner = cats.map(function(c){ return this._filter[c] },this).join(",") 
						if (this._filterKeywords){
							this.set("filter", "and(" + inner + "," + fkws + ")")
						}else{
							this.set("filter", "and(" + inner +")"  )
						}
					}

			}));


		},
		_setFilterAttr: function(filter){
			// console.log(this.id, " FilterContainerActionBar setFilter.  Current: '" + this.filter + "'  New: '" + filter + "'");

			if (filter==this.filter){ return; }
			this._set("filter",filter);
			// console.log("POST _set filter trigger");
			var parsed = RQLParser.parse(filter)
			// console.log("PARSED RQL:", parsed);
			var _self=this;

			var selected = [];
			var byCategory = {};
			var keywords = [];

			function walk(term){
				switch(term.name){
					case "and":
					case "or":
						term.args.forEach(function(t){
							walk(t);
						})
						break;
					case "eq":
						var f = decodeURIComponent(term.args[0]);
						var v = decodeURIComponent(term.args[1]);
						selected.push({field:f, value: v});
						if (!byCategory[f]){
							byCategory[f]=[v];
						}else{
							byCategory[f].push(v);
						}
						break;
					case "keyword":
						keywords.push(term.args[0]);
						break;
					default:
						// console.log("Skipping Unused term: ", term.name, term.args);
				}
			}

			walk(parsed);

			// console.log("filter parsing completed, call setSelected from setFilter", filter, parsed, selected)

			//this.updateFacets(selected);

			
			this.keywordSearch.set('value', (keywords && keywords.length>0)?keywords.join(" "):"");
			
			Object.keys(this._ffWidgets).forEach(function(category){
				this._updateFilteredCounts(category, byCategory, keywords)
			},this);

			this.set("selected", selected);
		},

		_updateFilteredCounts: function(category, selectionMap, keywords){
			console.log("_updateFilteredCounts for: ", category,selectionMap,"keywords: ", keywords, " Filter: ", this.filter, "query: ", this.query);
			// console.log("\tcategory: ", category);
			var cats = Object.keys(selectionMap);
			console.log("Selection Map Cats: ", cats);
			var w = this._ffWidgets[category];

			if (!w){ throw Error("No FacetFilter found for " + category); }
			var scats = cats.filter(function(c){
				if (c != category) { return true; }
			})

			console.log("scats: ", scats)
			var ffilter = [];

			if (keywords){
				keywords.forEach(function(k){ ffilter.push("keyword(" + encodeURIComponent(k) + ")") });
			}

			scats.forEach(function(cat){
				if (selectionMap[cat]){
					if (selectionMap[cat].length==1){
						ffilter.push("eq("+encodeURIComponent(cat) + "," + encodeURIComponent(selectionMap[cat][0]) + ")");
					}else if (selectionMap[cat].length>1){
						ffilter.push("or(" + selectionMap[cat].map(function(c){
							return "eq("+encodeURIComponent(cat) + "," + encodeURIComponent(c) + ")"
						}).join(",") + ")")
					}
				}
			},this);
			// console.log("ffilter: ", ffilter)
			if (ffilter.length < 1 ){
				ffilter = "";
			}else if (ffilter.length==1) {
				ffilter = ffilter[0]
			}else{
				ffilter = "and(" + ffilter.join(",") + ")";
			}
			console.log("ffilter final: ", ffilter)
			var q = []
			// console.log("this.query: ", this.query);

			if (this.query) { q.push((this.query && (this.query.charAt(0)=="?"))?this.query.substr(1):this.query ); }
			if (ffilter) { q.push(ffilter); }

			if (q.length==1){
				q = q[0];
			}else if (q.length>1){
				q = "and(" + q.join(",") + ")";
			}

			console.log("Internal Query: ", q);
			this.getFacets("?" + q, [category]).then(lang.hitch(this, function(r){
				 console.log("Facet Results: ",r);
				w.set("data", r[category]);
			}))
			// console.log(" Facet Query: ", ffilter)
		},

		updateFacets: function(selected){
			// console.log("updateFacets(selected)", selected);

			this.set("selected", selected)
		},

		_setSelectedAttr: function(selected){
			// console.log("FilterContainerActionBar setSelected: ", selected)
			if (!selected || (selected.length<1)){
				// console.log("Clear selected");
				Object.keys(this._ffValueButtons).forEach(function(b){
					this._ffValueButtons[b].destroy();
					delete this._ffValueButtons[b];
				},this);
				//clear selected facets;
			}else{
				var byCat = {};

				selected.forEach(function(sel){
					// console.log("_setSelected FilterContaienrActionBar: ", selected)
					if (this._ffWidgets[sel.field]){
						// console.log("toggle field: ", sel.value, " on ", sel.field);
						this._ffWidgets[sel.field].toggle(sel.value,true);	
					}
					if (!byCat[sel.field]){
						byCat[sel.field]=[sel.value]
					}else{
						byCat[sel.field].push(sel.value);
					}
					// console.log("Check for ValueButton: ", this._ffValueButtons[sel.field + ":" + sel.value])
					// if (!this._ffValueButtons[sel.field + ":" + sel.value]){
					// 	// console.log("Did Not Find Widget: " + sel.field + ":" + sel.value)
					// 	var ffv = this._ffValueButtons[sel.field + ":" + sel.value] = new FilteredValueButton({category: sel.field, value: sel.value});
					// 	domConstruct.place(ffv.domNode,this.smallContentNode, "last")
					// }
				},this)

				Object.keys(byCat).forEach(function(cat){
					if (!this._ffValueButtons[cat]){
						var ffv = this._ffValueButtons[cat] = new FilteredValueButton({category: cat, selected: byCat[cat]});
						domConstruct.place(ffv.domNode,this.smallContentNode, "last")
					}else{
						this._ffValueButtons[cat].set('selected', byCat[cat])
					}
				},this)

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
			if (!this._started){return;}

			fields.sort().forEach(lang.hitch(this,function(f){
				// console.log("Field: ",f)
				this.addCategory(f);
			}))
		},
		addCategory: function(name, values){
			// console.log("Add Category: ", name, values)
			var cs = [];
			if (this.selected){
				cs = this.selected.filter(function(sel){
					if (sel.field==name){ return true; }
					return false;
				},this);
			}

			var f = this._ffWidgets[name] = new FacetFilter({category: name, data: values||undefined, selected: cs});
			domConstruct.place(f.domNode, this.fullViewContentNode,"last")
		},

		_setBaseSelectionAttr: function(sel){
			// console.log("set base selection: ", sel);
			this._set("baseSelection", sel);

		},
		_setQueryAttr: function(query){
			// query = (query && (query.charAt(0)=="?"))?query.substr(1):query;
			// console.log("FilterContainerActionBar _setQueryAttr: ", query)
			this.query = query||"";
			var parsed = RQLParser.parse((query && query.charAt && (query.charAt(0)=="?"))?query.substr(1):query)
			// console.log("PARSED RQL:", parsed);
			var _self=this;

			var selected = [];

			function walk(term){
				switch(term.name){
					case "and":
					case "or":
						term.args.forEach(function(t){
							walk(t);
						})
						break;
					case "eq":
						selected.push({field: term.args[0], value: term.args[1]});
						break;
					default:
						// console.log("Skipping Unused term: ", term.name, term.args);
				}
			}

			walk(parsed);
			// console.log("selected: ", selected);

			// console.log("filter parsing completed, call setSelected from setFilter", filter, parsed, selected)

			//this.updateFacets(selected);

		
			this.getFacets(this.query).then(lang.hitch(this, function(facets){
				// console.log("_setQuery got facets: ", facets)
				if (!facets) { console.log("No Facets Returned"); return; }

				Object.keys(facets).forEach(function(cat){
					console.log("Facet Category: ", cat);
					if (this._ffWidgets[cat]){
						var selected = this.selected;
						console.log(" Set Facet Widget Data", facets[cat], " _selected: ", this._ffWidgets[cat].selected)
						this._ffWidgets[cat].set('data', facets[cat], selected);
					}else{
						// console.log("Missing ffWidget for : ", cat);
					}
				},this);

			}));

			this.set("baseSelection", selected);
		
		},

		getFacets: function(query, facetFields){
			// var d; d=new Deferred(); d.resolve({}); return d.promise;
			
			// console.log("getFacets: ", query, facetFields);
			if (!this._facetReqIndex){
				this._facetReqIndex=0;
			}
			var idx = this._facetReqIndex+=1;
			var facetFields = facetFields || this.facetFields;

			var f = "&facet(" + facetFields.map(function(field){
				return "(field," + field + ")"
			}).join(",") + ",(mincount,1))";
			var q = query; // || "?keyword(*)"
			// console.log(idx, " dataModel: ", this.dataModel)
			// console.log(idx, " q: ", query);
			// console.log(idx, " Facets: ", f);

			var url = this.apiServer + "/" + this.dataModel + "/" + q + "&limit(1)" + f;
			var q = ((q && q.charAt &&  (q.charAt(0)=="?"))?q.substr(1):q) + "&limit(1)" + f;
		 	// console.log("ID: ", this.id, " Facet Request Index: ", idx, " URL Length: ", url.length)

		 	// console.log("Facet Query: ", q)
			var fr =  xhr(this.apiServer + "/" + this.dataModel + "/", {
				method: "POST",
				handleAs: "json",
				data: q,
				"headers": {
					"accept": "application/solr+json",
	                "content-type": "application/rqlquery+x-www-form-urlencoded",
    	            'X-Requested-With': null,
        	        'Authorization': (window.App.authorizationToken || "")
        	    }
			})

			return fr.then(lang.hitch(this, function(response, res){
				// console.log("RESPONSE: ",response,  res, res.facet_counts)
				if (res && res.facet_counts && res.facet_counts.facet_fields){
					// console.log("Have Facet Fields: ", res.facet_counts.facet_fields);
					return parseFacetCounts(res.facet_counts.facet_fields)
				}
				// console.log("Missing Facet Data In Response.  Index: ", idx," Url: ", url, " Response: ", res);
				// console.log("Missing data for facet query: ", q)
				throw("Missing Facet Data In Response");
				return;
				
			}, function(err){
				console.log("XHR Error with Facet Request  " + idx +  ". There was an error retreiving facets from: ", url);
				return err;
			}))
		},
		startup: function(){
			if (this._started) { return; }
			this.inherited(arguments);
			this._started=true;
			this.set("facetFields",this.facetFields);
			//this.set("facets", this.facets);
			//this.set("selected", this.selected);
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
			        if( !("h" in mb) || !("w" in mb) ){

			                mb = lang.mixin(domGeometry.getMarginBox(node), mb);    // just use domGeometry.marginBox() to fill in missing values
			        }

			        if (this.smallContentNode){
				        var headerMB = domGeometry.getMarginBox(this.smallContentNode);
				        console.log("Header MB: ", headerMB);
				        this.minSize = Math.max(headerMB.h, this.absoluteMinSize);
				     }else{
				     	this.minSize = this.absoluteMinSize;
				     }

				     console.log("THIS RESIZE: ", this);
	     	        console.log("mb.h: ", mb.h, " MinSize: ", this.minSize);
			        if (mb.h && mb.h>this.minSize){
			        	domGeometry.setMarginBox(this.fullViewNode, {w: mb.w, h: mb.h-this.minSize})
			        }

			        if (mb.h<=Math.max(this.minSize, this.absoluteMinSize)){
			        	this.minimized=true;
			        }else{
			        	this.minimized=false;
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
			        	this._ffWidgets[name].resize({h: this._contentBox.h-4});	        	
			        },this);

			}

	});
});
