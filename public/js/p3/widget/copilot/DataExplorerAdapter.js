define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/store/Memory',
  'dgrid/OnDemandGrid',
  'dgrid/extensions/ColumnResizer',
  'dgrid/extensions/ColumnHider',
  'dgrid/extensions/DijitRegistry'
], function (
  declare, lang, Memory, OnDemandGrid, ColumnResizer, ColumnHider, DijitRegistry
) {
  return declare([OnDemandGrid, ColumnResizer, ColumnHider, DijitRegistry], {
    minRowsPerPage: 20,
    maxRowsPerPage: 100,
    bufferRows: 30,
    keepScrollPosition: true,
    loadingMessage: 'Loading data...',
    noDataMessage: 'No data rows found',

    rowsData: null,
    _rowCounter: 0,

    constructor: function(args) {
      this.rowsData = [];
      this._rowCounter = 0;
      if (args) {
        lang.mixin(this, args);
      }
      if (!this.store) {
        this.store = new Memory({
          idProperty: '_rowId',
          data: []
        });
      }
      this.columns = this._buildColumns([]);
    },

    _toDisplayValue: function(value) {
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch (e) {
          return String(value);
        }
      }
      return String(value);
    },

    _collectColumnKeys: function(rows) {
      var keysMap = {};
      if (Array.isArray(rows)) {
        rows.forEach(function(row) {
          if (!row || typeof row !== 'object' || Array.isArray(row)) {
            return;
          }
          Object.keys(row).forEach(function(key) {
            if (key !== '_rowId') {
              keysMap[key] = true;
            }
          });
        });
      }
      return Object.keys(keysMap);
    },

    _buildColumns: function(columnKeys) {
      var columns = {};
      var keys = Array.isArray(columnKeys) ? columnKeys : [];
      keys.forEach(lang.hitch(this, function(key) {
        columns[key] = {
          label: key,
          field: key,
          formatter: lang.hitch(this, function(value) {
            return this._toDisplayValue(value);
          })
        };
      }));
      return columns;
    },

    _normalizeRows: function(rows) {
      var normalized = [];
      if (!Array.isArray(rows)) {
        return normalized;
      }
      rows.forEach(lang.hitch(this, function(row) {
        var nextRow = row;
        if (!nextRow || typeof nextRow !== 'object' || Array.isArray(nextRow)) {
          nextRow = { value: nextRow };
        } else {
          nextRow = lang.mixin({}, nextRow);
        }
        if (!nextRow._rowId) {
          this._rowCounter += 1;
          nextRow._rowId = 'data-row-' + this._rowCounter;
        }
        normalized.push(nextRow);
      }));
      return normalized;
    },

    setRows: function(rows, opts) {
      var options = opts || {};
      var normalized = this._normalizeRows(rows);
      if (options.append) {
        this.rowsData = this.rowsData.concat(normalized);
      } else {
        this.rowsData = normalized;
      }

      this.columns = this._buildColumns(this._collectColumnKeys(this.rowsData));
      this.set('columns', this.columns);
      this.store.setData(this.rowsData);

      if (this._started) {
        this.refresh();
      }
    },

    startup: function() {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.refresh();
    }
  });
});

