define([
	"dojo/_base/declare", "./ContainerActionBar", "dojo/_base/lang",
	"dojo/dom-construct", "dojo/dom-geometry", "dojo/dom-style",
	"dijit/form/Textbox","./FacetFilter","dojo/request","dojo/on",
	"rql/parser","./FilteredValueButton"
], function(
	declare, ContainerActionBar,lang,
	domConstruct,domGeometry, domStyle,
	Textbox, FacetFilter,xhr,on,
	RQLParser,FilteredValueButton
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
		style: "height: 55px; margin-left:-1px; margin-right: 1px;overflow:hidden;",
		minSize: 55,
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

			this.smallContentNode = domConstruct.create("div", {"class": "smallContentNode", style: {height: "55px"}}, this.domNode);	
			// this.containerNode = domConstruct.create("span", {"class": "ActionButtonContainer"}, this.smallContentNode);		
			domConstruct.place(this.containerNode, this.smallContentNode, "first");

			this.fullViewNode = domConstruct.create("div", {"class": "FullFilterView", style: {"vertical-align": "top", margin:"0px", "margin-top":"5px",background: "#333"}}, this.domNode)
			var keywordSearchBox = domConstruct.create("div", {style: { "float": "left", "margin-left":"5px","padding-top": "10px"}}, this.smallContentNode)
			var ktop = domConstruct.create("div", {}, keywordSearchBox)
			var kbot = domConstruct.create("div", {style: {"margin-top": "4px", "font-size": ".75em", "color":"#34698e"},innerHTML: "KEYWORD FILTER"}, keywordSearchBox)
			this.keywordSearch = Textbox({style: "width: 300px;"})

			this.keywordSearch.on("change", lang.hitch(this, function(val){
				// console.log("Keyword Search Change", arguments)
				// console.log("this.keywordSearch.domNode", this.keywordSearch.domNode);
				on.emit(this.keywordSearch.domNode, "UpdateFilterCategory", {bubbles:true, cancelable: true, category: "keywords", value: encodeURIComponent(val)});
			}));
			domConstruct.place(this.keywordSearch.domNode, ktop, "last");


			// this.keywordSearch.startup();

			on(this.domNode, "UpdateFilterCategory", lang.hitch(this, function(evt){
					console.log("UpdateFilterCategory EVT: ", evt);

					if (evt.category == "keywords"){
						this._filterKeywords = evt.value;
					}else{
						this._filter[evt.category] = evt.filter;
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

					if (cats.length < 1){
						console.log("UpdateFilterCategory Set Filter to empty")
						if (this._filterKeywords){
							this.set('filter','keyword(' + this._filterKeywords + ')')
						}else{
							this.set('filter', "");
						}
					}else if (cats.length==1){
						console.log("UpdateFilterCategory  set filter to ", this._filter[cats[0]])
						if (this._filterKeywords){
							this.set("filter", "and("+ this._filter[cats[0]] + "," + this._filterKeywords + ")" )
						}
						this.set("filter", this._filter[cats[0]]);
					}else{
						console.log("UpdateFilterCategory set filter to ", "and(" + cats.map(function(c){ return this._filter[c] },this).join(",") +")")
						var inner = cats.map(function(c){ return this._filter[c] },this).join(",") 
						if (this._filterKeywords){
							this.set("filter", "and(" + inner + "," + this._filterKeywords + ")")
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
						console.log("Skipping Unused term: ", term.name, term.args);
				}
			}

			walk(parsed);

			// console.log("filter parsing completed, call setSelected from setFilter", filter, parsed, selected)

			//this.updateFacets(selected);

			this.set("selected", selected);
		},

		updateFacets: function(selected){
			// console.log("updateFacets(selected)", selected);

			this.set("selected", selected)
		},


		_setSelectedAttr: function(selected){
			console.log("FilterContainerActionBar setSelected: ", selected)
			if (!selected || (selected.length<1)){
				console.log("Clear selected");
				Object.keys(this._ffValueButtons).forEach(function(b){
					this._ffValueButtons[b].destroy();
					delete this._ffValueButtons[b];
				},this);
				//clear selected facets;
			}else{
				selected.forEach(function(sel){
					console.log("_setSelected FilterContaienrActionBar: ", selected)
					if (this._ffWidgets[sel.field]){
						console.log("toggle field: ", sel.value, " on ", sel.field);
						this._ffWidgets[sel.field].toggle(sel.value,true);	
					}

					console.log("Check for ValueButton: ", this._ffValueButtons[sel.field + ":" + sel.value])
					if (!this._ffValueButtons[sel.field + ":" + sel.value]){
						console.log("not found!")
						var ffv = this._ffValueButtons[sel.field + ":" + sel.value] = new FilteredValueButton({category: sel.field, value: sel.value});
						domConstruct.place(ffv.domNode,this.smallContentNode, "last")
					}


				},this)

				var msel = selected.map(function(sel){
					return sel.field + ":" + sel.value;
				},this)
				Object.keys(this._ffValueButtons).filter(function(b){
					if (msel.indexOf(b)>=0){
						return false;
					}
					return true;
				}).forEach(function(b){
					this._ffValueButtons[b].destroy();
					delete this._ffValueButtons[b];
				},this);
			}
		},
		_setFacetFieldsAttr: function(fields){
			this.facetFields = fields;
			if (!this._started){return;}

			fields.forEach(lang.hitch(this,function(f){
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
			domConstruct.place(f.domNode, this.fullViewNode,"last")
		},

		_setQueryAttr: function(query){
			this.query = query ;
			// console.log("FilterContainerActionBar Query: ", this.query);

			this.getFacets(this.query).then(lang.hitch(this, function(facets){
				// console.log("_setQuery got facets: ", facets)
				if (!facets) { console.log("No Facets Returned"); return; }

				Object.keys(facets).forEach(function(cat){
					// console.log("Facet Category: ", cat);
					if (this._ffWidgets[cat]){
						// console.log(" Set Facet Widget Data")
						this._ffWidgets[cat].set('data', facets[cat]);
					}else{
						console.log("Missing ffWidget for : ", cat);
					}
				},this);

			}));
		},

		getFacets: function(query){
			if (!this._facetReqIndex){
				this._facetReqIndex=0;
			}
			var idx = this._facetReqIndex+=1;
			var f = "&facet(" + this.facetFields.map(function(field){
				return "(field," + field + ")"
			}).join(",") + ",(mincount,1))";
			var q = query; // || "?keyword(*)"
			// console.log(idx, " dataModel: ", this.dataModel)
			// console.log(idx, " q: ", query);
			// console.log(idx, " Facets: ", f);

			var url = this.apiServer + "/" + this.dataModel + "/" + q + "&limit(1)" + f;

		 	// console.log("ID: ", this.id, " Facet Request Index: ", idx, " URL Length: ", url.length)

			return xhr.get(url, {
				handleAs: "json",
				"headers": {accept: "application/solr+json"}
			}).then(lang.hitch(this, function(response, res){
				console.log("RESPONSE: ", res)
				if (res && res.facet_counts && res.facet_counts.facet_fields){
					// console.log("Have Facet Fields: ", res.facet_counts.facet_fields);
					return parseFacetCounts(res.facet_counts.facet_fields)
				}
				// console.log("Missing Facet Data In Response.  Index: ", idx," Url: ", url, " Response: ", res);
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

			        if (mb.h && mb.h>this.minSize){
			        	domGeometry.setMarginBox(this.fullViewNode, {w: mb.w, h: mb.h-this.minSize})
			        	// this.enableFullView();
			        }

			        if (mb.h<=62){
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

			        // Query(".FacetFilter",this.containerNode).forEach(function(n){
			        // 	domGeometry.setMarginBox(n, {h: this._contentBox.h-4})
			        // },this)


			}

	});
});
