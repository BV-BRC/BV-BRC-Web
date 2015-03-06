define([
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
