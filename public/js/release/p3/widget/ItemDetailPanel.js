require({cache:{
'url:p3/widget/templates/ItemDetailPanel.html':"<div class=\"ItemDetailPanel\">\n\t<div>\n\t\t<table class=\"ItemDetailHeaderTable\">\n\t\t\t<tbody>\n\t\t\t\t<tr>\n\t\t\t\t\t<td style=\"width:1%\"><i class=\"fa fa-1x\" data-dojo-attach-point=\"typeIcon\" ></i></td>\n\t\t\t\t\t<td>\n\t\t\t\t\t\t<div class=\"ItemDetailHeader\" data-dojo-type=\"dijit/InlineEditBox\" data-dojo-attach-point=\"nameWidget\" disabled=\"true\"></div>\n\t\t\t\t\t</td>\n\t\t\t\t</tr>\n\t\t\t</tbody>\n\t\t</table>\n\t</div>\n\t<div style=\"font-size:1em\">\n\t\t<div class=\"ItemDetailAttribute\">Type: <span class=\"ItemDetailAttributeValue\" data-dojo-attach-point=\"typeNode\"></div></span></br>\n\t\t<div class=\"ItemDetailAttribute\">Owner: <span class=\"ItemDetailAttributeValue\"  data-dojo-attach-point=\"owner_idNode\"></span></div></br>\n\t\t<div class=\"ItemDetailAttribute\">Created: <span class=\"ItemDetailAttributeValue\" data-dojo-attach-point=\"creation_timeNode\"></span></div></br>\n\t\t<div class=\"ItemDetailAttribute\">Path: <span class=\"ItemDetailAttributeValue\" data-dojo-attach-point=\"pathNode\"></span></div>\n\t\t<div style=\"display:none;\" data-dojo-attach-point=\"idNode\"></div>\n\t</div> \n\t<div data-dojo-attach-point=\"autoMeta\">\n\n\t</div>\n\t<table>\n\t\t<tbody data-dojo-attach-point=\"userMetadataTable\">\n\t\t</tbody>\n\t</table>\n</div>\n"}});
define("p3/widget/ItemDetailPanel", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/ItemDetailPanel.html","dojo/_base/lang","./formatter"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,lang,formatter
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
						domClass.add(_self.typeIcon,"fa fa-folder fa-2x")
						currentIcon="fa fa-folder fa-2x";
						break;
					//case "contigs": 
					//	domClass.add(_self.typeIcon,"fa icon-contigs fa-3x")
					//	currentIcon="fa fa-folder fa-3x";
					//	break;
					case "contigs": 
						domClass.add(_self.typeIcon,"fa icon-contigs fa-2x")
						currentIcon="fa fa-contigs fa-2x";
						break;
					case "fasta": 
						domClass.add(_self.typeIcon,"fa icon-fasta fa-2x")
						currentIcon="fa icon-fasta fa-2x";
						break;
					case "genome_group": 
						domClass.add(_self.typeIcon,"fa icon-genome_group fa-2x")
						currentIcon="fa icon-genome_group fa-2x";
						break;
					case "job_result":
						domClass.add(_self.typeIcon, "fa fa-flag-checkered fa-2x")
						currentIcon="fa icon-flag-checkered fa-2x";
						break;
					case "feature_group": 
						domClass.add(_self.typeIcon,"fa icon-genome-features fa-2x")
						currentIcon="fa icon-genome-features fa-2x";
						break;
	
					default: 
						domClass.add(_self.typeIcon,"fa fa-file fa-2x")
						currentIcon="fa fa-file fa-2x";
						break;
				}	
				Object.keys(item).forEach(function(key){
       	                		var val = item[key];
					if(key == "creation_time"){
						val=formatter.date(val);
					} 
					if (this.property_aliases[key] && _self[this.property_aliases[key] + "Node"]){
						_self[this.property_aliases[key] + "Node"].innerHTML=val;
					}else if (this.property_aliases[key] && _self[this.property_aliases[key] + "Widget"]){
						_self[this.property_aliases[key] + "Widget"].set("value",val);
					}else if (_self[key + "Node"]){
						_self[key+"Node"].innerHTML=val;
					}else if (_self[key +"Widget"]){
						_self[key+"Widget"].set("value",val);
					}else if (key == "autoMeta"){
						var curAuto = formatter.autoLabel("itemDetail", item.autoMeta);
						subRecord=[];
						Object.keys(curAuto).forEach(function(prop){
							if (!curAuto[prop] || prop=="inspection_started") { return; }
							if (curAuto[prop].hasOwnProperty("label") && curAuto[prop].hasOwnProperty("value")){
								subRecord.push('<div class="ItemDetailAttribute">'+curAuto[prop]["label"]+': <span class="ItemDetailAttributeValue">'+curAutoLabel[prop]["value"]+'</span></div></br>');
							}
							else if (curAuto[prop].hasOwnProperty("label")){
								subRecord.push('<div class="ItemDetailAttribute">'+curAuto[prop]["label"]+'</div></br>');
							}
						},this);
						_self["autoMeta"].innerHTML=subRecord.join("\n");
					//	Object.keys(val).forEach(function(aprop){
					//	},this);
					}
				},this);
			}))
			this.inherited(arguments);
		}

	});
});
