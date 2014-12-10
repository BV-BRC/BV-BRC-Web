require({cache:{
'url:p3/widget/app/templates/Annotation.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div style=\"width: 420px;margin:auto;margin-top: 10px;padding:10px;\">\n\t<div style=\"width:400px; margin:auto\" class=\"formFieldsContainer\">\n\t\t<div data-dojo-type=\"dijit/form/FilteringSelect\" name=\"files\" data-dojo-attach-point=\"workspaceName\" style=\"width:300px\" required=\"true\" data-dojo-props=\"\"></div>\n\t\t<div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"name\" data-dojo-attach-point=\"workspaceName\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'Scientific Name'\"></div>\n\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"geneticCode\" data-dojo-attach-point=\"workspaceName\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t<option value=\"11\">11</option>\n\t\t\t<option value=\"4\">4</option>\n\t\t</select>\n\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"domain\" data-dojo-attach-point=\"workspaceName\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t<option value=\"bacteria\">Bacteria</option>\n\t\t\t<option value=\"archaea\">Archaea</option>\n\t\t</select>\n\t\t<div data-dojo-type=\"dijit/form/FilteringSelect\" name=\"outputLocation\" data-dojo-attach-point=\"workspaceName\" style=\"width:300px\" required=\"true\" data-dojo-props=\"\"></div>\n\t\t\n\n\t</div >\n\t\t<div style=\"width:400px; margin:auto\" class=\"workingMessage\">\n\t\t\tCreating new workspace ...\n\t\t</div>\n\n\t\t<div style=\"width:400px; margin:auto\" class=\"errorMessage\">\n\t\t\t<div style=\"font-weight:900;font-size:1.1em;\">Error Creating Folder:</div>\n\t\t\t<p data-dojo-attach-point=\"errorMessage\">Error</p>\n\t\t</div>\n\t\t\n\t\t<div style=\"margin-top: 10px; text-align:center;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"saveButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Annotate Genome</div>\n\t\t</div>\t\n\t</div>\n</form>\n\n"}});
define("p3/widget/app/Annotation", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Annotation.html","dijit/form/Form"
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
