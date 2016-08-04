define([
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
