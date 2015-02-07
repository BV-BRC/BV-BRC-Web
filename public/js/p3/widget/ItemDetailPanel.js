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
			var currentIcon;
			this.watch("item", function(prop,oldVal,item){
				console.log("ItemDetailPanel Set(): ", arguments);
				domClass.remove(_self.typeIcon,currentIcon)
				switch(item.type){
					case "folder": 
						domClass.add(_self.typeIcon,"fa fa-folder fa-3x")
						currentIcon="fa fa-folder fa-3x";
						break;
					//case "contigs": 
					//	domClass.add(_self.typeIcon,"fa icon-contigs fa-3x")
					//	currentIcon="fa fa-folder fa-3x";
					//	break;
					case "contigs": 
					case "fasta": 
						domClass.add(_self.typeIcon,"fa icon-fasta fa-3x")
						currentIcon="fa fa-folder fa-3x";
						break;
	
					default: 
						domClass.add(_self.typeIcon,"fa fa-file fa-3x")
						currentIcon="fa fa-file fa-3x";
						break;
				}	
				Object.keys(item).forEach(function(key){
       	                		var val = item[key]; 
					if (_self[key + "Node"]){
						_self[key+"Node"].innerHTML=val;
					}else if (_self[key +"Widget"]){
						_self[key+"Widget"].set("value",val);
					}
				});
			})
			this.inherited(arguments);
		}

	});
});
