define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/WorkspaceGlobalController.html'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template
) {
  return declare([WidgetBase, Templated, WidgetsInTemplate], {
    baseClass: 'WorkspaceGlobalController',
    disabled: false,
    templateString: Template,
    path: '',
    postCreate: function () {
      this.inherited(arguments);
      console.log('WGC PATH', this.path);

      // this.domNode.innerHTML = this.path.split("/").filter(function(x){ return x!=""; }).slice(0,2).join(" / ")
    },

    setPathAttr: function (val) {
      this.path = val;
      if (this._started) {
        console.log('Set Workspace Global Current Path');
      }
    }

  });
});
