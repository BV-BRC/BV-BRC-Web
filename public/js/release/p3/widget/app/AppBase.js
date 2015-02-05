require({cache:{
'url:p3/widget/app/templates/Sleep.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div style=\"width: 420px;margin:auto;margin-top: 10px;padding:10px;\">\n\t\t<h2>Sleep</h2>\n\t\t<p>Sleep Application For Testing Purposes</p>\n\t\t<div style=\"margin-top:10px;text-align:left\">\n\t\t\t<label>Sleep Time</label><br>\n\t\t\t<input data-dojo-type=\"dijit/form/NumberSpinner\" value=\"10\" name=\"sleep_time\" require=\"true\" data-dojo-props=\"constraints:{min:1,max:100}\" />\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tSubmitting Sleep Job\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tError Submitting Job\t\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tSleep Job has been queued.\n\t\t</div>\n\t\t<div style=\"margin-top: 10px; text-align:center;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n\t\t\t<div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Run</div>\n\t\t</div>\t\n\t</div>\n</form>\n\n"}});
define("p3/widget/app/AppBase", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Sleep.html","dijit/form/Form","p3/widget/WorkspaceObjectSelector"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,FormMixin,WorkspaceObjectSelector
){
	return declare([WidgetBase,FormMixin,Templated,WidgetsInTemplate], {
		"baseClass": "App Sleep",
		templateString: Template,
		path: "",
		applicationName:  "Date",
		showCancel: false,
		activeWorkspace: "",
		activeWorkspacePath: "",
	
		postMixInProperties: function(){
			this.activeWorkspace = this.activeWorkspace || window.App.activeWorkspace;
			this.activeWorkspacePath = this.activeWorkspacePath || window.App.activeWorkspacePath;
			this.inherited(arguments);
		},

		_setValueAttr: function(val){
			this.value = val || window.App.activeWorkspacePath;
		},

		startup: function(){
			if (this._started) { return; }
			this.inherited(arguments);
			var state = this.get("state")
			if ((state == "Incomplete") || (state == "Error")) {
			        this.submitButton.set("disabled", true);
			}

			this.watch("state", function(prop, val, val2){
			        console.log("Registration Form State: ",prop, val, val2);
			        if (val2=="Incomplete" || val2=="Error") {
			                this.submitButton.set("disabled", true);
			        }else{
			                this.submitButton.set('disabled',false);
			        }
			});

			if (!this.showCancel && this.cancelButton){
					domClass.add(this.cancelButton.domNode, "dijitHidden");
			}

			this._started=true;
		},

		onSubmit: function(evt){
			var _self = this;

			evt.preventDefault();
			evt.stopPropagation();
			if (this.validate()){
				console.log("Validated");
				var values = this.getValues();

				console.log("Submission Values", values);
				domClass.add(this.domNode,"Working");
				domClass.remove(this.domNode,"Error");
				domClass.remove(this.domNode,"Submitted");
				this.submitButton.set("disabled", true)
				window.App.api.service("AppService.start_app",[this.applicationName,values]).then(function(results){
					console.log("Job Submission Results: ", results);
					domClass.remove(_self.domNode,"Working")
					domClass.add(_self.domNode, "Submitted");
					_self.submitButton.set("disabled", false);
				}, function(err){
					console.log("Error:", err)
					domClass.remove(_self.domNode,"Working");
					domClass.add(_self.domNode, "Error");
					_self.errorMessage.innerHTML = err;
				})
			}else{
				console.log("Form is incomplete");
			}

		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
			on.emit(this.domNode, "dialogAction", {action:"close",bubbles:true});
		}
	});
});
