define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/CreateFolder.html", "dijit/form/Form",
	"dojo/topic", "../WorkspaceManager"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, FormMixin, Topic, WorkspaceManager){
	return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
		"baseClass": "CreateWorkspace",
		templateString: Template,
		path: "",
		_setPathAttr: function(p){
			if(p && p.charAt(-1) != "/"){
				this.path = p + "/";
			}else{
				this.path = p;
			}
		},
		validate: function(){
			var valid = this.inherited(arguments);
			if(valid){
				this.saveButton.set("disabled", false)
			}else{
				this.saveButton.set("disabled", true);
			}
			return valid;
		},

		onSubmit: function(evt){
			var _self = this;

			evt.preventDefault();
			evt.stopPropagation();

			if(this.validate()){
				var values = this.getValues();
				domClass.add(this.domNode, "Working");
				console.log("CREATING FOLDER: ", this.path + values.name, this.path);
				WorkspaceManager.createFolder(this.path + values.name).then(function(results){
					console.log("RESULTS", results)
					domClass.remove(_self.domNode, "Working");
					console.log("create_workspace_folder results", results);
					var path = "/" + ["workspace", results.path].join("/");
					Topic.publish("/refreshWorkspace", {});
					on.emit(_self.domNode, "dialogAction", {action: "close", navigate: path, bubbles: true});
				}, function(err){
					console.log("Error:", err);
					domClass.remove(_self.domNode, "Working");
					domClass.add(_self.domNode, "Error");
					_self.errorMessage.innerHTML = err;
				})
			}else{
				console.log("Form is incomplete");
			}
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt);
			on.emit(this.domNode, "dialogAction", {action: "close", bubbles: true});
		}
	});
});
