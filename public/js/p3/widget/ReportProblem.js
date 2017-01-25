define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/ReportProblem.html", "dijit/form/Form",
	"dojo/topic", "dojo/request", "dojo/when"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, FormMixin, Topic, request, when){
	return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
		"baseClass": "CreateWorkspace",
		templateString: Template,
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
				values.appVersion = window.App.appVersion;
				values.appLabel = window.App.appLabel || "";
				values.url = window.location.href;

				if(window.App.user && window.App.user.id){
					values.userId = window.App.user.id.replace("@patricbrc.org", "");
				}

				var formData = new FormData();
				Object.keys(values).forEach(function(key){
					formData.append(key,values[key]);
				});


				if (this.attachmentNode && this.attachmentNode.files && this.attachmentNode.files[0]){
					formData.append("attachment",this.attachmentNode.files[0]);
				}



				domClass.add(this.domNode, "Working");

				when(request.post("/reportProblem", {
					headers: {
						"Authorization": (window.App.authorizationToken || ""),
						"enctype": "multipart/form-data"
					},
					data: formData
				}), function(results){
					 on.emit(_self.domNode, "dialogAction", {action: "close", bubbles: true})
				}, function(err){
					console.log("Error Reporting Problem: ", err);
				});
			}else{
				console.log("Form is incomplete");
			}
		},

		onCancel: function(evt){
			// console.log("Cancel/Close Dialog", evt);
			on.emit(this.domNode, "dialogAction", {action: "close", bubbles: true});
		}
	});
});
