define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', 
  './Grid', './GridSelector', './TsvCsvColumns', '../store/TsvCsvMemoryStore',
  './PageGrid', 'dojo/_base/Deferred'
], function (
  declare, lang, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, selector, TsvCsvColumns, TsvStore,
  PageGrid, Deferred
) {

  var tsvStore = new TsvStore({});

  return declare([PageGrid], {
    region: 'center',
    query: '',
    deselectOnRefresh: true,
    store: tsvStore,
    primaryKey: 'RowNumber',
    //store: null,
    state: null,
    //columns: TsvCsvColumns.variationColumns,
    columns: lang.mixin({
      'Selection Checkboxes': selector({ unhidable: true })
    }, TsvCsvColumns.variationColumns),
/*  coluumns example
    columns: {
      column0: {label: 'Col0', field: "column0" },
      column1: {label: 'Col1', field: "column1" },
      column2: {label: 'Col2', field: "column2" },
      column3: {label: 'Col3', field: "column3" },
      column4: {label: 'Col4', field: "column4" },
      column5: {label: 'Col5', field: "column5" },
      column6: {label: 'Col6', field: "column6" },
      column7: {label: 'Col7', field: "column7" },
      column8: {label: 'Col8', field: "column8" },
      column9: {label: 'Col9', field: "column9" },
      column10: {label: 'Col10', field: "column10" },
      column11: {label: 'Col11', field: "column11" },
      column12: {label: 'Col12', field: "column12" },
      column13: {label: 'Col13', field: "column13" },
      column14: {label: 'Col14', field: "column14" },
      column15: {label: 'Col15', field: "column15" },
      column16: {label: 'Col16', field: "column16" },
      column17: {label: 'Col17', field: "column17" },
      column18: {label: 'Col18', field: "column18" },
      column19: {label: 'Col19', field: "column19" },
      column20: {label: 'Col20', field: "column20" },
      column21: {label: 'Col21', field: "column21" }
      },
*/
    constructor: function (options) {
      //this.primaryKey = parent.primaryKey;
      //this.primaryKey = 'Gene_ID';
    },

    _setState: function (state) {
      if (!state) {
        return;
      }

      if (!this.store) {
        this.set('store', this.createStore());
      } else {
        //this.store.set('state', state);
        tsvStore.set('state', state)
      }
      this.refresh();
    },

    // DEV DLB not sure we need this.  The data should always be here, and if they are not, they never will be.
    createStore: function () {
      if (this.store) {
        console.log('returning existing store');
        this.store.watch('refresh', 'refresh');
        return this.store;
      }
    },

    startup: function() {
      var _self = this;  

      this.on('.dgrid-content .dgrid-row:dblclick', function(evt) {
        var row = _self.row(evt);
        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
      });

      this.on('dgrid-select', function(evt) {
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
      });

      this.on('dgrid-deselect', function(evt) {
        var newEvt = {
          rows:evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'deselect', newEvt);
      });
      this.inherited(arguments);
    },

    setColumns: function(newColumns) {
      //this._setColumns(newColumns);
      //selector({unhidable: true});
      //this.set("columns", lang.mixin(newColumns, {'Selection Checkboxes' : selector({ unhidable: true})}));
      //this._setColumns(selector({ label: '', unhidable: true}));
      //newColumns.push({'Selection Checkboxes' : selector()});
      //newColumns.push(selector({ label: '', unhidable: true}));
      //this._setColumns(newColumns);
      //var mySelector = { 'Selection Checkboxes' : selector({ unhidable: true }) };
      //newColumns.push(mySelector);
      //this.set("columns",
      //  {'Selection Checkboxes' : selector({})},
      //   newColumns);
      //this.set("columns", newColumns);
    },

    setStore: function(tsvStore) {
      this.set ('store', tsvStore);
    },

    setData: function(newData) {
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
