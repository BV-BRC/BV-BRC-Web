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
    showHiddenFiles: false,
    noJobSubmission: false,
    postMixInProperties: function () {
      this.inherited(arguments);
      this.showHiddenFiles = window.App.showHiddenFiles || false;
      this.noJobSubmission = window.App.noJobSubmission || false;
    },
    onChangeShowHidden: function (val) {
      this.showHiddenFiles = window.App.showHiddenFiles = val;
      console.log('toggle showHiddenFiles', this.showHiddenFiles);
      Topic.publish('/refreshWorkspace', {});
    },
    onChangeNoJobSubmission: function (val) {
      this.noJobSubmission = window.App.noJobSubmission = val;
      console.log('toggle noJobSubmission', this.noJobSubmission);
    }
  });
});

