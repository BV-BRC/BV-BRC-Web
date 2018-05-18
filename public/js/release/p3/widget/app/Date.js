require({cache:{
'url:p3/widget/app/templates/Date.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div style=\"width: 420px;margin:auto;margin-top: 10px;padding:10px;\">\n    <h2>Date App</h2>\n    <p>Date Application For Testing Purposes</p>\n    <div style=\"margin-top: 10px; text-align:center;\">\n      <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n      <div data-dojo-attach-point=\"saveButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Run</div>\n    </div>\n  </div>\n</form>\n\n"}});
define("p3/widget/app/Date", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/Date.html', 'dijit/form/Form'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin
) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    baseClass: 'CreateWorkspace',
    templateString: Template,
    path: '',
    validate: function () {
      console.log('this.validate()', this);
      var valid = this.inherited(arguments);
      if (valid) {
        this.saveButton.set('disabled', false);
      } else {
        this.saveButton.set('disabled', true);
      }
      return valid;
    },

    onSubmit: function (evt) {
      var _self = this;
      if (this.validate()) {
        var values = this.getValues();
        console.log('Submission Values', values);
        domClass.add(this.domNode, 'Working');
        window.App.api.service('AppService.start_app', ['Date', {}]).then(function (results) {
        }, function (err) {
          console.log('Error:', err);
          domClass.remove(_self.domNode, 'Working');
          domClass.add(_self.domNode, 'Error');
          _self.errorMessage.innerHTML = err;
        });
      } else {
        console.log('Form is incomplete');
      }

      evt.preventDefault();
      evt.stopPropagation();
    },

    onCancel: function (evt) {
      console.log('Cancel/Close Dialog', evt);
      on.emit(this.domNode, 'dialogAction', { action: 'close', bubbles: true });
    }
  });
});
