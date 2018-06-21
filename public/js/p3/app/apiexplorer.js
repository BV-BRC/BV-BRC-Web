define([
  'dojo/_base/declare',
  'dojo/topic', 'dojo/on', 'dojo/dom', 'dojo/dom-class', 'dojo/dom-attr', 'dojo/dom-construct',
  'dijit/registry', 'dojo/request',
  'dojo/_base/Deferred', '../widget/GlobalSearch',
  '../widget/PageGrid', 'dojo/store/JsonRest',
  'dojo/ready', './app'
], function (
  declare,
  Topic, on, dom, domClass, domAttr, domConstruct,
  Registry, xhr,
  Deferred, GlobalSearch,
  Grid, JsonRest,
  Ready, App
) {
  return declare([App], {
    launchGridColumns: null,

    getGlobalSearchBox: function () {
      if (this.globalSearchBox) {
        return this.globalSearchBox;
      }
      return Registry.byId('GlobalSearchBox');
    },
    startup: function () {
      this.inherited(arguments);

      var gsb = this.getGlobalSearchBox();

      console.log('Global Search Box: ', gsb);

      if (gsb) {
        var query = window.location.search;
        var path = window.location.pathname;
        console.log('Path: ', path, 'Query: ', query);
        query = (decodeURIComponent((query && query.charAt(0) == '?') ? query.substr(1) : query)).replace(/&/g, ' ');
        if (!path) {
          console.log('setup global dataTypes');
        }
        gsb.set('value', query, false);
      }

      if (this.launchGridColumns) {
        console.log('Launch Grid Columns: ', this.launchGridColuns);
        var store = new JsonRest({
          target: window.location.pathname,
          idProperty: 'feature_id',
          headers: {
            'accept': 'application/json',
            'X-Requested-With': null
          }
        });

        var grid = new Grid({
          region: 'center',
          columns: this.launchGridColumns.map(function (col) {
            return { label: col.toUpperCase(), field: col };
          }),
          store: store,
          query: window.location.search
        });

        // domConstruct.place(grid.domNode, this.getCurrentContainer().containerNode, "last");
        var ac = this.getApplicationContainer();
        ac.removeChild(this.getCurrentContainer());
        ac.addChild(grid);
      }
    }
  });
});
