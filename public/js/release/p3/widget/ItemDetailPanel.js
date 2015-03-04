require({cache:{
'url:p3/widget/templates/ItemDetailPanel.html':"<div class=\"ItemDetailPanel\">\n\t<div>\n\t\t<table style=\"width:100%\">\n\t\t\t<tbody>\n\t\t\t\t<tr>\n\t\t\t\t\t<td style=\"width:1%\"><i class=\"fa fa-1x\" data-dojo-attach-point=\"typeIcon\" ></i></td>\n\t\t\t\t\t<td>\n\t\t\t\t\t\t<div style=\"font-size:1em;font-weight:900;\" data-dojo-type=\"dijit/InlineEditBox\" data-dojo-attach-point=\"nameWidget\" disabled=\"true\"></div>\n\t\t\t\t\t\t<span data-dojo-attach-point=\"typeNode\"></span> &middot; <span data-dojo-attach-point=\"owner_idNode\"></span>\n\t\t\t\t\t</td>\n\t\t\t\t</tr>\n\t\t\t</tbody>\n\t\t</table>\n\t</div>\n\t<div style=\"font-size:.85em\">\n\t\t<div data-dojo-attach-point=\"idNode\"></div>\n\t\t<div data-dojo-attach-point=\"pathNode\"></div>\n\t\t<div>Created <span data-dojo-attach-point=\"creation_timeNode\"></span></div>\n\t</div> \n\t<div data-dojo-attach-point=\"autoMeta\">\n\n\t</div>\n\t<table>\n\t\t<tbody data-dojo-attach-point=\"userMetadataTable\">\n\t\t</tbody>\n\t</table>\n</div>\n"}});
define("p3/widget/ItemDetailPanel", [
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
						domClass.add(_self.typeIcon,"fa icon-genome_group fa-3x")
						currentIcon="fa icon-genome_group fa-3x";
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
