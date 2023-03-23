define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/topic',
  'dojo/store/Memory', 'dojo/store/util/QueryResults', 'dojo/Stateful',
  '../widget/GridSelector', '../widget/TsvCsvFeatures'
], function (
  declare, lang, Deferred,
  request, when, Topic,
  Memory, QueryResults, Stateful,
  selector, tsvCsvFeatures
) {

  return declare([Memory, Stateful], {
    baseQuery: {},
    rawData: [],
    dataType: 'tsv',
    idProperty: 'RowNumber',
    filterOptions: {},
    columns: '',

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      this.reload();
    },

    constructor: function (options) {
      this._loaded = false;
      this.topicId = options.topicId;
      this.userDefinedColumnHeaders = options.userDefinedColumnHeaders;
      // for keyword filtering
      Topic.subscribe('applyKeywordFilter', lang.hitch(this, function () {
        this.keywordFilter(arguments[0]);
      }));

      Topic.subscribe('applyResetFilter', lang.hitch(this, function () {
        this.resetFilter();
      }));

      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    reload: function () {
      if (this._loadingDeferred && !this._loadingDeferred.isResolved()) {
        this._loadingDeferred.cancel('reloaded');
      }
      delete this._loadingDeferred;
      this._loaded = false;
      this.loadData();
      this.set('refresh');
    },

    query: function (query, opts) {
      query = query || {};
      if (this._loaded) {
        return this.inherited(arguments);
      }
      var results;
      var qr = QueryResults(when(this.loadData(), lang.hitch(this, function () {
        results = this.query(query, opts);
        return results;
      })));
      return qr;
    },

    get: function (id, opts) {
      if (this._loaded) {
        return this.inherited(arguments);
      }
      return when(this.loadData(), lang.hitch(this, function () {
        return this.get(id, opts);
      }));
    },

    processDataValue: function (filterOptions, dataValue) {
      if (filterOptions.type == 'fuzzy') {
        return String(dataValue).indexOf(filterOptions.keyword) >= 0;
      } else if (filterOptions.type == 'exact') {
        return String(dataValue) == String(filterOptions.keyword);
      } else { // filterOptions.type == 'range'
        var range = String(filterOptions.keyword).trim();
        if (!this.isNumeric(dataValue)) {
          return false;
        }
        var numValue = parseFloat(dataValue);
        if (range.startsWith('>=')) {
          range = range.replace('>=', '');
          return numValue >= parseFloat(range.trim());
        } else if (range.startsWith('>')) {
          range = range.replace('>', '');
          return numValue > parseFloat(range.trim());
        } else if (range.startsWith('<=')) {
          range = range.replace('<=', '');
          return numValue <= parseFloat(range.trim());
        } else if (range.startsWith('<')) {
          range = range.replace('<', '');
          return numValue < parseFloat(range.trim());
        } else if (range.includes('-')) {
          range = range.split('-');
          if (range.length != 2) {
            return false;
          }
          var left = parseFloat(range[0].trim());
          var right = parseFloat(range[1].trim());
          return numValue >= left && numValue <= right;
        }
      }
      return false;
    },

    keywordFilter: function (filterOptions) {
      var data = this._original;
      var self = this;
      var newData = [];
      if (filterOptions.columnSelection == 'All Columns') {
        data.forEach(function (dataLine) {
          var keep = false;
          if (dataLine) {
            delete dataLine.RowNumber;
            keep = Object.values(dataLine).some(function (dataValue) {
              return self.processDataValue(filterOptions, dataValue);
            });
          }
          if (keep) {
            newData.push(dataLine);
          }
        }, this);
      } else {
        data.forEach(function (dataLine) {
          var keep = false;
          if (dataLine[filterOptions.columnSelection]) {
            keep = self.processDataValue(filterOptions, dataLine[filterOptions.columnSelection]);
          }
          if (keep) {
            newData.push(dataLine);
          }
        }, this);
      }
      this.setData(newData);
      this.set('refresh');
    },

    resetFilter: function () {
      this.setData(this._original);
      this.set('refresh');
    },

    isNumeric: function (n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    },

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }
      // console.warn("loadData", this.type, this.state);
      if (!this.state) {
        // console.log("No state, use empty data set for initial store");
        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        var def = new Deferred();
        setTimeout(lang.hitch(this, function () {
          this.setData([]);
          this._loaded = true;
          // def.resolve(true);
        }), 0);
        return def.promise;
      }
      // does this file have column headers in the first line?
      var _self = this.state;
      var keyList = Object.keys(tsvCsvFeatures);
      var hasColumnHeaders = false;
      var colSpan = '';
      keyList.forEach(function (keyName) {
        if (_self.dataFile.indexOf(keyName) >= 0) {
          // key name is found
          if (tsvCsvFeatures[keyName].columnHeaders) {
            hasColumnHeaders = true;
            colSpan = tsvCsvFeatures[keyName].colSpan;
          }
        }
      });
      // get data for tsv (currently typed as txt)
      if (this.state.dataType == 'txt' || this.state.dataType == 'tsv') {
        // split on new lines, to get the grid rows
        var dataLines = this.state.data.split(/\r?\n/);

        // get the headers for the columns by splitting the first line.
        var tmpColumnHeaders = dataLines[0].split(/\t/);
      } else {    // csv
        // split on new lines, to get the grid rows
        var dataLines = this.state.data.split(/\r?\n/);
        var tmpColumnHeaders = dataLines[0].split(/,(?=(?:[^"]*"[^"]*")*(?![^"]*"))/);
      }
      var last = dataLines.length - 1;
      if (dataLines && dataLines[last] === '') {
        dataLines.pop();
      }
      var rowStart = 0;
      var gridColumns = [];
      for (var i = 0; i < tmpColumnHeaders.length; i++) {
        // make column labels from the first line of dataLines or if column headers are not present
        // then name them as "Column 1", "Column 2", etc.
        if (hasColumnHeaders || this.userDefinedColumnHeaders) {
          var columnHeaders = { label: tmpColumnHeaders[i], field: tmpColumnHeaders[i]};
          if (colSpan && colSpan[tmpColumnHeaders[i]]) {
            columnHeaders.colSpan = colSpan[tmpColumnHeaders[i]];
          }
          rowStart = 1;
        } else {
          var columnHeaders = { label: 'Column ' + (i + 1), field: 'Column ' + (i + 1) };
        }
        gridColumns.push(columnHeaders);
      }
      // fill with data, start with second line of dataLines
      var columnData = [];
      for (var i = rowStart; i < dataLines.length; i++) {  // temporary. start at 1 because columns are hard-coded
        // get data for tsv (currently typed as txt)
        if (this.state.dataType == 'txt' || this.state.dataType == 'tsv') {
          var tmpData = dataLines[i].split(/\t/);
        } else {
          var tmpData = dataLines[i].split(/,(?=(?:[^"]*"[^"]*")*(?![^"]*"))/);
        }
        var dataRow = {};
        dataRow['RowNumber'] = i;
        for (var j = 0; j < tmpData.length; j++) {
          dataRow[gridColumns[j].field] = tmpData[j];
        }
        columnData.push(dataRow);
      }
      gridColumns.unshift(selector({ label: selector({ unidable: true }) }));  // add checkboxes to beginning of array
      this.columns = gridColumns;
      // Set a numeric column to numbers.
      for (var i = 1; i < gridColumns.length; i++) {
        var mynum = true;
        for (var j = 0; j < columnData.length; j++) {
          mynum = mynum && this.isNumeric(columnData[j][gridColumns[i].field]);
          if (!mynum) {
            break;
          }
        }
        if (mynum) {
          for (var j = 0; j < columnData.length; j++) {
            columnData[j][gridColumns[i].field] = parseFloat(columnData[j][gridColumns[i].field])
          }
        }
      }
      this.setData(columnData);
      this._original = columnData;
      this._loaded = true;
      return this._loadingDeferred;
    }
  });
});
