define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/CreateWorkspace.html","dijit/form/Form"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,FormMixin
){
	return declare([WidgetBase,FormMixin,Templated,WidgetsInTemplate], {
		"baseClass": "CreateWorkspace",
		templateString: Template,

		validate: function(){
			console.log("this.validate()",this);
			var valid = this.inherited(arguments);
			if (valid){
				this.saveButton.set("disabled", false)
			}else{
				this.saveButton.set("disabled",true);
			}
			return valid;
		},

		onSubmit: function(evt){
			var _self = this;
			if (this.validate()){
				var values = this.getValues();
				console.log("Submission Values", values);
				window.App.api.workspace("Workspace.create_workspace",[{workspace:values.name}]).then(function(results){
					console.log("create_workspace results", results)
					var workspace = results[0][1];
					var path = "/" + ["workspace", results[0][2],results[0][1]].join("/")
					on.emit(_self.domNode, "dialogAction", {action: "close", navigate: path, bubbles:true});
				})
			}else{
				console.log("Form is incomplete");
			}

			evt.preventDefault();
			evt.stopPropagation();
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
            this.emit("dialogAction", {action:"close",bubbles:true});
		}
	});
});
