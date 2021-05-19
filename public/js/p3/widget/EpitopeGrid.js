define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dijit/layout/BorderContainer',
  'dojo/on',
  'dojo/dom-class',
  'dijit/layout/ContentPane',
  'dojo/dom-construct',
  './PageGrid',
  './GridSelector'
], function (
  declare,
  lang,
  BorderContainer,
  on,
  domClass,
  ContentPane,
  domConstruct,
  Grid,
  selector
) {
  return declare([Grid], {
    primaryKey: 'id',
    deselectOnRefresh: true,
    selectionMode: 'multiple',
    showFooter: false,
    fullSelectAll: false,
    columns: {
      checkbox: selector({ selectorType: 'checkbox', unhidable: true, width: 25 }),
      id: { label: 'IEDB ID', field: 'id' },
      name: { label: 'SEQ', field: 'name', className: 'proteinStructure-hl-cell' }
    },
    store: null,
    startup: function () {
      var _self = this;

      this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.row(evt);
        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
      });

      this.on('dgrid-select', function (evt) {
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
      });
      this.on('dgrid-deselect', function (evt) {
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
    }
  });
});
