define([
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

