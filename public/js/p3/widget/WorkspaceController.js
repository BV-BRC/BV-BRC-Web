define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dojo/topic', 'dojo/_base/lang',
  'dojo/dom-construct', '../JobManager', '../UploadManager',
  './UploadStatus', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/WorkspaceController.html'
], function (
  declare, WidgetBase, on,
  domClass, Topic, lang,
  domConstr, JobManager, UploadManager,
  UploadStatus, TemplatedMixin, WidgetsInTemplate,
  Template
) {
  return declare([WidgetBase, TemplatedMixin, WidgetsInTemplate], {
    baseClass: 'WorkspaceController',
    disabled: false,
    templateString: Template

  });
});
