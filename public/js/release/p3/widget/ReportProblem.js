require({cache:{
'url:p3/widget/templates/ReportProblem.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\" encType=\"multipart/form-data\" name=\"problemForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\t<div >\n\t\t<div class=\"HideWithAuth\">\n\t\t\t<div data-dojo-type=\"dijit/form/TextBox\" name=\"email\" data-dojo-attach-point=\"content\" style=\"display:block;margin-bottom:8px;width:600px;\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Email Address is required',trim:true,placeHolder:'Email Address'\"></div>\n\t\t</div>\n\n\t\t<div data-dojo-type=\"dijit/form/TextBox\" name=\"subject\" data-dojo-attach-point=\"content\" style=\"display:block;margin-bottom:8px;width:600px;\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Subject must be provided',trim:true,placeHolder:'Subject'\"></div>\n\t\t<div data-dojo-type=\"dijit/form/Textarea\" name=\"content\" data-dojo-attach-point=\"content\" style=\"width:600px;height:250px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Description must be provided',trim:true,rows:20\"></div>\n\t\t<div>\n\t\t\tSelect file to attach (optional):\t<input data-dojo-attach-point=\"attachmentNode\" type=\"file\" name=\"attachment\" />\n\t\t</div>\n\t</div>\n\t\t<div class=\"workingMessage messageContainer\">\n\t\t\tSending Feedback...\n\t\t</div>\n\n\t\t<div class=\"errorMessage messageContainer\">\n\t\t\t<div style=\"font-weight:900;font-size:1.1em;\">There was an error submitting your report:</div>\n\t\t\t<p data-dojo-attach-point=\"errorMessage\">Error</p>\n\t\t</div>\n\t\t\n\t\t<div style=\"margin:4px;margin-top:8px;text-align:right;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"saveButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n\t\t</div>\t\n</form>\n\n"}});
define("p3/widget/ReportProblem", [
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
