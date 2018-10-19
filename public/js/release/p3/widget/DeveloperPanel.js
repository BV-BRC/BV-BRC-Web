require({cache:{
'url:p3/widget/templates/DeveloperPanel.html':"<div class=\"DeveloperPanel\">\n  <table style=\"width: 100%\">\n    <tr>\n      <td style=\"text-align:center;\"><input data-dojo-type=\"dijit/form/CheckBox\" value=\"noJobSubmmisions\" checked=\"false\" data-dojo-attach-event=\"onChange:onChangeNoJobSubmission\" /></td>\n      <td style=\"text-align: left;\">Don't Submit Jobs (print to params to console)</td>\n    </tr>\n\n  </table>\n</div>\n"}});
define("p3/widget/DeveloperPanel", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/DeveloperPanel.html', 'dojo/topic'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, Topic
) {
  return declare([WidgetBase, Templated, WidgetsInTemplate], {
    baseClass: 'DeveloperPanel',
    templateString: Template,
    noJobSubmission: false,
    postMixInProperties: function () {
      this.inherited(arguments);
      this.noJobSubmission = window.App.noJobSubmission || false;
    },
    onChangeNoJobSubmission: function (val) {
      this.noJobSubmission = window.App.noJobSubmission = val;
    }
  });
});

