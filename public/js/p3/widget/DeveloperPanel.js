define([
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

