define([
	"dojo/_base/declare", "dojo/on","dojo/_base/Deferred",
	"dojo/dom-class", "dojo/dom-construct", "dijit/_WidgetBase",
	"dojo/_base/xhr", "dojo/_base/lang", "dojo/dom-attr","dojo/query"
], function(declare, on, Deferred,
			domClass, domConstruct,WidgetBase,
			xhr, lang, domAttr,query) {

	return declare([WidgetBase], {
			facets: null,
			filter: "",

			postCreate: function(){
				this._filter={};

				this.inherited(arguments);
				this._table = domConstruct.create('table',{},this.domNode)
				this.table = domConstruct.create('tbody',{},this._table)
				on(this.domNode, "TD:click", lang.hitch(this,function(evt){
					var rel = domAttr.get(evt.target, "rel");
					var parts = rel.split(":");
					var selected = [];
					//selected.push(rel);
					//var foundExisting=false;
					domClass.toggle(evt.target, "FacetSelection");

					query("TD.FacetSelection", this.table).forEach(function(node){
						var selRel = domAttr.get(node,"rel");
						selected.push(selRel)
					})
					console.log("selected: ", selected)
					var f = this.selectedToFilter(selected);
					this.set("filter", f);
				}));
			},
			selectedToFilter: function(selected){
				var f={}
				selected.forEach(function(sel){
					var parts = sel.split(":");
					var field = parts[0];
					var val = parts[1];
					if (!f[field]){
						f[field]=[val];
					}else{
						var exists = f[field].indexOf(val)
						if (exists<0){
							f[field].push(val);
						}
					}
				},this)
				console.log("F: ", f)
				
				var out=[];
				var fields = Object.keys(f)
			
				fields.forEach(function(field){
					var data = f[field];
					if (data.length==1){
						out.push("eq("+field +"," + data[0] + ")");
					}else{
						var ored=[];
					
						data.forEach(function(d){
							ored.push("eq(" + field + "," + d + ")");
						})

						out.push("or(" + ored.join(",") + ")");
					}

				},this)


				if (fields.length>1){
					out = "and(" + out.join(",") + ")";
				}else{
					out = out.join("");
				}
				return out;
				console.log("FILTER: ", out)
			},
			selected: null,
			_setSelectedAttr: function(selected){
				console.log("set selected: ", selected);
				this.selected = selected;
				if (!this._started){ return; }
				query("TD").forEach(function(node){
					var rel = domAttr.get(node, "rel");
					if (rel && this.selected && this.selected.indexOf(rel)>=0){
						domClass.add(node, "FacetSelection");
					}else{
						domClass.remove(node, "FacetSelection")
					}
				},this)
			},

			clearFilters: function(){
					query("TD.FacetSelection").forEach(function(node){
						domClass.toggle(node, "FacetSelection");
					})
			},

			toggleInFilter: function(field, value){
				console.log("toggleInFilter: ", this._filter);
				if (!this._filter[field]){
					this._filter[field] = [value]
				}else{
					var exists = this._filter[field].indexOf(value)
					
					if (exists>-1){
						this._filter[field] = this._filter[field].splice(exists,1);
						if (this._filter[field] && (this._filter[field].length<1)){
							delete this._filter[field];
						}
					}else{
						this._filter[field].push(value);
					}
				}


				var out=[];
				var fields = Object.keys(this._filter)
			
				fields.forEach(function(field){
					var data = this._filter[field];
					if (data.length==1){
						out.push("eq("+field +"," + data[0] + ")");
					}else{
						var ored=[];
					
						data.forEach(function(d){
							ored.push("eq(" + field + "," + d + ")");
						})

						out.push("or(" + ored.join(",") + ")");
					}

				},this)


				if (fields.length>1){
					out = "and(" + out.join(",") + ")";
				}else{
					out = out.join("");
				}

				this._set("filter", out);
			},

			_setFacetsAttr: function(facets){
				this.facets = facets;


				if (!this._started){ return; }

				domConstruct.empty(this.table);

				Object.keys(this.facets).sort().forEach(function(category){
					var catTR = domConstruct.create("tr",{}, this.table);

					domConstruct.create("th", {style: {background: "inherit", "font-size": "1.3em", "padding-left": "4px","padding-top":"10px", color:"#fff","border-top": "0px", "border-bottom": "1px solid #efefef"}, innerHTML: category},catTR)

					this.facets[category].forEach(function(facet){
							var tr = domConstruct.create("tr", {}, this.table);
							var label = facet.label;

							if (typeof facet.count != 'undefined'){
								label = label + " (" + facet.count + ")";
							}

							domConstruct.create("td",{style: {"padding-left": "10px"}, rel: category + ":" + (facet.value||facet.label), innerHTML: label},tr)
					},this)

				},this)
			},

			startup: function(){
				if (this._started) { return; }
				this.inherited(arguments);
				this._started=true;
				this.set("facets", this.facets);
				this.set("selected", this.selected);
			},

			resize: function(){}
	})
});