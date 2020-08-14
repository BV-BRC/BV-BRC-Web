require({cache:{
'url:p3/widget/templates/DeveloperPanel.html':"<div class=\"DeveloperPanel\">\n  <div>\n    <input data-dojo-type=\"dijit/form/CheckBox\"\n      name=\"noJobSubmissions\"\n      value=\"noJobSubmmisions\"\n      checked=\"false\"\n      data-dojo-attach-event=\"onChange:onChangeNoJobSubmission\"\n      />\n    <label for=\"noJobSubmissions\">Don't Submit Jobs (print to params to console)</td>\n  </div>\n  <br/>\n  <div>\n    <label for=\"containerBuildID\"><b>Use Container Build ID:</b></td>\n    <input data-dojo-type=\"dijit/form/TextBox\"\n      name=\"containerBuildID\"\n      checked=\"false\"\n      data-dojo-props=\"placeholder:'latest version'\"\n      data-dojo-attach-event=\"onChange:onChangeContainerBuildID\"\n    />\n  </div>\n</div>\n"}});
define("p3/widget/DeveloperPanel", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-style', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/DeveloperPanel.html', 'dojo/topic'
], function (
  declare, WidgetBase, on,
  domStyle, Templated, WidgetsInTemplate,
  Template, Topic
) {
  return declare([WidgetBase, Templated, WidgetsInTemplate], {
    baseClass: 'DeveloperPanel',
    templateString: Template,
    noJobSubmission: false,
    postMixInProperties: function () {
      this.inherited(arguments);
    },
    onChangeNoJobSubmission: function (val) {
      this.noJobSubmission = window.App.noJobSubmission = val;
    },
    onChangeContainerBuildID: function (val) {
      this.containerBuildID = window.App.containerBuildID = val;
    }
  });
});

