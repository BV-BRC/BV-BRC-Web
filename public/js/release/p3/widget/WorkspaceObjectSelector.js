require({cache:{
'url:p3/widget/templates/WorkspaceObjectSelector.html':"<div style=\"padding:0px;\">\n\t<input type=\"hidden\"/>\n\t<input type=\"text\" data-dojo-attach-point=\"searchBox\" data-dojo-type=\"dijit/form/TextBox\" data-dojo-attach-event=\"onChange:onSearchChange\" data-dojo-props=\"intermediateChanges:true\"  value=\"${value}\" style=\"width:85%\"/>&nbsp;<i data-dojo-attach-event=\"click:openChooser\" class=\"fa fa-folder-open fa-1x\" />\n</div>\n"}});
define("p3/widget/WorkspaceObjectSelector", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/WorkspaceObjectSelector.html",
	"dijit/Dialog","dijit/_HasDropDown","dijit/layout/ContentPane","dijit/form/TextBox",
	"./WorkspaceExplorerView","dojo/dom-construct"

], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,Dialog,HasDropDown,ContentPane,TextBox,
	Grid,domConstr
){

	var dropDown = new ContentPane({content: "Workspace Search", style:"background:#fff;"});

	return declare([WidgetBase,Templated,WidgetsInTemplate,HasDropDown], {
		"baseClass": "WorkspaceObjectSelector",
		"disabled":false,
		templateString: Template,
		dropDown: dropDown,
		workspace: "",
		value: "",
		_setValueAttr: function(value){
			this.value = value;
			if (this._started) {
				this.searchBox.set('value', value);
			}
		},
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
				this.dialog = new Dialog({title:"Workspace Explorer"});
				var gnode = domConstr.create("div", {style: {width: "500px",height:"400px"}},this.dialog.containerNode,"last");
				var grid = new Grid({style:"width:300px;height:400px;"},gnode);
				
				var _self=this;
				/*
				on(this.dialog.domNode, "click", function(evt){
					console.log(evt);
					domClass.toggle(_self.dialog.domNode,"flipped");
				});*/
			}
			this.dialog.show();
		},
		onSearchChange: function(val){
			dropDown.set("content","Searching for '"+val+"' in '" + this.workspace + "'")
			console.log(arguments)			
		},

		startup: function(){
			if (this._started){return;}
			if (!this.value || !this.workspace){

			}
			if (this.value) {	
				this.searchBox.set('value', this.value);
			}	
		}
	});
});
