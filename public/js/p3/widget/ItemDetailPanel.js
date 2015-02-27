define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/ItemDetailPanel.html","dojo/_base/lang"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,lang
){
	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		"baseClass": "ItemDetailPanel",
		"disabled":false,
		templateString: Template,
		item: null,
		property_aliases: {
			document_type: "type",
			"organism_name": "name"
		},
		startup: function(){
			var _self=this;
			//if (this._started) { return; }
			var currentIcon;
			this.watch("item", lang.hitch(this,function(prop,oldVal,item){
				console.log("ItemDetailPanel Set(): ", arguments);
				domClass.remove(_self.typeIcon,currentIcon)
				var t = item.document_type || item.type;
				switch(t){
					case "folder": 
						domClass.add(_self.typeIcon,"fa fa-folder fa-3x")
						currentIcon="fa fa-folder fa-3x";
						break;
					//case "contigs": 
					//	domClass.add(_self.typeIcon,"fa icon-contigs fa-3x")
					//	currentIcon="fa fa-folder fa-3x";
					//	break;
					case "contigs": 
						domClass.add(_self.typeIcon,"fa icon-contigs fa-3x")
						currentIcon="fa fa-contigs fa-3x";
						break;
					case "fasta": 
						domClass.add(_self.typeIcon,"fa icon-fasta fa-3x")
						currentIcon="fa icon-fasta fa-3x";
						break;
					case "genome_group": 
						domClass.add(_self.typeIcon,"fa icon-genome fa-3x")
						currentIcon="fa icon-genome fa-3x";
						break;
					case "feature_group": 
						domClass.add(_self.typeIcon,"fa icon-genome-features fa-3x")
						currentIcon="fa icon-genome-features fa-3x";
						break;
	
					default: 
						domClass.add(_self.typeIcon,"fa fa-file fa-3x")
						currentIcon="fa fa-file fa-3x";
						break;
				}	
				Object.keys(item).forEach(function(key){
       	                		var val = item[key]; 
					if (this.property_aliases[key] && _self[this.property_aliases[key] + "Node"]){
						_self[this.property_aliases[key] + "Node"].innerHTML=val;
					}else if (this.property_aliases[key] && _self[this.property_aliases[key] + "Widget"]){
						_self[this.property_aliases[key] + "Widget"].set("value",val);
					}else if (_self[key + "Node"]){
						_self[key+"Node"].innerHTML=val;
					}else if (_self[key +"Widget"]){
						_self[key+"Widget"].set("value",val);
					}else if (key == "autoMeta"){
						_self["autoMeta"].innerHTML="<pre>" +JSON.stringify(val,null,4) +"</pre>"	
					//	Object.keys(val).forEach(function(aprop){
					//	},this);
					}
				},this);
			}))
			this.inherited(arguments);
		}

	});
});
