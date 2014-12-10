define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/CreateFolder.html","dijit/form/Form"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,FormMixin
){
	return declare([WidgetBase,FormMixin,Templated,WidgetsInTemplate], {
		"baseClass": "CreateWorkspace",
		templateString: Template,
		path: "",
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
				domClass.add(this.domNode,"Working");
				window.App.api.workspace("Workspace.create_workspace_directory",[{directory:this.path + "/" + values.name}]).then(function(results){
					console.log("RESULTS", results)
					domClass.remove(_self.domNode, "Working");
					console.log("create_workspace_folder results", results)
					var path = "/" + ["workspace", results[0][5],results[0][8],results[0][1]].join("/")
					on.emit(_self.domNode, "dialogAction", {action: "close", navigate: path, bubbles:true});
				}, function(err){
					console.log("Error:", err)
					domClass.remove(_self.domNode,"Working");
					domClass.add(_self.domNode, "Error");
					_self.errorMessage.innerHTML = err;
				})
			}else{
				console.log("Form is incomplete");
			}

			evt.preventDefault();
			evt.stopPropagation();
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
			on.emit(this.domNode, "dialogAction", {action:"close",bubbles:true});
		}
	});
});
