define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Sleep.html","dijit/form/Form"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,FormMixin
){
	return declare([WidgetBase,FormMixin,Templated,WidgetsInTemplate], {
		"baseClass": "App Sleep",
		templateString: Template,
		path: "",
		applicationName:  "Date",
		showCancel: false,
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
			if (this.validate()){
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

			evt.preventDefault();
			evt.stopPropagation();
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
			on.emit(this.domNode, "dialogAction", {action:"close",bubbles:true});
		}
	});
});
