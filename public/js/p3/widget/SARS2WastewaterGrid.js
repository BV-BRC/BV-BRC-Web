define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on',
  './PageGrid', 'dojo/_base/Deferred', '../store/SARS2WastewaterStore'
], function (
  declare, lang, on,
  PageGrid, Deferred, SARS2WastewaterStore
) {
  return declare([PageGrid], {
    // columns: { patric_id: 'BRC ID', genome_id: 'Genome ID' },
    // primaryKey: 'patric_id',
    primaryKey: 'sample_id',
    region: 'center',
    query: '',
    deselectOnRefresh: true,
    rowIsSelected: false,
    store: new SARS2WastewaterStore(),

    startup: function () {
      this.set('columns', this.store.columns);

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

        _self.rowIsSelected = true;

        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);

        _self.storedEvt = newEvt;
      });

      this.on('dgrid-deselect', function (evt) {

        _self.rowIsSelected = false;

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
    },

    triggerSelectionEvent: function () {
      on.emit(this.domNode, 'select', this.storedEvt);
      this.rowIsSelected = false;
    },

    setData: function (newData) {
      this.renderArray(newData);
    },

    _selectAll: function () {
      this._unloadedData = {};
      return Deferred.when(this.store.data.map(function (obj) {
        this._unloadedData[obj[this.primaryKey]] = obj;
        return obj[this.primaryKey];
      }, this));
    }


  });
});
