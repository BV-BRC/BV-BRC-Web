require({cache:{
'url:p3/widget/templates/ItemDetailPanel.html':"<div style=\"ItemDetailPanel\">\n\t<div style=\"min-height:120px\">\n\t\t<div class=\"TypeContainer\">\n\t\t\t<img class=\"ItemTypeIcon\" data-dojo-attach-point=\"typeIcon\" />\n\t\t\t<div data-dojo-attach-point=\"typeNode\"></div>\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"nameNode\"></div>\n\t\t<div  data-dojo-attach-point=\"owner_idNode\"></div>\n\t</div>\n\n\t<h3>Metadata</h3>\n\n\t<table>\n\t\t<tbody data-dojo-attach-point=\"metadataTable\">\n\t\t\t<tr><td>ID</td><td data-dojo-attach-point=\"idNode\"></td></tr>\n\t\t\t<tr><td>Path</td><td data-dojo-attach-point=\"pathNode\"></td></tr>\n\t\t\t<tr><td>Creation Date</td><td data-dojo-attach-point=\"creation_timeNode\"></td></tr>\n\t\t\t<tr><td>Permissions</td><td>User: <span data-dojo-attach-point=\"user_permissionNode\"></span>&nbsp;Global: <span data-dojo-attach-point=\"global_permissionNode\"></span></td></tr>\n\t\t</tbody>\n\t</table>\n\t<h3>User Metadata</h3>\n\t<table>\n\t\t<tbody data-dojo-attach-point=\"userMetadataTable\">\n\t\t</tbody>\n\t</table>\n</div>\n"}});
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
		"baseClass": "WorkspaceGlobalController",
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
