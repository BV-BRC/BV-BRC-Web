define([
	"dojo/_base/declare", "dojo/on","dojo/_base/Deferred","dijit/_Templated",
	"dojo/dom-class", "dojo/dom-construct", "dijit/_WidgetBase",
	"dojo/_base/xhr", "dojo/_base/lang", "dojo/dom-attr","dojo/query",
	"dojo/dom-geometry", "dojo/dom-style"
], function(declare, on, Deferred,Templated,
			domClass, domConstruct,WidgetBase,
			xhr, lang, domAttr,Query,
			domGeometry,domStyle) {

	return declare([WidgetBase,Templated], {
		templateString: '<div class="${baseClass}"><div class="facetCategory">${category}</div><div class="dataList" data-dojo-attach-point="containerNode"></div></div>',
		baseClass: "FacetFilter",
		category: "NAME",
		data: null,


		_setDataAttr: function(data){
			this.data = data;
			domConstruct.empty(this.containerNode);
			if (data.length<1){
				domClass.add(this.domNode, "dijitHidden");
			}else{
				domClass.remove(this.domNode, "dijitHidden");
			}
			data.forEach(function(obj){
				var l = (obj.label || obj.value) + ((typeof obj.count != 'undefined')?("&nbsp;(" + obj.count +")"):"");
				var n=domConstruct.create("div", {rel:(obj.label || obj.value), "class":"FacetValue", innerHTML: l});
				domConstruct.place(n,this.containerNode,"last")
			},this);
		},

		toggleItem: function(evt){
			var rel = domAttr.get(evt.target, "rel")
			console.log("onToggle: ", rel)
			domClass.toggle(evt.target, "selected");
			var selected = Query(".selected", this.containerNode).map(function(node){
				return domAttr.get(node,"rel");
			})
			// this.filter =  "in(" + this.category + ",(" + selected.join(",") + "))";
			if (selected.length<1){
				this.filter = ""
			}else if (selected.length==1){
				this.filter = "eq(" + this.category + "," + selected[0] + ")";
			}else{
				this.filter = "or(" + selected.map(function(s){ return "eq(" + this.category + "," + s + ")"},this).join(",") + ")";
			}

			this.selected = selected;

			on.emit(this.domNode,"UpdateFilterCategory", {category: this.category, filter: this.filter, selected: selected, bubbles: true, cancelable: true})
		},
		postCreate: function(){
			this.inherited(arguments);
			on(this.domNode, ".FacetValue:click", lang.hitch(this,"toggleItem"))

		}
	})
});