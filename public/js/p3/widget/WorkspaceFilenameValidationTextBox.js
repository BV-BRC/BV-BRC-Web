define([
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
		nameIsValid: false,
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

			if (this.value) {
				this.checkForName(val);
			}
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

		checkForName: function(val){
			if (!this.path) { return; }
			this.externalCheck="checking";
			this.externalCheckValue = val;
			return Deferred.when(WorkspaceManager.getObject(this.path+"/"+val),lang.hitch(this,function(obj){
				if (obj) {
					console.log("Found Existing Object",obj);
					this.externalCheck="exists";
					this.textBox.set('invalidMessage',"A file with this name already exists in " + this.path);
					this.textBox.validate();
				}else{
					this.externalCheck="empty";
				}
//				this.textBox.displayMessage();
			}), lang.hitch(this, function(err){
				console.log("FileNot Found...good");
				this.externalCheck="empty";
			}));
		},

		validator: function(val,constraints){
			var valid = false;				
			var re=/(\(|\)|\/|\:)/g
			var match = val.match(re);
			if (val.match(re)){
				this.textBox.set('invalidMessage',"This name contains invalid characters: '" + match[0]+"'")
				return false;
			}
			console.log("ExternalCheck: ", this.externalCheck);
			console.log("Val: ", val, "ExternalCheckVal: ", this.externalCheckValue)
			if (this.externalCheckValue && val==this.externalCheckValue){
				if (this.externalCheck=="exists") { return false; }
				return true;
			}else if (val) {
				this.checkForName(val);
			}

			return true;
		},

		onTextBoxChange: function(value){
			this.set("value", value);	
		},
		startup: function(){
			if (this._started){return;}
			console.log("call getObjectsByType(); ", this.type);
			this.textBox.validator = lang.hitch(this, "validator");
			this.inherited(arguments);	
			this.textBox.set('disabled', this.disabled);
			this.textBox.set('required', this.required);
		}
	});
});
