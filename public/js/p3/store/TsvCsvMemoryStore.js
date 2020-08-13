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

      this._filtered = undefined; // reset flag prevent to read stored _original
    },

    constructor: function (options) {
      this._loaded = false;
      this.topicId = options.topicId;
      //this.userDefinedHeaderColumns = options.userDefinedHeaderColumns;

      // for keyword filtering
      Topic.subscribe('applyKeywordFilter', lang.hitch(this, function () {
        this.filterOptions = arguments[0];
        this.keywordFilter();
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
        //qr.total = when(results, function (results) {
        //  return results.total || results.length;
        //});
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

    keywordFilter: function() {
      if (this._filtered == undefined) { // first time
        this._filtered = true;
        this._original = this.query('', {});
      }
      var data = this._original;
      var newData = [];

      if (this.filterOptions.keyword !== '') {
      var keywordRegex = this.filterOptions.keyword.trim().toLowerCase().replace(/,/g, '~').replace(/\n/g, '~')
        .split('~')
        .map(function (k) { return k.trim(); });
      } else {
        keywordRegex = '';    // on Reset
      }

      if (this.filterOptions.keyword !== '') {
        var keyword = this.filterOptions.keyword;
        var columnSelection = this.filterOptions.columnSelection;

        // all columns
        if (columnSelection == "All Columns") {
          data.forEach(function (dataLine) {
            var skip = false;
            var dataLineArray = Object.values(dataLine);

            if (!skip && keyword !== '') {
              keywordRegex.some(function (needle) {
                if (dataLine) {
                  var dataLineArray = Object.values(dataLine);  // array elems can be searched for partial words
                  dataLineArray.shift();  // remove row number, first element
                  skip = !dataLineArray.some( function(dataValue) {
                    //console.log(needle && (dataValue.toLowerCase().indexOf(needle) >= 0 || dataValue.toLowerCase().indexOf(needle) >= 0));
                    return needle && (dataValue.toLowerCase().indexOf(needle) >= 0 || dataValue.toLowerCase().indexOf(needle) >= 0);                  
                  });
                } else {
                  skip = true;  // no data in this row
                }
              });
            }

            if (!skip) {
              newData.push(dataLine);
            }
          }, this);
        } else {
        // keyword search
        data.forEach(function (dataLine) {
          var skip = false;

          if (!skip && keyword !== '') {
            skip = !keywordRegex.some(function (needle) {
              if (dataLine[columnSelection]) {
                //console.log (dataLine[columnSelection]);
                //console.log(needle && (dataLine[columnSelection].toLowerCase().indexOf(needle) >= 0 || dataLine[columnSelection].toLowerCase().indexOf(needle) >= 0));
                return needle && (dataLine[columnSelection].toLowerCase().indexOf(needle) >= 0 || dataLine[columnSelection].toLowerCase().indexOf(needle) >= 0);
              } else {
                skip = true;  // no Function
              }
            });
          }

          if (!skip) {
            newData.push(dataLine);
          }

        }, this);
      }
      this.setData(newData);
    } else {
      this.setData(this._original);
    }
      this.set('refresh');

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
      keyList.forEach(function (keyName) {
        if (_self.dataFile.indexOf(keyName) >= 0) {
          // key name is found
          if (tsvCsvFeatures[keyName].columnHeaders) {
            hasColumnHeaders = true;
          }
        }
      });

      // get data for tsv (currently typed as txt)      
      if (this.state.dataType == 'txt') {
        // split on new lines, to get the grid rows
        var dataLines = this.state.data.split(/\r?\n/);

        // get the headers for the columns by splitting the first line.  
        var tmpColumnHeaders = dataLines[0].split(/\t/);	
      } else {    // csv
        // split on new lines, to get the grid rows
        var dataLines = this.state.data.split(/\r?\n/); 

        var tmpColumnHeaders = dataLines[0].split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/);
      }

      var rowStart = 0;
      var gridColumns = [];
      for (i = 0; i < tmpColumnHeaders.length; i++) {

        // make column labels from the first line of dataLines or if column headers are not present
        // then name them as "Column 1", "Column 2", etc.
        if (hasColumnHeaders) {
          var columnHeaders = { label: tmpColumnHeaders[i], field: tmpColumnHeaders[i] };
          rowStart = 1;
        } else {
          var columnHeaders = { label: "Column " + (i + 1), field: "Column " + (i + 1) };
        }

        gridColumns.push(columnHeaders);
      }

      // fill with data, start with second line of dataLines
      var columnData = [];
      for (i = rowStart; i < dataLines.length; i++) {  // temporary. start at 1 because columns are hard-coded
        // get data for tsv (currently typed as txt)      
        if (this.state.dataType == 'txt' || this.state.dataType == 'tsv') {
          var tmpData = dataLines[i].split(/\t/);
        } else {
          var tmpData = dataLines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/);
        }
        var dataRow = {};
        dataRow['RowNumber'] = i;
        for (j = 0; j < tmpData.length; j++) {	
          dataRow[gridColumns[j].field] = tmpData[j];
        }
        columnData.push(dataRow);
      }
      gridColumns.unshift(selector({ label: selector({ unidable: true})}));  // add checkboxes to beginning of array
      this.columns = gridColumns;
      this.setData(columnData);

      this._loaded = true;
      return this._loadingDeferred;
    }

    
  });
});
