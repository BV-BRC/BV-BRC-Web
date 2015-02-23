require({cache:{
'url:p3/widget/templates/WorkspaceFilenameValidationTextBox.html':"<div style=\"padding:0px;\">\n\t<input type=\"hidden\"/>\n\t<input type=\"text\" data-dojo-attach-point=\"textBox\" data-dojo-type=\"dijit/form/ValidationTextBox\" data-dojo-attach-event=\"onChange:onTextBoxChange\" data-dojo-props=\"promptMessage: '${promptMessage}', missingMessage: '${missingMessage}', searchAttr: 'name'\"  value=\"${value}\" style=\"width:90%\"/>&nbsp;<i style=\"color:green;\" class=\"fa fa-check fa-1x\" />\n</div>\n"}});
define("p3/widget/WorkspaceFilenameValidationTextBox", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on","dojo/_base/lang",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/WorkspaceFilenameValidationTextBox.html",
	"./FlippableDialog","dijit/_HasDropDown","dijit/layout/ContentPane","dijit/form/TextBox",
	"./WorkspaceExplorerView","dojo/dom-construct","../WorkspaceManager","dojo/store/Memory",
	"./Uploader", "dijit/layout/BorderContainer","dojo/dom-attr",
	"dijit/form/Button","dojo/_base/Deferred","dijit/form/CheckBox","dijit/form/ValidationTextBox"

], function(
	declare, WidgetBase, on,lang,
	domClass,Templated,WidgetsInTemplate,
	Template,Dialog,HasDropDown,ContentPane,TextBox,
	Grid,domConstr,WorkspaceManager,Memory,
	Uploader, BorderContainer,domAttr,
	Button,Deferred,CheckBox,ValidationTextBox
){


	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		"baseClass": "WorkspaceObjectSelector",
		"disabled":false,
		templateString: Template,
		workspace: "",
		selection: "",
		value: "",
		path: "",
		disabled: false,
		required: false,
		showUnspecified: false,
		promptMessage:"",
		missingMessage: "A valid workspace item is required.",
		promptMessage: "Please choose or upload a workspace item",
		reset: function(){
			this.textBox.set('value','');
		},

		_setDisabledAttr: function(val){
			this.disabled=val;
			if (val) {
				domClass.add(this.domNode,"disabled");
			}else{
				domClass.remove(this.domNode,"disabled");
			}

			if (this.textBox){
				this.textBox.set("disabled",val);
			}
		},
		_setRequiredAttr: function(val){
			this.required=val;
			if (this.textBox){
				this.textBox.set("required",val);
			}
		},
	
		_setPathAttr: function(val){
			console.log("_setPathAttr: ", val);
			this.path=val;
		},	
	
		_setValueAttr: function(value,refresh){
			this.value = value;
			if (this._started) {
				if (refresh) {
					this.refreshWorkspaceItems()
				}else{
					this.textBox.set('value', value);
				}
			}
		},

		_getValueAttr: function(value){
			return this.textBox.get('value', value);
		},

		postMixinProperties: function(){
			if (!this.value && this.workspace){
				this.value=this.workspace;
			}
			this.inherited(arguments);
		},

		onTextBoxChange: function(value){
			this.set("value", value);	
		},
		startup: function(){
			if (this._started){return;}
			console.log("call getObjectsByType(); ", this.type);
			this.inherited(arguments);	
			this.textBox.set('disabled', this.disabled);
			this.textBox.set('required', this.required);
		}
	});
});
