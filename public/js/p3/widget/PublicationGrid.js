define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter
) {
  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataAPI,
    dataModel: 'publications',
    primaryKey: 'id',
    deselectOnRefresh: true,
    columns: {
      publication: { label: 'Publication', field: 'publication', hidden: false }
    },
    startup: function () {
      var _self = this;
      this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.row(evt);
        console.log('dblclick row:', row);
        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
        console.log('after emit');
        // if (row.data.type == "folder"){
        //  Topic.publish("/select", []);

        //  Topic.publish("/navigate", {href:"/workspace" + row.data.path })
        //  _selection={};
        // }
      });
      // _selection={};
      // Topic.publish("/select", []);

      this.on('dgrid-select', function (evt) {
        console.log('dgrid-select: ', evt);
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
        // console.log("dgrid-select");
        // var rows = evt.rows;
        // Object.keys(rows).forEach(function(key){ _selection[rows[key].data.id]=rows[key].data; });
        // var sel = Object.keys(_selection).map(function(s) { return _selection[s]; });
        // Topic.publish("/select", sel);
      });
      this.on('dgrid-deselect', function (evt) {
        console.log('dgrid-select');
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'deselect', newEvt);

      });
      this.inherited(arguments);
      this.refresh();
    }
  });
});
