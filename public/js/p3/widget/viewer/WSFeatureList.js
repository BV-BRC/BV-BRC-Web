define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../FeatureGrid'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  FeatureGrid
) {
  return declare([BorderContainer], {
    baseClass: 'FeatureList',
    disabled: false,
    containerType: 'feature_group',
    query: null,
    _setQueryAttr: function (query) {
      this.query = query;
      if (this.viewer) {
        this.viewer.set('query', query);
      }
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.viewer = new FeatureGrid({
        region: 'center',
        query: (this.query || ''),
        apiToken: window.App.authorizationToken,
        apiServer: window.App.dataAPI
      });
      this.addChild(this.viewer);
      this.inherited(arguments);
    },

    refresh: function () {
      this.viewer.refresh();
    }
  });
});
