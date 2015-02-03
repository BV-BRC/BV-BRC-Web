define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/WorkspaceObjectSelector.html",
	"dijit/Dialog","dijit/_HasDropDown","dijit/layout/ContentPane","dijit/form/TextBox"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,Dialog,HasDropDown,ContentPane,TextBox
){

	var dropDown = new ContentPane({content: "Workspace Search", style:"background:#fff;"});

	return declare([WidgetBase,Templated,WidgetsInTemplate,HasDropDown], {
		"baseClass": "WorkspaceObjectSelector",
		"disabled":false,
		templateString: Template,
		dropDown: dropDown,
		workspace: "",
		value: "",
		postMixinProperties: function(){
			if (!this.value && this.workspace){
				this.value=this.workspace;
			}
			this.inherited(arguments);
		},
		postCreate: function(){
			this.inherited(arguments);
		},
		openChooser: function(){
			if (!this.dialog){
				this.dialog = new Dialog({title:"Workspace Explorer", content: "<div style='width:300px;height:400px'>WS Browser</div>"});
				var _self=this;
				on(this.dialog.domNode, "click", function(evt){
					console.log(evt);
					domClass.toggle(_self.dialog.domNode,"flipped");
				});
			}
			this.dialog.show();
		},
		onSearchChange: function(val){
			dropDown.set("content","Searching for '"+val+"' in '" + this.workspace + "'")
			console.log(arguments)			
		}
	});
});
