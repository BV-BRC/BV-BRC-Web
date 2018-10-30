require({cache:{
'url:p3/widget/app/templates/Sleep.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div style=\"width: 420px;margin:auto;margin-top: 10px;padding:10px;\">\n    <h2>Sleep</h2>\n    <p>Sleep Application For Testing Purposes</p>\n    <div style=\"margin-top:10px;text-align:left\">\n      <label>Sleep Time</label><br>\n      <input data-dojo-type=\"dijit/form/NumberSpinner\" value=\"10\" name=\"sleep_time\" require=\"true\" data-dojo-props=\"constraints:{min:1,max:100}\" />\n    </div>\n    <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n      Submitting Sleep Job\n    </div>\n    <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n      Error Submitting Job\n    </div>\n    <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n      Sleep Job has been queued.\n    </div>\n    <div style=\"margin-top: 10px; text-align:center;\">\n      <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n      <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n      <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Run</div>\n    </div>\n  </div>\n</form>\n\n"}});
define("p3/widget/app/Sleep", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/Sleep.html', './AppBase'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, AppBase
) {
  return declare([AppBase], {
    baseClass: 'App Sleep',
    templateString: Template,
    applicationName: 'Sleep'
  });
});
