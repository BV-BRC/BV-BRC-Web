require({cache:{
'url:p3/widget/templates/SelectionToGroup.html':"<div class=\"SelectionToGroup\" style=\"width:400px;\">\n\t<div data-dojo-type=\"dijit/form/Select\" style=\"width: 95%;margin:10px;\">\n\t\t<option value=\"create\">New Group</option>\n\t\t<option value=\"create\">Existing Group</option>\n\t</div>\n\n\t<div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" style=\"width:95%;margin:10px;\">\n\t</div>\n\n\t<div class=\"buttonContainer\" style=\"text-align: right;\">\n\t\t<div data-dojo-type=\"dijit/form/Button\" label=\"Cancel\"></div>\n\t\t<div data-dojo-type=\"dijit/form/Button\" label=\"Split\"></div>\n\t\t<div data-dojo-type=\"dijit/form/Button\" label=\"Copy\"></div>\n\t</div>\n</div>\n"}});
define("p3/widget/SelectionToGroup", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/SelectionToGroup.html","dojo/_base/lang"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,lang
){
	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		"baseClass": "Panel",
		"disabled":false,
		templateString: Template,
		selection: null,
		startup: function(){
			var _self=this;
			//if (this._started) { return; }
			var currentIcon;
			this.watch("selection", lang.hitch(this,function(prop,oldVal,item){
				console.log("set selection(): ", arguments);
			}))
			this.inherited(arguments);
		}

	});
});
