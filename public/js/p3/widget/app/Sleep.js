define([
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
