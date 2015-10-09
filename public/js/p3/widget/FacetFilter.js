define([
	"dojo/_base/declare", "dojo/on","dojo/_base/Deferred","dijit/_Templated",
	"dojo/dom-class", "dojo/dom-construct", "dijit/_WidgetBase",
	"dojo/_base/xhr", "dojo/_base/lang", "dojo/dom-attr","dojo/query",
	"dojo/dom-geometry", "dojo/dom-style","dojo/when"
], function(declare, on, Deferred,Templated,
			domClass, domConstruct,WidgetBase,
			xhr, lang, domAttr,Query,
			domGeometry,domStyle, when) {

	return declare([WidgetBase,Templated], {
		templateString: '<div class="${baseClass}"><div data-dojo-attach-point="categoryNode" class="facetCategory">${category}</div><div class="dataList" data-dojo-attach-point="containerNode"></div></div>',
		baseClass: "FacetFilter",
		category: "NAME",
		data: null,
		selected: null,

		_setDataAttr: function(data){
			if (!data){return}
			if (this.data && this.data instanceof Deferred){
				var promise = this.data;
			}

			this.data = data;
			domConstruct.empty(this.containerNode);
			if (data.length<1){
				domClass.add(this.domNode, "dijitHidden");
			}else{
				domClass.remove(this.domNode, "dijitHidden");
			}
			data.forEach(function(obj){
				var l = (obj.label || obj.value) + ((typeof obj.count != 'undefined')?("&nbsp;(" + obj.count +")"):"");
				var sel = (this.selected.indexOf(obj.label || obj.value) >= 0)?"selected":"";
				var n= this["_value_" + (obj.label || obj.value)] = domConstruct.create("div", {"class": sel, rel:(obj.label || obj.value), "class":"FacetValue", innerHTML: l});
				// console.log("*** Created Value Reference: ", "_value_" + (obj.label || obj.value), n)
				domConstruct.place(n,this.containerNode,"last")
			},this);
			if (promise){
				promise.resolve(true);
			}
		},

		toggle: function(name,value){
			// console.log("Toggle: ", name, value, " Data:", this.data);
			when(this.data, lang.hitch(this,function(){
				var node = this["_value_" + name];
				console.log("Toggle Node: ", node, " Set to: ", value?"TRUE":"Opposite");
				if (node){
					console.log("    Found Node")
					if (value==true){
						domClass.add(node, "selected")
					}else if (typeof value == "undefined"){
						domClass.toggle("selected");
					}else{
						domClass.remove(node, "selected");
					}
				}
			}))
			// this._refreshFilter();
		},

		_refreshFilter: function(){
			var selected = Query(".selected", this.containerNode).map(function(node){
				return domAttr.get(node,"rel");
			})
			var curFilter = this.filter;
			// this.filter =  "in(" + this.category + ",(" + selected.join(",") + "))";
			if (selected.length<1){
				this.filter = ""
			}else if (selected.length==1){
				this.filter = "eq(" + this.category + "," + encodeURIComponent(selected[0]) + ")";
			}else{
				this.filter = "or(" + selected.map(function(s){ return "eq(" + this.category + "," + encodeURIComponent(s) + ")"},this).join(",") + ")";
			}

			this.selected = selected;
			if (selected.length > 0){
				domClass.add(this.categoryNode, "selected");
			}else{
				domClass.remove(this.categoryNode, "selected")
			}

			if (this.filter != curFilter){
				on.emit(this.domNode,"UpdateFilterCategory", {category: this.category, filter: this.filter, selected: selected, bubbles: true, cancelable: true})
			}
		},

		toggleItem: function(evt){
			var rel = domAttr.get(evt.target, "rel")
			console.log("onToggle: ", rel)
			domClass.toggle(evt.target, "selected");
			this._refreshFilter();
		},

		postCreate: function(){
			this.inherited(arguments);
			on(this.domNode, ".FacetValue:click", lang.hitch(this,"toggleItem"))
			if (!this.data){ this.data = new Deferred();}
		}
	})
});