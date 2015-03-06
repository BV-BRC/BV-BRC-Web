require({cache:{
'url:p3/widget/templates/SelectionToGroup.html':"<div class=\"SelectionToGroup\" style=\"width:400px;\">\n\t<div data-dojo-type=\"dijit/form/Select\" style=\"width: 95%;margin:10px;\" data-dojo-attach-event=\"onChange:onChangeTarget\">\n\t\t<option value=\"create\">New Group</option>\n\t\t<option value=\"create\" selected=\"true\">Existing Group</option>\n\t</div>\n\n\t<div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" style=\"width:95%;margin:10px;\" class='dijitHidden'>\n\t</div>\n\n\t<div data-dojo-attach-point=\"workspaceObjectSelector\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" style=\"width:95%;margin:10px;\" data-dojo-props=\"types:['genome_group']\" class=''>\n\t</div>\n\n\n\n\t<div class=\"buttonContainer\" style=\"text-align: right;\">\n\t\t<div data-dojo-type=\"dijit/form/Button\" label=\"Cancel\"></div>\n\t\t<div data-dojo-type=\"dijit/form/Button\" label=\"Split\" disabled='true'></div>\n\t\t<div data-dojo-type=\"dijit/form/Button\" disabled='true' label=\"Copy\"></div>\n\t</div>\n</div>\n"}});
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
		path:null,
		type: "genome_group",
		_setTypeAttr: function(t){
			this.type=t;
			if (this.workspaceObjectSelecto) {
				this.workspaceObjectSelector.set("type", [t]);
			}
		},
		onChangeTarget: function(target){
			console.log("Target: ", target);
		},
		startup: function(){
			var _self=this;
			if (this._started) { return; }
			var currentIcon;
			this.watch("selection", lang.hitch(this,function(prop,oldVal,item){
				console.log("set selection(): ", arguments);
			}))
			this.inherited(arguments);

			this.workspaceObjectSelector.set('type', [this.type]);
		}

	});
});
