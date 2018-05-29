require({cache:{
'url:p3/widget/templates/WorkspaceController.html':"<div>\n  <span style=\"float:right;\">\n    <div data-dojo-type=\"p3/widget/UploadStatus\" style=\"display:inline-block;\"></div>\n    <div data-dojo-type=\"p3/widget/JobStatus\" style=\"display:inline-block;\"></div>\n  </span>\n</div>\n"}});
define("p3/widget/WorkspaceController", [
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
