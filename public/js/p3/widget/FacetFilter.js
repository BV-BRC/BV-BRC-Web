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
		templateString: '<div class="${baseClass}"><div data-dojo-attach-point="categoryNode" class="facetCategory">${category}</div><div style="overflow: auto" class="dataList" data-dojo-attach-point="containerNode"></div></div>',
		baseClass: "FacetFilter",
		category: "NAME",
		data: null,
		selected: null,

		constructor: function(){
			this._selected = {};
		},
		_setDataAttr: function(data, selected){

			// console.log("_setData: ", data, "internal selected: ", this.selected, " Supplied Selection: ", selected);			
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
				var sel;
				if (
						this._selected[obj.label||obj.value] ||
						(this.selected.indexOf(obj.label || obj.value) >= 0)
					){
					sel = "selected"
				}else{
					sel="";
				}
				// console.log("Obj: ", obj.label || obj.value, " Selected: ", sel);
				//var sel = ((this.selected.indexOf(obj.label || obj.value) >= 0)||(this._selected[obj.label||obj.value]))?"selected":"";
				var n= this["_value_" + (obj.label || obj.value)] = domConstruct.create("div", {rel:(obj.label || obj.value), "class":"FacetValue "+sel, innerHTML: l});
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
				// console.log("Toggle Node: ", node, " Set to: ", value?"TRUE":"Opposite", domClass.contains(node, "Selected"));
				if (node){
					// console.log("    Found Node")
					if (value==true){
						domClass.add(node, "selected")
						if (this.selected.indexOf(name)<0){
							this.selected.push(name);
							this._set("selected", this.selected);
						}
					}else if (typeof value == "undefined"){
						// console.log("toggle selection: ", name, this.selected[name]);
						domClass.toggle(node, "selected");
						this._set("selected", this.selected.filter(function(i){ return i!=name; }));

						// console.log("After: ", domClass.contains(node, "selected"), this.selected[name]);
					}else{
						// console.log("Remove Selection: ", name, this.selected[name]);
						domClass.remove(node, "selected");
					}
				}
				// console.log(name, " this.selected: ", this.selected)
			}))
			// this._refreshFilter();
		},

		_refreshFilter: function(){
			var selected = [];

			Query(".selected", this.containerNode).forEach(function(node){
				selected.push(domAttr.get(node,"rel"));
			})
			// console.log("_refreshFilter selected() : ", selected);
			var curFilter = this.filter;
			// this.filter =  "in(" + this.category + ",(" + selected.join(",") + "))";
			if (selected.length<1){
				this.filter = ""
			}else if (selected.length==1){
				this.filter = "eq(" + this.category + "," + encodeURIComponent(selected[0]) + ")";
			}else{
				this.filter = "or(" + selected.map(function(s){ return "eq(" + this.category + "," + encodeURIComponent(s) + ")"},this).join(",") + ")";
			}

			if (selected.length > 0){
				domClass.add(this.categoryNode, "selected");
			}else{
				domClass.remove(this.categoryNode, "selected")
			}

			this._set("selected", selected);

			// console.log("selected: ", selected)

			if (this.filter != curFilter){
				on.emit(this.domNode,"UpdateFilterCategory", {category: this.category, filter: this.filter, selected: selected, bubbles: true, cancelable: true})
			}
		},

		toggleItem: function(evt){
			var rel = domAttr.get(evt.target, "rel")
			// console.log("onToggle: ", rel)
			domClass.toggle(evt.target, "selected");
			this._refreshFilter();
		},

		postCreate: function(){
			this.inherited(arguments);
			on(this.domNode, ".FacetValue:click", lang.hitch(this,"toggleItem"))
			if (!this.data){ this.data = new Deferred();}
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

	        var hmb = domGeometry.getMarginBox(this.categoryNode);
	     
	     	domGeometry.setMarginBox(this.containerNode, {h: this._contentBox.h - hmb.h-60})

		}
	})
});