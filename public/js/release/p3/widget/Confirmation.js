require({cache:{
'url:p3/widget/templates/Confirmation.html':"<div class=\"confirmationPanel\">\n\t<div data-dojo-attach-point=\"containerNode\">\n\t\t${content}\n\t</div>\n\t<div>\n\t\t<button type=\"cancel\" data-dojo-type=\"dijit/form/Button\">Cancel</button>\n\t\t<button type=\"submit\" data-dojo-type=\"dijit/form/Button\">Confirm</button>\n\t</div>\n</div>\n"}});
define("p3/widget/Confirmation", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/_base/lang",
	"dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojo/text!./templates/Confirmation.html",
	"dijit/form/Button", "dijit/Dialog", "dojo/dom-construct"
], function(declare, WidgetBase, lang,
			Templated, WidgetsInTemplate, template,
			Button, Dialog, domConstr){

	return declare([Dialog], {
		title: "Confirm Action",
		content: "Are you sure?",
		okLabel: "OK",
		cancelLabel: "Cancel",
		postCreate: function(){
			this.inherited(arguments);
			var buttonContainer = domConstr.create("div", {style: {"text-align": "right"}});
			domConstr.place(buttonContainer, this.containerNode, "last");

			if (this.cancelLabel){
				this.cancelButton = new Button({label: this.cancelLabel, onClick: lang.hitch(this, "_onCancel")});
				domConstr.place(this.cancelButton.domNode, buttonContainer, "last");
			}
			this.okButton = new Button({label: this.okLabel, type: "submit", onClick: lang.hitch(this, "_onSubmit")});
			domConstr.place(this.okButton.domNode, buttonContainer, "last");
		},

		onCancel: function(){
		},
		onConfirm: function(){
		},
		_onCancel: function(){
			this.onCancel();
			this.hide();
			var _self = this;
			setTimeout(function(){
				_self.destroy();
			}, 2000);
		},
		_onSubmit: function(){
			this.onConfirm();
			this.hide();
			var _self = this;
			setTimeout(function(){
				_self.destroy();
			}, 2000);

		},
		startup: function(){
			this.inherited(arguments);
//			this.set('content', content);	
		}
	});

});
