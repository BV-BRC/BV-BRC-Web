define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/dom-construct',
  'dojo/text!./templates/VariantLineageStructure.html',
  'dijit/_WidgetBase', 'dijit/_Templated'
], function (
  declare, lang, domConstruct,
  templateString,
  WidgetBase, Templated
) {

  return declare([WidgetBase, Templated], {
    baseClass: 'VariantStructure',
    templateString: templateString,
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments)
    }
  });
});
