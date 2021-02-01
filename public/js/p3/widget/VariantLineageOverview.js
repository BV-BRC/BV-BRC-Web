define([
  'dojo/_base/declare', 'dojo/dom-construct', 'dojo/text!./templates/VariantLineageOverview.html',
  'dijit/_WidgetBase', 'dijit/_Templated', './ExternalItemFormatter',

], function (
  declare, domConstruct, Template,
  WidgetBase, Templated, ExternalItemFormatter
) {
  return declare([WidgetBase, Templated], {
    baseClass: 'VariantLineageOverview',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    _setPublicationsAttr: function () {
      domConstruct.empty(this.pubmedSummaryNode);
      domConstruct.place(ExternalItemFormatter('sars cov2 variants', 'pubmed_data', {}), this.pubmedSummaryNode, 'first');
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.set('publications', {})
    }
  });
});
