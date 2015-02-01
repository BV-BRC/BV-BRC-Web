define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/ItemDetailPanel.html"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template
){
	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		"baseClass": "ItemDetailPanel",
		"disabled":false,
		templateString: Template,
		item: null,
		startup: function(){
			var _self=this;
			//if (this._started) { return; }
			this.watch("item", function(prop,oldVal,item){
				console.log("ItemDetailPanel Set(): ", arguments);
				Object.keys(item).forEach(function(key){
       	                		var val = item[key]; 
					if (_self[key + "Node"]){
						_self[key+"Node"].innerHTML=val;
					}
				});
			})
			this.inherited(arguments);
		}

	});
});
