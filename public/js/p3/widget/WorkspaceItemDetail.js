define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/form/Select'
], function (
  declare, WidgetBase, on,
  domClass, Select
) {
  return declare([WidgetBase], {
    baseClass: 'WorkspaceItemDetail',
    disabled: false,
    postCreate: function () {
      this.domNode.innerHTML = 'WorkspaceItemDetail';
    }
  });
});
