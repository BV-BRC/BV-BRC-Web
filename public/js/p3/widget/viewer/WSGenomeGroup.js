define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../GenomeGrid'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  GenomeGrid
) {
  return declare([BorderContainer], {
    baseClass: 'GenomeGroup',
    disabled: false,
    query: null,
    containerType: 'genome_group',
    _setQueryAttr: function (query) {
      this.query = query;
      if (this.viewer) {
        this.viewer.set('query', query);
      }
    },
    removeRows: function (ids) {
      ids.forEach(function (id) {
        var row = this.viewer.row(id);
        this.viewer.removeRow(row.element);
      }, this);
    },
    refresh: function () {
      this.viewer.refresh();
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.viewer = new GenomeGrid({
        region: 'center',
        query: (this.query || ''),
        apiToken: window.App.authorizationToken,
        apiServer: window.App.dataAPI
      });
      this.addChild(this.viewer);
      this.inherited(arguments);
    }
  });
});
