require({cache:{
'url:p3/widget/templates/ItemDetailPanel.html':"<div class=\"ItemDetailPanel\">\n\t<div>\n\t\t<table style=\"width:100%\">\n\t\t\t<tbody>\n\t\t\t\t<tr>\n\t\t\t\t\t<td style=\"width:1%\"><i class=\"fa fa-1x\" data-dojo-attach-point=\"typeIcon\" ></i></td>\n\t\t\t\t\t<td>\n\t\t\t\t\t\t<div style=\"font-size:1.2em;font-weight:900;\" data-dojo-type=\"dijit/InlineEditBox\" data-dojo-attach-point=\"nameWidget\"></div>\n\t\t\t\t\t\t<span data-dojo-attach-point=\"typeNode\"></span> &middot; <span data-dojo-attach-point=\"owner_idNode\"></span>\n\t\t\t\t\t</td>\n\t\t\t\t</tr>\n\t\t\t</tbody>\n\t\t</table>\n\t</div>\n\t<div style=\"font-size:.85em\">\n\t\t<div data-dojo-attach-point=\"idNode\"></div>\n\t\t<div data-dojo-attach-point=\"pathNode\"></div>\n\t\t<div>Created <span data-dojo-attach-point=\"creation_timeNode\"></span></div>\n\t</div> \n\n\t<table>\n\t\t<tbody data-dojo-attach-point=\"userMetadataTable\">\n\t\t</tbody>\n\t</table>\n</div>\n"}});
define("p3/widget/ItemDetailPanel", [
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
